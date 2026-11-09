// Everything Splitskebab keeps in Firestore, and the live lists the pages share. Who may read and write what is enforced in
// firestore.rules; this module only shapes the data.
//
// People are known by their sign-in id (uid), never by their email (firestore.rules explains why): every "person", member, viewer, host,
// owner and map key below is a uid.
//
//   userProfiles/{uid}    { displayName, photoUrl }   public: every user reads (search), each writes their own (photoUrl: their Google
//                         photo or a small picture they chose, js/photo.js)
//   privateProfiles/{uid} { allergies: [allergen id], paymentLink, friends: [uid], readers: [uid], email? }   only the person and their
//                         readers (housemates, people at their meals, friends; kept up to date by js/app.js) read it; email only when
//                         they chose to show it (profile page)
//   circles/{id}          { name, type: "house" | "group", members: [uid], owner, admins: [uid], createdAt }   members read and change,
//                         the owner deletes; admins (the owner always, plus admins) see the analytics and choose other admins
//   meals/{id}            { title, date "YYYY-MM-DD", time "HH:MM", circleId, circleName, host, viewers: [uid], participants: [uid],
//                           declined: [uid], guests: [{ id, name }], rsvp, recipe: { source, id } | null, servings, have: [key],
//                           costs: { [uid]: cents } (each payer only writes their own), settled: ["from>to"], createdAt, updatedAt }
//                         (older meals have cost: { totalCents, paidBy } and settled: [eater id]; money.js readCosts() reads both)
//                         viewers (the circle's members when it was planned, plus anyone added) read and change it, the host deletes it
//   recipes/{id}          { name, servings, minutes, ingredients: [{ name, qty, unit }], allergens, steps, owner, createdAt }
//   friendships/{a|b}     { users: [a, b] (sorted), requester, status: "pending" | "accepted", createdAt, acceptedAt }
//                         id is the two uids sorted and joined by "|", so a pair can only have one; both read and delete it, the other
//                         one accepts it
//   meals also have invited: [uid], people asked to say yes or no (friends from outside the circle; with rsvp, everyone is asked),
//   and declineReasons: { [uid]: text }, why someone is not coming (optional, each writes only their own)
//
// The live lists (people, my circles, my meals, user recipes) are started once and shared by every page:
// with soft navigation the modules stay loaded, so switching pages shows the data at once.
import { SDK, db } from "./firebase-init.js";
import { cleanAllergens } from "./allergens.js";
import { missingViewers } from "./sharing.js";
import { safePhoto } from "./photo.js";
import { directId, feedbackId, preview, MAX_MESSAGE } from "./messaging.js";
import { readCosts, settleKey } from "./money.js";
import { t } from "./i18n.js";

const fs = await import(`${SDK}/firebase-firestore.js`);
const {
  collection, doc, onSnapshot, query, where, orderBy, limit, addDoc, getDoc, setDoc, updateDoc, deleteDoc, arrayUnion, arrayRemove, serverTimestamp,
  writeBatch,
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
// (allergies, payment link, friend list, and the email when they show it), readable only by the people on its readers list
// (housemates, people at their meals, friends; see firestore.rules).

/**
 * A person to draw: { id, name, photoUrl, email, allergies, paymentLink, friends, readers, detailsVisible }. email is "" unless they
 * chose to show it and I may read their private profile. detailsVisible says whether their allergies and payment link could be read:
 * false means "not shared with me (yet)", which the pages show as unknown, never as "no allergies" (that would hide a danger).
 */
function toPerson(id, pub = {}, priv = null) {
  return {
    id,
    name: text(pub.displayName, 100) || t("common.someone"),
    photoUrl: photo(pub.photoUrl),
    email: text(priv?.email, 200),
    allergies: cleanAllergens(priv?.allergies),
    paymentLink: safeLink(priv?.paymentLink),
    friends: strings(priv?.friends).slice(0, 500),
    readers: strings(priv?.readers),
    detailsVisible: Boolean(priv),
  };
}

let peopleMe = null;
/** Who I am (uid), for the private profiles I may read: js/app.js calls it before any page uses people. */
export function usePeopleFor(uid) { peopleMe = uid; }

/**
 * Everyone with a public profile, with the private details I may read: Map uid -> person (toPerson). Three live sources: every
 * public profile, the private profiles that list me as a reader, and my own private profile.
 */
export const people = shared((emit, fail) => {
  const state = { pub: null, priv: new Map(), mine: null };
  const send = () => {
    if (!state.pub) return;
    const privs = new Map(state.priv);
    if (peopleMe && state.mine) privs.set(peopleMe, state.mine);
    emit(new Map([...state.pub].map(([id, pub]) => [id, toPerson(id, pub, privs.get(id) || null)])));
  };
  onSnapshot(collection(db, "userProfiles"), (snap) => { state.pub = new Map(snap.docs.map((d) => [d.id, d.data()])); send(); }, fail);
  if (peopleMe) {
    onSnapshot(query(collection(db, "privateProfiles"), where("readers", "array-contains", peopleMe)),
      (snap) => { state.priv = new Map(snap.docs.map((d) => [d.id, d.data()])); send(); }, fail);
    onSnapshot(doc(db, "privateProfiles", peopleMe), (snap) => { state.mine = snap.exists() ? snap.data() : {}; send(); }, fail);
  }
});

/** A person to show, also when they have no profile (yet): "Someone" as the name. */
export function person(id, map = people.value) {
  return map?.get(id) || toPerson(id, {});
}

/** My name and photo as others see them (photoUrl: a safe https address or small picture data URL, or null for my initial). */
export const saveMyIdentity = (uid, { displayName, photoUrl }) =>
  setDoc(doc(db, "userProfiles", uid), { displayName: text(displayName, 100) || null, photoUrl: safePhoto(photoUrl) }, { merge: true });

/** My list of friends on my private profile (js/app.js keeps it in step with my accepted friendships), for friends of friends. */
export const saveMyFriendList = (uid, friends) =>
  setDoc(doc(db, "privateProfiles", uid), { friends: [...new Set(friends)].sort().slice(0, 500) }, { merge: true });

/** Who may read my private profile (js/sharing.js profileReaders, kept up to date by js/app.js). */
export const saveMyReaders = (uid, readers) =>
  setDoc(doc(db, "privateProfiles", uid), { readers }, { merge: true });

export const saveMyProfile = (uid, { allergies, paymentLink }) =>
  setDoc(doc(db, "privateProfiles", uid), { allergies: cleanAllergens(allergies), paymentLink: safeLink(paymentLink) }, { merge: true });

/**
 * Shows my email to the people I am connected to (my own sign-in email: firestore.rules accept no other), or takes it off again.
 */
export const showMyEmail = (uid, email) =>
  setDoc(doc(db, "privateProfiles", uid), { email: email ? email.toLowerCase() : deleteField() }, { merge: true });

// ---- Houses and groups ----

function toCircle(id, d) {
  return { id, name: text(d.name, 60) || "?", type: d.type === "group" ? "group" : "house", members: strings(d.members), owner: text(d.owner), admins: strings(d.admins) };
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
export const addMember = (id, uid) => updateDoc(doc(db, "circles", id), { members: arrayUnion(uid) });
// Someone who leaves (or is removed) stops being an admin too; when they were not one, removing them from admins changes nothing.
export const removeMember = (id, uid) => updateDoc(doc(db, "circles", id), { members: arrayRemove(uid), admins: arrayRemove(uid) });
/** Makes a member an admin of the house or group, or not (only admins may: firestore.rules). The creator always is. */
export const setCircleAdmin = (id, uid, admin) => updateDoc(doc(db, "circles", id), { admins: admin ? arrayUnion(uid) : arrayRemove(uid) });
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
// My reason lives at declineReasons.{my uid}, addressed with a FieldPath (an id is never put inside a dotted path string).
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
export const inviteToMeal = (id, uids) => updateMeal(id, { viewers: arrayUnion(...uids), invited: arrayUnion(...uids) });

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

/** The uids of my accepted friends. */
export const friendIds = (friendships) => (friendships || []).filter((f) => f.status === "accepted").map((f) => f.other);

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

// ---- Messages ----
// conversations/{id}      { type: "direct" | "feedback", members: [uid], lastMessage: { text, from }, lastAt, readAt: { uid: time },
//                           createdAt }; direct: id "a|b" (js/messaging.js directId), feedback: "feedback|<uid>", also read by admins
// conversations/{id}/messages/{id}   { from, text, at, editedAt?, reactions?: { emoji: [uid] } }
// Only someone I am connected to (housemate, meal guest, friend) can be messaged: firestore.rules connectedTo().

const millis = (ts) => (ts && typeof ts.toMillis === "function" ? ts.toMillis() : 0);

function toConversation(id, d) {
  const readAt = {};
  for (const [uid, ts] of Object.entries(d.readAt || {})) readAt[uid] = millis(ts);
  return {
    id,
    type: d.type === "feedback" ? "feedback" : "direct",
    members: strings(d.members),
    lastText: text(d.lastMessage?.text, 160),
    lastFrom: text(d.lastMessage?.from),
    lastAt: millis(d.lastAt),
    readAt,
  };
}

let convosFor = null;
let convosList = null;
/** My conversations (direct ones and my own feedback), newest first. */
export function myConversations(me) {
  if (convosFor !== me) {
    convosFor = me;
    convosList = shared((emit, fail) => onSnapshot(query(collection(db, "conversations"), where("members", "array-contains", me), orderBy("lastAt", "desc"), limit(200)),
      (snap) => emit(snap.docs.map((d) => toConversation(d.id, d.data()))), fail));
  }
  return convosList;
}

/** Every feedback conversation, newest first: the admins' inbox (firestore.rules lets only admins read other people's). */
export const feedbackInbox = shared((emit, fail) => onSnapshot(query(collection(db, "conversations"), where("type", "==", "feedback"), orderBy("lastAt", "desc"), limit(300)),
  (snap) => emit(snap.docs.map((d) => toConversation(d.id, d.data()))), fail));

/** One conversation, live: cb(conversation | null, error). */
export function watchConversation(id, cb) {
  return onSnapshot(doc(db, "conversations", id), (snap) => cb(snap.exists() ? toConversation(snap.id, snap.data()) : null), (err) => cb(null, err));
}

/** The newest 200 messages of a conversation, oldest first, live: cb(messages, error). */
export function watchMessages(id, cb) {
  return onSnapshot(query(collection(db, "conversations", id, "messages"), orderBy("at", "desc"), limit(200)),
    (snap) => cb(snap.docs.map((d) => {
      const m = d.data();
      return {
        id: d.id,
        from: text(m.from),
        text: typeof m.text === "string" ? m.text.slice(0, MAX_MESSAGE) : "",
        at: millis(m.at) || Date.now(), // a message I just sent has no server time yet
        edited: Boolean(m.editedAt),
        reactions: m.reactions && typeof m.reactions === "object" ? m.reactions : {},
      };
    }).reverse()), (err) => cb([], err));
}

/** Opens (and creates when needed) the direct conversation with someone; returns its id. firestore.rules refuse a stranger. */
export async function openDirect(me, other) {
  const id = directId(me, other);
  const ref = doc(db, "conversations", id);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, { type: "direct", members: [me, other].sort(), lastMessage: null, lastAt: null, readAt: {}, createdAt: serverTimestamp() });
  }
  return id;
}

/** Opens (and creates when needed) my feedback conversation with the admins; returns its id. */
export async function openFeedback(me) {
  const id = feedbackId(me);
  const ref = doc(db, "conversations", id);
  if (!(await getDoc(ref)).exists()) {
    await setDoc(ref, { type: "feedback", members: [me], lastMessage: null, lastAt: null, readAt: {}, createdAt: serverTimestamp() });
  }
  return id;
}

/** Sends a message: the message and the conversation's summary (and my read time) in one write, so the list never shows half of it. */
export async function sendMessage(conversationId, me, body) {
  const message = String(body || "").trim().slice(0, MAX_MESSAGE);
  if (!message) return;
  const batch = writeBatch(db);
  batch.set(doc(collection(db, "conversations", conversationId, "messages")), { from: me, text: message, at: serverTimestamp() });
  batch.update(doc(db, "conversations", conversationId), "lastMessage", { text: preview(message), from: me }, "lastAt", serverTimestamp(), new FieldPath("readAt", me), serverTimestamp());
  await batch.commit();
}

/** I have read the conversation up to now. */
export const markRead = (conversationId, me) => updateDoc(doc(db, "conversations", conversationId), new FieldPath("readAt", me), serverTimestamp());

export const editMessage = (conversationId, messageId, body) =>
  updateDoc(doc(db, "conversations", conversationId, "messages", messageId), { text: String(body || "").trim().slice(0, MAX_MESSAGE), editedAt: serverTimestamp() });
export const deleteMessage = (conversationId, messageId) => deleteDoc(doc(db, "conversations", conversationId, "messages", messageId));
export const setReactions = (conversationId, messageId, reactions) =>
  updateDoc(doc(db, "conversations", conversationId, "messages", messageId), { reactions });