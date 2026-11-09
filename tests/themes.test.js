// Splitskebab's own colour themes (Carnivore, Herbivore, Pescetarian on eggshell white): the three places that list them agree, every
// page loads them, nothing of the company colours is left, and the colours are readable (WCAG contrast, computed).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const css = read("public/css/themes.css");
const head = read("public/js/theme-mode.js");
const profile = read("public/profile.html");

/** The palette of a theme in css/themes.css: { main, deep, light, ink, ... } from its --diet-* variables. */
function palette(key) {
  const selector = key === "carnivore" ? "html[data-sel-colour-theme] {" : `html[data-sel-colour-theme="${key}"] {`;
  const block = css.slice(css.indexOf(selector), css.indexOf("}", css.indexOf(selector)));
  return Object.fromEntries([...block.matchAll(/--diet-([a-z-]+): ([^;]+);/g)].map((m) => [m[1], m[2].trim()]));
}
const KEYS = ["carnivore", "herbivore", "pescetarian"];

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const luminance = (h) => {
  const [r, g, b] = hex(h).map((v) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const contrast = (a, b) => { const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

test("the profile's swatches, the colours applied before the first paint and the stylesheet's palettes are the same three themes", () => {
  const swatches = [...profile.matchAll(/<data value="(\w+)" data-label="[^"]+" data-primary="(#[0-9a-f]{6})" data-secondary="(#[0-9a-f]{6})"><\/data>/g)]
    .map((m) => [m[1], m[2], m[3]]);
  assert.deepEqual(swatches.map((s) => s[0]), KEYS);
  const applied = Object.fromEntries([...head.matchAll(/^\s+(\w+): '(#[0-9a-f]{6})'/gm)].map((m) => [m[1], m[2]]));
  const eggshell = /--eggshell: (#[0-9a-f]{6});/.exec(css)[1];
  for (const [key, primary, secondary] of swatches) {
    assert.equal(applied[key], primary, `${key}: theme-mode.js`);
    assert.equal(palette(key).main, primary, `${key}: css/themes.css`);
    assert.equal(secondary, eggshell, `${key}: shown on eggshell`);
  }
});

test("Carnivore is the default, also for a theme saved by an older version of the app", () => {
  assert.match(head, /var DEFAULT_THEME = 'carnivore';/);
  assert.match(head, /return key && Object\.prototype\.hasOwnProperty\.call\(THEMES, key\) \? key : DEFAULT_THEME;/);
  assert.match(css, /^html\[data-sel-colour-theme\] \{\n  --diet-main: #8b1a1a;/m, "the palette for any key (Carnivore) comes first");
  assert.equal(JSON.parse(read("public/manifest.json")).theme_color, palette("carnivore").main);
});

test("every page loads the themes right after the library theme and before the app's own styles", () => {
  for (const file of fs.readdirSync(new URL("../public/", import.meta.url)).filter((f) => f.endsWith(".html"))) {
    const html = read(`public/${file}`);
    const lib = html.indexOf('href="vendor/sel/theme/theme.css"');
    const themes = html.indexOf('href="css/themes.css"');
    const app = html.indexOf('href="css/app.css"');
    assert.ok(lib >= 0 && themes > lib && (app < 0 || app > themes), file);
    assert.ok(html.includes("js/theme-mode.js"), `${file}: the theme is applied before the first paint`);
    assert.ok(!/#6b1f7e/i.test(html), `${file}: no company purple`);
  }
});

test("no company colour is left outside the pulled library files", () => {
  for (const file of ["public/css/app.css", "public/css/themes.css", "public/js/theme-mode.js", "public/manifest.json", "public/images/app-icon.svg"]) {
    assert.ok(!/#6b1f7e|#f47b21|#280730/i.test(read(file)), file);
  }
});

test("readable in every theme: white on the buttons, eggshell on the dark page, links on eggshell and on the dark page", () => {
  const eggshellLight = /--eggshell-light: (#[0-9a-f]{6});/.exec(css)[1];
  const darkBody = /html\[data-sel-colour-theme\]\[data-bs-theme="dark"\] \{[\s\S]*?--bs-body-bg: (#[0-9a-f]{6});/.exec(css)[1];
  const darkText = /html\[data-sel-colour-theme\]\[data-bs-theme="dark"\] \{[\s\S]*?--bs-body-color: (#[0-9a-f]{6});/.exec(css)[1];
  const ink = /--ink: (#[0-9a-f]{6});/.exec(css)[1];
  assert.ok(contrast(ink, eggshellLight) >= 7, "body text on eggshell");
  assert.ok(contrast(darkText, darkBody) >= 7, "eggshell text in dark mode");
  for (const key of KEYS) {
    const p = palette(key);
    assert.ok(contrast("#ffffff", p.main) >= 4.5, `${key}: white on a primary button (${contrast("#ffffff", p.main).toFixed(2)})`);
    assert.ok(contrast("#ffffff", p.deep) >= 7, `${key}: white on the navbar's deep end`);
    assert.ok(contrast(p.main, eggshellLight) >= 4.5, `${key}: a link on eggshell`);
    assert.ok(contrast(p.ink, p.soft) >= 7, `${key}: emphasis text on its soft tint`);
    assert.ok(contrast(p.light, darkBody) >= 7, `${key}: a link in dark mode`);
    assert.ok(contrast(darkText, p.deep) >= 7, `${key}: eggshell text on the dark page`);
  }
});

test("the theme names are translated on the profile page", async () => {
  const { DICT } = await import("../public/js/i18n-dict.js");
  for (const key of KEYS) assert.ok(DICT.en[`theme.${key}`] && DICT.nl[`theme.${key}`], key);
  assert.match(read("public/js/profile.js"), /option\.dataset\.label = name;/);
});
