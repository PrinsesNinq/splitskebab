// The messages page: my conversations (newest first, unread ones bold), starting a new one with someone I am connected to (housemates,
// meal guests, friends: the readers list my app keeps, js/sharing.js), my feedback to the team, and for admins the feedback inbox.
import { whenUser, esc, onLeave, attempt, avatarHtml, go, toast, todayIso } from "./ui.js";
import { people, person, myConversations, feedbackInbox, openDirect, openFeedback } from "./store.js";
import { adminStatus } from "./auth.js";
import { otherMember, isUnread } from "./messaging.js";
import { normalise } from "./recipe-logic.js";
import { t, formatDay } from "./i18n.js";

const user = await whenUser();
const me = user.uid;
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let conversations = null;
let inbox = null;

/** "18:30" today, otherwise the day ("Thu 12 Nov"). */
function when(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const p = (n) => String(n).padStart(2, "0");
  const iso = `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  return iso === todayIso() ? `${p(d.getHours())}:${p(d.getMinutes())}` : formatDay(iso);
}

function row(c, title) {
  const other = person(otherMember(c, me));
  const unread = isUnread(c, me);
  const last = c.lastText ? `${c.lastFrom === me ? `${t("messages.you")}: ` : ""}${c.lastText}` : t("messages.noMessagesYet");
  return `<a class="list-group-item list-group-item-action d-flex align-items-center gap-2 conversation-row ${unread ? "is-unread" : ""}" href="chat.html?c=${encodeURIComponent(c.id)}">
    ${avatarHtml(other, "avatar")}
    <span class="flex-grow-1 min-w-0">
      <span class="d-flex justify-content-between gap-2"><span class="text-truncate conversation-row__name">${esc(title || other.name)}</span><span class="small text-body-secondary text-nowrap">${esc(when(c.lastAt))}</span></span>
      <span class="d-block small text-truncate ${unread ? "" : "text-body-secondary"}">${esc(last)}</span>
    </span>
    ${unread ? `<span class="unread-dot" aria-label="${esc(t("messages.unread"))}"></span>` : ""}
  </a>`;
}

function renderConversations() {
  if (!conversations) return;
  const direct = conversations.filter((c) => c.type === "direct");
  $("#conversation-list").innerHTML = direct.map((c) => row(c)).join("")
    || `<p class="small text-body-secondary mb-0">${esc(t("messages.none"))}</p>`;
  const mine = conversations.find((c) => c.type === "feedback");
  $("#feedback-unread").hidden = !(mine && isUnread(mine, me));
  $("#feedback-unread").textContent = t("messages.newReply");
}

function renderInbox() {
  if (!inbox) return;
  $("#feedback-list").innerHTML = inbox.filter((c) => c.lastAt).map((c) => row(c, t("messages.feedbackFrom", { name: person(c.members[0]).name }))).join("")
    || `<p class="small text-body-secondary mb-0">${esc(t("messages.noFeedback"))}</p>`;
}

/** The people I can start a conversation with: my connections (my private profile's readers), filtered by what was typed. */
function renderNewPeople() {
  const q = normalise($("#new-message-search").value);
  const list = person(me).readers.map((id) => person(id))
    .filter((p) => !q || normalise(p.name).includes(q) || (p.email && p.email.includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name))
    .slice(0, 12);
  $("#new-message-people").innerHTML = list.map((p) => `<li class="list-group-item p-0">
      <button type="button" class="btn w-100 text-start d-flex align-items-center gap-2 py-2" data-message="${esc(p.id)}">
        ${avatarHtml(p, "avatar avatar-sm")}<span class="text-truncate">${esc(p.name)}</span></button></li>`).join("")
    || `<li class="list-group-item small text-body-secondary">${esc(t("messages.nobodyToMessage"))}</li>`;
}

$("#new-message-search").addEventListener("input", renderNewPeople);
$("#new-message").addEventListener("show.bs.collapse", renderNewPeople);
$("#new-message-people").addEventListener("click", async (e) => {
  const b = e.target.closest("[data-message]");
  if (!b) return;
  b.disabled = true;
  try {
    go(`chat.html?c=${encodeURIComponent(await openDirect(me, b.dataset.message))}`);
  } catch (err) {
    console.error(err);
    toast(err?.code === "permission-denied" ? t("messages.notConnected") : t("error.generic"), "danger");
    b.disabled = false;
  }
});
$("#open-feedback").addEventListener("click", async () => {
  const id = await attempt(() => openFeedback(me));
  if (id) go(`chat.html?c=${encodeURIComponent(id)}`);
});

stops.push(myConversations(me).subscribe((list, err) => {
  if (err) { $("#messages-error").textContent = t("error.load"); $("#messages-error").classList.remove("d-none"); return; }
  conversations = list;
  renderConversations();
}));
stops.push(people.subscribe(() => { renderConversations(); renderInbox(); }));

// Admins: everyone's feedback. Only subscribed for admins (anyone else may not read it: firestore.rules).
if ((await adminStatus(me).catch(() => ({ isAdmin: false }))).isAdmin) {
  $("#admin-inbox").classList.remove("d-none");
  stops.push(feedbackInbox.subscribe((list) => { if (list) { inbox = list; renderInbox(); } }));
}
