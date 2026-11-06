// How recipes are drawn on the meal and recipes pages: the full list (built-in plus users' own), an ingredient line in the current
// language, and the pantry ("what is in the house") that "what can I make" ranks by. The pantry is kept on this device only: it changes
// all the time and nobody else needs it.
import { builtinRecipes, toRecipe } from "./recipe-logic.js";
import { getLang, t } from "./i18n.js";
import { esc } from "./ui.js";

/** Built-in recipes first, then users' own, each in the current language. userRaw: the documents from store.userRecipes. */
export function allRecipes(userRaw = []) {
  const lang = getLang();
  return [...builtinRecipes(lang), ...userRaw.map((r) => toRecipe(r, "user", lang))];
}

/** The recipe a meal points at ({ source, id }), or null when it is gone (a user deleted theirs). */
export const findRecipe = (ref, list) => (ref ? list.find((r) => r.source === ref.source && r.id === ref.id) || null : null);

export const recipeRef = (recipe) => `${recipe.source}:${recipe.id}`;
export function parseRecipeRef(text) {
  const m = /^(builtin|user):([\w-]{1,100})$/.exec(text || "");
  return m ? { source: m[1], id: m[2] } : null;
}

function formatQty(qty) {
  if (qty == null) return "";
  const lang = getLang();
  return new Intl.NumberFormat(lang === "nl" ? "nl-NL" : "en-GB", { maximumFractionDigits: 1 }).format(qty);
}

/** "400 g Spaghetti", "2× Onion", "Salt": escaped HTML. */
export function ingredientHtml(i) {
  const qty = formatQty(i.qty);
  if (!qty) return esc(i.label);
  if (i.unit === "pc") return `<span class="ingredient-qty">${esc(qty)}×</span> ${esc(i.label)}`;
  if (i.unit === "pinch") return esc(i.label);
  return `<span class="ingredient-qty">${esc(qty)} ${esc(t(`unit.${i.unit || "pc"}`))}</span> ${esc(i.label)}`;
}

/** The same line as plain text, for a shared shopping list. */
export function ingredientText(i) {
  const qty = formatQty(i.qty);
  if (!qty || i.unit === "pinch") return i.label;
  if (i.unit === "pc") return `${qty}× ${i.label}`;
  return `${qty} ${t(`unit.${i.unit || "pc"}`)} ${i.label}`;
}

const PANTRY_KEY = "pantry";
const MAX_PANTRY = 80;

export function getPantry() {
  try {
    const list = JSON.parse(localStorage.getItem(PANTRY_KEY) || "[]");
    return Array.isArray(list) ? list.filter((x) => typeof x === "string" && x.trim()).slice(0, MAX_PANTRY) : [];
  } catch { return []; }
}

export function setPantry(items) {
  const clean = [...new Set(items.map((x) => String(x).trim().slice(0, 60)).filter(Boolean))].slice(0, MAX_PANTRY);
  try { localStorage.setItem(PANTRY_KEY, JSON.stringify(clean)); } catch { /* still used for this visit */ }
  return clean;
}
