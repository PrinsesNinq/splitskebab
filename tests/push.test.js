// Push notifications: who gets which one and what it says (functions/notify-logic.js), and that the rules, the service worker and the
// app keep it to the device's owner and the app's own pages.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  messageRecipients, invitationRecipients, reminderRecipients, costChanges, devicesFor, notificationText, linkTo, dayInZone, formatDay, euro,
} from "../functions/notify-logic.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("a message goes to everyone in the chat but its writer", () => {
  assert.deepEqual(messageRecipients({ type: "direct", members: ["a@x", "b@x"] }, "a@x"), ["b@x"]);
  assert.deepEqual(messageRecipients(null, "a@x"), [], "no conversation, nobody");
});

test("feedback goes to the admins (not the writer if they are one), and the admins' answer to the person who gave it", () => {
  const convo = { type: "feedback", members: ["a@x"] };
  assert.deepEqual(messageRecipients(convo, "a@x", ["admin@x", "a@x"]), ["admin@x"]);
  assert.deepEqual(messageRecipients(convo, "admin@x", ["admin@x"]), ["a@x"]);
});

test("asked to come: everyone who sees the meal with rsvp, else the invited; never the host or who already answered", () => {
  const meal = { host: "h@x", viewers: ["h@x", "a@x", "b@x", "c@x"], participants: ["a@x"], declined: ["b@x"], invited: [], rsvp: true };
  assert.deepEqual(invitationRecipients(null, meal), ["c@x"]);
  assert.deepEqual(invitationRecipients(null, { ...meal, rsvp: false }), [], "without rsvp nobody is asked");
  assert.deepEqual(invitationRecipients(null, { ...meal, rsvp: false, invited: ["f@x"] }), ["f@x"]);
});

test("a change to a meal only tells the newly invited, not everyone again", () => {
  const before = { host: "h@x", invited: ["f@x"], participants: [], declined: [] };
  assert.deepEqual(invitationRecipients(before, { ...before, invited: ["f@x", "g@x"] }), ["g@x"]);
  assert.deepEqual(invitationRecipients(before, { ...before, title: "renamed" }), [], "an edit is not an invitation");
});

test("the reminder goes to whoever was asked and has not answered", () => {
  const meal = { host: "h@x", viewers: ["h@x", "a@x", "b@x"], participants: ["a@x"], declined: [], invited: [], rsvp: true };
  assert.deepEqual(reminderRecipients(meal), ["b@x"]);
  assert.deepEqual(reminderRecipients({ ...meal, rsvp: false, invited: ["a@x"] }), [], "everyone answered");
});

test("costs: only a new or raised amount is news, told to the others who ate", () => {
  const before = { participants: ["a@x", "b@x", "c@x"], costs: {} };
  const after = { ...before, costs: { "a@x": 1250 } };
  assert.deepEqual(costChanges(before, after), [{ payer: "a@x", cents: 1250, recipients: ["b@x", "c@x"] }]);
  assert.deepEqual(costChanges(after, { ...after, costs: { "a@x": 1000 } }), [], "lowered: a correction");
  assert.deepEqual(costChanges(after, { ...after, costs: {} }), [], "removed");
  assert.deepEqual(costChanges(after, { ...after, costs: { "a@x": 1250, "b@x": "lots" } }), [], "not a whole number of cents");
  assert.equal(costChanges(null, after).length, 1, "a meal that is created with costs");
});

test("only devices of the recipients that switched this kind on", () => {
  const devices = [
    { token: "1", owner: "a@x", types: ["messages", "meals"] },
    { token: "2", owner: "a@x", types: ["money"] },
    { token: "3", owner: "z@x", types: ["messages"] },
    { token: "4", owner: "a@x" },
  ];
  assert.deepEqual(devicesFor(devices, ["a@x"], "messages").map((d) => d.token), ["1"]);
});

test("the texts in English and Dutch, with people's words cut to fit", () => {
  assert.deepEqual(notificationText("invited", "nl", { name: "Anna", title: "Pasta", day: "2026-11-07", time: "18:30" }),
    { title: "Anna vraagt: eet je mee?", body: "Pasta op zaterdag 7 november om 18:30" });
  assert.deepEqual(notificationText("invited", "en", { name: "Anna", title: "Pasta", day: "2026-11-07" }),
    { title: "Anna asks: are you coming?", body: "Pasta on Saturday 7 November" });
  const long = notificationText("message", "en", { name: "B", text: "x\n".repeat(400) });
  assert.ok(long.body.length <= 160 && long.body.endsWith("…"));
  assert.match(notificationText("paid", "nl", { name: "A", title: "Taco's", amount: euro(1250, "nl") }).title, /€\s?12,50/);
  assert.deepEqual(notificationText("message", "fr", { name: "B", text: "hi" }), { title: "B", body: "hi" }, "another language: English");
  assert.throws(() => notificationText("nope", "en"));
});

test("dates: tomorrow in the Netherlands, also around midnight UTC and across summer and winter time", () => {
  assert.equal(dayInZone(new Date("2026-11-06T23:30:00Z"), "Europe/Amsterdam"), "2026-11-07", "already the 7th in Amsterdam");
  assert.equal(dayInZone(new Date("2026-11-06T15:00:00Z"), "Europe/Amsterdam", 1), "2026-11-07");
  assert.equal(dayInZone(new Date("2026-03-28T15:00:00Z"), "Europe/Amsterdam", 1), "2026-03-29", "the night the clocks go forward");
  assert.equal(dayInZone(new Date("2026-10-24T15:00:00Z"), "Europe/Amsterdam", 1), "2026-10-25", "the night the clocks go back");
  assert.equal(dayInZone(new Date("2026-12-31T15:00:00Z"), "Europe/Amsterdam", 1), "2027-01-01", "over the year boundary");
  assert.equal(formatDay("not a date", "en"), "");
});

test("a notification only links to the app's own pages, with the id escaped", () => {
  assert.equal(linkTo("chat.html", "c", "a@x|b@x"), "chat.html?c=a%40x%7Cb%40x");
  assert.throws(() => linkTo("https://evil.example/", "c", "x"));
  const sw = read("public/sw.js");
  const safeLink = new Function(`${/const safeLink = [^\n]+/.exec(sw)[0]}; return safeLink;`)();
  assert.equal(safeLink("chat.html?c=a%40x%7Cb%40x"), "chat.html?c=a%40x%7Cb%40x");
  assert.equal(safeLink("meal.html?id=abc123"), "meal.html?id=abc123");
  for (const bad of ["https://evil.example/", "//evil.example/x.html", "javascript:alert(1)", "../x.html", "chat.html?c=<script>", null]) {
    assert.equal(safeLink(bad), "index.html", String(bad));
  }
});

test("the service worker shows every push and opens the page on a tap", () => {
  const sw = read("public/sw.js");
  assert.match(sw, /addEventListener\('push'[\s\S]*?event\.waitUntil\(self\.registration\.showNotification\(/, "every push is shown (iPhones require it)");
  assert.match(sw, /addEventListener\('notificationclick'[\s\S]*?safeLink\(event\.notification\.data\?\.link\)/);
});

test("firestore.rules: a device is only read, written or removed by its owner, and holds nothing else", () => {
  const rules = read("firestore.rules");
  const block = rules.slice(rules.indexOf("match /devices/{token}"), rules.indexOf("// Friendships:"));
  assert.match(block, /allow get, delete: if signedIn\(\) && resource\.data\.owner == me\(\);/);
  assert.ok(!/allow (read|list)/.test(block), "nobody lists devices: only the server sends");
  assert.match(block, /allow create, update: if allowed\(\) &&/, "only someone with access registers a device");
  assert.match(block, /request\.resource\.data\.owner == me\(\)/, "only as yourself");
  assert.match(block, /keys\(\)\.hasOnly\(\['owner', 'lang', 'types', 'updatedAt'\]\)/);
  assert.match(block, /types\.hasOnly\(\['messages', 'meals', 'money'\]\)/);
});

test("signing out stops this device's notifications before the account is gone", () => {
  const all = read("public/js/auth.js");
  const auth = all.slice(all.indexOf("export async function signOutAndLeave"), all.indexOf('location.replace("login.html")'));
  assert.ok(auth.includes("disablePush()") && auth.indexOf("disablePush()") < auth.indexOf("fb.signOut(auth)"), "removed while still signed in");
});

test("the functions run in Europe, capped, and never log emails or message text", () => {
  const index = read("functions/index.js");
  assert.match(index, /region: "europe-west1", maxInstances: 5/);
  for (const call of index.match(/logger\.\w+\([^)]*\)/g) || []) assert.ok(!/email|text|name|recipients\b/.test(call), call);
  assert.match(read("firebase.json"), /"source": "functions"/);
});
