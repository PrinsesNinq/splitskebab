// What a house or group spends: the numbers behind analytics.html, from the meals' costs (meal.costs: Map email -> cents, see money.js).
// Pure functions over meals: tests/analytics.test.js checks them. Dates are "YYYY-MM-DD" local calendar days, as the meals store them.
import { mealTotal, eaters } from "./money.js";
import { daysBefore } from "./sharing.js";

/** The days from `from` to `to` (both included), "YYYY-MM-DD", in order. */
export function daysBetween(from, to) {
  const out = [];
  for (let d = to; d >= from && out.length < 400; d = daysBefore(d, 1)) out.push(d);
  return out.reverse();
}

/** The meals of this house or group in the period that have costs. */
export function mealsWithCosts(meals, circleId, from, to) {
  return meals.filter((m) => m.circleId === circleId && m.date >= from && m.date <= to && mealTotal(m) > 0);
}

/** Spending per day over the whole period, days without spending included (a time series keeps its gaps): [{ date, cents }]. */
export function spendingByDay(meals, from, to) {
  const byDay = new Map(daysBetween(from, to).map((d) => [d, 0]));
  for (const m of meals) if (byDay.has(m.date)) byDay.set(m.date, byDay.get(m.date) + mealTotal(m));
  return [...byDay].map(([date, cents]) => ({ date, cents }));
}

/**
 * The headline numbers: { total, meals, perMeal, perPerson } in cents (perPerson: the average share of one person at one meal).
 * perMeal and perPerson are 0 when there are no meals.
 */
export function summary(meals) {
  const total = meals.reduce((s, m) => s + mealTotal(m), 0);
  const plates = meals.reduce((s, m) => s + eaters(m).length, 0);
  return {
    total,
    meals: meals.length,
    perMeal: meals.length ? Math.round(total / meals.length) : 0,
    perPerson: plates ? Math.round(total / plates) : 0,
  };
}

/** Who paid how much in total (what they put in, not what they owe): [{ id, cents }], most first. */
export function paidByPerson(meals) {
  const paid = new Map();
  for (const m of meals) for (const [id, cents] of m.costs || []) paid.set(id, (paid.get(id) || 0) + cents);
  return [...paid].map(([id, cents]) => ({ id, cents })).sort((a, b) => b.cents - a.cents || a.id.localeCompare(b.id));
}

/**
 * What the money went on, by recipe (until photos of receipts can sort it into categories): [{ key, recipe, cents, meals }], most
 * first; meals without a recipe together under recipe null. key is "builtin:id" / "user:id" / "none".
 */
export function spendingByRecipe(meals) {
  const groups = new Map();
  for (const m of meals) {
    const key = m.recipe ? `${m.recipe.source}:${m.recipe.id}` : "none";
    const g = groups.get(key) || { key, recipe: m.recipe || null, cents: 0, meals: 0 };
    g.cents += mealTotal(m);
    g.meals += 1;
    groups.set(key, g);
  }
  return [...groups.values()].sort((a, b) => b.cents - a.cents || a.key.localeCompare(b.key));
}

/** The most expensive meals: [{ meal, cents }], most first (then the newest). */
export function topMeals(meals, n = 5) {
  return meals
    .map((meal) => ({ meal, cents: mealTotal(meal) }))
    .sort((a, b) => b.cents - a.cents || b.meal.date.localeCompare(a.meal.date))
    .slice(0, n);
}

/** Whether this person is an admin of the house or group: its creator always is, plus whoever an admin made one. */
export const isCircleAdmin = (circle, id) => circle.owner === id || (circle.admins || []).includes(id);
