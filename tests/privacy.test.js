// Email privacy: people are their uid everywhere (the app, the rules, the functions), the one-time move from emails to uids
// (functions/migrate-logic.js) rewrites every place an email was an id, and the terms that ask for permission are complete in both languages.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  makeMapper, mapList, mapKeys, emailsIn, remapCircle, remapMeal, remapFriendship, remapConversation, remapMessage, remapPrivateProfile,
} from "../functions/migrate-logic.js";
import { TERMS, TERMS_VERSION, termsHtml } from "../public/js/terms.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8");
const m = makeMapper(new Map([["anna@x.nl", "uAnna"], ["bram@x.nl", "uBram"], ["cas@x.nl", "uCas"]]));

test("the mapper: an email becomes its uid (any case), anything else stays, an email without an account is null", () => {
  assert.equal(m("Anna@X.nl"), "uAnna");
  assert.equal(m("uAnna"), "uAnna", "already a uid: running twice changes nothing");
  assert.equal(m("guest:abc"), "guest:abc");
  assert.equal(m("ghost@x.nl"), null, "added by an admin, never signed in");
  assert.deepEqual(mapList(["anna@x.nl", "ghost@x.nl", "uAnna", 5], m), ["uAnna"], "dropped, no doubles, only text");
  assert.deepEqual(mapKeys({ "bram@x.nl": 1250, "ghost@x.nl": 300 }, m), { uBram: 1250 });
});

test("every email is found, as a valid address: strings, lists, map keys, nested maps, pairs and ids split, not inside timestamps", () => {
  const ts = { toDate() {}, seconds: 1, nanos: 0 };
  const found = emailsIn({ host: "Anna@x.nl", costs: { "bram@x.nl": 5 }, settled: ["cas@x.nl>guest:1"], at: ts, title: "pasta", odd: "not@valid" });
  assert.deepEqual([...found].sort(), ["anna@x.nl", "bram@x.nl", "cas@x.nl"], "a settled pair is split; an invalid address is left out");
  assert.deepEqual([...emailsIn("anna@x.nl|bram@x.nl")].sort(), ["anna@x.nl", "bram@x.nl"], "a chat or friendship id");
  assert.deepEqual([...emailsIn("feedback|cas@x.nl")], ["cas@x.nl"]);
});

test("a meal: host, every list, the costs and reasons maps, settled pairs (guests kept) and the older one-payer cost", () => {
  const meal = remapMeal({
    title: "Pasta", host: "anna@x.nl", viewers: ["anna@x.nl", "bram@x.nl", "ghost@x.nl"], participants: ["anna@x.nl", "bram@x.nl"],
    declined: ["cas@x.nl"], invited: ["cas@x.nl"], costs: { "anna@x.nl": 2400 }, declineReasons: { "cas@x.nl": "away" },
    settled: ["bram@x.nl>anna@x.nl", "guest:g1>anna@x.nl", "ghost@x.nl>anna@x.nl", "bram@x.nl"], cost: { totalCents: 900, paidBy: "bram@x.nl" },
  }, m);
  assert.equal(meal.host, "uAnna");
  assert.deepEqual(meal.viewers, ["uAnna", "uBram"]);
  assert.deepEqual(meal.participants, ["uAnna", "uBram"]);
  assert.deepEqual(meal.declined, ["uCas"]);
  assert.deepEqual(meal.invited, ["uCas"]);
  assert.deepEqual(meal.costs, { uAnna: 2400 });
  assert.deepEqual(meal.declineReasons, { uCas: "away" });
  assert.deepEqual(meal.settled, ["uBram>uAnna", "guest:g1>uAnna", "uBram"], "a pair with someone unknown goes; the older single format stays");
  assert.deepEqual(meal.cost, { totalCents: 900, paidBy: "uBram" });
  assert.equal(meal.title, "Pasta", "everything else is kept");
  assert.ok(!emailsIn(meal).size, "no email left");
});

test("a house: members, admins and the owner (who must stay a member)", () => {
  assert.deepEqual(remapCircle({ name: "H", members: ["anna@x.nl", "bram@x.nl"], admins: ["bram@x.nl"], owner: "anna@x.nl" }, m),
    { name: "H", members: ["uAnna", "uBram"], admins: ["uBram"], owner: "uAnna" });
  assert.equal(remapCircle({ members: ["bram@x.nl"], admins: [], owner: "ghost@x.nl" }, m).owner, "uBram", "an unknown owner: the first member");
});

test("friendships and chats get new ids from the sorted uids; one with someone unknown is dropped", () => {
  assert.deepEqual(remapFriendship({ users: ["anna@x.nl", "bram@x.nl"], requester: "bram@x.nl", status: "accepted" }, m),
    { id: "uAnna|uBram", data: { users: ["uAnna", "uBram"], requester: "uBram", status: "accepted" } });
  assert.equal(remapFriendship({ users: ["anna@x.nl", "ghost@x.nl"], requester: "anna@x.nl" }, m), null);
  const direct = remapConversation("anna@x.nl|cas@x.nl", { type: "direct", members: ["cas@x.nl", "anna@x.nl"], readAt: { "cas@x.nl": 1 }, lastMessage: { text: "hoi", from: "cas@x.nl" } }, m);
  assert.equal(direct.id, "uAnna|uCas");
  assert.deepEqual(direct.data.members, ["uAnna", "uCas"]);
  assert.deepEqual(direct.data.readAt, { uCas: 1 });
  assert.deepEqual(direct.data.lastMessage, { text: "hoi", from: "uCas" });
  assert.equal(remapConversation("feedback|bram@x.nl", { type: "feedback", members: ["bram@x.nl"] }, m).id, "feedback|uBram");
  assert.equal(remapConversation("a|b", { type: "direct", members: ["anna@x.nl", "ghost@x.nl"] }, m), null);
});

test("a message: the writer and the people behind each reaction", () => {
  assert.deepEqual(remapMessage({ from: "anna@x.nl", text: "hi", reactions: { "👍": ["bram@x.nl", "ghost@x.nl"], "❤️": ["ghost@x.nl"] } }, m),
    { from: "uAnna", text: "hi", reactions: { "👍": ["uBram"] } });
});

test("a private profile keeps allergies, payment link, friends and readers (with what an old public profile held), never an email", () => {
  assert.deepEqual(remapPrivateProfile({ friends: ["bram@x.nl"], readers: ["cas@x.nl", "ghost@x.nl"] }, { allergies: ["nuts"], paymentLink: "https://bunq.me/a", friends: ["cas@x.nl"] }, m),
    { allergies: ["nuts"], paymentLink: "https://bunq.me/a", friends: ["uBram"], readers: ["uCas"] }, "the private profile's own values win");
  assert.ok(!("email" in remapPrivateProfile({ allergies: [] }, null, m)));
});

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
  assert.match(auth, /return \(own\.data\(\)\.termsVersion \|\| 0\) >= TERMS_VERSION \? "ok" : "terms";/);
  assert.match(auth, /email: user\.email\.toLowerCase\(\)/);
  assert.match(read("public/js/app.js"), /if \(status === "new" \|\| status === "terms"\) \{ forgetAccess\(\); showTerms\(user, status\); \}/);
  assert.match(read("public/js/app.js"), /<button type="button" class="btn btn-primary w-100 mb-2" id="register-btn" disabled>/, "nothing happens before the box is ticked");
});

test("the terms: complete in English and Dutch, versioned, about the email and the administrator, and escaped", () => {
  assert.ok(Number.isInteger(TERMS_VERSION) && TERMS_VERSION >= 1);
  assert.equal(TERMS.en.sections.length, TERMS.nl.sections.length, "the same sections in both languages");
  for (const key of ["title", "intro", "accept", "showEmail", "showEmailHelp", "version"]) assert.ok(TERMS.en[key] && TERMS.nl[key], key);
  assert.match(TERMS.en.accept, /administrator can see my email/);
  assert.match(TERMS.nl.accept, /beheerder mijn e-mailadres kan zien/);
  assert.ok(TERMS.en.sections.some(([h]) => /email/i.test(h)) && TERMS.nl.sections.some(([h]) => /e-mail/i.test(h)));
  const esc = (v) => String(v).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  const html = termsHtml("en", esc);
  assert.ok(!/<script/i.test(html) && html.includes("&#34;Show my email&#34;"), "every text goes through esc");
  assert.ok(termsHtml("fr", esc).includes(TERMS.en.title) || termsHtml("fr", esc).includes(esc(TERMS.en.intro)), "another language: English");
});
