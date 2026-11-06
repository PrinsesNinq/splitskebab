// Big-table dinners for 10: student house, dispuut and vereniging meals that cook in one big pan, pot or oven dish.
// Same format as the other library files (see library/index.js).

export const GROUP = [
  {
    id: "group-hachee", tags: ["group", "budget"], servings: 10, minutes: 180,
    name: { en: "Dutch beef and onion stew (hachee) with potatoes", nl: "Hachee met aardappelen" },
    ingredients: [["stewBeef", 1500, "g"], ["onion", 8, "pc"], ["butter", 75, "g"], ["flour", 3, "tbsp"], ["stockCube", 3, "pc"], ["vinegar", 4, "tbsp"],
      ["syrup", 2, "tbsp"], ["spices", 1, "tbsp"], ["potatoes", 2500, "g"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cut the beef into cubes, pat dry and brown it in butter in small batches, so it fries instead of steams.", "Fry the sliced onions in the same pan until soft and golden, then stir in the flour.", "Return the meat, add 1.5 litres of stock, the vinegar, syrup and spices; cover and simmer on low heat for 2.5 hours.", "In the last 30 minutes, peel and boil the potatoes in salted water.", "Season the stew with salt and pepper and serve with the potatoes."],
      nl: ["Snijd het vlees in blokjes, dep het droog en bak het in kleine porties bruin in boter, zodat het bakt en niet kookt.", "Bak de gesneden uien in dezelfde pan zacht en goudbruin en roer de bloem erdoor.", "Doe het vlees terug, voeg 1,5 liter bouillon, de azijn, stroop en kruiden toe; laat afgedekt 2,5 uur zachtjes stoven.", "Schil in het laatste halfuur de aardappelen en kook ze in water met zout.", "Breng de hachee op smaak met zout en peper en serveer met de aardappelen."],
    },
  },
  {
    id: "group-chili-con-carne", tags: ["group", "budget"], servings: 10, minutes: 75,
    name: { en: "Big-pot chili con carne with rice", nl: "Grote pan chili con carne met rijst" },
    ingredients: [["mincedBeef", 1500, "g"], ["onion", 4, "pc"], ["garlic", 6, "clove"], ["bellPepper", 4, "pc"], ["kidneyBeans", 4, "can"], ["sweetcorn", 2, "can"],
      ["cannedTomatoes", 4, "can"], ["tomatoPaste", 4, "tbsp"], ["spices", 4, "tbsp"], ["rice", 800, "g"], ["sourCream", 300, "ml"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Brown the mince in oil in your biggest pan, in two batches if needed.", "Add the chopped onion, garlic and bell pepper with the spices and fry 5 minutes.", "Stir in the tomato paste, canned tomatoes, drained beans and corn; simmer 40 minutes, stirring now and then so the bottom does not burn.", "Cook the rice in the meantime, season the chili and serve with sour cream."],
      nl: ["Bak het gehakt rul in olie in je grootste pan, eventueel in twee keer.", "Voeg de gesnipperde ui, knoflook en paprika met de kruiden toe en bak 5 minuten.", "Roer de tomatenpuree, tomatenblokjes, uitgelekte bonen en mais erdoor; laat 40 minuten pruttelen en roer af en toe zodat de bodem niet aanbrandt.", "Kook ondertussen de rijst, breng de chili op smaak en serveer met zure room."],
    },
  },
  {
    id: "group-pasta-bake", tags: ["group", "budget"], servings: 10, minutes: 60,
    name: { en: "Pasta bake with mince and cheese", nl: "Ovenpasta met gehakt en kaas" },
    ingredients: [["pasta", 1000, "g"], ["mincedMixed", 1200, "g"], ["onion", 3, "pc"], ["garlic", 4, "clove"], ["zucchini", 2, "pc"], ["bellPepper", 3, "pc"],
      ["passata", 1500, "ml"], ["driedHerbs", 2, "tbsp"], ["cheese", 400, "g"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C and cook the pasta 2 minutes shorter than the packet says.", "Brown the mince in oil, add the chopped onion, garlic, zucchini and bell pepper and fry 5 minutes.", "Stir in the passata and herbs, season and mix with the drained pasta.", "Spread over two large oven dishes, cover with the grated cheese and bake 20 minutes until golden."],
      nl: ["Verwarm de oven voor op 200 °C en kook de pasta 2 minuten korter dan op het pak staat.", "Bak het gehakt rul in olie, voeg de gesneden ui, knoflook, courgette en paprika toe en bak 5 minuten.", "Roer de passata en kruiden erdoor, breng op smaak en meng met de uitgelekte pasta.", "Verdeel over twee grote ovenschalen, strooi de geraspte kaas erover en bak 20 minuten tot goudbruin."],
    },
  },
  {
    id: "group-vegetable-lasagne", tags: ["group"], servings: 10, minutes: 90,
    name: { en: "Vegetable lasagne", nl: "Groentelasagne" },
    ingredients: [["lasagneSheets", 750, "g"], ["zucchini", 3, "pc"], ["eggplant", 2, "pc"], ["bellPepper", 3, "pc"], ["mushrooms", 500, "g"], ["spinach", 400, "g"],
      ["onion", 3, "pc"], ["garlic", 5, "clove"], ["passata", 1500, "ml"], ["driedHerbs", 2, "tbsp"], ["butter", 100, "g"], ["flour", 100, "g"], ["milk", 1200, "ml"],
      ["cheese", 300, "g"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Dice all the vegetables and fry them in oil with the onion and garlic in batches; stir in the spinach until wilted, then the passata and herbs.", "For the white sauce, melt the butter, stir in the flour, then whisk in the milk bit by bit until thick; season.", "Heat the oven to 180 °C and layer sauce, lasagne sheets, vegetables and white sauce in two large oven dishes.", "Finish with white sauce and grated cheese and bake 45 minutes; let rest 10 minutes so it cuts cleanly."],
      nl: ["Snijd alle groenten in blokjes en bak ze in porties in olie met de ui en knoflook; laat de spinazie erin slinken en roer de passata en kruiden erdoor.", "Smelt voor de witte saus de boter, roer de bloem erdoor en klop er beetje bij beetje de melk door tot het dik is; op smaak brengen.", "Verwarm de oven voor op 180 °C en bouw in twee grote ovenschalen laagjes van saus, lasagnebladen, groenten en witte saus.", "Eindig met witte saus en geraspte kaas en bak 45 minuten; laat 10 minuten rusten, dan snijd je mooiere stukken."],
    },
  },
  {
    id: "group-chicken-curry", tags: ["group", "budget"], servings: 10, minutes: 50,
    name: { en: "Chicken curry with rice", nl: "Kipcurry met rijst" },
    ingredients: [["chickenThighs", 1500, "g"], ["onion", 4, "pc"], ["garlic", 6, "clove"], ["ginger", 40, "g"], ["curryPowder", 4, "tbsp"], ["cannedTomatoes", 2, "can"],
      ["coconutMilk", 3, "can"], ["peas", 500, "g"], ["rice", 800, "g"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cut the chicken into pieces and brown it in oil in batches; set aside.", "Fry the chopped onion, garlic and ginger soft, then add the curry powder for 1 minute.", "Add the tomatoes, coconut milk and chicken; simmer 25 minutes, adding the peas for the last 5.", "Cook the rice meanwhile, season the curry with salt and serve."],
      nl: ["Snijd de kip in stukken en bak die in porties bruin in olie; zet apart.", "Fruit de gesnipperde ui, knoflook en gember zacht en bak de kerriepoeder 1 minuut mee.", "Voeg de tomaten, kokosmelk en kip toe; laat 25 minuten sudderen en doe de doperwten er de laatste 5 minuten bij.", "Kook ondertussen de rijst, breng de curry op smaak met zout en serveer."],
    },
  },
  {
    id: "group-taco-night", tags: ["group"], servings: 10, minutes: 40,
    name: { en: "Taco night", nl: "Tacoavond" },
    ingredients: [["tacoShells", 30, "pc"], ["mincedBeef", 1500, "g"], ["onion", 3, "pc"], ["spices", 4, "tbsp"], ["tacoSauce", 2, "pc"], ["blackBeans", 2, "can"],
      ["lettuce", 2, "pc"], ["tomatoes", 6, "pc"], ["avocado", 4, "pc"], ["lime", 2, "pc"], ["cheese", 400, "g"], ["sourCream", 400, "ml"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Brown the mince in oil with the chopped onion and spices, then stir in the drained beans and half the taco sauce.", "Shred the lettuce, dice the tomatoes and mash the avocados with lime juice and salt.", "Warm the taco shells in the oven at 180 °C for 5 minutes.", "Put everything in bowls in the middle of the table and let everyone build their own tacos."],
      nl: ["Bak het gehakt rul in olie met de gesnipperde ui en kruiden en roer de uitgelekte bonen en de helft van de tacosaus erdoor.", "Snijd de sla fijn, de tomaten in blokjes en prak de avocado's met limoensap en zout.", "Warm de tacoschelpen 5 minuten op in de oven op 180 °C.", "Zet alles in schaaltjes midden op tafel en laat iedereen zijn eigen taco's vullen."],
    },
  },
  {
    id: "group-enchiladas", tags: ["group"], servings: 10, minutes: 60,
    name: { en: "Chicken and bean enchiladas from the oven", nl: "Enchilada's met kip en bonen uit de oven" },
    ingredients: [["tortillas", 20, "pc"], ["chicken", 1200, "g"], ["blackBeans", 2, "can"], ["sweetcorn", 2, "can"], ["onion", 3, "pc"], ["bellPepper", 3, "pc"],
      ["spices", 4, "tbsp"], ["passata", 1000, "ml"], ["cheese", 400, "g"], ["sourCream", 300, "ml"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Fry the chicken in strips with the onion, bell pepper and spices in oil.", "Stir in the drained beans and corn and a third of the passata.", "Fill and roll the tortillas and lay them tightly side by side in two oven dishes.", "Pour over the rest of the passata, top with cheese and bake 20 minutes; serve with sour cream."],
      nl: ["Verwarm de oven voor op 200 °C. Bak de kip in reepjes met de ui, paprika en kruiden in olie.", "Roer de uitgelekte bonen en mais en een derde van de passata erdoor.", "Vul de tortilla's, rol ze op en leg ze strak naast elkaar in twee ovenschalen.", "Giet de rest van de passata erover, strooi de kaas erop en bak 20 minuten; serveer met zure room."],
    },
  },
  {
    id: "group-shepherds-pie", tags: ["group", "budget"], servings: 10, minutes: 80,
    name: { en: "Shepherd's pie with mince and mash", nl: "Shepherd's pie met gehakt en puree" },
    ingredients: [["mincedBeef", 1500, "g"], ["onion", 3, "pc"], ["carrots", 4, "pc"], ["celery", 3, "pc"], ["peas", 400, "g"], ["tomatoPaste", 3, "tbsp"],
      ["stockCube", 2, "pc"], ["driedHerbs", 1, "tbsp"], ["potatoes", 2500, "g"], ["milk", 300, "ml"], ["butter", 100, "g"], ["cheese", 200, "g"], ["oil", 2, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the potatoes and boil them 20 minutes; mash with the warm milk and butter and season.", "Brown the mince in oil, add the diced onion, carrot and celery and fry 5 minutes.", "Stir in the tomato paste, herbs and 500 ml stock; simmer 15 minutes, then add the peas.", "Heat the oven to 200 °C, spread the mince in two oven dishes, cover with mash and cheese and bake 25 minutes until golden."],
      nl: ["Schil de aardappelen en kook ze 20 minuten; stamp ze met de warme melk en boter tot puree en breng op smaak.", "Bak het gehakt rul in olie, voeg de ui, wortel en bleekselderij in blokjes toe en bak 5 minuten.", "Roer de tomatenpuree, kruiden en 500 ml bouillon erdoor; laat 15 minuten pruttelen en voeg dan de doperwten toe.", "Verwarm de oven voor op 200 °C, verdeel het gehakt over twee ovenschalen, dek af met puree en kaas en bak 25 minuten goudbruin."],
    },
  },
  {
    id: "group-moussaka", tags: ["group"], servings: 10, minutes: 100,
    name: { en: "Eggplant and mince oven dish (moussaka-style)", nl: "Ovenschotel met aubergine en gehakt (moussaka-stijl)" },
    ingredients: [["eggplant", 5, "pc"], ["mincedBeef", 1200, "g"], ["onion", 3, "pc"], ["garlic", 5, "clove"], ["cannedTomatoes", 3, "can"], ["tomatoPaste", 2, "tbsp"],
      ["cinnamon", 2, "tsp"], ["driedHerbs", 2, "tbsp"], ["potatoes", 1000, "g"], ["greekYogurt", 1000, "g"], ["eggs", 4, "pc"], ["cheese", 250, "g"], ["oil", 6, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Slice the eggplants and potatoes, brush with oil and roast on trays for 20 minutes.", "Brown the mince with the onion and garlic, add the tomatoes, paste, cinnamon and herbs and simmer 20 minutes.", "Whisk the yogurt with the eggs and half the cheese, and season.", "Layer potato, eggplant and mince in two oven dishes, pour the yogurt on top, sprinkle the rest of the cheese and bake 35 minutes."],
      nl: ["Verwarm de oven voor op 200 °C. Snijd de aubergines en aardappelen in plakken, bestrijk met olie en rooster 20 minuten op bakplaten.", "Bak het gehakt rul met de ui en knoflook, voeg tomaten, puree, kaneel en kruiden toe en laat 20 minuten pruttelen.", "Klop de yoghurt los met de eieren en de helft van de kaas en breng op smaak.", "Leg laagjes aardappel, aubergine en gehakt in twee ovenschalen, giet de yoghurt erover, strooi de rest van de kaas erop en bak 35 minuten."],
    },
  },
  {
    id: "group-paella", tags: ["group"], servings: 10, minutes: 60,
    name: { en: "Paella with chicken and chorizo", nl: "Paella met kip en chorizo" },
    ingredients: [["rice", 900, "g"], ["chickenThighs", 1200, "g"], ["chorizo", 400, "g"], ["shrimp", 400, "g"], ["onion", 3, "pc"], ["garlic", 6, "clove"], ["bellPepper", 3, "pc"],
      ["cannedTomatoes", 2, "can"], ["spices", 3, "tbsp"], ["stockCube", 3, "pc"], ["peas", 400, "g"], ["lemon", 2, "pc"], ["oil", 4, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Brown the chicken pieces and sliced chorizo in oil in a wide pan or roasting tin; set aside.", "Fry the onion, garlic and bell pepper, then stir in the rice and spices for 2 minutes.", "Add the tomatoes, 2.5 litres of stock and the meat; cook 20 minutes without stirring (or 30 minutes in the oven at 190 °C if your pan is too small).", "Push the shrimp and peas into the rice for the last 8 minutes and serve with lemon wedges."],
      nl: ["Bak de stukken kip en plakjes chorizo bruin in olie in een brede pan of braadslede; zet apart.", "Bak de ui, knoflook en paprika en roer de rijst en kruiden er 2 minuten door.", "Voeg de tomaten, 2,5 liter bouillon en het vlees toe; laat 20 minuten koken zonder te roeren (of 30 minuten in de oven op 190 °C als je pan te klein is).", "Druk de garnalen en doperwten de laatste 8 minuten in de rijst en serveer met partjes citroen."],
    },
  },
  {
    id: "group-goulash", tags: ["group"], servings: 10, minutes: 150,
    name: { en: "Goulash with beef and bell pepper", nl: "Goulash met rundvlees en paprika" },
    ingredients: [["stewBeef", 1500, "g"], ["onion", 5, "pc"], ["garlic", 4, "clove"], ["bellPepper", 5, "pc"], ["tomatoPaste", 4, "tbsp"], ["cannedTomatoes", 2, "can"],
      ["spices", 4, "tbsp"], ["stockCube", 2, "pc"], ["flour", 2, "tbsp"], ["potatoes", 2000, "g"], ["sourCream", 250, "ml"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cube the beef, dust with flour and brown it in oil in batches.", "Fry the onion and garlic, stir in the tomato paste and spices (paprika powder) for 1 minute.", "Add the meat, tomatoes and 1 litre of stock; cover and simmer 1.5 hours, then add the bell pepper strips for another 30 minutes.", "Boil the potatoes, season the goulash and serve with a spoon of sour cream."],
      nl: ["Snijd het vlees in blokjes, bestuif met bloem en bak het in porties bruin in olie.", "Fruit de ui en knoflook en bak de tomatenpuree en kruiden (paprikapoeder) 1 minuut mee.", "Voeg het vlees, de tomaten en 1 liter bouillon toe; laat afgedekt 1,5 uur stoven en doe dan de paprikareepjes er nog 30 minuten bij.", "Kook de aardappelen, breng de goulash op smaak en serveer met een lepel zure room."],
    },
  },
  {
    id: "group-oven-risotto", tags: ["group"], servings: 10, minutes: 55,
    name: { en: "Oven risotto with mushrooms", nl: "Ovenrisotto met paddenstoelen" },
    ingredients: [["rice", 900, "g"], ["mushrooms", 1200, "g"], ["onion", 3, "pc"], ["garlic", 5, "clove"], ["stockCube", 4, "pc"], ["butter", 80, "g"],
      ["parmesan", 200, "g"], ["spinach", 300, "g"], ["driedHerbs", 1, "tbsp"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 190 °C. Fry the sliced mushrooms in batches in a hot pan with oil until browned; set aside.", "Fry the onion and garlic in butter in a large ovenproof pan or roasting tin and stir the rice through.", "Pour in 2.5 litres of hot stock with the herbs, cover with a lid or foil and bake 30 minutes.", "Stir in the mushrooms, spinach and parmesan until creamy, and season."],
      nl: ["Verwarm de oven voor op 190 °C. Bak de gesneden champignons in porties bruin in een hete pan met olie; zet apart.", "Fruit de ui en knoflook in boter in een grote ovenvaste pan of braadslede en roer de rijst erdoor.", "Giet er 2,5 liter hete bouillon met de kruiden bij, dek af met een deksel of folie en bak 30 minuten.", "Roer de champignons, spinazie en parmezaan erdoor tot het romig is en breng op smaak."],
    },
  },
  {
    id: "group-pizza-night", tags: ["group"], servings: 10, minutes: 90,
    name: { en: "Pizza night with fresh dough", nl: "Pizza-avond met vers deeg" },
    ingredients: [["flour", 1500, "g"], ["yeast", 2, "pack"], ["oil", 6, "tbsp"], ["sugar", 2, "tsp"], ["salt", 3, "tsp"], ["passata", 1000, "ml"], ["driedHerbs", 2, "tbsp"], ["mozzarella", 6, "pc"],
      ["ham", 300, "g"], ["mushrooms", 400, "g"], ["bellPepper", 3, "pc"], ["onion", 2, "pc"], ["cherryTomatoes", 500, "g"]],
    steps: {
      en: ["Mix the flour with the dried yeast from the packet, the sugar, salt, oil and about 900 ml lukewarm water; knead 10 minutes and let rise 1 hour.", "Season the passata with the herbs and a pinch of salt and slice all the toppings into bowls.", "Heat the oven as hot as it goes (250 °C) and roll the dough out on baking trays.", "Let everyone top their own part, then bake each tray 10–12 minutes on the lowest rack."],
      nl: ["Meng de bloem met de gedroogde gist (uit het pakje), suiker, zout, olie en ongeveer 900 ml lauw water; kneed 10 minuten en laat 1 uur rijzen.", "Breng de passata op smaak met de kruiden en een snuf zout en snijd alle toppings in schaaltjes.", "Zet de oven zo heet als hij kan (250 °C) en rol het deeg uit op bakplaten.", "Laat iedereen zijn eigen stuk beleggen en bak elke plaat 10-12 minuten op de onderste richel."],
    },
  },
  {
    id: "group-burger-night", tags: ["group"], servings: 10, minutes: 45,
    name: { en: "Burger night with oven wedges", nl: "Burgeravond met aardappelpartjes uit de oven" },
    ingredients: [["burgerBuns", 10, "pc"], ["mincedBeef", 1500, "g"], ["eggs", 1, "pc"], ["breadcrumbs", 50, "g"], ["potatoes", 2000, "g"], ["cheese", 10, "pc"],
      ["lettuce", 1, "pc"], ["tomatoes", 4, "pc"], ["onion", 2, "pc"], ["cucumber", 1, "pc"], ["mayonnaise", 200, "ml"], ["mustard", 3, "tbsp"], ["spices", 2, "tbsp"],
      ["oil", 4, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 220 °C. Cut the potatoes into wedges, toss with oil, spices and salt and roast 35 minutes on two trays.", "Mix the mince with the egg, breadcrumbs, salt and pepper and shape 10 burgers; press a dent in the middle so they stay flat.", "Fry the burgers 3–4 minutes per side in batches, put a cheese slice on top at the end and keep them warm in the oven.", "Toast the buns and set out lettuce, tomato, onion, cucumber, mayonnaise and mustard so everyone builds their own."],
      nl: ["Verwarm de oven voor op 220 °C. Snijd de aardappelen in partjes, hussel met olie, kruiden en zout en rooster 35 minuten op twee bakplaten.", "Meng het gehakt met het ei, paneermeel, zout en peper en vorm 10 burgers; druk een kuiltje in het midden zodat ze plat blijven.", "Bak de burgers in porties 3-4 minuten per kant, leg er op het eind een plak kaas op en houd ze warm in de oven.", "Rooster de broodjes en zet sla, tomaat, ui, komkommer, mayonaise en mosterd neer zodat iedereen zijn eigen burger maakt."],
    },
  },
  {
    id: "group-quiche", tags: ["group"], servings: 10, minutes: 70,
    name: { en: "Puff pastry quiche with bacon and leek", nl: "Quiche van bladerdeeg met spek en prei" },
    ingredients: [["puffPastry", 2, "pack"], ["eggs", 12, "pc"], ["cookingCream", 500, "ml"], ["milk", 250, "ml"], ["bacon", 400, "g"], ["leek", 4, "pc"],
      ["cheese", 300, "g"], ["lettuce", 2, "pc"], ["cherryTomatoes", 500, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 190 °C and line two large greased oven dishes or quiche tins with the puff pastry.", "Fry the bacon until crisp, then add the sliced leek and cook it soft.", "Whisk the eggs with the cream, milk, half the cheese, salt and pepper.", "Spread the leek and bacon over the pastry, pour the egg mixture over it, top with the rest of the cheese and bake 40 minutes.", "Serve warm with a green salad of lettuce and cherry tomatoes."],
      nl: ["Verwarm de oven voor op 190 °C en bekleed twee grote ingevette ovenschalen of quichevormen met het bladerdeeg.", "Bak het spek krokant en laat daarna de gesneden prei erin zacht worden.", "Klop de eieren los met de room, melk, de helft van de kaas, zout en peper.", "Verdeel prei en spek over het deeg, giet het eimengsel erover, strooi de rest van de kaas erop en bak 40 minuten.", "Serveer warm met een salade van sla en cherrytomaatjes."],
    },
  },
  {
    id: "group-pumpkin-soup", tags: ["group", "budget"], servings: 10, minutes: 50,
    name: { en: "Big pot of pumpkin-carrot soup with bread", nl: "Grote pan pompoen-wortelsoep met brood" },
    ingredients: [["pumpkin", 3000, "g"], ["onion", 4, "pc"], ["garlic", 4, "clove"], ["carrots", 4, "pc"], ["ginger", 30, "g"], ["stockCube", 4, "pc"],
      ["coconutMilk", 2, "can"], ["curryPowder", 1, "tbsp"], ["bread", 2, "pc"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel and cube the pumpkin and carrots; chop the onion, garlic and ginger.", "Fry the onion, garlic and ginger in oil in a large soup pot with the curry powder.", "Add the pumpkin, carrots and 3 litres of stock; simmer 25 minutes until soft.", "Blend smooth, stir in the coconut milk, season and serve with warm bread."],
      nl: ["Schil de pompoen en wortels en snijd ze in blokjes; snipper de ui, knoflook en gember.", "Fruit de ui, knoflook en gember in olie in een grote soeppan met de kerriepoeder.", "Voeg de pompoen, wortels en 3 liter bouillon toe; laat 25 minuten zacht koken.", "Pureer glad, roer de kokosmelk erdoor, breng op smaak en serveer met warm brood."],
    },
  },
  {
    id: "group-couscous-salad", tags: ["group", "budget"], servings: 10, minutes: 35,
    name: { en: "Big couscous salad with roasted vegetables and feta", nl: "Grote couscoussalade met geroosterde groenten en feta" },
    ingredients: [["couscous", 800, "g"], ["stockCube", 2, "pc"], ["zucchini", 3, "pc"], ["bellPepper", 4, "pc"], ["onion", 3, "pc"], ["chickpeas", 3, "can"],
      ["cucumber", 2, "pc"], ["cherryTomatoes", 500, "g"], ["feta", 400, "g"], ["freshHerbs", 2, "pc"], ["lemon", 3, "pc"], ["spices", 2, "tbsp"], ["oil", 8, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 220 °C. Cut the zucchini, bell pepper and onion into chunks, toss with oil, spices and the drained chickpeas and roast 25 minutes.", "Pour 1 litre of hot stock over the couscous, cover and let it soak 5 minutes, then fluff with a fork.", "Dice the cucumber, halve the tomatoes and chop the herbs.", "Mix everything with lemon juice and oil, season and crumble the feta on top; it keeps well, so you can make it ahead."],
      nl: ["Verwarm de oven voor op 220 °C. Snijd de courgette, paprika en ui in stukken, hussel met olie, kruiden en de uitgelekte kikkererwten en rooster 25 minuten.", "Giet 1 liter hete bouillon over de couscous, dek af en laat 5 minuten wellen; maak los met een vork.", "Snijd de komkommer in blokjes, halveer de tomaatjes en hak de kruiden.", "Meng alles met citroensap en olie, breng op smaak en verkruimel de feta erover; hij blijft goed, dus je kunt hem van tevoren maken."],
    },
  },
  {
    id: "group-gnocchi-bake", tags: ["group"], servings: 10, minutes: 45,
    name: { en: "Gnocchi oven dish with tomato and mozzarella", nl: "Gnocchi-ovenschotel met tomaat en mozzarella" },
    ingredients: [["gnocchi", 2000, "g"], ["onion", 3, "pc"], ["garlic", 5, "clove"], ["zucchini", 2, "pc"], ["spinach", 400, "g"], ["passata", 1500, "ml"],
      ["driedHerbs", 2, "tbsp"], ["mozzarella", 4, "pc"], ["parmesan", 100, "g"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Fry the onion, garlic and diced zucchini in oil, add the passata and herbs and simmer 10 minutes.", "Stir in the spinach until wilted and season.", "Mix the raw gnocchi through the sauce (no need to boil them first) and spread over two oven dishes.", "Tear the mozzarella over the top, sprinkle with parmesan and bake 20 minutes until bubbling."],
      nl: ["Verwarm de oven voor op 200 °C. Bak de ui, knoflook en courgetteblokjes in olie, voeg de passata en kruiden toe en laat 10 minuten pruttelen.", "Laat de spinazie erin slinken en breng op smaak.", "Schep de ongekookte gnocchi door de saus (voorkoken hoeft niet) en verdeel over twee ovenschalen.", "Scheur de mozzarella erover, strooi de parmezaan erop en bak 20 minuten tot het borrelt."],
    },
  },
  {
    id: "group-meatballs-pasta", tags: ["group", "budget"], servings: 10, minutes: 60,
    name: { en: "Meatballs in tomato sauce with pasta", nl: "Gehaktballetjes in tomatensaus met pasta" },
    ingredients: [["mincedMixed", 1500, "g"], ["eggs", 2, "pc"], ["breadcrumbs", 100, "g"], ["onion", 3, "pc"], ["garlic", 6, "clove"], ["cannedTomatoes", 4, "can"],
      ["tomatoPaste", 3, "tbsp"], ["driedHerbs", 2, "tbsp"], ["sugar", 1, "tsp"], ["spaghetti", 1000, "g"], ["parmesan", 150, "g"], ["oil", 3, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Mix the mince with the eggs, breadcrumbs, one grated onion, salt and pepper and roll about 50 small balls.", "Bake them on oiled trays in the oven at 220 °C for 15 minutes: much quicker than frying 50 balls in a pan.", "Fry the rest of the onion and the garlic, add the tomatoes, paste, herbs and sugar and simmer 15 minutes; add the meatballs and simmer 10 minutes more.", "Cook the spaghetti and serve with the meatballs and parmesan."],
      nl: ["Meng het gehakt met de eieren, het paneermeel, een geraspte ui, zout en peper en draai er zo'n 50 balletjes van.", "Bak ze 15 minuten op ingevette bakplaten in de oven op 220 °C: veel sneller dan 50 balletjes in de pan bakken.", "Fruit de rest van de ui en de knoflook, voeg tomaten, puree, kruiden en suiker toe en laat 15 minuten pruttelen; doe de balletjes erbij en laat nog 10 minuten sudderen.", "Kook de spaghetti en serveer met de balletjes en parmezaan."],
    },
  },
  {
    id: "group-tikka-masala", tags: ["group"], servings: 10, minutes: 60,
    name: { en: "Butter-chicken-style tikka masala with naan and rice", nl: "Tikka masala (butter chicken-stijl) met naan en rijst" },
    ingredients: [["chicken", 1500, "g"], ["greekYogurt", 300, "g"], ["tikkaPaste", 8, "tbsp"], ["onion", 4, "pc"], ["garlic", 6, "clove"], ["ginger", 40, "g"],
      ["passata", 1000, "ml"], ["cookingCream", 500, "ml"], ["butter", 75, "g"], ["sugar", 1, "tsp"], ["rice", 700, "g"], ["naan", 10, "pc"], ["freshHerbs", 1, "pc"],
      ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cut the chicken into pieces and marinate with the yogurt and half the tikka paste for at least 30 minutes (the morning before is even better).", "Spread the chicken on trays and grill in the oven at 230 °C for 15 minutes.", "Fry the onion, garlic and ginger in butter and oil, add the rest of the paste, then the passata, cream and sugar; simmer 15 minutes.", "Stir in the chicken, cook the rice, warm the naan in the oven and serve with fresh herbs."],
      nl: ["Snijd de kip in stukken en marineer met de yoghurt en de helft van de tikkapasta minstens 30 minuten (die ochtend al is nog beter).", "Verdeel de kip over bakplaten en gril 15 minuten in de oven op 230 °C.", "Fruit de ui, knoflook en gember in boter en olie, bak de rest van de pasta mee en voeg de passata, room en suiker toe; laat 15 minuten pruttelen.", "Roer de kip erdoor, kook de rijst, warm de naan op in de oven en serveer met verse kruiden."],
    },
  },
  {
    id: "group-three-bean-chili", tags: ["group", "budget"], servings: 10, minutes: 60,
    name: { en: "Vegan three-bean chili with rice", nl: "Vegan chili met drie soorten bonen en rijst" },
    ingredients: [["kidneyBeans", 3, "can"], ["blackBeans", 3, "can"], ["whiteBeans", 2, "can"], ["onion", 4, "pc"], ["garlic", 6, "clove"], ["bellPepper", 4, "pc"],
      ["carrots", 3, "pc"], ["cannedTomatoes", 4, "can"], ["tomatoPaste", 4, "tbsp"], ["spices", 4, "tbsp"], ["sweetcorn", 2, "can"], ["rice", 800, "g"], ["avocado", 3, "pc"],
      ["lime", 2, "pc"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Fry the chopped onion, garlic, bell pepper and carrot in oil with the spices for 8 minutes.", "Stir in the tomato paste, canned tomatoes and all the drained beans and corn; simmer 30 minutes, stirring now and then.", "Cook the rice and dice the avocado with lime juice.", "Season the chili with salt and lime and serve on the rice with the avocado; it tastes even better the next day."],
      nl: ["Bak de gesneden ui, knoflook, paprika en wortel 8 minuten in olie met de kruiden.", "Roer de tomatenpuree, tomatenblokjes en alle uitgelekte bonen en mais erdoor; laat 30 minuten pruttelen en roer af en toe.", "Kook de rijst en snijd de avocado in blokjes met wat limoensap.", "Breng de chili op smaak met zout en limoen en serveer op de rijst met de avocado; de volgende dag is hij nog lekkerder."],
    },
  },
  {
    id: "group-stamppot-buffet", tags: ["group", "budget"], servings: 10, minutes: 50,
    name: { en: "Stamppot buffet with spinach and pointed cabbage", nl: "Stamppotbuffet met spinazie en spitskool" },
    ingredients: [["potatoes", 3000, "g"], ["spinach", 800, "g"], ["pointedCabbage", 2, "pc"], ["bacon", 300, "g"], ["smokedSausage", 3, "pc"], ["milk", 400, "ml"],
      ["butter", 120, "g"], ["cheese", 200, "g"], ["mustard", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the potatoes and boil them in two pans for 20 minutes.", "Fry the bacon crisp, then stir-fry the shredded pointed cabbage in the fat until just soft.", "Heat the smoked sausages in hot (not boiling) water for 15 minutes.", "Mash all the potatoes with warm milk and butter, then split: stir the raw spinach through one half and the cabbage and bacon through the other.", "Serve both stamppots with sliced sausage, grated cheese and mustard on the side."],
      nl: ["Schil de aardappelen en kook ze in twee pannen 20 minuten.", "Bak het spek krokant en roerbak daarna de gesneden spitskool in het vet tot hij net zacht is.", "Verwarm de rookworsten 15 minuten in heet (niet kokend) water.", "Stamp alle aardappelen met warme melk en boter en verdeel in tweeën: roer de rauwe spinazie door de ene helft en de spitskool met spek door de andere.", "Serveer beide stamppotten met plakjes rookworst, geraspte kaas en mosterd ernaast."],
    },
  },
];
