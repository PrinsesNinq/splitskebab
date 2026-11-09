// One conversation (chat.html?c=id): the messages as chat bubbles (component "Chat bubbles & reactions": react, and edit or delete your
// own), a composer to write (component "Chat composer"), and the conversation marked as read while it is open. A direct conversation
// is between two people; a feedback conversation is between one person and the app's admins.
import { attachComposer, attachEmojiInsertButton } from "../vendor/sel/elements/chat-composer.js";
import "../vendor/sel/elements/chat-bubbles.js";
import { whenUser, esc, onLeave, param, avatarHtml, colour, toast } from "./ui.js";
import { people, person, watchConversation, watchMessages, sendMessage, markRead, editMessage, deleteMessage, setReactions } from "./store.js";
import { otherMember, isUnread, react } from "./messaging.js";
import { t, formatDay } from "./i18n.js";

const user = await whenUser();
const me = user.uid;
const id = String(param("c") || "");
const $ = (sel) => document.querySelector(sel);
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

let conversation = null;
let messages = [];

function fail(message) {
  $("#chat-error").textContent = message;
  $("#chat-error").classList.remove("d-none");
  $("#composer").hidden = true;
}

function renderHeader() {
  if (!conversation) return;
  if (conversation.type === "feedback") {
    const giver = person(conversation.members[0]);
    const mine = conversation.members[0] === me;
    $("#chat-header").innerHTML = `<i class="bi bi-megaphone fs-3 text-primary" aria-hidden="true"></i>
      <div class="min-w-0"><h1 class="h5 mb-0 text-truncate">${esc(mine ? t("messages.feedbackTitle") : t("messages.feedbackFrom", { name: giver.name }))}</h1>
      <span class="small text-body-secondary">${esc(mine ? t("chat.feedbackHelp") : giver.email)}</span></div>`; // giver.email: only when they show it
  } else {
    const other = person(otherMember(conversation, me));
    $("#chat-header").innerHTML = `${avatarHtml(other, "avatar")}
      <div class="min-w-0"><h1 class="h5 mb-0 text-truncate"><a class="person-link" href="person.html?id=${encodeURIComponent(other.id)}">${esc(other.name)}</a></h1></div>`;
  }
}

const time = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
const dayOf = (ms) => { const d = new Date(ms); const p = (n) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`; };

function renderMessages() {
  const chat = $("#chat");
  chat.setAttribute("user", me);
  let lastDay = "";
  const html = [];
  for (const m of messages) {
    const day = dayOf(m.at);
    if (day !== lastDay) { html.push(`<div class="chat-day small text-body-secondary text-center my-2">${esc(formatDay(day, { weekday: "long" }))}</div>`); lastDay = day; }
    const own = m.from === me;
    const who = person(m.from);
    // Avatar: the photo, or the initial on the person's colour (--chip-color, per person at run time).
    const avatar = who.photoUrl
      ? `<img class="chat-avatar" src="${esc(who.photoUrl)}" alt="" referrerpolicy="no-referrer">`
      : `<span class="chat-avatar" style="--chip-color: ${colour(m.from)}" aria-hidden="true">${esc(who.name.charAt(0).toUpperCase())}</span>`;
    html.push(`<div class="chat-message ${own ? "chat-message--own" : ""}">
      ${avatar}
      <div class="msg-wrap" data-msg-id="${esc(m.id)}" data-owner="${esc(m.from)}" data-text="${esc(m.text)}" data-reactions="${esc(JSON.stringify(m.reactions))}" data-delete-confirm="${esc(t("chat.confirmDelete"))}">
        <div class="bubble ${own ? "bubble--own" : ""}"><span class="msg-text">${esc(m.text)}</span></div>
        <div class="chat-meta">${own ? "" : `${esc(who.name)} · `}${esc(time(m.at))}${m.edited ? ` · ${esc(t("chat.edited"))}` : ""}</div>
      </div>
    </div>`);
  }
  chat.innerHTML = html.join("");
  $("#chat-empty").hidden = messages.length > 0;
  $("#chat-empty").textContent = conversation?.type === "feedback" && conversation.members[0] === me ? t("chat.feedbackEmpty") : t("chat.empty");
}

/** Marks the conversation read while it is open and on screen (an app in the background has not "read" anything). */
function readIfSeen() {
  if (conversation && document.visibilityState === "visible" && isUnread(conversation, me)) markRead(id, me).catch(() => {});
}

// ---- Writing ----
// The composer locks itself while a message is being sent (no double sends) and keeps the text when sending fails, but it never empties
// the box: that is ours to do once the message is saved, or the same text could be sent again and again.
const input = $("#composer .chat-composer__input");
const composer = attachComposer($("#composer"), {
  onSubmit: async (body) => {
    try {
      await sendMessage(id, me, body);
      input.value = "";
      input.dispatchEvent(new Event("input", { bubbles: true })); // shrinks the box back and disables Send while it is empty
      setTimeout(() => input.focus(), 0); // after the composer unlocks itself, so the next message can be typed straight away
    } catch (err) {
      console.error(err);
      toast(err?.code === "permission-denied" ? t("error.permission") : t("error.generic"), "danger");
      throw err; // the composer keeps the text
    }
  },
});
attachEmojiInsertButton($("#emoji-btn"), input);
stops.push(() => composer.dispose?.());

// ---- Keeping the newest message in view above the docked composer (css/app.css .chat-dock) ----
// The page keeps room for the composer's real height (it grows with the text), and when I was reading the newest message it stays in
// view as the composer grows or the keyboard opens.
const page = $(".chat-page");
const nearBottom = () => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 80;
const toBottom = () => window.scrollTo(0, document.documentElement.scrollHeight);
const sizer = new ResizeObserver(() => {
  const keep = nearBottom();
  page.style.setProperty("--composer-height", `${$("#composer").offsetHeight}px`); // measured per instance
  if (keep) toBottom();
});
sizer.observe($("#composer"));
stops.push(() => sizer.disconnect());
input.addEventListener("focus", () => { if (nearBottom()) setTimeout(toBottom, 300); }); // after the keyboard has come up

// ---- Reactions, editing, deleting (events from the chat component) ----
const chatEl = $("#chat");
chatEl.addEventListener("chat:react", (e) => {
  const m = messages.find((x) => x.id === e.detail.id);
  if (!m) return;
  const saving = setReactions(id, m.id, react(m.reactions, me, e.detail.emoji || null));
  e.detail.waitUntil?.(saving);
  saving.catch((err) => { console.error(err); toast(t("error.generic"), "danger"); });
});
// The real result goes to waitUntil (not attempt(), which swallows a failure): the component keeps the editor open when saving fails,
// and only removes a message once deleting it worked.
const report = (promise) => { promise.catch((err) => { console.error(err); toast(err?.code === "permission-denied" ? t("error.permission") : t("error.generic"), "danger"); }); return promise; };
chatEl.addEventListener("chat:edit", (e) => {
  const body = String(e.detail.text || "").trim();
  if (!body) { e.preventDefault?.(); return; }
  e.detail.waitUntil?.(report(editMessage(id, e.detail.id, body)));
});
chatEl.addEventListener("chat:delete", (e) => {
  e.detail.waitUntil?.(report(deleteMessage(id, e.detail.id)));
});
const onVisible = () => readIfSeen();
document.addEventListener("visibilitychange", onVisible);
stops.push(() => document.removeEventListener("visibilitychange", onVisible));

// ---- Live data ----
if (!/^[\w.@+|-]{3,300}$/.test(id)) {
  fail(t("chat.notFound"));
} else {
  stops.push(watchConversation(id, (c, err) => {
    if (err || !c) { fail(t("chat.notFound")); return; }
    conversation = c;
    $("#composer").hidden = false;
    renderHeader();
    readIfSeen();
  }));
  stops.push(watchMessages(id, (list, err) => {
    if (err) { fail(t("chat.notFound")); return; }
    const atBottom = nearBottom();
    messages = list;
    renderMessages();
    if (atBottom || messages.at(-1)?.from === me) requestAnimationFrame(toBottom); // after the bubbles are drawn
    readIfSeen();
  }));
  stops.push(people.subscribe(() => { renderHeader(); renderMessages(); }));
}
