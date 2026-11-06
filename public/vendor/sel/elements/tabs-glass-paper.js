/* Tabs Glass Paper - Aperam Theme v0.5.2 */
/* Paper tabs behaviour (the tabs themselves are plain Bootstrap tabs). Wrap the tab strip in <sel-paper-tabs>: it adds edge fades to a
 * strip that scrolls sideways, turns the mouse wheel into sideways scrolling, and keeps the selected tab in view.
 * wireScrollFade(el, options) is the same thing for any scrollable element you wire yourself; it returns a dispose function. */
import { ThemeElement, defineElement } from "../theme-lit.js";

/**
 * Marks a horizontally scrollable element with `paper-fade-start` / `paper-fade-end` while content is hidden on that side (the CSS
 * turns these into a fade). With `keepActiveVisible`, a newly shown Bootstrap tab is scrolled into view. Returns a cleanup function.
 */
export function wireScrollFade(el, { keepActiveVisible = false, wheel = true } = {}) {
	if (!el) return () => {};

	const update = () => {
		const max = el.scrollWidth - el.clientWidth;
		el.classList.toggle("paper-fade-start", el.scrollLeft > 1);
		el.classList.toggle("paper-fade-end", max > 1 && el.scrollLeft < max - 1);
	};

	const revealActive = () => {
		const active = el.querySelector(".active");
		if (!active) return;
		const margin = 48;
		const left = active.offsetLeft - margin;
		const right = active.offsetLeft + active.offsetWidth + margin;
		if (left < el.scrollLeft) el.scrollTo({ left, behavior: "smooth" });
		else if (right > el.scrollLeft + el.clientWidth) el.scrollTo({ left: right - el.clientWidth, behavior: "smooth" });
	};

	el.addEventListener("scroll", update, { passive: true });

	// Mouse wheel over the strip scrolls it sideways; at either end the page scrolls as usual.
	const onWheel = (e) => {
		if (el.scrollWidth <= el.clientWidth || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;
		const next = Math.max(0, Math.min(el.scrollWidth - el.clientWidth, el.scrollLeft + e.deltaY));
		if (next === el.scrollLeft) return;
		e.preventDefault();
		el.scrollLeft = next;
	};
	if (wheel) el.addEventListener("wheel", onWheel, { passive: false });
	if (keepActiveVisible) el.addEventListener("shown.bs.tab", revealActive);

	// Re-checks when the strip or its tabs change size (window resize, late font load).
	let observer = null;
	if (typeof ResizeObserver !== "undefined") {
		observer = new ResizeObserver(update);
		observer.observe(el);
		Array.from(el.children).forEach((child) => observer.observe(child));
	}
	window.addEventListener("resize", update);
	update();

	return () => {
		if (observer) observer.disconnect();
		window.removeEventListener("resize", update);
		el.removeEventListener("scroll", update);
		el.removeEventListener("wheel", onWheel);
		el.removeEventListener("shown.bs.tab", revealActive);
		el.classList.remove("paper-fade-start", "paper-fade-end");
	};
}

export class PaperTabs extends ThemeElement {
	setup() {
		return wireScrollFade(this.querySelector(".paper-tabs"), { keepActiveVisible: true });
	}
}

defineElement("sel-paper-tabs", PaperTabs);
