// The admins' statistics page (Settings > Statistics, js/admin-stats.js): pure sums over the monthly totals in stats/{YYYY-MM}
// (functions/stats.js). tests/stats.test.js checks them. The totals hold no person or meal; on top of that, recipes with only a few
// portions in the chosen period are not shown one by one (MIN_PORTIONS), so a single person's choices do not stand out.
export const MIN_PORTIONS = 3;

const int = (v) => (Number.isInteger(v) && v > 0 ? v : 0);

/** "YYYY-MM" of the month n months before the month of `today` (a "YYYY-MM-DD"); n = 0 is this month. */
export function monthBefore(today, n) {
  const [y, m] = today.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 - n, 1));
  return d.toISOString().slice(0, 7);
}

/** The months from..to (inclusive, "YYYY-MM") added up. docs: [{ id: "YYYY-MM", data }]. */
export function addMonths(docs, from, to) {
  const out = { months: 0, meals: 0, dinners: 0, groupSizes: {}, portions: {}, spendCents: 0, spendDiners: 0 };
  for (const { id, data } of docs) {
    if (!/^\d{4}-\d{2}$/.test(id) || id < from || id > to || !data) continue;
    out.months += 1;
    for (const k of ["meals", "dinners", "spendCents", "spendDiners"]) out[k] += int(data[k]);
    for (const [size, n] of Object.entries(data.groupSizes || {})) if (/^\d+$/.test(size)) out.groupSizes[size] = (out.groupSizes[size] || 0) + int(n);
    for (const [key, n] of Object.entries(data.portions || {})) out.portions[key] = (out.portions[key] || 0) + int(n);
  }
  return out;
}

/** The headline numbers: dinners, the average group size someone ate in, and the average spend per diner (cents), or null without data. */
export function summary(totals) {
  const sizes = Object.entries(totals.groupSizes);
  const weighted = sizes.reduce((s, [size, n]) => s + Number(size) * n, 0);
  const counted = sizes.reduce((s, [, n]) => s + n, 0);
  return {
    dinners: totals.dinners,
    avgGroup: counted ? weighted / counted : null,
    avgSpendCents: totals.spendDiners ? Math.round(totals.spendCents / totals.spendDiners) : null,
  };
}

/** Recipes by portions, most first; those under MIN_PORTIONS are added up into `other` (not named). */
export function topRecipes(portions, min = MIN_PORTIONS) {
  const shown = [];
  let other = 0;
  for (const [key, n] of Object.entries(portions)) { if (n >= min) shown.push({ key, n }); else other += n; }
  return { shown: shown.sort((a, b) => b.n - a.n || a.key.localeCompare(b.key)), other };
}

/**
 * How much of each food was bought for the counted portions: every shown recipe's ingredients scaled from its servings to its portions,
 * added up per ingredient and unit (staples like salt and oil left out). recipes: the app's recipe list (js/recipe-view.js allRecipes:
 * { source, id, servings, ingredients: [{ key, label, qty, unit, staple }] }). A recipe that no longer exists is skipped.
 */
export function foodTotals(portions, recipes, min = MIN_PORTIONS) {
  const byKey = new Map(recipes.map((r) => [`${r.source}:${r.id}`, r]));
  const totals = new Map();
  for (const { key, n } of topRecipes(portions, min).shown) {
    const recipe = byKey.get(key);
    if (!recipe || !(recipe.servings > 0)) continue;
    for (const i of recipe.ingredients) {
      if (i.staple || i.qty == null || !(i.qty > 0)) continue;
      const id = `${i.key || i.label}|${i.unit || ""}`;
      const t = totals.get(id) || { label: i.label, unit: i.unit || "", qty: 0 };
      t.qty += (i.qty * n) / recipe.servings;
      totals.set(id, t);
    }
  }
  return [...totals.values()].map((t) => ({ ...t, qty: Math.round(t.qty * 10) / 10 })).sort((a, b) => a.label.localeCompare(b.label));
}
