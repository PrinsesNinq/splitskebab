// Splitskebab's built-in recipe library: one file per theme, all in the same format, all made of ingredients from js/catalog.js (so the
// allergens and the vegetarian / vegan marking are worked out from the ingredients, never typed per recipe).
//
// Recipe: { id, tags, servings, minutes, name: { en, nl }, ingredients: [[catalog key, quantity for `servings`, unit]],
//           steps: { en: [...], nl: [...] } }
//   tags: hand-picked "budget" (cheap) and "group" (made for a big table); "quick" (30 minutes or less), "vegetarian" and "vegan" are
//         added by js/recipe-logic.js from the minutes and the ingredients.
//   units: g, ml, pc (pieces), clove, can, tbsp, tsp, pinch, pack. Quantities scale with the number of people.
// tests/recipe-logic.test.js checks every recipe: unique id, known ingredients and units, both languages, the same steps in both.
import { CLASSICS } from "./classics.js";
import { BUDGET } from "./budget.js";
import { GROUP } from "./group.js";
import { VEGGIE } from "./veggie.js";
import { QUICK } from "./quick.js";

export const RECIPES = [...CLASSICS, ...BUDGET, ...GROUP, ...VEGGIE, ...QUICK];
