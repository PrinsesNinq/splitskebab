/* List Striped Glass - Aperam Theme v0.5.2 */
/* Striped list element: <sel-striped-list> around a .striped-list (list group or table).
 *
 * Collapsed list (limit="10"): shows the first rows, fades the list out towards the bottom and adds a chevron button that reveals the
 * rest and folds it back. Rows that a live list adds or removes later are counted again (the open / closed choice is kept). Only rows
 * that are shown count: a row the page hides itself (.d-none or hidden) or a column filter hides is skipped. Attributes: limit
 * (default 10), expanded, label-more ("{count}" = number of rows), label-less. Event (bubbling): "striped-list:toggle" { expanded }.
 * Opening and closing animate: one height animation on the list's box (Web Animations) with the fade dissolving alongside it,
 * 180 to 400 ms depending on the distance, interruptible (a second tap turns it around from where it is), and skipped for people
 * who asked their system for less motion. Setting expanded from code switches without animating.
 *
 * Column tools (sortable, tables only): every column header becomes a sort button plus a small filter (funnel) button. Clicking
 * (or tapping) the header text sorts the column: A → Z (1 → 9 for numbers), Z → A, then back to the original order. The funnel,
 * right-clicking the header, long-pressing it on a touch screen, or the context-menu key / Shift+F10 opens a menu with everything:
 * both sort directions, a search in the column and a tick list of its values (with one select / deselect all toggle). The menu has
 * the theme's glass look (translucent, blurred backdrop); on a phone it is a bottom sheet. A filter or sort change animates: rows that
 * move slide to their new place and rows that come back fade in (only the rows on screen, transform / opacity only, ~250 ms, not
 * for live re-renders, and not for people who asked for less motion). Active filters show as chips above the table ("Showing 4 of 20"), each removable, with "Clear all". Sorting and
 * filters are re-applied when a live table re-renders its rows. Per header cell: data-sort="false" leaves a column out (empty
 * headers, e.g. an actions column, are left out anyway), data-label names it in the menu. Per body cell: data-value is the value used
 * for sorting, searching and the value list (instead of the cell's text), data-values="a|b" gives a cell several values (e.g. a list of
 * groups). Events (bubbling): "striped-list:sort" { index, column, direction: "ascending" | "descending" | null } and
 * "striped-list:filter" { filters: [{ index, column, text, excluded: [values] }] }.
 *
 * Sticky header (tables, on by default): the header row (and the filter bar above it) stays in view while the table scrolls by.
 * While the table fits, its .table-responsive stops scrolling so the header can stick to the page; a table wider than the screen
 * scrolls inside its own box instead (as tall as the screen below the sticky offset, or --striped-list-scroll-height) with the header sticking there. --striped-list-sticky-top is
 * the offset (e.g. var(--navbar-height) under a sticky navbar); the no-sticky attribute switches it off. When the page scrolls past the top
 * of such a box, the header is moved down inside it so it stays below the navbar too.
 *
 * Numbers: a column whose cells are all numbers sorts by value, also with separators ("1,234.56", "1.234,56", "1 234,5", "12%").
 */
import { ThemeElement, defineElement, html, render, nothing, classMap, icon, prefersReducedMotion } from "../theme-lit.js";

const EXTRA = "striped-list__extra";
const FILTERED = "striped-list__filtered";
const ALT = "striped-list__alt";
const SHEET = "(max-width: 575.98px)";
const MAX_VALUES = 50; // a column with more different values than this gets the search only, no tick list
const LONG_PRESS_MS = 450;
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: "base" });
const isNumber = (v) => /^-?[\d.,\s]+%?$/.test(v) && /\d/.test(v);
/**
 * The value of a formatted number: "1,234.56", "1.234,56", "1 234,5", "-12%". With both separators the last one is the decimal point;
 * one separator that repeats, or that has exactly three digits after it behind 1-3 digits, is a thousands separator ("1,234", "12.345.678");
 * any other single separator is a decimal point ("0,5", "3.14").
 */
const toNumber = (v) => {
	let s = v.replace(/[\s%]/g, "");
	const sign = s.startsWith("-") ? -1 : 1;
	s = s.replace(/^-/, "");
	const last = Math.max(s.lastIndexOf("."), s.lastIndexOf(","));
	if (last >= 0) {
		const mark = s[last];
		const other = mark === "." ? "," : ".";
		const thousands = s.includes(other) ? false : (s.split(mark).length > 2 || (/^\d{1,3}$/.test(s.slice(0, last)) && /^\d{3}$/.test(s.slice(last + 1)) && s.slice(0, last) !== "0"));
		if (thousands) s = s.split(mark).join("");
		else s = s.split(other).join("").replace(mark, ".");
	}
	const n = Number(s);
	return Number.isFinite(n) ? sign * n : NaN;
};

export class StripedList extends ThemeElement {
	static properties = {
		limit: { type: Number },
		expanded: { type: Boolean, reflect: true },
		labelMore: { type: String, attribute: "label-more" },
		labelLess: { type: String, attribute: "label-less" },
		sortable: { type: Boolean },
	};

	constructor() {
		super();
		this.limit = 10;
		this.expanded = false;
		this.labelMore = "Show all {count}";
		this.labelLess = "Show less";
		this.sortable = false;
		this.sortState = null; // { index, dir: 1 | -1 }
		this.filters = new Map(); // column index -> { text, excluded: Set }
		this.seq = 0; // arrival order, so "no sort" puts rows back the way they came
	}

	get list() {
		return this.querySelector(".striped-list");
	}

	get table() {
		const list = this.list;
		return list && list.matches("table") ? list : null;
	}

	/** The rows, in order: a list group's items or a table body's rows. */
	allRows() {
		const list = this.list;
		if (!list) return [];
		return Array.from(list.matches("table") ? list.querySelectorAll(":scope > tbody > tr") : list.children)
			.filter((row) => !row.matches("thead, tfoot"));
	}

	/** Rows that are shown: not hidden by the page itself, nor by a column filter. */
	shownRows() {
		return this.allRows().filter((row) => !row.hidden && !row.classList.contains("d-none") && !row.classList.contains(FILTERED));
	}

	apply() {
		const btn = this.toggleBtn;
		if (!btn) return;
		// A filter or sort the person just changed animates (FLIP): where the rows are now, before anything moves.
		const before = this.animateNext ? this.capturePositions() : null;
		this.animateNext = false;
		this.applyTools();
		const all = this.allRows();
		const rows = this.shownRows();
		const limit = Math.max(1, Number(this.limit) || 10);
		const collapsible = rows.length > limit;
		// While a close animates, the rows stay shown until the box has shrunk to the collapsed height.
		const collapsed = collapsible && !this.expanded && !this.closing;
		// Only rows whose state changes are touched (toggle with force is a no-op otherwise), so the observer below, which also
		// watches classes, is not woken up by this method itself.
		const extra = new Set(collapsed ? rows.slice(limit) : []);
		all.forEach((row) => row.classList.toggle(EXTRA, extra.has(row)));
		this.classList.toggle("is-collapsed", collapsed);
		btn.hidden = !collapsible;
		btn.setAttribute("aria-expanded", String(!collapsed));
		const label = collapsed ? String(this.labelMore).replace("{count}", rows.length) : this.labelLess;
		render(html`<span class="striped-list__chevron" aria-hidden="true">${icon("chevron-down")}</span><span class="striped-list__label">${label}</span>`, btn);
		if (before) this.playPositions(before);
		if (this.menuState) this.renderMenu();
	}

	// ---------------------------------------------------------------- sticky header

	/**
	 * The header sticks while the table scrolls by. A sticky header only sticks to the page when nothing around it scrolls, so while
	 * the table fits its .table-responsive that wrapper stops being a scroll container (is-scroll-x off); when the table is wider than
	 * the screen, the wrapper scrolls both ways (up to --striped-list-scroll-height) and the header sticks inside it. The filter bar
	 * sticks right above the header; its height is published as --striped-list-bar-height so the header lines up under it.
	 */
	updateSticky() {
		const table = this.table;
		if (!table) return;
		const box = this.box;
		const scrollX = !!box && box !== table && table.offsetWidth > box.clientWidth + 1;
		this.classList.toggle("is-scroll-x", scrollX);
		const bar = this.filterBar;
		const height = (bar && !bar.hidden ? bar.offsetHeight : 0) + "px";
		if (this.style.getPropertyValue("--striped-list-bar-height") !== height) this.style.setProperty("--striped-list-bar-height", height);
		this.updateHeaderShift();
	}

	/**
	 * A wide table scrolls in its own box, and a header can only stick inside that box. Once the page has scrolled the box's top above the
	 * sticky offset, the header is moved down inside the box by the difference (--striped-list-header-shift, a transform), so it stays
	 * where a header of a table that fits would stay: right below the navbar. It never leaves the box (the shift stops above its bottom).
	 */
	updateHeaderShift() {
		const box = this.box;
		const th = this.table?.tHead?.rows[0]?.cells[0];
		let shift = 0;
		if (this.classList.contains("is-scroll-x") && !this.hasAttribute("no-sticky") && box && th) {
			const probe = document.createElement("div");
			probe.style.cssText = "position:fixed;visibility:hidden;pointer-events:none;height:0;top:var(--striped-list-sticky-top, 0px)";
			this.append(probe);
			const stickyTop = probe.getBoundingClientRect().top;
			probe.remove();
			const room = box.clientHeight - th.offsetHeight - 1;
			shift = Math.max(0, Math.min(Math.round(stickyTop - box.getBoundingClientRect().top), room));
		}
		const value = shift + "px";
		if (this.style.getPropertyValue("--striped-list-header-shift") !== value) this.style.setProperty("--striped-list-header-shift", value);
	}

	// ---------------------------------------------------------------- filter / sort animation (FLIP)

	/** Rows that are shown and on screen (give or take a little), so the animation only ever touches what can be seen. */
	visibleRows() {
		const body = this.table?.tBodies[0];
		if (!body) return [];
		const top = -200;
		const bottom = window.innerHeight + 200;
		return Array.from(body.rows).filter((row) => {
			if (row.offsetParent === null) return false;
			const r = row.getBoundingClientRect();
			return r.bottom > top && r.top < bottom;
		});
	}

	/** Where the visible rows are right now (mid-animation included, so a quick next change carries on from there). */
	capturePositions() {
		if (prefersReducedMotion() || !this.table) return null;
		return new Map(this.visibleRows().map((row) => [row, row.getBoundingClientRect().top]));
	}

	/** Rows that moved slide from where they were; rows that came back fade in. Only transform and opacity, about 250 ms. */
	playPositions(before) {
		const body = this.table?.tBodies[0];
		if (!body) return;
		Array.from(body.rows).forEach((row) => row.getAnimations().forEach((a) => { if (a.id === "striped-list-flip") a.cancel(); }));
		const timing = { duration: 250, easing: "cubic-bezier(0.2, 0, 0, 1)" };
		let entering = 0;
		for (const row of this.visibleRows()) {
			const top = row.getBoundingClientRect().top;
			let animation = null;
			if (before.has(row)) {
				const dy = before.get(row) - top;
				if (Math.abs(dy) > 1) animation = row.animate([{ transform: `translateY(${dy}px)` }, { transform: "none" }], timing);
			} else {
				animation = row.animate([{ opacity: 0, transform: "translateY(-6px)" }, { opacity: 1, transform: "none" }],
					{ ...timing, duration: 220, delay: Math.min(entering++ * 18, 120), fill: "backwards" });
			}
			if (animation) animation.id = "striped-list-flip";
		}
	}

	updated() {
		this.apply();
	}

	// ---------------------------------------------------------------- collapse animation

	/** The element's child that holds the list (the list itself, or a .table-responsive around a table): what gets animated. */
	get box() {
		const list = this.list;
		return list ? Array.from(this.children).find((child) => child.contains(list)) || list : null;
	}

	/** The box's height when collapsed: from its top to where the first hidden row starts. */
	collapsedHeight(box) {
		const rows = this.shownRows();
		const limit = Math.max(1, Number(this.limit) || 10);
		const first = rows[limit];
		return first ? first.getBoundingClientRect().top - box.getBoundingClientRect().top : box.getBoundingClientRect().height;
	}

	/** Opens or closes with the animation (the button). */
	toggle() {
		const box = this.box;
		const opening = !this.expanded;
		const running = this.animation;
		// Start from wherever the box is right now (a second tap mid-animation turns it around without a jump).
		const from = box ? box.getBoundingClientRect().height : 0;
		if (running) { running.onfinish = null; running.cancel(); this.maskAnimation?.cancel(); }

		this.expanded = opening;
		this.closing = !opening;
		this.apply(); // opening: every row is shown now; closing: they stay shown until the end
		this.emit("striped-list:toggle", { expanded: opening });
		if (!box || prefersReducedMotion() || typeof box.animate !== "function") return this.finish(box);

		const to = opening ? box.scrollHeight : this.collapsedHeight(box);
		const duration = Math.round(Math.min(400, 180 + Math.abs(to - from) / 6));
		this.style.setProperty("--striped-list-duration", duration + "ms");
		this.classList.add("is-animating");
		box.style.overflow = "hidden";
		const timing = { duration, easing: opening ? "cubic-bezier(0.2, 0, 0, 1)" : "cubic-bezier(0.4, 0, 1, 1)" };
		this.animation = box.animate([{ height: from + "px" }, { height: to + "px" }], timing);
		this.maskAnimation = this.animate(
			[{ "--striped-list-mask-end": opening ? "transparent" : "#000" }, { "--striped-list-mask-end": opening ? "#000" : "transparent" }],
			{ ...timing, fill: "forwards" },
		);
		this.animation.onfinish = () => this.finish(box);
	}

	/** After an open / close: the final state, and nothing left over from the animation. */
	finish(box) {
		this.closing = false;
		this.apply();
		this.animation = null;
		this.maskAnimation?.cancel();
		this.maskAnimation = null;
		this.classList.remove("is-animating");
		if (box) box.style.overflow = "";
		// Folding a long list back up: keep the button in view instead of leaving the reader far below the list.
		if (!this.expanded) this.toggleBtn?.scrollIntoView({ block: "nearest" });
	}

	// ---------------------------------------------------------------- column tools: data

	/** The header cells of the table's last header row. */
	headerCells() {
		const head = this.table?.tHead;
		const row = head && head.rows[head.rows.length - 1];
		return row ? Array.from(row.cells) : [];
	}

	isColumn(th) {
		return th.dataset.sort !== "false" && th.textContent.trim() !== "";
	}

	columnName(th) {
		return (th.dataset.label || th.querySelector(".striped-list__sort-label")?.textContent || th.textContent).replace(/\s+/g, " ").trim();
	}

	/** A cell's value: its data-value, or its text. */
	cellValue(row, i) {
		const td = row.cells[i];
		if (!td) return "";
		return (td.dataset.value ?? td.textContent).replace(/\s+/g, " ").trim();
	}

	/** A cell's values for searching and the tick list: data-values="a|b" for several, otherwise the one value. */
	cellValues(row, i) {
		const td = row.cells[i];
		if (td && td.dataset.values !== undefined) {
			const list = td.dataset.values.split("|").map((v) => v.trim()).filter(Boolean);
			return list.length ? list : [""];
		}
		return [this.cellValue(row, i)];
	}

	filterOf(i) {
		if (!this.filters.has(i)) this.filters.set(i, { text: "", excluded: new Set() });
		return this.filters.get(i);
	}

	isActive(f) {
		return !!f && (f.text.trim() !== "" || f.excluded.size > 0);
	}

	activeFilters() {
		return Array.from(this.filters).filter(([, f]) => this.isActive(f));
	}

	rowMatches(row, i, f) {
		const values = this.cellValues(row, i);
		const q = f.text.trim().toLowerCase();
		if (q && !values.some((v) => v.toLowerCase().includes(q))) return false;
		// A row with several values stays as long as one of them is still ticked.
		if (f.excluded.size && values.every((v) => f.excluded.has(v))) return false;
		return true;
	}

	/** A column's different values with how many rows have each, sorted. */
	distinctValues(i) {
		const counts = new Map();
		for (const row of this.allRows()) for (const v of new Set(this.cellValues(row, i))) counts.set(v, (counts.get(v) || 0) + 1);
		return Array.from(counts, ([value, count]) => ({ value, count })).sort((a, b) => (!a.value - !b.value) || collator.compare(a.value, b.value));
	}

	isNumeric(i) {
		const values = this.allRows().map((row) => this.cellValue(row, i)).filter(Boolean);
		return values.length > 0 && values.every(isNumber);
	}

	// ---------------------------------------------------------------- column tools: applying them

	/** Filters, sorts and redraws the headers and the filter bar. Idempotent: it only touches what changes. */
	applyTools() {
		const table = this.table;
		if (!this.sortable || !table) return;
		const rows = this.allRows();
		rows.forEach((row) => { if (row.__stripedSeq === undefined) row.__stripedSeq = this.seq++; });

		const active = this.activeFilters();
		rows.forEach((row) => row.classList.toggle(FILTERED, !active.every(([i, f]) => this.rowMatches(row, i, f))));

		const body = table.tBodies[0];
		if (body) {
			const current = Array.from(body.rows);
			const order = [...current];
			if (this.sortState) {
				const { index, dir } = this.sortState;
				const numeric = this.isNumeric(index); // formatted numbers ("1,234.56") sort by value, not by their digit runs
				order.sort((a, b) => {
					const x = this.cellValue(a, index);
					const y = this.cellValue(b, index);
					if (!x !== !y) return x ? -1 : 1; // empty cells last, whichever way
					const cmp = numeric ? (toNumber(x) - toNumber(y)) || 0 : collator.compare(x, y);
					return cmp * dir || a.__stripedSeq - b.__stripedSeq;
				});
			} else {
				order.sort((a, b) => a.__stripedSeq - b.__stripedSeq);
			}
			if (order.some((row, k) => row !== current[k])) body.append(...order);
		}

		// Stripes alternate over the rows that are shown (nth-child would count the filtered-out ones).
		const filtering = active.length > 0;
		this.classList.toggle("is-filtered", filtering);
		let n = 0;
		Array.from(body ? body.rows : []).forEach((row) => {
			const shown = !row.classList.contains(FILTERED) && !row.hidden && !row.classList.contains("d-none");
			row.classList.toggle(ALT, filtering && shown && n++ % 2 === 1);
		});

		this.drawHeaders();
		this.drawFilterBar();
	}

	/** Each header: a sort button (the header text and the sort arrow) and a filter button (a funnel) side by side. */
	drawHeaders() {
		this.headerCells().forEach((th, i) => {
			if (!this.isColumn(th)) return;
			let head = th.querySelector(":scope > .striped-list__head");
			if (!head) {
				head = document.createElement("div");
				head.className = "striped-list__head";
				const btn = document.createElement("button");
				btn.type = "button";
				btn.className = "striped-list__sort";
				const label = document.createElement("span");
				label.className = "striped-list__sort-label";
				label.append(...th.childNodes);
				const state = document.createElement("span");
				state.className = "striped-list__sort-state";
				state.setAttribute("aria-hidden", "true");
				btn.append(label, state);
				const filterBtn = document.createElement("button");
				filterBtn.type = "button";
				filterBtn.className = "striped-list__filter";
				filterBtn.setAttribute("aria-haspopup", "dialog");
				filterBtn.setAttribute("aria-expanded", "false");
				head.append(btn, filterBtn);
				th.append(head);
				th.classList.add("striped-list__th");
			}
			const btn = head.querySelector(".striped-list__sort");
			const filterBtn = head.querySelector(".striped-list__filter");
			btn.dataset.column = filterBtn.dataset.column = String(i);
			const sorted = this.sortState && this.sortState.index === i ? this.sortState.dir : 0;
			const filtered = this.isActive(this.filters.get(i));
			btn.classList.toggle("is-sorted", !!sorted);
			filterBtn.classList.toggle("is-active", filtered);
			const ariaSort = sorted > 0 ? "ascending" : sorted < 0 ? "descending" : "none";
			if (th.getAttribute("aria-sort") !== ariaSort) th.setAttribute("aria-sort", ariaSort);
			const name = this.columnName(th);
			const sortLabel = name + (sorted ? (sorted > 0 ? ", sorted ascending" : ", sorted descending") : "") + ". Press to sort.";
			if (btn.getAttribute("aria-label") !== sortLabel) btn.setAttribute("aria-label", sortLabel);
			const tip = "Click to sort · right-click or long-press for more";
			if (btn.title !== tip) btn.title = tip;
			const filterLabel = (filtered ? "Filtered: search and filter " : "Search and filter ") + name;
			if (filterBtn.getAttribute("aria-label") !== filterLabel) {
				filterBtn.setAttribute("aria-label", filterLabel);
				filterBtn.title = filtered ? "Filtered · search and filter" : "Search and filter";
			}
			render(html`${icon(sorted > 0 ? "arrow-up" : sorted < 0 ? "arrow-down" : "chevron-expand")}`, btn.querySelector(".striped-list__sort-state"));
			render(html`${icon(filtered ? "funnel-fill" : "funnel")}`, filterBtn);
		});
	}

	/** "Showing 4 of 20", a chip per filtered column and "Clear all"; the empty message when nothing matches. */
	drawFilterBar() {
		const bar = this.filterBar;
		const empty = this.emptyNote;
		if (!bar || !empty) return;
		const active = this.activeFilters();
		const rows = this.allRows();
		const shown = rows.filter((row) => !row.classList.contains(FILTERED)).length;
		const heads = this.headerCells();
		bar.hidden = active.length === 0;
		empty.hidden = active.length === 0 || shown > 0;
		const chip = ([i, f]) => {
			const name = heads[i] ? this.columnName(heads[i]) : "Column";
			const parts = [];
			if (f.text.trim()) parts.push(`“${f.text.trim()}”`);
			if (f.excluded.size) {
				const kept = this.distinctValues(i).filter((d) => !f.excluded.has(d.value)).map((d) => d.value || "(empty)");
				parts.push(kept.length && kept.length <= 2 ? kept.join(", ") : `${kept.length} of ${kept.length + f.excluded.size}`);
			}
			return html`<button type="button" class="striped-list__chip" @click=${() => this.clearColumn(i)} aria-label=${`Remove the ${name} filter`}>
				<span>${name}: ${parts.join(" · ")}</span>${icon("x")}</button>`;
		};
		render(html`<span class="striped-list__count">Showing ${shown} of ${rows.length}</span>
			${active.map(chip)}
			<button type="button" class="btn btn-link btn-sm p-0 striped-list__clear" @click=${() => this.clearAll()}>Clear all</button>`, bar);
		render(html`<span>No rows match these filters.</span>
			<button type="button" class="btn btn-link btn-sm p-0" @click=${() => this.clearAll()}>Clear filters</button>`, empty);
	}

	// ---------------------------------------------------------------- column tools: changing them

	/** The menu's sort buttons: that direction, or no sort when it is already the active one. */
	setSort(i, dir) {
		const same = this.sortState && this.sortState.index === i && this.sortState.dir === dir;
		this.sortTo(same ? null : { index: i, dir });
	}

	/** A click on a header: A → Z, Z → A, then back to the original order. */
	cycleSort(i) {
		const current = this.sortState && this.sortState.index === i ? this.sortState.dir : 0;
		this.sortTo(current === 0 ? { index: i, dir: 1 } : current > 0 ? { index: i, dir: -1 } : null);
	}

	sortTo(state) {
		const i = state ? state.index : this.sortState?.index;
		this.sortState = state;
		this.animateNext = true;
		this.apply();
		const th = i !== undefined ? this.headerCells()[i] : null;
		this.emit("striped-list:sort", { index: i ?? null, column: th ? this.columnName(th) : "", direction: state ? (state.dir > 0 ? "ascending" : "descending") : null });
	}

	changed() {
		this.animateNext = true;
		this.apply();
		const heads = this.headerCells();
		this.emit("striped-list:filter", {
			filters: this.activeFilters().map(([index, f]) => ({ index, column: heads[index] ? this.columnName(heads[index]) : "", text: f.text.trim(), excluded: Array.from(f.excluded) })),
		});
	}

	clearColumn(i) {
		this.filters.delete(i);
		const search = this.menuState && this.menuState.index === i ? this.menuState.menu.querySelector(".striped-list__menu-search") : null;
		if (search) search.value = "";
		this.changed();
	}

	clearAll() {
		this.filters.clear();
		const search = this.menuState?.menu.querySelector(".striped-list__menu-search");
		if (search) search.value = "";
		this.changed();
	}

	// ---------------------------------------------------------------- column tools: the menu

	/** Opens the column menu for column i, under its header button, or at `point` ({ x, y }: where it was right-clicked). */
	openMenu(i, anchor, point = null) {
		if (this.menuState && this.menuState.index === i) {
			// Already open for this column (Android fires contextmenu as well as our own long press): just move it.
			if (point && !this.menuState.sheet) this.placeMenu(point);
			return;
		}
		this.closeMenu();
		const th = this.headerCells()[i];
		const name = this.columnName(th);
		const f = this.filterOf(i);
		const sheet = window.matchMedia(SHEET).matches;
		const host = this.closest(".modal") || document.body;

		const menu = document.createElement("div");
		menu.className = "striped-list__menu" + (sheet ? " is-sheet" : "");
		menu.setAttribute("role", "dialog");
		menu.setAttribute("aria-label", name + ": sort and filter");
		const searchId = "striped-list-search-" + Math.random().toString(36).slice(2, 8);
		render(html`
			<div class="striped-list__menu-head">
				<strong class="text-truncate">${name}</strong>
				<button type="button" class="btn-close" aria-label="Close" @click=${() => this.closeMenu(true)}></button>
			</div>
			<div class="striped-list__menu-sort" role="group" aria-label="Sort"></div>
			<label class="visually-hidden" for=${searchId}>Search in ${name}</label>
			<input type="search" id=${searchId} class="form-control form-control-sm striped-list__menu-search" placeholder=${"Search in " + name.toLowerCase() + "…"}
				autocomplete="off" enterkeyhint="done" .value=${f.text}
				@input=${(e) => { this.filterOf(i).text = e.target.value; this.changed(); }}
				@keydown=${(e) => { if (e.key === "Enter") { e.preventDefault(); this.closeMenu(true); } }} />
			<div class="striped-list__menu-values"></div>
			<div class="striped-list__menu-foot">
				<button type="button" class="btn btn-link btn-sm px-0" @click=${() => this.clearColumn(i)}>Clear</button>
				<button type="button" class="btn btn-primary btn-sm" @click=${() => this.closeMenu(true)}>Done</button>
			</div>`, menu);

		let backdrop = null;
		if (sheet) {
			backdrop = document.createElement("div");
			backdrop.className = "striped-list__backdrop";
			backdrop.addEventListener("click", () => this.closeMenu(true));
			host.append(backdrop);
		}
		host.append(menu);
		// The column's filter button says the menu is open, however it was opened (it is the button that announces the popup).
		const trigger = th.querySelector(".striped-list__filter") || anchor;
		trigger.setAttribute("aria-expanded", "true");
		this.menuState = { index: i, menu, anchor, trigger, backdrop, sheet };
		this.renderMenu();
		if (!sheet) this.placeMenu(point);

		const onPointerDown = (e) => { if (!menu.contains(e.target) && !anchor.contains(e.target) && e.target !== backdrop) this.closeMenu(); };
		const onKeyDown = (e) => { if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); this.closeMenu(true); } };
		// Scrolling the page: the menu follows its header (once per frame), and closes only when the header has scrolled out of view.
		let scrollQueued = false;
		const onScroll = (e) => {
			if (sheet || menu.contains(e.target) || scrollQueued) return;
			scrollQueued = true;
			requestAnimationFrame(() => {
				scrollQueued = false;
				if (!this.menuState || this.menuState.menu !== menu) return;
				const r = anchor.getBoundingClientRect();
				if (r.bottom < 0 || r.top > window.innerHeight) this.closeMenu();
				else this.placeMenu();
			});
		};
		const onResize = () => this.closeMenu();
		document.addEventListener("pointerdown", onPointerDown, true);
		document.addEventListener("keydown", onKeyDown, true);
		window.addEventListener("scroll", onScroll, true);
		window.addEventListener("resize", onResize);
		this.menuState.cleanup = () => {
			document.removeEventListener("pointerdown", onPointerDown, true);
			document.removeEventListener("keydown", onKeyDown, true);
			window.removeEventListener("scroll", onScroll, true);
			window.removeEventListener("resize", onResize);
		};
		// Typing straight away on a computer; on a touch screen the keyboard would cover the sheet, so it waits for a tap.
		if (window.matchMedia("(hover: hover)").matches) menu.querySelector(".striped-list__menu-search").focus();
		else menu.querySelector(".btn-close").focus({ preventScroll: true });
	}

	/** At the right-click point or under the header button, kept on screen; above when there is no room below. */
	placeMenu(point = null) {
		const { menu, anchor } = this.menuState;
		const r = point ? { left: point.x, top: point.y, bottom: point.y } : anchor.getBoundingClientRect();
		const margin = 8;
		const left = Math.min(Math.max(margin, r.left), window.innerWidth - menu.offsetWidth - margin);
		const below = r.bottom + 4 + menu.offsetHeight <= window.innerHeight - margin;
		menu.style.left = left + "px";
		menu.style.top = (below ? r.bottom + 4 : Math.max(margin, r.top - menu.offsetHeight - 4)) + "px";
	}

	/** The parts of the open menu that change: the sort buttons and the tick list (the search box is left alone while typing). */
	renderMenu() {
		const { index: i, menu } = this.menuState;
		const f = this.filterOf(i);
		const numeric = this.isNumeric(i);
		const dir = this.sortState && this.sortState.index === i ? this.sortState.dir : 0;
		const sortBtn = (d, label, iconName) => html`<button type="button" class=${classMap({ btn: true, "btn-sm": true, "btn-primary": dir === d, "btn-outline-secondary": dir !== d })}
			aria-pressed=${String(dir === d)} @click=${() => this.setSort(i, d)}>${icon(iconName)}<span>${label}</span></button>`;
		render(html`${sortBtn(1, numeric ? "1 → 9" : "A → Z", numeric ? "sort-numeric-down" : "sort-alpha-down")}
			${sortBtn(-1, numeric ? "9 → 1" : "Z → A", numeric ? "sort-numeric-up-alt" : "sort-alpha-up-alt")}`, menu.querySelector(".striped-list__menu-sort"));

		const all = this.distinctValues(i);
		const q = f.text.trim().toLowerCase();
		const listed = q ? all.filter((d) => d.value.toLowerCase().includes(q)) : all;
		const values = menu.querySelector(".striped-list__menu-values");
		if (all.length <= 1) return render(nothing, values);
		if (all.length > MAX_VALUES) return render(html`<p class="small text-body-secondary mb-0">${all.length} different values: use the search above.</p>`, values);
		// One toggle: select everything listed, or (when it all is already) deselect it.
		const allTicked = listed.length > 0 && listed.every((d) => !f.excluded.has(d.value));
		const toggleAll = () => { listed.forEach((d) => (allTicked ? f.excluded.add(d.value) : f.excluded.delete(d.value))); this.changed(); };
		const kept = all.filter((d) => !f.excluded.has(d.value)).length;
		render(html`
			<div class="striped-list__menu-tools">
				<button type="button" class="btn btn-link btn-sm p-0" ?disabled=${!listed.length} @click=${toggleAll}>${allTicked ? (q ? "Deselect matches" : "Deselect all") : (q ? "Select matches" : "Select all")}</button>
				<span class="striped-list__menu-kept">${kept} of ${all.length}</span>
			</div>
			<div class="striped-list__menu-list">
				${listed.length ? listed.map((d) => html`<label class="striped-list__value">
					<input type="checkbox" class="form-check-input mt-0" .checked=${!f.excluded.has(d.value)}
						@change=${(e) => { e.target.checked ? f.excluded.delete(d.value) : f.excluded.add(d.value); this.changed(); }} />
					<span class="text-truncate">${d.value || "(empty)"}</span><span class="striped-list__value-count">${d.count}</span>
				</label>`) : html`<p class="small text-body-secondary mb-0">No values match.</p>`}
			</div>`, values);
	}

	closeMenu(returnFocus = false) {
		const state = this.menuState;
		if (!state) return;
		this.menuState = null;
		state.cleanup?.();
		state.menu.remove();
		state.backdrop?.remove();
		state.trigger.setAttribute("aria-expanded", "false");
		if (returnFocus && state.anchor.isConnected) state.anchor.focus({ preventScroll: true });
	}

	// ---------------------------------------------------------------- wiring

	setup() {
		let btn = this.querySelector(":scope > .striped-list__toggle");
		if (!btn) {
			btn = document.createElement("button");
			btn.type = "button";
			btn.className = "striped-list__toggle";
			this.append(btn);
		}
		this.toggleBtn = btn;
		const list = this.list;
		if (list) {
			if (!list.id) list.id = "striped-list-" + Math.random().toString(36).slice(2, 9);
			btn.setAttribute("aria-controls", list.id);
		}
		this.listen(btn, "click", () => this.toggle());

		// Column tools: the filter bar above the table, the "nothing matches" note under it, and the header buttons.
		if (this.sortable && this.table) {
			const box = this.box;
			this.filterBar = document.createElement("div");
			this.filterBar.className = "striped-list__filters";
			this.filterBar.setAttribute("role", "status");
			this.filterBar.hidden = true;
			this.emptyNote = document.createElement("div");
			this.emptyNote.className = "striped-list__empty";
			this.emptyNote.hidden = true;
			this.insertBefore(this.filterBar, box);
			box.after(this.emptyNote);
			// A header's sort button or its filter (funnel) button.
			const headAt = (e) => {
				const head = e.target.closest(".striped-list__sort, .striped-list__filter");
				return head && this.table.tHead?.contains(head) ? head : null;
			};
			let suppressUntil = 0; // a time window, not a flag: some browsers send no click at all after a long press
			let timer = null;
			let start = null;

			// Click / tap: the header text sorts, the funnel opens (or closes) the menu. The click that ends a long press is swallowed.
			this.listen(this.table, "click", (e) => {
				const head = headAt(e);
				if (!head) return;
				if (Date.now() < suppressUntil) { e.preventDefault(); return; }
				const i = Number(head.dataset.column);
				if (head.classList.contains("striped-list__filter")) {
					if (this.menuState && this.menuState.index === i) this.closeMenu(true);
					else this.openMenu(i, head);
					return;
				}
				this.cycleSort(i);
			});
			// Right-click, the context-menu key / Shift+F10, and Android's own long-press event: the menu.
			this.listen(this.table, "contextmenu", (e) => {
				const head = headAt(e);
				if (!head) return;
				e.preventDefault();
				const fromPointer = e.button === 2 || e.clientX || e.clientY;
				this.openMenu(Number(head.dataset.column), head, fromPointer ? { x: e.clientX, y: e.clientY } : null);
			});
			// Long press on a touch screen (iOS has no contextmenu event for it); moving the finger is a scroll and cancels it.
			this.listen(this.table, "pointerdown", (e) => {
				const head = headAt(e);
				clearTimeout(timer);
				if (!head || e.pointerType !== "touch") return;
				start = { x: e.clientX, y: e.clientY };
				timer = setTimeout(() => {
					suppressUntil = Date.now() + 800;
					navigator.vibrate?.(10);
					this.openMenu(Number(head.dataset.column), head);
				}, LONG_PRESS_MS);
			});
			this.listen(this.table, "pointermove", (e) => {
				if (start && Math.hypot(e.clientX - start.x, e.clientY - start.y) > 10) clearTimeout(timer);
			});
			["pointerup", "pointercancel"].forEach((type) => this.listen(this.table, type, () => { clearTimeout(timer); start = null; }));
			this.addCleanup(() => clearTimeout(timer));
		}

		// A live list re-renders its rows: count (and sort / filter) them again, once per batch of changes.
		let queued = false;
		const observer = new MutationObserver(() => {
			if (queued) return;
			queued = true;
			queueMicrotask(() => { queued = false; this.apply(); });
		});
		if (list) observer.observe(list, { childList: true, subtree: true, attributes: true, attributeFilter: ["hidden", "class"] });
		this.apply();

		// Sticky header: re-check when the table, its wrapper or the filter bar changes size (a rotated phone, a filter chip added).
		// The update changes classes and sizes of the very elements being observed, so it runs in the next frame: doing it inside the
		// observer callback ends in "ResizeObserver loop completed with undelivered notifications" on narrow screens.
		let resize = null;
		let resizeFrame = 0;
		if (this.table && typeof ResizeObserver === "function") {
			resize = new ResizeObserver(() => {
				if (resizeFrame) return;
				resizeFrame = requestAnimationFrame(() => { resizeFrame = 0; this.updateSticky(); });
			});
			[this.box, this.table, this.filterBar].filter(Boolean).forEach((el) => resize.observe(el));
		}
		this.updateSticky();
		let scrollFrame = 0;
		const onScroll = () => {
			if (scrollFrame || !this.classList.contains("is-scroll-x")) return;
			scrollFrame = requestAnimationFrame(() => { scrollFrame = 0; this.updateHeaderShift(); });
		};
		window.addEventListener("scroll", onScroll, { passive: true });

		return () => {
			window.removeEventListener("scroll", onScroll);
			cancelAnimationFrame(scrollFrame);
			this.style.removeProperty("--striped-list-header-shift");
			observer.disconnect();
			resize?.disconnect();
			cancelAnimationFrame(resizeFrame);
			this.classList.remove("is-scroll-x");
			this.style.removeProperty("--striped-list-bar-height");
			this.closeMenu();
			if (this.animation) { this.animation.onfinish = null; this.animation.cancel(); this.animation = null; }
			this.maskAnimation?.cancel();
			this.closing = false;
			this.classList.remove("is-animating", "is-collapsed", "is-filtered");
			if (this.box) this.box.style.overflow = "";
			this.allRows().forEach((row) => row.classList.remove(EXTRA, FILTERED, ALT));
			// Header buttons back to plain header text.
			this.headerCells().forEach((th) => {
				const head = th.querySelector(":scope > .striped-list__head");
				if (!head) return;
				const label = head.querySelector(".striped-list__sort-label");
				th.append(...(label ? label.childNodes : []));
				head.remove();
				th.classList.remove("striped-list__th");
				th.removeAttribute("aria-sort");
			});
			this.filterBar?.remove();
			this.emptyNote?.remove();
			this.filterBar = this.emptyNote = null;
			btn.remove();
			this.toggleBtn = null;
		};
	}
}

defineElement("sel-striped-list", StripedList);
