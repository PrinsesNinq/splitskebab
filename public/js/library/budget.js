// Budget recipes: cheap Dutch-student meals with few, basic supermarket ingredients, mostly one pan.
// Same format as the other library files (see library/index.js).

export const BUDGET = [
  {
    id: "budget-macaroni", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Macaroni with ham and cheese", nl: "Macaroni met ham en kaas" },
    ingredients: [["pasta", 400, "g"], ["ham", 150, "g"], ["cheese", 150, "g"], ["onion", 1, "pc"], ["cannedTomatoes", 1, "can"], ["tomatoPaste", 1, "tbsp"],
      ["driedHerbs", 1, "tsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the macaroni according to the packet.", "Fry the chopped onion in oil, add the tomato paste and fry 1 minute.", "Add the canned tomatoes, herbs and ham strips; simmer 5 minutes.", "Stir in the drained macaroni, season and melt the grated cheese over it."],
      nl: ["Kook de macaroni volgens de verpakking.", "Fruit de gesnipperde ui in olie, voeg de tomatenpuree toe en bak 1 minuut mee.", "Doe de tomatenblokjes, kruiden en reepjes ham erbij; laat 5 minuten pruttelen.", "Schep de uitgelekte macaroni erdoor, breng op smaak en laat de geraspte kaas erop smelten."],
    },
  },
  {
    id: "budget-carbonara", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Pasta carbonara with bacon bits", nl: "Pasta carbonara met spekblokjes" },
    ingredients: [["spaghetti", 400, "g"], ["bacon", 200, "g"], ["eggs", 3, "pc"], ["parmesan", 60, "g"], ["garlic", 1, "clove"], ["salt", 1, "pinch"], ["blackPepper", 2, "pinch"]],
    steps: {
      en: ["Cook the spaghetti in salted water; keep a cup of the cooking water.", "Fry the bacon bits with the crushed garlic until crispy.", "Beat the eggs with the grated parmesan and plenty of pepper.", "Take the pan off the heat, toss the pasta with the bacon and the egg mix, adding a splash of cooking water until creamy."],
      nl: ["Kook de spaghetti in water met zout; houd een kopje kookwater apart.", "Bak de spekblokjes met de geperste knoflook krokant.", "Klop de eieren los met de geraspte parmezaan en flink wat peper.", "Haal de pan van het vuur, schep de pasta door het spek en het eimengsel en voeg een scheutje kookwater toe tot het romig is."],
    },
  },
  {
    id: "budget-fried-rice", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Fried rice with egg and peas", nl: "Gebakken rijst met ei en doperwten" },
    ingredients: [["rice", 300, "g"], ["eggs", 4, "pc"], ["peas", 300, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["springOnion", 2, "pc"], ["soySauce", 3, "tbsp"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice and let it cool a little (leftover rice works best).", "Fry the onion and garlic in oil, add the peas and fry 3 minutes.", "Push everything aside, scramble the eggs in the pan and mix through.", "Add the rice and soy sauce and stir-fry until hot; top with spring onion."],
      nl: ["Kook de rijst en laat hem wat afkoelen (rijst van gisteren werkt het best).", "Bak de ui en knoflook in olie, voeg de doperwten toe en bak 3 minuten.", "Schuif alles opzij, roerbak de eieren in de pan en meng ze erdoor.", "Voeg de rijst en sojasaus toe en roerbak tot alles heet is; bestrooi met lente-ui."],
    },
  },
  {
    id: "budget-bami", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Bami goreng", nl: "Bami goreng" },
    ingredients: [["eggNoodles", 300, "g"], ["mincedMixed", 300, "g"], ["pointedCabbage", 0.5, "pc"], ["carrots", 2, "pc"], ["leek", 1, "pc"], ["onion", 1, "pc"], ["garlic", 2, "clove"],
      ["ketjapManis", 4, "tbsp"], ["sambal", 1, "tsp"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Soak or cook the noodles according to the packet and drain.", "Cut the cabbage, leek and carrots into thin strips; chop the onion and garlic.", "Brown the mince in oil with the onion and garlic.", "Add the vegetables and stir-fry 5 minutes, then toss in the noodles, ketjap and sambal until hot."],
      nl: ["Wel of kook de mie volgens de verpakking en giet af.", "Snijd de spitskool, prei en wortels in dunne reepjes; snipper de ui en knoflook.", "Bak het gehakt rul in olie met de ui en knoflook.", "Roerbak de groenten 5 minuten mee en schep dan de mie, ketjap en sambal erdoor tot alles heet is."],
    },
  },
  {
    id: "budget-hutspot", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Hutspot with smoked sausage", nl: "Hutspot met rookworst" },
    ingredients: [["potatoes", 1200, "g"], ["carrots", 800, "g"], ["onion", 3, "pc"], ["smokedSausage", 1, "pc"], ["milk", 100, "ml"], ["butter", 30, "g"], ["mustard", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the potatoes and carrots and cut them into pieces; cut the onions into rings.", "Boil everything together in salted water for 20 minutes.", "Heat the sausage in hot (not boiling) water for 10 minutes.", "Drain and mash with the milk and butter, season and serve with sausage slices and mustard."],
      nl: ["Schil de aardappelen en wortels en snijd ze in stukken; snijd de uien in ringen.", "Kook alles samen 20 minuten in water met zout.", "Verwarm de rookworst 10 minuten in heet (niet kokend) water.", "Giet af en stamp fijn met de melk en boter, breng op smaak en serveer met plakjes rookworst en mosterd."],
    },
  },
  {
    id: "budget-spinach-stamppot", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Spinach stamppot with egg", nl: "Spinaziestamppot met ei" },
    ingredients: [["potatoes", 1200, "g"], ["spinach", 400, "g"], ["eggs", 4, "pc"], ["bacon", 150, "g"], ["milk", 100, "ml"], ["butter", 30, "g"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the potatoes, cut them into pieces and boil them 20 minutes.", "Fry the bacon bits until crispy and boil the eggs for 8 minutes.", "Drain the potatoes and mash with the warm milk and butter.", "Stir the raw spinach and bacon through the hot mash, season and serve with halved eggs."],
      nl: ["Schil de aardappelen, snijd ze in stukken en kook ze 20 minuten.", "Bak de spekblokjes krokant en kook de eieren 8 minuten.", "Giet de aardappelen af en stamp ze fijn met de warme melk en boter.", "Roer de rauwe spinazie en het spek door de hete stamppot, breng op smaak en serveer met gehalveerde eieren."],
    },
  },
  {
    id: "budget-potato-leek-soup", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Potato-leek soup with bread", nl: "Aardappel-preisoep met brood" },
    ingredients: [["potatoes", 600, "g"], ["leek", 2, "pc"], ["onion", 1, "pc"], ["stockCube", 2, "pc"], ["cookingCream", 100, "ml"], ["butter", 20, "g"], ["bread", 1, "pc"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Clean and slice the leek, chop the onion and cut the potatoes into cubes.", "Soften the leek and onion in butter for 5 minutes.", "Add the potatoes, 1.2 litres of water and the stock cubes; simmer 20 minutes.", "Blend smooth, stir in the cream, season and serve with bread."],
      nl: ["Was en snijd de prei, snipper de ui en snijd de aardappelen in blokjes.", "Smoor de prei en ui 5 minuten in boter.", "Voeg de aardappelen, 1,2 liter water en de bouillonblokjes toe; laat 20 minuten zachtjes koken.", "Pureer glad, roer de room erdoor, breng op smaak en eet er brood bij."],
    },
  },
  {
    id: "budget-tomato-soup", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Tomato soup with bread", nl: "Tomatensoep met brood" },
    ingredients: [["cannedTomatoes", 2, "can"], ["onion", 1, "pc"], ["carrots", 1, "pc"], ["garlic", 2, "clove"], ["tomatoPaste", 2, "tbsp"], ["stockCube", 1, "pc"], ["driedHerbs", 1, "tsp"],
      ["sugar", 1, "tsp"], ["oil", 1, "tbsp"], ["bread", 1, "pc"], ["cheese", 100, "g"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, carrot and garlic and fry them 5 minutes in oil.", "Add the tomato paste, then the canned tomatoes, 600 ml water, stock cube, herbs and sugar.", "Simmer 15 minutes and blend smooth; season.", "Serve with bread, toasted with cheese if you like."],
      nl: ["Snipper de ui, wortel en knoflook en bak ze 5 minuten in olie.", "Voeg de tomatenpuree toe, daarna de tomatenblokjes, 600 ml water, het bouillonblokje, de kruiden en de suiker.", "Laat 15 minuten pruttelen en pureer glad; breng op smaak.", "Serveer met brood, eventueel geroosterd met kaas."],
    },
  },
  {
    id: "budget-lentil-bolognese", tags: ["budget"], servings: 4, minutes: 40,
    name: { en: "Lentil bolognese", nl: "Linzenbolognese" },
    ingredients: [["spaghetti", 400, "g"], ["greenLentils", 2, "can"], ["onion", 1, "pc"], ["carrots", 2, "pc"], ["garlic", 2, "clove"], ["cannedTomatoes", 2, "can"], ["tomatoPaste", 2, "tbsp"],
      ["driedHerbs", 1, "tbsp"], ["oil", 1, "tbsp"], ["parmesan", 40, "g"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, garlic and carrots finely and fry 5 minutes in oil.", "Stir in the tomato paste, canned tomatoes and herbs.", "Add the drained lentils and simmer 20 minutes.", "Cook the spaghetti, season the sauce and serve with parmesan."],
      nl: ["Snipper de ui, knoflook en wortels fijn en bak ze 5 minuten in olie.", "Roer de tomatenpuree, tomatenblokjes en kruiden erdoor.", "Voeg de uitgelekte linzen toe en laat 20 minuten sudderen.", "Kook de spaghetti, breng de saus op smaak en serveer met parmezaan."],
    },
  },
  {
    id: "budget-chickpea-curry", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Cheap chickpea curry with rice", nl: "Goedkope kikkererwtencurry met rijst" },
    ingredients: [["chickpeas", 2, "can"], ["cannedTomatoes", 1, "can"], ["coconutMilk", 1, "can"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["spinach", 200, "g"], ["curryPowder", 2, "tbsp"],
      ["rice", 300, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Fry the chopped onion and garlic in oil, add the curry powder and fry 1 minute.", "Add the tomatoes, coconut milk and drained chickpeas; simmer 15 minutes.", "Stir in the spinach until wilted, season and serve with the rice."],
      nl: ["Kook de rijst.", "Fruit de gesnipperde ui en knoflook in olie, voeg het kerriepoeder toe en bak 1 minuut mee.", "Doe de tomaten, kokosmelk en uitgelekte kikkererwten erbij; laat 15 minuten sudderen.", "Roer de spinazie erdoor tot hij geslonken is, breng op smaak en serveer met de rijst."],
    },
  },
  {
    id: "budget-bean-burritos", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Black bean burritos", nl: "Burrito's met zwarte bonen" },
    ingredients: [["tortillas", 8, "pc"], ["blackBeans", 2, "can"], ["rice", 200, "g"], ["sweetcorn", 1, "can"], ["onion", 1, "pc"], ["bellPepper", 1, "pc"], ["cheese", 150, "g"],
      ["tacoSauce", 4, "tbsp"], ["spices", 1, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Fry the chopped onion and bell pepper in oil with the spices.", "Add the drained beans and corn, mash a little and heat through.", "Fill the warmed tortillas with rice, beans, cheese and taco sauce, then roll them up."],
      nl: ["Kook de rijst.", "Bak de gesnipperde ui en paprika in olie met de kruiden.", "Voeg de uitgelekte bonen en mais toe, prak ze een beetje en verwarm ze goed.", "Vul de opgewarmde wraps met rijst, bonen, kaas en tacosaus en rol ze op."],
    },
  },
  {
    id: "budget-baked-potatoes", tags: ["budget"], servings: 4, minutes: 70,
    name: { en: "Loaded baked potatoes with cheese and beans", nl: "Gevulde ovenaardappelen met kaas en bonen" },
    ingredients: [["potatoes", 1000, "g"], ["whiteBeans", 2, "can"], ["passata", 300, "ml"], ["cheese", 150, "g"], ["sourCream", 125, "ml"], ["springOnion", 2, "pc"], ["spices", 1, "tsp"],
      ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Prick 4 large potatoes, rub with oil and salt and bake 60 minutes at 200 °C.", "Heat the drained beans with the passata and spices for 10 minutes.", "Cut the potatoes open and fluff the inside with a fork.", "Fill with beans and cheese, top with sour cream and spring onion."],
      nl: ["Prik 4 grote aardappelen in, wrijf ze in met olie en zout en bak ze 60 minuten op 200 °C.", "Verwarm de uitgelekte bonen 10 minuten met de passata en kruiden.", "Snijd de aardappelen open en prak de binnenkant los met een vork.", "Vul met bonen en kaas en maak af met zure room en lente-ui."],
    },
  },
  {
    id: "budget-spinach-cream-cheese-pasta", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Pasta with spinach and cream cheese", nl: "Pasta met spinazie en roomkaas" },
    ingredients: [["pasta", 400, "g"], ["spinach", 400, "g"], ["creamCheese", 200, "g"], ["garlic", 2, "clove"], ["onion", 1, "pc"], ["parmesan", 30, "g"], ["oil", 1, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta; keep a little cooking water.", "Fry the chopped onion and garlic in oil.", "Add the spinach in handfuls and let it wilt.", "Stir in the cream cheese and a splash of cooking water, toss with the pasta, season and top with parmesan."],
      nl: ["Kook de pasta; houd wat kookwater apart.", "Fruit de gesnipperde ui en knoflook in olie.", "Voeg de spinazie in handjes toe en laat hem slinken.", "Roer de roomkaas en een scheutje kookwater erdoor, schep de pasta erdoor, breng op smaak en bestrooi met parmezaan."],
    },
  },
  {
    id: "budget-broccoli-pasta", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Broccoli pasta with garlic and parmesan", nl: "Broccolipasta met knoflook en parmezaan" },
    ingredients: [["pasta", 400, "g"], ["broccoli", 2, "pc"], ["garlic", 4, "clove"], ["parmesan", 60, "g"], ["oil", 4, "tbsp"], ["lemon", 1, "pc"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cut the broccoli into small florets.", "Cook the pasta and add the broccoli for the last 4 minutes; drain, keeping some cooking water.", "Gently fry the sliced garlic in the oil until golden.", "Toss the pasta and broccoli with the garlic oil, a splash of cooking water, lemon juice and parmesan; season."],
      nl: ["Snijd de broccoli in kleine roosjes.", "Kook de pasta en doe de broccoli de laatste 4 minuten erbij; giet af en houd wat kookwater apart.", "Bak de plakjes knoflook zachtjes goudbruin in de olie.", "Schep de pasta en broccoli om met de knoflookolie, een scheutje kookwater, citroensap en parmezaan; breng op smaak."],
    },
  },
  {
    id: "budget-wentelteefjes", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Wentelteefjes (Dutch French toast)", nl: "Wentelteefjes" },
    ingredients: [["bread", 1, "pc"], ["eggs", 4, "pc"], ["milk", 300, "ml"], ["sugar", 2, "tbsp"], ["cinnamon", 2, "tsp"], ["butter", 40, "g"], ["apples", 2, "pc"]],
    steps: {
      en: ["Beat the eggs with the milk, 1 tablespoon of sugar and the cinnamon in a deep plate.", "Soak the slices of bread briefly on both sides.", "Fry them golden brown in butter, about 2 minutes per side.", "Serve with fried apple slices and a sprinkle of sugar and cinnamon."],
      nl: ["Klop de eieren los met de melk, 1 eetlepel suiker en de kaneel in een diep bord.", "Laat de sneetjes brood aan beide kanten even weken.", "Bak ze in boter goudbruin, ongeveer 2 minuten per kant.", "Serveer met gebakken partjes appel en bestrooi met suiker en kaneel."],
    },
  },
  {
    id: "budget-veggie-omelette", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Omelette with vegetables and bread", nl: "Omelet met groenten en brood" },
    ingredients: [["eggs", 8, "pc"], ["onion", 1, "pc"], ["bellPepper", 1, "pc"], ["mushrooms", 250, "g"], ["cheese", 100, "g"], ["milk", 50, "ml"], ["bread", 1, "pc"], ["butter", 20, "g"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, bell pepper and mushrooms and fry them 5 minutes in butter.", "Beat the eggs with the milk, salt and pepper.", "Pour the eggs over the vegetables, sprinkle with cheese and cook on low heat with a lid for 6 minutes.", "Cut into wedges and serve with bread."],
      nl: ["Snijd de ui, paprika en champignons en bak ze 5 minuten in boter.", "Klop de eieren los met de melk, zout en peper.", "Giet de eieren over de groenten, strooi de kaas erover en laat met deksel 6 minuten op laag vuur stollen.", "Snijd in punten en eet er brood bij."],
    },
  },
  {
    id: "budget-tuna-tomato-pasta", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Pasta with tuna and tomato", nl: "Pasta met tonijn en tomaat" },
    ingredients: [["pasta", 400, "g"], ["tuna", 2, "can"], ["cannedTomatoes", 2, "can"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["driedHerbs", 1, "tsp"], ["oil", 1, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta.", "Fry the chopped onion and garlic in oil.", "Add the canned tomatoes and herbs and simmer 10 minutes.", "Stir in the drained tuna, season and toss with the pasta."],
      nl: ["Kook de pasta.", "Fruit de gesnipperde ui en knoflook in olie.", "Voeg de tomatenblokjes en kruiden toe en laat 10 minuten pruttelen.", "Roer de uitgelekte tonijn erdoor, breng op smaak en meng met de pasta."],
    },
  },
  {
    id: "budget-spitskool-mince", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Pointed cabbage stir-fry with mince and rice", nl: "Spitskool met gehakt en rijst" },
    ingredients: [["pointedCabbage", 1, "pc"], ["mincedMixed", 400, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["rice", 300, "g"], ["ketjapManis", 3, "tbsp"], ["curryPowder", 1, "tbsp"],
      ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Brown the mince in oil with the chopped onion, garlic and curry powder.", "Add the pointed cabbage cut into strips and stir-fry 5 to 7 minutes.", "Season with ketjap, salt and pepper and serve with the rice."],
      nl: ["Kook de rijst.", "Bak het gehakt rul in olie met de gesnipperde ui, knoflook en kerriepoeder.", "Voeg de spitskool in reepjes toe en roerbak 5 tot 7 minuten.", "Breng op smaak met ketjap, zout en peper en serveer met de rijst."],
    },
  },
  {
    id: "budget-mushroom-cream-pasta", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Pasta with mushrooms and cream", nl: "Pasta met champignons en room" },
    ingredients: [["pasta", 400, "g"], ["mushrooms", 500, "g"], ["cookingCream", 250, "ml"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["stockCube", 1, "pc"], ["parmesan", 40, "g"],
      ["butter", 20, "g"], ["driedHerbs", 1, "tsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta.", "Fry the sliced mushrooms in butter on high heat until browned, then add the onion and garlic.", "Pour in the cream, crumble in the stock cube, add the herbs and simmer 5 minutes.", "Toss with the pasta, season and serve with parmesan."],
      nl: ["Kook de pasta.", "Bak de plakjes champignon op hoog vuur bruin in boter en voeg dan de ui en knoflook toe.", "Schenk de room erbij, verkruimel het bouillonblokje erboven, voeg de kruiden toe en laat 5 minuten zachtjes koken.", "Schep de pasta erdoor, breng op smaak en serveer met parmezaan."],
    },
  },
  {
    id: "budget-potato-bacon-bake", tags: ["budget"], servings: 4, minutes: 55,
    name: { en: "Potato and bacon oven dish", nl: "Ovenschotel met aardappel en spek" },
    ingredients: [["potatoes", 1000, "g"], ["bacon", 200, "g"], ["onion", 2, "pc"], ["cookingCream", 250, "ml"], ["cheese", 150, "g"], ["garlic", 1, "clove"], ["oil", 1, "tbsp"],
      ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Peel the potatoes, slice them thinly and boil 5 minutes.", "Fry the bacon bits with the onion rings and garlic in a little oil.", "Layer the potatoes and bacon in a greased oven dish, season and pour the cream over.", "Cover with grated cheese and bake 30 minutes until golden."],
      nl: ["Verwarm de oven voor op 200 °C. Schil de aardappelen, snijd ze in dunne plakjes en kook ze 5 minuten voor.", "Bak de spekblokjes met de uienringen en knoflook in wat olie.", "Leg de aardappelen en het spek in laagjes in een ingevette ovenschaal, breng op smaak en giet de room erover.", "Bestrooi met geraspte kaas en bak 30 minuten tot het goudbruin is."],
    },
  },
  {
    id: "budget-couscous-chickpeas", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Couscous with vegetables and chickpeas", nl: "Couscous met groenten en kikkererwten" },
    ingredients: [["couscous", 300, "g"], ["chickpeas", 1, "can"], ["zucchini", 1, "pc"], ["bellPepper", 1, "pc"], ["onion", 1, "pc"], ["garlic", 1, "clove"], ["stockCube", 1, "pc"], ["spices", 1, "tbsp"],
      ["lemon", 1, "pc"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Dissolve the stock cube in 300 ml boiling water, pour it over the couscous, cover and leave 5 minutes.", "Cut the zucchini, bell pepper and onion into cubes and fry them 8 minutes in oil with the garlic and spices.", "Add the drained chickpeas and heat through.", "Fluff the couscous with a fork, mix in the vegetables and season with lemon juice and salt."],
      nl: ["Los het bouillonblokje op in 300 ml kokend water, giet dit over de couscous, dek af en laat 5 minuten wellen.", "Snijd de courgette, paprika en ui in blokjes en bak ze 8 minuten in olie met de knoflook en kruiden.", "Voeg de uitgelekte kikkererwten toe en warm ze mee.", "Maak de couscous los met een vork, schep de groenten erdoor en breng op smaak met citroensap en zout."],
    },
  },
  {
    id: "budget-tortilla-pizza", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Tortilla pizza", nl: "Tortillapizza" },
    ingredients: [["tortillas", 8, "pc"], ["passata", 250, "ml"], ["mozzarella", 2, "pc"], ["ham", 150, "g"], ["mushrooms", 200, "g"], ["bellPepper", 1, "pc"], ["driedHerbs", 1, "tsp"], ["oil", 1, "tbsp"]],
    steps: {
      en: ["Heat the oven to 220 °C and put the tortillas on baking trays with baking paper.", "Spread each tortilla with passata and sprinkle with dried herbs.", "Top with ham, sliced mushrooms, bell pepper and torn mozzarella; drizzle with oil.", "Bake 8 to 10 minutes until the edges are crispy."],
      nl: ["Verwarm de oven voor op 220 °C en leg de tortilla's op bakplaten met bakpapier.", "Besmeer elke tortilla met passata en bestrooi met gedroogde kruiden.", "Beleg met ham, plakjes champignon, paprika en stukjes mozzarella; besprenkel met olie.", "Bak 8 tot 10 minuten tot de randjes krokant zijn."],
    },
  },
];
