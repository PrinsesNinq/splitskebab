---
description: Build or convert a component in the Shared Element Library, following its guidelines
argument-hint: <what to build or convert>
---

You are helping me build components for my Shared Element Library, and move code from my projects into it. Follow the library's component guidelines exactly.

## First, read these (do not skip)

1. `docs/sel-component-authoring.md` (pulled into the project; the source is the library's Rules section). It is the rulebook: the definition of done, the anatomy of a component, the naming conventions and the bugs to avoid. Also `.claude/rules/sel-components.md` (how components are used, versioned and committed).
2. One or two existing components as reference, from `data/themes/aperam-theme/theme.json` (the `components` array: each has `id`, `html`, `css`, `js`). Start with `header-panel`, `stat-block` and the one closest to what we are building.
3. `tests/components/` in the library for how components are tested.

## What I want

$ARGUMENTS

(If converting existing code: name the source files, say what is project-specific (data access, routes, Firebase) and what becomes the component.)

## Rules you must follow

- Behaviour is a Lit custom element, tag `sel-<name>`, extending `ThemeElement`, defined with `defineElement`. The logic is an exported `initX(el, options)` that returns a `dispose` function; the element calls it from `setup()`. Removing the element must remove every listener, observer, timer and node it added; connecting it again must work.
- Configuration is attributes declared in `static properties`; output is events named `thing:verb` (bubbling, data in `detail`). Parts the script must find use `data-<component>-<part>` hooks.
- Anything drawn is a Lit template (`html`, `render`, `repeat`, `classMap`, `styleMap`, `icon()`), never `innerHTML` with data. Check links built from data. Do not use `unsafeHTML`.
- No static inline styles. Styling goes in the CSS tab; inline only for per-instance values (custom properties such as `--chip-color`, measured positions). Start the CSS with `sel-x { display: block; }`.
- Do not name properties like built-in `HTMLElement` members (`popover`, `title`, `hidden`, `id`, `style`, ...).
- Looks right in light and dark mode: colours come from `--bs-*` and the theme's `--glass-*` variables, never a fixed white (run `npm run audit:contrast`).
- Data from outside is escaped or checked (`safeHref`, `safeIconName`), a request or file read is cancelled when the element is removed, and a stale answer is ignored.
- Keyboard and screen-reader support, `prefers-reduced-motion`, and hover-only controls also work with focus and touch.
- Demo-only code (preview buttons, logs) goes between `//#region demo` and `//#endregion demo`.
- The HTML tab starts with a comment that documents the markup, attributes and events.
- Markup-only components (no behaviour) stay plain classes: do not wrap them in an element.
- Import only from `"lit"` / `"theme-element"` and `component:<id>`; the build turns that into both the classic bundle and ES modules.

## How to work

1. State your plan in a few lines first: the element name, attributes, events, what is drawn by Lit, what stays authored markup.
2. Write the component (html, css, js). Apply it to the theme through the library, or by editing the component in `theme.json` through `lib/store.js` (`store.get(id)` / `store.save(id, { components })`). Make a scratch copy `theme.backup-before-<topic>.json` next to `theme.json` first (it is gitignored: delete it once the change is committed).
3. Write the test in `tests/components/` that opens it in both modes (`classic` and `module`), drives it like a person would, checks hostile text is shown as text, checks removal of the element leaves nothing behind, and checks `page.errors` is empty.
4. Run `npm test` and fix until it passes. Do not weaken a test to make it pass; if a test is wrong, say why.
5. Write the component's change note (what changed, and whether it breaks existing markup), then tell me a new library version has to be committed.
6. Show me the result: what changed, the test results, and anything you were unsure about. Do not commit; I will.

## When converting code from a project

- Keep the project's behaviour identical unless I say otherwise. Write down any behaviour you changed or any bug you found in the original.
- Project-specific code stays in the project and talks to the component through attributes, properties, methods and events.
- After the component exists and passes, tell me how to replace the old copy in the project with the built file (`node scripts/sel-pull.mjs elements <id>`), and list the old code that can be deleted.

If something in the guidelines conflicts with what I ask, tell me before deviating.
