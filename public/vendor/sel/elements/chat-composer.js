/* Chat composer - Aperam Theme v0.5.2 */
/* Chat composer: a text box shaped and tinted like a chat bubble, so writing a message looks like the message it becomes (see the HTML tab).
 * attachComposer(el, { onSubmit, onCancel, canSubmit }) wires a .chat-composer: the text box grows with the text, Enter sends, Shift+Enter is
 * a new line, Esc cancels, and the send button is only enabled while there is something to send. onSubmit may return a promise: the
 * composer waits for it and keeps the text when it fails. setComposerOpen(box, open) slides a reply box (.chat-composer-enter) in and out.
 * openEmojiPicker(anchor, onPick) is the searchable emoji picker, and attachEmojiInsertButton(button, textarea) puts it on a button.
 * Chat bubbles & reactions builds on this: its reaction picker and its edit-in-place box are these. */
import { html, render, nothing } from "../theme-lit.js";

/** The picker's emojis: groups of [emoji, search words]. Set element.emojis (or pass { emojis }) in the same shape for your own set. */
export const DEFAULT_EMOJIS = [
	{ name: "Smileys", emojis: [["😀", "grin smile happy"], ["😂", "joy laugh tears"], ["🙂", "smile slight"], ["😍", "love heart eyes"], ["😎", "cool sunglasses"], ["🤔", "thinking hmm"], ["😢", "sad cry tear"], ["😡", "angry mad"], ["😮", "wow surprised open mouth"], ["🥳", "party celebrate"], ["😴", "sleep tired"], ["🤯", "mind blown shocked"]] },
	{ name: "Gestures", emojis: [["👍", "thumbs up yes like ok"], ["👎", "thumbs down no dislike"], ["👏", "clap applause"], ["🙏", "pray thanks please"], ["💪", "strong muscle"], ["👌", "ok perfect"], ["✌️", "peace victory"], ["🤝", "handshake deal"], ["👀", "eyes look see"], ["🙌", "hooray raise hands"], ["🤞", "fingers crossed luck"], ["👋", "wave hello bye"]] },
	{ name: "Symbols", emojis: [["❤️", "heart love red"], ["🔥", "fire hot lit"], ["✨", "sparkles shiny new"], ["🎉", "tada party celebrate"], ["✅", "check done yes"], ["❌", "cross no wrong"], ["💡", "idea bulb"], ["⭐", "star"], ["💯", "hundred perfect"], ["⚡", "lightning fast zap"], ["🚀", "rocket launch ship"], ["🎯", "target goal bullseye"]] },
];

// ---- popovers (the emoji picker and the message menu): one at a time on the page. Appended inside an open .modal when the anchor is in
// one (Bootstrap's focus trap would otherwise block typing in the picker's search box), else to <body>, so they are never clipped.

let layer = null; // { el, wrap, owner, cleanup }

export function closeChatPopover() {
	if (!layer) return;
	layer.cleanup();
	layer.wrap?.classList.remove("has-popover");
	layer.el.remove();
	layer = null;
}

/** The popover that is open now ({ el, wrap, owner }), or null. */
export function currentChatPopover() {
	return layer;
}

/** Opens a popover (one at a time) at anchor with a Lit template; className styles it (the picker uses "emoji-picker"). Returns its element. */
export function openChatPopover(anchor, wrap, className, template, owner = null) {
	closeChatPopover();
	const el = document.createElement("div");
	el.className = "msg-popover " + className;
	render(template, el);
	(anchor.closest(".modal") || document.body).append(el);
	wrap?.classList.add("has-popover");
	// Right-aligned under the button when there is room, otherwise above it; always on screen.
	const r = anchor.getBoundingClientRect();
	const margin = 8;
	el.style.left = Math.min(Math.max(margin, r.right - el.offsetWidth), window.innerWidth - el.offsetWidth - margin) + "px";
	const below = r.bottom + 4 + el.offsetHeight <= window.innerHeight - margin;
	el.style.top = (below ? r.bottom + 4 : Math.max(margin, r.top - el.offsetHeight - 4)) + "px";

	const onPointerDown = (e) => { if (!el.contains(e.target) && !anchor.contains(e.target)) closeChatPopover(); };
	const onKeyDown = (e) => { if (e.key === "Escape") { e.stopPropagation(); closeChatPopover(); anchor.focus(); } };
	const onScroll = (e) => { if (!el.contains(e.target)) closeChatPopover(); };
	document.addEventListener("pointerdown", onPointerDown, true);
	document.addEventListener("keydown", onKeyDown, true);
	window.addEventListener("scroll", onScroll, true);
	layer = {
		el, wrap, owner,
		cleanup: () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("scroll", onScroll, true);
		},
	};
	return el;
}

function pickerGrid(groups, query, pick) {
	const q = query.trim().toLowerCase();
	const shown = groups
		.map((g) => ({ name: g.name, emojis: q ? g.emojis.filter(([e, words]) => (words || "").includes(q) || e === q) : g.emojis }))
		.filter((g) => g.emojis.length);
	if (!shown.length) return html`<p class="text-body-secondary small text-center my-3">No emoji found.</p>`;
	return html`${shown.map((g) => html`
		${q ? nothing : html`<div class="emoji-picker-group">${g.name}</div>`}
		<div class="emoji-picker-grid">${g.emojis.map(([e, words]) => html`<button type="button" class="emoji-picker-btn" data-emoji=${e} title=${(words || "").split(" ")[0]} @click=${() => pick(e)}>${e}</button>`)}</div>`)}`;
}

/** Opens the searchable emoji picker at `anchor`; onPick(emoji) runs with the choice. Options: { emojis, wrap }. */
export function openEmojiPicker(anchor, onPick, { emojis = DEFAULT_EMOJIS, wrap = null, owner = null } = {}) {
	const el = openChatPopover(anchor, wrap, "emoji-picker", html`<input type="search" class="form-control form-control-sm mb-2 emoji-picker-search" placeholder="Search emoji…" aria-label="Search emoji"><div class="emoji-picker-body"></div>`, owner);
	const search = el.querySelector(".emoji-picker-search");
	const body = el.querySelector(".emoji-picker-body");
	const pick = (e) => { closeChatPopover(); onPick(e); };
	const draw = () => render(pickerGrid(emojis, search.value, pick), body);
	draw();
	search.addEventListener("input", draw);
	search.addEventListener("keydown", (e) => {
		if (e.key !== "Enter") return;
		e.preventDefault();
		const first = body.querySelector("[data-emoji]");
		if (first) pick(first.dataset.emoji);
	});
	// Touch: don't pop the on-screen keyboard over the grid straight away.
	if (window.matchMedia("(hover: hover)").matches) search.focus();
	return el;
}

/** A button that opens the picker and inserts the chosen emoji at the textarea's caret. Returns a dispose function. */
export function attachEmojiInsertButton(button, textarea, options = {}) {
	const onClick = () => openEmojiPicker(button, (emoji) => {
		const { selectionStart: start, selectionEnd: end } = textarea;
		textarea.setRangeText(emoji, start ?? textarea.value.length, end ?? textarea.value.length, "end");
		textarea.focus();
		textarea.dispatchEvent(new Event("input", { bubbles: true }));
	}, options);
	button.addEventListener("click", onClick);
	return () => button.removeEventListener("click", onClick);
}

const composerLeaving = new WeakMap();

/**
 * Shows or hides a box with .chat-composer-enter (a reply box under a message): it slides in when shown and slides out before it is
 * hidden (straight away when motion is reduced). Opening it again while it is still sliding out keeps it open. open toggles when left
 * out. Returns whether the box is now open.
 */
export function setComposerOpen(box, open) {
	const isOpen = !box.hidden && !box.classList.contains("chat-composer-leave");
	if (open === undefined) open = !isOpen;
	if (open) {
		composerLeaving.delete(box);
		box.classList.remove("chat-composer-leave");
		box.hidden = false;
		return true;
	}
	if (!isOpen) return false;
	const token = {};
	composerLeaving.set(box, token);
	const done = () => {
		if (composerLeaving.get(box) !== token) return; // reopened (or closed again) meanwhile
		composerLeaving.delete(box);
		clearTimeout(timer);
		box.removeEventListener("animationend", onEnd);
		box.classList.remove("chat-composer-leave");
		box.hidden = true;
	};
	const onEnd = (e) => { if (e.target === box) done(); };
	box.classList.add("chat-composer-leave");
	box.addEventListener("animationend", onEnd);
	const timer = setTimeout(done, 600); // in case no animationend comes (an ancestor hidden, the animation removed by the page)
	if (getComputedStyle(box).animationName === "none") done();
	return false;
}

/**
 * Wires a .chat-composer: its .chat-composer__input grows with the text, Enter sends (so does Ctrl+Enter), Shift+Enter is a new line,
 * Escape cancels without closing a surrounding modal, and .chat-composer__send is only enabled while there is text. A
 * .chat-composer__cancel button cancels too. onSubmit(text) may return a promise: the composer is disabled until it settles and keeps
 * the text when it fails. canSubmit(text) decides when sending is allowed (default: there is text; a form whose text is optional
 * passes its own check and calls sync() when something else it depends on changes). Returns { focus, sync, dispose }.
 */
export function attachComposer(composer, { onSubmit = null, onCancel = null, canSubmit = (text) => text.length > 0 } = {}) {
	const input = composer.querySelector(".chat-composer__input");
	const send = composer.querySelector(".chat-composer__send");
	if (!input) throw new Error("attachComposer: no .chat-composer__input inside");
	let busy = false;
	const sync = () => {
		input.style.height = "auto";
		input.style.height = input.scrollHeight + "px";
		if (send) send.disabled = busy || !canSubmit(input.value.trim());
	};
	const setBusy = (on) => {
		busy = on;
		composer.classList.toggle("is-busy", on);
		composer.querySelectorAll("textarea, button").forEach((el) => { el.disabled = on; });
		if (!on) sync();
	};
	const submit = () => {
		const text = input.value.trim();
		if (busy || !canSubmit(text) || !onSubmit) return;
		const result = onSubmit(text);
		if (!result || typeof result.then !== "function") return;
		setBusy(true);
		result.then(() => { if (composer.isConnected) setBusy(false); }, () => { setBusy(false); input.focus(); });
	};
	const cancel = () => { if (!busy) onCancel?.(); };
	const onKey = (e) => {
		if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); cancel(); }
		else if (e.key === "Enter" && !e.shiftKey && !e.isComposing) { e.preventDefault(); submit(); }
	};
	const onClick = (e) => {
		if (e.target.closest(".chat-composer__send")) submit();
		else if (e.target.closest(".chat-composer__cancel")) cancel();
	};
	input.addEventListener("input", sync);
	input.addEventListener("keydown", onKey);
	composer.addEventListener("click", onClick);
	sync();
	return {
		sync,
		focus() {
			sync();
			input.focus();
			input.setSelectionRange(input.value.length, input.value.length);
		},
		dispose() {
			input.removeEventListener("input", sync);
			input.removeEventListener("keydown", onKey);
			composer.removeEventListener("click", onClick);
		},
	};
}

