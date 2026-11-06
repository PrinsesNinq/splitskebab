/* Colour Themes - Aperam Theme v0.5.2 */
import { ThemeElement, defineElement } from "../theme-lit.js";


const DEFAULT_STORAGE_KEY = "sel-colour-theme";
const DEFAULT_DARK_KEY = "sel-dark-mode";

// Direct <data> children: value is the key saved to localStorage, data-label is the swatch's name, data-primary/
// data-secondary are the colours it applies. Omit both (typically on the first one) to mean "use the compiled theme's own
// colours" — picking it removes the override rather than reapplying a hard-coded copy of them, so it can never drift out
// of sync with whatever the theme actually ships.
function readThemes(el) {
	return Array.from(el.querySelectorAll(":scope > data")).map((d) => ({
		key: d.value,
		label: d.dataset.label || d.value,
		primary: d.dataset.primary || null,
		secondary: d.dataset.secondary || null
	}));
}

// --tertiary isn't authored per theme: every named theme gets one computed from its own primary/secondary instead, the
// same relationship the compiled theme's own --tertiary already has to its own primary/secondary — so a palette never
// needs a third colour picked by hand. A CSS colour-mix() *expression* is written (not a resolved value), so it keeps
// following primary/secondary if either is ever changed again later by something else.
function tertiaryExpression(primary, secondary) {
	return `color-mix(in srgb, color-mix(in srgb, ${primary} 50%, ${secondary}) 55%, white 45%)`;
}

/** Applies one theme (see readThemes()) to `root`: sets --primary/--secondary/--tertiary and data-sel-colour-theme (which
 *  switches on the page-background and glass-surface overrides in the CSS tab), or removes all of that for a theme with
 *  neither colour authored, so the compiled theme's own light and dark defaults are back exactly as shipped. The exact logic a page's own <head> script needs to run before
 *  first paint to avoid a flash of the wrong theme — see the copy-pasteable version in the comment at the end of this
 *  file. */
export function applyColourTheme(theme, root = document.documentElement) {
	if (theme && theme.primary && theme.secondary) {
		root.style.setProperty("--primary", theme.primary);
		root.style.setProperty("--secondary", theme.secondary);
		root.style.setProperty("--tertiary", tertiaryExpression(theme.primary, theme.secondary));
		// While this attribute is present the CSS tab re-derives the page background and the glass surfaces from the
		// picked colours (html[data-sel-colour-theme] rules). Without it the theme's own defaults apply, untouched.
		root.setAttribute("data-sel-colour-theme", theme.key || "custom");
	} else {
		root.style.removeProperty("--primary");
		root.style.removeProperty("--secondary");
		root.style.removeProperty("--tertiary");
		root.removeAttribute("data-sel-colour-theme");
	}
}

/** Applies dark mode by toggling data-bs-theme on `root` — every sel component (and the page background's own light/dark
 *  cross-fade) already reacts to this attribute; nothing else is needed. */
export function applyDarkMode(enabled, root = document.documentElement) {
	root.setAttribute("data-bs-theme", enabled ? "dark" : "light");
}

function readStorage(key, fallback) {
	try { return localStorage.getItem(key) ?? fallback; } catch (e) { return fallback; }
}

function writeStorage(key, value) {
	try { localStorage.setItem(key, value); } catch (e) { /* private browsing, storage full, etc. */ }
}

// The "use the compiled theme's own colours" swatch's own preview badge needs the theme's TRUE original --primary/
// --secondary — not getComputedStyle(document.documentElement), which would return whatever theme is CURRENTLY applied
// (including another one picked earlier), since that override lives as an inline style on the very same element the
// cascade resolves from. Reading the literal :root rule out of the stylesheet instead bypasses any inline override
// entirely, so this swatch's badge always shows the theme's real default, never "whichever theme happens to be active
// right now".
let compiledDefaultsCache = null;
function readCompiledDefault(varName) {
	if (!compiledDefaultsCache) {
		compiledDefaultsCache = {};
		for (const sheet of document.styleSheets) {
			let rules;
			try { rules = sheet.cssRules; } catch (e) { continue; } // cross-origin stylesheet — can't inspect it, skip
			for (const rule of rules) {
				if (rule.selectorText === ":root" && rule.style) {
					for (const name of ["--primary", "--secondary", "--tertiary"]) {
						const value = rule.style.getPropertyValue(name).trim();
						if (value) compiledDefaultsCache[name] = value;
					}
				}
			}
		}
	}
	return compiledDefaultsCache[varName] || "";
}

// Builds the swatch grid (and the dark-mode switch, if asked for) as plain DOM appended alongside the authored <data>
// children — not Lit's own render(), which would need a dedicated render target and (rendering into the element itself)
// would wipe out those <data> children the moment it ran, since they aren't part of the template.
export function initColourThemes(el) {
	const storageKey = el.getAttribute("storage-key") || DEFAULT_STORAGE_KEY;
	const darkStorageKey = el.getAttribute("dark-mode-storage-key") || DEFAULT_DARK_KEY;
	const showDarkMode = el.hasAttribute("dark-mode");

	const swatchList = document.createElement("div");
	swatchList.className = "colour-themes-swatches";
	el.appendChild(swatchList);

	let darkRow = null;
	let darkCheckbox = null;
	if (showDarkMode) {
		darkRow = document.createElement("label");
		darkRow.className = "colour-themes-dark-row";
		const text = document.createElement("span");
		text.textContent = "Dark mode";
		darkCheckbox = document.createElement("input");
		darkCheckbox.type = "checkbox";
		darkCheckbox.className = "form-check-input";
		darkCheckbox.setAttribute("role", "switch");
		darkRow.append(text, darkCheckbox);
		el.appendChild(darkRow);
	}

	function activeKey() {
		const themes = readThemes(el);
		return readStorage(storageKey, themes[0]?.key);
	}

	function renderSwatches() {
		const themes = readThemes(el);
		const active = activeKey();
		swatchList.innerHTML = "";
		themes.forEach((theme) => {
			const btn = document.createElement("button");
			btn.type = "button";
			btn.className = "colour-themes-swatch" + (theme.key === active ? " is-active" : "");
			btn.setAttribute("aria-pressed", String(theme.key === active));
			btn.dataset.themeKey = theme.key;

			const preview = document.createElement("span");
			preview.className = "colour-themes-swatch-preview";
			const previewPrimary = theme.primary || readCompiledDefault("--primary");
			const previewSecondary = theme.secondary || readCompiledDefault("--secondary");
			preview.style.background = `linear-gradient(135deg, ${previewPrimary} 50%, ${previewSecondary} 50%)`;

			const label = document.createElement("span");
			label.textContent = theme.label;

			btn.append(preview, label);
			btn.addEventListener("click", () => {
				applyColourTheme(theme);
				writeStorage(storageKey, theme.key);
				renderSwatches();
				el.dispatchEvent(new CustomEvent("colourthemes:change", {
					bubbles: true,
					composed: true,
					detail: { theme: theme.key, primary: theme.primary, secondary: theme.secondary }
				}));
			});
			swatchList.appendChild(btn);
		});
	}

	// Apply whatever was already saved — a page's own <head> script (see the file-end comment) should already have done
	// this before first paint; this just brings the swatch grid (and the toggle) into sync with it, and is also what
	// applies it at all on a page that skipped that step.
	const themes = readThemes(el);
	const saved = themes.find((t) => t.key === activeKey()) || themes[0];
	if (saved) applyColourTheme(saved);
	renderSwatches();

	let onDarkChange = null;
	if (darkCheckbox) {
		const enabled = readStorage(darkStorageKey, "0") === "1";
		darkCheckbox.checked = enabled;
		applyDarkMode(enabled);
		onDarkChange = () => {
			const next = darkCheckbox.checked;
			applyDarkMode(next);
			writeStorage(darkStorageKey, next ? "1" : "0");
			el.dispatchEvent(new CustomEvent("colourthemes:darkmodechange", {
				bubbles: true,
				composed: true,
				detail: { enabled: next }
			}));
		};
		darkCheckbox.addEventListener("change", onDarkChange);
	}

	// element.refresh(): re-reads the <data> children after one was added or removed at runtime (themes loaded from a
	// backend, an admin screen), re-applies the saved choice if it still exists (else the first theme) and redraws the swatches.
	el.refresh = () => {
		const list = readThemes(el);
		const current = list.find((t) => t.key === activeKey()) || list[0];
		if (current) applyColourTheme(current);
		renderSwatches();
	};

	return () => {
		swatchList.remove();
		if (darkRow) darkRow.remove();
		if (darkCheckbox && onDarkChange) darkCheckbox.removeEventListener("change", onDarkChange);
		delete el.refresh;
	};
}

export class ColourThemes extends ThemeElement {
	setup() {
		return initColourThemes(this);
	}
}

defineElement("sel-colour-themes", ColourThemes);


/* -----------------------------------------------------------------------------------------------------------------------
   Flash prevention: a lazily-upgrading custom element can't run before first paint, so a page that cares about not
   flashing the wrong theme/dark mode for an instant on load needs this logic to run synchronously in <head>, before any
   stylesheet. Copy this verbatim into a plain (non-module) <script>, and replace the `themes` map with your own palette
   if you changed it (keys must match each <data value="…">'s value; STORAGE_KEY/DARK_STORAGE_KEY must match
   storage-key/dark-mode-storage-key if you set either attribute on <sel-colour-themes>).

<script>
(function () {
  var STORAGE_KEY = "sel-colour-theme", DARK_STORAGE_KEY = "sel-dark-mode";
  var themes = { midnight: ["#1e3a5f", "#f0a500"], forest: ["#2d5a27", "#74c69d"], ocean: ["#0a4f6e", "#00b4d8"], crimson: ["#8b0000", "#ff6b35"], plum: ["#5b2a86", "#ffb703"], lagoon: ["#0f766e", "#f6c177"], graphite: ["#343a40", "#f4a261"] };
  try {
    var root = document.documentElement, picked = themes[localStorage.getItem(STORAGE_KEY)];
    root.setAttribute("data-bs-theme", localStorage.getItem(DARK_STORAGE_KEY) === "1" ? "dark" : "light");
    if (picked) {
      root.style.setProperty("--primary", picked[0]);
      root.style.setProperty("--secondary", picked[1]);
      root.style.setProperty("--tertiary", "color-mix(in srgb, color-mix(in srgb, " + picked[0] + " 50%, " + picked[1] + ") 55%, white 45%)");
      root.setAttribute("data-sel-colour-theme", localStorage.getItem(STORAGE_KEY));
    } else {
      root.style.removeProperty("--primary");
      root.style.removeProperty("--secondary");
      root.style.removeProperty("--tertiary");
      root.removeAttribute("data-sel-colour-theme");
    }
  } catch (e) {}
})();
</script>
----------------------------------------------------------------------------------------------------------------------- */
