// The terms in force, in Firestore: settings/terms { version, updatedAt, updatedBy, en, nl } (js/terms.js has the shape and the built-in
// version 1 that applies until the first save). Anyone may read it, also before signing in (terms.html); only admins write it, always
// as the next version, and each version is also kept in termsHistory/{version}, so it stays known which text someone accepted
// (firestore.rules). Saving a version makes everyone accept again before they get any data.
import { SDK, db } from "./firebase-init.js";
import { termsFrom } from "./terms.js";

const fs = await import(`${SDK}/firebase-firestore.js`);
const termsRef = () => fs.doc(db, "settings", "terms");
const toTerms = (snap) => {
  const d = snap.exists() ? snap.data() : null;
  return termsFrom(d ? { ...d, updatedAt: typeof d.updatedAt?.toMillis === "function" ? d.updatedAt.toMillis() : null } : null);
};

/** The terms in force. fresh: from the server, never the offline copy (to decide whether someone must accept again). */
export async function loadTerms({ fresh = false } = {}) {
  return toTerms(await (fresh ? fs.getDocFromServer(termsRef()) : fs.getDoc(termsRef())));
}

/**
 * Saves edited terms ({ en, nl }) as the version after current.version, with a copy in termsHistory, in one write. Fails (and saves
 * nothing) when someone else saved a version in between: firestore.rules accept only the next number. Returns the new version.
 */
export async function saveTerms(current, next, uid) {
  const version = current.version + 1;
  const data = { version, updatedAt: fs.serverTimestamp(), updatedBy: uid, en: next.en, nl: next.nl };
  const batch = fs.writeBatch(db);
  batch.set(termsRef(), data);
  batch.set(fs.doc(db, "termsHistory", String(version)), data);
  await batch.commit();
  return version;
}
