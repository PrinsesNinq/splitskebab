// Vegetarian and vegan dinners: tofu, tempeh, beans, lentils and vegetables. Same format as the other library files (see library/index.js).

export const VEGGIE = [
  {
    id: "veggie-tofu-stirfry", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Tofu stir-fry with vegetables", nl: "Roerbak met tofu en groenten" },
    ingredients: [["tofu", 400, "g"], ["mixedVeg", 600, "g"], ["rice", 300, "g"], ["garlic", 2, "clove"], ["ginger", 10, "g"],
      ["soySauce", 3, "tbsp"], ["oil", 2, "tbsp"]],
    steps: {
      en: ["Cook the rice.", "Pat the tofu dry, cut it in cubes and fry it golden in oil; set aside.", "Stir-fry the garlic, ginger and vegetables for 5 minutes on high heat.", "Add the tofu and soy sauce, toss and serve on the rice."],
      nl: ["Kook de rijst.", "Dep de tofu droog, snijd hem in blokjes en bak goudbruin in olie; zet apart.", "Roerbak de knoflook, gember en groenten 5 minuten op hoog vuur.", "Doe de tofu en sojasaus erbij, schep om en serveer op de rijst."],
    },
  },
  {
    id: "veggie-tempeh-ketjap", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Ketjap tempeh with green beans", nl: "Tempeh in ketjap met sperziebonen" },
    ingredients: [["tempeh", 400, "g"], ["greenBeans", 500, "g"], ["rice", 300, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"],
      ["ketjapManis", 4, "tbsp"], ["sambal", 1, "tsp"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice and boil the green beans 6 minutes in salted water.", "Cut the tempeh in thin strips and fry them crisp in oil.", "Add the chopped onion and garlic and fry 3 minutes.", "Stir in the ketjap, sambal and a splash of water and let it get sticky; serve with the beans and rice."],
      nl: ["Kook de rijst en kook de sperziebonen 6 minuten in water met zout.", "Snijd de tempeh in dunne reepjes en bak ze krokant in olie.", "Voeg de gesnipperde ui en knoflook toe en bak 3 minuten mee.", "Roer de ketjap, sambal en een scheutje water erdoor en laat het plakkerig worden; serveer met de bonen en rijst."],
    },
  },
  {
    id: "veggie-chickpea-spinach-curry", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Chickpea and spinach coconut curry", nl: "Kokoscurry met kikkererwten en spinazie" },
    ingredients: [["chickpeas", 2, "can"], ["spinach", 300, "g"], ["coconutMilk", 400, "ml"], ["cannedTomatoes", 1, "can"], ["onion", 1, "pc"],
      ["garlic", 2, "clove"], ["ginger", 10, "g"], ["curryPowder", 2, "tbsp"], ["rice", 300, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Fry the chopped onion, garlic and ginger in oil, then the curry powder for 1 minute.", "Add the tomatoes, coconut milk and drained chickpeas; simmer 15 minutes.", "Stir in the spinach until it wilts, season with salt and serve with the rice."],
      nl: ["Kook de rijst.", "Fruit de gesnipperde ui, knoflook en gember in olie en bak daarna het kerriepoeder 1 minuut mee.", "Voeg de tomaten, kokosmelk en uitgelekte kikkererwten toe; laat 15 minuten pruttelen.", "Roer de spinazie erdoor tot die geslonken is, breng op smaak met zout en eet met de rijst."],
    },
  },
  {
    id: "veggie-black-bean-tacos", tags: ["budget"], servings: 4, minutes: 25,
    name: { en: "Black bean tacos", nl: "Taco's met zwarte bonen" },
    ingredients: [["tacoShells", 12, "pc"], ["blackBeans", 2, "can"], ["sweetcorn", 1, "can"], ["onion", 1, "pc"], ["bellPepper", 1, "pc"],
      ["avocado", 2, "pc"], ["lettuce", 150, "g"], ["tacoSauce", 200, "ml"], ["lime", 1, "pc"], ["spices", 1, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Fry the chopped onion and bell pepper in oil with the spices for 5 minutes.", "Add the drained beans and corn, mash a few beans and heat through.", "Mash the avocado with lime juice and salt; shred the lettuce.", "Warm the taco shells and fill them with beans, lettuce, avocado and salsa."],
      nl: ["Bak de gesnipperde ui en paprika 5 minuten in olie met de kruiden.", "Voeg de uitgelekte bonen en mais toe, prak een paar bonen fijn en warm alles door.", "Prak de avocado met limoensap en zout; snijd de sla in reepjes.", "Warm de tacoschelpen op en vul ze met bonen, sla, avocado en salsa."],
    },
  },
  {
    id: "veggie-mushroom-risotto", tags: [], servings: 4, minutes: 40,
    name: { en: "Mushroom risotto", nl: "Risotto met champignons" },
    ingredients: [["rice", 320, "g"], ["mushrooms", 500, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["stockCube", 2, "pc"],
      ["parmesan", 60, "g"], ["butter", 30, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Dissolve the stock cubes in 1.2 litres of hot water.", "Fry the sliced mushrooms in oil until browned; set aside.", "Soften the onion and garlic, add the rice and stir 1 minute.", "Add the stock a ladle at a time, stirring, for about 20 minutes until creamy.", "Stir in the mushrooms, butter and parmesan, season and serve."],
      nl: ["Los de bouillonblokjes op in 1,2 liter heet water.", "Bak de gesneden champignons bruin in olie; zet apart.", "Fruit de ui en knoflook, voeg de rijst toe en roer 1 minuut.", "Voeg steeds een soeplepel bouillon toe en blijf roeren, zo'n 20 minuten tot het romig is.", "Roer de champignons, boter en parmezaan erdoor, breng op smaak en serveer."],
    },
  },
  {
    id: "veggie-spinach-feta-pasta", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Spinach and feta pasta", nl: "Pasta met spinazie en feta" },
    ingredients: [["pasta", 400, "g"], ["spinach", 400, "g"], ["feta", 200, "g"], ["cherryTomatoes", 250, "g"], ["garlic", 2, "clove"],
      ["oil", 2, "tbsp"], ["blackPepper", 1, "pinch"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the pasta in salted water.", "Fry the garlic and halved cherry tomatoes in oil for 3 minutes.", "Add the spinach and let it wilt.", "Mix with the drained pasta, crumble the feta over it and season with pepper."],
      nl: ["Kook de pasta in water met zout.", "Bak de knoflook en gehalveerde cherrytomaatjes 3 minuten in olie.", "Doe de spinazie erbij en laat slinken.", "Meng met de uitgelekte pasta, verkruimel de feta erover en maak af met peper."],
    },
  },
  {
    id: "veggie-halloumi-couscous", tags: [], servings: 4, minutes: 35,
    name: { en: "Halloumi couscous with roasted vegetables", nl: "Couscous met halloumi en geroosterde groenten" },
    ingredients: [["couscous", 300, "g"], ["halloumi", 250, "g"], ["zucchini", 1, "pc"], ["bellPepper", 2, "pc"], ["onion", 1, "pc"],
      ["stockCube", 1, "pc"], ["lemon", 1, "pc"], ["freshHerbs", 1, "pack"], ["spices", 1, "tbsp"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Cut the vegetables in pieces, toss with oil, spices and salt and roast 25 minutes.", "Pour 300 ml boiling stock over the couscous, cover and leave 5 minutes; fluff with a fork.", "Slice the halloumi and fry it golden on both sides in a dry pan.", "Mix the couscous with the vegetables, lemon juice and herbs and top with the halloumi."],
      nl: ["Verwarm de oven op 200 °C. Snijd de groenten in stukken, hussel ze met olie, kruiden en zout en rooster 25 minuten.", "Giet 300 ml kokende bouillon over de couscous, dek af en laat 5 minuten staan; maak los met een vork.", "Snijd de halloumi in plakken en bak ze aan beide kanten goudbruin in een droge pan.", "Meng de couscous met de groenten, het citroensap en de kruiden en leg de halloumi erop."],
    },
  },
  {
    id: "veggie-sweet-potato-traybake", tags: ["budget"], servings: 4, minutes: 45,
    name: { en: "Sweet potato and chickpea tray bake with tahini", nl: "Ovenschotel van zoete aardappel en kikkererwten met tahin" },
    ingredients: [["sweetPotatoes", 1000, "g"], ["chickpeas", 2, "can"], ["onion", 2, "pc"], ["bellPepper", 2, "pc"], ["tahini", 4, "tbsp"],
      ["lemon", 1, "pc"], ["garlic", 1, "clove"], ["spices", 2, "tbsp"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C.", "Cut the sweet potatoes, onions and peppers in chunks; mix with the drained chickpeas, oil, spices and salt on a baking tray.", "Roast 35 minutes, turning halfway.", "Stir the tahini with lemon juice, grated garlic and a little water into a pourable sauce and drizzle it over."],
      nl: ["Verwarm de oven op 200 °C.", "Snijd de zoete aardappelen, uien en paprika's in grove stukken; meng ze op een bakplaat met de uitgelekte kikkererwten, olie, kruiden en zout.", "Rooster 35 minuten en schep halverwege om.", "Roer de tahin met citroensap, geraspte knoflook en wat water tot een gietbare saus en sprenkel die erover."],
    },
  },
  {
    id: "veggie-pumpkin-soup", tags: ["budget"], servings: 4, minutes: 40,
    name: { en: "Pumpkin soup with bread", nl: "Pompoensoep met brood" },
    ingredients: [["pumpkin", 1200, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["stockCube", 2, "pc"], ["coconutMilk", 200, "ml"],
      ["curryPowder", 1, "tsp"], ["bread", 1, "pc"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the pumpkin, remove the seeds and cut it in cubes.", "Fry the onion and garlic in oil with the curry powder.", "Add the pumpkin, the stock cubes and 1 litre of water; simmer 20 minutes.", "Blend smooth, stir in the coconut milk, season and serve with bread."],
      nl: ["Schil de pompoen, haal de pitten eruit en snijd hem in blokjes.", "Fruit de ui en knoflook in olie met het kerriepoeder.", "Voeg de pompoen, bouillonblokjes en 1 liter water toe; laat 20 minuten zachtjes koken.", "Pureer glad, roer de kokosmelk erdoor, breng op smaak en eet met brood."],
    },
  },
  {
    id: "veggie-lentil-shepherds-pie", tags: ["budget"], servings: 4, minutes: 60,
    name: { en: "Lentil shepherd's pie with sweet potato mash", nl: "Linzen-ovenschotel met zoete-aardappelpuree" },
    ingredients: [["greenLentils", 2, "can"], ["sweetPotatoes", 1000, "g"], ["onion", 1, "pc"], ["carrots", 2, "pc"], ["peas", 150, "g"],
      ["cannedTomatoes", 1, "can"], ["tomatoPaste", 2, "tbsp"], ["stockCube", 1, "pc"], ["oatMilk", 100, "ml"], ["driedHerbs", 1, "tbsp"],
      ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Peel the sweet potatoes, cut them in pieces and boil 15 minutes; mash with the oat drink, salt and pepper.", "Meanwhile fry the chopped onion and carrots in oil for 5 minutes.", "Add the tomato paste, tomatoes, drained lentils, crumbled stock cube and herbs; simmer 10 minutes, then stir in the peas.", "Spoon the filling into an oven dish, spread the mash on top and bake 20 minutes at 200 °C."],
      nl: ["Schil de zoete aardappelen, snijd ze in stukken en kook ze 15 minuten; stamp ze met de haverdrink, zout en peper.", "Bak intussen de gesnipperde ui en wortels 5 minuten in olie.", "Voeg de tomatenpuree, tomaten, uitgelekte linzen, het verkruimelde bouillonblokje en de kruiden toe; laat 10 minuten pruttelen en roer de doperwten erdoor.", "Schep de vulling in een ovenschaal, verdeel de puree erover en bak 20 minuten op 200 °C."],
    },
  },
  {
    id: "veggie-cauliflower-curry", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Cauliflower curry", nl: "Bloemkoolcurry" },
    ingredients: [["cauliflower", 1, "pc"], ["tikkaPaste", 4, "tbsp"], ["coconutMilk", 400, "ml"], ["cannedTomatoes", 1, "can"], ["onion", 1, "pc"],
      ["peas", 150, "g"], ["rice", 300, "g"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice and cut the cauliflower into small florets.", "Fry the chopped onion in oil, then the tikka paste for 1 minute.", "Add the cauliflower, tomatoes and coconut milk; simmer covered for 15 minutes.", "Stir in the peas for the last 3 minutes, season and serve with the rice."],
      nl: ["Kook de rijst en snijd de bloemkool in kleine roosjes.", "Fruit de gesnipperde ui in olie en bak de tikkapasta 1 minuut mee.", "Voeg de bloemkool, tomaten en kokosmelk toe; laat 15 minuten met de deksel erop pruttelen.", "Doe de laatste 3 minuten de doperwten erbij, breng op smaak en serveer met de rijst."],
    },
  },
  {
    id: "veggie-peanut-noodle-salad", tags: [], servings: 4, minutes: 25,
    name: { en: "Peanut rice-noodle salad", nl: "Rijstnoedelsalade met pindasaus" },
    ingredients: [["riceNoodles", 250, "g"], ["peanutButter", 4, "tbsp"], ["soySauce", 3, "tbsp"], ["lime", 1, "pc"], ["sugar", 1, "tsp"],
      ["cucumber", 1, "pc"], ["carrots", 2, "pc"], ["pointedCabbage", 0.5, "pc"], ["springOnion", 2, "pc"], ["chiliPepper", 1, "pc"],
      ["peanuts", 50, "g"], ["freshHerbs", 1, "pack"]],
    steps: {
      en: ["Soak or cook the rice noodles as on the pack, rinse them cold and drain.", "Whisk the peanut butter, soy sauce, lime juice, sugar and a few spoons of warm water into a dressing.", "Cut the cucumber, carrots, cabbage, spring onion and chili into thin strips.", "Toss everything with the dressing and top with chopped peanuts and herbs."],
      nl: ["Week of kook de rijstnoedels volgens de verpakking, spoel ze koud af en laat uitlekken.", "Klop de pindakaas, sojasaus, het limoensap, de suiker en een paar lepels warm water tot een dressing.", "Snijd de komkommer, wortels, spitskool, lente-ui en peper in dunne reepjes.", "Hussel alles door de dressing en strooi er gehakte pinda's en kruiden over."],
    },
  },
  {
    id: "veggie-stuffed-peppers", tags: ["budget"], servings: 4, minutes: 50,
    name: { en: "Stuffed bell peppers with rice and beans", nl: "Gevulde paprika's met rijst en bonen" },
    ingredients: [["bellPepper", 4, "pc"], ["rice", 200, "g"], ["blackBeans", 1, "can"], ["cannedTomatoes", 1, "can"], ["onion", 1, "pc"],
      ["garlic", 2, "clove"], ["sweetcorn", 1, "can"], ["cheese", 100, "g"], ["spices", 1, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice and heat the oven to 200 °C.", "Fry the onion and garlic in oil with the spices, add the tomatoes, drained beans and corn and simmer 5 minutes.", "Mix in the rice and season with salt.", "Halve the peppers lengthways, remove the seeds, fill them and sprinkle with cheese.", "Bake 25 minutes until the peppers are soft."],
      nl: ["Kook de rijst en verwarm de oven op 200 °C.", "Fruit de ui en knoflook in olie met de kruiden, voeg de tomaten, uitgelekte bonen en mais toe en laat 5 minuten pruttelen.", "Schep de rijst erdoor en breng op smaak met zout.", "Halveer de paprika's in de lengte, haal de zaadjes eruit, vul ze en bestrooi met kaas.", "Bak 25 minuten tot de paprika's zacht zijn."],
    },
  },
  {
    id: "veggie-courgette-lemon-pasta", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Courgette pasta with lemon", nl: "Pasta met courgette en citroen" },
    ingredients: [["spaghetti", 400, "g"], ["zucchini", 2, "pc"], ["lemon", 1, "pc"], ["garlic", 2, "clove"], ["parmesan", 50, "g"],
      ["chiliPepper", 1, "pc"], ["oil", 3, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the spaghetti in salted water; keep a cup of the cooking water.", "Grate or thinly slice the courgettes and fry them with garlic and chili in oil for 5 minutes.", "Add the lemon zest and juice.", "Toss with the pasta, a splash of cooking water and the parmesan; season with pepper."],
      nl: ["Kook de spaghetti in water met zout; bewaar een kopje kookvocht.", "Rasp de courgettes grof of snijd ze in dunne plakjes en bak ze 5 minuten in olie met knoflook en peper.", "Voeg de geraspte citroenschil en het sap toe.", "Schep om met de pasta, een scheut kookvocht en de parmezaan; maak af met zwarte peper."],
    },
  },
  {
    id: "veggie-eggplant-parmigiana", tags: [], servings: 4, minutes: 60,
    name: { en: "Eggplant parmigiana", nl: "Aubergine parmigiana" },
    ingredients: [["eggplant", 3, "pc"], ["passata", 700, "ml"], ["mozzarella", 250, "g"], ["parmesan", 60, "g"], ["garlic", 2, "clove"],
      ["driedHerbs", 1, "tbsp"], ["bread", 1, "pc"], ["oil", 4, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Slice the eggplants lengthways, brush with oil and grill or fry them golden on both sides.", "Simmer the passata with the garlic, herbs and a pinch of salt for 10 minutes.", "Layer sauce, eggplant, torn mozzarella and parmesan in an oven dish, finishing with sauce and cheese.", "Bake 30 minutes at 200 °C and serve with bread."],
      nl: ["Snijd de aubergines in de lengte in plakken, bestrijk ze met olie en grill of bak ze aan beide kanten goudbruin.", "Laat de passata 10 minuten pruttelen met de knoflook, kruiden en wat zout.", "Leg in een ovenschaal laagjes saus, aubergine, gescheurde mozzarella en parmezaan; eindig met saus en kaas.", "Bak 30 minuten op 200 °C en eet er brood bij."],
    },
  },
  {
    id: "veggie-vegan-bolognese", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Vegan bolognese with veggie mince", nl: "Vegan bolognese met vegetarisch gehakt" },
    ingredients: [["spaghetti", 400, "g"], ["veggieMince", 400, "g"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["carrots", 1, "pc"],
      ["cannedTomatoes", 2, "can"], ["tomatoPaste", 2, "tbsp"], ["driedHerbs", 1, "tbsp"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, garlic and carrot.", "Fry the veggie mince crumbly in oil, add the vegetables and fry 5 minutes.", "Stir in the tomato paste, tomatoes and herbs; simmer 20 minutes.", "Cook the spaghetti, season the sauce and serve."],
      nl: ["Snipper de ui, knoflook en wortel.", "Bak het vegetarisch gehakt rul in olie, voeg de groenten toe en bak 5 minuten mee.", "Roer de tomatenpuree, tomaten en kruiden erdoor; laat 20 minuten pruttelen.", "Kook de spaghetti, breng de saus op smaak en serveer."],
    },
  },
  {
    id: "veggie-mushroom-stroganoff", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Mushroom stroganoff", nl: "Champignonstroganoff" },
    ingredients: [["mushrooms", 750, "g"], ["onion", 2, "pc"], ["garlic", 2, "clove"], ["sourCream", 200, "ml"], ["mustard", 1, "tsp"],
      ["stockCube", 1, "pc"], ["spices", 1, "tbsp"], ["rice", 300, "g"], ["freshHerbs", 1, "pack"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Cook the rice.", "Fry the sliced mushrooms in batches in oil on high heat until browned.", "Fry the onion and garlic, add the paprika spices, then the mushrooms, crumbled stock cube and 150 ml water; simmer 5 minutes.", "Stir in the sour cream and mustard, season and serve on the rice with herbs."],
      nl: ["Kook de rijst.", "Bak de gesneden champignons in delen op hoog vuur bruin in olie.", "Fruit de ui en knoflook, voeg het paprikapoeder toe en dan de champignons, het verkruimelde bouillonblokje en 150 ml water; laat 5 minuten pruttelen.", "Roer de zure room en mosterd erdoor, breng op smaak en serveer op de rijst met verse kruiden."],
    },
  },
  {
    id: "veggie-gnocchi-spinach-tomato", tags: ["budget"], servings: 4, minutes: 20,
    name: { en: "Gnocchi with spinach and tomato", nl: "Gnocchi met spinazie en tomaat" },
    ingredients: [["gnocchi", 1000, "g"], ["spinach", 300, "g"], ["cherryTomatoes", 250, "g"], ["cannedTomatoes", 1, "can"], ["garlic", 2, "clove"],
      ["driedHerbs", 1, "tsp"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Fry the gnocchi in oil until golden, about 8 minutes; set aside.", "Fry the garlic and halved cherry tomatoes for 2 minutes, add the canned tomatoes and herbs and simmer 5 minutes.", "Stir in the spinach until it wilts.", "Add the gnocchi, season and serve."],
      nl: ["Bak de gnocchi in olie goudbruin, ongeveer 8 minuten; zet apart.", "Bak de knoflook en gehalveerde cherrytomaatjes 2 minuten, voeg de tomatenblokjes en kruiden toe en laat 5 minuten pruttelen.", "Roer de spinazie erdoor tot die geslonken is.", "Schep de gnocchi erdoor, breng op smaak en serveer."],
    },
  },
  {
    id: "veggie-tomato-white-bean-soup", tags: ["budget"], servings: 4, minutes: 35,
    name: { en: "Tomato and white bean soup", nl: "Tomatensoep met witte bonen" },
    ingredients: [["whiteBeans", 2, "can"], ["cannedTomatoes", 2, "can"], ["onion", 1, "pc"], ["garlic", 2, "clove"], ["carrots", 2, "pc"],
      ["celery", 2, "pc"], ["stockCube", 2, "pc"], ["driedHerbs", 1, "tbsp"], ["bread", 1, "pc"], ["oil", 2, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Chop the onion, garlic, carrots and celery and fry them in oil for 5 minutes.", "Add the tomatoes, stock cubes, herbs and 750 ml water; simmer 15 minutes.", "Add the drained beans and heat 5 minutes more; blend half of the soup if you like it thicker.", "Season and serve with bread."],
      nl: ["Snipper de ui, knoflook, wortels en bleekselderij en bak ze 5 minuten in olie.", "Voeg de tomaten, bouillonblokjes, kruiden en 750 ml water toe; laat 15 minuten zachtjes koken.", "Doe de uitgelekte bonen erbij en verwarm nog 5 minuten; pureer de helft als je de soep dikker wilt.", "Breng op smaak en eet met brood."],
    },
  },
  {
    id: "veggie-quinoa-salad", tags: [], servings: 4, minutes: 40,
    name: { en: "Quinoa salad with roasted vegetables", nl: "Quinoasalade met geroosterde groenten" },
    ingredients: [["quinoa", 250, "g"], ["zucchini", 1, "pc"], ["bellPepper", 2, "pc"], ["onion", 1, "pc"], ["chickpeas", 1, "can"],
      ["cherryTomatoes", 250, "g"], ["lemon", 1, "pc"], ["freshHerbs", 1, "pack"], ["spices", 1, "tsp"], ["oil", 4, "tbsp"], ["salt", 1, "pinch"], ["blackPepper", 1, "pinch"]],
    steps: {
      en: ["Heat the oven to 200 °C. Cut the courgette, peppers and onion in pieces, toss with oil and spices and roast 25 minutes.", "Rinse the quinoa and cook it 15 minutes in salted water; drain.", "Make a dressing from lemon juice, oil, salt and pepper.", "Mix the quinoa with the vegetables, drained chickpeas, halved tomatoes, herbs and dressing."],
      nl: ["Verwarm de oven op 200 °C. Snijd de courgette, paprika's en ui in stukken, hussel ze met olie en kruiden en rooster 25 minuten.", "Spoel de quinoa af en kook hem 15 minuten in water met zout; laat uitlekken.", "Maak een dressing van citroensap, olie, zout en peper.", "Meng de quinoa met de groenten, uitgelekte kikkererwten, gehalveerde tomaatjes, kruiden en dressing."],
    },
  },
  {
    id: "veggie-satay-tofu", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Satay tofu with rice", nl: "Tofu met satésaus en rijst" },
    ingredients: [["tofu", 400, "g"], ["sataySauce", 300, "ml"], ["rice", 300, "g"], ["broccoli", 1, "pc"], ["ketjapManis", 2, "tbsp"],
      ["cucumber", 1, "pc"], ["oil", 2, "tbsp"]],
    steps: {
      en: ["Cook the rice.", "Cut the broccoli into florets and cook it 4 minutes.", "Cut the tofu in cubes, fry them crisp in oil and glaze with the ketjap.", "Warm the satay sauce and serve over the tofu, with the rice, broccoli and cucumber slices."],
      nl: ["Kook de rijst.", "Snijd de broccoli in roosjes en kook die 4 minuten.", "Snijd de tofu in blokjes, bak ze krokant in olie en laat ze glanzen met de ketjap.", "Warm de satésaus op en schenk die over de tofu; eet met de rijst, broccoli en plakjes komkommer."],
    },
  },
  {
    id: "veggie-burrito-bowl", tags: ["budget"], servings: 4, minutes: 30,
    name: { en: "Vegan burrito bowl", nl: "Vegan burritobowl" },
    ingredients: [["rice", 300, "g"], ["blackBeans", 2, "can"], ["sweetcorn", 1, "can"], ["avocado", 2, "pc"], ["tomatoes", 3, "pc"],
      ["onion", 1, "pc"], ["lime", 1, "pc"], ["lettuce", 150, "g"], ["tacoSauce", 150, "ml"], ["spices", 1, "tbsp"], ["oil", 1, "tbsp"], ["salt", 1, "pinch"]],
    steps: {
      en: ["Cook the rice and stir in the juice of half the lime.", "Fry half the onion in oil with the spices, add the drained beans and corn and heat through.", "Dice the tomatoes, avocado and the rest of the onion and mix with the remaining lime juice and salt.", "Fill bowls with rice, lettuce, beans, the tomato-avocado salsa and taco sauce."],
      nl: ["Kook de rijst en roer het sap van een halve limoen erdoor.", "Bak de helft van de ui in olie met de kruiden, voeg de uitgelekte bonen en mais toe en warm door.", "Snijd de tomaten, avocado en de rest van de ui in blokjes en meng met het overige limoensap en zout.", "Vul kommen met rijst, sla, bonen, de tomaat-avocadosalsa en tacosaus."],
    },
  },
];
