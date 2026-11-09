// Anonymous statistics: whether someone lets Splitskebab count their meals in everyone's totals (functions/stats.js). Optional and not
// part of the terms: it is asked once, in a small dialog after signing in (Bootstrap "Modal", styled by the theme), and can be changed
// at any time on the profile. The answer is users/{uid}.statsConsent (true or false), which only the person writes (firestore.rules);
// until they answer it is missing, and nothing of theirs is counted.
import { SDK, db } from "./firebase-init.js";
import { esc, toast } from "./ui.js";
import { t } from "./i18n.js";

const fs = await import(`${SDK}/firebase-firestore.js`);
const accountRef = (uid) => fs.doc(db, "users", uid);

/** My answer: true, false, or null when I never answered. */
export async function statsConsent(uid) {
  const snap = await fs.getDoc(accountRef(uid));
  const v = snap.exists() ? snap.data().statsConsent : undefined;
  return typeof v === "boolean" ? v : null;
}

/** Saves my answer (stamped with the server's time). From now on the daily count includes my meals, or leaves them out. */
export const setStatsConsent = (uid, yes) => fs.updateDoc(accountRef(uid), { statsConsent: Boolean(yes), statsConsentAt: fs.serverTimestamp() });

/** What is counted, as HTML for the dialog and the profile: the three things, in a list (escaped). */
export const whatIsCountedHtml = () => `<ul class="text-start small mb-2">${["stats.item1", "stats.item2", "stats.item3"].map((k) => `<li>${esc(t(k))}</li>`).join("")}</ul>`;

/** Waits until no dialog is open (the notifications question may be showing), so two questions never stack. */
function whenNoDialog() {
  if (!document.querySelector(".modal.show") && !document.body.classList.contains("modal-open")) return Promise.resolve();
  return new Promise((resolve) => document.addEventListener("hidden.bs.modal", () => setTimeout(resolve, 300), { once: true }));
}

/** Asks once, when I never answered (js/app.js calls it after the app has started). Either button is an answer; closing is not. */
export async function offerStats(uid) {
  if ((await statsConsent(uid)) !== null) return;
  await whenNoDialog();
  if (!window.bootstrap?.Modal || document.querySelector("#stats-offer")) return;
  const el = document.createElement("div");
  el.className = "modal fade";
  el.id = "stats-offer";
  el.tabIndex = -1;
  el.setAttribute("aria-labelledby", "stats-offer-title");
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-body p-4">
      <div class="text-center"><i class="bi bi-bar-chart fs-1 text-primary" aria-hidden="true"></i>
      <h2 class="h5 mt-2" id="stats-offer-title">${esc(t("stats.offerTitle"))}</h2></div>
      <p class="small">${esc(t("stats.offerIntro"))}</p>
      ${whatIsCountedHtml()}
      <p class="small text-body-secondary mb-0">${esc(t("stats.offerOutro"))}</p>
    </div>
    <div class="modal-footer justify-content-center border-0 pt-0 pb-4">
      <button type="button" class="btn btn-outline-secondary" data-stats="no">${esc(t("stats.offerNo"))}</button>
      <button type="button" class="btn btn-primary" data-stats="yes">${esc(t("stats.offerYes"))}</button>
    </div>
  </div></div>`;
  // Outside #page-content (soft navigation would remove it mid-question) and gone once closed.
  document.body.append(el);
  const modal = window.bootstrap.Modal.getOrCreateInstance(el);
  el.addEventListener("hidden.bs.modal", () => { modal.dispose(); el.remove(); });
  el.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-stats]");
    if (!button) return;
    el.querySelectorAll("[data-stats]").forEach((b) => { b.disabled = true; });
    const yes = button.dataset.stats === "yes";
    try {
      await setStatsConsent(uid, yes);
      toast(t(yes ? "stats.savedYes" : "stats.savedNo"), "success");
    } catch (err) {
      console.error("Statistics answer:", err?.code || err?.message || err);
      toast(t("error.generic"), "danger");
    }
    modal.hide();
  });
  modal.show();
}
