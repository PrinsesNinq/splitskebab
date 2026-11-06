// Recipes (public/js/recipe-logic.js, public/js/catalog.js): the catalogue is consistent, quantities scale to what you can buy, allergy
// conflicts are found, user recipes are cleaned, and "what can I make" puts the recipe with the fewest extra ingredients first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INGREDIENTS, RECIPES } from "../public/js/catalog.js";
import { ALLERGEN_IDS } from "../public/js/allergens.js";
import {
  builtinRecipes, toRecipe, scaleIngredients, groceryList, allergyConflicts, rankByPantry, findIngredientKey, normalise, UNITS,
} from "../public/js/recipe-logic.js";

test("every built-in recipe uses known ingredients and units, in both languages", () => {
  const ids = new Set();
  for (const r of RECIPES) {
    assert.ok(!ids.has(r.id), `duplicate id ${r.id}`);
    ids.add(r.id);
    assert.ok(r.name.en && r.name.nl, `${r.id} has both names`);
    assert.equal(r.steps.en.length, r.steps.nl.length, `${r.id} has the same steps in both languages`);
    for (const [key, qty, unit] of r.ingredients) {
      assert.ok(INGREDIENTS[key], `${r.id}: unknown ingredient ${key}`);
      assert.ok(qty > 0, `${r.id}: ${key} has a quantity`);
      assert.ok(UNITS.includes(unit), `${r.id}: ${key} has unit ${unit}`);
    }
  }
  for (const [key, item] of Object.entries(INGREDIENTS)) {
    assert.ok(item.en && item.nl, `${key} has both names`);
    for (const a of item.allergens) assert.ok(ALLERGEN_IDS.includes(a), `${key}: unknown allergen ${a}`);
  }
});

test("built-in recipes carry the allergens of their ingredients", () => {
  const pesto = builtinRecipes("en").find((r) => r.id === "pesto");
  assert.deepEqual(pesto.allergens, ["gluten", "milk", "nuts"]);
  const dahl = builtinRecipes("nl").find((r) => r.id === "dahl");
  assert.equal(dahl.name, "Rodelinzendahl");
  assert.ok(dahl.allergens.includes("celery"), "the stock cube brings celery");
});

test("scaling rounds to what you can buy or measure", () => {
  const bolognese = builtinRecipes("en").find((r) => r.id === "bolognese"); // for 4
  const for6 = Object.fromEntries(scaleIngredients(bolognese, 6).map((i) => [i.key, i.qty]));
  assert.equal(for6.spaghetti, 600);
  assert.equal(for6.cannedTomatoes, 3);
  assert.equal(for6.onion, 2, "1.5 onions is 2 onions");
  assert.equal(for6.tomatoPaste, 3);
  const for1 = Object.fromEntries(scaleIngredients(bolognese, 1).map((i) => [i.key, i.qty]));
  assert.equal(for1.cannedTomatoes, 1, "never less than one can");
  assert.equal(for1.salt, 1);
  assert.equal(scaleIngredients(bolognese, 500)[0].qty, 5000, "at most 50 people");
});

test("the grocery list keeps staples apart", () => {
  const { toBuy, staples } = groceryList(builtinRecipes("en").find((r) => r.id === "pesto"), 4);
  assert.ok(staples.every((i) => i.staple) && staples.some((i) => i.key === "salt"));
  assert.ok(toBuy.every((i) => !i.staple));
});

test("allergy conflicts name the person and only the allergens the recipe has", () => {
  const pesto = builtinRecipes("en").find((r) => r.id === "pesto");
  const people = [
    { email: "e@x.com", name: "Elise", allergies: ["nuts", "fish"] },
    { email: "n@x.com", name: "Nino", allergies: [] },
    { email: "h@x.com", name: "Hacker", allergies: ["<script>", "milk"] },
  ];
  assert.deepEqual(allergyConflicts(pesto, people), [
    { email: "e@x.com", name: "Elise", allergens: ["nuts"] },
    { email: "h@x.com", name: "Hacker", allergens: ["milk"] },
  ]);
});

test("ingredient names are recognised in either language and with accents", () => {
  assert.equal(findIngredientKey("Uiën"), "onion", "accents are ignored: uiën is the alias uien");
  assert.equal(findIngredientKey("uien"), "onion");
  assert.equal(findIngredientKey("plutonium"), null);
  assert.equal(findIngredientKey("Kipfilet"), "chicken");
  assert.equal(findIngredientKey("verse kip"), "chicken");
  assert.equal(findIngredientKey("parmigiano reggiano"), "parmesan");
  assert.equal(findIngredientKey(""), null);
  assert.equal(normalise("  Crème   Fraîche!! "), "creme fraiche");
});

test("a stored user recipe is cleaned: bad fields are dropped, recognised ingredients add their allergens", () => {
  const r = toRecipe({
    id: "u1", name: "  Tosti  ", servings: "999", minutes: "-3", owner: "a@x.com",
    ingredients: [{ name: "Brood", qty: 2, unit: "pc" }, { name: "Kaas", qty: "x", unit: "bogus" }, { name: "" }, null],
    allergens: ["eggs", "nonsense"], steps: "Toast it.\n\nEat it.",
  }, "user", "nl");
  assert.equal(r.name, "Tosti");
  assert.equal(r.servings, 50);
  assert.equal(r.minutes, null);
  assert.equal(r.ingredients.length, 2);
  assert.equal(r.ingredients[1].qty, null);
  assert.equal(r.ingredients[1].unit, "");
  assert.deepEqual(r.allergens, ["gluten", "eggs", "milk"]);
  assert.deepEqual(r.steps, ["Toast it.", "Eat it."]);
});

test("what can I make: the recipe needing the fewest extra ingredients comes first, staples never count", () => {
  const recipes = builtinRecipes("en");
  const ranked = rankByPantry(recipes, ["pasta", "groene pesto", "cherry tomatoes", "parmezaan"]);
  assert.equal(ranked[0].recipe.id, "pesto");
  assert.equal(ranked[0].missing.length, 0, "salt is a staple");
  const empty = rankByPantry(recipes, []);
  assert.equal(empty.length, recipes.length);
  assert.ok(empty.every((x, i) => i === 0 || empty[i - 1].missing.length <= x.missing.length), "sorted by missing count");
});
