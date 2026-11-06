// Notifications are on by default: the first time someone uses the app on a device, it offers to switch them on (all kinds). Browsers
// only show their own "allow notifications?" question after a tap (iPhones refuse it otherwise, other browsers hide it), so the app asks
// first in a small dialog (Bootstrap "Modal", styled by the theme) and its "Turn on" button asks the browser. Whatever the answer, this
// device does not ask this person again; the profile page's Notifications section changes it later (js/push-settings.js).
// Where the browser already allows notifications for the app, they are simply switched on, without a question.
import { pushState, pushKinds, enablePush, wasAsked, markAsked, KINDS } from "./push.js";
import { esc, toast } from "./ui.js";
import { getLang, t } from "./i18n.js";

/** Whether to offer notifications now: this device can do push, has none for this person and never asked them. */
export async function shouldOffer(me) {
  if (wasAsked(me) || pushKinds(me).length) return false;
  return (await pushState().catch(() => "unsupported")) === "ok" && Notification.permission !== "denied";
}

function dialog() {
  const el = document.createElement("div");
  el.className = "modal fade";
  el.id = "push-offer";
  el.tabIndex = -1;
  el.setAttribute("aria-labelledby", "push-offer-title");
  el.innerHTML = `<div class="modal-dialog modal-dialog-centered"><div class="modal-content">
    <div class="modal-body text-center p-4">
      <i class="bi bi-bell fs-1 text-primary" aria-hidden="true"></i>
      <h2 class="h5 mt-2" id="push-offer-title">${esc(t("push.offerTitle"))}</h2>
      <p class="text-body-secondary mb-0">${esc(t("push.offerBody"))}</p>
    </div>
    <div class="modal-footer justify-content-center border-0 pt-0 pb-4">
      <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">${esc(t("push.offerLater"))}</button>
      <button type="button" class="btn btn-primary" data-push-on>${esc(t("push.offerOn"))}</button>
    </div>
  </div></div>`;
  return el;
}

/** Offers notifications once per person and device (js/app.js calls it when the app has started). */
export async function offerPush(me) {
  if (!(await shouldOffer(me))) return;
  markAsked(me); // asked: also when the dialog is closed without an answer
  if (Notification.permission === "granted") {
    await enablePush(me, KINDS, getLang()).catch((err) => console.warn("Push not switched on:", err?.code || err?.message || err));
    return;
  }
  if (!window.bootstrap?.Modal || document.querySelector("#push-offer")) return;
  // Outside #page-content (soft navigation would remove it mid-question) and gone once closed.
  const el = dialog();
  document.body.append(el);
  const modal = window.bootstrap.Modal.getOrCreateInstance(el);
  el.addEventListener("hidden.bs.modal", () => { modal.dispose(); el.remove(); });
  el.querySelector("[data-push-on]").addEventListener("click", async (event) => {
    event.currentTarget.disabled = true;
    try {
      await enablePush(me, KINDS, getLang()); // the browser asks here, inside the tap
      toast(t("push.saved"), "success");
    } catch (err) {
      if (err?.message !== "denied") { console.error("Push offer:", err?.code || err?.message || err); toast(t("push.failed"), "danger"); }
    }
    modal.hide();
  });
  modal.show();
}
