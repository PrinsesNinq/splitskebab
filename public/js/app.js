// This project's own script, shared by every page except the sign-in page. It runs once: with soft navigation the page stays loaded while
// only #page-content changes, so per-page work goes in a "soft-nav:load" listener (as below) or in a script inside #page-content.
//
// It signs the person in (or sends them to the sign-in page), checks they have an account (or lets them create one; a blocked account
// gets nothing, see firestore.rules allowed()), translates the page, and fills the notification bell with the meals the
// person is invited to and has not answered yet.
import "./pwa.js"; // installable app: the service worker and the navbar's Install button
import { configured } from "./firebase-init.js";
import { requireUser, signOutAndLeave, accountStatus, register, adminStatus, rememberedAccess, rememberAccess, forgetAccess } from "./auth.js";
import { applyI18n, getLang, setLang, t, formatDay } from "./i18n.js";
import { addNotification } from "../vendor/sel/elements/notification-bell.js";
import * as peopleStore from "./store.js";
import { APP_VERSION } from "./version.js";

// Marks the bottom bar's link of the current page as active (a meal belongs to the calendar, someone's profile to Houses).
function markCurrentPage() {
  const here = location.pathname.split("/").pop() || "index.html";
  const page = here === "meal.html" ? "index.html" : (here === "person.html" || here === "analytics.html") ? "houses.html" : here === "chat.html" ? "messages.html" : here;
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

// ---- A newer version is live: reload (an app left open on a phone must not run old code against new security rules) ----
const RELOADED_KEY = "reloaded-for";
async function checkVersion() {
  try {
    const res = await fetch(`version.json?t=${Date.now()}`, { cache: "no-store" });
    if (!res.ok) return;
    const { version } = await res.json();
    if (typeof version !== "string" || version === APP_VERSION) return;
    // Once per new version: if the reload still brings the old code (a cache in between), do not loop.
    if (sessionStorage.getItem(RELOADED_KEY) === version) return;
    sessionStorage.setItem(RELOADED_KEY, version);
    location.reload();
  } catch { /* offline: try again next time */ }
}
checkVersion();
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible") checkVersion(); });

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

/** A full-page message in place of the page content (and no bottom bar): for the register, blocked and no-connection screens. */
function fullPage(html) {
  const content = document.querySelector("#page-content");
  content.innerHTML = `<main class="container main-container account-screen">${html}</main>`;
  document.querySelector("#nav")?.setAttribute("hidden", "");
  return content;
}

/**
 * Signed in with Google but no account yet: one button creates it (firestore.rules lets anyone create their own), then the profile
 * page opens so they can fill in their allergies and payment link. Texts go in as text: the name comes from Google.
 */
function showRegister(user, start) {
  const content = fullPage(`
    <img src="images/app-icon.svg" alt="" width="72" height="72" class="login-app-icon mb-3">
    <h1 class="h4"></h1>
    <p class="text-body-secondary" id="register-intro"></p>
    <div class="card card-body text-start mb-3"><strong id="register-name"></strong><span class="small text-body-secondary" id="register-email"></span></div>
    <div class="alert alert-danger d-none" role="alert" id="register-error"></div>
    <button type="button" class="btn btn-primary w-100 mb-2" id="register-btn"></button>
    <button type="button" class="btn btn-link btn-sm" id="register-out"></button>`);
  content.querySelector("h1").textContent = t("register.title");
  content.querySelector("#register-intro").textContent = t("register.intro");
  content.querySelector("#register-name").textContent = user.displayName || user.email;
  content.querySelector("#register-email").textContent = user.email;
  content.querySelector("#register-btn").textContent = t("register.button");
  content.querySelector("#register-out").textContent = t("register.otherAccount");
  content.querySelector("#register-out").addEventListener("click", signOutAndLeave);
  content.querySelector("#register-btn").addEventListener("click", async (event) => {
    event.target.disabled = true;
    try {
      await register(user.email);
      rememberAccess(user.email);
      // The profile is the first stop: allergies are what the others at the table need to know.
      location.replace("profile.html?welcome=1");
    } catch (err) {
      console.error(err);
      const box = content.querySelector("#register-error");
      box.textContent = err?.code === "permission-denied" ? t("register.refused") : t("error.generic");
      box.classList.remove("d-none");
      event.target.disabled = false;
    }
  });
}

/** An admin blocked this account: say so, and offer to sign out (firestore.rules refuse them everything anyway). */
function showBlocked(user) {
  const content = fullPage(`<h1 class="h4"></h1><p></p><button type="button" class="btn btn-outline-primary" id="blocked-out"></button>`);
  content.querySelector("h1").textContent = t("access.blockedTitle");
  content.querySelector("p").textContent = t("access.blockedBody", { email: user.email });
  content.querySelector("#blocked-out").textContent = t("nav.signOut");
  content.querySelector("#blocked-out").addEventListener("click", signOutAndLeave);
}
/** The first start on a device needs the server once (is this person invited?); without a connection, say so and offer to retry. */
function showNoConnection() {
  const content = fullPage(`<h1 class="h4"></h1><p></p><button type="button" class="btn btn-primary" id="retry-btn"></button>`);
  content.querySelector("h1").textContent = t("access.offlineTitle");
  content.querySelector("p").textContent = t("access.offlineBody");
  content.querySelector("#retry-btn").textContent = t("access.retry");
  content.querySelector("#retry-btn").addEventListener("click", () => location.reload());
}

// ---- Notifications: meals I am invited to and have not answered, and friend requests ----
const SEEN_KEY = "seen-invites";
const seen = () => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]")); } catch { return new Set(); } };

async function startInvites(me) {
  const bell = document.querySelector("sel-notification-bell");
  if (!bell) return;
  const { myMeals, myFriendships, awaitsMyAnswer, person, people } = await import("./store.js");
  const { todayIso } = await import("./ui.js");
  let meals = [];
  let friendships = [];
  bell.addEventListener("notification:seen", (event) => {
    const ids = [...seen(), ...(event.detail?.ids || [])].slice(-200);
    try { localStorage.setItem(SEEN_KEY, JSON.stringify(ids)); } catch { /* the badge comes back next visit */ }
  });
  const render = () => {
    const today = todayIso();
    const read = seen();
    bell.querySelectorAll(".notification-item").forEach((el) => el.remove());
    for (const f of friendships.filter((x) => x.status === "pending" && x.requester !== me)) {
      addNotification(bell, {
        id: `friend-${f.id}`,
        category: "friends",
        text: t("friends.requestText", { name: person(f.other).name }),
        href: "houses.html#friends",
        read: read.has(`friend-${f.id}`),
      });
    }
    const invites = meals.filter((m) => m.date >= today && awaitsMyAnswer(m, me));
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
  myMeals(me).subscribe((list) => { if (list) { meals = list; render(); } });
  myFriendships(me).subscribe((list) => { if (list) { friendships = list; render(); } });
  people.subscribe(() => render()); // names arrive separately
}

// ---- Housemates see the house's meals, also the ones planned before they joined (store.js shareCircleMeals) ----
async function startMealSharing(me) {
  const { myCircles, myMeals, shareCircleMeals } = await import("./store.js");
  const { todayIso } = await import("./ui.js");
  let circles = null;
  let meals = null;
  let busy = false;
  let again = false;
  const run = async () => {
    if (!circles || !meals) return;
    if (busy) { again = true; return; } // one round at a time; the snapshot after our own writes triggers the next
    busy = true;
    try {
      await shareCircleMeals(circles, meals, todayIso());
    } catch (err) {
      console.warn("Sharing the house's meals with new housemates did not work:", err?.code || err);
    } finally {
      busy = false;
      if (again) { again = false; run(); }
    }
  };
  myCircles(me).subscribe((list) => { if (list) { circles = list; run(); } });
  myMeals(me).subscribe((list) => { if (list) { meals = list; run(); } });
}

// ---- Unread messages: the counter on the Messages tab (my conversations, and for admins the feedback inbox) ----
async function startUnreadCount(me) {
  const store = await import("./store.js");
  const { isUnread } = await import("./messaging.js");
  let mine = [];
  let inbox = [];
  const render = () => {
    const ids = new Set([...mine, ...inbox].filter((c) => isUnread(c, me)).map((c) => c.id));
    for (const badge of document.querySelectorAll("#nav-unread")) {
      badge.textContent = ids.size > 9 ? "9+" : String(ids.size);
      badge.hidden = ids.size === 0;
    }
  };
  store.myConversations(me).subscribe((list) => { if (list) { mine = list; render(); } });
  if ((await adminStatus(me).catch(() => ({ isAdmin: false }))).isAdmin) {
    store.feedbackInbox.subscribe((list) => { if (list) { inbox = list.filter((c) => !c.members.includes(me)); render(); } });
  }
  document.addEventListener("soft-nav:load", render);
}

// ---- My private profile: moved off the public one, my friend list, and who may read it ----
// Allergies, payment link and friend list live in privateProfiles/{me}, readable only by the people on its readers list (firestore.rules):
// housemates, people at my meals and my friends (js/sharing.js profileReaders). Only I can write that list, so my app keeps it up to date
// whenever my houses, meals or friendships change. It writes only when something changed.
async function startPrivacySync(me) {
  const store = await import("./store.js");
  const { profileReaders } = await import("./sharing.js");
  await store.migrateMyProfile(me).catch((err) => console.warn("Could not move my profile details to my private profile:", err?.code || err));
  let circles = null;
  let meals = null;
  let friends = null;
  let mine = null;
  const same = (a, b) => [...a].sort().join("|") === [...b].sort().join("|");
  const sync = () => {
    if (!circles || !meals || !friends || !mine) return;
    const readers = profileReaders(me, circles, meals, friends);
    if (!same(readers, mine.readers)) store.saveMyReaders(me, readers).catch((err) => console.warn("Could not update who may read my profile:", err?.code || err));
    if (!same(friends, mine.friends)) store.saveMyFriendList(me, friends).catch((err) => console.warn("Could not update my friend list:", err?.code || err));
  };
  store.myCircles(me).subscribe((list) => { if (list) { circles = list; sync(); } });
  store.myMeals(me).subscribe((list) => { if (list) { meals = list; sync(); } });
  store.myFriendships(me).subscribe((list) => { if (list) { friends = store.friendEmails(list); sync(); } });
  store.people.subscribe((map) => { if (map?.has(me)) { mine = map.get(me); sync(); } });
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

  let started = false;
  const start = () => {
    if (started) return;
    started = true;
    show();
    adminStatus(user.email).then((s) => { document.querySelector("#nav-settings-item")?.toggleAttribute("hidden", !s.isAdmin && !s.canBootstrap); }).catch(() => {});
    peopleStore.usePeopleFor(user.email.toLowerCase()); // the private profiles I may read (before any page subscribes)
    window.appUser = user; // for page scripts that start after this event (a page reached by soft navigation)
    document.dispatchEvent(new CustomEvent("app:user", { detail: { user } }));
    startInvites(user.email.toLowerCase());
    startMealSharing(user.email.toLowerCase());
    startPrivacySync(user.email.toLowerCase());
    startUnreadCount(user.email.toLowerCase());
  };

  // What to show for each account status (js/auth.js accountStatus): the app, "create your account", "blocked", or "no connection".
  const settle = (status) => {
    if (status === "ok") { rememberAccess(user.email); start(); return; }
    if (status === "new") { forgetAccess(); showRegister(user, start); } else if (status === "blocked") { forgetAccess(); showBlocked(user); } else { showNoConnection(); }
    show();
  };
  if (rememberedAccess(user.email)) {
    // Has an account on this device: start at once (the data comes from the offline copy), and check again in the background; a
    // removed or blocked account then gets its screen.
    start();
    accountStatus(user.email).then((status) => { if (status === "new" || status === "blocked") settle(status); });
  } else {
    // The first time on this device: wait for the answer (it is remembered after).
    settle(await accountStatus(user.email));
  }
}
