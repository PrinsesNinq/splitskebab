// The install page on phones (public/js/install-gate.js): when it shows, that it can always be passed, and that the notifications
// question waits for it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const gate = read("public/js/install-gate.js");

test("only a phone's browser gets the install page: never the installed app, never a computer", () => {
  assert.match(gate, /export const shouldGate = \(\) => isMobile && !installed && !sessionStorage\.getItem\(LATER\);/);
  const pwa = read("public/js/pwa.js");
  assert.match(pwa, /export const installed = window\.matchMedia\('\(display-mode: standalone\)'\)\.matches \|\| navigator\.standalone === true;/);
  assert.match(pwa, /export const isMobile = isIos \|\| \/android\|mobile\/i\.test\(navigator\.userAgent\);/);
});

test("it can always be passed for this visit (a browser that cannot install must not lock anyone out), and asks again next time", () => {
  assert.match(gate, /\[data-later\][\s\S]*?sessionStorage\.setItem\(LATER, "1"\); close\(\);/);
  assert.match(gate, /data-later>\$\{esc\(t\("install\.gate\.later"\)\)\}/, "the link is on every version of the page");
  assert.ok(!/localStorage/.test(gate), "not remembered beyond the visit");
});

test("the app behind it cannot be reached while it shows, and is given back when it closes", () => {
  assert.match(gate, /behind\.forEach\(\(el\) => \{ el\.inert = true; \}\);/);
  assert.match(gate, /behind\.forEach\(\(el\) => \{ el\.inert = false; \}\);/);
  assert.match(gate, /const stop = onInstallChange\(render\);[\s\S]*?stop\(\);/, "the install listener is removed on close");
});

test("Android installs with the browser's own button; an iPhone gets the Safari steps (and is sent to Safari from other browsers)", () => {
  assert.match(gate, /if \(canPrompt\(\)\)[\s\S]*?data-install/);
  assert.match(gate, /promptInstall\(\)/);
  assert.match(gate, /isIosSafari\(\) \? \[\] : \[step\("bi-browser-safari"/);
});

test("the notifications question waits until the install page is gone", () => {
  const app = read("public/js/app.js");
  assert.match(app, /const gate = import\("\.\/install-gate\.js"\)\.then\(\(g\) => g\.installGate\(\)\)/);
  assert.match(app, /Promise\.all\(\[gate, /);
  assert.ok(app.indexOf("const gate =") < app.indexOf("prompt.offerPush("));
});
