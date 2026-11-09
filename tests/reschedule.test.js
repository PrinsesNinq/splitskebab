// Moving a meal (dragging it on the calendar, or editing its day or time): the people who were asked to come answer again, they get a
// push and a fresh notification, and nobody else's answer changes.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { moves, askedAgain, rescheduleChanges } from "../public/js/reschedule.js";
import { moveRecipients, notificationText } from "../functions/notify-logic.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const rsvpMeal = {
  host: "uH", date: "2026-11-13", time: "18:30", rsvp: true, invited: [],
  viewers: ["uH", "uA", "uB", "uC", "uMe"], participants: ["uH", "uA", "uMe"], declined: ["uB"],
};

test("only another date or time is a move", () => {
  assert.equal(moves(rsvpMeal, { date: "2026-11-13", time: "18:30" }), false);
  assert.equal(moves(rsvpMeal, { date: "2026-11-14", time: "18:30" }), true);
  assert.equal(moves(rsvpMeal, { date: "2026-11-13", time: "19:00" }), true);
  assert.equal(moves({ ...rsvpMeal, time: "" }, { date: "2026-11-13" }), false, "no time either way");
});

test("asked everyone: all who answered answer again, except the host and whoever moved it", () => {
  assert.deepEqual(askedAgain(rsvpMeal, "uMe").sort(), ["uA", "uB"]);
  assert.deepEqual(rescheduleChanges(rsvpMeal, "uMe", { date: "2026-11-14", time: "" }),
    { date: "2026-11-14", time: "", participants: ["uH", "uMe"], declined: [] });
});

test("without asking everyone: only the invited friends answer again; housemates simply ticked stay ticked", () => {
  const meal = { ...rsvpMeal, rsvp: false, invited: ["uF", "uG"], viewers: [...rsvpMeal.viewers, "uF", "uG"], participants: ["uH", "uA", "uF"], declined: ["uG"] };
  assert.deepEqual(askedAgain(meal, "uMe").sort(), ["uF", "uG"]);
  const next = rescheduleChanges(meal, "uMe", { date: "2026-11-20", time: "19:00" });
  assert.deepEqual(next.participants, ["uH", "uA"]);
  assert.deepEqual(next.declined, []);
  assert.deepEqual(askedAgain({ ...meal, invited: [] }, "uMe"), [], "nobody asked: nothing to ask again (no question before moving)");
});

test("the push: everyone asked without an answer after the move, not the ones invited in the same change, and nothing without a move", () => {
  const after = { ...rsvpMeal, date: "2026-11-14", ...rescheduleChanges(rsvpMeal, "uMe", { date: "2026-11-14", time: "18:30" }) };
  assert.deepEqual(moveRecipients(rsvpMeal, after).sort(), ["uA", "uB", "uC"], "uC never answered: told as well");
  assert.deepEqual(moveRecipients(rsvpMeal, { ...rsvpMeal, title: "renamed" }), []);
  assert.deepEqual(moveRecipients(null, after), [], "a new meal is an invitation, not a move");
  const withNew = { ...after, rsvp: false, invited: ["uN"], viewers: [...after.viewers, "uN"] };
  assert.ok(!moveRecipients({ ...rsvpMeal, rsvp: false, invited: [] }, withNew).includes("uN"));
  assert.deepEqual(notificationText("moved", "nl", { title: "Pasta", day: "2026-11-14", time: "18:30" }),
    { title: "Pasta is verplaatst", body: "Nu op zaterdag 14 november om 18:30. Eet je nog mee?" });
});

test("the calendar lets meals be dragged (a short press on a phone), and puts one back when the move is cancelled or refused", () => {
  const cal = read("public/js/calendar.js");
  assert.match(cal, /editable: Boolean\(onMove\),/);
  assert.match(cal, /eventDurationEditable: false,/);
  assert.match(cal, /eventLongPressDelay: 400,/);
  assert.match(cal, /onMove\(info\.event\.id, \{ date, time \}, info\.revert\);/);
  const home = read("public/js/home.js");
  assert.match(home, /if \(again\.length && !window\.confirm\(t\("home\.moveConfirm"[\s\S]*?\{ revert\(\); return; \}/, "asks first when people answer again");
  assert.match(home, /if \(!done\) revert\(\);/);
  assert.match(home, /updateMeal\(id, rescheduleChanges\(meal, me, to\)\)/);
});

test("editing the day or time on the meal page asks again the same way", () => {
  assert.match(read("public/js/meal.js"), /updateMeal\(id, \{ title, \.\.\.\(moving \? rescheduleChanges\(meal, me, to\) : \{\}\) \}\)/);
});

test("a moved meal is a new notification in the bell, not one already seen", () => {
  const app = read("public/js/app.js");
  assert.match(app, /id: `invite-\$\{meal\.id\}-\$\{meal\.date\}`/);
  assert.match(app, /read: read\.has\(`invite-\$\{meal\.id\}-\$\{meal\.date\}`\)/);
});

// ---- Only the host moves a meal; anyone else asks ----
import { canMove } from "../public/js/reschedule.js";
import { moveRequestNotice } from "../functions/notify-logic.js";

const rules = read("firestore.rules");
const mealsBlock = rules.slice(rules.indexOf("match /meals/{id} {"), rules.indexOf("// The host's list of requests"));

test("firestore.rules: only the host changes a meal's day or time", () => {
  assert.match(mealsBlock, /\(\(request\.resource\.data\.date == resource\.data\.date && request\.resource\.data\.time == resource\.data\.time\) \|\| resource\.data\.host == me\(\)\);/);
  assert.equal(canMove({ host: "uH" }, "uH"), true);
  assert.equal(canMove({ host: "uH" }, "uA"), false);
});

test("firestore.rules: a request is made by someone at the meal, for themselves, naming its real host; only the host answers it", () => {
  const req = rules.slice(rules.indexOf("match /moveRequests/{uid} {"), rules.indexOf("// The host's list of requests"));
  assert.match(req, /allow read: if allowed\(\) && me\(\) in meal\(\)\.viewers;/);
  assert.match(req, /allow create, update: if allowed\(\) && me\(\) == uid && me\(\) in meal\(\)\.viewers && me\(\) != meal\(\)\.host &&/);
  assert.match(req, /request\.resource\.data\.host == meal\(\)\.host && request\.resource\.data\.status == 'pending' &&/, "always asking, never answering itself");
  assert.match(req, /request\.resource\.data\.createdAt == request\.time;/);
  assert.match(req, /allow update: if allowed\(\) && me\(\) == meal\(\)\.host && resource\.data\.status == 'pending' &&[\s\S]*?hasOnly\(\['status', 'decidedAt'\]\) &&[\s\S]*?status in \['approved', 'declined'\]/);
  assert.match(req, /allow delete: if allowed\(\) && \(me\(\) == uid \|\| me\(\) == meal\(\)\.host\);/);
  assert.match(rules, /match \/\{path=\*\*\}\/moveRequests\/\{uid\} \{\s*allow list: if allowed\(\) && resource\.data\.host == me\(\);/, "the host's list only holds their own requests");
  assert.match(read("firestore.indexes.json"), /"collectionGroup": "moveRequests",\s*"queryScope": "COLLECTION_GROUP"/);
});

test("approving a request moves the meal in one write; the host and whoever asked keep their answers", () => {
  const meal = { ...rsvpMeal, participants: ["uH", "uA", "uMe"], declined: ["uB"] };
  assert.deepEqual(askedAgain(meal, ["uH", "uA"]).sort(), ["uB", "uMe"], "uA asked: keeps their yes");
  const store = read("public/js/store.js");
  assert.match(store, /batch\.update\(doc\(db, "meals", meal\.id, "moveRequests", request\.from\), \{ status: approve \? "approved" : "declined", decidedAt: serverTimestamp\(\) \}\);/);
  assert.match(store, /if \(approve\) \{\s*batch\.update\(doc\(db, "meals", meal\.id\), \{ \.\.\.rescheduleChanges\(meal, \[me, request\.from\], request\), updatedAt: serverTimestamp\(\) \}\);/);
});

test("dragging someone else's meal asks its host instead of moving it", () => {
  const home = read("public/js/home.js");
  assert.match(home, /if \(!canMove\(meal, me\)\) \{\s*revert\(\);[\s\S]*?requestMove\(meal, me, to\)/, "the meal stays put until the host approves");
});

test("on the meal page only the host can change the day and time; others ask, and see how it went", () => {
  const meal = read("public/js/meal.js");
  assert.match(meal, /\$\("#edit-date"\)\.disabled = !host;/);
  assert.match(meal, /const moving = canMove\(meal, me\) && moves\(meal, to\);/, "a non-host's save never moves it");
  assert.match(meal, /decideMove\(meal, request, true, me\)/);
  assert.match(meal, /requestMove\(meal, me, to\)/);
  assert.match(read("public/js/app.js"), /moveRequestsForMe\(me\)\.subscribe/, "the host's bell");
});

test("the pushes: a request to the host, the answer to whoever asked, nothing for taking it back", () => {
  const pending = { host: "uH", date: "2026-11-14", time: "", status: "pending" };
  assert.deepEqual(moveRequestNotice(null, pending, "uA"), { kind: "moveAsk", to: ["uH"] });
  assert.equal(moveRequestNotice(pending, { ...pending }, "uA"), null, "unchanged");
  assert.deepEqual(moveRequestNotice(pending, { ...pending, date: "2026-11-15" }, "uA"), { kind: "moveAsk", to: ["uH"] }, "asked for another day");
  assert.deepEqual(moveRequestNotice(pending, { ...pending, status: "approved" }, "uA"), { kind: "moveApproved", to: ["uA"] });
  assert.deepEqual(moveRequestNotice(pending, { ...pending, status: "declined" }, "uA"), { kind: "moveDeclined", to: ["uA"] });
  assert.equal(moveRequestNotice(pending, null, "uA"), null, "taken back");
  assert.match(read("functions/index.js"), /export const onMoveRequest = onDocumentWritten\("meals\/\{mealId\}\/moveRequests\/\{from\}"/);
});
