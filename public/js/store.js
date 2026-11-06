// Everything Splitskebab keeps in Firestore, and the live lists the pages share. Who may read and write what is enforced in
// firestore.rules; this module only shapes the data.
//
//   userProfiles/{email}  { displayName, photoUrl }   public: every user reads (search), each writes their own (photoUrl: their Google
//                         photo or a small picture they chose, js/photo.js)
//   privateProfiles/{email} { allergies: [allergen id], paymentLink, friends: [email], readers: [email] }   only the person and their
//                         readers (housemates, people at their meals, friends; kept up to date by js/app.js) read it
//   circles/{id}          { name, type: "house" | "group", members: [email], owner, createdAt }   members read and change, the owner deletes
//   meals/{id}            { title, date "YYYY-MM-DD", time "HH:MM", circleId, circleName, host, viewers: [email], participants: [email],
//                           declined: [email], guests: [{ id, name }], rsvp, recipe: { source, id } | null, servings, have: [key],
//                           costs: { [email]: cents } (each payer only writes their own), settled: ["from>to"], createdAt, updatedAt }
//                         (older meals have cost: { totalCents, paidBy } and settled: [eater id]; money.js readCosts() reads both)
//                         viewers (the circle's members when it was planned, plus anyone added) read and change it, the host deletes it
//   recipes/{id}          { name, servings, minutes, ingredients: [{ name, qty, unit }], allergens, steps, owner, createdAt }
//   friendships/{a|b}     { users: [a, b] (sorted), requester, status: "pending" | "accepted", createdAt, acceptedAt }
//                         id is the two emails sorted and joined by "|", so a pair can only have one; both read and delete it, the other
//                         one accepts it
//   meals also have invited: [email], people asked to say yes or no (friends from outside the circle; with rsvp, everyone is asked),
//   and declineReasons: { [email]: text }, why someone is not coming (optional, each writes only their own)
//
// Emails are lowercase everywhere. The live lists (people, my circles, my meals, user recipes) are started once and shared by every page:
// with soft navigation the modules stay loaded, so switching pages shows the data at once.
import { SDK, db } from "./firebase-init.js";
import { cleanAllergens } from "./allergens.js";
import { missingViewers } from "./sharing.js";
import { safePhoto } from "./photo.js";
import { readCosts, settleKey } from "./money.js";

const fs = await import(`${SDK}/firebase-firestore.js`);
const {
  collection, doc, onSnapshot, query, where, orderBy, limit, addDoc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp,
  FieldPath, deleteField,
} = fs;

const text = (v, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const strings = (v) => (Array.isArray(v) ? [...new Set(v.filter((x) => typeof x === "string" && x))] : []);
const photo = safePhoto;
/** A payment link people may follow: https only (never javascript: or data:), and of a sane size. */
export const safeLink = (v) => (typeof v === "string" && /^https:\/\/[^\s"'<>]+$/i.test(v.trim()) && v.trim().length <= 300 ? v.trim() : "");

/** One live Firestore listener behind many subscribers: subscribe(cb) gets the latest value now (when there is one) and every change. */
function shared(start) {
  const subs = new Set();
  let value;
  let started = false;
  return {
    subscribe(cb) {
      subs.add(cb);
      if (value !== undefined) cb(value);
      if (!started) {
        started = true;
        start(
          (next) => { value = next; for (const f of subs) f(value); },
          (err) => { console.error(err); for (const f of subs) f(undefined, err); },
        );
      }
      return () => subs.delete(cb);
    },
    get value() { return value; },
  };
}

// ---- People ----
// A person is two documents: the public profile (name and photo, everyone with an account reads it: search) and the private profile
// (allergies, payment link, friend list), readable only by the people on its readers list (housemates, people at their meals, friends;
// see firestore.rules). Profiles from before the split still have those fields on the public profile: they are read from there until
// the person's app moves them (migrateMyProfile).

const LEGACY_PRIVATE = ["allergies", "paymentLink", "friends"];

/**
 * A person to draw. detailsVisible says whether their allergies and payment link could be read: false means "not shared with me
 * (yet)", which the pages show as unknown, never as "no allergies" (that would hide a danger).
 */
function toPerson(email, pub = {}, priv = null) {
  const legacy = LEGACY_PRIVATE.some((k) => k in pub);
  const details = priv || (legacy ? pub : null);
  return {
    email,
    name: text(pub.displayName, 100) || email.split("@")[0],
    photoUrl: photo(pub.photoUrl),
    allergies: cleanAllergens(details?.allergies),
    paymentLink: safeLink(details?.paymentLink),
    friends: strings(details?.friends).slice(0, 500),
    readers: strings(priv?.readers),
    detailsVisible: Boolean(details),
  };
}

let peopleMe = null;
/** Who I am, for the private profiles I may read: js/app.js calls it before any page uses people. */
export function usePeopleFor(email) { peopleMe = email; }

/**
 * Everyone with a public profile, with the private details I may read: Map email -> person (toPerson). Three live sources: every
 * public profile, the private profiles that list me as a reader, and my own private profile.
 */
export const people = shared((emit, fail) => {
  const state = { pub: null, priv: new Map(), mine: null };
  const send = () => {
    if (!state.pub) return;
    const privs = new Map(state.priv);
    if (peopleMe && state.mine) privs.set(peopleMe, state.mine);
    emit(new Map([...state.pub].map(([email, pub]) => [email, toPerson(email, pub, privs.get(email) || null)])));
  };
  onSnapshot(collection(db, "userProfiles"), (snap) => { state.pub = new Map(snap.docs.map((d) => [d.id, d.data()])); send(); }, fail);
  if (peopleMe) {
    onSnapshot(query(collection(db, "privateProfiles"), where("readers", "array-contains", peopleMe)),
      (snap) => { state.priv = new Map(snap.docs.map((d) => [d.id, d.data()])); send(); }, fail);
    onSnapshot(doc(db, "privateProfiles", peopleMe), (snap) => { state.mine = snap.exists() ? snap.data() : {}; send(); }, fail);
  }
});

/** A person to show, also when they never signed in (no profile yet): their email's first part as the name. */
export function person(email, map = people.value) {
  return map?.get(email) || toPerson(email, {});
}

/**
 * Moves my allergies, payment link and friend list from the public profile (where they were before the split) to my private one,
 * then takes them off the public one, so strangers can no longer read them. Does nothing when there is nothing to move. A value already
 * in my private profile wins (it is newer).
 */
export async function migrateMyProfile(email) {
  const pubRef = doc(db, "userProfiles", email);
  const pub = (await getDoc(pubRef)).data() || {};
  const fields = LEGACY_PRIVATE.filter((k) => k in pub);
  if (!fields.length) return false;
  const privRef = doc(db, "privateProfiles", email);
  const priv = (await getDoc(privRef)).data() || {};
  const copy = {};
  for (const k of fields) if (!(k in priv) && pub[k] != null) copy[k] = k === "allergies" ? cleanAllergens(pub[k]) : k === "paymentLink" ? safeLink(pub[k]) : strings(pub[k]).slice(0, 500);
  if (Object.keys(copy).length) await setDoc(privRef, copy, { merge: true });
  await updateDoc(pubRef, Object.fromEntries(fields.map((k) => [k, deleteField()])));
  return true;
}

/** My name and photo as others see them (photoUrl: a safe https address or small picture data URL, or null for my initial). */
export async function saveMyIdentity(email, { displayName, photoUrl }) {
  await migrateMyProfile(email); // the public profile may only hold name and photo (firestore.rules)
  await setDoc(doc(db, "userProfiles", email), { displayName: text(displayName, 100) || null, photoUrl: safePhoto(photoUrl) }, { merge: true });
}

/** My list of friends on my private profile (js/app.js keeps it in step with my accepted friendships), for friends of friends. */
export const saveMyFriendList = (email, friends) =>
  setDoc(doc(db, "privateProfiles", email), { friends: [...new Set(friends)].sort().slice(0, 500) }, { merge: true });

/** Who may read my private profile (js/sharing.js profileReaders, kept up to date by js/app.js). */
export const saveMyReaders = (email, readers) =>
  setDoc(doc(db, "privateProfiles", email), { readers }, { merge: true });

export const saveMyProfile = (email, { allergies, paymentLink }) =>
  setDoc(doc(db, "privateProfiles", email), { allergies: cleanAllergens(allergies), paymentLink: safeLink(paymentLink) }, { merge: true });
// ---- Houses and groups ----

function toCircle(id, d) {
  return { id, name: text(d.name, 60) || "?", type: d.type === "group" ? "group" : "house", members: strings(d.members), owner: text(d.owner) };
}

let circlesFor = null;
let circlesList = null;
/** The houses and groups I am in, sorted by name. */
export function myCircles(me) {
  if (circlesFor !== me) {
    circlesFor = me;
    circlesList = shared((emit, fail) => onSnapshot(query(collection(db, "circles"), where("members", "array-contains", me)),
      (snap) => emit(snap.docs.map((d) => toCircle(d.id, d.data())).sort((a, b) => a.name.localeCompare(b.name))), fail));
  }
  return circlesList;
}

export const createCircle = (me, { name, type }) => addDoc(collection(db, "circles"), {
  name: text(name, 60), type: type === "group" ? "group" : "house", members: [me], owner: me, createdAt: serverTimestamp(),
});
export const renameCircle = (id, name) => updateDoc(doc(db, "circles", id), { name: text(name, 60) });
export const addMember = (id, email) => updateDoc(doc(db, "circles", id), { members: arrayUnion(email.toLowerCase()) });
export const removeMember = (id, email) => updateDoc(doc(db, "circles", id), { members: arrayRemove(email) });
export const deleteCircle = (id) => deleteDoc(doc(db, "circles", id));

// ---- Meals ----

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

/** A stored meal, checked field by field (every viewer can write it, so nothing in it is trusted). */
export function toMeal(id, d) {
  const { costs, settled } = readCosts(d);
  // The older one-payer cost, kept apart only so its payer can retire it when they write their own entry (setMyCost).
  const legacyPayer = d.cost && typeof d.cost.paidBy === "string" ? d.cost.paidBy : null;
  const recipe = d.recipe && (d.recipe.source === "builtin" || d.recipe.source === "user") && typeof d.recipe.id === "string"
    ? { source: d.recipe.source, id: d.recipe.id } : null;
  return {
    id,
    title: text(d.title, 80),
    date: DATE.test(d.date) ? d.date : "",
    time: TIME.test(d.time) ? d.time : "",
    circleId: text(d.circleId, 100),
    circleName: text(d.circleName, 60),
    host: text(d.host),
    viewers: strings(d.viewers),
    participants: strings(d.participants),
    declined: strings(d.declined),
    invited: strings(d.invited),
    declineReasons: new Map(d.declineReasons && typeof d.declineReasons === "object"
      ? Object.entries(d.declineReasons).filter(([, r]) => typeof r === "string" && r.trim()).map(([e, r]) => [e, r.trim().slice(0, 200)]) : []),
    guests: Array.isArray(d.guests) ? d.guests.filter((g) => g && typeof g.id === "string" && typeof g.name === "string").map((g) => ({ id: g.id.slice(0, 40), name: g.name.trim().slice(0, 60) })) : [],
    rsvp: d.rsvp === true,
    recipe,
    servings: Number.isInteger(d.servings) && d.servings > 0 ? Math.min(d.servings, 50) : null,
    have: strings(d.have),
    costs,
    settledPairs: settled,
    legacyPayer,
  };
}

let mealsFor = null;
let mealsList = null;
/** Every meal I can see (newest 500), sorted by date and time. */
export function myMeals(me) {
  if (mealsFor !== me) {
    mealsFor = me;
    mealsList = shared((emit, fail) => onSnapshot(query(collection(db, "meals"), where("viewers", "array-contains", me), orderBy("date", "desc"), limit(500)),
      (snap) => emit(snap.docs.map((d) => toMeal(d.id, d.data())).filter((m) => m.date).sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time))), fail));
  }
  return mealsList;
}

/** One meal, live: cb(meal | null when it does not exist or I may not see it, error). Returns the function that stops listening. */
export function watchMeal(id, cb) {
  return onSnapshot(doc(db, "meals", id), (snap) => cb(snap.exists() ? toMeal(snap.id, snap.data()) : null), (err) => cb(null, err));
}

export async function createMeal(me, meal) {
  const ref = await addDoc(collection(db, "meals"), {
    invited: [], ...meal, host: me, have: [], costs: {}, settled: [], createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export const updateMeal = (id, patch) => updateDoc(doc(db, "meals", id), { ...patch, updatedAt: serverTimestamp() });
export const deleteMeal = (id) => deleteDoc(doc(db, "meals", id));

export const DECLINE_REASON_MAX = 200;
// My reason lives at declineReasons.{my email}; emails contain dots, so it is addressed with a FieldPath, not "declineReasons.x".
const myReason = (me) => new FieldPath("declineReasons", me);

/** I join: no longer marked as not coming, and my reason for not coming goes. */
export const joinMeal = (id, me) => updateDoc(doc(db, "meals", id),
  "participants", arrayUnion(me), "declined", arrayRemove(me), "viewers", arrayUnion(me), myReason(me), deleteField(), "updatedAt", serverTimestamp());

/** I am not coming, with an optional reason everyone at the table sees (only mine is written: firestore.rules). */
export function declineMeal(id, me, reason = "") {
  const text = String(reason || "").trim().slice(0, DECLINE_REASON_MAX);
  return updateDoc(doc(db, "meals", id),
    "participants", arrayRemove(me), "declined", arrayUnion(me), myReason(me), text || deleteField(), "updatedAt", serverTimestamp());
}
export const setHave = (id, key, has) => updateMeal(id, { have: has ? arrayUnion(key) : arrayRemove(key) });
/** Marks the payment from one person to another as paid (or not): settled holds "from>to" (money.js settleKey). */
export const setSettled = (id, from, to, paid) => updateMeal(id, { settled: paid ? arrayUnion(settleKey(from, to)) : arrayRemove(settleKey(from, to)) });

/**
 * My own costs for a meal (cents), or null to take them away. Only my entry is written: everyone adds their own receipt, and
 * firestore.rules refuses a change to someone else's. Emails contain dots, so the field is addressed with a FieldPath, not "costs.x".
 * If I paid an older meal's one-payer cost, writing mine retires it (my entry replaces it).
 */
export function setMyCost(meal, me, cents) {
  const extra = meal.legacyPayer === me ? ["cost", null] : [];
  return updateDoc(doc(db, "meals", meal.id), new FieldPath("costs", me), cents == null ? deleteField() : cents, "updatedAt", serverTimestamp(), ...extra);
}
/**
 * Gives everyone in a house or group access to its meals, also the ones planned before they joined. A meal is only readable by its
 * viewers (firestore.rules), and viewers is filled in when the meal is planned: without this, someone added to the house later sees
 * none of its meals. Run by any member's app (js/app.js); it only writes when someone is missing, so it settles after one round.
 * Meals older than 60 days are left alone (no point in sharing old dinners, and it keeps the writes few).
 */
export async function shareCircleMeals(circles, meals, today) {
  const todo = missingViewers(circles, meals, today);
  await Promise.all(todo.map(({ id, missing }) => updateDoc(doc(db, "meals", id), { viewers: arrayUnion(...missing) })));
  return todo.length;
}

/** Asks people (friends from outside the circle) to say yes or no: they can see the meal from now on. */
export const inviteToMeal = (id, emails) => updateMeal(id, { viewers: arrayUnion(...emails), invited: arrayUnion(...emails) });

/** Whether I am asked to answer for this meal (and have not yet): everyone when the host asked everyone, else the people invited. */
export const awaitsMyAnswer = (meal, me) =>
  meal.host !== me && !meal.participants.includes(me) && !meal.declined.includes(me) && (meal.rsvp || meal.invited.includes(me));

// ---- Friends ----

export const friendshipId = (a, b) => [a, b].sort().join("|");

function toFriendship(id, d, me) {
  const users = strings(d.users);
  if (users.length !== 2 || !users.includes(me)) return null;
  return { id, other: users.find((u) => u !== me), status: d.status === "accepted" ? "accepted" : "pending", requester: text(d.requester) };
}

let friendsFor = null;
let friendsList = null;
/** My friendships, accepted and pending (both directions): [{ id, other, status, requester }]. */
export function myFriendships(me) {
  if (friendsFor !== me) {
    friendsFor = me;
    friendsList = shared((emit, fail) => onSnapshot(query(collection(db, "friendships"), where("users", "array-contains", me)),
      (snap) => emit(snap.docs.map((d) => toFriendship(d.id, d.data(), me)).filter(Boolean)), fail));
  }
  return friendsList;
}

/** The emails of my accepted friends. */
export const friendEmails = (friendships) => (friendships || []).filter((f) => f.status === "accepted").map((f) => f.other);

export const requestFriend = (me, other) => setDoc(doc(db, "friendships", friendshipId(me, other)), {
  users: [me, other].sort(), requester: me, status: "pending", createdAt: serverTimestamp(),
});
export const acceptFriend = (id) => updateDoc(doc(db, "friendships", id), { status: "accepted", acceptedAt: serverTimestamp() });
/** Declines a request, cancels mine, or ends a friendship: the same delete. */
export const removeFriendship = (id) => deleteDoc(doc(db, "friendships", id));

// ---- User recipes ----

/** Every recipe users added (raw documents with their id; js/recipe-logic.js toRecipe() checks and shapes them). */
export const userRecipes = shared((emit, fail) => onSnapshot(query(collection(db, "recipes"), limit(300)),
  (snap) => emit(snap.docs.map((d) => ({ ...d.data(), id: d.id }))), fail));

export async function saveRecipe(me, id, recipe) {
  const data = {
    name: text(recipe.name, 80),
    servings: Math.min(50, Math.max(1, Math.round(Number(recipe.servings) || 4))),
    minutes: Math.min(600, Math.max(0, Math.round(Number(recipe.minutes) || 0))),
    ingredients: recipe.ingredients.slice(0, 60).map((i) => ({ name: text(i.name, 80), qty: Number(i.qty) > 0 ? Math.min(Number(i.qty), 100000) : null, unit: i.unit || "" })).filter((i) => i.name),
    allergens: cleanAllergens(recipe.allergens),
    steps: text(recipe.steps, 5000),
    owner: me,
  };
  if (id) {
    await updateDoc(doc(db, "recipes", id), data);
    return id;
  }
  return (await addDoc(collection(db, "recipes"), { ...data, createdAt: serverTimestamp() })).id;
}

export const deleteRecipe = (id) => deleteDoc(doc(db, "recipes", id));
