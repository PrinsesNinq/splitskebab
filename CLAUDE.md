# Splitskebab

A mobile-first web app (installable PWA) for students who live together: plan meals per house or group on a calendar, pick a recipe and
get the grocery list, see everyone's allergies (recipes that contain them are marked red), and split the receipt equally with payment
requests. English and Dutch. Runs on Firebase project `splitskebab-1fb8` (owned by a personal Gmail account, Firestore in eur3, hosting at
https://splitskebab-1fb8.web.app). Sign-in: Google accounts on @aperam.com that an admin added in Settings > Users (invite-only).

## Stack and layout

- Plain HTML, CSS and ES modules, no build step. Bootstrap theme and components from the Shared Element Library; Firebase JS SDK and
  FullCalendar 6 (pinned with integrity hashes, js/calendar.js) from CDNs.
- `public/*.html`: index (calendar), meal, recipes, houses, profile, settings (admin), login. All share the navbar and bottom bar; soft
  navigation swaps `#page-content`.
- `public/js/`: pure logic, unit tested (`money.js`, `recipe-logic.js`, `catalog.js` built-in recipes, `allergens.js`, `i18n.js` +
  `i18n-dict.js`); Firestore access and shared live lists (`store.js`); one script per page (`home.js`, `meal.js`, `recipes.js`,
  `houses.js`, `profile.js`); shared UI (`ui.js`, `recipe-view.js`, `calendar.js`); the starter's auth and settings.
- `firestore.rules`: every permission (data model at the top of `public/js/store.js`). Allergen ids must match `js/allergens.js`.
- `public/vendor/sel/` (or the folder in `sel.lock.json`) holds components pulled from the Shared Element Library: generated, never edit.

## Commands

```
npm install               # first time
npm test                  # unit tests (node:test): money, recipes, translations, rules/allergen and CDN-pin checks
firebase deploy           # this folder's Firebase account is the Gmail owner (firebase login:use)
npm run sel:check         # are the pulled components and rules current?
```

Not yet possible on this machine: `npm run dev` (the Firebase emulators need Java), and so no rules tests or browser tests.

## How to work here

The detailed conventions are in `.claude/rules/` and load when you touch matching files:
- `code-style.md`: structure, reuse, lifecycle, CSS (stylesheet first, inline only when needed).
- `testing.md`: every change ships with a test; the layers and the gates.
- `security.md`: the permission model, escaping, headers, secrets.
- `code-review.md`: what to check in a review (security, correctness, performance, maintainability), how to verify and rate a finding, and the report format.
- Before building UI run `sel components` (the full list of what the library offers; a word narrows it; `sel search "<what you need>"` ranks the best fits) and `sel component <name>` (markup, attributes, events): use a library component rather than writing your own.
- `sel-components.md`: reusable UI comes from the Shared Element Library (pulling, syncing, page transitions, versions). To build or convert a component read `docs/sel-component-authoring.md` (`/sel-component` runs the workflow); `docs/sel-getting-started.md` explains pulling, syncing and staying current.

Working agreements:
- Verify before claiming: run the matching tests and report failures with their output.
- Do not commit or push unless asked. Never change git config.
- Never bypass the checks unless the owner explicitly asks.
- Never read, print or commit key files or secrets.
- Prefer reusing or extracting a shared module over copying logic; keep static styling out of markup and scripts.
- Keep `CHANGELOG.md` current for user-visible changes: add bullets under `## [Unreleased]`. To release, run `sel release <version>` (it gives the unreleased bullets that version, bumps package.json and pushes the history to the Aperam App Store; `sel release --plan` shows what it would do). Keep a release to a few short bullets; a long leftover block is refused.
