// The Friends tab of the houses page: adding a friend by email (only someone with access to Splitskebab; firestore.rules checks it),
// accepting or declining requests, cancelling mine, and removing a friend. A friend can be invited to any meal (js/meal.js).
import { esc, attempt, avatarHtml, allergenBadges, toast } from "./ui.js";
import { people, person, myFriendships, requestFriend, acceptFriend, removeFriendship } from "./store.js";
import { t } from "./i18n.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Starts the tab for me; every listener it adds goes into stops (the page calls them when it is left). */
export function startFriends(me, stops) {
  const $ = (sel) => document.querySelector(sel);
  let friendships = [];

  const row = (f, actions) => {
    const p = person(f.other);
    return `<li class="list-group-item d-flex align-items-center gap-2" data-friendship="${esc(f.id)}">
      ${avatarHtml(p, "avatar avatar-sm")}
      <span class="flex-grow-1 min-w-0"><span class="d-block text-truncate">${esc(p.name)}</span>
        <span class="d-block small text-body-secondary text-truncate">${esc(f.other)}</span>
        ${p.allergies.length ? `<span class="d-block small">${allergenBadges(p.allergies)}</span>` : ""}</span>
      ${actions}
    </li>`;
  };

  function render() {
    const incoming = friendships.filter((f) => f.status === "pending" && f.requester !== me);
    const outgoing = friendships.filter((f) => f.status === "pending" && f.requester === me);
    const friends = friendships.filter((f) => f.status === "accepted").sort((a, b) => person(a.other).name.localeCompare(person(b.other).name));

    $("#friend-requests").innerHTML = incoming.length ? `<h2 class="h6">${esc(t("friends.requests"))}</h2><ul class="list-group">${incoming.map((f) => row(f, `
      <button type="button" class="btn btn-sm btn-success" data-accept>${esc(t("friends.accept"))}</button>
      <button type="button" class="btn btn-sm btn-outline-secondary" data-remove aria-label="${esc(t("friends.decline"))}">${esc(t("friends.decline"))}</button>`)).join("")}</ul>` : "";

    $("#friends-list").innerHTML = friends.map((f) => row(f, `
      <button type="button" class="btn btn-sm btn-link text-danger" data-remove data-confirm aria-label="${esc(t("friends.remove", { name: person(f.other).name }))}"><i class="bi bi-person-dash" aria-hidden="true"></i></button>`)).join("")
      || `<li class="list-group-item text-body-secondary small">${esc(t("friends.none"))}</li>`;

    $("#friend-outgoing").innerHTML = outgoing.length ? `<h2 class="h6">${esc(t("friends.waiting"))}</h2><ul class="list-group">${outgoing.map((f) => row(f, `
      <button type="button" class="btn btn-sm btn-outline-secondary" data-remove>${esc(t("friends.cancel"))}</button>`)).join("")}</ul>` : "";

    const badge = $("#friend-request-count");
    badge.textContent = String(incoming.length);
    badge.classList.toggle("d-none", !incoming.length);

    // Suggestions: everyone with a profile who is not me and not already a friend or asked.
    const taken = new Set([me, ...friendships.map((f) => f.other)]);
    const known = people.value ? [...people.value.values()].filter((p) => !taken.has(p.email)) : [];
    $("#friend-suggestions").innerHTML = known.map((p) => `<option value="${esc(p.email)}">${esc(p.name)}</option>`).join("");
  }

  $("#friend-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const input = $("#friend-email");
    const email = input.value.trim().toLowerCase();
    const valid = EMAIL.test(email) && email !== me;
    input.classList.toggle("is-invalid", !valid);
    if (!valid) return;
    const existing = friendships.find((f) => f.other === email);
    if (existing?.status === "accepted") { toast(t("friends.already", { name: person(email).name }), "info"); return; }
    // They already asked me: adding them is saying yes.
    if (existing && existing.requester !== me) {
      if (await attempt(async () => { await acceptFriend(existing.id); return true; }, t("friends.nowFriends", { name: person(email).name }))) input.value = "";
      return;
    }
    if (existing) { toast(t("friends.stillWaiting", { name: person(email).name }), "info"); return; }
    try {
      await requestFriend(me, email);
      toast(t("friends.requested", { name: person(email).name }));
      input.value = "";
    } catch (err) {
      console.error(err);
      // The rules refuse a request to someone without access (or a document that already exists).
      toast(err?.code === "permission-denied" ? t("friends.notOnApp", { email }) : t("error.generic"), "danger");
    }
  });

  $("#friends-pane").addEventListener("click", (e) => {
    const item = e.target.closest("[data-friendship]");
    if (!item) return;
    const f = friendships.find((x) => x.id === item.dataset.friendship);
    if (!f) return;
    if (e.target.closest("[data-accept]")) {
      attempt(() => acceptFriend(f.id), t("friends.nowFriends", { name: person(f.other).name }));
    } else if (e.target.closest("[data-remove]")) {
      if (e.target.closest("[data-confirm]") && !window.confirm(t("friends.confirmRemove", { name: person(f.other).name }))) return;
      attempt(() => removeFriendship(f.id));
    }
  });

  stops.push(myFriendships(me).subscribe((list, err) => {
    if (err) { $("#houses-error").textContent = t("error.load"); $("#houses-error").classList.remove("d-none"); return; }
    friendships = list;
    render();
  }));
  stops.push(people.subscribe(() => render()));
}
