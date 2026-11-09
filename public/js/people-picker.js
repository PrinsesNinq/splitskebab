// Picking a person by name: a search box with the matches listed under it as you type, each with a button (adding someone to a house,
// a meal or the friends list). Nobody is ever added by email: people are known by their uid, and other people's emails are private
// (firestore.rules). The matching is people-search.js searchPeople; this only draws the list and reports the choice.
import { esc, avatarHtml } from "./ui.js";
import { searchPeople } from "./people-search.js";
import { people } from "./store.js";
import { t } from "./i18n.js";

/**
 * Wires a search input to a results list. options: me (uid), skip() (uids not to offer: already members), label (the button text),
 * onPick(uid) (may return a promise; the input is cleared after it), empty() (HTML for "nobody found", optional). Returns a function
 * that redraws the list (call it when skip() changes). Listeners live on the two elements, so they go when the page is swapped.
 */
export function attachPeoplePicker(input, list, { me, skip = () => [], label, onPick, empty }) {
  const render = () => {
    const query = input.value.trim();
    const found = searchPeople(query, people.value, me, 6, new Set(skip()));
    list.innerHTML = found.map((p) => `<li class="list-group-item d-flex align-items-center gap-2">
        ${avatarHtml(p, "avatar avatar-sm")}
        <span class="flex-grow-1 min-w-0 text-truncate">${esc(p.name)}</span>
        <button type="button" class="btn btn-sm btn-primary text-nowrap" data-pick="${esc(p.id)}">${esc(label)}</button>
      </li>`).join("") || (query.length >= 2 ? (empty ? empty(query) : `<li class="list-group-item small text-body-secondary">${esc(t("friends.noResults"))}</li>`) : "");
    list.hidden = !list.innerHTML;
  };
  input.addEventListener("input", render);
  list.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-pick]");
    if (!button) return;
    button.disabled = true;
    try {
      await onPick(button.dataset.pick);
      input.value = "";
    } finally {
      button.disabled = false;
      render();
    }
  });
  render();
  return render;
}
