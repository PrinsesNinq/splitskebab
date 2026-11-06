// Who uses the app, their role and their groups: the data behind Settings > Users (admins only, see firestore.rules).
//   userProfiles/{email}   name and photo, written by each person when they sign in (js/auth.js)
//   users/{email}          { groups: [...], name?, photoUrl? }, set by admins; an admin can add someone before they ever sign in (with
//                          the name and photo from the Google directory, shown until their own profile exists)
//   settings/admins        { emails: [...] }, who is an admin
//   settings/groups        { names: [...] }, the groups there are
// Emails are the document ids, lowercase.
import { SDK, db } from "./firebase-init.js";
import { safePhoto } from "./photo.js";

const {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch, serverTimestamp,
} = await import(`${SDK}/firebase-firestore.js`);

// What is stored is not trusted: a person writes their own profile (userProfiles/{email}), so any field can hold anything. These keep one odd
// record from breaking the whole list (a name that is not text once stopped the sort, and with it the Users tab).
const text = (v) => (typeof v === "string" ? v.trim() : "");
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);
const photo = safePhoto; // js/photo.js: a Google photo or a small picture the person chose

/**
 * Everyone the app knows, kept up to date: onChange({ people, groups }) on every change, once all four sources have answered.
 * people: [{ email, name, photoUrl, admin, groups, signedIn, invited, blocked }] sorted by name. Returns a function that stops listening.
 */
export function watchPeople(onChange, onError = console.error) {
  const state = { profiles: null, users: null, admins: null, groups: null, blocked: null };
  const emit = () => {
    if (Object.values(state).some((v) => v === null)) return;
    const admins = strings(state.admins);
    const emails = new Set([...state.profiles.keys(), ...state.users.keys(), ...admins]);
    const people = [...emails].map((email) => {
      const profile = state.profiles.get(email) || {};
      const user = state.users.get(email) || {};
      return {
        email,
        name: text(profile.displayName) || text(user.name) || email.split("@")[0],
        photoUrl: photo(profile.photoUrl) || photo(user.photoUrl),
        admin: admins.includes(email),
        groups: strings(user.groups),
        signedIn: state.profiles.has(email), // has signed in at least once (added by an admin otherwise)
        // May use Splitskebab: an admin added them (a users/ document) or they are an admin. Someone who signed in without being added
        // shows up here with invited false, for an admin to let in.
        invited: state.users.has(email) || admins.includes(email),
        blocked: state.blocked.has(email), // an admin blocked them: no access, and they cannot register again
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    onChange({ people, groups: strings(state.groups).sort((a, b) => a.localeCompare(b)) });
  };
  const byId = (snap) => new Map(snap.docs.map((d) => [d.id, d.data()]));
  const stops = [
    onSnapshot(collection(db, "userProfiles"), (s) => { state.profiles = byId(s); emit(); }, onError),
    onSnapshot(collection(db, "users"), (s) => { state.users = byId(s); emit(); }, onError),
    onSnapshot(doc(db, "settings", "admins"), (s) => { state.admins = (s.exists() && s.data().emails) || []; emit(); }, onError),
    onSnapshot(doc(db, "settings", "groups"), (s) => { state.groups = (s.exists() && s.data().names) || []; emit(); }, onError),
    onSnapshot(collection(db, "blocked"), (s) => { state.blocked = new Set(s.docs.map((d) => d.id)); emit(); }, onError),
  ];
  return () => stops.forEach((stop) => stop());
}

/** Adds someone before they sign in (so they can be put in groups); name and photo when known (the Google directory). */
export const addPerson = (email, { name, photoUrl } = {}) => setDoc(doc(db, "users", email.toLowerCase()), {
  ...(name ? { name } : {}), ...(photoUrl ? { photoUrl } : {}),
}, { merge: true });

export const setAdmin = (email, admin) => updateDoc(doc(db, "settings", "admins"), { emails: admin ? arrayUnion(email) : arrayRemove(email) });

/**
 * Removes someone's account: their groups, their profile and their admin rights, and their users/ document. Anyone can register, so they
 * can sign up again; to keep someone out, block them (setBlocked).
 */
export async function removePerson(email) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", email));
  batch.delete(doc(db, "userProfiles", email));
  batch.update(doc(db, "settings", "admins"), { emails: arrayRemove(email) });
  await batch.commit();
}

/**
 * Blocks someone (no access at all, and they cannot register again: firestore.rules notBlocked()) or lets them back in. Their account
 * and data stay, so unblocking gives everything back.
 */
export const setBlocked = (email, blocked) => (blocked
  ? setDoc(doc(db, "blocked", email), { blockedAt: serverTimestamp() })
  : deleteDoc(doc(db, "blocked", email)));

export const setGroups = (email, groups) => setDoc(doc(db, "users", email), { groups: [...new Set(groups)].sort() }, { merge: true });

export const addGroup = (name) => setDoc(doc(db, "settings", "groups"), { names: arrayUnion(name) }, { merge: true });

/** Renames a group (newName) or deletes it (newName empty), in the list and in everyone's groups, in one write. current: what
 *  watchPeople last delivered ({ people, groups }). */
export async function changeGroup(name, newName, current) {
  const batch = writeBatch(db);
  const names = new Set(current.groups);
  names.delete(name);
  if (newName) names.add(newName);
  batch.set(doc(db, "settings", "groups"), { names: [...names].sort() }, { merge: true });
  for (const person of current.people.filter((p) => p.groups.includes(name))) {
    const groups = person.groups.filter((g) => g !== name);
    if (newName) groups.push(newName);
    batch.set(doc(db, "users", person.email), { groups: [...new Set(groups)].sort() }, { merge: true });
  }
  await batch.commit();
}
