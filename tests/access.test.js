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
  for (const p of ["circles/{id}", "meals/{id}", "recipes/{id}", "friendships/{id}"]) {
    const allows = block(p).match(/allow [a-z, ]+: if [^;]+;/g);
    assert.ok(allows?.length, `${p} has rules`);
    for (const a of allows) assert.ok(a.includes("allowed()"), `${p}: ${a}`);
  }
  assert.match(block("userProfiles/{email}"), /allow read: if allowed\(\);/, "profiles (allergies, payment links) only for invited people");
});

test("only admins read who the admins are; strangers cannot read the groups", () => {
  assert.match(block("settings/admins"), /allow read: if allowed\(\) && \(resource == null \|\| me\(\) in resource\.data\.emails\);/, "only an admin (or anyone while there is no list yet)");
  assert.match(block("settings/groups"), /allow read: if allowed\(\);/);
});

test("a friend request only goes to someone with access, once per pair, and only the other one accepts it", () => {
  const f = block("friendships/{id}");
  const create = /allow create: if ([\s\S]*?);\n/.exec(f)[1];
  assert.match(create, /isInvited\(request\.resource\.data\.users\[0\]\) && isInvited\(request\.resource\.data\.users\[1\]\)/, "both people have access");
  assert.match(create, /users\[0\] < request\.resource\.data\.users\[1\]/, "the pair is sorted");
  assert.match(create, /id == request\.resource\.data\.users\[0\] \+ '\|' \+ request\.resource\.data\.users\[1\]/, "the id is the pair: one document per pair");
  assert.match(create, /requester == me\(\)/);
  assert.match(create, /status == 'pending'/, "nobody creates an accepted friendship");
  const update = /allow update: if ([\s\S]*?);\n/.exec(f)[1];
  assert.match(update, /me\(\) != resource\.data\.requester/, "the requester cannot accept their own request");
  assert.match(update, /affectedKeys\(\)\.hasOnly\(\['status', 'acceptedAt'\]\)/, "accepting changes nothing else");
});

test("everyone writes only their own costs for a meal, and only the payer retires an older one-payer cost", () => {
  const meals = block("meals/{id}");
  assert.match(meals, /costsChangeOk\(request\.resource\.data, resource\.data\)/, "updates check the costs");
  assert.match(meals, /legacyCostOk\(request\.resource\.data, resource\.data\)/);
  assert.match(rules, /n\.diff\(p\)\.affectedKeys\(\)\.hasOnly\(\[me\(\)\]\)/, "only my own entry changes");
  assert.match(rules, /n\[me\(\)\] is int && n\[me\(\)\] > 0 && n\[me\(\)\] <= 10000000/, "a whole number of cents, up to 100,000 euros");
  assert.match(rules, /next\.get\('cost', null\) == null && prev\.cost\.paidBy == me\(\)/);
  assert.match(meals, /get\('costs', \{\}\)\.size\(\) == 0/, "a new meal starts without costs");
});

test("the public profile holds only a name and a photo; allergies, payment link and friends are private", () => {
  assert.match(block("userProfiles/{email}"), /keys\(\)\.hasOnly\(\['displayName', 'photoUrl'\]\)/);
  const priv = block("privateProfiles/{email}");
  assert.match(priv, /allow get: if allowed\(\) && \(me\(\) == email \|\| me\(\) in resource\.data\.readers\);/, "only me and my readers");
  assert.match(priv, /allow list: if allowed\(\) && me\(\) in resource\.data\.readers;/, "the query only by the readers condition it can prove");
  assert.ok(!/allow read:/.test(priv), "no combined read rule: an id condition cannot be proven for a query");
  assert.match(priv, /allow create, update: if allowed\(\) && me\(\) == email &&/, "only I write mine (and so only I decide who reads it)");
  assert.match(priv, /hasOnly\(\['allergies', 'paymentLink', 'friends', 'readers'\]\)/);
  assert.match(rules, /d\.readers is list && d\.readers\.size\(\) <= 1500/, "the readers list is capped as in js/sharing.js");
});

test("everyone writes only their own reason for not coming, of at most 200 characters", () => {
  assert.match(block("meals/{id}"), /reasonsChangeOk\(request\.resource\.data, resource\.data\)/, "updates check the reasons");
  const fn = /function reasonsChangeOk\(next, prev\) \{([\s\S]*?)\n    \}/.exec(rules)[1];
  assert.match(fn, /n\.diff\(p\)\.affectedKeys\(\)\.hasOnly\(\[me\(\)\]\)/, "only my own reason changes");
  assert.match(fn, /n\[me\(\)\] is string && n\[me\(\)\]\.size\(\) <= 200/);
});

test("an account is a users/ document: anyone may create their own with only the time in it, only admins change or delete it", () => {
  assert.match(rules, /function allowed\(\) \{[\s\S]*?exists\(\/databases\/\$\(database\)\/documents\/users\/\$\(me\(\)\)\)/);
  const users = block("users/{email}");
  const create = /allow create: if ([\s\S]*?);\n/.exec(users)[1];
  assert.match(create, /me\(\) == email/, "only your own account");
  assert.match(create, /notBlocked\(\)/, "a blocked person cannot register again");
  assert.match(create, /keys\(\)\.hasOnly\(\['registeredAt'\]\)/, "no groups or anything else on your own account");
  assert.match(create, /registeredAt == request\.time/);
  assert.match(users, /allow update, delete: if isAdmin\(\);/);
});

test("a blocked person gets nothing, and only admins block", () => {
  assert.match(rules, /function allowed\(\) \{[\s\S]*?notBlocked\(\)/, "allowed() checks the block");
  assert.match(block("blocked/{email}"), /allow write: if isAdmin\(\);/);
  assert.match(block("blocked/{email}"), /allow read: if isAdmin\(\) \|\| \(signedIn\(\) && me\(\) == email\);/, "you may see that you are blocked");
});

test("every admin action in Settings is refused to non-admins by the rules, not only hidden", () => {
  assert.match(block("settings/admins"), /allow update, delete: if isAdmin\(\);/, "promote and demote");
  assert.match(block("settings/admins"), /allow create: if isBootstrapAdmin\(\) && !exists/, "only the bootstrap account creates the list, once");
  assert.match(block("settings/groups"), /allow write: if isAdmin\(\);/, "groups");
  assert.match(block("users/{email}"), /allow update, delete: if isAdmin\(\);/, "change or remove an account");
  assert.match(block("users/{email}"), /allow read: if isAdmin\(\) \|\| \(signedIn\(\) && me\(\) == email\);/, "the users list: admins, or only your own");
  assert.match(block("blocked/{email}"), /allow write: if isAdmin\(\);/, "block and unblock");
  assert.match(block("blocked/{email}"), /allow read: if isAdmin\(\) \|\| \(signedIn\(\) && me\(\) == email\);/, "the block list: admins, or only your own");
  assert.match(block("userProfiles/{email}"), /allow delete: if isAdmin\(\);/, "delete someone's profile");
});

test("the Settings page sends non-admins away before showing anything", () => {
  const js = fs.readFileSync(path.join(root, "public", "js", "settings.js"), "utf8");
  assert.match(js, /pageParts\.forEach\(\(el\) => \{ el\.hidden = true; \}\);/, "hidden until the role is known");
  assert.match(js, /if \(!status\.isAdmin && !status\.canBootstrap\) \{ leaveForNonAdmins\(\); return; \}/);
});
