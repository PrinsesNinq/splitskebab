// Settings > Terms (admins only): the terms of use in English and Dutch, edited and saved as the next version (js/terms-store.js). Each
// section is written as "## Heading" with its text under it; a preview under each language shows exactly what users will see. Saving
// asks for confirmation, because everyone (the admin too) then has to accept the new version before they can use the app again.
import { LANGS, TEXT_FIELDS, LIMITS, sectionsToText, textToSections, termsHtml, cleanTermsText } from "./terms.js";
import { loadTerms, saveTerms } from "./terms-store.js";

const esc = (text) => String(text).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const LANG_NAMES = { en: "English", nl: "Nederlands" };
const LABELS = {
  title: "Title",
  intro: "Introduction",
  sections: "Sections (a line starting with ## is a heading; the lines under it are its text)",
  accept: "Text of the box people tick to accept",
  showEmail: "Text of the switch \"show my email\"",
  showEmailHelp: "Help under that switch",
};
const day = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Sets up the tab for this admin (uid). The tab's elements are on settings.html; listeners live on them. */
export async function startTermsEditor(uid) {
  const $ = (sel) => document.querySelector(sel);
  const form = $("#terms-form");
  const problem = (err) => {
    console.error("Terms:", err?.code || err?.message || err);
    $("#terms-error").textContent = err?.code === "permission-denied"
      ? "Not saved: someone else saved a version in the meantime, or you are not an admin. Reload the page and try again."
      : `That did not work: ${err?.message || err}`;
    $("#terms-error").classList.remove("d-none");
  };
  let current;

  const field = (lang, key, value) => {
    const id = `terms-${lang}-${key}`;
    const big = key === "sections" || key === "intro";
    const control = big
      ? `<textarea class="form-control font-monospace small" id="${id}" data-lang="${lang}" data-key="${key}" rows="${key === "sections" ? 18 : 4}" maxlength="${key === "sections" ? LIMITS.sections * (LIMITS.body + LIMITS.heading) : LIMITS[key]}">${esc(value)}</textarea>`
      : `<input class="form-control" id="${id}" data-lang="${lang}" data-key="${key}" maxlength="${LIMITS[key]}" value="${esc(value)}">`;
    return `<div class="mb-2"><label class="form-label small" for="${id}">${esc(LABELS[key])}</label>${control}</div>`;
  };

  /** What the form says now, per language, in the stored shape ({ title, intro, sections: [{ h, b }], ... }). */
  const read = (lang) => {
    const raw = {};
    for (const el of form.querySelectorAll(`[data-lang="${lang}"][data-key]`)) {
      raw[el.dataset.key] = el.dataset.key === "sections" ? textToSections(el.value) : el.value.trim();
    }
    return raw;
  };

  const preview = (lang) => {
    const next = { version: current.version + 1, updatedAt: null, en: cleanTermsText(read("en"), "en"), nl: cleanTermsText(read("nl"), "nl") };
    form.querySelector(`[data-preview="${lang}"]`).innerHTML = termsHtml(next, lang, esc);
  };

  function render() {
    $("#terms-status").textContent = `Version ${current.version} is in force${current.updatedAt ? ` since ${day(current.updatedAt)}` : " (the built-in text)"}. Saving makes version ${current.version + 1}.`;
    $("#terms-langs").innerHTML = LANGS.map((lang) => {
      const text = current[lang];
      return `<fieldset class="col-12 col-xl-6">
        <legend class="h6">${LANG_NAMES[lang]}</legend>
        ${field(lang, "title", text.title)}
        ${field(lang, "intro", text.intro)}
        ${field(lang, "sections", sectionsToText(text.sections))}
        ${["accept", "showEmail", "showEmailHelp"].map((k) => field(lang, k, text[k])).join("")}
        <details class="mt-2"><summary class="small">Preview</summary><div class="card card-body small mt-2 terms-box" data-preview="${lang}"></div></details>
      </fieldset>`;
    }).join("");
    LANGS.forEach(preview);
    form.hidden = false;
  }

  async function load() {
    current = await loadTerms({ fresh: true });
    render();
  }

  form.addEventListener("input", (event) => { const lang = event.target.dataset?.lang; if (lang) preview(lang); });
  $("#terms-reset").addEventListener("click", () => render());
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    $("#terms-error").classList.add("d-none");
    const next = {};
    for (const lang of LANGS) {
      const raw = read(lang);
      if (!raw.accept || !raw.title || !raw.sections.length) {
        problem({ message: `${LANG_NAMES[lang]}: a title, at least one section and the accept text are needed.` });
        return;
      }
      next[lang] = Object.fromEntries([...TEXT_FIELDS.map((k) => [k, raw[k] || ""]), ["sections", raw.sections]]);
    }
    if (!window.confirm(`Save as version ${current.version + 1}? Everyone, you included, must accept the new terms before they can use Splitskebab again.`)) return;
    $("#terms-save").disabled = true;
    try {
      const version = await saveTerms(current, next, uid);
      $("#terms-status").textContent = `Saved as version ${version}.`;
      // I am asked to accept too: the app's account check sees the new version at the next start.
      window.alert(`Version ${version} is in force. Everyone is asked to accept it when they next open the app (you too, after a reload).`);
      await load();
    } catch (err) {
      problem(err);
    } finally {
      $("#terms-save").disabled = false;
    }
  });

  await load().catch(problem);
}
