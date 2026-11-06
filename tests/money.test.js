// Splitting the bill (public/js/money.js): cents are never lost or invented, the payer is never asked to pay themselves, settled shares
// drop out, and debts between two people net out.
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseMoney, splitEvenly, mealDebts, mealShares, netDebts, eaters, formatMoney } from "../public/js/money.js";

const meal = (over = {}) => ({ id: "m1", participants: ["a@x.com", "b@x.com", "c@x.com"], guests: [], cost: { totalCents: 1000, paidBy: "a@x.com" }, settled: [], ...over });

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
  assert.equal(splitEvenly(0, ["a"]).size, 0);
  assert.equal(splitEvenly(500, []).size, 0);
});

test("the payer takes the leftover cent and is not in the debts", () => {
  const debts = mealDebts(meal());
  assert.deepEqual(debts.map((d) => [d.from, d.to, d.cents]), [["b@x.com", "a@x.com", 333], ["c@x.com", "a@x.com", 333]]);
  assert.equal(mealShares(meal()).get("a@x.com"), 334);
});

test("someone who paid but did not eat is owed everything", () => {
  const debts = mealDebts(meal({ cost: { totalCents: 900, paidBy: "z@x.com" } }));
  assert.equal(debts.reduce((s, d) => s + d.cents, 0), 900);
  assert.ok(debts.every((d) => d.to === "z@x.com"));
});

test("guests share the bill and are named guest:<id>", () => {
  const m = meal({ guests: [{ id: "g1", name: "Sam" }] });
  assert.deepEqual(eaters(m), ["a@x.com", "b@x.com", "c@x.com", "guest:g1"]);
  assert.equal(mealDebts(m).find((d) => d.from === "guest:g1").cents, 250);
});

test("no cost means no debts", () => {
  assert.deepEqual(mealDebts(meal({ cost: null })), []);
  assert.deepEqual(mealDebts(meal({ cost: { totalCents: 0, paidBy: "a@x.com" } })), []);
});

test("settled shares are marked, and drop out of the netted debts", () => {
  const m = meal({ settled: ["b@x.com"] });
  assert.equal(mealDebts(m).find((d) => d.from === "b@x.com").settled, true);
  assert.deepEqual(netDebts([m]).map((d) => d.from), ["c@x.com"]);
});

test("debts between two people net out over meals", () => {
  const monday = { id: "mon", participants: ["a@x.com", "b@x.com"], guests: [], cost: { totalCents: 1000, paidBy: "a@x.com" }, settled: [] }; // b owes a 5.00
  const tuesday = { id: "tue", participants: ["a@x.com", "b@x.com"], guests: [], cost: { totalCents: 600, paidBy: "b@x.com" }, settled: [] }; // a owes b 3.00
  const net = netDebts([monday, tuesday]);
  assert.equal(net.length, 1);
  assert.deepEqual([net[0].from, net[0].to, net[0].cents], ["b@x.com", "a@x.com", 200]);
  assert.deepEqual(net[0].meals.sort(), ["mon", "tue"]);
  const even = { id: "wed", participants: ["a@x.com", "b@x.com"], guests: [], cost: { totalCents: 400, paidBy: "a@x.com" }, settled: [] }; // b owes a 2.00
  assert.deepEqual(netDebts([monday, tuesday, { ...even, cost: { totalCents: 400, paidBy: "b@x.com" } }]), []);
});

test("formatMoney writes euros the local way", () => {
  assert.match(formatMoney(1250, "nl"), /12,50/);
  assert.match(formatMoney(1250, "en"), /12\.50/);
});
