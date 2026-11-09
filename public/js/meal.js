// One meal: planning it (meal.html?new=1&date=YYYY-MM-DD[&recipe=builtin:id]) or everything about it (meal.html?id=...): who joins (and
// my own yes or no), the allergies at the table, the recipe and its grocery list, and the cost split equally over everyone who ate.
// Everyone who can see the meal can change it (the participants can change at any time); only the host deletes it.
import {
  whenUser, esc, onLeave, param, todayIso, go, toast, attempt, avatarHtml, allergenBadges, shareText, randomId, hiddenAllergiesNote, hiddenAllergiesTag,
} from "./ui.js";
import {
  myCircles, people, person, watchMeal, createMeal, updateMeal, deleteMeal, joinMeal, declineMeal, setHave, setSettled, userRecipes,
  myFriendships, friendIds, inviteToMeal, setMyCost,
} from "./store.js";
import { allRecipes, findRecipe, parseRecipeRef, ingredientHtml, ingredientText, getPantry } from "./recipe-view.js";
import { groceryList, allergyConflicts, tableAllergies, rankByPantry, groceryKey } from "./recipe-logic.js";
import { parseMoney, formatMoney, mealDebts, mealShares, mealTotal, eaters, guestId, settleKey } from "./money.js";
import { allergenLabel } from "./allergens.js";
import { attachPeoplePicker } from "./people-picker.js";
import { getLang, t, formatDay } from "./i18n.js";

const user = await whenUser();
const me = user.uid;
const lang = getLang();
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

function fail(message) {
  $("#meal-loading").classList.add("d-none");
  $("#meal-error").textContent = message;
  $("#meal-error").classList.remove("d-none");
}

/** "Elise: 🌾 Gluten, 🥛 Milk" lines for everyone at the table with an allergy (escaped HTML). */
function allergyLines(list) {
  return list.filter((p) => p.allergies.length).map((p) => `<li><strong>${esc(p.name)}</strong>: ${esc(p.allergies.map((a) => allergenLabel(a, lang)).join(", "))}</li>`).join("");
}

// =====================================================================================================================================
// New meal
// =====================================================================================================================================
function startNew() {
  const form = $("#new-meal");
  const circleSelect = $("#new-circle");
  const rsvp = $("#new-rsvp");
  const recipe = parseRecipeRef(param("recipe"));
  let circles = [];
  let checked = new Set([me]);
  let friends = [];
  const invitedFriends = new Set();

  $("#new-date").value = /^\d{4}-\d{2}-\d{2}$/.test(param("date") || "") ? param("date") : todayIso();
  $("#meal-loading").classList.add("d-none");
  form.classList.remove("d-none");

  const circle = () => circles.find((c) => c.id === circleSelect.value);

  function renderPeople() {
    const c = circle();
    const members = c ? c.members.map((uid) => person(uid)) : [];
    $("#new-people").innerHTML = members.map((p) => `
      <label class="list-group-item d-flex align-items-center gap-2">
        <input class="form-check-input mt-0" type="checkbox" value="${esc(p.id)}" ${checked.has(p.id) ? "checked" : ""}>
        ${avatarHtml(p, "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0"><span class="d-block text-truncate">${esc(p.name)}${p.id === me ? ` <span class="text-body-secondary small">(${esc(t("common.you"))})</span>` : ""}</span>${hiddenAllergiesTag(p)}</span>
        ${p.allergies.length ? `<span class="small">${allergenBadges(p.allergies)}</span>` : ""}
      </label>`).join("") || `<p class="small text-body-secondary mb-0">${esc(t("meal.noMembers"))}</p>`;
    // Friends who are not in this house or group already: tick them to invite them.
    const outside = friends.filter((uid) => !(c ? c.members : []).includes(uid)).map((uid) => person(uid));
    $("#new-friends-box").classList.toggle("d-none", !outside.length);
    $("#new-friends").innerHTML = outside.map((p) => `
      <label class="list-group-item d-flex align-items-center gap-2">
        <input class="form-check-input mt-0" type="checkbox" data-friend="${esc(p.id)}" ${invitedFriends.has(p.id) ? "checked" : ""}>
        ${avatarHtml(p, "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0 text-truncate">${esc(p.name)}</span>
        ${p.allergies.length ? `<span class="small">${allergenBadges(p.allergies)}</span>` : ""}
      </label>`).join("");
    const at = members.filter((p) => checked.has(p.id));
    const lines = allergyLines(at);
    const hidden = at.filter((p) => !p.detailsVisible);
    $("#new-allergies").innerHTML = (lines ? `<strong>${esc(t("meal.allergiesAtTable"))}</strong><ul class="mb-0">${lines}</ul>` : "")
      + (hidden.length ? `<p class="mb-0 ${lines ? "mt-2" : ""}"><i class="bi bi-eye-slash" aria-hidden="true"></i> ${esc(t("allergy.hiddenNote", { names: hidden.map((p) => p.name).join(", ") }))}</p>` : "");
    $("#new-allergies").classList.toggle("d-none", !lines && !hidden.length);
  }

  $("#new-friends").addEventListener("change", (e) => {
    const uid = e.target.dataset.friend;
    if (!uid) return;
    if (e.target.checked) invitedFriends.add(uid); else invitedFriends.delete(uid);
  });

  $("#new-people").addEventListener("change", (e) => {
    if (e.target.type !== "checkbox") return;
    if (e.target.checked) checked.add(e.target.value); else checked.delete(e.target.value);
    renderPeople();
  });

  // Asking everyone: only I am in for now, the others answer themselves (from the bell or the meal).
  rsvp.addEventListener("change", () => {
    const c = circle();
    checked = rsvp.checked ? new Set([me]) : new Set(c ? c.members : [me]);
    renderPeople();
  });

  circleSelect.addEventListener("change", () => {
    try { localStorage.setItem("last-circle", circleSelect.value); } catch { /* only a convenience */ }
    const c = circle();
    checked = rsvp.checked ? new Set([me]) : new Set(c ? c.members : [me]);
    renderPeople();
  });

  stops.push(myCircles(me).subscribe((list, err) => {
    if (err) { fail(t("error.load")); return; }
    if (!list) return;
    const first = !circles.length;
    circles = list;
    if (!circles.length) {
      form.classList.add("d-none");
      $("#meal-error").innerHTML = `${esc(t("home.noCircle"))} <a class="alert-link" href="houses.html">${esc(t("home.noCircleLink"))}</a>`;
      $("#meal-error").classList.replace("alert-danger", "alert-info");
      $("#meal-error").classList.remove("d-none");
      return;
    }
    const keep = circleSelect.value || (() => { try { return localStorage.getItem("last-circle"); } catch { return null; } })();
    circleSelect.innerHTML = circles.map((c) => `<option value="${esc(c.id)}">${esc(c.name)} (${esc(t(`circle.${c.type}`))})</option>`).join("");
    if (keep && circles.some((c) => c.id === keep)) circleSelect.value = keep;
    if (first) checked = new Set(circle()?.members || [me]);
    renderPeople();
  }));
  stops.push(people.subscribe(() => renderPeople()));
  stops.push(myFriendships(me).subscribe((list) => { if (list) { friends = friendIds(list); renderPeople(); } }));

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#new-title").value.trim();
    const date = $("#new-date").value;
    const c = circle();
    $("#new-title").classList.toggle("is-invalid", !title);
    $("#new-date").classList.toggle("is-invalid", !date);
    if (!title || !date || !c) return;
    $("#new-save").disabled = true;
    const guestsFromOutside = [...invitedFriends].filter((uid) => !c.members.includes(uid) && friends.includes(uid));
    const id = await attempt(() => createMeal(me, {
      title, date, time: $("#new-time").value || "", circleId: c.id, circleName: c.name,
      viewers: [...new Set([...c.members, me, ...guestsFromOutside])], participants: [...checked].filter((uid) => c.members.includes(uid) || uid === me),
      declined: [], invited: guestsFromOutside, guests: [], rsvp: rsvp.checked, recipe, servings: null,
    }));
    $("#new-save").disabled = false;
    if (id) {
      // Planned: the recipe and the costs are for later, and the next page says so too.
      toast(t("meal.planned"));
      go(`meal.html?id=${encodeURIComponent(id)}`);
    }
  });
}

// =====================================================================================================================================
// An existing meal
// =====================================================================================================================================
function startView(id) {
  let meal = null;
  let circles = [];
  let recipes = allRecipes([]);
  let sort = "all";
  let friends = [];
  let costFormOpen = false; // "Add costs" was pressed

  const eaterPeople = () => meal.participants.map((uid) => person(uid));
  const chosenRecipe = () => findRecipe(meal.recipe, recipes);
  const servings = () => meal.servings || Math.max(1, eaters(meal).length);
  /** Everyone who could join: the circle's members (when I am in it), anyone invited, and anyone who already said yes or no. */
  function candidates() {
    const circle = circles.find((c) => c.id === meal.circleId);
    return [...new Set([...(circle ? circle.members : meal.viewers), ...meal.invited, ...meal.participants, ...meal.declined])];
  }

  function renderHeader() {
    $("#meal-title").textContent = meal.title || t("meal.untitled");
    const when = `${formatDay(meal.date, { weekday: "long" })}${meal.time ? ` · ${meal.time}` : ""}`;
    $("#meal-when").textContent = `${when} · ${meal.circleName} · ${t("meal.hostedBy", { name: person(meal.host).name })}`;
    $("#meal-delete-btn").closest("li").hidden = meal.host !== me;
  }

  function renderRsvp() {
    const joining = meal.participants.includes(me);
    const declined = meal.declined.includes(me);
    const reason = declined ? meal.declineReasons.get(me) : "";
    $("#rsvp-question").textContent = joining ? t("meal.youJoin")
      : declined ? (reason ? t("meal.youDeclineBecause", { reason }) : t("meal.youDecline")) : t("meal.areYouJoining");
    $("#rsvp-join").classList.toggle("btn-success", !joining);
    $("#rsvp-join").classList.toggle("btn-outline-success", joining);
    $("#rsvp-join").disabled = joining;
    // Already said no: the button changes (or adds) the reason instead.
    $("#rsvp-decline-label").textContent = declined ? (reason ? t("meal.changeReason") : t("meal.addReason")) : t("meal.decline");
    $("#rsvp-bar").classList.toggle("rsvp-bar--open", !joining && !declined);
  }

  /** Opens the "want to say why?" field (with my current reason, when I gave one). */
  function openDeclineForm() {
    $("#decline-reason").value = meal.declined.includes(me) ? meal.declineReasons.get(me) || "" : "";
    $("#decline-form").classList.remove("d-none");
    $("#decline-reason").focus();
    $("#rsvp-bar").scrollIntoView({ block: "nearest" });
  }
  const closeDeclineForm = () => $("#decline-form").classList.add("d-none");
  async function sendDecline(reason) {
    const done = await attempt(async () => { await declineMeal(id, me, reason); return true; });
    if (done) closeDeclineForm();
  }

  function renderAllergies() {
    const at = eaterPeople();
    const recipe = chosenRecipe();
    const conflicts = recipe ? allergyConflicts(recipe, at) : [];
    let html = "";
    if (conflicts.length) {
      html = `<div class="alert alert-danger allergy-danger" role="alert">
        <div class="d-flex gap-2"><i class="bi bi-exclamation-octagon-fill fs-4" aria-hidden="true"></i><div>
        <strong class="d-block">${esc(t("allergy.dangerTitle"))}</strong>
        <ul class="mb-0">${conflicts.map((c) => `<li>${esc(t("allergy.dangerLine", { recipe: recipe.name, name: c.name, allergens: c.allergens.map((a) => allergenLabel(a, lang)).join(", ") }))}</li>`).join("")}</ul>
        </div></div></div>`;
    } else {
      const lines = allergyLines(at);
      if (lines) html = `<div class="alert alert-warning" role="status"><strong>${esc(t("meal.allergiesAtTable"))}</strong><ul class="mb-0">${lines}</ul>${recipe ? `<p class="small mb-0 mt-1">${esc(t("allergy.recipeSafe"))}</p>` : ""}</div>`;
    }
    $("#allergy-box").innerHTML = html + hiddenAllergiesNote(at);
  }

  function renderPeople() {
    const rows = candidates().map((uid) => {
      const p = person(uid);
      const isIn = meal.participants.includes(uid);
      const declined = meal.declined.includes(uid);
      const said = declined ? `<span class="badge text-bg-secondary">${esc(t("status.declined"))}</span>`
        : !isIn && (meal.rsvp || meal.invited.includes(uid)) ? `<span class="badge text-bg-warning">${esc(t("status.invited"))}</span>` : "";
      // Their reason for not coming (written by them; shown as text, never as markup).
      const reason = declined ? meal.declineReasons.get(uid) : "";
      return `<label class="list-group-item d-flex align-items-center gap-2 px-0">
        <input class="form-check-input mt-0" type="checkbox" data-person="${esc(uid)}" ${isIn ? "checked" : ""} aria-label="${esc(t("meal.eats", { name: p.name }))}">
        ${avatarHtml(p, "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0"><span class="d-block text-truncate">${esc(p.name)}${uid === me ? ` <span class="text-body-secondary small">(${esc(t("common.you"))})</span>` : ""}</span>
        ${p.allergies.length ? `<span class="d-block small">${allergenBadges(p.allergies, { danger: chosenRecipe()?.allergens || [] })}</span>` : ""}
        ${hiddenAllergiesTag(p)}
        ${reason ? `<span class="d-block small text-body-secondary decline-reason"><i class="bi bi-chat-left-quote" aria-hidden="true"></i> ${esc(reason)}</span>` : ""}</span>
        ${said}
      </label>`;
    });
    const guests = meal.guests.map((g) => `<div class="list-group-item d-flex align-items-center gap-2 px-0">
        <span class="avatar avatar-sm avatar-placeholder" aria-hidden="true"><i class="bi bi-person" aria-hidden="true"></i></span>
        <span class="flex-grow-1 min-w-0 text-truncate">${esc(g.name)} <span class="text-body-secondary small">(${esc(t("meal.guest"))})</span></span>
        <button type="button" class="btn btn-sm btn-link text-danger" data-remove-guest="${esc(g.id)}" aria-label="${esc(t("meal.removeGuest", { name: g.name }))}"><i class="bi bi-x-lg" aria-hidden="true"></i></button>
      </div>`);
    $("#people-list").innerHTML = [...rows, ...guests].join("");
    $("#eater-count").textContent = String(eaters(meal).length);
    renderFriendInvites();
  }

  /** My friends who cannot see this meal yet, to invite (the box is hidden when there is nobody left to invite). */
  function renderFriendInvites() {
    const open = friends.filter((uid) => !meal.viewers.includes(uid)).map((uid) => person(uid));
    $("#invite-friends-box").classList.toggle("d-none", !open.length);
    const keep = new Set([...document.querySelectorAll("#invite-friends-list input:checked")].map((x) => x.value));
    $("#invite-friends-list").innerHTML = open.map((p) => `
      <label class="list-group-item d-flex align-items-center gap-2">
        <input class="form-check-input mt-0" type="checkbox" value="${esc(p.id)}" ${keep.has(p.id) ? "checked" : ""}>
        ${avatarHtml(p, "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0 text-truncate">${esc(p.name)}</span>
        ${p.allergies.length ? `<span class="small">${allergenBadges(p.allergies)}</span>` : ""}
      </label>`).join("");
  }

  function renderRecipe() {
    const recipe = chosenRecipe();
    if (!recipe) {
      $("#recipe-box").innerHTML = meal.recipe
        ? `<p class="text-body-secondary small mb-0">${esc(t("meal.recipeGone"))}</p>`
        : `<p class="text-body-secondary small mb-0">${esc(t("meal.noRecipe"))}</p>`;
      $("#choose-recipe").textContent = t("meal.chooseRecipe");
      $("#grocery-card").classList.add("d-none");
      return;
    }
    const danger = allergyConflicts(recipe, eaterPeople()).flatMap((c) => c.allergens);
    $("#choose-recipe").textContent = t("meal.changeRecipe");
    $("#recipe-box").innerHTML = `
      <div class="d-flex align-items-start justify-content-between gap-2">
        <div class="min-w-0">
          <strong class="d-block">${esc(recipe.name)}</strong>
          <span class="small text-body-secondary">${recipe.minutes ? esc(t("recipes.minutes", { n: recipe.minutes })) : ""}</span>
        </div>
        <button type="button" class="btn btn-sm btn-link text-body-secondary" id="recipe-remove">${esc(t("common.remove"))}</button>
      </div>
      <div class="mt-1">${allergenBadges(recipe.allergens, { danger }) || `<span class="small text-body-secondary">${esc(t("recipes.noAllergens"))}</span>`}</div>
      ${recipe.steps.length ? `<details class="mt-2"><summary class="small">${esc(t("recipes.steps"))}</summary><ol class="small mt-1 mb-0">${recipe.steps.map((s) => `<li>${esc(s)}</li>`).join("")}</ol></details>` : ""}
      <p class="small text-body-secondary mt-2 mb-0">${esc(t("recipes.checkPackaging"))}</p>`;
    renderGroceries(recipe, danger);
  }

  function renderGroceries(recipe, danger) {
    const { toBuy, staples } = groceryList(recipe, servings());
    const bad = new Set(danger);
    $("#grocery-card").classList.remove("d-none");
    $("#servings-value").textContent = String(servings());
    $("#grocery-list").innerHTML = toBuy.map((i) => {
      const key = groceryKey(i);
      const has = meal.have.includes(key);
      const risky = i.allergens.some((a) => bad.has(a));
      return `<label class="list-group-item d-flex align-items-center gap-2 grocery-item ${has ? "is-done" : ""}">
        <input class="form-check-input mt-0" type="checkbox" data-have="${esc(key)}" ${has ? "checked" : ""}>
        <span class="flex-grow-1">${ingredientHtml(i)}</span>
        ${risky ? `<span class="badge allergen-danger" title="${esc(t("allergy.ingredientRisk"))}"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i><span class="visually-hidden">${esc(t("allergy.ingredientRisk"))}</span></span>` : ""}
      </label>`;
    }).join("");
    $("#staples-list").innerHTML = staples.map((i) => `<li>${ingredientHtml(i)}</li>`).join("");
  }

  function renderCost() {
    const ids = eaters(meal);
    const mine = meal.costs.get(me);
    const guestName = (eid) => meal.guests.find((g) => guestId(g) === eid)?.name || "?";
    const nameOf = (eid) => (eid.startsWith("guest:") ? guestName(eid) : person(eid).name);

    // Who paid what: one line per person who added costs; mine can be changed.
    $("#cost-list").innerHTML = [...meal.costs].sort(([a], [b]) => nameOf(a).localeCompare(nameOf(b))).map(([uid, cents]) => `
      <li class="list-group-item d-flex align-items-center gap-2 px-0">
        ${avatarHtml(person(uid), "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0 text-truncate">${esc(t("pay.paidAmount", { name: nameOf(uid) }))}${uid === me ? ` <span class="text-body-secondary small">(${esc(t("common.you"))})</span>` : ""}</span>
        <strong>${esc(formatMoney(cents, lang))}</strong>
        ${uid === me ? `<button type="button" class="btn btn-sm btn-link p-0" id="cost-edit" aria-label="${esc(t("common.edit"))}"><i class="bi bi-pencil" aria-hidden="true"></i></button>` : ""}
      </li>`).join("");

    // The form is folded behind a button until it is needed: the costs come after the shopping, not when planning.
    if (mine && document.activeElement !== $("#cost-total") && !costFormOpen) $("#cost-total").value = (mine / 100).toFixed(2).replace(".", lang === "nl" ? "," : ".");
    $("#cost-clear").classList.toggle("d-none", !mine);
    $("#cost-form").classList.toggle("d-none", !costFormOpen);
    $("#cost-empty").classList.toggle("d-none", costFormOpen || Boolean(mine));
    $("#cost-empty-text").textContent = meal.costs.size ? t("meal.addYoursToo") : t("meal.noCostYet");

    if (!meal.costs.size) { $("#split-box").innerHTML = ""; return; }
    if (!ids.length) { $("#split-box").innerHTML = `<p class="small text-body-secondary mb-0">${esc(t("meal.nobodyEats"))}</p>`; return; }
    const total = mealTotal(meal);
    const shares = mealShares(meal);
    const debts = mealDebts(meal);
    const rows = debts.map((d) => {
      const creditor = person(d.to);
      const involved = d.from === me || d.to === me;
      const action = d.settled ? "" : d.to === me && !d.from.startsWith("guest:")
        ? `<button type="button" class="btn btn-sm btn-outline-primary" data-request="${esc(d.from)}"><i class="bi bi-send" aria-hidden="true"></i> ${esc(t("pay.request"))}</button>`
        : d.from === me
          ? (creditor.paymentLink
            ? `<a class="btn btn-sm btn-primary" href="${esc(creditor.paymentLink)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i> ${esc(t("pay.payNow"))}</a>`
            : `<span class="small text-body-secondary">${esc(t("pay.noLink", { name: creditor.name }))}</span>`)
          : "";
      // Only the two people of a payment mark it paid (and a guest's, by the one they pay).
      const settle = involved
        ? `<button type="button" class="btn btn-sm ${d.settled ? "btn-success" : "btn-outline-success"}" data-settle-from="${esc(d.from)}" data-settle-to="${esc(d.to)}" aria-pressed="${d.settled}">
            <i class="bi ${d.settled ? "bi-check-circle-fill" : "bi-circle"}" aria-hidden="true"></i> ${esc(d.settled ? t("pay.paid") : t("pay.markPaid"))}</button>`
        : d.settled ? `<span class="badge text-bg-success">${esc(t("pay.paid"))}</span>` : "";
      return `<li class="list-group-item d-flex align-items-center gap-2 flex-wrap px-0 ${d.settled ? "is-settled" : ""} ${involved ? "fw-semibold" : ""}">
        <span class="flex-grow-1 min-w-0">${esc(t("pay.owes", { from: nameOf(d.from), to: creditor.name }))}</span>
        <strong>${esc(formatMoney(d.cents, lang))}</strong>
        ${action}
        ${settle}
      </li>`;
    });
    $("#split-box").innerHTML = `
      <p class="mb-2">${esc(t("pay.summary", { total: formatMoney(total, lang), n: ids.length, share: formatMoney(Math.max(...shares.values()), lang) }))}</p>
      ${rows.length ? `<ul class="list-group list-group-flush">${rows.join("")}</ul>` : `<p class="small text-body-secondary mb-0">${esc(t("pay.allEven"))}</p>`}`;
  }
  function renderRecipeOptions() {
    const at = eaterPeople();
    const term = $("#recipe-search").value.trim().toLowerCase();
    const pantry = getPantry();
    let list;
    if (sort === "pantry") {
      list = rankByPantry(recipes, pantry);
      $("#pantry-hint").innerHTML = pantry.length
        ? esc(t("recipes.pantryUsing", { items: pantry.join(", ") }))
        : `${esc(t("recipes.pantryEmpty"))} <a href="recipes.html#pantry">${esc(t("recipes.pantryGo"))}</a>`;
      $("#pantry-hint").classList.remove("d-none");
    } else {
      list = [...recipes].sort((a, b) => a.name.localeCompare(b.name)).map((recipe) => ({ recipe }));
      $("#pantry-hint").classList.add("d-none");
    }
    if (term) list = list.filter((x) => x.recipe.name.toLowerCase().includes(term));
    $("#recipe-options").innerHTML = list.map(({ recipe, missing }) => {
      const conflicts = allergyConflicts(recipe, at);
      const danger = conflicts.flatMap((c) => c.allergens);
      const chosen = meal.recipe && meal.recipe.source === recipe.source && meal.recipe.id === recipe.id;
      return `<button type="button" class="list-group-item list-group-item-action recipe-option ${conflicts.length ? "is-danger" : ""} ${chosen ? "active" : ""}" data-pick="${esc(recipe.source)}:${esc(recipe.id)}">
        <span class="d-flex justify-content-between gap-2"><strong>${esc(recipe.name)}</strong>${missing ? `<span class="small text-nowrap">${esc(t("recipes.toBuy", { n: missing.length }))}</span>` : ""}</span>
        ${conflicts.length ? `<span class="d-block small fw-semibold text-danger"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> ${esc(t("allergy.notSafeFor", { names: conflicts.map((c) => c.name).join(", ") }))}</span>` : ""}
        <span class="d-block mt-1">${allergenBadges(recipe.allergens, { danger })}</span>
        ${missing && missing.length ? `<span class="d-block small text-body-secondary mt-1">${esc(t("recipes.missing", { items: missing.map((i) => i.label).join(", ") }))}</span>` : ""}
      </button>`;
    }).join("") || `<p class="small text-body-secondary mb-0">${esc(t("recipes.none"))}</p>`;
  }

  function render() {
    if (!meal) return;
    renderHeader();
    renderRsvp();
    renderAllergies();
    renderPeople();
    renderRecipe();
    renderCost();
    if ($("#recipe-modal").classList.contains("show")) renderRecipeOptions();
  }

  // ---- Wiring (once; every handler reads the latest meal) ----
  $("#rsvp-join").addEventListener("click", () => attempt(() => joinMeal(id, me)));
  $("#rsvp-decline").addEventListener("click", openDeclineForm);
  $("#rsvp-join").addEventListener("click", closeDeclineForm);
  $("#decline-form").addEventListener("submit", (e) => { e.preventDefault(); sendDecline($("#decline-reason").value); });
  $("#decline-skip").addEventListener("click", () => sendDecline(""));
  $("#decline-cancel").addEventListener("click", closeDeclineForm);

  $("#people-list").addEventListener("change", (e) => {
    const uid = e.target.dataset.person;
    if (!uid) return;
    if (uid === me) {
      // Unticking myself is saying no: it asks for the (optional) reason first, like the button; ticking is joining.
      if (e.target.checked) attempt(() => joinMeal(id, me));
      else { e.target.checked = true; openDeclineForm(); }
      return;
    }
    const participants = new Set(meal.participants);
    if (e.target.checked) participants.add(uid); else participants.delete(uid);
    attempt(() => updateMeal(id, {
      participants: [...participants], declined: meal.declined.filter((d) => !participants.has(d)), viewers: [...new Set([...meal.viewers, uid])],
    }));
  });
  $("#people-list").addEventListener("click", (e) => {
    const button = e.target.closest("[data-remove-guest]");
    if (!button) return;
    const gid = button.dataset.removeGuest;
    attempt(() => updateMeal(id, { guests: meal.guests.filter((g) => g.id !== gid), settled: [...meal.settledPairs].filter((s) => !s.startsWith(`guest:${gid}>`)) }));
  });
  // Someone with Splitskebab is picked from the matches by name (they then see the meal); a name typed and added is a guest who pays
  // the payers back directly. Nobody is added by email (people are their uid; emails are private).
  const redrawPicker = attachPeoplePicker($("#add-extra"), $("#add-extra-results"), {
    me,
    skip: () => candidates(),
    label: t("common.add"),
    onPick: (uid) => attempt(() => updateMeal(id, {
      participants: [...new Set([...meal.participants, uid])], viewers: [...new Set([...meal.viewers, uid])], declined: meal.declined.filter((d) => d !== uid),
    }), t("meal.added", { name: person(uid).name })),
    empty: () => "",
  });
  stops.push(people.subscribe(() => redrawPicker()));
  $("#add-extra-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const value = $("#add-extra").value.trim();
    if (!value || meal.guests.length >= 30) return;
    attempt(() => updateMeal(id, { guests: [...meal.guests, { id: randomId(), name: value.slice(0, 60) }] }), t("meal.added", { name: value.slice(0, 60) }));
    $("#add-extra").value = "";
    redrawPicker();
  });

  $("#invite-friends-toggle").addEventListener("click", (e) => {
    const panel = $("#invite-friends-panel");
    panel.classList.toggle("d-none");
    e.currentTarget.setAttribute("aria-expanded", String(!panel.classList.contains("d-none")));
  });
  $("#invite-friends-send").addEventListener("click", async () => {
    const uids = [...document.querySelectorAll("#invite-friends-list input:checked")].map((x) => x.value).filter((uid) => friends.includes(uid));
    if (!uids.length) { toast(t("meal.pickFriends"), "warning"); return; }
    const done = await attempt(async () => { await inviteToMeal(id, uids); return true; }, t("meal.invitesSent", { n: uids.length }));
    if (done) $("#invite-friends-panel").classList.add("d-none");
  });

  $("#meal-edit-btn").addEventListener("click", () => {
    $("#edit-title").value = meal.title;
    $("#edit-date").value = meal.date;
    $("#edit-time").value = meal.time;
    $("#meal-edit").classList.remove("d-none");
    $("#edit-title").focus();
  });
  $("#edit-cancel").addEventListener("click", () => $("#meal-edit").classList.add("d-none"));
  $("#meal-edit").addEventListener("submit", async (e) => {
    e.preventDefault();
    const title = $("#edit-title").value.trim();
    const date = $("#edit-date").value;
    $("#edit-title").classList.toggle("is-invalid", !title);
    if (!title || !date) return;
    await attempt(() => updateMeal(id, { title, date, time: $("#edit-time").value || "" }), t("common.saved"));
    $("#meal-edit").classList.add("d-none");
  });
  $("#meal-delete-btn").addEventListener("click", async () => {
    if (!window.confirm(t("meal.confirmDelete", { title: meal.title }))) return;
    const done = await attempt(async () => { await deleteMeal(id); return true; });
    if (done) go("index.html");
  });

  $("#recipe-modal").addEventListener("show.bs.modal", () => { $("#recipe-search").value = ""; renderRecipeOptions(); });
  $("#recipe-search").addEventListener("input", renderRecipeOptions);
  for (const radio of document.querySelectorAll('input[name="recipe-sort"]')) radio.addEventListener("change", () => { sort = radio.value; renderRecipeOptions(); });
  $("#recipe-options").addEventListener("click", async (e) => {
    const button = e.target.closest("[data-pick]");
    if (!button) return;
    const ref = parseRecipeRef(button.dataset.pick);
    window.bootstrap.Modal.getOrCreateInstance($("#recipe-modal")).hide();
    await attempt(() => updateMeal(id, { recipe: ref, have: [], servings: meal.servings || Math.max(1, eaters(meal).length) }));
  });
  $("#recipe-box").addEventListener("click", (e) => {
    if (e.target.id === "recipe-remove") attempt(() => updateMeal(id, { recipe: null, have: [] }));
  });

  const setServings = (n) => attempt(() => updateMeal(id, { servings: Math.min(50, Math.max(1, n)) }));
  $("#servings-minus").addEventListener("click", () => setServings(servings() - 1));
  $("#servings-plus").addEventListener("click", () => setServings(servings() + 1));
  $("#grocery-list").addEventListener("change", (e) => {
    const key = e.target.dataset.have;
    if (key) attempt(() => setHave(id, key, e.target.checked));
  });
  $("#share-list").addEventListener("click", () => {
    const recipe = chosenRecipe();
    if (!recipe) return;
    const { toBuy } = groceryList(recipe, servings());
    const left = toBuy.filter((i) => !meal.have.includes(groceryKey(i)));
    const text = `${t("meal.shoppingFor", { title: meal.title, day: formatDay(meal.date) })}\n${left.map((i) => `• ${ingredientText(i)}`).join("\n") || t("meal.haveEverything")}`;
    shareText(text);
  });

  $("#cost-add").addEventListener("click", () => {
    costFormOpen = true;
    $("#cost-total").value = "";
    renderCost();
    $("#cost-total").focus();
  });
  $("#cost-list").addEventListener("click", (e) => {
    if (!e.target.closest("#cost-edit")) return;
    costFormOpen = true;
    const mine = meal.costs.get(me);
    $("#cost-total").value = mine ? (mine / 100).toFixed(2).replace(".", lang === "nl" ? "," : ".") : "";
    renderCost();
    $("#cost-total").focus();
  });
  $("#cost-cancel").addEventListener("click", () => { costFormOpen = false; renderCost(); });

  $("#cost-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cents = parseMoney($("#cost-total").value);
    $("#cost-total").classList.toggle("is-invalid", cents == null);
    if (cents == null) { toast(t("meal.badAmount"), "warning"); return; }
    const done = await attempt(async () => { await setMyCost(meal, me, cents); return true; }, t("meal.costSaved"));
    if (done) { costFormOpen = false; renderCost(); }
  });
  $("#cost-clear").addEventListener("click", async () => {
    if (!window.confirm(t("meal.confirmClearCost"))) return;
    const done = await attempt(async () => { await setMyCost(meal, me, null); return true; });
    if (done) { costFormOpen = false; $("#cost-total").value = ""; renderCost(); }
  });
  $("#split-box").addEventListener("click", (e) => {
    const settle = e.target.closest("[data-settle-from]");
    if (settle) {
      const { settleFrom: from, settleTo: to } = settle.dataset;
      attempt(() => setSettled(id, from, to, !meal.settledPairs.has(settleKey(from, to))));
      return;
    }
    const request = e.target.closest("[data-request]");
    if (request) {
      const debt = mealDebts(meal).find((d) => d.from === request.dataset.request && d.to === me);
      if (!debt) return;
      const mine = person(me);
      const vars = { name: person(debt.from).name, amount: formatMoney(debt.cents, lang), title: meal.title, day: formatDay(meal.date), link: mine.paymentLink };
      shareText(mine.paymentLink ? t("pay.requestText", vars) : t("pay.requestTextNoLink", vars));
    }
  });
  // ---- Live data ----
  stops.push(watchMeal(id, (next, err) => {
    if (err || !next) {
      $("#meal-view").classList.add("d-none");
      fail(err?.code === "permission-denied" || !next ? t("meal.notFound") : t("error.load"));
      return;
    }
    meal = next;
    $("#meal-loading").classList.add("d-none");
    $("#meal-view").classList.remove("d-none");
    render();
  }));
  stops.push(people.subscribe(() => render()));
  stops.push(myCircles(me).subscribe((list) => { if (list) { circles = list; render(); } }));
  stops.push(userRecipes.subscribe((list) => { if (list) { recipes = allRecipes(list); render(); } }));
  stops.push(myFriendships(me).subscribe((list) => { if (list) { friends = friendIds(list); if (meal) renderFriendInvites(); } }));
}

const id = param("id");
if (param("new")) startNew();
else if (id && /^[\w-]{1,100}$/.test(id)) startView(id);
else fail(t("meal.notFound"));
