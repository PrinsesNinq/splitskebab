// Housemates see the house's meals (public/js/sharing.js): someone added to a house after a meal was planned gets access to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { missingViewers, daysBefore, profileReaders, MAX_READERS } from "../public/js/sharing.js";

test("my private profile is readable by housemates, people at my meals and friends, never a stranger", () => {
  const circles = [{ id: "h1", members: ["me@x", "mate@x"] }];
  const meals = [{ id: "m", date: "2026-11-10", viewers: ["me@x", "mate@x", "guest-friend@x"] }];
  const readers = profileReaders("me@x", circles, meals, ["friend@x"]);
  assert.deepEqual(readers, ["friend@x", "guest-friend@x", "mate@x"], "sorted, without me");
  assert.ok(!readers.includes("stranger@x"));
  assert.deepEqual(profileReaders("me@x", [], [], []), [], "nobody connected, nobody reads");
});

test("the reader list is capped, keeping houses and friends before old meals", () => {
  const many = Array.from({ length: MAX_READERS + 50 }, (_, i) => `p${String(i).padStart(5, "0")}@x`);
  const readers = profileReaders("me@x", [{ id: "h", members: ["me@x", "zz-mate@x"] }], [{ id: "m", date: "2020-01-01", viewers: many }], ["zz-friend@x"]);
  assert.equal(readers.length, MAX_READERS);
  assert.ok(readers.includes("zz-mate@x"), "a housemate is never dropped, whatever their name");
  assert.ok(readers.includes("zz-friend@x"), "a friend is never dropped");
  assert.ok(!readers.includes("me@x"));
});

const house = { id: "h1", members: ["nino@aperam.com", "nino@gmail.com"] };
const meal = (over) => ({ id: "m1", circleId: "h1", date: "2026-11-10", viewers: ["nino@aperam.com"], ...over });

test("someone who joined the house after a meal was planned is missing from it", () => {
  assert.deepEqual(missingViewers([house], [meal({})], "2026-11-06"), [{ id: "m1", missing: ["nino@gmail.com"] }]);
});

test("nothing to do when every member already sees the meal (so the repair settles after one round)", () => {
  assert.deepEqual(missingViewers([house], [meal({ viewers: ["nino@aperam.com", "nino@gmail.com", "friend@x.com"] })], "2026-11-06"), []);
});

test("meals of another house, and meals older than 60 days, are left alone", () => {
  assert.deepEqual(missingViewers([house], [meal({ circleId: "other" })], "2026-11-06"), []);
  assert.deepEqual(missingViewers([house], [meal({ date: "2026-09-06" })], "2026-11-06"), [], "61 days back");
  assert.equal(missingViewers([house], [meal({ date: "2026-09-07" })], "2026-11-06").length, 1, "60 days back still counts");
});

test("daysBefore counts calendar days across month, year and DST boundaries", () => {
  assert.equal(daysBefore("2026-11-06", 60), "2026-09-07");
  assert.equal(daysBefore("2027-01-15", 60), "2026-11-16", "across the year");
  assert.equal(daysBefore("2026-03-30", 1), "2026-03-29", "the night the clocks go forward in Europe");
  assert.equal(daysBefore("2026-10-26", 1), "2026-10-25", "the night the clocks go back");
});
