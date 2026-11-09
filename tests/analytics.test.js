// House and group analytics (public/js/analytics.js): spending per day with its gaps, the headline numbers, who paid, on what.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readCosts } from "../public/js/money.js";
import {
  daysBetween, mealsWithCosts, spendingByDay, summary, paidByPerson, spendingByRecipe, topMeals, isCircleAdmin,
} from "../public/js/analytics.js";

function meal(id, date, costs, { circleId = "h1", participants = ["a@x", "b@x"], recipe = null } = {}) {
  return { id, date, circleId, participants, guests: [], recipe, costs: readCosts({ costs }).costs, settledPairs: new Set() };
}
const meals = [
  meal("m1", "2026-11-01", { "a@x": 1200 }, { recipe: { source: "builtin", id: "bolognese" } }),
  meal("m2", "2026-11-03", { "a@x": 800, "b@x": 400 }, { participants: ["a@x", "b@x", "c@x"], recipe: { source: "builtin", id: "bolognese" } }),
  meal("m3", "2026-11-03", { "b@x": 600 }),
  meal("m4", "2026-11-05", {}),
  meal("m5", "2026-11-04", { "a@x": 5000 }, { circleId: "other" }),
  meal("m6", "2026-10-01", { "a@x": 999 }),
];

test("daysBetween lists every day, across a month boundary", () => {
  assert.deepEqual(daysBetween("2026-10-30", "2026-11-02"), ["2026-10-30", "2026-10-31", "2026-11-01", "2026-11-02"]);
  assert.deepEqual(daysBetween("2026-11-02", "2026-11-02"), ["2026-11-02"]);
});

test("only this house's meals in the period that have costs count", () => {
  assert.deepEqual(mealsWithCosts(meals, "h1", "2026-11-01", "2026-11-07").map((m) => m.id), ["m1", "m2", "m3"]);
});

test("spending per day keeps the days without spending, and adds up meals on the same day", () => {
  const inPeriod = mealsWithCosts(meals, "h1", "2026-11-01", "2026-11-04");
  assert.deepEqual(spendingByDay(inPeriod, "2026-11-01", "2026-11-04"), [
    { date: "2026-11-01", cents: 1200 }, { date: "2026-11-02", cents: 0 }, { date: "2026-11-03", cents: 1800 }, { date: "2026-11-04", cents: 0 },
  ]);
});

test("the headline numbers: total, meals, per meal and per person per meal", () => {
  const inPeriod = mealsWithCosts(meals, "h1", "2026-11-01", "2026-11-07");
  // 1200 + 1200 + 600 = 3000 over 3 meals; plates: 2 + 3 + 2 = 7 -> 429 per person.
  assert.deepEqual(summary(inPeriod), { total: 3000, meals: 3, perMeal: 1000, perPerson: 429 });
  assert.deepEqual(summary([]), { total: 0, meals: 0, perMeal: 0, perPerson: 0 });
});

test("who paid: what each person put in, most first", () => {
  assert.deepEqual(paidByPerson(mealsWithCosts(meals, "h1", "2026-11-01", "2026-11-07")), [{ id: "a@x", cents: 2000 }, { id: "b@x", cents: 1000 }]);
});

test("on what: per recipe, meals without one together, most first; and the most expensive meals", () => {
  const inPeriod = mealsWithCosts(meals, "h1", "2026-11-01", "2026-11-07");
  assert.deepEqual(spendingByRecipe(inPeriod).map((g) => [g.key, g.cents, g.meals]), [["builtin:bolognese", 2400, 2], ["none", 600, 1]]);
  assert.deepEqual(topMeals(inPeriod, 2).map((x) => [x.meal.id, x.cents]), [["m2", 1200], ["m1", 1200]], "equal amounts: newest first");
});

test("the creator is always an admin; others only when made one", () => {
  const circle = { owner: "a@x", admins: ["b@x"] };
  assert.ok(isCircleAdmin(circle, "a@x"));
  assert.ok(isCircleAdmin(circle, "b@x"));
  assert.ok(!isCircleAdmin(circle, "c@x"));
  assert.ok(isCircleAdmin({ owner: "a@x" }, "a@x"), "an older house without an admins list");
});
