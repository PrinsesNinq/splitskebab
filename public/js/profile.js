// My profile: the allergies everyone who eats with me is warned about, my payment link (for the payment requests I send) and the
// language. Name and photo come from the Google account (js/auth.js writes them at every sign-in).
import { whenUser, esc, onLeave, attempt, avatarHtml } from "./ui.js";
import { people, person, saveMyProfile, safeLink } from "./store.js";
import { ALLERGENS } from "./allergens.js";
import { getLang, t } from "./i18n.js";

const user = await whenUser();
const me = user.email.toLowerCase();
const $ = (sel) => document.querySelector(sel);
let dirty = false; // the person changed something: a live update must not overwrite it
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

function renderGrid(selected) {
  const lang = getLang();
  $("#allergen-grid").innerHTML = ALLERGENS.map((a) => `
    <input type="checkbox" class="btn-check" id="al-${a.id}" value="${a.id}" ${selected.includes(a.id) ? "checked" : ""} autocomplete="off">
    <label class="btn btn-outline-danger allergen-toggle" for="al-${a.id}"><span class="allergen-toggle__icon" aria-hidden="true">${a.icon}</span>${esc(a[lang] || a.en)}</label>`).join("");
}

function render() {
  const p = person(me);
  $("#profile-avatar").innerHTML = avatarHtml({ ...p, name: p.name || user.displayName || me }, "avatar avatar-lg");
  $("#profile-name").textContent = p.name;
  $("#profile-email").textContent = me;
  if (dirty) return;
  renderGrid(p.allergies);
  $("#payment-link").value = p.paymentLink;
}

$("#profile-form").addEventListener("input", () => { dirty = true; });
$("#profile-form").addEventListener("change", () => { dirty = true; });

$("#profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = $("#payment-link").value.trim();
  const link = safeLink(raw);
  $("#payment-link").classList.toggle("is-invalid", Boolean(raw) && !link);
  if (raw && !link) return;
  $("#profile-save").disabled = true;
  const allergies = [...document.querySelectorAll("#allergen-grid input:checked")].map((x) => x.value);
  const ok = await attempt(async () => { await saveMyProfile(me, { allergies, paymentLink: link }); return true; }, t("common.saved"));
  $("#profile-save").disabled = false;
  if (ok) dirty = false;
});

stops.push(people.subscribe(() => render()));
render();
