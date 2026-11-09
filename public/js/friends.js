// The Friends tab of the houses page: finding people by name and the friends of my friends, asking them to be friends (only someone with
// an account; firestore.rules checks it), accepting or declining requests, cancelling mine, and removing a friend. A friend can be invited
// to any meal (js/meal.js). People are their uid; an email shows only for someone who chose to show it to me.
import { esc, attempt, avatarHtml, allergenBadges, toast } from "./ui.js";
import { people, person, myFriendships, friendIds, requestFriend, acceptFriend, removeFriendship } from "./store.js";
import { searchPeople, friendsOfFriends } from "./people-search.js";
import { t } from "./i18n.js";

/** Starts the tab for me; every listener it adds goes into stops (the page calls them when it is left). */
export function startFriends(me, stops) {
  const $ = (sel) => document.querySelector(sel);
  let friendships = [];

  const row = (f, actions) => {
    const p = person(f.other);
    return `<li class="list-group-item d-flex align-items-center gap-2" data-friendship="${esc(f.id)}">
      ${avatarHtml(p, "avatar avatar-sm")}
      <span class="flex-grow-1 min-w-0"><a class="d-block text-truncate person-link" href="person.html?id=${encodeURIComponent(f.other)}">${esc(p.name)}</a>
        ${p.email ? `<span class="d-block small text-body-secondary text-truncate">${esc(p.email)}</span>` : ""}
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

    renderSearch();
    renderSuggestions();
  }

  /** Asks someone to be my friend (or says yes, when they already asked me). Returns true when something changed. */
  async function addFriend(id) {
    const name = person(id).name;
    const existing = friendships.find((f) => f.other === id);
    if (existing?.status === "accepted") { toast(t("friends.already", { name }), "info"); return false; }
    if (existing && existing.requester !== me) {
      return Boolean(await attempt(async () => { await acceptFriend(existing.id); return true; }, t("friends.nowFriends", { name })));
    }
    if (existing) { toast(t("friends.stillWaiting", { name }), "info"); return false; }
    try {
      await requestFriend(me, id);
      toast(t("friends.requested", { name }));
      return true;
    } catch (err) {
      console.error(err?.code || err);
      // The rules refuse a request to someone without an account (or a document that already exists).
      toast(err?.code === "permission-denied" ? t("friends.notOnApp", { name }) : t("error.generic"), "danger");
      return false;
    }
  }

  /** What I can do with someone in a search result or suggestion: add, accept, wait, or nothing (already friends). */
  function personAction(id) {
    const f = friendships.find((x) => x.other === id);
    if (f?.status === "accepted") return `<span class="badge text-bg-success">${esc(t("friends.isFriend"))}</span>`;
    if (f && f.requester === me) return `<span class="badge text-bg-light border">${esc(t("friends.asked"))}</span>`;
    const label = f ? t("friends.accept") : t("friends.add");
    return `<button type="button" class="btn btn-sm btn-primary text-nowrap" data-add-friend="${esc(id)}"><i class="bi bi-person-plus" aria-hidden="true"></i> ${esc(label)}</button>`;
  }

  const personRow = (p, detail) => `<li class="list-group-item d-flex align-items-center gap-2">
      ${avatarHtml(p, "avatar avatar-sm")}
      <span class="flex-grow-1 min-w-0"><a class="d-block text-truncate person-link" href="person.html?id=${encodeURIComponent(p.id)}">${esc(p.name)}</a>
        ${detail ? `<span class="d-block small text-body-secondary text-truncate">${detail}</span>` : ""}</span>
      ${personAction(p.id)}
    </li>`;

  /** "Friend of Elise and Sam" / "Friend of Elise, Sam and 2 others": escaped HTML. */
  function viaText(via) {
    const names = via.map((id) => person(id).name);
    const shown = names.length > 2 ? `${names.slice(0, 2).join(", ")} +${names.length - 2}` : names.join(t("friends.and"));
    return esc(t("friends.friendOf", { names: shown }));
  }

  function renderSearch() {
    const query = $("#friend-search").value.trim();
    const results = searchPeople(query, people.value, me);
    const mine = friendIds(friendships);
    const rows = results.map((p) => {
      // Friends in common, from my friends' lists (which I may read): a stranger's own list is private.
      const common = mine.filter((f) => person(f).friends.includes(p.id));
      return personRow(p, common.length ? viaText(common) : esc(p.email));
    });
    $("#friend-results").innerHTML = rows.join("") || (query.length >= 2 ? `<li class="list-group-item small text-body-secondary">${esc(t("friends.noResults"))}</li>` : "");
  }

  function renderSuggestions() {
    const mine = friendIds(friendships);
    const pending = friendships.filter((f) => f.status === "pending").map((f) => f.other);
    const list = friendsOfFriends(me, mine, pending, people.value);
    $("#friend-suggest").innerHTML = list.length
      ? `<h2 class="h6">${esc(t("friends.mayKnow"))}</h2><ul class="list-group">${list.map(({ person: p, via }) => personRow(p, viaText(via))).join("")}</ul>`
      : "";
  }

  $("#friend-form").addEventListener("submit", (e) => e.preventDefault());
  $("#friend-search").addEventListener("input", renderSearch);
  $("#friends-pane").addEventListener("click", async (e) => {
    const add = e.target.closest("[data-add-friend]");
    if (!add) return;
    add.disabled = true;
    if (!(await addFriend(add.dataset.addFriend))) add.disabled = false;
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
