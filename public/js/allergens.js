// The 14 allergens EU law (Regulation 1169/2011, Annex II) requires food to declare. A person's profile lists the ones they react to;
// a recipe's ingredients carry the ones they contain, and every page that shows a recipe next to people warns when the two meet.
// The ids are stored in Firestore (userProfiles.allergies, recipes.allergens) and checked there against this same list (firestore.rules):
// change them in both places.
export const ALLERGENS = [
  { id: "gluten", icon: "🌾", en: "Gluten", nl: "Gluten" },
  { id: "crustaceans", icon: "🦐", en: "Crustaceans", nl: "Schaaldieren" },
  { id: "eggs", icon: "🥚", en: "Eggs", nl: "Eieren" },
  { id: "fish", icon: "🐟", en: "Fish", nl: "Vis" },
  { id: "peanuts", icon: "🥜", en: "Peanuts", nl: "Pinda's" },
  { id: "soy", icon: "🫘", en: "Soy", nl: "Soja" },
  { id: "milk", icon: "🥛", en: "Milk (lactose)", nl: "Melk (lactose)" },
  { id: "nuts", icon: "🌰", en: "Tree nuts", nl: "Noten" },
  { id: "celery", icon: "🥬", en: "Celery", nl: "Selderij" },
  { id: "mustard", icon: "🟡", en: "Mustard", nl: "Mosterd" },
  { id: "sesame", icon: "⚪", en: "Sesame", nl: "Sesamzaad" },
  { id: "sulphites", icon: "🍷", en: "Sulphites", nl: "Sulfiet" },
  { id: "lupin", icon: "🌼", en: "Lupin", nl: "Lupine" },
  { id: "molluscs", icon: "🐚", en: "Molluscs", nl: "Weekdieren" },
];

export const ALLERGEN_IDS = ALLERGENS.map((a) => a.id);
const BY_ID = new Map(ALLERGENS.map((a) => [a.id, a]));

export const isAllergen = (id) => BY_ID.has(id);

/** Only the known ids, once each, in the list's order: what is stored is not trusted, and an unknown id must not become a label. */
export function cleanAllergens(list) {
  const wanted = new Set(Array.isArray(list) ? list : []);
  return ALLERGEN_IDS.filter((id) => wanted.has(id));
}

export function allergenLabel(id, lang = "en") {
  const a = BY_ID.get(id);
  return a ? a[lang] || a.en : id;
}

export const allergenIcon = (id) => BY_ID.get(id)?.icon || "⚠️";
