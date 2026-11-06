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
  await store.setDoc(store.doc(db, "userProfiles", user.email.toLowerCase()), { displayName: user.displayName || null, photoUrl: user.photoURL || null }, { merge: true }).catch(() => {});
  return user;
}

export async function signOutAndLeave() {
  if (configured) await fb.signOut(auth);
  location.replace("login.html");
}

/** Whether this email is in settings/admins, and whether that list exists at all yet. */
export async function adminStatus(email) {
  const snap = await store.getDoc(store.doc(db, "settings", "admins"));
  const emails = snap.exists() ? snap.data().emails || [] : [];
  return { isAdmin: emails.includes(email.toLowerCase()), hasAdmins: snap.exists(), canBootstrap: !snap.exists() && email.toLowerCase() === BOOTSTRAP_ADMIN_EMAIL.toLowerCase() };
}

/**
 * Whether this person may use the app: an admin added them (Settings > Users, a users/{email} document), or they are an admin, or the
 * bootstrap account. The domain alone is not enough. firestore.rules (allowed()) enforces the same; this is only so the page can say so.
 */
export async function hasAccess(email) {
  const me = email.toLowerCase();
  if (me === BOOTSTRAP_ADMIN_EMAIL.toLowerCase()) return true;
  const own = await store.getDoc(store.doc(db, "users", me)).catch(() => null);
  if (own?.exists()) return true;
  return (await adminStatus(me).catch(() => ({ isAdmin: false }))).isAdmin;
}

/** Creates the admin list with this one account in it: only the bootstrap account may, and only once (firestore.rules). */
export async function becomeFirstAdmin(email) {
  await store.setDoc(store.doc(db, "settings", "admins"), { emails: [email.toLowerCase()] });
}
