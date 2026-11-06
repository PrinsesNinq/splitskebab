// The sign-in page (component "Log-in Screen"): the button signs in with Google, then goes back to the page that sent the person here.
import "./pwa.js"; // the service worker registers on the first visit too, so the app can be installed once signed in
import { configured } from "./firebase-init.js";
import { APP_NAME, ALLOWED_DOMAIN } from "./config.js";
import { currentUser, allowedEmail, signIn } from "./auth.js";
import { applyI18n, t } from "./i18n.js";

const button = document.querySelector('[data-log-in-screen-signin]');
const error = document.querySelector('[data-log-in-screen-error]');
const next = new URLSearchParams(location.search).get('next');
const target = next && /^[\w-]+\.html$/.test(next) ? next : 'index.html'; // only a page of this site

document.querySelector('#app-name').textContent = APP_NAME;
applyI18n();
// With a domain in js/config.js only that one signs in; Splitskebab has none: any Google account, access by invitation.
if (ALLOWED_DOMAIN) document.querySelector('#login-who').textContent = t('login.domainOnly', { domain: ALLOWED_DOMAIN });
document.title = `${APP_NAME}: sign in`;

function showError(message) {
  error.textContent = message;
  error.classList.remove('d-none');
}

if (!configured) {
  button.disabled = true;
  showError('Firebase is not set up yet: fill in public/js/config.js (or create the project with sel-new).');
} else {
  const user = await currentUser();
  if (user && allowedEmail(user.email)) location.replace(target);
  button.addEventListener('click', async () => {
    button.disabled = true;
    error.classList.add('d-none');
    try {
      await signIn();
      location.replace(target);
    } catch (err) {
      if (err.code !== 'auth/popup-closed-by-user' && err.code !== 'auth/cancelled-popup-request') showError(err.message || 'Signing in did not work. Try again.');
      button.disabled = false;
    }
  });
}
