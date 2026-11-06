// Splitting the bill (public/js/money.js): several people can pay for a meal, cents are never lost or invented, everyone's balance adds
// up to zero, the payments to square up are as few as possible, settled payments drop out, and debts between two people net out.
// Older meals (one payer: cost { totalCents, paidBy }) still read correctly.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  parseMoney, splitEvenly, readCosts, mealTotal, mealShares, mealBalances, mealDebts, netDebts, eaters, formatMoney, settleKey,
} from "../public/js/money.js";

/** A meal as the app holds it, built from a stored document (so readCosts is part of every test). */
function meal(doc) {
  const { costs, settled } = readCosts(doc);
  return { id: doc.id || "m1", participants: doc.participants || ["a@x", "b@x", "c@x", "d@x"], guests: doc.guests || [], costs, settledPairs: settled };
}
const sum = (map) => [...map.values()].reduce((s, x) => s + x, 0);

test("parseMoney reads Dutch and English amounts and refuses anything else", () => {
  assert.equal(parseMoney("12,50"), 1250);
  assert.equal(parseMoney("12.5"), 1250);
  assert.equal(parseMoney("€ 12"), 1200);
  assert.equal(parseMoney(" 0,01 "), 1);
  for (const bad of ["", "0", "-5", "12,345", "abc", "1e3", "12,50,1", "100000,01", null, undefined]) assert.equal(parseMoney(bad), null, String(bad));
});

test("splitEvenly never loses or invents a cent", () => {
  for (const total of [1, 2, 99, 100, 1000, 1001, 12345]) {
    for (let n = 1; n <= 7; n += 1) {
      const ids = Array.from({ length: n }, (_, i) => `p${i}`);
      const shares = [...splitEvenly(total, ids).values()];
      assert.equal(shares.reduce((s, x) => s + x, 0), total, `${total} over ${n}`);
      assert.ok(Math.max(...shares) - Math.min(...shares) <= 1, `${total} over ${n} is even`);
    }
  }
});

test("two payers: the total is shared, and only the people who paid too little pay, as few payments as possible", () => {
  // Elise (a) paid 18.00, Nino (b) 6.00; four people ate: 6.00 each. Nino is even, c and d each pay Elise 6.00.
  const m = meal({ costs: { "a@x": 1800, "b@x": 600 } });
  assert.equal(mealTotal(m), 2400);
  assert.deepEqual([...mealBalances(m)].sort(), [["a@x", 1200], ["b@x", 0], ["c@x", -600], ["d@x", -600]]);
  assert.deepEqual(mealDebts(m).map((d) => [d.from, d.to, d.cents]), [["c@x", "a@x", 600], ["d@x", "a@x", 600]]);
});

test("someone can owe two people, and a debt is split over the payers it takes", () => {
  // a paid 10.00, b paid 10.00, three ate (a, b, c): 6.67 / 6.67 / 6.66. c owes 6.66 in total, to a and b.
  const m = meal({ participants: ["a@x", "b@x", "c@x"], costs: { "a@x": 1000, "b@x": 1000 } });
  const debts = mealDebts(m);
  assert.equal(sum(mealShares(m)), 2000, "the shares add up to the total");
  assert.ok(debts.every((d) => d.from === "c@x"), "only c pays");
  assert.deepEqual(new Set(debts.map((d) => d.to)), new Set(["a@x", "b@x"]));
  assert.equal(debts.reduce((s, d) => s + d.cents, 0), mealShares(m).get("c@x"), "c pays exactly their share");
});

test("balances always add up to zero and no cent is lost, for many random meals", () => {
  for (let run = 0; run < 300; run += 1) {
    const people = Array.from({ length: 2 + (run % 9) }, (_, i) => `p${i}@x`);
    const costs = {};
    for (const p of people) if ((run * 7 + p.length * 13 + people.indexOf(p) * 31) % 3 === 0) costs[p] = 1 + ((run * 977 + people.indexOf(p) * 131) % 9000);
    if (!Object.keys(costs).length) costs[people[0]] = 1234;
    const m = meal({ participants: people, costs });
    assert.equal(sum(mealBalances(m)), 0, `run ${run}`);
    const debts = mealDebts(m);
    const after = new Map(mealBalances(m));
    for (const d of debts) { after.set(d.from, after.get(d.from) + d.cents); after.set(d.to, after.get(d.to) - d.cents); }
    assert.ok([...after.values()].every((x) => x === 0), `run ${run}: the payments square everyone up`);
    assert.ok(debts.length < people.length, `run ${run}: at most people - 1 payments`);
  }
});

test("someone who paid but did not eat gets everything back", () => {
  const m = meal({ participants: ["a@x", "b@x"], costs: { "z@x": 900 } });
  assert.equal(mealDebts(m).reduce((s, d) => s + d.cents, 0), 900);
  assert.ok(mealDebts(m).every((d) => d.to === "z@x"));
});

test("guests share the bill and are named guest:<id>", () => {
  const m = meal({ participants: ["a@x", "b@x", "c@x"], guests: [{ id: "g1", name: "Sam" }], costs: { "a@x": 1000 } });
  assert.deepEqual(eaters(m), ["a@x", "b@x", "c@x", "guest:g1"]);
  assert.equal(mealDebts(m).find((d) => d.from === "guest:g1").cents, 250);
});

test("no costs means no debts, and odd stored amounts are ignored", () => {
  assert.deepEqual(mealDebts(meal({})), []);
  const m = meal({ costs: { "a@x": 0, "b@x": -500, "c@x": 12.5, "d@x": "100", "e@x": 1000 } });
  assert.deepEqual([...m.costs], [["e@x", 1000]]);
});

test("an older one-payer meal reads as that person's cost, with its paid-back eaters as settled payments", () => {
  const m = meal({ cost: { totalCents: 1000, paidBy: "a@x" }, settled: ["b@x"] });
  assert.deepEqual([...m.costs], [["a@x", 1000]]);
  assert.ok(m.settledPairs.has(settleKey("b@x", "a@x")));
  const debts = mealDebts(m);
  assert.equal(debts.find((d) => d.from === "b@x").settled, true);
  assert.equal(debts.find((d) => d.from === "c@x").settled, false);
  // Someone adds their own costs to that older meal: both count.
  const both = meal({ cost: { totalCents: 1000, paidBy: "a@x" }, costs: { "b@x": 600 } });
  assert.equal(mealTotal(both), 1600);
  // The older payer wrote their own entry: it replaces the older cost (not counted twice).
  const replaced = meal({ cost: { totalCents: 1000, paidBy: "a@x" }, costs: { "a@x": 1200 } });
  assert.equal(mealTotal(replaced), 1200);
});

test("settled payments drop out of the netted debts", () => {
  const m = meal({ costs: { "a@x": 1200 }, settled: [settleKey("b@x", "a@x")] });
  assert.deepEqual(netDebts([m]).map((d) => d.from).sort(), ["c@x", "d@x"]);
});

test("debts between two people net out over meals", () => {
  const monday = meal({ id: "mon", participants: ["a@x", "b@x"], costs: { "a@x": 1000 } }); // b owes a 5.00
  const tuesday = meal({ id: "tue", participants: ["a@x", "b@x"], costs: { "b@x": 600 } }); // a owes b 3.00
  const net = netDebts([monday, tuesday]);
  assert.equal(net.length, 1);
  assert.deepEqual([net[0].from, net[0].to, net[0].cents], ["b@x", "a@x", 200]);
  assert.deepEqual(net[0].meals.sort(), ["mon", "tue"]);
});

test("formatMoney writes euros the local way", () => {
  assert.match(formatMoney(1250, "nl"), /12,50/);
  assert.match(formatMoney(1250, "en"), /12\.50/);
});
