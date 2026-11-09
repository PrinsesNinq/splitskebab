// Finding people (public/js/people-search.js): search by name (or a shown email), and friends of friends. People are their uid.
import { test } from "node:test";
import assert from "node:assert/strict";
import { searchPeople, friendsOfFriends } from "../public/js/people-search.js";

const profiles = new Map([
  ["uMe", { id: "uMe", name: "Nino Otten", email: "", friends: ["uElise", "uSam"] }],
  ["uElise", { id: "uElise", name: "Élise de Vries", email: "", friends: ["uMe", "uAnna", "uBram", "uGhost"] }],
  ["uSam", { id: "uSam", name: "Sam Jansen", email: "", friends: ["uMe", "uAnna"] }],
  ["uAnna", { id: "uAnna", name: "Anna Bakker", email: "", friends: ["uElise", "uSam"] }],
  ["uBram", { id: "uBram", name: "Bram Visser", email: "bram@x.nl", friends: ["uElise", "uGhost"] }],
  ["uAnnelies", { id: "uAnnelies", name: "Annelies Smit", email: "", friends: [] }],
]);
const ids = (list) => list.map((p) => p.id);

test("search finds people by name, accents and case aside, and never me", () => {
  assert.deepEqual(ids(searchPeople("eli", profiles, "uMe")), ["uElise", "uAnnelies"], "Élise starts with it; AnnELIes only contains it");
  assert.deepEqual(ids(searchPeople("ANN", profiles, "uMe")), ["uAnna", "uAnnelies"], "name starts with it, by name");
  assert.deepEqual(searchPeople("nino", profiles, "uMe"), [], "not myself");
});

test("search ranks a name that starts with it above a later word and a match inside", () => {
  const extra = new Map([...profiles, ["uV", { id: "uV", name: "Vries Kok", email: "", friends: [] }]]);
  assert.deepEqual(ids(searchPeople("vries", extra, "uMe")), ["uV", "uElise"]);
});

test("search matches an email only when the person shows it, and needs at least two characters", () => {
  assert.deepEqual(ids(searchPeople("bram@", profiles, "uMe")), ["uBram"], "Bram shows his email");
  assert.deepEqual(searchPeople("@x", new Map([["uAnna", profiles.get("uAnna")]]), "uMe"), [], "a hidden email is never searched");
  assert.deepEqual(searchPeople("a", profiles, "uMe"), []);
  assert.deepEqual(searchPeople("zz", profiles, "uMe"), []);
});

test("search leaves out the people to skip (already in the house or at the meal)", () => {
  assert.deepEqual(ids(searchPeople("ann", profiles, "uMe", 8, new Set(["uAnna"]))), ["uAnnelies"]);
});

test("friends of friends: people my friends know, most in common first, without me, my friends or open requests", () => {
  const fof = friendsOfFriends("uMe", ["uElise", "uSam"], [], profiles);
  assert.deepEqual(fof.map((x) => [x.person.id, x.via.sort()]), [["uAnna", ["uElise", "uSam"]], ["uBram", ["uElise"]]]);
  assert.deepEqual(friendsOfFriends("uMe", ["uElise", "uSam"], ["uAnna"], profiles).map((x) => x.person.id), ["uBram"], "an open request is left out");
});

test("friends of friends leaves out people without a profile, and nothing without friends", () => {
  assert.ok(!friendsOfFriends("uMe", ["uElise"], [], profiles).some((x) => x.person.id === "uGhost"), "uGhost never signed in");
  assert.deepEqual(friendsOfFriends("uMe", [], [], profiles), []);
});
