// Planning a meal without a house or group (only the people invited), and the chat composer docked to the bottom of the screen with the
// messages kept clear of it.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
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

test("the chat composer stays at the bottom in the page's flow, never fixed, so messages keep room for it and phones can reach it", () => {
  // A fixed composer (moved up by a measured keyboard inset) broke on phones: people could no longer answer. Sticky keeps it in the flow.
  const css = read("public/css/app.css");
  const rule = /\.chat-page__composer \{([^}]*)\}/.exec(css)[1];
  assert.match(rule, /position: sticky;/);
  assert.match(rule, /bottom: calc\(4\.75rem \+ env\(safe-area-inset-bottom\)\);/, "just above the bottom bar");
  assert.match(rule, /margin-top: auto;/, "at the bottom of a short chat too");
  assert.match(css, /\.chat-page \{\s*display: flex;\s*flex-direction: column;\s*min-height: calc\(100vh/);
  assert.match(css, /\.keyboard-open \.chat-page__composer \{\s*bottom: 0\.5rem;/);
  for (const gone of ["chat-dock", "--keyboard-inset", "--composer-height"]) assert.ok(!css.includes(gone), gone);
  assert.ok(read("public/chat.html").includes('<div class="chat-composer chat-page__composer" id="composer" hidden>'));
  assert.ok(!read("public/js/chat.js").includes("ResizeObserver"));
  assert.ok(!read("public/js/keyboard.js").includes("keyboard-inset"));
});

