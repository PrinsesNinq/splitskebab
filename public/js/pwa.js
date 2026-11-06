// Installing the app (PWA): registers the service worker (sw.js) and shows the navbar's Install button when the browser offers
// installing. The browser decides that: it needs manifest.json with PNG icons of 192 and 512 px (Android ignores an SVG-only manifest),
// HTTPS (or this machine), and it stops offering once the app is installed, or when the page already runs as the installed app.
// Safari (iPhone, iPad) has no install prompt: there the button explains Share > Add to Home Screen.
const local = ['localhost', '127.0.0.1'].includes(location.hostname);

if ('serviceWorker' in navigator) {
  if (local) {
    // Not on this machine: a cached page would hide the edit you just made. One left by an earlier session is removed.
    navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((reg) => reg.unregister()));
  } else {
    navigator.serviceWorker.register('sw.js').catch((err) => console.warn('Service worker not registered:', err));
  }
}

const button = document.querySelector('#install-app-btn');
let offer = null;

window.addEventListener('beforeinstallprompt', (event) => {
  event.preventDefault(); // our own button instead of the browser's banner
  offer = event;
  if (button) button.hidden = false;
});

window.addEventListener('appinstalled', () => {
  offer = null;
  if (button) button.hidden = true;
});

// iPhone and iPad: Safari never offers installing (no beforeinstallprompt); it is Share > Add to Home Screen, by hand. So there the
// button is shown anyway (unless the app already runs installed), and it explains those two steps.
const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
const installed = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
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
    offer.prompt();
    await offer.userChoice;
    offer = null;
    button.hidden = true;
    button.disabled = false;
  });
}
