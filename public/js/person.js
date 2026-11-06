// Someone else's profile (person.html?email=...): their photo and name, the friendship with an action (add, accept, cancel, remove),
// their allergies and payment link when they share them with me (privateProfiles readers: housemates, meal guests, friends), the houses
// and groups we share, friends in common, and the meals coming up that we are both at. My own profile is profile.html.
import { whenUser, esc, onLeave, param, attempt, avatarHtml, allergenBadges, todayIso, go } from "./ui.js";
import {
  people, person, myCircles, myMeals, myFriendships, friendEmails, requestFriend, acceptFriend, removeFriendship, friendshipId,
} from "./store.js";
import { t, formatDay } from "./i18n.js";

const user = await whenUser();
const me = user.email.toLowerCase();
const email = String(param("email") || "").trim().toLowerCase();
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let circles = [];
let meals = [];
let friendships = [];

function renderFriendAction() {
  const f = friendships.find((x) => x.other === email);
  let html;
  if (f?.status === "accepted") {
    html = `<span class="badge text-bg-success align-self-center">${esc(t("friends.isFriend"))}</span>
      <button type="button" class="btn btn-sm btn-outline-danger" data-friend-act="remove"><i class="bi bi-person-dash" aria-hidden="true"></i> ${esc(t("person.unfriend"))}</button>`;
  } else if (f && f.requester === me) {
    html = `<span class="badge text-bg-light border align-self-center">${esc(t("friends.asked"))}</span>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-friend-act="remove">${esc(t("friends.cancel"))}</button>`;
  } else if (f) {
    html = `<button type="button" class="btn btn-sm btn-success" data-friend-act="accept">${esc(t("friends.accept"))}</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-friend-act="remove">${esc(t("friends.decline"))}</button>`;
  } else {
    html = `<button type="button" class="btn btn-sm btn-primary" data-friend-act="add"><i class="bi bi-person-plus" aria-hidden="true"></i> ${esc(t("friends.add"))}</button>`;
  }
  $("#person-friend-action").innerHTML = html;
}

function render() {
  const p = person(email);
  document.title = `${p.name} · Splitskebab`;
  $("#person-avatar").innerHTML = avatarHtml(p, "avatar avatar-lg person-avatar");
  $("#person-name").textContent = p.name;
  $("#person-email").textContent = email;
  renderFriendAction();

  // Allergies: only when shared with me; "not visible" is never shown as "none".
  $("#person-allergies").innerHTML = !p.detailsVisible
    ? `<p class="small text-warning-emphasis mb-0"><i class="bi bi-eye-slash" aria-hidden="true"></i> ${esc(t("person.hidden"))}</p>`
    : p.allergies.length ? allergenBadges(p.allergies) : `<p class="small text-body-secondary mb-0">${esc(t("person.noAllergies"))}</p>`;

  $("#person-pay-box").classList.toggle("d-none", !p.paymentLink);
  if (p.paymentLink) {
    $("#person-pay").href = p.paymentLink;
    $("#person-pay-label").textContent = t("person.pay", { name: p.name });
  }

  const shared = circles.filter((c) => c.members.includes(email));
  $("#person-circles").innerHTML = shared.length
    ? shared.map((c) => `<li><i class="bi ${c.type === "house" ? "bi-house-door" : "bi-people"}" aria-hidden="true"></i> ${esc(c.name)}</li>`).join("")
    : `<li class="small text-body-secondary">${esc(t("person.noSharedCircles"))}</li>`;

  const mutual = friendEmails(friendships).filter((f) => f !== email && person(f).friends.includes(email));
  $("#person-mutual").innerHTML = mutual.length
    ? `<div class="d-flex flex-wrap gap-2">${mutual.map((f) => `<a class="d-inline-flex align-items-center gap-1 text-decoration-none person-chip" href="person.html?email=${encodeURIComponent(f)}">${avatarHtml(person(f), "avatar avatar-sm")}<span>${esc(person(f).name)}</span></a>`).join("")}</div>`
    : `<p class="small text-body-secondary mb-0">${esc(t("person.noMutual"))}</p>`;

  const today = todayIso();
  const together = meals.filter((m) => m.date >= today && m.viewers.includes(email)).slice(0, 6);
  $("#person-meals").innerHTML = together.length
    ? together.map((m) => `<a class="list-group-item list-group-item-action px-0" href="meal.html?id=${encodeURIComponent(m.id)}">
        <span class="d-block fw-semibold">${esc(m.title || t("meal.untitled"))}</span>
        <span class="d-block small text-body-secondary">${esc(formatDay(m.date))}${m.time ? ` · ${esc(m.time)}` : ""} · ${esc(m.participants.includes(email) ? t("status.joining") : m.declined.includes(email) ? t("status.declined") : t("status.invited"))}</span>
      </a>`).join("")
    : `<p class="small text-body-secondary mb-0">${esc(t("person.noMeals"))}</p>`;
}

$("#person-friend-action").addEventListener("click", async (e) => {
  const button = e.target.closest("[data-friend-act]");
  if (!button) return;
  const act = button.dataset.friendAct;
  const name = person(email).name;
  if (act === "remove" && friendships.find((x) => x.other === email)?.status === "accepted" && !window.confirm(t("friends.confirmRemove", { name }))) return;
  button.disabled = true;
  if (act === "add") {
    const ok = await attempt(async () => { await requestFriend(me, email); return true; }, t("friends.requested", { name }));
    if (!ok) button.disabled = false;
  } else if (act === "accept") {
    await attempt(() => acceptFriend(friendshipId(me, email)), t("friends.nowFriends", { name }));
  } else {
    await attempt(() => removeFriendship(friendshipId(me, email)));
  }
});

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  $("#person-error").textContent = t("person.notFound");
  $("#person-error").classList.remove("d-none");
} else if (email === me) {
  go("profile.html"); // my own profile is the one I can edit
} else {
  stops.push(people.subscribe(() => render()));
  stops.push(myCircles(me).subscribe((list) => { if (list) { circles = list; render(); } }));
  stops.push(myMeals(me).subscribe((list) => { if (list) { meals = list; render(); } }));
  stops.push(myFriendships(me).subscribe((list) => { if (list) { friendships = list; render(); } }));
  render();
}
