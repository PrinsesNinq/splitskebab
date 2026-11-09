// Who uses the app, their role and their groups: the data behind Settings > Users (admins only, see firestore.rules).
//   userProfiles/{uid}  name and photo, written by each person when they sign in (js/auth.js)
//   users/{uid}         { registeredAt, termsVersion, termsAcceptedAt, email, groups }: the account. email is there only once they accepted the
//                       terms (which allows the admins to see it); groups are set by admins
//   settings/admins     { uids: [...] }, who is an admin
//   settings/groups     { names: [...] }, the groups there are
// People are known by their uid (the document ids); nobody is added by email: anyone with a Google account registers themselves.
import { SDK, db } from "./firebase-init.js";
import { safePhoto } from "./photo.js";

const {
  collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, writeBatch, serverTimestamp,
} = await import(`${SDK}/firebase-firestore.js`);

// What is stored is not trusted: a person writes their own profile (userProfiles/{uid}), so any field can hold anything. These keep one odd
// record from breaking the whole list (a name that is not text once stopped the sort, and with it the Users tab).
const text = (v) => (typeof v === "string" ? v.trim() : "");
const strings = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);
const photo = safePhoto; // js/photo.js: a Google photo or a small picture the person chose

/**
 * Everyone the app knows, kept up to date: onChange({ people, groups }) on every change, once all sources have answered.
 * people: [{ id, name, email, photoUrl, admin, groups, registered, acceptedTerms, blocked }] sorted by name. email is "" until the
 * person accepted the terms. Returns a function that stops listening.
 */
export function watchPeople(onChange, onError = console.error) {
  const state = { profiles: null, users: null, admins: null, groups: null, blocked: null };
  const emit = () => {
    if (Object.values(state).some((v) => v === null)) return;
    const admins = strings(state.admins);
    const ids = new Set([...state.profiles.keys(), ...state.users.keys(), ...admins]);
    const people = [...ids].map((id) => {
      const profile = state.profiles.get(id) || {};
      const account = state.users.get(id) || null;
      const acceptedTerms = Number(account?.termsVersion) >= 1;
      return {
        id,
        name: text(profile.displayName) || "?",
        email: acceptedTerms ? text(account.email) : "", // shown only with the person's permission (the terms)
        photoUrl: photo(profile.photoUrl),
        admin: admins.includes(id),
        groups: strings(account?.groups),
        registered: Boolean(account), // has an account (signed in without registering otherwise)
        acceptedTerms,
        blocked: state.blocked.has(id), // an admin blocked them: no access, and they cannot register again
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
    onChange({ people, groups: strings(state.groups).sort((a, b) => a.localeCompare(b)) });
  };
  const byId = (snap) => new Map(snap.docs.map((d) => [d.id, d.data()]));
  const stops = [
    onSnapshot(collection(db, "userProfiles"), (s) => { state.profiles = byId(s); emit(); }, onError),
    onSnapshot(collection(db, "users"), (s) => { state.users = byId(s); emit(); }, onError),
    onSnapshot(doc(db, "settings", "admins"), (s) => { state.admins = (s.exists() && s.data().uids) || []; emit(); }, onError),
    onSnapshot(doc(db, "settings", "groups"), (s) => { state.groups = (s.exists() && s.data().names) || []; emit(); }, onError),
    onSnapshot(collection(db, "blocked"), (s) => { state.blocked = new Set(s.docs.map((d) => d.id)); emit(); }, onError),
  ];
  return () => stops.forEach((stop) => stop());
}

export const setAdmin = (id, admin) => updateDoc(doc(db, "settings", "admins"), { uids: admin ? arrayUnion(id) : arrayRemove(id) });

/**
 * Removes someone's account: their groups, their profile and their admin rights, and their users/ document. Anyone can register, so they
 * can sign up again; to keep someone out, block them (setBlocked).
 */
export async function removePerson(id) {
  const batch = writeBatch(db);
  batch.delete(doc(db, "users", id));
  batch.delete(doc(db, "userProfiles", id));
  batch.delete(doc(db, "privateProfiles", id)); // allergies, payment link, friend list
  batch.update(doc(db, "settings", "admins"), { uids: arrayRemove(id) });
  await batch.commit();
}

/**
 * Blocks someone (no access at all, and they cannot register again: firestore.rules notBlocked()) or lets them back in. Their account
 * and data stay, so unblocking gives everything back.
 */
export const setBlocked = (id, blocked) => (blocked
  ? setDoc(doc(db, "blocked", id), { blockedAt: serverTimestamp() })
  : deleteDoc(doc(db, "blocked", id)));

/** A person's groups: only on an existing account (firestore.rules let admins change nothing else on it). */
export const setGroups = (id, groups) => updateDoc(doc(db, "users", id), { groups: [...new Set(groups)].sort() });

export const addGroup = (name) => setDoc(doc(db, "settings", "groups"), { names: arrayUnion(name) }, { merge: true });

/** Renames a group (newName) or deletes it (newName empty), in the list and in everyone's groups, in one write. current: what
 *  watchPeople last delivered ({ people, groups }). */
export async function changeGroup(name, newName, current) {
  const batch = writeBatch(db);
  const names = new Set(current.groups);
  names.delete(name);
  if (newName) names.add(newName);
  batch.set(doc(db, "settings", "groups"), { names: [...names].sort() }, { merge: true });
  for (const person of current.people.filter((p) => p.groups.includes(name) && p.registered)) {
    const groups = person.groups.filter((g) => g !== name);
    if (newName) groups.push(newName);
    batch.update(doc(db, "users", person.id), { groups: [...new Set(groups)].sort() });
  }
  await batch.commit();
}
