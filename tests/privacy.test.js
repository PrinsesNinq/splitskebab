// Email privacy: people are their uid everywhere (the app, the rules, the functions), and the terms that ask for permission are complete
// in both languages. (The one-time move of the existing data from emails to uids ran on 2026-11-09; see the git history.)
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { TERMS, DEFAULT_VERSION, termsFrom, termsHtml } from "../public/js/terms.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
test("the app knows people by uid: no page takes an email as 'me', and no link or id is an email", () => {
  for (const file of fs.readdirSync(new URL("../public/js/", import.meta.url)).filter((f) => f.endsWith(".js"))) {
    const js = read(`public/js/${file}`);
    assert.ok(!/const me = user\.email/.test(js) && !/me = user\.email/.test(js), `${file}: me is user.uid`);
    assert.ok(!/person\.html\?email=/.test(js), `${file}: person pages open by id`);
  }
  assert.match(read("public/js/store.js"), /name: text\(pub\.displayName, 100\) \|\| t\("common\.someone"\)/, "a missing name is never made from an email");
  assert.match(read("public/js/store.js"), /email: text\(priv\?\.email, 200\)/, "the email only from the private profile, where the person put it");
  assert.match(read("functions/index.js"), /\.get\("uids"\)/, "the functions read the admins by uid");
});

test("the person page shows an email only when that person shows it", () => {
  const js = read("public/js/person.js");
  assert.match(js, /\$\("#person-email"\)\.textContent = p\.email;/);
  assert.match(js, /\$\("#person-email"\)\.hidden = !p\.email;/);
});

test("an account from before the terms (or an older version) is asked to accept them; accepting sends my own email", () => {
  const auth = read("public/js/auth.js");
  assert.match(auth, /return \(own\.data\(\)\.termsVersion \|\| 0\) >= inForce \? "ok" : "terms";/, "compared with the version in force");
  assert.match(auth, /getDocFromServer\(store\.doc\(db, "settings", "terms"\)\)/, "the version in force, from the server");
  assert.match(auth, /email: user\.email\.toLowerCase\(\)/);
  assert.match(read("public/js/app.js"), /if \(status === "new" \|\| status === "terms"\) \{ forgetAccess\(\); showTerms\(user, status\); \}/);
  assert.match(read("public/js/app.js"), /<button type="button" class="btn btn-primary w-100 mb-2" id="register-btn" disabled>/, "nothing happens before the box is ticked");
});

test("the terms: complete in English and Dutch, versioned, about the email and the administrator, and escaped", () => {
  assert.equal(DEFAULT_VERSION, 1, "the built-in text is version 1");
  assert.equal(TERMS.en.sections.length, TERMS.nl.sections.length, "the same sections in both languages");
  for (const key of ["title", "intro", "accept", "showEmail", "showEmailHelp", "version"]) assert.ok(TERMS.en[key] && TERMS.nl[key], key);
  assert.match(TERMS.en.accept, /administrator can see my email/);
  assert.match(TERMS.nl.accept, /beheerder mijn e-mailadres kan zien/);
  assert.ok(TERMS.en.sections.some(([h]) => /email/i.test(h)) && TERMS.nl.sections.some(([h]) => /e-mail/i.test(h)));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = termsHtml(termsFrom(null), "en", esc);
  assert.ok(!/<script/i.test(html) && html.includes("&#34;Show my email&#34;"), "every text goes through esc");
  assert.ok(termsHtml(termsFrom(null), "fr", esc).includes(esc(TERMS.en.intro)), "another language: English");
});
