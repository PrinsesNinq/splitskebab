// Anonymous statistics (functions/stats.js runs it daily): what one meal adds to the monthly totals, counting only the people at it who
// said yes (users/{uid}.statsConsent). Pure, so tests/stats.test.js runs it directly. Nothing that comes out names a person or a meal:
// only numbers that are added to everyone's totals.
//
// Per consenting diner: one dinner, one portion of the meal's recipe (from which the admins' page works out how much of each food was
// bought), the size of the group they ate with, and their share of what the meal cost (the total split equally over everyone who ate).

const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === "string" && x) : []);

/** What the meal cost in cents: everyone's own entries (costs), or the older single payer's total. */
export function mealCostCents(meal) {
  const costs = meal?.costs && typeof meal.costs === "object" ? Object.values(meal.costs).filter((c) => Number.isInteger(c) && c > 0) : [];
  if (costs.length) return costs.reduce((s, c) => s + c, 0);
  const legacy = meal?.cost?.totalCents;
  return Number.isInteger(legacy) && legacy > 0 ? legacy : 0;
}

/** A recipe as a key ("builtin:pesto", "user:abc"), or null. */
export function recipeKey(meal) {
  const r = meal?.recipe;
  return r && ["builtin", "user"].includes(r.source) && typeof r.id === "string" && /^[\w-]{1,100}$/.test(r.id) ? `${r.source}:${r.id}` : null;
}

/**
 * What one meal adds, or null when nobody at it said yes: { dinners, groupSize, recipe, spendCents, spendDiners }. consenting: a Set of the
 * uids that said yes (of anyone; only the meal's participants count).
 */
export function mealContribution(meal, consenting) {
  const participants = [...new Set(list(meal?.participants))];
  const yes = participants.filter((id) => consenting.has(id)).length;
  if (!yes) return null;
  const eaters = participants.length + (Array.isArray(meal.guests) ? meal.guests.length : 0);
  const cost = mealCostCents(meal);
  return {
    dinners: yes,
    groupSize: eaters,
    recipe: recipeKey(meal),
    spendCents: cost ? Math.round((cost / eaters) * yes) : 0,
    spendDiners: cost ? yes : 0,
  };
}

/** The contributions of a day's meals, added up: { meals, dinners, groupSizes: { size: dinners }, portions: { recipe: n }, spendCents, spendDiners }. */
export function addUp(contributions) {
  const out = { meals: 0, dinners: 0, groupSizes: {}, portions: {}, spendCents: 0, spendDiners: 0 };
  for (const c of contributions) {
    if (!c) continue;
    out.meals += 1;
    out.dinners += c.dinners;
    const size = String(Math.min(c.groupSize, 30)); // 30 or more in one bucket
    out.groupSizes[size] = (out.groupSizes[size] || 0) + c.dinners;
    if (c.recipe) out.portions[c.recipe] = (out.portions[c.recipe] || 0) + c.dinners;
    out.spendCents += c.spendCents;
    out.spendDiners += c.spendDiners;
  }
  return out;
}

/** "YYYY-MM-DD" to the month it counts in, "YYYY-MM". */
export const monthOf = (day) => day.slice(0, 7);
