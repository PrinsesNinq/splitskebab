// On a phone, Splitskebab is meant to be used installed (from the home screen): on an iPhone that is the only way it can send
// notifications, and on Android it opens like a normal app. So when it is opened in a phone's browser, a full-screen page asks to install
// it first, with the steps for that phone: Android gets the browser's own Install button (js/pwa.js), an iPhone the two Safari steps.
// Installing cannot be forced by a web page, and some browsers cannot install at all (the in-app browser of Instagram or WhatsApp), so
// "Continue in the browser" stays as a small link: it lasts until the app is closed, and the next visit in the browser asks again.
// Computers never see it: notifications work in their browsers without installing.
import { isIos, isMobile, installed, canPrompt, promptInstall, onInstallChange } from "./pwa.js";
import { esc } from "./ui.js";
import { t } from "./i18n.js";

const LATER = "install-later"; // sessionStorage: "continue in the browser" was chosen in this visit

/** Safari itself: other iPhone browsers and in-app browsers (Instagram, Facebook, Google app) cannot add to the home screen as well. */
const isIosSafari = () => isIos && /safari/i.test(navigator.userAgent) && !/crios|fxios|edgios|opios|gsa\/|fban|fbav|instagram|line\//i.test(navigator.userAgent);

export const shouldGate = () => isMobile && !installed && !sessionStorage.getItem(LATER);

const step = (icon, html) => `<li class="install-gate__step"><i class="bi ${icon} install-gate__icon" aria-hidden="true"></i><span>${html}</span></li>`;

function body() {
  if (isIos) {
    const steps = [
      ...(isIosSafari() ? [] : [step("bi-browser-safari", esc(t("install.gate.openSafari")))]),
      step("bi-box-arrow-up", esc(t("install.gate.iosShare"))),
      step("bi-plus-square", esc(t("install.gate.iosAdd"))),
      step("bi-house-door", esc(t("install.gate.openHome"))),
    ];
    return `<ol class="install-gate__steps">${steps.join("")}</ol>`;
  }
  if (canPrompt()) {
    return `<button type="button" class="btn btn-primary btn-lg w-100" data-install>${esc(t("install.gate.button"))}</button>`;
  }
  return `<ol class="install-gate__steps">
      ${step("bi-three-dots-vertical", esc(t("install.gate.androidMenu")))}
      ${step("bi-house-door", esc(t("install.gate.openHome")))}
    </ol>
    <p class="small text-body-secondary mb-0">${esc(t("install.gate.already"))}</p>`;
}

/**
 * Shows the install page when this is a phone's browser; resolves when it is gone ("Continue in the browser"), at once when it is not
 * needed. Everything behind it is inert meanwhile, so neither a tap nor the keyboard reaches the app.
 */
export function installGate() {
  if (!shouldGate()) return Promise.resolve();
  return new Promise((resolve) => {
    const gate = document.createElement("div");
    gate.className = "install-gate";
    gate.setAttribute("role", "dialog");
    gate.setAttribute("aria-modal", "true");
    gate.setAttribute("aria-labelledby", "install-gate-title");
    const behind = [...document.body.children];
    behind.forEach((el) => { el.inert = true; });

    const render = () => {
      gate.innerHTML = `<div class="install-gate__card">
        <img class="install-gate__logo" src="images/icon-192.png" alt="" width="72" height="72">
        <h1 class="h4 mb-2" id="install-gate-title" tabindex="-1">${esc(t("install.gate.title"))}</h1>
        <p class="text-body-secondary">${esc(t(isIos ? "install.gate.whyIos" : "install.gate.why"))}</p>
        ${body()}
        <button type="button" class="btn btn-link btn-sm text-body-secondary mt-3" data-later>${esc(t("install.gate.later"))}</button>
      </div>`;
    };
    // Chrome's install offer may come in after the page shows, or go once it is used: the page follows it.
    const stop = onInstallChange(render);
    const close = () => {
      stop();
      gate.remove();
      behind.forEach((el) => { el.inert = false; });
      resolve();
    };
    gate.addEventListener("click", async (event) => {
      if (event.target.closest("[data-later]")) { sessionStorage.setItem(LATER, "1"); close(); return; }
      const install = event.target.closest("[data-install]");
      if (!install) return;
      install.disabled = true;
      if (await promptInstall()) {
        gate.querySelector(".install-gate__card").innerHTML = `<i class="bi bi-check-circle text-success display-4" aria-hidden="true"></i>
          <h1 class="h4 mt-2" tabindex="-1">${esc(t("install.gate.doneTitle"))}</h1>
          <p class="text-body-secondary mb-0">${esc(t("install.gate.openHome"))}</p>`;
      } else render();
    });
    render();
    document.body.append(gate);
    gate.querySelector("h1")?.focus();
  });
}
