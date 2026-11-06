/* Notification bell - Aperam Theme v0.5.2 */
/* Notification bell: <sel-notification-bell class="dropdown" filters='[["all","All"],["mentions","Mentions"]]'> (see the HTML tab for the markup
 * and events). State lives in the DOM: every .notification-item has data-category and data-read, so you can render the list on the
 * server or from code - the element redraws its badge and filter chips whenever the list changes. The chips are drawn by Lit.
 * Events (bubbling): "notification:seen" { ids } when the panel opens, "notification:open" { id } when an item is clicked.
 * addNotification(bell, { id, category, html, text, href, read }) adds one. `text` is plain text (escaped): use it for anything that comes from
 * a user, an API or a database. `html` is the item's inner markup and must be trusted (build it from escaped text yourself). `href` only
 * follows http(s), mailto and relative links; anything else (javascript:, data:) becomes #. */
import { ThemeElement, defineElement, html, repeat, classMap, nothing, prefersReducedMotion, safeHref } from "../theme-lit.js";

const DEFAULT_FILTERS = [["all", "All"]];

export class NotificationBell extends ThemeElement {
	static renderTarget = ".notification-filters";
	static properties = {
		filters: { type: Array },
		activeFilter: { state: true },
	};

	constructor() {
		super();
		this.filters = DEFAULT_FILTERS;
		this.activeFilter = "all";
	}

	get items() {
		return Array.from(this.querySelectorAll(".notification-item"));
	}

	get unread() {
		return this.items.filter((i) => i.dataset.read !== "true").length;
	}

	/** The filter chips that have something to show, with how many items each holds. */
	get chips() {
		const counts = {};
		this.items.forEach((i) => { counts[i.dataset.category] = (counts[i.dataset.category] || 0) + 1; });
		return (Array.isArray(this.filters) ? this.filters : DEFAULT_FILTERS).filter(([key]) => key === "all" || counts[key]).map(([key, label]) => ({ key, label, count: counts[key] }));
	}

	render() {
		const chips = this.chips;
		if (chips.length <= 1) return nothing;
		return html`${repeat(chips, (c) => c.key, (c) => html`<button type="button" class=${classMap({ btn: true, "btn-sm": true, "notification-filter": true, active: c.key === this.activeFilter })}
			data-filter=${c.key} aria-pressed=${String(c.key === this.activeFilter)}>${c.label}${c.key === "all" ? nothing : html` <span class="notification-filter-count">${c.count}</span>`}</button>`)}`;
	}

	willUpdate() {
		// A filter whose items are all gone falls back to "all".
		if (!this.chips.some((c) => c.key === this.activeFilter)) this.activeFilter = "all";
	}

	updated(changed) {
		const unread = this.unread;
		const badge = this.querySelector(".notification-badge");
		badge.textContent = unread > 9 ? "9+" : String(unread);
		badge.classList.toggle("d-none", !unread);
		this.querySelector(".notification-bell-btn").setAttribute("aria-label", unread ? "Notifications (" + unread + " unread)" : "Notifications");
		this.applyFilter(changed.has("activeFilter") && changed.get("activeFilter") !== undefined && this.hasInteracted);
	}

	/** Shows the items of the active filter. Animated (list height + staggered fade-in) only after the person switched filter. */
	applyFilter(animate) {
		const list = this.querySelector(".notification-list");
		const active = this.activeFilter;
		const animated = animate && !prefersReducedMotion();
		const from = list.offsetHeight;
		if (animated) list.style.height = from + "px";
		let shown = 0;
		this.items.forEach((item) => {
			const visible = active === "all" || item.dataset.category === active;
			item.hidden = !visible;
			item.classList.remove("is-entering");
			if (visible) {
				if (animated) {
					item.style.setProperty("--stagger", Math.min(shown, 8));
					item.classList.add("is-entering");
				}
				shown++;
			}
		});
		const empty = list.querySelector(".notification-empty");
		if (empty) empty.hidden = shown > 0;
		if (!animated) return;

		const maxHeight = parseFloat(getComputedStyle(list).maxHeight) || Infinity;
		list.style.height = "auto";
		const to = Math.min(list.scrollHeight, maxHeight);
		list.style.height = from + "px";
		list.getBoundingClientRect(); // commit the start height before transitioning
		list.classList.add("is-resizing");
		list.style.height = to + "px";
		const done = () => { list.classList.remove("is-resizing"); list.style.height = ""; };
		list.addEventListener("transitionend", function onEnd(e) {
			if (e.target === list && e.propertyName === "height") { list.removeEventListener("transitionend", onEnd); done(); }
		});
		setTimeout(done, 400); // in case no transition runs (same height)
	}

	setup() {
		// Bootstrap fires its dropdown events at the toggle button; they bubble up to this element.
		this.listen(this, "shown.bs.dropdown", () => {
			// Mark everything read, but keep the highlight (.is-unread) until the panel closes.
			const seen = this.items.filter((i) => i.dataset.read !== "true");
			seen.forEach((i) => { i.dataset.read = "true"; });
			if (seen.length) this.emit("notification:seen", { ids: seen.map((i) => i.dataset.id) });
		});
		this.listen(this, "hidden.bs.dropdown", () => {
			this.items.forEach((i) => { if (i.dataset.read === "true") i.classList.remove("is-unread"); });
		});
		this.listen(this.querySelector(".notification-filters"), "click", (e) => {
			const chip = e.target.closest("[data-filter]");
			if (!chip || chip.dataset.filter === this.activeFilter) return;
			this.hasInteracted = true;
			this.activeFilter = chip.dataset.filter;
		});
		this.listen(this.querySelector(".notification-list"), "click", (e) => {
			const item = e.target.closest(".notification-item");
			if (!item) return;
			this.emit("notification:open", { id: item.dataset.id });
			if (window.bootstrap) bootstrap.Dropdown.getInstance(this.querySelector(".notification-bell-btn"))?.hide();
		});

		// The list can change from anywhere (addNotification, a server render, another script): redraw when it does.
		const observer = new MutationObserver(() => this.requestUpdate());
		observer.observe(this.querySelector(".notification-list"), { childList: true, subtree: true, attributes: true, attributeFilter: ["data-read", "data-category"] });
		return () => observer.disconnect();
	}
}

/** Adds a notification at the top of the list. item = { id, category, html | text, href, read }. `html` is trusted markup for the item's inside, `text` is escaped. */
export function addNotification(bell, item) {
	const a = document.createElement("a");
	a.href = safeHref(item.href);
	a.className = "notification-item d-flex gap-2 px-3 py-2 text-decoration-none text-reset" + (item.read ? "" : " is-unread");
	a.dataset.id = item.id || "n" + Date.now();
	a.dataset.category = item.category || "updates";
	a.dataset.read = item.read ? "true" : "false";
	if (item.html != null) a.innerHTML = item.html;
	else a.textContent = item.text == null ? "" : String(item.text);
	bell.querySelector(".notification-list").prepend(a);
	return a;
}

defineElement("sel-notification-bell", NotificationBell);

