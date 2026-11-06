// Push notifications on this device (Firebase Cloud Messaging). Switching them on asks the browser's permission, gets this device's
// push token and saves it as devices/{token} with the kinds chosen on the profile page and the app's language; functions/index.js
// sends to it and public/sw.js shows what arrives. It is per device: a phone and a laptop each choose for themselves.
//
// The browser decides where it works: Chrome, Edge and Firefox (also on Android); on an iPhone or iPad only once the app was added to
// the Home Screen (iOS 16.4 or later), never in a Safari tab. The permission can only be asked from a tap (the switch), never on its own.
import { SDK, app, db, configured } from "./firebase-init.js";

export const KINDS = ["messages", "meals", "money"];
const KEY = "push-device"; // { token, owner, types, lang, at }: what this device last saved
const REFRESH_MS = 7 * 24 * 3600 * 1000; // a token not seen for a long time is dropped by FCM; saving it weekly keeps it alive

const read = () => { try { return JSON.parse(localStorage.getItem(KEY)) || null; } catch { return null; } };
const write = (v) => { if (v) localStorage.setItem(KEY, JSON.stringify(v)); else localStorage.removeItem(KEY); };

const isIos = () => /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const installed = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

/**
 * What this device can do: "ok", "ios-install" (an iPhone in Safari: add it to the Home Screen first), "denied" (blocked in the
 * browser's settings) or "unsupported".
 */
export async function pushState() {
  if (!configured || !("serviceWorker" in navigator) || !("Notification" in window)) return "unsupported";
  if (!("PushManager" in window)) return isIos() && !installed() ? "ios-install" : "unsupported";
  const { isSupported } = await import(`${SDK}/firebase-messaging.js`);
  if (!(await isSupported().catch(() => false))) return "unsupported";
  return Notification.permission === "denied" ? "denied" : "ok";
}

/** The kinds this device gets, or [] when notifications are off here (or belong to someone else who signed in before). */
export function pushKinds(me) {
  const saved = read();
  return saved && saved.owner === me && window.Notification?.permission === "granted" ? saved.types : [];
}

async function messaging() {
  const m = await import(`${SDK}/firebase-messaging.js`);
  return { m, messaging: m.getMessaging(app) };
}

async function tokenNow() {
  const { m, messaging: msg } = await messaging();
  // Our own service worker (sw.js) receives the pushes: the SDK subscribes through its registration instead of loading its own worker.
  const registration = await navigator.serviceWorker.ready;
  return m.getToken(msg, { serviceWorkerRegistration: registration });
}

async function save(token, me, types, lang) {
  const { doc, setDoc, deleteDoc, serverTimestamp } = await import(`${SDK}/firebase-firestore.js`);
  const before = read();
  if (before?.token && before.token !== token && before.owner === me) await deleteDoc(doc(db, "devices", before.token)).catch(() => {});
  await setDoc(doc(db, "devices", token), { owner: me, lang, types, updatedAt: serverTimestamp() });
  write({ token, owner: me, types, lang, at: Date.now() });
}

/**
 * Switches notifications on (with these kinds) or changes the kinds. Must run from a tap: it may ask the permission. Throws "denied"
 * when the person (or the browser) says no.
 */
export async function enablePush(me, types, lang) {
  const kinds = KINDS.filter((k) => types.includes(k));
  if (!kinds.length) return disablePush();
  if (Notification.permission !== "granted" && (await Notification.requestPermission()) !== "granted") throw new Error("denied");
  await save(await tokenNow(), me, kinds, lang);
}

/** Switches notifications off on this device: the token is given back and its document removed, so nothing is sent here any more. */
export async function disablePush() {
  const saved = read();
  write(null);
  if (!saved?.token) return;
  const { doc, deleteDoc } = await import(`${SDK}/firebase-firestore.js`);
  await deleteDoc(doc(db, "devices", saved.token)).catch(() => {});
  const { m, messaging: msg } = await messaging();
  await m.deleteToken(msg).catch(() => {});
}

/**
 * At every start (js/app.js): when this device has notifications on for this person, the token is checked and saved again when it
 * changed, the language changed or a week went by. Someone else signed in on this device: theirs are switched off.
 */
export async function refreshPush(me, lang) {
  const saved = read();
  if (!saved) return;
  if (saved.owner !== me || window.Notification?.permission !== "granted") { await disablePush(); return; }
  if ((await pushState()) !== "ok") return;
  const token = await tokenNow();
  if (token !== saved.token || lang !== saved.lang || Date.now() - (saved.at || 0) > REFRESH_MS) await save(token, me, saved.types, lang);
}
