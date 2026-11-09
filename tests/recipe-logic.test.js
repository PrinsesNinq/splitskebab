// Recipes (public/js/recipe-logic.js, public/js/catalog.js): the catalogue is consistent, quantities scale to what you can buy, allergy
// conflicts are found, user recipes are cleaned, and "what can I make" puts the recipe with the fewest extra ingredients first.
import { test } from "node:test";
import assert from "node:assert/strict";
import { INGREDIENTS, RECIPES } from "../public/js/catalog.js";
import { ALLERGEN_IDS } from "../public/js/allergens.js";
import {
  builtinRecipes, toRecipe, scaleIngredients, groceryList, allergyConflicts, rankByPantry, pantryMatches, findIngredientKey, normalise, UNITS,
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

test("every library recipe is well-formed: id, hand-picked tags, servings, minutes and steps", () => {
  for (const r of RECIPES) {
    assert.match(r.id, /^[a-z0-9-]{2,60}$/, `id ${r.id}`);
    assert.ok(Array.isArray(r.tags) && r.tags.every((x) => x === "budget" || x === "group"), `${r.id}: only budget and group are hand-picked (${r.tags})`);
    assert.ok(Number.isInteger(r.servings) && r.servings >= 1 && r.servings <= 50, `${r.id}: servings ${r.servings}`);
    assert.ok(Number.isInteger(r.minutes) && r.minutes > 0 && r.minutes <= 600, `${r.id}: minutes ${r.minutes}`);
    assert.ok(r.steps.en.length >= 3, `${r.id}: at least three steps`);
    assert.ok([...r.steps.en, ...r.steps.nl, r.name.en, r.name.nl].every((s) => typeof s === "string" && s.trim().length > 1), `${r.id}: no empty texts`);
    const keys = r.ingredients.map(([k]) => k);
    assert.equal(new Set(keys).size, keys.length, `${r.id}: an ingredient listed twice`);
  }
});

test("no two library recipes have the same name", () => {
  for (const lang of ["en", "nl"]) {
    const seen = new Map();
    for (const r of RECIPES) {
      const name = r.name[lang].toLowerCase();
      assert.ok(!seen.has(name), `${lang} "${r.name[lang]}" is both ${seen.get(name)} and ${r.id}`);
      seen.set(name, r.id);
    }
  }
});

test("vegetarian and vegan are worked out from the ingredients", () => {
  const by = Object.fromEntries(builtinRecipes("en").map((r) => [r.id, r]));
  assert.equal(by.dahl.diet, "vegan", "lentils, coconut, vegetable stock");
  assert.deepEqual(by.dahl.tags.filter((x) => x === "vegan" || x === "vegetarian").sort(), ["vegan", "vegetarian"]);
  assert.equal(by.chili.diet, "vegetarian", "the sour cream is dairy");
  assert.equal(by.pancakes.diet, "vegetarian");
  assert.equal(by.greencurry.diet, null, "chicken (and shrimp paste in the curry paste)");
  assert.equal(by.bolognese.diet, null);
  assert.ok(by.pesto.tags.includes("quick"), "15 minutes is quick");
  assert.ok(!by.lasagne.tags.includes("quick"));
  assert.ok(by.lasagne.tags.includes("group"), "hand-picked tags stay");
});

test("a user recipe is only vegetarian when every ingredient is known to be", () => {
  const known = toRecipe({ id: "u", name: "Kaastosti", servings: 2, minutes: 10, ingredients: [{ name: "brood" }, { name: "kaas" }], steps: "" }, "user", "nl");
  assert.equal(known.diet, "vegetarian");
  assert.deepEqual(known.tags, ["quick", "vegetarian"]);
  const unknown = toRecipe({ id: "u", name: "Mystery", servings: 2, ingredients: [{ name: "brood" }, { name: "mystery paste" }], steps: "" }, "user", "en");
  assert.equal(unknown.diet, null, "mystery paste could be anything");
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
    { id: "ue", name: "Elise", allergies: ["nuts", "fish"] },
    { id: "un", name: "Nino", allergies: [] },
    { id: "uh", name: "Hacker", allergies: ["<script>", "milk"] },
  ];
  assert.deepEqual(allergyConflicts(pesto, people), [
    { id: "ue", name: "Elise", allergens: ["nuts"] },
    { id: "uh", name: "Hacker", allergens: ["milk"] },
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

test("what can I make: with everything for a recipe, it comes first and has nothing to buy (staples never count)", () => {
  const ranked = rankByPantry(builtinRecipes("en"), ["pasta", "groene pesto", "cherry tomatoes", "parmezaan"]);
  assert.equal(ranked[0].recipe.id, "pesto");
  assert.equal(ranked[0].missing.length, 0, "salt is a staple");
  assert.equal(ranked[0].score, 1);
});

test("what can I make: spaghetti suggests pasta dishes, never pancakes", () => {
  const ranked = rankByPantry(builtinRecipes("en"), ["spaghetti"]);
  const matches = pantryMatches(ranked);
  const ids = matches.map((r) => r.recipe.id);
  assert.ok(!ids.includes("pancakes"), `pancakes use no spaghetti, matches: ${ids}`);
  assert.ok(matches.length >= 3, "the pasta recipes are found");
  for (const m of matches) assert.ok(m.have.some((i) => i.group === "pasta"), `${m.recipe.id} is a match, so it must use pasta`);
  for (const id of ["bolognese", "pesto", "tunasalad"]) assert.ok(ids.includes(id), `${id} is a pasta recipe`);
  assert.ok(ranked.findIndex((r) => r.recipe.id === "pancakes") >= matches.length, "pancakes rank below every match");
  const pesto = ranked.find((r) => r.recipe.id === "pesto");
  assert.deepEqual(pesto.swaps.map((s) => [s.using, s.ingredient.key]), [["spaghetti", "pasta"]], "spaghetti stands in for penne, and says so");
  const bolognese = ranked.find((r) => r.recipe.id === "bolognese");
  assert.equal(bolognese.swaps.length, 0, "spaghetti is the real thing for a bolognese");
});

test("what can I make: the main ingredient counts for more than the garlic", () => {
  const withChicken = rankByPantry(builtinRecipes("en"), ["chicken"]).find((r) => r.recipe.id === "greencurry");
  const withGarlicOnly = rankByPantry(builtinRecipes("en"), ["garlic"]).find((r) => r.recipe.id === "bolognese");
  assert.ok(withChicken.score > withGarlicOnly.score, `${withChicken.score} > ${withGarlicOnly.score}`);
  const ranked = rankByPantry(builtinRecipes("en"), ["rice", "eggs"]);
  assert.deepEqual(ranked[0].have.map((i) => i.key).sort(), ["eggs", "rice"], `rice and eggs: the first suggestion uses both (${ranked[0].recipe.id})`);
});

test("what can I make: nothing typed, or nothing that fits, gives no matches", () => {
  const recipes = builtinRecipes("en");
  assert.equal(rankByPantry(recipes, []).length, recipes.length, "every recipe is still listed");
  assert.deepEqual(pantryMatches(rankByPantry(recipes, [])), []);
  assert.deepEqual(pantryMatches(rankByPantry(recipes, ["plutonium"])), []);
});

test("every catalog role and swap group is a known one", () => {
  for (const [key, item] of Object.entries(INGREDIENTS)) {
    assert.ok(item.role === undefined || ["main", "minor"].includes(item.role), `${key}: role ${item.role}`);
    if (item.group) assert.ok(Object.values(INGREDIENTS).filter((x) => x.group === item.group).length >= 2, `${key}: group ${item.group} has a partner`);
  }
});
