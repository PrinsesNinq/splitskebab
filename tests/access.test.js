// Who gets in (firestore.rules, public/js/config.js): any Google account can sign in, only invited people get data. These read the rules
// as text: the rules themselves can only be run on the Firebase emulator, which needs Java (not installed on this machine yet).
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const config = fs.readFileSync(path.join(root, "public", "js", "config.js"), "utf8");

/** The body of `match /<path> { ... }` (up to the next match block). */
const block = (p) => {
  const i = rules.indexOf(`match /${p} {`);
  assert.ok(i >= 0, `firestore.rules has a match block for ${p}`);
  const next = rules.indexOf("match /", i + 1);
  return rules.slice(i, next < 0 ? undefined : next);
};

test("the app and the rules agree on the sign-in domain", () => {
  const domain = /export const ALLOWED_DOMAIN = "([^"]*)";/.exec(config)?.[1];
  assert.notEqual(domain, undefined, "config.js sets ALLOWED_DOMAIN");
  const signedIn = /function signedIn\(\) \{([\s\S]*?)\}/.exec(rules)[1];
  if (domain) assert.ok(signedIn.includes(domain.replace(/\./g, "[.]")), `signedIn() checks @${domain}`);
  else assert.ok(!/email\.matches/.test(signedIn), "with no domain, signedIn() accepts any verified email");
  assert.ok(signedIn.includes("email_verified == true"), "the email must be verified");
});

test("every app collection asks for an invitation, not just a sign-in", () => {
  for (const p of ["circles/{id}", "meals/{id}", "recipes/{id}"]) {
    const allows = block(p).match(/allow [a-z, ]+: if [^;]+;/g);
    assert.ok(allows?.length, `${p} has rules`);
    for (const a of allows) assert.ok(a.includes("allowed()"), `${p}: ${a}`);
  }
  assert.match(block("userProfiles/{email}"), /allow read: if allowed\(\);/, "profiles (allergies, payment links) only for invited people");
});

test("strangers who sign in cannot read who the admins are or the groups", () => {
  assert.match(block("settings/admins"), /allow read: if allowed\(\);/);
  assert.match(block("settings/groups"), /allow read: if allowed\(\);/);
});

test("an invitation is a users/ document that only admins write", () => {
  assert.match(rules, /function allowed\(\) \{[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(me\(\)\)\)/);
  assert.match(block("users/{email}"), /allow write: if isAdmin\(\);/);
});
