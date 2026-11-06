// The ingredients Splitskebab knows, in English and Dutch, with their allergens. Every built-in recipe (js/library/) is made of these, so
// the allergen and diet information comes from one place and is the same in every recipe. The allergens are the usual ones for what you
// buy in a Dutch supermarket; a brand can differ, so the recipe pages say to check the packaging. Users add their own recipes on top
// (Firestore recipes/).
//
// Ingredient: key -> { en, nl, allergens, staple, aliases, role, group, diet }.
// - staple (salt, oil...) is assumed to be in every kitchen: listed, but never "missing" for "what can I make".
// - aliases are extra words a person might type for it, in either language, lowercase without accents.
// - role says how much an ingredient makes the dish (js/recipe-logic.js rankByPantry): "main" is what it is built on (the pasta, the
//   meat, the rice), "minor" is flavour you could leave out or swap (garlic, soy sauce, honey); everything else is in between.
// - group puts ingredients that can stand in for each other together: spaghetti in the house also works for a penne recipe.
// - diet: "meat", "fish" (also shellfish, and sauces made with them) or "animal" (dairy, eggs, honey: fine for vegetarians, not for
//   vegans). Nothing means plant-based. A recipe is vegetarian or vegan only when every ingredient is (worked out, never hand-tagged).

export const INGREDIENTS = {
  // ---- Pasta, rice, bread, grains, potatoes ----
  spaghetti: { role: "main", group: "pasta", en: "Spaghetti", nl: "Spaghetti", allergens: ["gluten"], aliases: [] },
  pasta: { role: "main", group: "pasta", en: "Pasta (penne/fusilli)", nl: "Pasta (penne/fusilli)", allergens: ["gluten"], aliases: ["penne", "fusilli", "macaroni"] },
  lasagneSheets: { role: "main", en: "Lasagne sheets", nl: "Lasagnebladen", allergens: ["gluten", "eggs"], diet: "animal", aliases: ["lasagne"] },
  gnocchi: { role: "main", en: "Gnocchi", nl: "Gnocchi", allergens: ["gluten"], aliases: [] },
  eggNoodles: { role: "main", group: "noodles", en: "Egg noodles", nl: "Mie (eiermie)", allergens: ["gluten", "eggs"], diet: "animal", aliases: ["mie", "noodles", "eiermie"] },
  riceNoodles: { role: "main", group: "noodles", en: "Rice noodles", nl: "Rijstnoedels", allergens: [], aliases: ["rijstnoedel", "rice noodle"] },
  rice: { role: "main", en: "Rice", nl: "Rijst", allergens: [], aliases: ["basmati", "pandan", "zilvervliesrijst"] },
  couscous: { role: "main", en: "Couscous", nl: "Couscous", allergens: ["gluten"], aliases: [] },
  bulgur: { role: "main", en: "Bulgur", nl: "Bulgur", allergens: ["gluten"], aliases: [] },
  quinoa: { role: "main", en: "Quinoa", nl: "Quinoa", allergens: [], aliases: [] },
  oats: { role: "main", en: "Rolled oats", nl: "Havermout", allergens: ["gluten"], aliases: ["havervlokken", "oatmeal"] },
  tortillas: { role: "main", group: "flatbread", en: "Tortilla wraps", nl: "Tortilla wraps", allergens: ["gluten"], aliases: ["wraps", "tortilla"] },
  pitaBread: { role: "main", group: "flatbread", en: "Pita bread", nl: "Pitabroodjes", allergens: ["gluten"], aliases: ["pita", "pitabrood"] },
  naan: { role: "main", group: "flatbread", en: "Naan bread", nl: "Naanbrood", allergens: ["gluten", "milk"], diet: "animal", aliases: ["naan"] },
  tacoShells: { role: "main", en: "Taco shells", nl: "Tacoschelpen", allergens: [], aliases: ["taco", "tacos"] },
  bread: { en: "Bread", nl: "Brood", allergens: ["gluten"], aliases: ["stokbrood", "baguette", "brood"] },
  burgerBuns: { role: "main", en: "Burger buns", nl: "Hamburgerbroodjes", allergens: ["gluten", "sesame"], aliases: ["buns", "bolletjes"] },
  pizzaDough: { role: "main", en: "Pizza dough (fresh)", nl: "Pizzadeeg (vers)", allergens: ["gluten"], aliases: ["pizzadeeg", "pizza"] },
  puffPastry: { role: "main", en: "Puff pastry", nl: "Bladerdeeg", allergens: ["gluten", "milk"], diet: "animal", aliases: ["bladerdeeg"] },
  breadcrumbs: { role: "minor", en: "Breadcrumbs", nl: "Paneermeel", allergens: ["gluten"], aliases: ["paneermeel"] },
  flour: { role: "main", en: "Flour", nl: "Bloem", allergens: ["gluten"], aliases: ["meel"] },
  potatoes: { role: "main", group: "potato", en: "Potatoes", nl: "Aardappelen", allergens: [], aliases: ["potato", "aardappel", "krieler", "krielaardappelen"] },
  sweetPotatoes: { role: "main", group: "potato", en: "Sweet potatoes", nl: "Zoete aardappelen", allergens: [], aliases: ["sweet potato", "zoete aardappel", "bataat"] },

  // ---- Beans, lentils, plant protein ----
  redLentils: { role: "main", group: "lentils", en: "Red lentils", nl: "Rode linzen", allergens: [], aliases: ["lentils", "linzen"] },
  greenLentils: { role: "main", group: "lentils", en: "Lentils (canned)", nl: "Linzen (blik)", allergens: [], aliases: ["groene linzen", "bruine linzen"] },
  kidneyBeans: { role: "main", group: "beans", en: "Kidney beans (canned)", nl: "Kidneybonen (blik)", allergens: [], aliases: ["beans", "bonen", "kidneybonen"] },
  blackBeans: { role: "main", group: "beans", en: "Black beans (canned)", nl: "Zwarte bonen (blik)", allergens: [], aliases: ["zwarte bonen"] },
  whiteBeans: { role: "main", group: "beans", en: "White beans (canned)", nl: "Witte bonen (blik)", allergens: [], aliases: ["witte bonen", "cannellini"] },
  chickpeas: { role: "main", en: "Chickpeas (canned)", nl: "Kikkererwten (blik)", allergens: [], aliases: ["kikkererwten", "garbanzo"] },
  tofu: { role: "main", en: "Tofu", nl: "Tofu", allergens: ["soy"], aliases: [] },
  tempeh: { role: "main", en: "Tempeh", nl: "Tempeh", allergens: ["soy"], aliases: [] },
  veggieMince: { role: "main", en: "Vegetarian mince", nl: "Vegetarisch gehakt", allergens: ["soy", "gluten"], aliases: ["vega gehakt", "vegetarisch gehakt", "plant mince"] },

  // ---- Meat and fish ----
  mincedBeef: { role: "main", group: "mince", en: "Minced beef", nl: "Rundergehakt", allergens: [], diet: "meat", aliases: ["rundergehakt", "mince", "ground beef"] },
  mincedMixed: { role: "main", group: "mince", en: "Minced beef and pork", nl: "Half-om-half gehakt", allergens: [], diet: "meat", aliases: ["gehakt", "half om half"] },
  chicken: { role: "main", group: "chicken", en: "Chicken breast", nl: "Kipfilet", allergens: [], diet: "meat", aliases: ["kip", "chicken", "kipfilet"] },
  chickenThighs: { role: "main", group: "chicken", en: "Chicken thighs", nl: "Kippendijen", allergens: [], diet: "meat", aliases: ["kipdij", "kipdijfilet", "kippendij", "chicken thighs"] },
  stewBeef: { role: "main", en: "Stewing beef", nl: "Runderstoofvlees", allergens: [], diet: "meat", aliases: ["stoofvlees", "riblappen", "sukadelappen"] },
  bacon: { group: "bacon", en: "Bacon bits", nl: "Spekblokjes", allergens: [], diet: "meat", aliases: ["spek", "spekjes", "bacon", "pancetta"] },
  ham: { en: "Ham (cubes or slices)", nl: "Ham (blokjes of plakjes)", allergens: [], diet: "meat", aliases: ["hamblokjes"] },
  chorizo: { group: "bacon", en: "Chorizo", nl: "Chorizo", allergens: [], diet: "meat", aliases: [] },
  smokedSausage: { role: "main", en: "Smoked sausage", nl: "Rookworst", allergens: ["mustard"], diet: "meat", aliases: ["sausage", "worst"] },
  salmon: { role: "main", group: "fish", en: "Salmon fillet", nl: "Zalmfilet", allergens: ["fish"], diet: "fish", aliases: ["zalm"] },
  whiteFish: { role: "main", group: "fish", en: "White fish fillet (cod, pollock)", nl: "Witvisfilet (kabeljauw, koolvis)", allergens: ["fish"], diet: "fish", aliases: ["witvis", "kabeljauw", "koolvis", "pangasius", "cod"] },
  tuna: { role: "main", en: "Tuna (canned)", nl: "Tonijn (blik)", allergens: ["fish"], diet: "fish", aliases: ["tonijn"] },
  shrimp: { role: "main", en: "Shrimp (peeled)", nl: "Garnalen (gepeld)", allergens: ["crustaceans"], diet: "fish", aliases: ["garnalen", "scampi", "prawns"] },

  // ---- Eggs and dairy ----
  eggs: { role: "main", en: "Eggs", nl: "Eieren", allergens: ["eggs"], diet: "animal", aliases: ["egg", "ei"] },
  milk: { en: "Milk", nl: "Melk", allergens: ["milk"], diet: "animal", aliases: [] },
  butter: { en: "Butter", nl: "Roomboter", allergens: ["milk"], diet: "animal", aliases: ["boter"] },
  cookingCream: { en: "Cooking cream", nl: "Kookroom", allergens: ["milk"], diet: "animal", aliases: ["room", "slagroom", "cream"] },
  sourCream: { en: "Sour cream", nl: "Zure room", allergens: ["milk"], diet: "animal", aliases: ["creme fraiche"] },
  greekYogurt: { en: "Greek yogurt", nl: "Griekse yoghurt", allergens: ["milk"], diet: "animal", aliases: ["yoghurt", "yogurt"] },
  cheese: { group: "cheese", en: "Grated cheese", nl: "Geraspte kaas", allergens: ["milk"], diet: "animal", aliases: ["kaas", "cheese", "cheddar", "goudse kaas"] },
  parmesan: { group: "cheese", en: "Parmesan", nl: "Parmezaanse kaas", allergens: ["milk"], diet: "animal", aliases: ["parmezaan", "parmigiano"] },
  mozzarella: { en: "Mozzarella", nl: "Mozzarella", allergens: ["milk"], diet: "animal", aliases: [] },
  feta: { en: "Feta", nl: "Feta", allergens: ["milk"], diet: "animal", aliases: [] },
  halloumi: { role: "main", en: "Halloumi", nl: "Halloumi", allergens: ["milk"], diet: "animal", aliases: [] },
  creamCheese: { en: "Cream cheese", nl: "Roomkaas", allergens: ["milk"], diet: "animal", aliases: ["philadelphia"] },

  // ---- Plant milks, nuts, seeds ----
  coconutMilk: { en: "Coconut milk", nl: "Kokosmelk", allergens: [], aliases: ["kokos", "coconut cream"] },
  oatMilk: { en: "Oat drink", nl: "Haverdrink", allergens: ["gluten"], aliases: ["havermelk", "oat milk", "plantaardige melk"] },
  peanutButter: { en: "Peanut butter", nl: "Pindakaas", allergens: ["peanuts"], aliases: ["pindakaas"] },
  peanuts: { role: "minor", en: "Peanuts", nl: "Pinda's", allergens: ["peanuts"], aliases: ["pindas", "pinda"] },
  cashews: { role: "minor", en: "Cashew nuts", nl: "Cashewnoten", allergens: ["nuts"], aliases: ["cashew", "cashewnoten"] },
  sesameSeeds: { role: "minor", en: "Sesame seeds", nl: "Sesamzaad", allergens: ["sesame"], aliases: ["sesam"] },
  tahini: { role: "minor", en: "Tahini", nl: "Tahin", allergens: ["sesame"], aliases: ["tahin", "sesampasta"] },

  // ---- Vegetables and fruit ----
  onion: { en: "Onion", nl: "Ui", allergens: [], aliases: ["onions", "uien", "rode ui", "red onion"] },
  springOnion: { role: "minor", en: "Spring onion", nl: "Lente-ui", allergens: [], aliases: ["bosui", "lente ui", "scallion"] },
  leek: { en: "Leek", nl: "Prei", allergens: [], aliases: ["prei"] },
  garlic: { role: "minor", en: "Garlic", nl: "Knoflook", allergens: [], aliases: [] },
  ginger: { role: "minor", en: "Ginger", nl: "Gember", allergens: [], aliases: [] },
  chiliPepper: { role: "minor", en: "Red chili pepper", nl: "Rode peper", allergens: [], aliases: ["chili", "rode peper", "spaanse peper"] },
  bellPepper: { en: "Bell pepper", nl: "Paprika", allergens: [], aliases: ["paprika's", "bell peppers"] },
  cannedTomatoes: { group: "tomatoSauce", en: "Canned tomatoes", nl: "Tomatenblokjes (blik)", allergens: [], aliases: ["tomatenblokjes", "tomaten in blik", "canned tomato"] },
  passata: { group: "tomatoSauce", en: "Passata (sieved tomatoes)", nl: "Passata (gezeefde tomaten)", allergens: [], aliases: ["gezeefde tomaten", "tomatensaus"] },
  tomatoPaste: { role: "minor", en: "Tomato paste", nl: "Tomatenpuree", allergens: [], aliases: ["puree"] },
  tomatoes: { group: "tomatoSauce", en: "Tomatoes (fresh)", nl: "Tomaten (vers)", allergens: [], aliases: ["tomaat", "tomaten", "trostomaten"] },
  cherryTomatoes: { en: "Cherry tomatoes", nl: "Cherrytomaatjes", allergens: [], aliases: ["tomaatjes"] },
  carrots: { en: "Carrots", nl: "Wortels", allergens: [], aliases: ["carrot", "wortel", "winterpeen"] },
  celery: { en: "Celery stalks", nl: "Bleekselderij", allergens: ["celery"], aliases: ["selderij", "bleekselderij"] },
  broccoli: { en: "Broccoli", nl: "Broccoli", allergens: [], aliases: [] },
  cauliflower: { en: "Cauliflower", nl: "Bloemkool", allergens: [], aliases: ["bloemkool"] },
  zucchini: { en: "Zucchini", nl: "Courgette", allergens: [], aliases: ["courgette", "courgettes"] },
  eggplant: { en: "Eggplant", nl: "Aubergine", allergens: [], aliases: ["aubergine", "aubergines"] },
  mushrooms: { en: "Mushrooms", nl: "Champignons", allergens: [], aliases: ["champignon", "paddenstoelen"] },
  spinach: { en: "Spinach", nl: "Spinazie", allergens: [], aliases: ["spinazie", "bladspinazie"] },
  kale: { role: "main", en: "Kale (chopped)", nl: "Boerenkool (gesneden)", allergens: [], aliases: ["boerenkool"] },
  pointedCabbage: { en: "Pointed cabbage", nl: "Spitskool", allergens: [], aliases: ["spitskool", "kool", "cabbage", "witte kool"] },
  greenBeans: { en: "Green beans", nl: "Sperziebonen", allergens: [], aliases: ["sperziebonen", "boontjes"] },
  peas: { en: "Peas (frozen)", nl: "Doperwten (diepvries)", allergens: [], aliases: ["doperwten", "erwten", "erwtjes"] },
  pumpkin: { en: "Pumpkin (butternut)", nl: "Pompoen (flespompoen)", allergens: [], aliases: ["pompoen", "butternut", "flespompoen"] },
  lettuce: { en: "Lettuce", nl: "Sla", allergens: [], aliases: ["ijsbergsla", "salad", "rucola"] },
  cucumber: { en: "Cucumber", nl: "Komkommer", allergens: [], aliases: [] },
  avocado: { en: "Avocado", nl: "Avocado", allergens: [], aliases: ["avocados"] },
  mixedVeg: { en: "Frozen stir-fry vegetables", nl: "Diepvries roerbakgroenten", allergens: [], aliases: ["roerbakgroente", "wokgroente", "vegetables", "groenten"] },
  sweetcorn: { role: "minor", en: "Sweetcorn (canned)", nl: "Mais (blik)", allergens: [], aliases: ["corn", "mais"] },
  lemon: { role: "minor", en: "Lemon", nl: "Citroen", allergens: [], aliases: ["citroen"] },
  lime: { role: "minor", en: "Lime", nl: "Limoen", allergens: [], aliases: ["limoen"] },
  apples: { en: "Apples", nl: "Appels", allergens: [], aliases: ["apple", "appel"] },
  bananas: { en: "Bananas", nl: "Bananen", allergens: [], aliases: ["banana", "banaan"] },
  freshHerbs: { role: "minor", en: "Fresh herbs (parsley, coriander, basil)", nl: "Verse kruiden (peterselie, koriander, basilicum)", allergens: [], aliases: ["peterselie", "koriander", "verse basilicum", "parsley", "coriander", "cilantro"] },

  // ---- Sauces, pastes and flavour ----
  soySauce: { role: "minor", group: "soy", en: "Soy sauce", nl: "Sojasaus", allergens: ["soy", "gluten"], aliases: ["soja", "sojasaus"] },
  ketjapManis: { role: "minor", group: "soy", en: "Sweet soy sauce (ketjap manis)", nl: "Ketjap manis", allergens: ["soy", "gluten"], aliases: ["ketjap", "kecap"] },
  oysterSauce: { role: "minor", en: "Oyster sauce", nl: "Oestersaus", allergens: ["molluscs", "soy", "gluten"], diet: "fish", aliases: ["oestersaus"] },
  fishSauce: { role: "minor", en: "Fish sauce", nl: "Vissaus", allergens: ["fish"], diet: "fish", aliases: ["vissaus"] },
  sataySauce: { en: "Satay sauce", nl: "Satésaus", allergens: ["peanuts", "soy"], aliases: ["satesaus", "pindasaus"] },
  pesto: { en: "Green pesto", nl: "Groene pesto", allergens: ["nuts", "milk"], diet: "animal", aliases: [] },
  curryPaste: { group: "curryPaste", en: "Green curry paste", nl: "Groene currypasta", allergens: ["crustaceans"], diet: "fish", aliases: ["currypasta", "curry paste"] },
  redCurryPaste: { group: "curryPaste", en: "Red curry paste", nl: "Rode currypasta", allergens: ["crustaceans"], diet: "fish", aliases: ["rode currypasta", "red curry"] },
  tikkaPaste: { en: "Tikka masala paste", nl: "Tikka masala pasta", allergens: ["mustard"], aliases: ["tikka", "masala"] },
  tacoSauce: { role: "minor", en: "Taco sauce / salsa", nl: "Tacosaus / salsa", allergens: [], aliases: ["salsa", "tacosaus"] },
  mayonnaise: { role: "minor", en: "Mayonnaise", nl: "Mayonaise", allergens: ["eggs", "mustard"], diet: "animal", aliases: ["mayo"] },
  mustard: { role: "minor", en: "Mustard", nl: "Mosterd", allergens: ["mustard"], aliases: [] },
  sambal: { role: "minor", en: "Sambal", nl: "Sambal", allergens: [], aliases: [] },
  stockCube: { role: "minor", en: "Vegetable stock cube", nl: "Groentebouillonblokje", allergens: ["celery"], aliases: ["bouillon", "stock", "bouillonblokje"] },
  vinegar: { role: "minor", en: "Vinegar", nl: "Azijn", allergens: ["sulphites"], aliases: ["azijn"] },
  syrup: { role: "minor", en: "Pancake syrup", nl: "Stroop", allergens: [], aliases: ["schenkstroop"] },
  honey: { role: "minor", en: "Honey", nl: "Honing", allergens: [], diet: "animal", aliases: [] },
  yeast: { role: "minor", en: "Dried yeast", nl: "Gedroogde gist", allergens: [], aliases: ["gist", "yeast"] },
  bakingPowder: { role: "minor", en: "Baking powder", nl: "Bakpoeder", allergens: [], aliases: ["bakpoeder"] },

  // ---- Kitchen basics (staples) ----
  salt: { en: "Salt", nl: "Zout", allergens: [], staple: true, aliases: [] },
  blackPepper: { en: "Black pepper", nl: "Zwarte peper", allergens: [], staple: true, aliases: ["peper"] },
  oil: { en: "Cooking oil", nl: "Olie", allergens: [], staple: true, aliases: ["olijfolie", "olive oil", "zonnebloemolie"] },
  sugar: { en: "Sugar", nl: "Suiker", allergens: [], staple: true, aliases: [] },
  spices: { en: "Spices (paprika, cumin, chili)", nl: "Kruiden (paprika, komijn, chili)", allergens: [], staple: true, aliases: ["kruiden", "spices", "komijn", "paprikapoeder"] },
  curryPowder: { en: "Curry powder", nl: "Kerriepoeder", allergens: [], staple: true, aliases: ["kerrie", "curry"] },
  driedHerbs: { en: "Dried Italian herbs", nl: "Italiaanse kruiden", allergens: [], staple: true, aliases: ["oregano", "basilicum", "tijm"] },
  cinnamon: { en: "Cinnamon", nl: "Kaneel", allergens: [], staple: true, aliases: ["kaneel"] },
};

// The built-in recipes live in js/library/ (one file per theme); re-exported here so existing imports keep working.
export { RECIPES } from "./library/index.js";
