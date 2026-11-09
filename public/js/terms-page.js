// terms.html: the terms of use and privacy statement in force (js/terms-store.js; anyone may read them, also before signing in) in the
// app's language, with a switch between English and Dutch. Without a connection: the built-in version.
import { termsFrom, termsHtml } from "./terms.js";
import { getLang, formatDay } from "./i18n.js";
import { esc } from "./ui.js";

let terms = termsFrom(null);
try {
  const { loadTerms } = await import("./terms-store.js");
  terms = await loadTerms();
} catch (err) {
  console.warn("Terms not loaded, showing the built-in version:", err?.code || err?.message || err);
}

function show(lang) {
  document.documentElement.lang = lang;
  document.querySelector("#terms-title").textContent = terms[lang].title;
  document.querySelector("#terms-body").innerHTML = termsHtml(terms, lang, esc, (ms) => formatDay(new Date(ms).toISOString().slice(0, 10), { weekday: "long", lang }));
  for (const b of document.querySelectorAll("[data-terms-lang]")) b.classList.toggle("active", b.dataset.termsLang === lang);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-terms-lang]");
  if (button) show(button.dataset.termsLang);
});
show(getLang() === "nl" ? "nl" : "en");
