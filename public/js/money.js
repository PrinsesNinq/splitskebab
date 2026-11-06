// Splitting the bill: amounts are whole cents (integers) everywhere, so 10.00 split three ways is 3.34 + 3.33 + 3.33 and never loses or
// invents a cent. A meal's cost is { totalCents, paidBy }; everyone who ate (meal.participants, emails, plus meal.guests, people without an
// account, as "guest:<id>") owes the payer an equal share, and meal.settled lists who has paid theirs back. Pure functions: unit tested in
// tests/money.test.js.

export const MAX_CENTS = 10_000_000; // 100,000 euros: anything above is a typo (also enforced in firestore.rules)

/** "12,50", "12.5", "€ 12" -> 1250, 1250, 1200. null for anything that is not a positive amount with at most two decimals. */
export function parseMoney(text) {
  const t = String(text ?? "").replace(/[€\s]/g, "").replace(",", ".");
  if (!/^\d+(\.\d{1,2})?$/.test(t)) return null;
  const cents = Math.round(parseFloat(t) * 100);
  return cents > 0 && cents <= MAX_CENTS ? cents : null;
}

export function formatMoney(cents, lang = "en") {
  return new Intl.NumberFormat(lang === "nl" ? "nl-NL" : "en-IE", { style: "currency", currency: "EUR" }).format((cents || 0) / 100);
}

/** totalCents over ids as equal as cents allow: the first ids in the list get the leftover cents, one each. Returns Map id -> cents. */
export function splitEvenly(totalCents, ids) {
  const shares = new Map();
  if (!ids.length || !(totalCents > 0)) return shares;
  const base = Math.floor(totalCents / ids.length);
  let left = totalCents - base * ids.length;
  for (const id of ids) {
    shares.set(id, base + (left > 0 ? 1 : 0));
    if (left > 0) left -= 1;
  }
  return shares;
}

export const guestId = (guest) => `guest:${guest.id}`;

/** Everyone who ate: the participants' emails, then the guests ("guest:<id>"). */
export function eaters(meal) {
  const emails = Array.isArray(meal.participants) ? meal.participants.filter((e) => typeof e === "string") : [];
  const guests = Array.isArray(meal.guests) ? meal.guests.filter((g) => g && typeof g.id === "string").map(guestId) : [];
  return [...new Set([...emails, ...guests])];
}

/**
 * What each eater owes for this meal: [{ from, to, cents, settled }], one per eater except the payer. The payer is put first in the split,
 * so a leftover cent is theirs and nobody is asked for more than their share. Someone who paid but did not eat is owed everything.
 * Empty when there is no cost yet.
 */
export function mealDebts(meal) {
  const cost = meal.cost;
  if (!cost || !(cost.totalCents > 0) || typeof cost.paidBy !== "string") return [];
  const ids = eaters(meal);
  const ordered = ids.includes(cost.paidBy) ? [cost.paidBy, ...ids.filter((id) => id !== cost.paidBy)] : ids;
  const shares = splitEvenly(cost.totalCents, ordered);
  const settled = new Set(Array.isArray(meal.settled) ? meal.settled : []);
  return ordered.filter((id) => id !== cost.paidBy).map((id) => ({ from: id, to: cost.paidBy, cents: shares.get(id), settled: settled.has(id) }));
}

/** Each eater's share of the meal (payer included): Map id -> cents. */
export function mealShares(meal) {
  const cost = meal.cost;
  if (!cost || !(cost.totalCents > 0)) return new Map();
  const ids = eaters(meal);
  const ordered = ids.includes(cost.paidBy) ? [cost.paidBy, ...ids.filter((id) => id !== cost.paidBy)] : ids;
  return splitEvenly(cost.totalCents, ordered);
}

/**
 * The open debts over many meals, netted per pair of people: [{ from, to, cents, meals: [mealId] }]. If A owes B 5.00 for Monday and B
 * owes A 3.00 for Tuesday, that is one line: A owes B 2.00. Settled shares are left out. Sorted by amount, largest first.
 */
export function netDebts(meals) {
  const pairs = new Map(); // "a|b" with a < b -> { cents (positive: a owes b), meals }
  for (const meal of meals) {
    for (const d of mealDebts(meal)) {
      if (d.settled || d.from === d.to) continue;
      const [a, b] = d.from < d.to ? [d.from, d.to] : [d.to, d.from];
      const key = `${a}|${b}`;
      const entry = pairs.get(key) || { a, b, cents: 0, meals: new Set() };
      entry.cents += d.from === a ? d.cents : -d.cents;
      entry.meals.add(meal.id);
      pairs.set(key, entry);
    }
  }
  return [...pairs.values()]
    .filter((p) => p.cents !== 0)
    .map((p) => ({ from: p.cents > 0 ? p.a : p.b, to: p.cents > 0 ? p.b : p.a, cents: Math.abs(p.cents), meals: [...p.meals] }))
    .sort((x, y) => y.cents - x.cents);
}

/** The meals behind an open debt between two people (either direction) that still have an unsettled share between them. */
export function openMealsBetween(meals, from, to) {
  return meals.filter((m) => mealDebts(m).some((d) => !d.settled && ((d.from === from && d.to === to) || (d.from === to && d.to === from))));
}
