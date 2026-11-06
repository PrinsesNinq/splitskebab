// Signing in and out, who is signed in, and who is an admin. Any Google account can sign in (ALLOWED_DOMAIN "" in js/config.js; with a
// domain there, only that one, and someone else is signed straight out again). Getting in is not getting access: only people an admin
// added see anything (hasAccess() below, enforced by firestore.rules allowed()).
import { SDK, auth, db, configured } from "./firebase-init.js";
import { ALLOWED_DOMAIN, BOOTSTRAP_ADMIN_EMAIL } from "./config.js";

const fb = configured ? await import(`${SDK}/firebase-auth.js`) : null;
const store = configured ? await import(`${SDK}/firebase-firestore.js`) : null;

export const allowedEmail = (email) => !!email && (!ALLOWED_DOMAIN || email.toLowerCase().endsWith("@" + ALLOWED_DOMAIN));

/** The signed-in user (null when nobody is), once Firebase knows: it restores a session from an earlier visit first. */
export function currentUser() {
  if (!configured) return Promise.resolve(null);
  return new Promise((resolve) => {
    const stop = fb.onAuthStateChanged(auth, (user) => { stop(); resolve(user); });
  });
}

/** The signed-in user, or a redirect to the sign-in page (which comes back here afterwards). */
export async function requireUser() {
  const user = await currentUser();
  if (user && allowedEmail(user.email)) return user;
  location.replace(`login.html?next=${encodeURIComponent(location.pathname.split("/").pop() || "index.html")}`);
  return new Promise(() => {}); // the page is leaving
}

/** Google's sign-in popup (limited to the domain, when there is one). Throws an Error with a message for the person when it does not work out. */
export async function signIn() {
  const provider = new fb.GoogleAuthProvider();
  provider.setCustomParameters(ALLOWED_DOMAIN ? { hd: ALLOWED_DOMAIN, prompt: "select_account" } : { prompt: "select_account" });
  const { user } = await fb.signInWithPopup(auth, provider);
  if (!allowedEmail(user.email)) {
    await fb.signOut(auth);
    throw new Error(`Only @${ALLOWED_DOMAIN} accounts can sign in. You used ${user.email}.`);
  }
  // Name and photo for the rest of the app to show next to this person (readable by every invited user, see firestore.rules). Merged: the
  // same document holds the allergies and payment link the person set on their profile page, which a sign-in must not wipe.
  // Google fills in only what the person did not set themselves (they can change their name and photo on the profile page).
  const ref = store.doc(db, "userProfiles", user.email.toLowerCase());
  const existing = await store.getDoc(ref).then((s) => (s.exists() ? s.data() : {})).catch(() => ({}));
  const fill = {};
  if (!existing.displayName && user.displayName) fill.displayName = user.displayName;
  if (!("photoUrl" in existing) && user.photoURL) fill.photoUrl = user.photoURL;
  if (Object.keys(fill).length) await store.setDoc(ref, fill, { merge: true }).catch(() => {});
  return user;
}

/**
 * Signs out and leaves nothing of this person on the device: the remembered invitation and Firestore's offline copy of their data
 * (js/firebase-init.js) are wiped, so the next person on a shared phone starts clean.
 */
export async function signOutAndLeave() {
  forgetAccess();
  if (configured) {
    await fb.signOut(auth).catch(() => {});
    try {
      await store.terminate(db);
      await store.clearIndexedDbPersistence(db);
    } catch (err) {
      console.warn("Could not wipe the offline copy:", err?.message || err); // another tab still has it open; it goes with the next sign-out
    }
  }
  location.replace("login.html");
}

// ---- Remembered invitation ----
// Whether this person has an account, remembered on this device after the first check, so the app does not wait for server reads
// before every start (on a phone those can take many seconds). js/app.js checks again in the background each time and forgets it
// when the account was removed or blocked. It only spares the waiting: firestore.rules decide what anyone can read.
const ACCESS_KEY = "access-ok";
export function rememberedAccess(email) {
  try { return localStorage.getItem(ACCESS_KEY) === email.toLowerCase(); } catch { return false; }
}
export function rememberAccess(email) {
  try { localStorage.setItem(ACCESS_KEY, email.toLowerCase()); } catch { /* checked again next time */ }
}
export function forgetAccess() {
  try { localStorage.removeItem(ACCESS_KEY); } catch { /* nothing to forget */ }
}

/** Whether this email is in settings/admins, and whether that list exists at all yet. */
export async function adminStatus(email) {
  let snap;
  try {
    snap = await store.getDoc(store.doc(db, "settings", "admins"));
  } catch (err) {
    // Only admins may read the list (firestore.rules): being refused means there is a list and I am not on it.
    if (err?.code === "permission-denied") return { isAdmin: false, hasAdmins: true, canBootstrap: false };
    throw err;
  }
  const emails = snap.exists() ? snap.data().emails || [] : [];
  return { isAdmin: emails.includes(email.toLowerCase()), hasAdmins: snap.exists(), canBootstrap: !snap.exists() && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() };
}

/**
 * Where this person stands: "ok" (has an account: registered themselves or added by an admin, or is an admin / the bootstrap account),
 * "new" (signed in with Google but no account yet: they can register), "blocked" (an admin blocked them), or null when it could not be
 * checked (no connection): js/app.js then keeps what it remembered, and never shuts someone out on a bad network.
 * firestore.rules (allowed()) enforces the same; this is only so the page can show the right screen.
 */
export async function accountStatus(email) {
  const me = email.toLowerCase();
  // From the server, never the offline copy: "no document" must mean "no account", not "not downloaded yet".
  try {
    const blocked = await store.getDocFromServer(store.doc(db, "blocked", me));
    if (blocked.exists()) return "blocked";
  } catch {
    return null;
  }
  if (me === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return "ok";
  let own;
  try {
    own = await store.getDocFromServer(store.doc(db, "users", me));
  } catch {
    return null;
  }
  if (own.exists()) return "ok";
  try {
    const admins = await store.getDocFromServer(store.doc(db, "settings", "admins"));
    return admins.exists() && (admins.data().emails || []).includes(me) ? "ok" : "new";
  } catch (err) {
    return err?.code === "permission-denied" ? "new" : null; // people without an account may not read the admin list (firestore.rules)
  }
}

/** Creates my account (any Google account may: firestore.rules lets a person create only their own, with only the time in it). */
export const register = (email) => store.setDoc(store.doc(db, "users", email.toLowerCase()), { registeredAt: store.serverTimestamp() });
/** Creates the admin list with this one account in it: only the bootstrap account may, and only once (firestore.rules). */
export async function becomeFirstAdmin(email) {
  await store.setDoc(store.doc(db, "settings", "admins"), { emails: [email.toLowerCase()] });
}
