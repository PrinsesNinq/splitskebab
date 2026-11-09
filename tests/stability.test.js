// Stability on phones: the service worker never lets a slow network hold the app hostage, page switches find their saved script, the
// Firebase SDK is kept, and the bottom bar steps aside while the keyboard is open.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { keyboardOpen, TEXT } from "../public/js/keyboard.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const sw = read("public/sw.js");

test("the keyboard counts as open only on a touch screen, with a text field focused, when the visible area shrank", () => {
  assert.equal(keyboardOpen({ coarse: true, typing: true, visualHeight: 400, windowHeight: 800 }), true);
  assert.equal(keyboardOpen({ coarse: true, typing: true, visualHeight: 790, windowHeight: 800 }), false, "a hardware keyboard: the bar stays");
  assert.equal(keyboardOpen({ coarse: false, typing: true, visualHeight: 400, windowHeight: 800 }), false, "a computer");
  assert.equal(keyboardOpen({ coarse: true, typing: false, visualHeight: 400, windowHeight: 800 }), false, "nothing to type in");
  assert.equal(keyboardOpen({ coarse: true, typing: true, visualHeight: undefined, windowHeight: 800 }), true, "no visualViewport: trust the focus");
  assert.match(TEXT, /textarea/);
  assert.ok(!/\[type=checkbox\]\)?,/.test(TEXT.replace(/:not\(\[type=checkbox\]\)/, "")), "a checkbox does not open a keyboard");
});

test("while the keyboard is open the bottom bar and the floating button are hidden, and app.js loads the watcher", () => {
  assert.match(read("public/css/app.css"), /\.keyboard-open \.bottom-nav,\s*\.keyboard-open \.fab \{\s*display: none;/);
  assert.match(read("public/js/app.js"), /import "\.\/keyboard\.js";/);
});

test("the service worker waits for the network at most a few seconds before using the saved copy", () => {
  assert.match(sw, /const WAIT_MS = 3000;/);
  assert.match(sw, /Promise\.race\(\[network\.catch\(\(\) => 'failed'\), late\]\)/);
  assert.match(sw, /event\.waitUntil\(network\.catch\(\(\) => \{\}\)\)/, "a late answer still refreshes the cache");
});

test("a page switch finds its saved script: copies are kept without soft navigation's soft-nav query", () => {
  const cacheKey = new Function(`${/function cacheKey\(url\) \{[\s\S]*?\n\}/.exec(sw)[0]}; return cacheKey;`)();
  assert.equal(cacheKey(new URL("https://x.web.app/js/home.js?soft-nav=1731000000")), "https://x.web.app/js/home.js");
  assert.equal(cacheKey(new URL("https://x.web.app/meal.html?id=abc&soft-nav=1")), "https://x.web.app/meal.html?id=abc");
});

test("the Firebase SDK is kept, at the exact version the app loads, and nothing else of Google's is touched", () => {
  const version = /export const SDK = "(https:\/\/www\.gstatic\.com\/firebasejs\/[\d.]+)";/.exec(read("public/js/firebase-init.js"))[1];
  assert.match(sw, new RegExp(`const SDK = '${version.replace(/[./]/g, "\$&")}/';`), "the same version as js/firebase-init.js");
  assert.ok(sw.includes(String.raw`url.href.startsWith(SDK) && /^[\w./-]+\.js$/.test(url.href.slice(SDK.length)) && !url.search`), "only the SDK's .js files");
  assert.match(sw, /if \(url\.origin !== self\.location\.origin \|\| url\.pathname\.startsWith\('\/__\/'\) \|\| !keepable\(url\)\) return;/, "Firebase's own traffic passes through");
});

test("while sign-in is checked the app's icon shows instead of a white page", () => {
  assert.match(read("public/css/app.css"), /\.auth-pending::before \{[\s\S]*?app-icon\.svg/);
});

/** The worker's networkFirst, run against a fake network and cache (the real function text, with a short wait). */
function harness({ networkMs, networkFails = false, cached = {} }) {
  const stored = new Map(Object.entries(cached));
  const src = /const store = [\s\S]*?\n\/\*\* A file of the pinned/.exec(sw)[0].replace(/\n\/\*\* A file of the pinned$/, "");
  const fakeCaches = {
    open: async () => ({ put: async (key, res) => { stored.set(key, res); } }),
    match: async (key) => stored.get(typeof key === "string" ? key : key.url),
  };
  const fakeFetch = () => new Promise((resolve, reject) => setTimeout(() => (networkFails ? reject(new TypeError("offline"))
    : resolve({ ok: true, body: "fresh", headers: new Map([["Cache-Control", "no-cache"]]), clone() { return { ...this, body: "fresh-copy" }; } })), networkMs));
  const fn = new Function("caches", "fetch", "Response", "WAIT_MS", "CACHE", `${src}; return networkFirst;`)(
    fakeCaches, fakeFetch, { error: () => ({ body: "error" }) }, 50, "test-cache");
  const waits = [];
  const event = { waitUntil: (p) => waits.push(p) };
  const request = { mode: "no-cors", headers: new Map() };
  return { run: () => fn(event, request, "k"), stored, settle: () => Promise.all(waits) };
}

test("service worker: a quick network wins and refreshes the copy", async () => {
  const h = harness({ networkMs: 5, cached: { k: { body: "old" } } });
  assert.equal((await h.run()).body, "fresh");
  await h.settle();
  assert.equal(h.stored.get("k").body, "fresh-copy");
});

test("service worker: a slow network gives the saved copy in time, and still refreshes it afterwards", async () => {
  const h = harness({ networkMs: 200, cached: { k: { body: "old" } } });
  const started = Date.now();
  assert.equal((await h.run()).body, "old");
  assert.ok(Date.now() - started < 150, "did not wait for the slow network");
  await h.settle();
  assert.equal(h.stored.get("k").body, "fresh-copy");
});

test("service worker: offline gives the copy; a slow network with no copy is still waited for; offline with none is an error", async () => {
  assert.equal((await harness({ networkMs: 1, networkFails: true, cached: { k: { body: "old" } } }).run()).body, "old");
  assert.equal((await harness({ networkMs: 120 }).run()).body, "fresh");
  assert.equal((await harness({ networkMs: 1, networkFails: true }).run()).body, "error");
});
