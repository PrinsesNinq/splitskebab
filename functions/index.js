// Splitskebab's push notifications (Firebase Cloud Messaging), sent from here because sending needs the project's server credentials,
// which must never be in the browser. Who gets what is decided in notify-logic.js (unit tested); this file only reads Firestore and sends.
//
// A device that wants notifications has a devices/{token} document (written by its own app, public/js/push.js; firestore.rules):
//   { owner: uid, lang: "en" | "nl", types: ["messages" | "meals" | "money"], updatedAt }
// The messages are data-only: the app's own service worker (public/sw.js) shows them, so it decides the look and what a tap opens.
// Logs carry counts and ids, never names or message text.
import { onDocumentCreated, onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { setGlobalOptions } from "firebase-functions/v2";
import * as logger from "firebase-functions/logger";
import { initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import {
  messageRecipients, invitationRecipients, reminderRecipients, costChanges, devicesFor, notificationText, linkTo, dayInZone, euro,
} from "./notify-logic.js";

// Next to the database (eur3, Europe). A few instances at most: a bug can never run up a bill.
setGlobalOptions({ region: "europe-west1", maxInstances: 5, memory: "256MiB" });

initializeApp();
const db = getFirestore();

// FCM says these tokens are gone for good (app uninstalled, notifications turned off, browser data cleared): their device is removed.
const DEAD = new Set(["messaging/registration-token-not-registered", "messaging/invalid-registration-token"]);

// People are their uid everywhere (firestore.rules): a name comes from their public profile, never from an email.
async function nameOf(uid) {
  const snap = await db.doc(`userProfiles/${uid}`).get();
  const name = snap.exists ? snap.get("displayName") : "";
  return typeof name === "string" && name.trim() ? name.trim() : "Splitskebab";
}

/** Recipients who still have access: a blocked person gets nothing. */
async function notBlocked(uids) {
  if (!uids.length) return [];
  const snaps = await db.getAll(...uids.map((id) => db.doc(`blocked/${id}`)));
  return uids.filter((_, i) => !snaps[i].exists);
}

async function devicesOf(uids) {
  const out = [];
  for (let i = 0; i < uids.length; i += 30) {
    const snap = await db.collection("devices").where("owner", "in", uids.slice(i, i + 30)).get();
    for (const d of snap.docs) out.push({ token: d.id, owner: d.get("owner"), lang: d.get("lang"), types: d.get("types") });
  }
  return out;
}

/**
 * Sends one notification to the recipients' devices that have this kind switched on, each in its device's language.
 * text(lang) gives { title, body }; tag groups notifications that replace each other (one per chat or meal).
 */
async function notify({ kind, recipients, text, link, tag }) {
  const people = await notBlocked(recipients);
  const devices = devicesFor(await devicesOf(people), people, kind);
  if (!devices.length) return;
  const byLang = new Map();
  for (const d of devices) byLang.set(d.lang === "nl" ? "nl" : "en", [...(byLang.get(d.lang === "nl" ? "nl" : "en") || []), d.token]);
  let sent = 0;
  let removed = 0;
  for (const [lang, tokens] of byLang) {
    const { title, body } = text(lang);
    for (let i = 0; i < tokens.length; i += 500) {
      const batch = tokens.slice(i, i + 500);
      const res = await getMessaging().sendEachForMulticast({
        tokens: batch,
        data: { title, body, link, tag },
        webpush: { headers: { Urgency: "high", TTL: String(24 * 3600) } },
      });
      sent += res.successCount;
      await Promise.all(res.responses.map((r, j) => {
        if (r.success || !DEAD.has(r.error?.code)) return null;
        removed += 1;
        return db.doc(`devices/${batch[j]}`).delete().catch(() => {});
      }));
    }
  }
  logger.info("push sent", { kind, tag, devices: devices.length, sent, removed });
}

// ---- A new chat message ----
export const onNewMessage = onDocumentCreated("conversations/{cid}/messages/{mid}", async (event) => {
  const message = event.data?.data();
  if (!message || typeof message.from !== "string") return;
  const { cid } = event.params;
  const conversation = (await db.doc(`conversations/${cid}`).get()).data();
  if (!conversation) return;
  const feedback = conversation.type === "feedback";
  const giverWrote = feedback && conversation.members?.[0] === message.from;
  const admins = giverWrote ? ((await db.doc("settings/admins").get()).get("uids") || []) : [];
  const name = await nameOf(message.from);
  await notify({
    kind: "messages",
    recipients: messageRecipients(conversation, message.from, admins),
    text: (lang) => notificationText(!feedback ? "message" : giverWrote ? "feedback" : "feedbackAnswer", lang, { name, text: message.text }),
    link: linkTo("chat.html", "c", cid),
    tag: `chat-${cid}`,
  });
});

// ---- Meals: asked to come, and costs added ----
export const onMealWritten = onDocumentWritten("meals/{id}", async (event) => {
  const before = event.data?.before?.exists ? event.data.before.data() : null;
  const after = event.data?.after?.exists ? event.data.after.data() : null;
  if (!after) return;
  const { id } = event.params;
  const link = linkTo("meal.html", "id", id);
  const vars = { title: after.title, day: after.date, time: after.time };

  const asked = invitationRecipients(before, after);
  if (asked.length) {
    const name = await nameOf(after.host);
    await notify({ kind: "meals", recipients: asked, text: (lang) => notificationText("invited", lang, { ...vars, name }), link, tag: `meal-${id}` });
  }
  for (const change of costChanges(before, after)) {
    const name = await nameOf(change.payer);
    await notify({
      kind: "money",
      recipients: change.recipients,
      text: (lang) => notificationText("paid", lang, { ...vars, name, amount: euro(change.cents, lang) }),
      link,
      tag: `money-${id}`,
    });
  }
});

// ---- The day before: a reminder for whoever has not answered ----
export const mealReminders = onSchedule({ schedule: "0 16 * * *", timeZone: "Europe/Amsterdam" }, async () => {
  const tomorrow = dayInZone(new Date(), "Europe/Amsterdam", 1);
  const snap = await db.collection("meals").where("date", "==", tomorrow).limit(500).get();
  for (const doc of snap.docs) {
    const meal = doc.data();
    const recipients = reminderRecipients(meal);
    if (!recipients.length) continue;
    const name = await nameOf(meal.host);
    await notify({
      kind: "meals",
      recipients,
      text: (lang) => notificationText("reminder", lang, { title: meal.title, time: meal.time, name }),
      link: linkTo("meal.html", "id", doc.id),
      tag: `meal-${doc.id}`,
    });
  }
});
