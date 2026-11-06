/* Page transitions - Aperam Theme v0.3.4 */
/* Page transitions. The animation itself is CSS (see the CSS tab): a fade-and-rise between pages with the navbar (.page-transition-static)
 * standing still, through the browser's View Transitions API.
 *
 * Soft navigation: <sel-soft-nav> (put it once on every page, outside the content) turns clicks on links to other pages of the site into a
 * swap of just the page content: the page is fetched, its content area (content="#page-content" by default) replaces the current one inside
 * a view transition, and the URL, title and <body> attributes follow. The navbar and everything else outside the content stay as they are:
 * no blank flash, no reload of the navbar, the theme or the scripts already running. Back / forward work. If anything is off (another
 * site, a file, a page without that content area, a failed request) it falls back to a normal page load (a redirect too).
 *   - An inline <script type="module"> runs, but its end cannot be waited for (the browser gives no event for it), so soft-nav:load may fire
 *     before it has finished: put module code in a file (src="..."), whose load is awaited, and keep inline scripts classic.
 *   - Scripts inside the content area run again after each swap (a module script by src is re-imported with a fresh query, so its top
 *     level runs again against the new markup; what it imports stays loaded once). Put page-specific scripts there.
 *   - Elements outside the content with data-soft-nav-replace and an id (e.g. the navbar brand, which is a back link on a sub page) are
 *     replaced by the element with the same id on the next page.
 *   - Stylesheets the next page has and this one doesn't are added (and loaded) before the swap.
 *   - Leaving a page: functions passed to onPageLeave(fn) run (stop timers, listeners or live subscriptions of that page); open Bootstrap
 *     modals, offcanvas and dropdowns are closed.
 *   - Opt out per link with data-soft-nav="off" (on the link or a parent), per page with exclude="login.html, report.pdf".
 *   - Events on document: "soft-nav:start" { url } (cancelable: cancel it to load that page normally) and "soft-nav:load" { url } once the
 *     new content is in and its scripts have run (re-run your own per-page setup there).
 * initSoftNav(options) is the same without the element; it returns a function that switches it off again. Besides content and exclude it
 * takes load(url, signal) (returns the page's HTML, or null for "load it normally"; default: fetch), url (the page shown now; default:
 * location), history (false: leave the browser history and the address bar alone) and fallback(url) (instead of a normal page load):
 * that is how the library's own preview runs the starter's soft navigation without a server. */
import { ThemeElement, defineElement } from "../theme-lit.js";

const leaveCallbacks = new Set();
const SCRIPT_WAIT_MS = 10000; // how long the next script waits for an external script of the new page

/** Runs fn when the current page is left through a soft navigation (not on a normal page load: the browser cleans up then). */
export function onPageLeave(fn) {
	if (typeof fn === "function") leaveCallbacks.add(fn);
	return () => leaveCallbacks.delete(fn);
}

function runLeaveCallbacks() {
	const fns = Array.from(leaveCallbacks);
	leaveCallbacks.clear();
	for (const fn of fns) {
		try { fn(); } catch (err) { console.error("[soft-nav] a page leave callback failed:", err); }
	}
}

const NOT_A_PAGE = /\.(?!html?$)[a-z0-9]{1,5}$/i; // a path ending in a file extension other than .html / .htm (a pdf, a zip, an image)

let active = null; // only one soft navigation per document

/** The page's HTML by a plain request; null when it isn't a page this can swap (an error, not HTML): then it is loaded normally. */
async function fetchPage(url, signal) {
	const res = await fetch(url.pathname + url.search, { signal, headers: { Accept: "text/html" } });
	if (!res.ok || !(res.headers.get("content-type") || "").includes("text/html")) return null;
	// A redirect (to a login page, a moved page) means the content is not the page that was asked for, and relative links and the address bar
	// would follow the wrong URL: load it normally and let the browser handle the redirect.
	if (res.redirected) {
		const final = new URL(res.url);
		if (final.origin !== location.origin || final.pathname + final.search !== url.pathname + url.search) return null;
	}
	return res.text();
}

/**
 * Switches soft navigation on. Options: { content: "#page-content", exclude: ["login.html"], load, url, history: true, fallback }
 * (see the top of this file). Returns a function that switches it off.
 */
export function initSoftNav({ content = "#page-content", exclude = [], load = fetchPage, url: startUrl = null, history: useHistory = true, fallback = null } = {}) {
	active?.();
	const excluded = exclude.map((e) => String(e).trim()).filter(Boolean);
	let controller = null;
	let current = new URL(startUrl || location.href); // the page whose content is on screen
	const key = (u) => u.pathname + u.search;

	const isExcluded = (url) => excluded.some((e) => url.pathname === e || url.pathname.endsWith("/" + e.replace(/^\//, "")));
	const canSoftNav = (url) => url.origin === current.origin && !NOT_A_PAGE.test(url.pathname) && !isExcluded(url);

	function hardLoad(url) {
		if (fallback) fallback(url);
		else location.assign(url.href);
	}

	// Remember where the reader was on this page, so back / forward return to the same spot.
	function saveScroll() {
		if (useHistory) history.replaceState({ ...(history.state || {}), softNav: true, scrollY: window.scrollY }, "");
	}

	function closeBootstrapLeftovers() {
		const bs = globalThis.bootstrap;
		document.querySelectorAll('[data-bs-toggle="dropdown"][aria-expanded="true"]').forEach((t) => bs?.Dropdown.getInstance(t)?.hide());
		document.querySelectorAll(".modal-backdrop, .offcanvas-backdrop").forEach((el) => el.remove());
		document.body.classList.remove("modal-open");
		document.body.style.removeProperty("overflow");
		document.body.style.removeProperty("padding-right");
	}

	/** Adds the next page's stylesheets that this page doesn't have yet, and waits (briefly) until they have loaded. */
	function addStylesheets(nextDoc, pageUrl) {
		const have = new Set(Array.from(document.querySelectorAll('link[rel="stylesheet"]'), (l) => l.href));
		const missing = Array.from(nextDoc.querySelectorAll('head link[rel="stylesheet"]')).filter((l) => !have.has(new URL(l.getAttribute("href"), pageUrl).href));
		return Promise.all(missing.map((l) => new Promise((resolve) => {
			const link = document.createElement("link");
			// every attribute of the source link (integrity, crossorigin, media, referrerpolicy, ...) comes along; only the address is made absolute
			Array.from(l.attributes).forEach((a) => link.setAttribute(a.name, a.value));
			link.rel = "stylesheet";
			link.href = new URL(l.getAttribute("href"), pageUrl).href;
			link.onload = link.onerror = resolve;
			setTimeout(resolve, 3000);
			document.head.append(link);
		})));
	}

	/** The <body> attributes of the next page (class, data-*), so page-level hooks follow the page. */
	function syncBodyAttributes(nextBody) {
		const keep = (name) => name === "class" || name.startsWith("data-");
		Array.from(document.body.attributes).filter((a) => keep(a.name) && !nextBody.hasAttribute(a.name)).forEach((a) => document.body.removeAttribute(a.name));
		Array.from(nextBody.attributes).filter((a) => keep(a.name)).forEach((a) => document.body.setAttribute(a.name, a.value));
	}

	/** Scripts in the new content: re-created so they run (module files re-imported with a fresh query, so their top level runs again). */
	async function runScripts(container, pageUrl, signal) {
		for (const old of Array.from(container.querySelectorAll("script"))) {
			if (signal && signal.aborted) return; // a newer navigation took over: this page's remaining scripts must not run
			const script = document.createElement("script");
			Array.from(old.attributes).forEach((a) => script.setAttribute(a.name, a.value));
			if (old.getAttribute("src")) {
				const src = new URL(old.getAttribute("src"), pageUrl);
				if (old.type === "module") src.searchParams.set("soft-nav", String(Date.now()));
				script.src = src.href;
				await new Promise((resolve) => { script.onload = script.onerror = resolve; setTimeout(resolve, SCRIPT_WAIT_MS); old.replaceWith(script); }); // a stalled script is not waited for for ever
			} else {
				script.textContent = old.textContent;
				old.replaceWith(script);
			}
		}
	}

	async function go(url, { push }) {
		controller?.abort(); // a newer click wins
		const own = (controller = new AbortController());
		try {
			const html = await load(url, own.signal);
			if (own.signal.aborted) return;
			if (html == null) return hardLoad(url);
			const nextDoc = new DOMParser().parseFromString(html, "text/html");
			const nextContent = nextDoc.querySelector(content);
			const shownContent = document.querySelector(content);
			if (!nextContent || !shownContent) return hardLoad(url);
			if (own.signal.aborted) return;
			const start = new CustomEvent("soft-nav:start", { cancelable: true, detail: { url: url.href } });
			if (!document.dispatchEvent(start)) return hardLoad(url);

			const linkBase = url.origin === location.origin ? url : document.baseURI; // relative links of the next page
			await addStylesheets(nextDoc, linkBase);
			if (own.signal.aborted) return;
			runLeaveCallbacks();
			closeBootstrapLeftovers();
			if (push) saveScroll();

			const incoming = document.importNode(nextContent, true);
			const apply = () => {
				shownContent.replaceWith(incoming);
				document.title = nextDoc.title;
				syncBodyAttributes(nextDoc.body);
				document.querySelectorAll("[data-soft-nav-replace][id]").forEach((el) => {
					const next = nextDoc.getElementById(el.id);
					if (next) el.replaceWith(document.importNode(next, true));
				});
				if (push && useHistory) history.pushState({ softNav: true, scrollY: 0 }, "", url.pathname + url.search + url.hash);
				current = url;
				// Where to look: the #target of the link, back to where the reader was (back / forward), or the top.
				const target = url.hash && document.getElementById(decodeURIComponent(url.hash.slice(1)));
				if (target) target.scrollIntoView();
				else window.scrollTo({ top: push || !useHistory ? 0 : history.state?.scrollY || 0, behavior: "instant" });
			};
			if (document.startViewTransition) await document.startViewTransition(apply).updateCallbackDone;
			else apply();

			// For keyboard and screen reader users: focus moves to the new page (its heading, else the content), without scrolling.
			const focusTarget = incoming.querySelector("h1, [autofocus]") || incoming;
			if (!focusTarget.hasAttribute("tabindex") && !focusTarget.matches("a[href], button, input, select, textarea")) focusTarget.setAttribute("tabindex", "-1");
			focusTarget.focus({ preventScroll: true });

			await runScripts(incoming, linkBase, own.signal);
			if (own.signal.aborted) return; // superseded while its scripts ran: the newer navigation reports its own soft-nav:load
			document.dispatchEvent(new CustomEvent("soft-nav:load", { detail: { url: url.href } }));
		} catch (err) {
			if (err.name === "AbortError") return;
			console.error("[soft-nav] falling back to a normal page load:", err);
			hardLoad(url);
		}
	}

	const onClick = (e) => {
		if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
		const link = e.target.closest("a[href]");
		if (!link || link.closest('[data-soft-nav="off"]') || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
		let url;
		try { url = new URL(link.getAttribute("href"), current); } catch { return; }
		if (!canSoftNav(url)) return;
		const samePage = key(url) === key(current);
		if (samePage && url.hash) return; // a #link on this page: the browser scrolls to it
		e.preventDefault();
		if (samePage) return; // already here
		go(url, { push: true });
	};

	const onPopState = () => {
		const url = new URL(location.href);
		if (key(url) === key(current)) return; // only the #hash changed
		if (!canSoftNav(url)) return hardLoad(url);
		go(url, { push: false });
	};

	document.addEventListener("click", onClick);
	if (useHistory) {
		// This entry gets a state too, so coming back to it is a soft navigation as well.
		history.replaceState({ ...(history.state || {}), softNav: true, scrollY: window.scrollY }, "");
		if ("scrollRestoration" in history) history.scrollRestoration = "manual";
		window.addEventListener("popstate", onPopState);
	}

	const dispose = () => {
		controller?.abort();
		document.removeEventListener("click", onClick);
		if (useHistory) {
			window.removeEventListener("popstate", onPopState);
			if ("scrollRestoration" in history) history.scrollRestoration = "auto";
		}
		if (active === dispose) active = null;
	};
	active = dispose;
	return dispose;
}

export class SoftNav extends ThemeElement {
	static properties = {
		content: { type: String },
		exclude: { type: String },
	};

	constructor() {
		super();
		this.content = "#page-content";
		this.exclude = "";
	}

	setup() {
		return initSoftNav({ content: this.content, exclude: String(this.exclude || "").split(",") });
	}
}

defineElement("sel-soft-nav", SoftNav);

