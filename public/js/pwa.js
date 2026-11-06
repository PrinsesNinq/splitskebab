// Installing the app (PWA): registers the service worker (sw.js) and shows the navbar's Install button when the browser offers
// installing. The browser decides that: it needs manifest.json with PNG icons of 192 and 512 px (Android ignores an SVG-only manifest),
// HTTPS (or this machine), and it stops offering once the app is installed, or when the page already runs as the installed app.
// Safari (iPhone, iPad) has no install prompt: there the button explains Share > Add to Home Screen.
// The exports are shared with the install screen on phones (js/install-gate.js).
const local = ['localhost', '127.0.0.1'].includes(location.hostname);

if ('serviceWorker' in navigator) {
  if (local) {
    // Not on this machine: a cached page would hide the edit you just made. One left by an earlier session is removed.
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
  } else {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered:', err));
  }
}

/** An iPhone or iPad (iPadOS says it is a Mac, but a Mac has no touch screen). */
export const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
/** A phone or tablet, where the app is meant to be installed. */
export const isMobile = isIos || /android|mobile/i.test(navigator.userAgent);
/** The page runs as the installed app (opened from the home screen), not in a browser tab. */
export const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;

const button = document.querySelector('#install-app-btn');
let offer = null;
const listeners = new Set();
const changed = () => listeners.forEach((fn) => fn());

/** Whether the browser offers installing right now (Chrome and Edge on Android and computers; never Safari). */
export const canPrompt = () => Boolean(offer);
/** Calls fn whenever that changes (the offer comes in, or the app got installed); returns the function that stops it. */
export function onInstallChange(fn) { listeners.add(fn); return () => listeners.delete(fn); }

/** Shows the browser's own install question; resolves to true when the person installed it. */
export async function promptInstall() {
  if (!offer) return false;
  const current = offer;
  offer = null;
  current.prompt();
  const { outcome } = await current.userChoice;
  if (button) button.hidden = true;
  changed();
  return outcome === 'accepted';
}

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // our own button instead of the browser's banner
  offer = event;
  if (button) button.hidden = false;
  changed();
});

window.addEventListener('appinstalled', () => {
  offer = null;
  if (button) button.hidden = true;
  changed();
});

// iPhone and iPad: Safari never offers installing (no beforeinstallprompt); it is Share > Add to Home Screen, by hand. So there the
// button is shown anyway (unless the app already runs installed), and it explains those two steps.
if (button && isIos && !installed) {
  button.hidden = false;
  button.addEventListener('click', async () => {
    const { toast } = await import('./ui.js');
    const { t } = await import('./i18n.js');
    toast(t('install.ios'), 'info');
  });
}

if (button) {
  button.addEventListener('click', async () => {
    if (!offer) return;
    button.disabled = true;
    await promptInstall();
    button.disabled = false;
  });
}
