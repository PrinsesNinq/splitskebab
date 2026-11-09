// Editable terms (js/terms.js, Settings > Terms) and the optional anonymous statistics (functions/stats-logic.js, js/stats-view.js): a new
// version makes everyone accept again, only consenting diners are counted, and nothing that is stored or shown names a person or a meal.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TERMS, termsFrom, cleanTermsText, sectionsToText, textToSections, termsHtml, LIMITS } from "../public/js/terms.js";
import { mealContribution, addUp, mealCostCents, recipeKey, monthOf } from "../functions/stats-logic.js";
import { monthBefore, addMonths, summary, topRecipes, foodTotals, MIN_PORTIONS } from "../public/js/stats-view.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const rules = read("firestore.rules");
const block = (p) => { const i = rules.indexOf(`match /${p} {`); assert.ok(i >= 0, p); return rules.slice(i, rules.indexOf("match /", i + 1)); };

// ---- Terms ----

test("without a saved version the terms are the built-in text, version 1; a saved one is read and checked", () => {
  const builtin = termsFrom(null);
  assert.equal(builtin.version, 1);
  assert.equal(builtin.nl.title, TERMS.nl.title);
  assert.deepEqual(builtin.en.sections[0], { h: TERMS.en.sections[0][0], b: TERMS.en.sections[0][1] });
  const saved = termsFrom({ version: 3, updatedAt: 5, en: { title: "New", intro: "Hi", sections: [{ h: "A", b: "x" }], accept: "Yes" }, nl: null });
  assert.equal(saved.version, 3);
  assert.equal(saved.en.title, "New");
  assert.equal(saved.en.showEmail, TERMS.en.showEmail, "a missing text takes the built-in one");
  assert.equal(saved.nl.title, TERMS.nl.title, "a missing language takes the built-in one");
});

test("the accept box never loses its words, and texts are cut to their limits", () => {
  const t = cleanTermsText({ title: "x".repeat(500), accept: "   ", sections: [] }, "en");
  assert.equal(t.title.length, LIMITS.title);
  assert.equal(t.accept, TERMS.en.accept);
  assert.ok(t.sections.length > 0, "no sections: the built-in ones");
});

test("the editor's text format: ## headings with their text, back and forth without loss", () => {
  const sections = [{ h: "Who", b: "Nino.\nSecond line." }, { h: "Money", b: "Outside the app." }];
  const text = sectionsToText(sections);
  assert.equal(text, "## Who\nNino.\nSecond line.\n\n## Money\nOutside the app.");
  assert.deepEqual(textToSections(text), sections);
  assert.deepEqual(textToSections("Intro without heading\n## H\r\nbody\r\n\n\n## \n"), [{ h: "", b: "Intro without heading" }, { h: "H", b: "body" }]);
});

test("the terms as HTML: escaped, line breaks kept, the version and date shown", () => {
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = termsHtml(termsFrom({ version: 4, updatedAt: Date.UTC(2026, 10, 20), en: { title: "T", intro: "<b>hi</b>", sections: [{ h: "<i>", b: "a\nb" }], accept: "ok" } }), "en", esc);
  assert.ok(!/<b>|<i>/.test(html), "escaped");
  assert.match(html, /class="mb-2 text-pre-line">a\nb</);
  assert.match(html, /Version 4, 2026-11-20/);
});

test("firestore.rules: a new version needs everyone to accept exactly it; only admins save, always the next number, with a copy kept", () => {
  assert.match(rules, /function termsInForce\(\) \{[\s\S]*?settings\/terms\)\.data\.version : 1;/);
  const terms = block("settings/terms");
  assert.match(terms, /allow read: if true;/, "readable before signing in (terms.html)");
  assert.match(terms, /allow create: if isAdmin\(\) && validTerms\(request\.resource\.data\) && request\.resource\.data\.version == 2 &&/);
  assert.match(terms, /allow update: if isAdmin\(\) && validTerms\(request\.resource\.data\) && request\.resource\.data\.version == resource\.data\.version \+ 1 &&/);
  assert.match(terms, /existsAfter\(\/databases\/\$\(database\)\/documents\/termsHistory\/\$\(string\(request\.resource\.data\.version\)\)\)/, "with its copy");
  assert.match(terms, /allow delete: if false;/);
  const history = block("termsHistory/{version}");
  assert.match(history, /allow update, delete: if false;/, "a version that was in force is never changed");
  assert.match(history, /version == string\(request\.resource\.data\.version\)/);
  assert.match(rules, /function validTerms\(d\) \{[\s\S]*?d\.updatedAt == request\.time && d\.updatedBy == me\(\)/);
});

test("the app asks again when the version in force is newer, and accepts the version it showed", () => {
  const app = read("public/js/app.js");
  assert.match(app, /const inForce = await loadTerms\(\{ fresh: true \}\)/);
  assert.match(app, /register\(user, inForce\.version\) : acceptTerms\(user, inForce\.version\)/);
  const store = read("public/js/terms-store.js");
  assert.match(store, /const version = current\.version \+ 1;/);
  assert.match(store, /batch\.set\(fs\.doc\(db, "termsHistory", String\(version\)\), data\);/);
  assert.match(read("public/js/settings.js"), /import\('\.\/admin-terms\.js'\)\.then\(\(m\) => m\.startTermsEditor\(user\.uid\)\)/, "only started for admins");
});

// ---- Statistics ----

const consenting = new Set(["uA", "uB"]);
const meal = {
  participants: ["uA", "uB", "uC", "uD"], guests: [{ id: "g", name: "Guest" }], recipe: { source: "builtin", id: "pesto" },
  costs: { uC: 2500 }, host: "uC", title: "Pesto", viewers: ["uA", "uB", "uC", "uD"],
};

test("a meal counts only the share of the diners who said yes", () => {
  assert.deepEqual(mealContribution(meal, consenting), { dinners: 2, groupSize: 5, recipe: "builtin:pesto", spendCents: 1000, spendDiners: 2 });
  assert.equal(mealContribution(meal, new Set(["uZ"])), null, "nobody at it said yes: nothing");
  assert.equal(mealContribution({ ...meal, costs: {} }, consenting).spendDiners, 0, "no costs: no spend counted");
  assert.equal(mealCostCents({ cost: { totalCents: 900, paidBy: "uA" } }), 900, "the older single payer");
  assert.equal(recipeKey({ recipe: { source: "evil", id: "x" } }), null);
});

test("what is counted holds no person and no meal: only numbers and recipe keys", () => {
  const total = addUp([mealContribution(meal, consenting), mealContribution({ ...meal, participants: ["uA"], guests: [], recipe: null, costs: {} }, consenting), null]);
  assert.deepEqual(total, { meals: 2, dinners: 3, groupSizes: { 5: 2, 1: 1 }, portions: { "builtin:pesto": 2 }, spendCents: 1000, spendDiners: 2 });
  const text = JSON.stringify(total);
  for (const leak of ["uA", "uB", "uC", "Pesto", "Guest"]) assert.ok(!text.includes(leak), leak);
  assert.equal(monthOf("2026-11-09"), "2026-11");
});

test("the daily job writes only totals, once per day, for the meals of a week ago, and logs no people", () => {
  const job = read("functions/stats.js");
  assert.match(job, /export const STATS_DAYS_BACK = 7;/);
  assert.match(job, /if \(\(await ref\.get\(\)\)\.get\("countedDays"\)\?\.includes\(day\)\) return null;/, "a day is never counted twice");
  assert.match(job, /s\.get\("statsConsent"\) === true/, "only an explicit yes");
  assert.ok(!/participants\b[^;]*FieldPath|uid|email|title|host/.test(job.slice(job.indexOf("const update = ["))), "no person or meal written");
  for (const call of job.match(/logger\.\w+\([^)]*\)/g) || []) assert.ok(!/participants|consenting|uid/.test(call), call);
  assert.match(read("functions/index.js"), /export const statsDaily = onSchedule/);
});

test("firestore.rules: only I give or take back my yes; the totals are the server's, read by admins only", () => {
  const users = block("users/{uid}");
  assert.match(users, /affectedKeys\(\)\.hasOnly\(\['statsConsent', 'statsConsentAt'\]\) &&\s*request\.resource\.data\.statsConsent is bool && request\.resource\.data\.statsConsentAt == request\.time/);
  assert.match(users, /\(signedIn\(\) && me\(\) == uid && notBlocked\(\) &&\s*request\.resource\.data\.diff\(resource\.data\)\.affectedKeys\(\)\.hasOnly\(\['statsConsent'/, "only on my own account");
  const stats = block("stats/{month}");
  assert.match(stats, /allow read: if isAdmin\(\);/);
  assert.match(stats, /allow write: if false;/, "no app writes totals: nobody can fake or inflate them");
});

test("asked once, optional, and changeable on the profile", () => {
  const consent = read("public/js/stats-consent.js");
  assert.match(consent, /if \(\(await statsConsent\(uid\)\) !== null\) return;/, "never asked again once answered");
  assert.match(consent, /await whenNoDialog\(\);/, "not on top of the notifications question");
  assert.match(read("public/js/app.js"), /stats\.offerStats\(user\.uid\)/);
  assert.match(read("public/profile.html"), /id="stats-on"/);
  assert.match(read("public/js/profile.js"), /setStatsConsent\(me, box\.checked\)/);
  assert.ok(!/stats/i.test(read("public/js/terms.js").slice(0, read("public/js/terms.js").indexOf("export const LANGS"))), "not part of the terms");
});

test("the admins' page: months added up, averages weighted, small recipes not named, food estimated from portions", () => {
  assert.equal(monthBefore("2026-11-09", 0), "2026-11");
  assert.equal(monthBefore("2026-02-28", 3), "2025-11", "over the year boundary");
  const docs = [
    { id: "2026-10", data: { meals: 2, dinners: 4, groupSizes: { 4: 4 }, portions: { "builtin:pesto": 4, "builtin:bolognese": 1 }, spendCents: 2000, spendDiners: 4 } },
    { id: "2026-11", data: { meals: 1, dinners: 2, groupSizes: { 1: 2 }, portions: { "builtin:pesto": 2 }, spendCents: 0, spendDiners: 0 } },
    { id: "2025-01", data: { dinners: 99 } },
    { id: "junk", data: { dinners: 5 } },
  ];
  const t = addMonths(docs, "2026-06", "2026-11");
  assert.equal(t.dinners, 6);
  assert.deepEqual(summary(t), { dinners: 6, avgGroup: 3, avgSpendCents: 500 });
  assert.deepEqual(topRecipes(t.portions), { shown: [{ key: "builtin:pesto", n: 6 }], other: 1 }, `fewer than ${MIN_PORTIONS}: other`);
  const recipes = [{ source: "builtin", id: "pesto", servings: 4, ingredients: [
    { key: "pasta", label: "Pasta", qty: 400, unit: "g", staple: false }, { key: "salt", label: "Salt", qty: 1, unit: "tsp", staple: true },
    { key: "basil", label: "Basil", qty: null, unit: "", staple: false },
  ] }];
  assert.deepEqual(foodTotals(t.portions, recipes), [{ label: "Pasta", unit: "g", qty: 600 }], "400 g for 4 portions, 6 portions; no staples");
  assert.deepEqual(summary(addMonths([], "2026-01", "2026-12")), { dinners: 0, avgGroup: null, avgSpendCents: null });
});
