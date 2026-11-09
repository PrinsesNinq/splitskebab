// terms.html: the terms of use and privacy statement in the app's language, with a switch between English and Dutch.
import { TERMS, termsHtml } from "./terms.js";
import { getLang } from "./i18n.js";
import { esc } from "./ui.js";

function show(lang) {
  document.documentElement.lang = lang;
  document.querySelector("#terms-title").textContent = TERMS[lang].title;
  document.querySelector("#terms-body").innerHTML = termsHtml(lang, esc);
  for (const b of document.querySelectorAll("[data-terms-lang]")) b.classList.toggle("active", b.dataset.termsLang === lang);
}

document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-terms-lang]");
  if (button) show(button.dataset.termsLang);
});
show(getLang() === "nl" ? "nl" : "en");
