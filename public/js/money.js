// Splitting the bill: amounts are whole cents (integers) everywhere, so 10.00 split three ways is 3.34 + 3.33 + 3.33 and never loses or
// invents a cent. Several people can pay for one meal: meal.costs is Map email -> cents (each adds their own receipt). The total is shared
// equally by everyone who ate (meal.participants, emails, plus meal.guests, people without an account, as "guest:<id>"); what each
// paid minus their share says who gets money back, and mealDebts() turns that into as few payments as possible. meal.settledPairs holds
// the payments marked paid ("from>to"). readCosts() reads both the current and the older one-payer shape. Pure functions: unit tested in
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

/** Everyone who ate: the participants' uids, then the guests ("guest:<id>"). */
export function eaters(meal) {
  const people = Array.isArray(meal.participants) ? meal.participants.filter((e) => typeof e === "string") : [];
  const guests = Array.isArray(meal.guests) ? meal.guests.filter((g) => g && typeof g.id === "string").map(guestId) : [];
  return [...new Set([...people, ...guests])];
}

/** The key a payment from one person to another is marked paid under (meal.settled): "from>to". */
export const settleKey = (from, to) => `${from}>${to}`;

/**
 * A stored meal's costs and settled payments in the current shape, from either shape on disk:
 *   now:   costs: { [uid]: cents } (each person who did groceries adds their own), settled: ["from>to", ...]
 *   older: cost: { totalCents, paidBy } (one payer), settled: [eater id, ...] (who paid that payer back)
 * A meal can have both while it changes over (someone adds their costs to an older meal): the older cost then counts as its payer's
 * entry, unless that payer already has one of their own. Returns { costs: Map uid -> cents, settled: Set of "from>to" }.
 */
export function readCosts(d) {
  const costs = new Map();
  if (d.costs && typeof d.costs === "object") {
    for (const [id, cents] of Object.entries(d.costs)) if (Number.isInteger(cents) && cents > 0 && cents <= MAX_CENTS) costs.set(id, cents);
  }
  const legacy = d.cost && Number.isInteger(d.cost.totalCents) && d.cost.totalCents > 0 && typeof d.cost.paidBy === "string" ? d.cost : null;
  if (legacy && !costs.has(legacy.paidBy)) costs.set(legacy.paidBy, legacy.totalCents);
  const settled = new Set();
  for (const s of Array.isArray(d.settled) ? d.settled : []) {
    if (typeof s !== "string") continue;
    if (s.includes(">")) settled.add(s);
    else if (legacy) settled.add(settleKey(s, legacy.paidBy)); // older: "this eater paid the payer back"
  }
  return { costs, settled };
}

/** Everything paid for the meal together, in cents. */
export const mealTotal = (meal) => [...(meal.costs || new Map()).values()].reduce((s, c) => s + c, 0);

/**
 * Each eater's share of the meal: the total split equally over everyone who ate. The people who paid most come first in the split, so a
 * leftover cent is theirs and nobody else is asked for more than their share. Map id -> cents (empty without costs or eaters).
 */
export function mealShares(meal) {
  const total = mealTotal(meal);
  const ids = eaters(meal);
  if (!total || !ids.length) return new Map();
  const paid = meal.costs || new Map();
  const ordered = [...ids].sort((a, b) => (paid.get(b) || 0) - (paid.get(a) || 0) || a.localeCompare(b));
  return splitEvenly(total, ordered);
}

/**
 * Where everyone stands for this meal: Map id -> cents, what they paid minus their share. Positive: they get money back; negative: they
 * still have to pay. Someone who paid but did not eat gets everything they paid back. The values always add up to 0.
 */
export function mealBalances(meal) {
  const shares = mealShares(meal);
  const balances = new Map();
  if (!shares.size) return balances;
  for (const [id, cents] of meal.costs || new Map()) balances.set(id, cents);
  for (const [id, share] of shares) balances.set(id, (balances.get(id) || 0) - share);
  return balances;
}

/**
 * The payments that square the meal up, as few as it takes: [{ from, to, cents, settled }]. The biggest debt is paid to the biggest
 * creditor first (ties by id, so everyone's app gives the same list). Empty when there is no cost yet, or when everyone is even.
 */
export function mealDebts(meal) {
  const balances = mealBalances(meal);
  const owe = [...balances].filter(([, c]) => c < 0).map(([id, c]) => ({ id, left: -c }));
  const get = [...balances].filter(([, c]) => c > 0).map(([id, c]) => ({ id, left: c }));
  const order = (x, y) => y.left - x.left || x.id.localeCompare(y.id);
  owe.sort(order);
  get.sort(order);
  const settled = meal.settledPairs || new Set();
  const debts = [];
  let i = 0;
  let j = 0;
  while (i < owe.length && j < get.length) {
    const cents = Math.min(owe[i].left, get[j].left);
    debts.push({ from: owe[i].id, to: get[j].id, cents, settled: settled.has(settleKey(owe[i].id, get[j].id)) });
    owe[i].left -= cents;
    get[j].left -= cents;
    if (!owe[i].left) i += 1;
    if (!get[j].left) j += 1;
  }
  return debts;
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
