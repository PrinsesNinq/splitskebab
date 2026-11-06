// Houses and groups: the ones I am in, their members (with their allergies), adding someone, and what everyone owes everyone for the
// meals of that house or group, netted per pair, with "request" (a message with my payment link) and "mark as paid". The Friends tab is
// js/friends.js.
import "../vendor/sel/elements/tabs-glass-paper.js";
import { startFriends } from "./friends.js";
import { whenUser, esc, onLeave, attempt, avatarHtml, avatarStackHtml, allergenBadges, shareText, toast } from "./ui.js";
import { myCircles, myMeals, people, person, createCircle, renameCircle, addMember, removeMember, deleteCircle, setSettled } from "./store.js";
import { adminStatus } from "./auth.js";
import { netDebts, mealDebts, formatMoney } from "./money.js";
import { getLang, t } from "./i18n.js";

const user = await whenUser();
const me = user.email.toLowerCase();
const lang = getLang();
const $ = (sel) => document.querySelector(sel);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let circles = null;
let meals = [];
const isAdmin = (await adminStatus(me).catch(() => ({ isAdmin: false }))).isAdmin;
const open = new Set(); // circles whose details are unfolded, kept across redraws

/** A name for an eater id: an email, or "guest:<id>" for a guest of some meal. */
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
  const members = c.members.map((email) => person(email));
  const circleMeals = meals.filter((m) => m.circleId === c.id);
  const debts = netDebts(circleMeals);
  const owner = c.owner === me;
  const known = people.value ? [...people.value.values()].filter((p) => !c.members.includes(p.email)) : [];
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
          <span class="flex-grow-1 min-w-0"><span class="d-block text-truncate">${esc(p.name)}${p.email === c.owner ? ` <span class="badge text-bg-light">${esc(t("houses.owner"))}</span>` : ""}${p.email === me ? ` <span class="text-body-secondary small">(${esc(t("common.you"))})</span>` : ""}</span>
          ${p.allergies.length ? `<span class="d-block small">${allergenBadges(p.allergies)}</span>` : ""}</span>
          ${p.email !== c.owner && (owner || p.email === me) ? `<button type="button" class="btn btn-sm btn-link text-danger" data-remove-member="${esc(p.email)}" aria-label="${esc(p.email === me ? t("houses.leave") : t("houses.removeMember", { name: p.name }))}"><i class="bi ${p.email === me ? "bi-box-arrow-right" : "bi-x-lg"}" aria-hidden="true"></i></button>` : ""}
        </li>`).join("")}</ul>
      <form class="input-group input-group-sm mb-1" data-add-member="${esc(c.id)}">
        <input class="form-control" type="email" list="people-${esc(c.id)}" maxlength="100" autocomplete="off" placeholder="${esc(t("houses.addPlaceholder"))}" aria-label="${esc(t("houses.addPlaceholder"))}">
        <button type="submit" class="btn btn-outline-primary">${esc(t("common.add"))}</button>
      </form>
      <datalist id="people-${esc(c.id)}">${known.map((p) => `<option value="${esc(p.email)}">${esc(p.name)}</option>`).join("")}</datalist>
      <p class="small text-body-secondary">${esc(isAdmin ? t("houses.addHelpAdmin") : t("houses.addHelp"))}</p>

      <h3 class="h6 mt-3">${esc(t("houses.balances"))}</h3>
      ${debtRows(debts, circleMeals)}

      <div class="d-flex flex-wrap gap-2 mt-3">
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
  $("#circles").innerHTML = circles.length ? circles.map(circleCard).join("") : `<div class="text-center text-body-secondary py-4">
    <i class="bi bi-house-heart fs-1 d-block mb-2" aria-hidden="true"></i><p>${esc(t("houses.empty"))}</p></div>`;
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
    const email = remove.dataset.removeMember;
    const question = email === me ? t("houses.confirmLeave", { name: circle.name }) : t("houses.confirmRemove", { name: person(email).name, circle: circle.name });
    if (window.confirm(question)) attempt(() => removeMember(circle.id, email));
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

$("#circles").addEventListener("submit", async (e) => {
  const form = e.target.closest("[data-add-member]");
  if (!form) return;
  e.preventDefault();
  const input = form.querySelector("input");
  const email = input.value.trim().toLowerCase();
  if (!EMAIL.test(email)) { input.classList.add("is-invalid"); return; }
  input.classList.remove("is-invalid");
  const done = await attempt(async () => {
    await addMember(form.dataset.addMember, email);
    // An admin adding someone also lets them in (they need a users/ document to sign in, see firestore.rules allowed()).
    if (isAdmin) await (await import("./users.js")).addPerson(email);
    return true;
  }, t("meal.added", { name: person(email).name }));
  if (done) input.value = "";
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
