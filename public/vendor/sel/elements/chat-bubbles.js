/* Chat bubbles & reactions - Aperam Theme v0.5.2 */
/* Chat bubbles with reactions: <sel-chat user="me"> (see the HTML tab for the markup and events). Hover (or focus, or long-press on touch) a
 * bubble to reveal a toolbar with three quick reactions, a searchable emoji picker, edit and a menu (copy / delete / your own entries).
 * Reactions show as small badges on the bubble's bottom edge; each person has at most one reaction per message. Reactions live in
 * data-reactions on each .msg-wrap, so you can save and restore them as JSON. Messages added later (a live list re-rendering) get their
 * toolbar automatically. The toolbar, badges, picker, menu and editor are drawn with Lit (everything escaped).
 * Events (bubbling on the .msg-wrap): chat:react { id, emoji|null, previous } (previous: the reaction it replaced or took back), chat:edit { id, text }, chat:delete { id } (cancelable),
 * chat:copy { id, text } (detail.copied: a promise of whether the clipboard took it), chat:reactions { id, reactions }, chat:menu { id, key }.
 * Saving somewhere slow? Call event.detail.waitUntil(promise) inside the handler: the editor stays open (disabled) until it settles and
 * stays open if it fails, a delete only removes the row once it succeeded, and a failed reaction is rolled back.
 * The text boxes come from the Chat composer component (pulled along with this one): the reaction picker, the edit-in-place box and the
 * reply box. Its functions are exported here too (attachComposer, setComposerOpen, openEmojiPicker, attachEmojiInsertButton, ...), so an
 * import from chat-bubbles keeps working. */
import { ThemeElement, defineElement, html, render, nothing, classMap, icon } from "../theme-lit.js";
import { DEFAULT_EMOJIS, closeChatPopover, openChatPopover, currentChatPopover, openEmojiPicker, attachEmojiInsertButton, attachComposer, setComposerOpen } from "./chat-composer.js";

export { DEFAULT_EMOJIS, closeChatPopover, openEmojiPicker, attachEmojiInsertButton, attachComposer, setComposerOpen };

const QUICK = ["❤️", "😂", "👍"];
const LONG_PRESS_MS = 450;

export class Chat extends ThemeElement {
	static properties = { user: { type: String } };

	constructor() {
		super();
		this.user = "me";
		this.emojis = DEFAULT_EMOJIS;
	}

	get wraps() {
		return Array.from(this.querySelectorAll(".msg-wrap"));
	}

	reactionsOf(wrap) {
		try { return JSON.parse(wrap.dataset.reactions || "{}"); } catch (e) { return {}; }
	}

	/** The emoji this person reacted with on a message, or "". */
	mine(wrap) {
		const found = Object.entries(this.reactionsOf(wrap)).find(([, people]) => Array.isArray(people) && people.includes(this.user));
		return found ? found[0] : "";
	}

	/** data-can-edit / data-can-delete ("true" / "false") override the default: only the owner (data-owner = user) may. */
	allowed(wrap, flag) {
		const value = wrap.dataset[flag];
		return value === undefined ? wrap.dataset.owner === this.user : value === "true";
	}

	canEdit(wrap) { return this.allowed(wrap, "canEdit"); }
	canDelete(wrap) { return this.allowed(wrap, "canDelete"); }

	/** The message's plain text (data-text when the bubble shows it formatted, e.g. with highlighted mentions). */
	textOf(wrap) {
		return wrap.dataset.text ?? wrap.querySelector(".msg-text")?.textContent ?? "";
	}

	/** Your own menu entries: data-menu-items='[{"key":"history","label":"History","icon":"clock-history","danger":false}]'. */
	menuItemsOf(wrap) {
		try { const items = JSON.parse(wrap.dataset.menuItems || "[]"); return Array.isArray(items) ? items : []; } catch (e) { return []; }
	}

	/** Fires an event on the message; returns { ok: not cancelled, done: a promise of everything passed to detail.waitUntil() }. Only an event fired with cancelable = true (chat:delete) can be cancelled with preventDefault(); the others are notifications: reject them through detail.waitUntil(). */
	emitFrom(wrap, name, detail, extras = {}, cancelable = false) {
		const pending = [];
		const full = Object.assign({ id: wrap.dataset.msgId }, detail);
		Object.defineProperty(full, "waitUntil", { value: (p) => { pending.push(Promise.resolve(p)); }, enumerable: false });
		Object.entries(extras).forEach(([key, value]) => Object.defineProperty(full, key, { value, enumerable: false }));
		const ok = wrap.dispatchEvent(new CustomEvent(name, { bubbles: true, cancelable, detail: full }));
		return { ok, done: Promise.all(pending) };
	}

	// ---- drawing

	/** Redraws a message's toolbar and reaction badges from data-reactions. */
	draw(wrap) {
		if (!wrap.hasAttribute("tabindex")) wrap.tabIndex = 0;
		const mine = this.mine(wrap);
		let bar = wrap.querySelector(":scope > .msg-toolbar");
		if (!bar) {
			bar = document.createElement("div");
			bar.className = "msg-toolbar";
			bar.setAttribute("role", "toolbar");
			bar.setAttribute("aria-label", "Message actions");
			wrap.append(bar);
		}
		const hasMenu = this.textOf(wrap) || this.canDelete(wrap) || this.menuItemsOf(wrap).length;
		// A reaction picked from the full picker joins the quick ones (highlighted), so taking it back is one tap, not a search.
		const quick = mine && !QUICK.includes(mine) ? [...QUICK, mine] : QUICK;
		render(html`${quick.map((e) => html`<button type="button" class=${classMap({ "msg-tool-btn": true, "msg-quick-react": true, "is-active": e === mine })} data-emoji=${e} aria-label=${"React with " + e} aria-pressed=${String(e === mine)}>${e}</button>`)}
			<span class="msg-toolbar-divider" aria-hidden="true"></span>
			<button type="button" class="msg-tool-btn" data-action="picker" aria-label="More reactions" title="More reactions">${icon("emoji-smile")}</button>
			${this.canEdit(wrap) ? html`<button type="button" class="msg-tool-btn" data-action="edit" aria-label="Edit" title="Edit">${icon("pencil", "", 15)}</button>` : nothing}
			${hasMenu ? html`<button type="button" class="msg-tool-btn" data-action="more" aria-label="More actions" title="More actions">${icon("three-dots-vertical", "", 15)}</button>` : nothing}`, bar);

		wrap.querySelector(":scope > .reaction-badges")?.remove();
		const entries = Object.entries(this.reactionsOf(wrap)).filter(([, people]) => Array.isArray(people) && people.length);
		if (!entries.length) return;
		const badges = document.createElement("button");
		badges.type = "button";
		badges.className = "reaction-badges";
		badges.setAttribute("aria-label", "See who reacted");
		render(html`${entries.map(([emoji, people]) => html`<span class=${classMap({ "reaction-badge": true, "is-mine": emoji === mine })}>${emoji}${people.length > 1 ? html`<span class="reaction-count">${people.length}</span>` : nothing}</span>`)}`, badges);
		wrap.append(badges);
	}

	/** One reaction per person: choosing a new emoji replaces the old one, choosing the same one removes it. */
	react(wrap, emoji) {
		wrap.classList.remove("is-open");
		const before = wrap.dataset.reactions;
		const reactions = this.reactionsOf(wrap);
		const previous = this.mine(wrap);
		Object.keys(reactions).forEach((e) => { reactions[e] = (reactions[e] || []).filter((p) => p !== this.user); });
		if (previous !== emoji) (reactions[emoji] = reactions[emoji] || []).push(this.user);
		Object.keys(reactions).forEach((e) => { if (!reactions[e].length) delete reactions[e]; });
		wrap.dataset.reactions = JSON.stringify(reactions);
		this.draw(wrap);
		this.emitFrom(wrap, "chat:react", { emoji: previous === emoji ? null : emoji, previous: previous || null }).done.catch(() => {
			if (!wrap.isConnected) return;
			if (before === undefined) delete wrap.dataset.reactions; else wrap.dataset.reactions = before;
			this.draw(wrap);
		});
	}

	openPicker(wrap, anchor) {
		openEmojiPicker(anchor, (e) => this.react(wrap, e), { emojis: this.emojis, wrap, owner: this });
	}

	openMenu(wrap, anchor) {
		const text = this.textOf(wrap);
		const items = this.menuItemsOf(wrap);
		const extra = (item) => html`<button type="button" class=${classMap({ "msg-menu-item": true, "msg-menu-item--danger": !!item.danger })} @click=${() => {
			closeChatPopover();
			this.emitFrom(wrap, "chat:menu", { key: item.key });
		}}>${item.icon ? icon(item.icon) : nothing}<span>${item.label}</span></button>`;
		// Everyday entries first, destructive ones grouped at the bottom.
		const el = openChatPopover(anchor, wrap, "msg-menu", html`
			${items.filter((i) => !i.danger).map(extra)}
			${text ? html`<button type="button" class="msg-menu-item" @click=${() => {
				closeChatPopover();
				// detail.copied: a promise of whether the clipboard took it (a browser may refuse), e.g. for a "Copied." toast.
				const copied = navigator.clipboard ? navigator.clipboard.writeText(text).then(() => true, () => false) : Promise.resolve(false);
				this.emitFrom(wrap, "chat:copy", { text }, { copied });
			}}>${icon("copy")}<span>Copy text</span></button>` : nothing}
			${this.canDelete(wrap) ? html`<button type="button" class="msg-menu-item msg-menu-item--danger" @click=${() => {
				closeChatPopover();
				const question = wrap.dataset.deleteConfirm;
				if (question && !window.confirm(question)) return;
				const { ok, done } = this.emitFrom(wrap, "chat:delete", {}, {}, true);
				if (ok) done.then(() => wrap.closest(".chat-message")?.remove(), () => {});
			}}>${icon("trash")}<span>${wrap.dataset.deleteLabel || "Delete"}</span></button>` : nothing}
			${items.filter((i) => i.danger).map(extra)}`, this);
		el.querySelector(".msg-menu-item")?.focus();
	}

	// ---- editing in place: the text turns into a composer inside the bubble (attachComposer: Enter saves, Shift+Enter is a new line,
	// Escape cancels without closing a surrounding modal). An unchanged text just closes it.

	/** Opens the inline editor on a message (its data-msg-id, or the .msg-wrap itself), as the pencil does. Nothing happens when this
	 * person may not edit it. Returns whether it opened. */
	editMessage(target) {
		const wrap = typeof target === "string" ? this.querySelector(`.msg-wrap[data-msg-id="${CSS.escape(target)}"]`) : target;
		if (!wrap || !this.contains(wrap) || !this.canEdit(wrap)) return false;
		this.startEdit(wrap);
		return wrap.classList.contains("is-editing");
	}

	startEdit(wrap) {
		const textEl = wrap.querySelector(".msg-text");
		if (!textEl || wrap.classList.contains("is-editing")) return;
		const original = this.textOf(wrap);
		const editor = document.createElement("div");
		editor.className = "msg-editor chat-composer chat-composer--inline";
		render(html`<textarea class="chat-composer__input" rows="1" aria-label="Edit message" .value=${original}></textarea>
			<div class="chat-composer__footer">
				<small class="chat-composer__hint">Enter to save · Esc to cancel</small>
				<button type="button" class="chat-composer__cancel">Cancel</button>
				<button type="button" class="chat-composer__send" aria-label="Save" title="Save">${icon("check-lg")}</button>
			</div>`, editor);
		const badge = document.createElement("span");
		badge.className = "msg-editing-badge";
		render(html`${icon("pencil-fill")}<span>Editing</span>`, badge);
		let composer = null;
		const close = () => {
			composer?.dispose();
			editor.remove();
			badge.remove();
			textEl.hidden = false;
			wrap.classList.remove("is-editing", "is-open");
		};
		textEl.hidden = true;
		textEl.after(editor);
		wrap.prepend(badge);
		wrap.classList.add("is-editing");
		composer = attachComposer(editor, {
			onCancel: close,
			onSubmit: (value) => {
				if (value === original) return close();
				return this.emitFrom(wrap, "chat:edit", { text: value }).done.then(() => {
					textEl.textContent = value;
					if (wrap.dataset.text !== undefined) wrap.dataset.text = value;
					close();
				});
			},
		});
		composer.focus();
	}

	// ---- wiring

	setup() {
		this.wraps.forEach((wrap) => this.draw(wrap));

		// A live list re-renders its messages: draw the toolbar on every message that arrives later.
		const observer = new MutationObserver((records) => {
			for (const record of records) {
				record.addedNodes.forEach((node) => {
					if (node.nodeType !== 1) return;
					const found = node.matches(".msg-wrap") ? [node] : Array.from(node.querySelectorAll(".msg-wrap"));
					found.forEach((wrap) => { if (!wrap.querySelector(":scope > .msg-toolbar")) this.draw(wrap); });
				});
			}
		});
		observer.observe(this, { childList: true, subtree: true });

		let suppressClick = false;
		this.listen(this, "click", (e) => {
			if (suppressClick) { suppressClick = false; e.preventDefault(); e.stopPropagation(); return; }
			const wrap = e.target.closest(".msg-wrap");
			if (!wrap || !this.contains(wrap)) return;
			const quick = e.target.closest(".msg-quick-react");
			if (quick) return this.react(wrap, quick.dataset.emoji);
			const action = e.target.closest("[data-action]");
			if (action) {
				if (action.dataset.action === "picker") this.openPicker(wrap, action);
				else if (action.dataset.action === "more") this.openMenu(wrap, action);
				else if (action.dataset.action === "edit") this.startEdit(wrap);
				return;
			}
			if (e.target.closest(".reaction-badges")) this.emitFrom(wrap, "chat:reactions", { reactions: this.reactionsOf(wrap) });
		});

		// Touch: a long press opens the toolbar (moving more than a few pixels is a scroll and cancels it); the click that follows a
		// completed long press is swallowed, and a tap anywhere else closes the toolbar again.
		let timer = null;
		let start = null;
		this.listen(this, "pointerdown", (e) => {
			if (e.pointerType !== "touch") return;
			const wrap = e.target.closest(".msg-wrap");
			clearTimeout(timer);
			if (!wrap || wrap.classList.contains("is-editing") || e.target.closest(".msg-toolbar, .reaction-badges")) return;
			start = { x: e.clientX, y: e.clientY };
			timer = setTimeout(() => {
				this.querySelectorAll(".msg-wrap.is-open").forEach((w) => { if (w !== wrap) w.classList.remove("is-open"); });
				wrap.classList.add("is-open");
				suppressClick = true;
				navigator.vibrate?.(10);
			}, LONG_PRESS_MS);
		});
		this.listen(this, "pointermove", (e) => {
			if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(timer);
		});
		["pointerup", "pointercancel"].forEach((type) => this.listen(this, type, () => { clearTimeout(timer); start = null; }));
		// The OS long-press menu (select / copy) would fight the toolbar.
		this.listen(this, "contextmenu", (e) => {
			if (e.target.closest(".msg-wrap") && !e.target.closest(".msg-editor")) e.preventDefault();
		});
		this.listen(document, "pointerdown", (e) => {
			if (currentChatPopover()?.el.contains(e.target)) return;
			const wrap = e.target.closest(".msg-wrap");
			this.querySelectorAll(".msg-wrap.is-open").forEach((w) => { if (w !== wrap) w.classList.remove("is-open"); });
		});

		return () => {
			observer.disconnect();
			clearTimeout(timer);
			if (currentChatPopover()?.owner === this) closeChatPopover();
		};
	}
}

defineElement("sel-chat", Chat);

