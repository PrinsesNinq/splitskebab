// One-time move from emails to uids as people's ids (see the top of firestore.rules). Every document that used an email as its id, or
// held emails in a list or a map, is rewritten with the person's Firebase uid (looked up from Google sign-in), and the old document is
// deleted, so no email is left readable in the data. Each original goes first into migrationBackup/ (no rule matches it: no app user can
// read it), to undo by hand if something went wrong. People an admin added who never signed in have no uid and are dropped.
//
// Called once over HTTP after the deploy that switches the app to uids: GET ?dry=1 only counts, without writing; a real run writes
// settings/migration.uidsDoneAt and refuses to run again. It answers with counts only (no ids, no emails). Remove the function afterwards.
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import * as logger from "firebase-functions/logger";
import {
  isEmail, makeMapper, mapList, emailsIn, remapCircle, remapMeal, remapFriendship, remapConversation, remapMessage, remapPrivateProfile,
} from "./migrate-logic.js";

async function uidsFor(emails) {
  const map = new Map();
  const all = [...emails];
  for (let i = 0; i < all.length; i += 100) {
    const res = await getAuth().getUsers(all.slice(i, i + 100).map((email) => ({ email })));
    for (const u of res.users) if (u.email) map.set(u.email.toLowerCase(), u.uid);
  }
  return map;
}

export async function migrateToUids({ dry }) {
  const db = getFirestore();
  const flag = db.doc("settings/migration");
  if (!dry && (await flag.get()).get("uidsDoneAt")) return { already: true };

  const names = ["users", "blocked", "userProfiles", "privateProfiles", "circles", "meals", "friendships", "conversations", "recipes", "devices"];
  const snaps = Object.fromEntries(await Promise.all(names.map(async (n) => [n, await db.collection(n).get()])));
  const admins = await db.doc("settings/admins").get();
  const messages = new Map(); // conversation id -> its message snapshots
  for (const c of snaps.conversations.docs) messages.set(c.id, await c.ref.collection("messages").get());

  // Every email anywhere, looked up in one go.
  const emails = new Set();
  for (const n of names) for (const d of snaps[n].docs) { emailsIn(d.id, emails); emailsIn(d.data(), emails); }
  emailsIn(admins.data() || {}, emails);
  for (const list of messages.values()) for (const d of list.docs) emailsIn(d.data(), emails);
  const map = await uidsFor(emails);
  const m = makeMapper(map);

  const report = { emails: emails.size, mapped: map.size, rewritten: {}, moved: {}, dropped: {} };
  const count = (kind, n) => { report[kind][n] = (report[kind][n] || 0) + 1; };
  const writer = dry ? null : db.bulkWriter();
  const backup = (path, data) => writer?.set(db.collection("migrationBackup").doc(path.replace(/\//g, "__")), { path, data, at: FieldValue.serverTimestamp() });
  const set = (path, data, opts) => writer?.set(db.doc(path), data, opts || {});
  const del = (path) => writer?.delete(db.doc(path));
  /** Moves a document to a new id (or drops it when there is none), keeping a backup of the original. */
  const move = (n, d, newId, data) => {
    backup(`${n}/${d.id}`, d.data());
    if (newId) { set(`${n}/${newId}`, data, { merge: true }); count("moved", n); } else count("dropped", n);
    del(`${n}/${d.id}`);
  };

  // Accounts, blocks: only the id changes (users keep registeredAt and groups; an older admin-added name or photo is not kept).
  for (const d of snaps.users.docs) {
    if (!isEmail(d.id)) continue;
    const { registeredAt, groups } = d.data();
    move("users", d, m(d.id), { ...(registeredAt ? { registeredAt } : {}), ...(Array.isArray(groups) ? { groups } : {}) });
  }
  for (const d of snaps.blocked.docs) if (isEmail(d.id)) move("blocked", d, m(d.id), d.data());

  // Profiles: the public one keeps name and photo only; what an older public profile still held goes to the private one.
  const pubByEmail = new Map(snaps.userProfiles.docs.filter((d) => isEmail(d.id)).map((d) => [d.id, d.data()]));
  const privDone = new Set();
  for (const d of snaps.privateProfiles.docs) {
    if (!isEmail(d.id)) continue;
    privDone.add(d.id);
    move("privateProfiles", d, m(d.id), remapPrivateProfile(d.data(), pubByEmail.get(d.id), m));
  }
  for (const d of snaps.userProfiles.docs) {
    if (!isEmail(d.id)) continue;
    const { displayName = null, photoUrl = null } = d.data();
    const uid = m(d.id);
    move("userProfiles", d, uid, { displayName, photoUrl });
    const legacy = remapPrivateProfile(null, d.data(), m);
    if (uid && !privDone.has(d.id) && Object.keys(legacy).length) set(`privateProfiles/${uid}`, legacy, { merge: true });
  }

  // The admin list: uids instead of emails.
  if (admins.exists && Array.isArray(admins.get("emails"))) {
    backup("settings/admins", admins.data());
    set("settings/admins", { uids: [...new Set([...mapList(admins.get("emails"), m), ...mapList(admins.get("uids"), m)])] });
    count("rewritten", "settings/admins");
  }

  // Documents that keep their id: the lists and maps inside are rewritten.
  const rewrite = (n, fn) => {
    for (const d of snaps[n].docs) {
      if (!emailsIn(d.data()).size) continue;
      backup(`${n}/${d.id}`, d.data());
      set(`${n}/${d.id}`, fn(d.data()));
      count("rewritten", n);
    }
  };
  rewrite("circles", (d) => remapCircle(d, m));
  rewrite("meals", (d) => remapMeal(d, m));
  rewrite("recipes", (d) => ({ ...d, owner: m(d.owner) || "" }));
  for (const d of snaps.devices.docs) {
    if (!isEmail(d.get("owner"))) continue;
    const owner = m(d.get("owner"));
    backup(`devices/${d.id}`, d.data());
    if (owner) { set(`devices/${d.id}`, { ...d.data(), owner }); count("rewritten", "devices"); } else { del(`devices/${d.id}`); count("dropped", "devices"); }
  }

  // Ids made of emails: friendships "a|b", conversations "a|b" and "feedback|a" (with their messages).
  for (const d of snaps.friendships.docs) {
    if (!emailsIn(d.data()).size && !isEmail(d.id)) continue;
    const next = remapFriendship(d.data(), m);
    move("friendships", d, next?.id, next?.data);
  }
  for (const d of snaps.conversations.docs) {
    if (!emailsIn(d.data()).size && !isEmail(d.id)) continue;
    const next = remapConversation(d.id, d.data(), m);
    for (const msg of messages.get(d.id).docs) {
      backup(`conversations/${d.id}/messages/${msg.id}`, msg.data());
      if (next) set(`conversations/${next.id}/messages/${msg.id}`, remapMessage(msg.data(), m));
      del(`conversations/${d.id}/messages/${msg.id}`);
    }
    move("conversations", d, next?.id, next?.data);
  }

  if (writer) {
    await writer.close();
    await flag.set({ uidsDoneAt: FieldValue.serverTimestamp(), report }, { merge: true });
  }
  logger.info("migration to uids", { dry: Boolean(dry), ...report });
  return { dry: Boolean(dry), ...report };
}
