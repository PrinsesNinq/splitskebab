// Housemates see the house's meals (public/js/sharing.js): someone added to a house after a meal was planned gets access to it.
import { test } from "node:test";
import assert from "node:assert/strict";
import { missingViewers, daysBefore } from "../public/js/sharing.js";

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
