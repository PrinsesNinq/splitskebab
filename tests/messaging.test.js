// The message system's rules (public/js/messaging.js), and that firestore.rules keep strangers from messaging anyone.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { directId, feedbackId, otherMember, isUnread, preview, react, MAX_PREVIEW } from "../public/js/messaging.js";

test("one direct conversation per pair, whoever starts it", () => {
  assert.equal(directId("b@x", "a@x"), "a@x|b@x");
  assert.equal(directId("a@x", "b@x"), directId("b@x", "a@x"));
  assert.equal(feedbackId("a@x"), "feedback|a@x");
});

test("the other person: the second member, or for feedback the one who gave it", () => {
  assert.equal(otherMember({ type: "direct", members: ["a@x", "b@x"] }, "a@x"), "b@x");
  assert.equal(otherMember({ type: "feedback", members: ["a@x"] }, "admin@x"), "a@x");
});

test("unread: someone else wrote last, after I last read", () => {
  const c = { lastAt: 2000, lastFrom: "b@x", readAt: { "a@x": 1000 } };
  assert.equal(isUnread(c, "a@x"), true);
  assert.equal(isUnread({ ...c, readAt: { "a@x": 2000 } }, "a@x"), false, "read up to the last message");
  assert.equal(isUnread({ ...c, lastFrom: "a@x" }, "a@x"), false, "my own message");
  assert.equal(isUnread({ ...c, readAt: {} }, "a@x"), true, "never opened");
  assert.equal(isUnread({ lastAt: null }, "a@x"), false, "no messages yet");
});

test("the preview is one line of at most 140 characters", () => {
  assert.equal(preview("Hoi!\n\nEet je   mee?"), "Hoi! Eet je mee?");
  const long = preview("x".repeat(500));
  assert.equal(long.length, MAX_PREVIEW);
  assert.ok(long.endsWith("…"));
});

test("reacting: one reaction per person, taking it back, empty emojis dropped", () => {
  let r = react({}, "a@x", "👍");
  assert.deepEqual(r, { "👍": ["a@x"] });
  r = react(r, "b@x", "👍");
  r = react(r, "a@x", "❤️");
  assert.deepEqual(r, { "👍": ["b@x"], "❤️": ["a@x"] }, "a's reaction moved");
  r = react(r, "a@x", null);
  assert.deepEqual(r, { "👍": ["b@x"] }, "taken back, and the empty emoji is gone");
});

test("firestore.rules: a direct conversation only with someone I am connected to, messages only in my own name", () => {
  const rules = fs.readFileSync(new URL("../firestore.rules", import.meta.url), "utf8");
  const convo = rules.slice(rules.indexOf("match /conversations/{id}"), rules.indexOf("// Users' own recipes"));
  assert.match(convo, /request\.resource\.data\.members\[0\] == me\(\) && connectedTo\(request\.resource\.data\.members\[1\]\)/);
  assert.match(convo, /id == request\.resource\.data\.members\[0\] \+ '\|' \+ request\.resource\.data\.members\[1\]/, "one per pair");
  assert.match(convo, /type == 'feedback' && request\.resource\.data\.members == \[me\(\)\] && id == 'feedback\|' \+ me\(\)/, "feedback only as yourself");
  assert.match(convo, /request\.resource\.data\.from == me\(\)/, "a message is written in my own name");
  assert.match(convo, /request\.resource\.data\.at == request\.time/, "stamped with the server's time");
  assert.match(convo, /affectedKeys\(\)\.hasOnly\(\[me\(\)\]\)/, "only my own read time");
  assert.match(convo, /allow delete: if allowed\(\) && resource\.data\.from == me\(\);/, "only the writer deletes a message");
  assert.match(rules, /function connectedTo\(other\) \{[\s\S]*?privateProfiles[\s\S]*?readers/, "connected = on a private profile's readers list");
});
