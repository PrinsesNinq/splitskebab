// Planning a meal without a house or group (only the people invited), and the chat composer docked to the bottom of the screen with the
// messages kept clear of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { keyboardInset } from "../public/js/keyboard.js";
import { DICT } from "../public/js/i18n-dict.js";

const read = (p) => fs.readFileSync(new URL(`../${p}`, import.meta.url), "utf8").replace(/\r\n/g, "\n");

test("the rules let a meal be planned without a circle, and with one only by a member", () => {
  const rules = read("firestore.rules");
  const create = rules.slice(rules.indexOf("match /meals/{id} {"), rules.indexOf("allow update:", rules.indexOf("match /meals/{id} {")));
  assert.ok(create.includes("request.resource.data.host == me()"), "still only for myself as host");
  assert.match(create, /\(request\.resource\.data\.circleId == '' \|\|\s*me\(\) in get\(\/databases\/\$\(database\)\/documents\/circles\/\$\(request\.resource\.data\.circleId\)\)\.data\.members\)/);
  const update = rules.slice(rules.indexOf("allow update:", rules.indexOf("match /meals/{id} {")));
  assert.ok(update.includes("request.resource.data.circleId == resource.data.circleId"), "the circle (or none) never changes afterwards");
});

test("the meal form offers no house or group, and invites anyone found by name", () => {
  const html = read("public/meal.html");
  assert.match(html, /<select class="form-select" id="new-circle"><\/select>/, "not required");
  assert.ok(html.includes('id="new-invite-search"') && html.includes('id="new-invite-results"'));
  const js = read("public/js/meal.js");
  const start = js.slice(js.indexOf("function startNew()"), js.indexOf("function startView("));
  assert.ok(start.includes('`<option value="">${esc(t("meal.noCircleOption"))}</option>`'), "a 'none' choice first");
  assert.ok(!start.includes("!c) return"), "saving no longer needs a circle");
  assert.ok(start.includes('circleId: c?.id || "", circleName: c?.name || ""'));
  assert.ok(start.includes("attachPeoplePicker($(\"#new-invite-search\")"), "by name, never by email");
  assert.ok(!start.includes("home.noCircle"), "no dead end when I am in no house or group");
});

test("a meal without a house or group reads well everywhere it is shown", () => {
  assert.ok(read("public/js/home.js").includes('esc(meal.circleName || t("meal.noCircleShort"))'));
  assert.ok(read("public/js/meal.js").includes('[when, meal.circleName, t("meal.hostedBy"'));
  assert.ok(read("public/js/app.js").includes('circle: meal.circleName || t("meal.noCircleShort")'));
  for (const lang of ["en", "nl"]) {
    for (const key of ["meal.noCircleOption", "meal.noCircleShort", "meal.invitePeople", "meal.invitePeopleHelp", "meal.inviteSearch", "meal.invite"]) {
      assert.ok(DICT[lang][key], `${lang} ${key}`);
    }
  }
});

test("the keyboard inset is the part of the page under the visible area, and nothing while it is closed", () => {
  assert.equal(keyboardInset({ open: true, visualHeight: 500, visualTop: 0, windowHeight: 800 }), 300);
  assert.equal(keyboardInset({ open: true, visualHeight: 500, visualTop: 120, windowHeight: 800 }), 180, "iOS scrolled the visible area");
  assert.equal(keyboardInset({ open: false, visualHeight: 500, windowHeight: 800 }), 0);
  assert.equal(keyboardInset({ open: true, visualHeight: undefined, windowHeight: 800 }), 0);
  assert.equal(keyboardInset({ open: true, visualHeight: 820, windowHeight: 800 }), 0, "never negative");
});

test("the chat composer is docked to the bottom of the screen and the messages keep room for it", () => {
  const css = read("public/css/app.css");
  assert.match(css, /\.chat-dock \{\s*position: fixed;/);
  assert.match(css, /\.keyboard-open \.chat-dock \{\s*bottom: calc\(0\.5rem \+ var\(--keyboard-inset, 0px\)\);/, "on the keyboard while typing");
  assert.match(css, /\.chat-page \{\s*padding-bottom: calc\(var\(--composer-height, 6\.5rem\) \+ 0\.75rem\);/, "the last message stays clear");
  assert.ok(!/\.chat-page__composer \{[^}]*position: sticky/.test(css), "no longer only sticky inside the page");
  assert.match(read("public/chat.html"), /<div class="chat-dock" id="chat-dock"><div class="container">\s*<div class="chat-composer chat-page__composer" id="composer" hidden>/);
  const chat = read("public/js/chat.js");
  assert.ok(chat.includes('page.style.setProperty("--composer-height"'), "measured as the composer grows");
  assert.ok(chat.includes("stops.push(() => sizer.disconnect());"), "stopped when the page is left");
  assert.match(read("public/js/keyboard.js"), /root\.style\.setProperty\("--keyboard-inset", `\$\{inset\}px`\)/);
});
