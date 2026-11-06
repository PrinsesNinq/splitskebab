/* Chart.js loader - Aperam Theme v0.5.2 */
/* Chart.js loader: the one place the charts of the library get Chart.js from. A chart component imports ensureChartJs and waits for it before it
 * draws; it never adds its own <script> tag. Because every chart type shares this module, a page with a line graph, a bar chart and a donut
 * loads Chart.js ONCE, even when all of them connect at the same moment (each used to keep its own "loading" flag and inserted a script of
 * its own). A failed load is not remembered: the script tag is removed and the next call tries again, so a chart added later, or after the
 * network is back, still works. A load that takes longer than 20 seconds counts as failed.
 *
 * ensureChartJs() returns a promise that resolves when window.Chart exists (also when the host page loaded Chart.js itself) and rejects with
 * an Error that says what went wrong. CHART_JS_SRC is the pinned version; set CHART_JS_INTEGRITY ("sha384-...") to make the browser refuse a
 * file the CDN serves that is not byte for byte the one you checked. */

export const CHART_JS_SRC = "https://cdn.jsdelivr.net/npm/chart.js@4.4.7/dist/chart.umd.min.js";
export const CHART_JS_INTEGRITY = "";
const LOAD_TIMEOUT_MS = 20000;

let pending = null;

/** Resolves once window.Chart exists, loading the script at most once at a time; a failed load can be tried again. */
export function ensureChartJs() {
	if (typeof Chart !== "undefined") return Promise.resolve();
	if (pending) return pending;
	pending = new Promise((resolve, reject) => {
		const script = document.createElement("script");
		script.src = CHART_JS_SRC;
		script.async = true;
		script.dataset.selChartJs = "";
		if (CHART_JS_INTEGRITY) {
			script.integrity = CHART_JS_INTEGRITY;
			script.crossOrigin = "anonymous";
		}
		const fail = (message) => {
			clearTimeout(timer);
			script.remove();
			pending = null; // forget the failure: the next chart tries again
			reject(new Error(message));
		};
		const timer = setTimeout(() => fail("Chart.js did not load within " + LOAD_TIMEOUT_MS / 1000 + " seconds (" + CHART_JS_SRC + ")"), LOAD_TIMEOUT_MS);
		script.onload = () => {
			clearTimeout(timer);
			if (typeof Chart === "undefined") fail("Chart.js loaded from " + CHART_JS_SRC + " but did not define Chart");
			else resolve();
		};
		script.onerror = () => fail("Could not load Chart.js from " + CHART_JS_SRC);
		document.head.appendChild(script);
	});
	return pending;
}
