// The recipes page: every recipe (built-in and users' own) with its allergens, marked in red when I am allergic to it; adding and
// editing my own; and "what can I make", which ranks the recipes by how little I would still have to buy with what is in the house.
import "../vendor/sel/elements/tabs-glass-paper.js";
import { whenUser, esc, onLeave, attempt, allergenBadges, toast } from "./ui.js";
import { people, person, userRecipes, saveRecipe, deleteRecipe } from "./store.js";
import { allRecipes, ingredientHtml, getPantry, setPantry, recipeRef } from "./recipe-view.js";
import { scaleIngredients, rankByPantry, pantryMatches, findIngredientKey, UNITS, TAGS } from "./recipe-logic.js";
import { INGREDIENTS } from "./catalog.js";
import { ALLERGENS, allergenLabel } from "./allergens.js";
import { getLang, t } from "./i18n.js";

const user = await whenUser();
const me = user.uid;
const lang = getLang();
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let rawUser = [];
let recipes = allRecipes([]);
let pantry = getPantry();
let detail = null; // { recipe, servings }
let editing = null; // id of the user recipe being edited, or null for a new one

const filters = new Set(); // ticked tags: a recipe must have all of them
const TAG_ICON = { quick: "bi-lightning-charge", vegetarian: "bi-flower1", vegan: "bi-tree", budget: "bi-piggy-bank", group: "bi-people" };
const tagBadges = (recipe) => recipe.tags.filter((tag) => !(tag === "vegetarian" && recipe.tags.includes("vegan")))
  .map((tag) => `<span class="badge text-bg-light border recipe-tag"><i class="bi ${TAG_ICON[tag]}" aria-hidden="true"></i> ${esc(t(`tag.${tag}`))}</span>`).join(" ");

const myAllergies = () => person(me).allergies;
const conflictsForMe = (recipe) => recipe.allergens.filter((a) => myAllergies().includes(a));

function recipeItem(recipe, extra = "") {
  const danger = conflictsForMe(recipe);
  return `<button type="button" class="list-group-item list-group-item-action recipe-option ${danger.length ? "is-danger" : ""}" data-open="${esc(recipeRef(recipe))}">
    <span class="d-flex justify-content-between gap-2">
      <strong>${esc(recipe.name)}</strong>
      <span class="small text-body-secondary text-nowrap">${recipe.minutes ? esc(t("recipes.minutes", { n: recipe.minutes })) : ""}${recipe.source === "user" ? ` · ${esc(t("recipes.byUser", { name: person(recipe.owner || "").name }))}` : ""}</span>
    </span>
    ${danger.length ? `<span class="d-block small fw-semibold text-danger"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> ${esc(t("allergy.notSafeForYou"))}</span>` : ""}
    ${recipe.tags.length ? `<span class="d-block mt-1">${tagBadges(recipe)}</span>` : ""}
    <span class="d-block mt-1">${allergenBadges(recipe.allergens, { danger }) || `<span class="small text-body-secondary">${esc(t("recipes.noAllergens"))}</span>`}</span>
    ${extra}
  </button>`;
}

function renderList() {
  const term = $("#recipe-filter").value.trim().toLowerCase();
  const hide = $("#hide-unsafe").checked;
  const list = [...recipes]
    .filter((r) => !term || r.name.toLowerCase().includes(term) || r.ingredients.some((i) => i.label.toLowerCase().includes(term)))
    .filter((r) => !hide || !conflictsForMe(r).length)
    .filter((r) => [...filters].every((tag) => r.tags.includes(tag)))
    .sort((a, b) => a.name.localeCompare(b.name));
  $("#recipe-count").textContent = t("recipes.count", { n: list.length, total: recipes.length });
  $("#recipe-list").innerHTML = list.map((r) => recipeItem(r)).join("") || `<p class="small text-body-secondary mb-0">${esc(t("recipes.none"))}</p>`;
}

function renderFilters() {
  $("#recipe-filters").innerHTML = TAGS.map((tag) => `
    <input type="checkbox" class="btn-check" id="filter-${tag}" value="${tag}" autocomplete="off" ${filters.has(tag) ? "checked" : ""}>
    <label class="btn btn-sm btn-outline-primary rounded-pill" for="filter-${tag}"><i class="bi ${TAG_ICON[tag]}" aria-hidden="true"></i> ${esc(t(`tag.${tag}`))}</label>`).join("");
}

function renderPantry() {
  $("#pantry-chips").innerHTML = pantry.map((item, i) => `<span class="badge tag tag--green pantry-chip">${esc(item)}
      <button type="button" class="btn-close btn-close-sm" data-unpantry="${i}" aria-label="${esc(t("common.removeItem", { item }))}"></button></span>`).join("")
    + (pantry.length ? ` <button type="button" class="btn btn-link btn-sm" id="pantry-clear">${esc(t("recipes.clear"))}</button>` : "");
  if (!pantry.length) {
    $("#pantry-results").innerHTML = `<p class="small text-body-secondary mb-0">${esc(t("recipes.pantryStart"))}</p>`;
    return;
  }
  const ranked = pantryMatches(rankByPantry(recipes, pantry)).slice(0, 10);
  if (!ranked.length) {
    $("#pantry-results").innerHTML = `<p class="small text-body-secondary mb-0">${esc(t("recipes.noMatch"))}</p>`;
    return;
  }
  $("#pantry-results").innerHTML = ranked.map(({ recipe, missing, have, swaps, score }) => {
    const swapped = new Set(swaps.map((s) => s.ingredient));
    const uses = have.filter((i) => !swapped.has(i)).map((i) => i.label);
    return recipeItem(recipe, `
    <span class="d-block small mt-1">
      <span class="badge ${missing.length ? "text-bg-warning" : "text-bg-success"}">${esc(missing.length ? t("recipes.toBuy", { n: missing.length }) : t("recipes.nothingToBuy"))}</span>
      <span class="badge text-bg-light border">${esc(t("recipes.coverage", { pct: Math.round(score * 100) }))}</span>
    </span>
    ${uses.length ? `<span class="d-block small text-success-emphasis mt-1"><i class="bi bi-check2" aria-hidden="true"></i> ${esc(t("recipes.youHave", { items: uses.join(", ") }))}</span>` : ""}
    ${swaps.map((s) => `<span class="d-block small text-success-emphasis"><i class="bi bi-arrow-left-right" aria-hidden="true"></i> ${esc(t("recipes.swap", { using: s.using, instead: s.ingredient.label }))}</span>`).join("")}
    ${missing.length ? `<span class="d-block small text-body-secondary">${esc(t("recipes.missing", { items: missing.map((i) => i.label).join(", ") }))}</span>` : ""}`);
  }).join("");
}

function renderDetail() {
  if (!detail) return;
  const { recipe, servings } = detail;
  const danger = conflictsForMe(recipe);
  $("#detail-title").textContent = recipe.name;
  $("#detail-meta").textContent = [recipe.minutes ? t("recipes.minutes", { n: recipe.minutes }) : "", recipe.source === "user" ? t("recipes.byUser", { name: person(recipe.owner || "").name }) : t("recipes.builtin")].filter(Boolean).join(" · ");
  $("#detail-danger").innerHTML = danger.length
    ? `<div class="alert alert-danger allergy-danger" role="alert"><i class="bi bi-exclamation-octagon-fill" aria-hidden="true"></i> <strong>${esc(t("allergy.youAreAllergic", { allergens: danger.map((a) => allergenLabel(a, lang)).join(", ") }))}</strong></div>` : "";
  $("#detail-allergens").innerHTML = allergenBadges(recipe.allergens, { danger }) || `<span class="small text-body-secondary">${esc(t("recipes.noAllergens"))}</span>`;
  $("#detail-servings").textContent = String(servings);
  $("#detail-ingredients").innerHTML = scaleIngredients(recipe, servings).map((i) => `<li class="${i.allergens.some((a) => danger.includes(a)) ? "text-danger fw-semibold" : ""}">${ingredientHtml(i)}${i.staple ? ` <span class="small text-body-secondary">(${esc(t("recipes.staple"))})</span>` : ""}</li>`).join("");
  $("#detail-steps").innerHTML = recipe.steps.map((s) => `<li>${esc(s)}</li>`).join("") || `<li class="text-body-secondary">${esc(t("recipes.noSteps"))}</li>`;
  $("#detail-plan").href = `meal.html?new=1&recipe=${encodeURIComponent(recipeRef(recipe))}`;
  $("#detail-owner-actions").classList.toggle("invisible", !(recipe.source === "user" && recipe.owner === me));
}

function openDetail(ref) {
  const recipe = recipes.find((r) => recipeRef(r) === ref);
  if (!recipe) return;
  detail = { recipe, servings: recipe.servings };
  renderDetail();
  window.bootstrap.Modal.getOrCreateInstance($("#recipe-detail")).show();
}

// ---- Own recipes: the form ----
function ingredientRow(row = {}) {
  const div = document.createElement("div");
  div.className = "input-group input-group-sm ingredient-row";
  div.innerHTML = `
    <input class="form-control" data-field="name" list="ingredient-names" maxlength="80" placeholder="${esc(t("recipes.ingredient"))}" aria-label="${esc(t("recipes.ingredient"))}" value="${esc(row.name || "")}">
    <input class="form-control ingredient-row__qty" data-field="qty" type="number" min="0" step="any" inputmode="decimal" aria-label="${esc(t("recipes.amount"))}" placeholder="${esc(t("recipes.amount"))}" value="${row.qty ?? ""}">
    <select class="form-select ingredient-row__unit" data-field="unit" aria-label="${esc(t("recipes.unit"))}">
      ${UNITS.map((u) => `<option value="${u}" ${row.unit === u ? "selected" : ""}>${esc(t(`unit.${u}`))}</option>`).join("")}
    </select>
    <button type="button" class="btn btn-outline-danger" data-remove-row aria-label="${esc(t("common.remove"))}"><i class="bi bi-x-lg" aria-hidden="true"></i></button>`;
  return div;
}

function renderAllergenChoices(selected) {
  $("#rf-allergens").innerHTML = ALLERGENS.map((a) => `
    <input type="checkbox" class="btn-check" id="rf-al-${a.id}" value="${a.id}" ${selected.includes(a.id) ? "checked" : ""} autocomplete="off">
    <label class="btn btn-sm btn-outline-secondary" for="rf-al-${a.id}">${a.icon} ${esc(a[lang] || a.en)}</label>`).join("");
}

/** Ticks the allergens of the ingredients Splitskebab recognises (never unticks: the author may know better). */
function autoTick() {
  for (const input of document.querySelectorAll('#rf-ingredients [data-field="name"]')) {
    const key = findIngredientKey(input.value);
    for (const a of key ? INGREDIENTS[key].allergens : []) {
      const box = document.querySelector(`#rf-al-${a}`);
      if (box) box.checked = true;
    }
  }
}

function openForm(raw = null) {
  editing = raw ? raw.id : null;
  $("#edit-recipe-title").textContent = raw ? t("recipes.editRecipe") : t("recipes.newRecipe");
  $("#rf-name").value = raw?.name || "";
  $("#rf-servings").value = raw?.servings || 4;
  $("#rf-minutes").value = raw?.minutes || 30;
  $("#rf-steps").value = raw?.steps || "";
  const rows = $("#rf-ingredients");
  rows.replaceChildren(...(raw?.ingredients?.length ? raw.ingredients : [{}, {}, {}]).map((r) => ingredientRow(r)));
  renderAllergenChoices(raw?.allergens || []);
  window.bootstrap.Modal.getOrCreateInstance($("#recipe-edit")).show();
}

// ---- Wiring ----
$("#recipe-filter").addEventListener("input", renderList);
$("#recipe-filters").addEventListener("change", (e) => {
  if (e.target.checked) filters.add(e.target.value); else filters.delete(e.target.value);
  renderList();
});
renderFilters();
$("#hide-unsafe").addEventListener("change", renderList);
$("#recipe-list").addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openDetail(b.dataset.open); });
$("#pantry-results").addEventListener("click", (e) => { const b = e.target.closest("[data-open]"); if (b) openDetail(b.dataset.open); });
$("#detail-minus").addEventListener("click", () => { if (detail && detail.servings > 1) { detail.servings -= 1; renderDetail(); } });
$("#detail-plus").addEventListener("click", () => { if (detail && detail.servings < 50) { detail.servings += 1; renderDetail(); } });
$("#detail-edit").addEventListener("click", () => {
  const raw = rawUser.find((r) => r.id === detail?.recipe.id);
  if (!raw) return;
  window.bootstrap.Modal.getOrCreateInstance($("#recipe-detail")).hide();
  openForm(raw);
});
$("#detail-delete").addEventListener("click", async () => {
  if (!detail || !window.confirm(t("recipes.confirmDelete", { name: detail.recipe.name }))) return;
  const id = detail.recipe.id;
  window.bootstrap.Modal.getOrCreateInstance($("#recipe-detail")).hide();
  await attempt(() => deleteRecipe(id), t("recipes.deleted"));
});

$("#pantry-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const items = $("#pantry-input").value.split(",").map((x) => x.trim()).filter(Boolean);
  if (!items.length) return;
  pantry = setPantry([...pantry, ...items]);
  $("#pantry-input").value = "";
  renderPantry();
});
$("#pantry-chips").addEventListener("click", (e) => {
  if (e.target.id === "pantry-clear") { pantry = setPantry([]); renderPantry(); return; }
  const i = e.target.closest("[data-unpantry]")?.dataset.unpantry;
  if (i == null) return;
  pantry = setPantry(pantry.filter((_, n) => n !== Number(i)));
  renderPantry();
});

$("#add-recipe").addEventListener("click", () => openForm());
$("#rf-add-row").addEventListener("click", () => { if ($("#rf-ingredients").children.length < 60) $("#rf-ingredients").append(ingredientRow()); });
$("#rf-ingredients").addEventListener("click", (e) => { if (e.target.closest("[data-remove-row]")) e.target.closest(".ingredient-row").remove(); });
$("#rf-ingredients").addEventListener("change", (e) => { if (e.target.dataset.field === "name") autoTick(); });
$("#recipe-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#rf-name").value.trim();
  const ingredients = [...document.querySelectorAll("#rf-ingredients .ingredient-row")].map((row) => ({
    name: row.querySelector('[data-field="name"]').value.trim(),
    qty: row.querySelector('[data-field="qty"]').value,
    unit: row.querySelector('[data-field="unit"]').value,
  })).filter((i) => i.name);
  $("#rf-name").classList.toggle("is-invalid", !name);
  if (!name) return;
  if (!ingredients.length) { toast(t("recipes.needIngredient"), "warning"); return; }
  autoTick();
  const allergens = [...document.querySelectorAll("#rf-allergens input:checked")].map((x) => x.value);
  $("#rf-save").disabled = true;
  const id = await attempt(() => saveRecipe(me, editing, {
    name, servings: $("#rf-servings").value, minutes: $("#rf-minutes").value, ingredients, allergens, steps: $("#rf-steps").value,
  }), t("common.saved"));
  $("#rf-save").disabled = false;
  if (id) window.bootstrap.Modal.getOrCreateInstance($("#recipe-edit")).hide();
});

// The ingredient names Splitskebab knows, as suggestions for the pantry and the recipe form.
$("#ingredient-names").innerHTML = Object.values(INGREDIENTS).map((i) => `<option value="${esc(i[lang] || i.en)}">`).join("");

if (location.hash === "#pantry") window.bootstrap.Tab.getOrCreateInstance($("#pantry-tab")).show();

stops.push(userRecipes.subscribe((list, err) => {
  if (err) { $("#recipes-error").textContent = t("error.load"); $("#recipes-error").classList.remove("d-none"); return; }
  rawUser = list;
  recipes = allRecipes(list);
  if (detail) detail.recipe = recipes.find((r) => recipeRef(r) === recipeRef(detail.recipe)) || detail.recipe;
  renderList();
  renderPantry();
  renderDetail();
}));
stops.push(people.subscribe(() => { renderList(); renderPantry(); renderDetail(); }));
renderList();
renderPantry();
