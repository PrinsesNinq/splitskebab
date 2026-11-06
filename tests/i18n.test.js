// Translations (public/js/i18n.js, public/js/i18n-dict.js): every key a page or script uses exists in English and Dutch, both languages
// have the same keys with the same {placeholders}, and the allergen list the app uses is the one firestore.rules checks.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DICT } from "../public/js/i18n-dict.js";
import { t } from "../public/js/i18n.js";
import { ALLERGEN_IDS } from "../public/js/allergens.js";
import { UNITS, TAGS } from "../public/js/recipe-logic.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const sources = [
  ...fs.readdirSync(pub).filter((f) => f.endsWith(".html")).map((f) => path.join(pub, f)),
  ...fs.readdirSync(path.join(pub, "js")).filter((f) => f.endsWith(".js") && f !== "i18n-dict.js").map((f) => path.join(pub, "js", f)),
];

function usedKeys() {
  const keys = new Set();
  for (const file of sources) {
    const text = fs.readFileSync(file, "utf8");
    for (const m of text.matchAll(/\bt\(\s*"([a-zA-Z]+\.[a-zA-Z.]+)"/g)) keys.add(m[1]);
    for (const m of text.matchAll(/data-i18n(?:-placeholder|-aria-label|-title)?="([a-zA-Z]+\.[a-zA-Z.]+)"/g)) keys.add(m[1]);
  }
  // Keys built at run time: t(`status.${status}`), t(`circle.${type}`), t(`unit.${unit}`).
  for (const s of ["host", "joining", "declined", "invited", "none"]) keys.add(`status.${s}`);
  for (const c of ["house", "group"]) keys.add(`circle.${c}`);
  for (const u of UNITS) keys.add(`unit.${u}`);
  for (const tag of TAGS) keys.add(`tag.${tag}`);
  return keys;
}

test("every key the pages use exists in both languages", () => {
  const missing = [];
  for (const key of usedKeys()) for (const lang of ["en", "nl"]) if (!(key in DICT[lang])) missing.push(`${lang}: ${key}`);
  assert.deepEqual(missing, []);
});

test("English and Dutch have the same keys and the same placeholders", () => {
  assert.deepEqual(Object.keys(DICT.nl).sort(), Object.keys(DICT.en).sort());
  const placeholders = (s) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(DICT.en)) assert.deepEqual(placeholders(DICT.nl[key]), placeholders(DICT.en[key]), key);
});

test("t fills in placeholders and falls back visibly", () => {
  assert.equal(t("houses.members", { n: 3 }, "nl"), "3 leden");
  assert.equal(t("houses.members", { n: 3 }, "en"), "3 members");
  assert.equal(t("no.such.key", {}, "nl"), "no.such.key");
  assert.equal(t("pay.owes", { from: "A" }, "en"), "A owes {to}", "a missing value stays visible");
});

test("the allergen ids are the ones firestore.rules accepts", () => {
  const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
  const listed = /hasOnly\(\[('gluten'[^\]]*)\]\)/.exec(rules);
  assert.ok(listed, "firestore.rules lists the allergens");
  assert.deepEqual(listed[1].split(",").map((s) => s.trim().replace(/'/g, "")), ALLERGEN_IDS);
});

test("the app's version matches the deployed version.json (bump both with every deploy)", async () => {
  const { APP_VERSION } = await import("../public/js/version.js");
  const deployed = JSON.parse(fs.readFileSync(path.join(pub, "version.json"), "utf8")).version;
  assert.equal(deployed, APP_VERSION);
});

test("the colour themes on the profile page are the ones applied before every page paints", () => {
  const profile = fs.readFileSync(path.join(pub, "profile.html"), "utf8");
  const head = fs.readFileSync(path.join(pub, "js", "theme-mode.js"), "utf8");
  const authored = [...profile.matchAll(/<data value="(\w+)" data-label="[^"]+" data-primary="(#[0-9a-f]{6})" data-secondary="(#[0-9a-f]{6})"><\/data>/g)].map((m) => [m[1], m[2], m[3]]);
  const applied = [...head.matchAll(/^\s+(\w+): \['(#[0-9a-f]{6})', '(#[0-9a-f]{6})'\]/gm)].map((m) => [m[1], m[2], m[3]]);
  assert.ok(authored.length >= 3, "the profile page offers themes");
  assert.deepEqual(applied, authored);
});

test("only one element per page uses the library's static-chrome transition name", () => {
  // The library's .page-transition-static sets view-transition-name: static-chrome; a second element with it aborts every page transition.
  // The bottom bar (#nav) has its own name in app.css; any other element with the class must get one too.
  const css = fs.readFileSync(path.join(pub, "css", "app.css"), "utf8");
  for (const file of fs.readdirSync(pub).filter((f) => f.endsWith(".html"))) {
    const html = fs.readFileSync(path.join(pub, file), "utf8");
    const statics = [...html.matchAll(/<[^>]+class="[^"]*\bpage-transition-static\b[^"]*"[^>]*>/g)].map((m) => m[0]);
    const unnamed = statics.filter((tag) => !(/id="nav"/.test(tag) && /#nav\.bottom-nav\s*\{\s*view-transition-name: static-chrome-bottom/.test(css)));
    assert.ok(unnamed.length <= 1, `${file}: ${unnamed.length} elements share static-chrome`);
  }
});

test("calendar styles target FullCalendar's own element", () => {
  // FullCalendar adds its "fc" class to the element it is created on (#calendar.cal-host), so ".cal-host .fc" (an fc inside it)
  // matches nothing: that once left the whole calendar unstyled.
  const css = fs.readFileSync(path.join(pub, "css", "app.css"), "utf8");
  assert.ok(!/\.cal-host \.fc\b/.test(css), 'use ".cal-host.fc", not ".cal-host .fc"');
  assert.ok(/\.cal-host\.fc\b/.test(css));
});

test("the CDN scripts are pinned with an integrity hash", () => {
  const calendar = fs.readFileSync(path.join(pub, "js", "calendar.js"), "utf8");
  const srcs = [...calendar.matchAll(/src: "(https:[^"]+)",\s*integrity: "(sha384-[A-Za-z0-9+/=]{64})"/g)];
  assert.equal(srcs.length, 2);
  assert.ok(srcs.every(([, src]) => /@\d+\.\d+\.\d+\//.test(src)), "an exact version");
});
