// Recipes as the pages use them: one shape for the built-in ones (js/catalog.js) and the ones users add (Firestore recipes/), scaled to
// the number of people eating, with the allergens they contain, the grocery list, and the ranking behind "what can I make with what I
// have". Pure functions: no Firebase, no DOM, so they are unit tested (tests/recipe-logic.test.js).
import { INGREDIENTS, RECIPES } from "./catalog.js";
import { cleanAllergens } from "./allergens.js";

export const UNITS = ["g", "ml", "pc", "clove", "can", "tbsp", "tsp", "pinch", "pack"];
const WHOLE_UNITS = new Set(["pc", "clove", "can", "pack"]);
const MAX_SERVINGS = 50;

/** Lowercase, no accents, single spaces: how typed ingredient names are compared ("Uiën " and "uien" are the same). */
export function normalise(text) {
  return String(text ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

// Every name a catalog ingredient answers to, normalised once.
const NAMES = Object.entries(INGREDIENTS).map(([key, item]) => [key, [...new Set([key.toLowerCase(), item.en, item.nl, ...(item.aliases || [])].map(normalise))]]);

/** The catalog ingredient a typed name means, or null: an exact name or alias first, then a name that is a whole word of the text. */
export function findIngredientKey(text) {
  const n = normalise(text);
  if (!n) return null;
  for (const [key, names] of NAMES) if (names.includes(n)) return key;
  const words = ` ${n} `;
  for (const [key, names] of NAMES) if (names.some((name) => name.length >= 3 && words.includes(` ${name} `))) return key;
  return null;
}

const clampServings = (n, fallback = 4) => {
  const v = Math.round(Number(n));
  return Number.isFinite(v) && v >= 1 ? Math.min(v, MAX_SERVINGS) : fallback;
};

/**
 * A built-in recipe or a stored user recipe in the shape the pages draw: { id, source, name, servings, minutes, ingredients: [{ key,
 * label, qty, unit, allergens, staple }], allergens, steps, owner }. A user recipe is untrusted data: every field is checked and cut to
 * size here, so one odd document cannot break a page.
 */
export function toRecipe(raw, source, lang = "en") {
  if (source === "builtin") {
    const ingredients = raw.ingredients.map(([key, qty, unit]) => {
      const item = INGREDIENTS[key];
      return { key, label: item[lang] || item.en, qty, unit, allergens: item.allergens, staple: !!item.staple };
    });
    return {
      id: raw.id, source, name: raw.name[lang] || raw.name.en, servings: raw.servings, minutes: raw.minutes, ingredients,
      allergens: cleanAllergens(ingredients.flatMap((i) => i.allergens)), steps: raw.steps[lang] || raw.steps.en, owner: null,
    };
  }
  const list = Array.isArray(raw.ingredients) ? raw.ingredients.slice(0, 60) : [];
  const ingredients = list.map((row) => {
    const label = typeof row?.name === "string" ? row.name.trim().slice(0, 80) : "";
    const catalogKey = findIngredientKey(label);
    const item = catalogKey ? INGREDIENTS[catalogKey] : null;
    const qty = Number(row?.qty);
    return {
      key: catalogKey || `u:${normalise(label)}`,
      label,
      qty: Number.isFinite(qty) && qty > 0 ? qty : null,
      unit: UNITS.includes(row?.unit) ? row.unit : "",
      allergens: item ? item.allergens : [],
      staple: !!item?.staple,
    };
  }).filter((i) => i.label);
  const steps = typeof raw.steps === "string" ? raw.steps.slice(0, 5000).split(/\n+/).map((s) => s.trim()).filter(Boolean) : [];
  return {
    id: String(raw.id || ""), source: "user", name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim().slice(0, 80) : "?",
    servings: clampServings(raw.servings), minutes: Number.isFinite(Number(raw.minutes)) && Number(raw.minutes) > 0 ? Math.round(Number(raw.minutes)) : null,
    ingredients,
    // The allergens the author ticked, plus whatever a recognised ingredient brings: someone who forgets to tick "milk" for cheese is
    // still covered.
    allergens: cleanAllergens([...(Array.isArray(raw.allergens) ? raw.allergens : []), ...ingredients.flatMap((i) => i.allergens)]),
    steps,
    owner: typeof raw.owner === "string" ? raw.owner : null,
  };
}

export const builtinRecipes = (lang) => RECIPES.map((r) => toRecipe(r, "builtin", lang));

function roundQty(qty, unit) {
  if (qty == null) return null;
  if (WHOLE_UNITS.has(unit)) return Math.max(1, Math.ceil(qty - 0.05));
  if (unit === "tbsp" || unit === "tsp") return Math.max(0.5, Math.round(qty * 2) / 2);
  if (unit === "pinch") return 1;
  if (unit === "g" || unit === "ml") return qty >= 100 ? Math.round(qty / 10) * 10 : Math.max(5, Math.round(qty / 5) * 5);
  return Math.round(qty * 10) / 10;
}

/** The ingredients for `servings` people, rounded to what you can buy or measure (a whole can, half a spoon, 10 g). */
export function scaleIngredients(recipe, servings) {
  const factor = clampServings(servings, recipe.servings) / recipe.servings;
  return recipe.ingredients.map((i) => ({ ...i, qty: roundQty(i.qty == null ? null : i.qty * factor, i.unit) }));
}

/** The grocery list: what to buy, and the staples (salt, oil...) listed apart because most kitchens have them. */
export function groceryList(recipe, servings) {
  const items = scaleIngredients(recipe, servings);
  return { toBuy: items.filter((i) => !i.staple), staples: items.filter((i) => i.staple) };
}

/**
 * Who at the table reacts to this recipe: [{ email, name, allergens }] for every person whose allergies meet the recipe's allergens.
 * people: [{ email, name, allergies }].
 */
export function allergyConflicts(recipe, people) {
  const contained = new Set(recipe.allergens);
  return people
    .map((p) => ({ email: p.email, name: p.name, allergens: cleanAllergens(p.allergies).filter((a) => contained.has(a)) }))
    .filter((p) => p.allergens.length);
}

/** All allergies of the people at the table, once each: what the meal page lists before anyone picks a recipe. */
export const tableAllergies = (people) => cleanAllergens(people.flatMap((p) => p.allergies || []));

/** Whether a pantry item (typed by a person) is this ingredient: the same catalog ingredient, or the one name contains the other. */
function pantryHas(pantry, ingredient) {
  const label = normalise(ingredient.label);
  return pantry.some((p) => (p.key && p.key === ingredient.key) || (p.text.length >= 3 && (label.includes(p.text) || (label.length >= 3 && p.text.includes(label)))));
}

/**
 * "What can I make": every recipe with what you would still have to buy, the one needing the fewest extra ingredients first (then the
 * one using most of what you have, then the name). Staples never count as missing. items: what is in the house, as typed.
 * Returns [{ recipe, missing: [ingredient], have: [ingredient] }].
 */
export function rankByPantry(recipes, items) {
  const pantry = items.map((text) => ({ text: normalise(text), key: findIngredientKey(text) })).filter((p) => p.text);
  return recipes
    .map((recipe) => {
      const needed = recipe.ingredients.filter((i) => !i.staple);
      const have = needed.filter((i) => pantryHas(pantry, i));
      return { recipe, have, missing: needed.filter((i) => !have.includes(i)) };
    })
    .sort((a, b) => a.missing.length - b.missing.length || b.have.length - a.have.length || a.recipe.name.localeCompare(b.recipe.name));
}

/** The key a grocery line is ticked off under (meal.have): stable across languages and servings. */
export const groceryKey = (ingredient) => ingredient.key.slice(0, 100);
