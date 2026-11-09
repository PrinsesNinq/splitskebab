// Sharing the app: the share button on every page, and that it opens the share sheet straight from the tap.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");

test("every page with the navbar has the share button, and sharing opens straight from the tap", () => {
  for (const page of fs.readdirSync(new URL("../public/", import.meta.url)).filter((f) => f.endsWith(".html") && !["login.html", "terms.html"].includes(f))) {
    assert.match(read(`public/${page}`), /data-share-app aria-label="Invite someone to Splitskebab" data-i18n-aria-label="share\.button"/, page);
  }
  const app = read("public/js/app.js");
  const handler = app.slice(app.indexOf('closest("[data-share-app]")') - 80, app.indexOf('closest("[data-share-app]")') + 200);
  assert.ok(!/await/.test(handler), "no await before the share sheet (iPhones refuse it otherwise)");
  assert.match(handler, /shareText\(t\("share\.text", \{ url: new URL\("\.\/", location\.href\)\.href \}\)\)/);
});
