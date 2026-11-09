// Small pieces every page uses: escaping, avatars, allergen badges, toasts and "who is signed in". Anything drawn from stored data goes
// through esc() (or textContent): profiles, meals and recipes are written by other users.
import { onPageLeave } from "../vendor/sel/elements/page-transitions.js";
import { allergenLabel, allergenIcon, cleanAllergens } from "./allergens.js";
import { getLang, t } from "./i18n.js";

export const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

/** A steady colour per person, from their uid (the same one on every page and for everyone). */
export const colour = (id) => `hsl(${[...String(id)].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 360, 7)} 55% 42%)`;

/** The avatar (component "Avatar"): their photo, or their initial on their colour. */
export function avatarHtml(p, cls = "avatar") {
  if (p.photoUrl) return `<img class="${cls}" src="${esc(p.photoUrl)}" alt="" referrerpolicy="no-referrer">`;
  return `<span class="${cls}" style="--avatar-bg: ${colour(p.id || p.name)}" aria-hidden="true">${esc((p.name || "?").charAt(0).toUpperCase())}</span>`;
}

/** An overlapping row of avatars with "+N" for the rest (component "Avatar stack"). */
export function avatarStackHtml(list, max = 5) {
  const shown = list.slice(0, max).map((p) => avatarHtml(p, "avatar avatar-sm")).join("");
  const more = list.length > max ? `<span class="avatar avatar-sm avatar-stack__more">+${list.length - max}</span>` : "";
  return `<span class="avatar-stack" role="group" aria-label="${esc(t("meal.participants"))}">${shown}${more}</span>`;
}

/** Allergen pills (component "Color tags"). danger: the red warning style, for an allergen someone at the table reacts to. */
export function allergenBadges(ids, { danger = [] } = {}) {
  const lang = getLang();
  const bad = new Set(danger);
  return cleanAllergens(ids).map((id) => bad.has(id)
    ? `<span class="badge tag allergen-danger"><i class="bi bi-exclamation-triangle-fill" aria-hidden="true"></i> ${esc(allergenLabel(id, lang))}</span>`
    : `<span class="badge tag tag--gray">${allergenIcon(id)} ${esc(allergenLabel(id, lang))}</span>`).join(" ");
}

/**
 * A warning for the people whose allergies I cannot see (their private profile is not shared with me yet: it is, once their app has
 * seen that we share a house, a meal or a friendship). Never let "not visible" pass for "no allergies". Escaped HTML, or "" when
 * everyone's allergies are visible.
 */
export function hiddenAllergiesNote(list) {
  const hidden = list.filter((p) => !p.detailsVisible);
  if (!hidden.length) return "";
  return `<div class="alert alert-warning small py-2" role="status"><i class="bi bi-eye-slash" aria-hidden="true"></i> ${esc(t("allergy.hiddenNote", { names: hidden.map((p) => p.name).join(", ") }))}</div>`;
}

/** Small text under a name when that person's allergies are not visible to me (yet). */
export const hiddenAllergiesTag = (p) => (p.detailsVisible ? ""
  : `<span class="d-block small text-warning-emphasis"><i class="bi bi-eye-slash" aria-hidden="true"></i> ${esc(t("allergy.hiddenTag"))}</span>`);

/** The signed-in, invited user, once js/app.js has checked them (page scripts can start before it is done). */
export function whenUser() {
  if (window.appUser) return Promise.resolve(window.appUser);
  return new Promise((resolve) => document.addEventListener("app:user", (e) => resolve(e.detail.user), { once: true }));
}

/** A short message in the corner (Bootstrap toast). variant: success, danger, warning, info. */
export function toast(message, variant = "success") {
  let box = document.querySelector("#toast-box");
  if (!box) {
    box = document.createElement("div");
    box.id = "toast-box";
    box.className = "toast-container position-fixed bottom-0 start-50 translate-middle-x p-3 toast-box";
    document.body.append(box);
  }
  const el = document.createElement("div");
  el.className = `toast align-items-center text-bg-${variant} border-0`;
  el.setAttribute("role", variant === "danger" ? "alert" : "status");
  el.innerHTML = `<div class="d-flex"><div class="toast-body"></div><button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="${esc(t("common.close"))}"></button></div>`;
  el.querySelector(".toast-body").textContent = message;
  box.append(el);
  el.addEventListener("hidden.bs.toast", () => el.remove());
  new window.bootstrap.Toast(el, { delay: variant === "danger" ? 7000 : 3500 }).show();
}

/** Runs an action and tells the person when it did not work (and the console why), instead of failing silently. */
export async function attempt(fn, success) {
  try {
    const result = await fn();
    if (success) toast(success);
    return result;
  } catch (err) {
    console.error(err);
    toast(err?.code === "permission-denied" ? t("error.permission") : t("error.generic"), "danger");
    return undefined;
  }
}

/** Stops something (a live listener, a timer) when the page is left by soft navigation. */
export const onLeave = (fn) => onPageLeave(fn);

export const param = (name) => new URLSearchParams(location.search).get(name);

/** Goes to a page of this app the way a link click does, so soft navigation (component "Page transitions") handles it. */
export function go(url) {
  const link = document.createElement("a");
  link.href = url;
  link.hidden = true;
  document.body.append(link);
  link.click();
  link.remove();
}

/** Today as "YYYY-MM-DD" in this device's time zone (meals are planned on local days, never UTC ones). */
export function todayIso(date = new Date()) {
  const p = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
}

/**
 * Shares a text the phone's way (the share sheet: WhatsApp, Signal, mail...). Without one (most desktops) it is copied to the clipboard,
 * and when even that is refused it opens WhatsApp with the text.
 */
export async function shareText(text) {
  if (navigator.share) {
    try {
      await navigator.share({ text });
      return;
    } catch (err) {
      if (err?.name === "AbortError") return; // the person closed the share sheet
    }
  }
  try {
    await navigator.clipboard.writeText(text);
    toast(t("common.copied"));
  } catch {
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener");
  }
}

/** Random id for a guest or a temporary row. */
export const randomId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2)).replace(/-/g, "").slice(0, 16);
