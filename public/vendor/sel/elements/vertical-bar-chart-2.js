/* Vertical Bar Chart - Aperam Theme v0.3.4 */
/* Vertical bar chart: <sel-vertical-bar-chart-2> draws a single-series
 * Chart.js bar chart (period axis along the bottom, currency-formatted
 * value up the side) onto its own authored, empty
 * <canvas data-vertical-bar-chart-2-canvas>, plus a "Colours" tab to pick
 * the bars' one shared colour (drawn into the authored, empty
 * [data-vertical-bar-chart-2-legend]). Points are authored as direct
 * <data value="…">period label</data> children, in document order — see
 * the HTML tab. Picking a colour writes it onto the element itself as an
 * inline --vertical-bar-chart-2-color custom property (the authored
 * markup stays the one source of truth) and updates the live chart
 * immediately.
 * Loads Chart.js itself from a pinned CDN version the first time an
 * instance connects (cached across instances — see ensureChartJs) so the
 * host page never has to remember its own <script> tag.
 * initVerticalBarChart2(el) is the same behaviour for markup you wire
 * yourself; it returns a dispose function that stops watching the theme
 * and destroys the chart (safe to call even if Chart.js was still
 * loading). Does nothing (and disposes cleanly) if the element has no
 * points yet. */
import { ThemeElement, defineElement, html } from "../theme-lit.js";
import { ensureChartJs } from "./chart-loader.js";

// Direct <data> children only (:scope >), in document order — this is a
// time series, so (unlike the bar/donut category charts) order is
// meaning and is never re-sorted.
function readPoints(el) {
	return Array.from(el.querySelectorAll(":scope > data")).map((d) => ({ label: d.textContent.trim(), value: Number(d.value) }));
}

// Compact value formatting (€1.2M / €18K / €420) — ported from PRICE's fmtValue (dashboard.js). The "€" is the element's value-prefix
// attribute: unset it stays "€" (as before), value-prefix="" gives plain numbers (1.2M / 18K / 420) for counts, value-prefix="$" another currency.
function prefixOf(el) {
	return el.hasAttribute("value-prefix") ? el.getAttribute("value-prefix") : "€";
}

function fmtValue(v, prefix = "€") {
	if (v >= 1_000_000) return `${prefix}${(v / 1_000_000).toFixed(1)}M`;
	if (v >= 1_000) return `${prefix}${(v / 1_000).toFixed(0)}K`;
	return `${prefix}${Math.round(v).toLocaleString()}`;
}

function cssVar(name, fallback) {
	const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
	return v || fallback;
}

// An instance-level override (inline style="--vertical-bar-chart-2-color: …")
// is read off the ELEMENT's computed style, not document.documentElement,
// or it would never be seen.
function cssVarOn(el, name, fallback) {
	const v = getComputedStyle(el).getPropertyValue(name).trim();
	return v || fallback;
}

function barColor(el) {
	return cssVarOn(el, "--vertical-bar-chart-2-color", "") || cssVar("--bs-secondary", "#6c757d");
}

// Normalises any valid CSS colour (a hex string already, or the rgb(...)
// a browser can hand back for some custom properties) to the lowercase
// #rrggbb an <input type="color"> requires — it silently ignores any value
// it doesn't recognise in that exact shape.
let hexCtx = null;
function toHexColor(cssColor) {
	if (/^#[0-9a-f]{6}$/i.test(cssColor)) return cssColor.toLowerCase();
	if (!hexCtx) hexCtx = document.createElement("canvas").getContext("2d");
	hexCtx.fillStyle = "#000000";
	hexCtx.fillStyle = cssColor;
	return hexCtx.fillStyle;
}

export function initVerticalBarChart2(el) {
	const canvas = el.querySelector("[data-vertical-bar-chart-2-canvas]");
	const points = canvas ? readPoints(el) : [];

	let chart = null;
	let disposed = false;
	const observer = new MutationObserver(() => {
		if (!chart) return;
		const text = cssVar("--bs-body-color", "#212529");
		const grid = cssVar("--bs-border-color", "#dee2e6");
		chart.options.scales.x.ticks.color = text;
		chart.options.scales.y.ticks.color = text;
		chart.options.scales.y.grid.color = grid;
		chart.update();
	});

	if (canvas && points.length > 0) {
		ensureChartJs().then(() => {
			if (disposed) return; // element was removed before Chart.js finished loading

			chart = new Chart(canvas, {
				type: "bar",
				data: {
					labels: points.map((p) => p.label),
					datasets: [{ label: "Value", data: points.map((p) => p.value), backgroundColor: barColor(el) }]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						x: { ticks: { color: cssVar("--bs-body-color", "#212529") }, grid: { display: false } },
						y: { beginAtZero: true, ticks: { color: cssVar("--bs-body-color", "#212529"), callback: (v) => fmtValue(v, prefixOf(el)) }, grid: { color: cssVar("--bs-border-color", "#dee2e6") } }
					},
					plugins: {
						legend: { display: false },
						tooltip: { callbacks: { label: (ctx) => fmtValue(ctx.raw, prefixOf(el)) } }
					}
				}
			});
			el.__verticalBarChart2 = chart;
			// Chart.js reads CSS variables once, at creation — a later light/dark
			// flip (data-bs-theme on <html>) needs the chart told explicitly.
			observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });
		}).catch((err) => console.error("[vertical-bar-chart-2]", err.message));
	}

	const onTabClick = (e) => {
		const tabBtn = e.target.closest("[data-vertical-bar-chart-2-tab]");
		if (!tabBtn || !el.contains(tabBtn)) return;
		// Read the attributes directly, not through dataset: a digit after a hyphen is
		// not camel-cased (data-vertical-bar-chart-2-tab becomes the key "verticalBarChart-2Tab"),
		// so the camel-cased property is undefined and no pane would ever be hidden.
		const target = tabBtn.getAttribute("data-vertical-bar-chart-2-tab");
		el.querySelectorAll("[data-vertical-bar-chart-2-tab]").forEach((b) => {
			const active = b === tabBtn;
			b.classList.toggle("active", active);
			b.setAttribute("aria-selected", String(active));
		});
		el.querySelectorAll("[data-vertical-bar-chart-2-pane]").forEach((p) => {
			p.classList.toggle("d-none", p.getAttribute("data-vertical-bar-chart-2-pane") !== target);
		});
		if (target === "chart" && el.__verticalBarChart2) {
			// resize() alone can leave a stale colour on screen if it changed
			// while this pane was hidden (d-none) — Chart.js can't repaint a
			// zero-size canvas, and resize() only re-reads the canvas's new
			// dimensions, not necessarily the current dataset. update() forces
			// a full re-read of the live data object.
			el.__verticalBarChart2.resize();
			el.__verticalBarChart2.update();
		}
	};
	el.addEventListener("click", onTabClick);

	return () => {
		disposed = true;
		observer.disconnect();
		el.removeEventListener("click", onTabClick);
		if (chart) chart.destroy();
		delete el.__verticalBarChart2;
	};
}

export class VerticalBarChart2 extends ThemeElement {
	static renderTarget = "[data-vertical-bar-chart-2-legend]";

	/** A single colour-picker row for the one shared bar colour. */
	render() {
		return html`
			<div class="vertical-bar-chart-2-legend-row">
				<input type="color" class="vertical-bar-chart-2-color-input"
					.value=${toHexColor(barColor(this))}
					@input=${(e) => this._onColorChange(e.target.value)}
					aria-label="Bar colour">
				<span class="vertical-bar-chart-2-legend-label">Bar colour</span>
			</div>
		`;
	}

	/** Writes the picked colour onto the element itself (so it's authored
	 * from here on, same as setting the custom property by hand), pushes
	 * it into the live chart if one exists yet, and redraws the picker. */
	_onColorChange(hex) {
		this.style.setProperty("--vertical-bar-chart-2-color", hex);

		const chart = this.__verticalBarChart2;
		if (chart) {
			chart.data.datasets[0].backgroundColor = hex;
			chart.update();
		}

		this.requestUpdate();
		this.emit("verticalbarchart2:colorchange", { color: hex });
	}

	setup() {
		return initVerticalBarChart2(this);
	}
}

defineElement("sel-vertical-bar-chart-2", VerticalBarChart2);
