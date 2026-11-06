// The first recipes of Splitskebab: Dutch student classics. Same format as the other library files (see library/index.js).

export const CLASSICS = [
  {
    id: "bolognese", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Spaghetti bolognese", nl: "Spaghetti bolognese" },
    ingredients: [["spaghetti", 400, "g"], ["mincedBeef", 400, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["carrots", 1, "pc"],
      ["cannedTomatoes", 2, "can"], ["tomatoPaste", 2, "tbsp"], ["driedHerbs", 1, "tbsp"], ["parmesan", 50, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, garlic and carrot.", "Brown the mince in a little oil, add the vegetables and fry 5 minutes.", "Stir in the tomato paste, the canned tomatoes and the herbs; simmer 20 minutes.", "Cook the spaghetti, season the sauce and serve with parmesan."],
      nl: ["Snipper de ui, knoflook en wortel.", "Bak het gehakt rul in wat olie, voeg de groenten toe en bak 5 minuten.", "Roer de tomatenpuree, tomatenblokjes en kruiden erdoor; laat 20 minuten pruttelen.", "Kook de spaghetti, breng de saus op smaak en serveer met parmezaan."],
    },
  },
  {
    id: "chili", tags: ["budget", "group"], servings: 4, minutes: 40,
    name: { en: "Chili sin carne", nl: "Chili sin carne" },
    ingredients: [["kidneyBeans", 2, "can"], ["sweetcorn", 1, "can"], ["cannedTomatoes", 2, "can"], ["onion", 1, "pc"], ["bellPepper", 2, "pc"],
      ["garlic", 2, "clove"], ["rice", 300, "g"], ["sourCream", 125, "ml"], ["spices", 2, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Fry the chopped onion, garlic and bell pepper in oil with the spices.", "Add the tomatoes, drained beans and corn; simmer 20 minutes.", "Serve on the rice with a spoon of sour cream."],
      nl: ["Kook de rijst.", "Fruit de gesnipperde ui, knoflook en paprika in olie met de kruiden.", "Voeg de tomaten, uitgelekte bonen en mais toe; 20 minuten laten sudderen.", "Serveer op de rijst met een lepel zure room."],
    },
  },
  {
    id: "stamppot", tags: ["budget", "group"], servings: 4, minutes: 35,
    name: { en: "Kale stamppot with smoked sausage", nl: "Boerenkoolstamppot met rookworst" },
    ingredients: [["potatoes", 1500, "g"], ["kale", 600, "g"], ["smokedSausage", 1, "pc"], ["milk", 150, "ml"], ["butter", 30, "g"], ["mustard", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the potatoes, cut them in pieces and boil them 20 minutes with the kale on top.", "Heat the sausage in hot water (do not boil) for 10 minutes.", "Drain, mash with the warm milk and butter, season.", "Serve with slices of sausage and mustard."],
      nl: ["Schil de aardappelen, snijd ze in stukken en kook ze 20 minuten met de boerenkool erop.", "Verwarm de rookworst 10 minuten in heet (niet kokend) water.", "Afgieten, stampen met de warme melk en boter, op smaak brengen.", "Serveer met plakjes rookworst en mosterd."],
    },
  },
  {
    id: "nasi", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Nasi goreng", nl: "Nasi goreng" },
    ingredients: [["rice", 300, "g"], ["chicken", 400, "g"], ["eggs", 4, "pc"], ["mixedVeg", 400, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"],
      ["soySauce", 3, "tbsp"], ["sambal", 1, "tsp"], ["oil", 2, "tbsp"]],
    steps: {
      en: ["Cook the rice (best a few hours ahead) and let it cool.", "Stir-fry the chicken in pieces, then the onion, garlic and vegetables.", "Add the rice, soy sauce and sambal and fry until hot.", "Fry the eggs and serve one on every plate."],
      nl: ["Kook de rijst (liefst een paar uur van tevoren) en laat afkoelen.", "Roerbak de kip in stukjes, dan de ui, knoflook en groenten.", "Voeg de rijst, ketjap en sambal toe en bak tot alles heet is.", "Bak de eieren en leg er een op elk bord."],
    },
  },
  {
    id: "pancakes", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Dutch pancakes", nl: "Pannenkoeken" },
    ingredients: [["flour", 400, "g"], ["milk", 800, "ml"], ["eggs", 3, "pc"], ["butter", 40, "g"], ["syrup", 1, "pack"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Whisk the flour, salt and half of the milk smooth, then the eggs and the rest of the milk.", "Melt a little butter in a hot pan, pour in a thin layer of batter.", "Bake until the top is dry, flip, bake the other side.", "Serve with syrup (or bacon, cheese, apple...)."],
      nl: ["Klop de bloem, het zout en de helft van de melk glad, daarna de eieren en de rest van de melk.", "Smelt wat boter in een hete pan, giet er een dun laagje beslag in.", "Bak tot de bovenkant droog is, keer om en bak de andere kant.", "Serveer met stroop (of spek, kaas, appel...)."],
    },
  },
  {
    id: "shakshuka", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Shakshuka", nl: "Shakshuka" },
    ingredients: [["eggs", 6, "pc"], ["cannedTomatoes", 2, "can"], ["bellPepper", 2, "pc"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["feta", 150, "g"],
      ["bread", 1, "pc"], ["spices", 1, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Fry the onion, garlic and bell pepper strips with the spices.", "Add the tomatoes and simmer 10 minutes.", "Make small hollows and crack an egg into each; cover and cook 6–8 minutes.", "Crumble the feta on top and eat from the pan with bread."],
      nl: ["Bak de ui, knoflook en reepjes paprika met de kruiden.", "Voeg de tomaten toe en laat 10 minuten pruttelen.", "Maak kuiltjes en breek in elk een ei; deksel erop en 6–8 minuten garen.", "Verkruimel de feta erover en eet uit de pan met brood."],
    },
  },
  {
    id: "wraps", tags: [], servings: 4, minutes: 25,
    name: { en: "Chicken wraps", nl: "Kipwraps" },
    ingredients: [["tortillas", 8, "pc"], ["chicken", 500, "g"], ["bellPepper", 2, "pc"], ["onion", 1, "pc"], ["sourCream", 150, "ml"], ["cheese", 150, "g"],
      ["lettuce", 1, "pc"], ["spices", 2, "tbsp"], ["oil", 1, "tbsp"]],
    steps: {
      en: ["Cut the chicken, pepper and onion into strips.", "Fry the chicken with the spices, add the vegetables for the last 5 minutes.", "Warm the wraps in a dry pan.", "Fill with lettuce, the filling, cheese and sour cream."],
      nl: ["Snijd de kip, paprika en ui in reepjes.", "Bak de kip met de kruiden, voeg de laatste 5 minuten de groenten toe.", "Verwarm de wraps in een droge pan.", "Beleg met sla, de vulling, kaas en zure room."],
    },
  },
  {
    id: "greencurry", tags: [], servings: 4, minutes: 30,
    name: { en: "Thai green curry", nl: "Thaise groene curry" },
    ingredients: [["chicken", 500, "g"], ["coconutMilk", 400, "ml"], ["curryPaste", 3, "tbsp"], ["broccoli", 1, "pc"], ["bellPepper", 1, "pc"], ["rice", 300, "g"], ["oil", 1, "tbsp"]],
    steps: {
      en: ["Cook the rice.", "Fry the curry paste in a little oil for a minute, add the chicken in pieces.", "Pour in the coconut milk, add the broccoli florets and pepper; simmer 10 minutes.", "Serve with the rice."],
      nl: ["Kook de rijst.", "Bak de currypasta een minuut in wat olie, voeg de kip in stukjes toe.", "Giet de kokosmelk erbij, voeg de broccoliroosjes en paprika toe; 10 minuten laten sudderen.", "Serveer met de rijst."],
    },
  },
  {
    id: "pesto", tags: ["budget"], servings: 4, minutes: 15,
    name: { en: "Pasta pesto with cherry tomatoes", nl: "Pasta pesto met cherrytomaatjes" },
    ingredients: [["pasta", 400, "g"], ["pesto", 190, "g"], ["cherryTomatoes", 250, "g"], ["parmesan", 50, "g"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta.", "Halve the tomatoes.", "Drain the pasta, stir in the pesto and tomatoes.", "Serve with parmesan."],
      nl: ["Kook de pasta.", "Halveer de tomaatjes.", "Giet de pasta af, roer de pesto en tomaatjes erdoor.", "Serveer met parmezaan."],
    },
  },
  {
    id: "dahl", tags: ["budget", "group"], servings: 4, minutes: 35,
    name: { en: "Red lentil dahl", nl: "Rodelinzendahl" },
    ingredients: [["redLentils", 300, "g"], ["coconutMilk", 400, "ml"], ["cannedTomatoes", 1, "can"], ["onion", 1, "pc"], ["garlic", 2, "clove"],
      ["ginger", 1, "pc"], ["stockCube", 1, "pc"], ["curryPowder", 2, "tbsp"], ["rice", 300, "g"], ["oil", 1, "tbsp"]],
    steps: {
      en: ["Cook the rice.", "Fry the onion, garlic, grated ginger and curry powder.", "Add the lentils, tomatoes, coconut milk and 500 ml of water with the stock cube; simmer 20 minutes, stirring now and then.", "Serve with the rice."],
      nl: ["Kook de rijst.", "Fruit de ui, knoflook, geraspte gember en kerrie.", "Voeg de linzen, tomaten, kokosmelk en 500 ml water met het bouillonblokje toe; 20 minuten laten sudderen, af en toe roeren.", "Serveer met de rijst."],
    },
  },
  {
    id: "traybake", tags: ["group"], servings: 4, minutes: 50,
    name: { en: "Chicken and potato tray bake", nl: "Ovenschotel met kip en aardappel" },
    ingredients: [["chicken", 600, "g"], ["potatoes", 1000, "g"], ["carrots", 500, "g"], ["onion", 2, "pc"], ["garlic", 3, "clove"], ["honey", 2, "tbsp"],
      ["mustard", 1, "tbsp"], ["oil", 3, "tbsp"], ["driedHerbs", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C.", "Cut the potatoes, carrots and onions in chunks, toss with oil, herbs and salt on a tray; roast 20 minutes.", "Mix the honey and mustard, coat the chicken with it and add it to the tray with the garlic.", "Roast 25 minutes more, until the chicken is cooked."],
      nl: ["Verwarm de oven voor op 200 °C.", "Snijd de aardappelen, wortels en uien in stukken, hussel met olie, kruiden en zout op een bakplaat; 20 minuten roosteren.", "Meng de honing en mosterd, bestrijk de kip ermee en leg die met de knoflook op de plaat.", "Nog 25 minuten roosteren, tot de kip gaar is."],
    },
  },
  {
    id: "salmonbowl", tags: [], servings: 4, minutes: 25,
    name: { en: "Salmon rice bowl", nl: "Rijstbowl met zalm" },
    ingredients: [["salmon", 4, "pc"], ["rice", 300, "g"], ["broccoli", 1, "pc"], ["cucumber", 1, "pc"], ["soySauce", 4, "tbsp"], ["honey", 1, "tbsp"],
      ["sesameSeeds", 1, "tbsp"], ["oil", 1, "tbsp"]],
    steps: {
      en: ["Cook the rice; steam the broccoli for the last 5 minutes.", "Mix the soy sauce and honey.", "Fry the salmon 3–4 minutes per side, pour the sauce over it at the end.", "Fill the bowls with rice, broccoli, cucumber and salmon; sprinkle with sesame."],
      nl: ["Kook de rijst; stoom de broccoli de laatste 5 minuten mee.", "Meng de sojasaus en honing.", "Bak de zalm 3–4 minuten per kant, giet de saus er op het eind over.", "Vul de kommen met rijst, broccoli, komkommer en zalm; bestrooi met sesam."],
    },
  },
  {
    id: "lasagne", tags: ["group"], servings: 4, minutes: 70,
    name: { en: "Lasagne", nl: "Lasagne" },
    ingredients: [["lasagneSheets", 250, "g"], ["mincedBeef", 500, "g"], ["cannedTomatoes", 2, "can"], ["onion", 1, "pc"], ["garlic", 2, "clove"],
      ["milk", 500, "ml"], ["butter", 40, "g"], ["flour", 40, "g"], ["cheese", 150, "g"], ["driedHerbs", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Make a meat sauce: brown the mince with onion and garlic, add the tomatoes and herbs, simmer 15 minutes.", "White sauce: melt the butter, stir in the flour, then the milk bit by bit until thick.", "Layer sauce, sheets and white sauce in a dish three times; finish with cheese.", "Bake 35 minutes at 180 °C."],
      nl: ["Gehaktsaus: bak het gehakt rul met ui en knoflook, voeg tomaten en kruiden toe, 15 minuten laten pruttelen.", "Witte saus: smelt de boter, roer de bloem erdoor, daarna beetje bij beetje de melk tot het dik is.", "Leg drie keer saus, bladen en witte saus in een schaal; eindig met kaas.", "35 minuten bakken op 180 °C."],
    },
  },
  {
    id: "tunasalad", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Tuna pasta salad", nl: "Pastasalade met tonijn" },
    ingredients: [["pasta", 350, "g"], ["tuna", 2, "can"], ["sweetcorn", 1, "can"], ["cucumber", 1, "pc"], ["cherryTomatoes", 250, "g"], ["mayonnaise", 4, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta and rinse it cold.", "Dice the cucumber, halve the tomatoes, drain the tuna and corn.", "Mix everything with the mayonnaise and season.", "Chill until dinner."],
      nl: ["Kook de pasta en spoel koud af.", "Snijd de komkommer in blokjes, halveer de tomaatjes, laat tonijn en mais uitlekken.", "Meng alles met de mayonaise en breng op smaak.", "Koud zetten tot het eten."],
    },
  },
];
