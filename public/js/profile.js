// My profile: my name and photo as others see them, the allergies everyone who eats with me is warned about, my payment link (for the
// payment requests I send, with a "?" that explains how to get one) and the language. Google fills in the name and photo at the first
// sign-in (js/auth.js); after that they are mine to change here.
import "../vendor/sel/elements/colour-themes.js"; // the colour theme swatches (component "Colour themes")
import { whenUser, esc, onLeave, attempt, avatarHtml, toast } from "./ui.js";
import { people, person, saveMyProfile, saveMyIdentity, showMyEmail, safeLink } from "./store.js";
import { ALLERGENS } from "./allergens.js";
import { shrinkPhoto, safePhoto } from "./photo.js";
import { getLang, t } from "./i18n.js";
import { attachPushSettings } from "./push-settings.js";

const user = await whenUser();
const me = user.uid;
const $ = (sel) => document.querySelector(sel);
let dirty = false; // the person changed something: a live update must not overwrite it
let pendingPhoto; // undefined: unchanged; null: removed; a string: the new photo (saved with Save)
const stops = [];
onLeave(() => stops.forEach((stop) => stop()));

function renderGrid(selected) {
  const lang = getLang();
  $("#allergen-grid").innerHTML = ALLERGENS.map((a) => `
    <input type="checkbox" class="btn-check" id="al-${a.id}" value="${a.id}" ${selected.includes(a.id) ? "checked" : ""} autocomplete="off">
    <label class="btn btn-outline-danger allergen-toggle" for="al-${a.id}"><span class="allergen-toggle__icon" aria-hidden="true">${a.icon}</span>${esc(a[lang] || a.en)}</label>`).join("");
}

/** The photo shown now: the one just chosen (not saved yet) or the saved one. */
const shownPhoto = () => (pendingPhoto === undefined ? person(me).photoUrl : pendingPhoto);

function renderPhoto() {
  const p = person(me);
  const name = $("#display-name").value.trim() || p.name;
  $("#photo-preview").innerHTML = avatarHtml({ id: me, name, photoUrl: shownPhoto() }, "avatar avatar-lg");
  $("#photo-remove").hidden = !shownPhoto();
  $("#photo-google").hidden = !safePhoto(user.photoURL) || shownPhoto() === user.photoURL;
}

function render() {
  const p = person(me);
  $("#profile-avatar").innerHTML = avatarHtml({ ...p, name: p.name || user.displayName || me }, "avatar avatar-lg");
  $("#profile-name").textContent = p.name;
  $("#profile-email").textContent = user.email;
  $("#show-email").checked = Boolean(p.email);
  if (!dirty) {
    renderGrid(p.allergies);
    $("#payment-link").value = p.paymentLink;
    $("#display-name").value = p.name;
  }
  renderPhoto();
}

// Showing my email is saved at once, and is not part of the form's Save (so it does not mark the form as changed).
$("#show-email").addEventListener("change", async (e) => {
  e.stopPropagation();
  const on = e.target.checked;
  e.target.disabled = true;
  const ok = await attempt(async () => { await showMyEmail(me, on ? user.email : null); return true; }, t(on ? "profile.emailShown" : "profile.emailHidden"));
  if (!ok) e.target.checked = !on;
  e.target.disabled = false;
});

$("#show-email").addEventListener("input", (e) => e.stopPropagation());
$("#profile-form").addEventListener("input", () => { dirty = true; });
$("#profile-form").addEventListener("change", () => { dirty = true; });
$("#display-name").addEventListener("input", renderPhoto); // the initial in the preview follows the name

$("#photo-file").addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  e.target.value = ""; // choosing the same file again still fires change
  if (!file) return;
  try {
    pendingPhoto = await shrinkPhoto(file);
    dirty = true;
    renderPhoto();
    toast(t("profile.photoReady"), "info");
  } catch (err) {
    toast(err?.message === "too-large" ? t("profile.photoTooLarge") : t("profile.photoNotImage"), "warning");
  }
});
$("#photo-google").addEventListener("click", () => { pendingPhoto = user.photoURL; dirty = true; renderPhoto(); });
$("#photo-remove").addEventListener("click", () => { pendingPhoto = null; dirty = true; renderPhoto(); });

$("#profile-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const raw = $("#payment-link").value.trim();
  const link = safeLink(raw);
  $("#payment-link").classList.toggle("is-invalid", Boolean(raw) && !link);
  if (raw && !link) return;
  const displayName = $("#display-name").value.trim();
  $("#display-name").classList.toggle("is-invalid", !displayName);
  if (!displayName) return;
  $("#profile-save").disabled = true;
  const allergies = [...document.querySelectorAll("#allergen-grid input:checked")].map((x) => x.value);
  const ok = await attempt(async () => {
    await Promise.all([
      saveMyProfile(me, { allergies, paymentLink: link }),
      saveMyIdentity(me, { displayName, photoUrl: shownPhoto() }),
    ]);
    return true;
  }, t("common.saved"));
  $("#profile-save").disabled = false;
  if (ok) { dirty = false; pendingPhoto = undefined; }
});

// The theme names in the app's language: the component draws its swatches from the <data> labels (on every redraw), so both change.
for (const option of document.querySelectorAll("sel-colour-themes data")) {
  const name = t(`theme.${option.value}`);
  option.dataset.label = name;
  const label = document.querySelector(`.colour-themes-swatch[data-theme-key="${option.value}"] span:last-child`);
  if (label) label.textContent = name;
}

if (new URLSearchParams(location.search).get("welcome")) $("#welcome").classList.remove("d-none");

stops.push(people.subscribe(() => render()));
render();
attachPushSettings($("#push-section"), me).catch((err) => console.warn("Notifications section:", err?.message || err));

// Anonymous statistics: the switch shows my answer (off when I never answered) and saves a change at once.
import("./stats-consent.js").then(async ({ statsConsent, setStatsConsent, whatIsCountedHtml }) => {
  const box = $("#stats-on");
  if (!box) return;
  $("#stats-what").innerHTML = whatIsCountedHtml();
  box.checked = (await statsConsent(me)) === true;
  box.disabled = false;
  box.addEventListener("change", async () => {
    box.disabled = true;
    const ok = await attempt(async () => { await setStatsConsent(me, box.checked); return true; }, t(box.checked ? "stats.savedYes" : "stats.savedNo"));
    if (!ok) box.checked = !box.checked;
    box.disabled = false;
  });
}).catch((err) => console.warn("Statistics section:", err?.code || err?.message || err));
