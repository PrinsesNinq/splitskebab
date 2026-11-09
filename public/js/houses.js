// Houses and groups: the ones I am in, their members (with their allergies), adding someone, and what everyone owes everyone for the
// meals of that house or group, netted per pair, with "request" (a message with my payment link) and "mark as paid". The Friends tab is
// js/friends.js.
import "../vendor/sel/elements/tabs-glass-paper.js";
import { startFriends } from "./friends.js";
import { whenUser, esc, onLeave, attempt, avatarHtml, avatarStackHtml, allergenBadges, shareText, toast, hiddenAllergiesTag } from "./ui.js";
import { myCircles, myMeals, people, person, createCircle, renameCircle, addMember, removeMember, deleteCircle, setSettled, setCircleAdmin } from "./store.js";
import { isCircleAdmin } from "./analytics.js";
import { attachPeoplePicker } from "./people-picker.js";
import { netDebts, mealDebts, formatMoney } from "./money.js";
import { getLang, t } from "./i18n.js";

const user = await whenUser();
const me = user.uid;
const lang = getLang();
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let circles = null;
let meals = [];
const open = new Set(); // circles whose details are unfolded, kept across redraws
const searches = new Map(); // what was typed in each circle's "add someone" search, kept across redraws

/** A name for an eater id: a person's uid, or "guest:<id>" for a guest of some meal. */
function nameOf(id, list = meals) {
  if (!id.startsWith("guest:")) return person(id).name;
  for (const m of list) {
    const g = m.guests.find((x) => `guest:${x.id}` === id);
    if (g) return `${g.name} (${t("meal.guest")})`;
  }
  return t("meal.guest");
}

function debtRows(debts, circleMeals) {
  if (!debts.length) return `<p class="small text-body-secondary mb-0">${esc(t("houses.allSettled"))}</p>`;
  return `<ul class="list-group list-group-flush">${debts.map((d) => {
    const mine = d.to === me || d.from === me;
    const creditor = person(d.to);
    const actions = [];
    if (d.to === me && !d.from.startsWith("guest:")) actions.push(`<button type="button" class="btn btn-sm btn-outline-primary" data-request="${esc(d.from)}" data-cents="${d.cents}"><i class="bi bi-send" aria-hidden="true"></i> ${esc(t("pay.request"))}</button>`);
    if (d.from === me && creditor.paymentLink) actions.push(`<a class="btn btn-sm btn-primary" href="${esc(creditor.paymentLink)}" target="_blank" rel="noopener noreferrer"><i class="bi bi-box-arrow-up-right" aria-hidden="true"></i> ${esc(t("pay.payNow"))}</a>`);
    if (mine) actions.push(`<button type="button" class="btn btn-sm btn-outline-success" data-settle-from="${esc(d.from)}" data-settle-to="${esc(d.to)}"><i class="bi bi-check2" aria-hidden="true"></i> ${esc(t("pay.markPaid"))}</button>`);
    return `<li class="list-group-item px-0 d-flex align-items-center gap-2 flex-wrap ${mine ? "fw-semibold" : ""}">
      <span class="flex-grow-1 min-w-0">${esc(t("pay.owes", { from: nameOf(d.from, circleMeals), to: creditor.name }))}</span>
      <span>${esc(formatMoney(d.cents, lang))}</span>
      ${actions.join("")}
    </li>`;
  }).join("")}</ul>`;
}

function circleCard(c) {
  const members = c.members.map((id) => person(id));
  const circleMeals = meals.filter((m) => m.circleId === c.id);
  const debts = netDebts(circleMeals);
  const owner = c.owner === me;
  const iAmAdmin = isCircleAdmin(c, me); // sees the analytics, chooses other admins
  const expanded = open.has(c.id);
  return `<section class="card circle-card" data-circle="${esc(c.id)}">
    <button type="button" class="card-header circle-card__head d-flex align-items-center gap-2 text-start" data-toggle-circle="${esc(c.id)}" aria-expanded="${expanded}" aria-controls="circle-body-${esc(c.id)}">
      <i class="bi ${c.type === "house" ? "bi-house-door-fill" : "bi-people-fill"} fs-4 text-primary" aria-hidden="true"></i>
      <span class="flex-grow-1 min-w-0">
        <span class="d-block fw-semibold text-truncate">${esc(c.name)}</span>
        <span class="d-block small text-body-secondary">${esc(t(`circle.${c.type}`))} · ${esc(t("houses.members", { n: members.length }))}${debts.length ? ` · ${esc(t("houses.openDebts", { n: debts.length }))}` : ""}</span>
      </span>
      ${avatarStackHtml(members, 4)}
      <i class="bi bi-chevron-down circle-card__chevron" aria-hidden="true"></i>
    </button>
    <div class="card-body ${expanded ? "" : "d-none"}" id="circle-body-${esc(c.id)}">
      <h3 class="h6" data-i18n="houses.membersTitle">${esc(t("houses.membersTitle"))}</h3>
      <ul class="list-group list-group-flush mb-2">${members.map((p) => `
        <li class="list-group-item px-0 d-flex align-items-center gap-2">
          ${avatarHtml(p, "avatar avatar-sm")}
          <span class="flex-grow-1 min-w-0"><span class="d-block text-truncate">${p.id === me ? esc(p.name) : `<a class="person-link" href="person.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>`}${p.id === c.owner ? ` <span class="badge text-bg-light">${esc(t("houses.owner"))}</span>` : isCircleAdmin(c, p.id) ? ` <span class="badge text-bg-light">${esc(t("houses.admin"))}</span>` : ""}${p.id === me ? ` <span class="text-body-secondary small">(${esc(t("common.you"))})</span>` : ""}</span>
          ${p.allergies.length ? `<span class="d-block small">${allergenBadges(p.allergies)}</span>` : ""}${hiddenAllergiesTag(p)}</span>
          ${iAmAdmin && p.id !== c.owner && p.id !== me ? `<button type="button" class="btn btn-sm btn-link px-1" data-toggle-admin="${esc(p.id)}" aria-pressed="${isCircleAdmin(c, p.id)}" title="${esc(isCircleAdmin(c, p.id) ? t("houses.removeAdmin") : t("houses.makeAdmin"))}" aria-label="${esc(isCircleAdmin(c, p.id) ? t("houses.removeAdmin") : t("houses.makeAdmin"))}: ${esc(p.name)}"><i class="bi ${isCircleAdmin(c, p.id) ? "bi-shield-fill-check" : "bi-shield"}" aria-hidden="true"></i></button>` : ""}
          ${p.id !== c.owner && (owner || p.id === me) ? `<button type="button" class="btn btn-sm btn-link text-danger" data-remove-member="${esc(p.id)}" aria-label="${esc(p.id === me ? t("houses.leave") : t("houses.removeMember", { name: p.name }))}"><i class="bi ${p.id === me ? "bi-box-arrow-right" : "bi-x-lg"}" aria-hidden="true"></i></button>` : ""}
        </li>`).join("")}</ul>
      <div class="mb-1" role="search">
        <input class="form-control form-control-sm" type="search" data-member-search="${esc(c.id)}" maxlength="100" autocomplete="off" placeholder="${esc(t("houses.searchPlaceholder"))}" aria-label="${esc(t("houses.searchPlaceholder"))}">
        <ul class="list-group mt-1" data-member-results="${esc(c.id)}" aria-live="polite" hidden></ul>
      </div>
      <p class="small text-body-secondary">${esc(t("houses.addHelp"))}</p>

      <h3 class="h6 mt-3">${esc(t("houses.balances"))}</h3>
      ${debtRows(debts, circleMeals)}

      <div class="d-flex flex-wrap gap-2 mt-3">
        ${iAmAdmin ? `<a class="btn btn-sm btn-primary" href="analytics.html?circle=${encodeURIComponent(c.id)}"><i class="bi bi-bar-chart" aria-hidden="true"></i> ${esc(t("houses.analytics"))}</a>` : ""}
        <button type="button" class="btn btn-sm btn-outline-secondary" data-rename="${esc(c.id)}">${esc(t("houses.rename"))}</button>
        ${owner ? `<button type="button" class="btn btn-sm btn-outline-danger" data-delete-circle="${esc(c.id)}">${esc(t("houses.delete"))}</button>` : ""}
      </div>
    </div>
  </section>`;
}

function renderSummary() {
  const mine = netDebts(meals).filter((d) => d.to === me || d.from === me);
  const owed = mine.filter((d) => d.to === me).reduce((s, d) => s + d.cents, 0);
  const owe = mine.filter((d) => d.from === me).reduce((s, d) => s + d.cents, 0);
  $("#balance-summary").innerHTML = `<div class="d-flex justify-content-around text-center">
    <div><span class="d-block small text-body-secondary">${esc(t("houses.youAreOwed"))}</span><span class="fs-4 fw-semibold text-success">${esc(formatMoney(owed, lang))}</span></div>
    <div><span class="d-block small text-body-secondary">${esc(t("houses.youOwe"))}</span><span class="fs-4 fw-semibold ${owe ? "text-danger" : ""}">${esc(formatMoney(owe, lang))}</span></div>
  </div>`;
}

function render() {
  if (!circles) return;
  renderSummary();
  // The circle whose search has the focus gets it back after the redraw (read before: removing a focused element blurs it).
  const focused = document.activeElement?.closest?.("[data-member-search]")?.dataset.memberSearch ?? null;
  $("#circles").innerHTML = circles.length ? circles.map(circleCard).join("") : `<div class="text-center text-body-secondary py-4">
    <i class="bi bi-house-heart fs-1 d-block mb-2" aria-hidden="true"></i><p>${esc(t("houses.empty"))}</p></div>`;
  attachMemberSearches(focused);
}

/**
 * "Add someone" in each open house: search by name and add (js/people-picker.js). Someone not on Splitskebab yet cannot be found, so
 * then the app can be shared with them (js/app.js [data-share-app]). What was typed and the focus survive the redraws above.
 */
function attachMemberSearches(focused) {
  for (const input of document.querySelectorAll("[data-member-search]")) {
    const circle = circles.find((c) => c.id === input.dataset.memberSearch);
    if (!circle) continue;
    input.value = searches.get(circle.id) || "";
    input.addEventListener("input", () => searches.set(circle.id, input.value));
    attachPeoplePicker(input, input.parentElement.querySelector("[data-member-results]"), {
      me,
      skip: () => circle.members,
      label: t("common.add"),
      onPick: async (id) => {
        searches.delete(circle.id);
        await attempt(() => addMember(circle.id, id), t("meal.added", { name: person(id).name }));
      },
      empty: () => `<li class="list-group-item small d-flex align-items-center justify-content-between gap-2"><span class="text-body-secondary">${esc(t("houses.notFound"))}</span>
        <button type="button" class="btn btn-sm btn-outline-primary text-nowrap" data-share-app><i class="bi bi-share" aria-hidden="true"></i> ${esc(t("houses.inviteThem"))}</button></li>`,
    });
    if (focused === circle.id) {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    }
  }
}

// ---- Wiring ----
$("#circles").addEventListener("click", async (e) => {
  const toggle = e.target.closest("[data-toggle-circle]");
  if (toggle) {
    const id = toggle.dataset.toggleCircle;
    if (open.has(id)) open.delete(id); else open.add(id);
    render();
    return;
  }
  const card = e.target.closest("[data-circle]");
  const circle = card && circles.find((c) => c.id === card.dataset.circle);
  if (!circle) return;

  const remove = e.target.closest("[data-remove-member]");
  if (remove) {
    const id = remove.dataset.removeMember;
    const question = id === me ? t("houses.confirmLeave", { name: circle.name }) : t("houses.confirmRemove", { name: person(id).name, circle: circle.name });
    if (window.confirm(question)) attempt(() => removeMember(circle.id, id));
    return;
  }
  const adminToggle = e.target.closest("[data-toggle-admin]");
  if (adminToggle) {
    const id = adminToggle.dataset.toggleAdmin;
    const makeAdmin = !isCircleAdmin(circle, id);
    attempt(() => setCircleAdmin(circle.id, id, makeAdmin), makeAdmin ? t("houses.madeAdmin", { name: person(id).name }) : t("houses.unmadeAdmin", { name: person(id).name }));
    return;
  }
  if (e.target.closest("[data-rename]")) {
    const name = window.prompt(t("houses.renamePrompt"), circle.name)?.trim();
    if (name) attempt(() => renameCircle(circle.id, name));
    return;
  }
  if (e.target.closest("[data-delete-circle]")) {
    if (window.confirm(t("houses.confirmDelete", { name: circle.name }))) attempt(() => deleteCircle(circle.id));
    return;
  }
  const request = e.target.closest("[data-request]");
  if (request) {
    const mine = person(me);
    const vars = { name: nameOf(request.dataset.request), amount: formatMoney(Number(request.dataset.cents), lang), circle: circle.name, link: mine.paymentLink };
    shareText(mine.paymentLink ? t("pay.requestCircleText", vars) : t("pay.requestCircleTextNoLink", vars));
    return;
  }
  const settle = e.target.closest("[data-settle-from]");
  if (settle) {
    const a = settle.dataset.settleFrom;
    const b = settle.dataset.settleTo;
    if (!window.confirm(t("houses.confirmSettle", { from: nameOf(a), to: nameOf(b) }))) return;
    // Every open share between the two of them in this house's meals, both ways: the netted line is what was paid.
    const writes = [];
    for (const m of meals.filter((x) => x.circleId === circle.id)) {
      for (const d of mealDebts(m)) if (!d.settled && ((d.from === a && d.to === b) || (d.from === b && d.to === a))) writes.push(() => setSettled(m.id, d.from, d.to, true));
    }
    await attempt(async () => { for (const w of writes) await w(); }, t("houses.settled"));
  }
});

$("#circle-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#circle-name").value.trim();
  $("#circle-name").classList.toggle("is-invalid", !name);
  if (!name) return;
  $("#circle-save").disabled = true;
  const ref = await attempt(() => createCircle(me, { name, type: document.querySelector('input[name="circle-type"]:checked').value }));
  $("#circle-save").disabled = false;
  if (ref) {
    open.add(ref.id);
    $("#circle-name").value = "";
    window.bootstrap.Modal.getOrCreateInstance($("#circle-modal")).hide();
    toast(t("houses.created", { name }));
  }
});

stops.push(myCircles(me).subscribe((list, err) => {
  if (err) { $("#houses-error").textContent = t("error.load"); $("#houses-error").classList.remove("d-none"); return; }
  circles = list;
  if (circles.length === 1) open.add(circles[0].id);
  render();
}));
stops.push(myMeals(me).subscribe((list) => { if (list) { meals = list; render(); } }));
stops.push(people.subscribe(() => render()));

startFriends(me, stops);
if (location.hash === "#friends") window.bootstrap.Tab.getOrCreateInstance($("#friends-tab")).show();
