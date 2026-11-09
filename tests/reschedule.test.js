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
