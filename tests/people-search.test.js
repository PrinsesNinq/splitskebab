// Finding people (public/js/people-search.js): search by name or email, and friends of friends.
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchPeople, friendsOfFriends } from "../public/js/people-search.js";

const profiles = new Map([
  ["me@x", { email: "me@x", name: "Nino Otten", friends: ["elise@x", "sam@x"] }],
  ["elise@x", { email: "elise@x", name: "Élise de Vries", friends: ["me@x", "anna@x", "bram@x", "ghost@x"] }],
  ["sam@x", { email: "sam@x", name: "Sam Jansen", friends: ["me@x", "anna@x"] }],
  ["anna@x", { email: "anna@x", name: "Anna Bakker", friends: ["elise@x", "sam@x"] }],
  ["bram@x", { email: "bram@x", name: "Bram Visser", friends: ["elise@x", "ghost@x"] }],
  ["annelies@x", { email: "annelies@x", name: "Annelies Smit", friends: [] }],
]);

test("search finds people by name, accents and case aside, and never me", () => {
  assert.deepEqual(searchPeople("eli", profiles, "me@x").map((p) => p.email), ["elise@x", "annelies@x"], "Élise starts with it; AnnELIes only contains it");
  assert.deepEqual(searchPeople("ANN", profiles, "me@x").map((p) => p.email), ["anna@x", "annelies@x"], "name starts with it, by name");
  assert.deepEqual(searchPeople("nino", profiles, "me@x"), [], "not myself");
});

test("search ranks a name that starts with it above a later word and a match inside", () => {
  const extra = new Map([...profiles, ["v@x", { email: "v@x", name: "Vries Kok", friends: [] }]]);
  assert.deepEqual(searchPeople("vries", extra, "me@x").map((p) => p.email), ["v@x", "elise@x"]);
});

test("search also matches an email, and needs at least two characters", () => {
  assert.deepEqual(searchPeople("bram@", profiles, "me@x").map((p) => p.email), ["bram@x"]);
  assert.deepEqual(searchPeople("a", profiles, "me@x"), []);
  assert.deepEqual(searchPeople("zz", profiles, "me@x"), []);
});

test("friends of friends: people my friends know, most in common first, without me, my friends or open requests", () => {
  const fof = friendsOfFriends("me@x", ["elise@x", "sam@x"], [], profiles);
  assert.deepEqual(fof.map((x) => [x.person.email, x.via.sort()]), [["anna@x", ["elise@x", "sam@x"]], ["bram@x", ["elise@x"]]]);
  assert.deepEqual(friendsOfFriends("me@x", ["elise@x", "sam@x"], ["anna@x"], profiles).map((x) => x.person.email), ["bram@x"], "an open request is left out");
});

test("friends of friends leaves out people without a profile, and nothing without friends", () => {
  assert.ok(!friendsOfFriends("me@x", ["elise@x"], [], profiles).some((x) => x.person.email === "ghost@x"), "ghost@x never signed in");
  assert.deepEqual(friendsOfFriends("me@x", [], [], profiles), []);
});
