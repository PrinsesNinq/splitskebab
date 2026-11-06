// This project's own script, shared by every page except the sign-in page. It runs once: with soft navigation the page stays loaded while
// only #page-content changes, so per-page work goes in a "soft-nav:load" listener (as below) or in a script inside #page-content.
//
// It signs the person in (or sends them to the sign-in page), checks they were invited (an admin added them in Settings > Users; the
// domain alone is not enough, see firestore.rules allowed()), translates the page, and fills the notification bell with the meals the
// person is invited to and has not answered yet.
import "./pwa.js"; // installable app: the service worker and the navbar's Install button
import { configured } from "./firebase-init.js";
import { requireUser, signOutAndLeave, hasAccess, adminStatus } from "./auth.js";
import { applyI18n, getLang, setLang, t, formatDay } from "./i18n.js";
import { addNotification } from "../vendor/sel/elements/notification-bell.js";

// Marks the bottom bar's link of the current page as active (a meal belongs to the calendar).
function markCurrentPage() {
  const here = location.pathname.split("/").pop() || "index.html";
  const page = here === "meal.html" ? "index.html" : here;
  for (const link of document.querySelectorAll("#nav .nav-link")) {
    const current = link.getAttribute("href") === page;
    link.classList.toggle("active", current);
    if (current) link.setAttribute("aria-current", "page");
    else link.removeAttribute("aria-current");
  }
}

function markLanguage() {
  for (const button of document.querySelectorAll("[data-lang]")) button.classList.toggle("active", button.dataset.lang === getLang());
}

applyI18n();
markCurrentPage();
markLanguage();
document.addEventListener("soft-nav:load", () => { applyI18n(); markCurrentPage(); markLanguage(); });
// Switching language reloads the page: the pages draw most of their text from script, and a reload redraws all of it in the new language.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-lang]");
  if (!button || button.dataset.lang === getLang()) return;
  setLang(button.dataset.lang);
  location.reload();
});

const show = () => document.documentElement.classList.remove("auth-pending"); // hidden until now: see the inline script in each <head>

/** Someone on the domain whom no admin added: they see who to ask, and nothing else (Firestore would refuse them the data anyway). */
function showNotInvited(user) {
  const content = document.querySelector("#page-content");
  content.innerHTML = `<main class="container main-container not-invited"><h1 class="h4"></h1><p></p><button type="button" class="btn btn-outline-primary" id="not-invited-out"></button></main>`;
  content.querySelector("h1").textContent = t("access.title");
  content.querySelector("p").textContent = t("access.body", { email: user.email });
  content.querySelector("#not-invited-out").textContent = t("nav.signOut");
  content.querySelector("#not-invited-out").addEventListener("click", signOutAndLeave);
  document.querySelector("#nav")?.setAttribute("hidden", "");
}

// ---- Notifications: meals I am invited to and have not answered ----
const SEEN_KEY = "seen-invites";
const seen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };

async function startInvites(me) {
  const bell = document.querySelector("sel-notification-bell");
  if (!bell) return;
  const { myMeals } = await import("./store.js");
  const { todayIso } = await import("./ui.js");
  bell.addEventListener("notification:seen", (event) => {
    const ids = [...seen(), ...(event.detail?.ids || [])].slice(-200);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* the badge comes back next visit */ }
  });
  const render = (meals) => {
    if (!meals) return;
    const today = todayIso();
    const read = seen();
    bell.querySelectorAll(".notification-item").forEach((el) => el.remove());
    const invites = meals.filter((m) => m.rsvp && m.date >= today && m.host !== me && !m.participants.includes(me) && !m.declined.includes(me));
    for (const meal of invites) {
      addNotification(bell, {
        id: `invite-${meal.id}`,
        category: "invites",
        text: t("invite.text", { title: meal.title || t("meal.untitled"), day: formatDay(meal.date), circle: meal.circleName }),
        href: `meal.html?id=${encodeURIComponent(meal.id)}`,
        read: read.has(`invite-${meal.id}`),
      });
    }
  };
  myMeals(me).subscribe(render);
}

if (!configured) {
  // Not connected to Firebase yet: say so above the content instead of sending everyone to a sign-in that cannot work.
  document.querySelector("#site-nav").insertAdjacentHTML("afterend", '<div class="container mt-3"><div class="alert alert-warning mb-0">Firebase is not set up yet: fill in <code>public/js/config.js</code> (or create the project with sel-new). The pages work, signing in does not.</div></div>');
  show();
} else {
  const user = await requireUser();
  document.querySelector("#current-user-email").textContent = user.email;
  document.querySelector("#current-user-initial").textContent = (user.displayName || user.email).charAt(0).toUpperCase();
  document.querySelector("#nav-sign-out-btn").addEventListener("click", signOutAndLeave);
  if (!(await hasAccess(user.email))) {
    showNotInvited(user);
    show();
  } else {
    show();
    adminStatus(user.email).then((s) => { document.querySelector("#nav-settings-item")?.toggleAttribute("hidden", !s.isAdmin && !s.canBootstrap); }).catch(() => {});
    window.appUser = user; // for page scripts that start after this event (a page reached by soft navigation)
    document.dispatchEvent(new CustomEvent("app:user", { detail: { user } }));
    startInvites(user.email.toLowerCase());
  }
}
