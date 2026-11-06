// English and Dutch. The choice is remembered in this browser (localStorage "lang"); without one, a browser set to Dutch gets Dutch.
// Markup is translated by attribute: data-i18n (the text), data-i18n-placeholder, data-i18n-aria-label and data-i18n-title, applied by
// applyI18n() on every page load and soft navigation (js/app.js). Scripts use t(key, { name: value }) for "{name}" placeholders.
// The texts are in js/i18n-dict.js; tests/i18n.test.js checks that every key the pages use exists in both languages.
import { DICT } from "./i18n-dict.js";

export const LANGS = ["en", "nl"];
const KEY = "lang";

export function getLang() {
  try {
    const stored = localStorage.getItem(KEY);
    if (LANGS.includes(stored)) return stored;
  } catch { /* storage can be blocked: fall back to the browser's language */ }
  const browser = typeof navigator !== "undefined" ? navigator.language || "" : "";
  return /^nl\b/i.test(browser) ? "nl" : "en";
}

export function setLang(lang) {
  if (!LANGS.includes(lang)) return;
  try { localStorage.setItem(KEY, lang); } catch { /* the choice still applies to this visit */ }
  document.documentElement.lang = lang;
  applyI18n();
  document.dispatchEvent(new CustomEvent("app:lang", { detail: { lang } }));
}

/** The text for key in the current language (English if Dutch has none, the key itself if neither has it: visible, so it gets fixed). */
export function t(key, vars = {}, lang = getLang()) {
  const text = DICT[lang]?.[key] ?? DICT.en[key] ?? key;
  return text.replace(/\{(\w+)\}/g, (match, name) => (name in vars ? String(vars[name]) : match));
}

/** Translates the marked elements under root. Text goes in as text (never HTML), so a translation cannot inject markup. */
export function applyI18n(root = document) {
  document.documentElement.lang = getLang();
  for (const el of root.querySelectorAll("[data-i18n]")) el.textContent = t(el.dataset.i18n);
  for (const el of root.querySelectorAll("[data-i18n-placeholder]")) el.placeholder = t(el.dataset.i18nPlaceholder);
  for (const el of root.querySelectorAll("[data-i18n-aria-label]")) el.setAttribute("aria-label", t(el.dataset.i18nAriaLabel));
  for (const el of root.querySelectorAll("[data-i18n-title]")) el.title = t(el.dataset.i18nTitle);
}

/** A date "YYYY-MM-DD" as a readable day in the current language ("Thu 12 Nov"), with the year when it is not this year. */
export function formatDay(iso, { weekday = "short", lang = getLang() } = {}) {
  const [y, m, d] = String(iso).split("-").map(Number);
  if (!y || !m || !d) return String(iso);
  const date = new Date(y, m - 1, d);
  const sameYear = y === new Date().getFullYear();
  return date.toLocaleDateString(lang === "nl" ? "nl-NL" : "en-GB", { weekday, day: "numeric", month: "short", ...(sameYear ? {} : { year: "numeric" }) });
}
