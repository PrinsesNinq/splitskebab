# Shared Element Library: building components

How components in this library are built, so that a component written today behaves like the ones already here, works in every project, and is safe to change later. Read this **before building or converting a component** (the `/sel-component` command does); using a component needs only `.claude/rules/sel-components.md`. These rules are followed by every component in the theme; new and converted components must follow them too. A component that breaks one of them is not finished.

## The idea in one minute

A component is **markup + CSS + a small piece of JavaScript with a fixed shape**. The shape is the same for all of them:

- The visible parts are **plain HTML and CSS** that use Bootstrap and the theme's tokens. A component with no behaviour is only that (`striped-list`, `tags`, `timeline`, ...). It needs no element and no script.
- Behaviour lives in a **custom element** (`<sel-header-panel>`, `<sel-board>`, ...) built on Lit. The element is a thin wrapper: it connects when it appears on the page and cleans up completely when it leaves.
- The logic that does the work is a plain **exported function** (`initHeaderPanel(el)`) that returns a `dispose` function. The element only calls it. That way the same behaviour works on markup you wire yourself, and it can be tested without the element.
- Anything the component **draws** (lists, badges, menus, labels) is drawn with Lit templates, so text is always escaped. Nothing is built by gluing strings into `innerHTML`.

Why: the same component is used in several projects, some of which are not React (or anything else). Custom elements work everywhere without a build step, clean up after themselves when a page is swapped (soft navigation), and keep the markup readable as markup.

## Definition of done (check every point)

- [ ] Behaviour component: one custom element, tag prefixed `sel-`, defined with `defineElement`, extending `ThemeElement`.
- [ ] The logic is an exported `initX(el, options)` that returns a `dispose` function (or the element's `setup()` does the work and returns one). **Removing the element removes every listener, observer, timer, sentinel node and class it added.** Connecting it again works.
- [ ] Configuration is **attributes** (`compact-enter`, `source`, `disabled`), declared in `static properties`. Parts of the markup that the script must find use `data-*` hooks (`data-picker-grid`). Never configure with `data-*` on the element itself.
- [ ] Output is **events** (`board:change`, `stepper:finish`, ...), named `thing:verb`, bubbling, with the data in `detail`. Document each one. Cancelable ones say so.
- [ ] Generated UI is a **Lit template**; user text is never inserted as markup. Links built from data go through a check (`safeHref`, https-only photo URLs).
- [ ] **No static inline styles** in markup or script. Styling is in the component's CSS tab. Inline is only for values that differ per instance (`--chip-color: #e57373`, a measured position, a progress width set through `styleMap`).
- [ ] The CSS starts with `sel-x { display: block; }` (or the display the component needs): custom elements are `inline` by default.
- [ ] Looks right in light **and** dark mode: colours come from `--bs-*` / the theme's light-dark variables, not fixed values (see Light and dark mode).
- [ ] Works with the keyboard and screen readers (roles, labels, focus), and respects `prefers-reduced-motion` (use `prefersReducedMotion()`).
- [ ] **Demo-only code** (the buttons and logs of the preview page) sits between `//#region demo` and `//#endregion demo`. It runs in the editor preview and is left out of every built file.
- [ ] The HTML tab starts with a comment that explains the markup, every attribute, every event and how to reuse it.
- [ ] A test in `tests/components/` covers the behaviour **in both the classic bundle and the ES module build**, plus removal of the element. `npm test` passes.
- [ ] **Hostile data is covered**: a value from outside (text, a link, an icon name, a JSON attribute) is escaped or checked, and a test feeds it `<img src=x onerror=...>` or a `javascript:` URL.
- [ ] **Async work is cancelled on removal** (requests, file reads, timers) and a stale answer is ignored.
- [ ] The change has a **change note** on the component, and a version is committed (see `.claude/rules/sel-components.md`).

## Anatomy of a component

```js
import { ThemeElement, defineElement } from "lit";

/** The behaviour, usable on any element. Returns a function that undoes everything. */
export function initThing(el, { size = 3 } = {}) {
  const ac = new AbortController();
  el.addEventListener("click", () => el.dispatchEvent(new CustomEvent("thing:click", { bubbles: true })), { signal: ac.signal });
  return () => ac.abort();
}

export class Thing extends ThemeElement {
  static properties = { size: { type: Number } };   // the attribute `size`
  setup() { return initThing(this, { size: this.size }); }  // runs on every connect; the return value runs on disconnect
}

defineElement("sel-thing", Thing);
```

- `export`s are published as `ThemeJS["component-id"]` in the classic bundle and are real exports in `elements/<id>.js`.
- `setup()` runs every time the element is connected (also after being moved). Use `this.listen(target, type, handler)` for listeners, `this.addCleanup(fn)` for anything else, or return a dispose function. They run when the element is disconnected.
- `this.emit("thing:done", detail, { cancelable: true })` dispatches a bubbling event and returns `false` if a listener called `preventDefault()`.
- An element that only adds behaviour to markup the author wrote does **not** define `render()`; Lit then never touches its children.
- An element that draws something defines `render()` and, if part of its markup is authored, `static renderTarget = "[data-part]"` (a selector for the empty element it draws into). Authors keep that element empty.

## What you can import

```js
import { ThemeElement, defineElement, icon, prefersReducedMotion } from "lit";
import { html, render, nothing, repeat, classMap, styleMap, ifDefined, live, ref, when, keyed } from "lit";
import { fuzzyMatchCandidates } from "component:suggestions-list";   // another component's exports
```

`"lit"` and `"theme-element"` are the same object (Lit plus the base class). `unsafeHTML` is **not** exported on purpose; `icon(name, className, size, style)` draws the theme's own icon markup. `component:<id>` imports another component; the build orders components so dependencies come first.

Two helpers check values that come from data: `safeHref(url)` keeps http(s), mailto and relative links and turns anything else (`javascript:`, `data:`) into `#`; `safeIconName(name)` returns the name when it is only letters, digits and dashes, else an empty string. Use them for every link and icon name that is not written in the component itself.

The build turns these imports into the classic script (`theme.js`, `theme.bundle.js`, `window.ThemeLit`) and into real ES modules (`theme-lit.js`, `elements/<id>.js`, `elements/index.js`). Write the component once.

## Naming and API conventions

| Thing | Rule | Example |
|---|---|---|
| Tag | `sel-` + kebab-case | `sel-multiselect` |
| Attribute | kebab-case; booleans by presence | `max-kb`, `disabled` |
| Property | camelCase, same name | `maxKb` |
| Event | `thing:verb`, bubbling, data in `detail` | `board:change` |
| Public method | verb | `glow()`, `setSequence([2,1])` |
| Class names | existing BEM-ish names of the CSS | `header-panel__details` |
| State classes | `is-...` | `is-compact` |
| Hook for a part | `data-<component>-<part>` | `data-stepper-next` |

Do not name a property after a built-in `HTMLElement` member: `popover`, `title`, `hidden`, `id`, `lang`, `dir`, `style`, `inert`, `slot` and the like silently change behaviour. (A field called `popover` once turned into the string `"manual"`.)

## Rules that prevent the common bugs

1. **Clean up completely.** Anything you add outside the element (a sentinel node, an overlay in `<body>`, a document listener, a `ResizeObserver`) is removed on disconnect. The test for it is: remove the element, check nothing is left, add it again, check it works.
2. **Children must exist when the element connects.** The classic bundle defines elements on `DOMContentLoaded`, and module scripts run after parsing, so authored children are there. If you create an element in code, add its children before connecting it.
3. **Never `innerHTML` with data.** Use Lit templates, `textContent`, or build nodes. If you must accept markup from the caller, name it as trusted in the docs and keep it out of attributes.
4. **Do not re-render what the user is touching.** Lit keeps DOM between renders; use `repeat` with a key for lists.
5. **Measure with transitions off.** If you measure two states (full and compact), switch every transition off while measuring (see `.is-measuring` in the header panel), or the numbers are wrong by whatever is still animating.
6. **Be careful with feedback loops.** A state change that changes the page length can change the scroll position that caused the change. Make the page length independent of the state (the header panel holds the height it gives up as margin).
7. **Do not rely on hover alone.** Hover-only controls must also work with focus, and stay visible on touch (`@media (hover: none)`).
8. **Overlays go above stretched links.** A `.stretched-link` covers its whole row; anything clickable inside the row needs `position: relative; z-index: 2`.
9. **Async work belongs to the element.** A `fetch`, `FileReader`, timer or promise that can finish after the element is gone is cancelled on disconnect (`AbortController`, `reader.abort()`, `addCleanup`) and its late result is ignored. When a newer request can overtake an older one (typing, fast clicks), keep a request number and ignore every answer that is not the newest (see the mention autocomplete).
10. **Cancelable means honoured.** Fire a cancelable event only when `preventDefault()` really stops the action (`chat:delete`). Other events are notifications; rejection goes through `detail.waitUntil(promise)`.
11. **Do not hide native members.** A getter or method called `matches`, `closest`, `part`, `title` and so on breaks code that calls the native one (the icon runtime reads added nodes with `matches`). Name it after what it is (`matchingItems`).

## Styling

- Component CSS lives in the component's **CSS tab**, scoped by its own class names. Global tokens come from the theme's CSS variables; component-level knobs are `--component-*` variables with defaults, documented in a comment at the top.
- No colours or sizes hard-coded where a theme variable exists (`--bs-primary`, `--bs-border-radius`, ...).
- Demo-page widths and spacing are classes too (`.stat-block-demo`), never `style="max-width: ..."`.
- Glass look: use the same translucent white + blur recipe as the header panel so components look like one family, with the theme's `--glass-*` variables (below), never a fixed white.

## Light and dark mode

Every component must look right in both modes (Bootstrap's `data-bs-theme="light|dark"` on `<html>` or on any element). The rules:

1. **Colour only with variables.** Use Bootstrap's `--bs-*` variables (`--bs-body-bg`, `--bs-body-color`, `--bs-emphasis-color`, `--bs-border-color`, `--bs-primary`, ...) or the theme's own. They switch with the mode on their own. A hard-coded `#fff`, `white` or `rgba(255,255,255,…)` is only allowed when it is the same in both modes on purpose (white text on a brand-coloured button or on the gradient navbar); say so in a comment.
2. **Surfaces that differ per mode come from the theme's light / dark variables** (Tokens page, "Light / dark variables"; stored as `modeVars`, written to `theme.css` as `:root` and `[data-bs-theme="dark"]`). The glass set: `--glass-bg`, `--glass-bg-strong`, `--glass-stripe`, `--glass-stripe-strong`, `--glass-border`, `--glass-solid`, `--glass-shadow`, plus `--card-bg` and `--main-content-gradient`. Always give a fallback so a project that has not pulled the new theme still works: `background: var(--glass-bg, rgba(255, 255, 255, 0.5));`.
3. **A new colour that is not in that set** is added there (name, light value, dark value, a one-line note), not hard-coded in the component. A colour only one component needs is a `--component-*` knob whose default is such a variable, or a `[data-bs-theme="dark"] .thing { … }` block in the component's CSS tab, next to the light rule.
4. **Text on a tinted background** needs a light-mode and a dark-mode colour (see the tags: dark text in light mode, the lightened tag colour in dark mode).
5. **Always-dark areas** (the gradient navbar, a dark hero) keep their dark look with CSS variables on their own element (the navbar sets `--bs-navbar-*` to light text), **not** with `data-bs-theme="dark"` on a wrapper: dropdowns, popovers and panels inside it are children, inherit the attribute and then stay dark when the page is light. Use the attribute only on an area that contains no overlays, and say so in the HTML comment.
6. **Check both modes**: use the preview's Light/Dark switch before committing a component. `npm run audit:contrast` measures the text contrast of every component in dark and light mode, and `npm test` fails when a component has unreadable text in either mode (it checks the colours first, then the pixels the browser really paints behind the text, so a translucent surface is judged as it looks). It only measures text: borders, backgrounds and "looks odd" still need your eyes.

## The demo page

A component that is only a part of another (the chart components use one shared Chart.js loader) can be a **section** of it: in the library its `parent` is the other component's id (set it in `theme.json`; the sidebar lists it indented under the parent and the parent's preview shows the parent and every section). It changes nothing in what projects pull.


The HTML tab doubles as the preview and the documentation. Keep the real markup that people copy at the top, the demo scaffolding (extra buttons, a log paragraph) below it, and put the scripts that drive the scaffolding in a `//#region demo` block. The build strips those regions, so what ships is only the component.

## Testing

In the library, `npm test` builds the working theme exactly like a download, serves it, opens every component in Chromium and checks the behaviour twice: once from the classic bundle, once from the ES modules. Write the test for a new component the same way as the existing ones (`tests/components/`): open it with `studio.open(id, { mode })` (`startStudio()` in `tests/harness.js`), drive it like a person would (click, type, drag, press keys), and assert on the result and on `page.errors`. Add a case for hostile text (`<img src=x onerror=...>`) wherever data is shown, and a case that removes the element.

Before a version is committed the library links the built ES modules and refuses the commit for a script that does not parse, a missing import, a name imported from a component that does not export it, or components that import each other in a circle. Run `npm test` first: it runs the same checks.

## Converting existing code into a component

1. Find the markup, the styling and the script that belong together in the project. Decide what is **data** (attributes, JSON source, events) and what is project-specific (Firestore, Drive, routes): the project-specific part stays in the project and talks to the component through attributes, properties, methods and events.
2. If there is no behaviour, make it markup + CSS only.
3. Otherwise write `initX(el)` first (move the logic, add the dispose), then the element, then the Lit template for anything it draws.
4. Replace string-built HTML with templates; replace `style.x = ...` for static values with CSS classes.
5. Add the component in the library (or edit it there), write its change note and its test, run `npm test`, commit a version.
6. In the project, delete the old copy and use the built file (`sel-pull elements <id>`), so there is one source of truth.

## Where things live

| What | Where |
|---|---|
| Component source (html, css, js) | the theme (`data/themes/<id>/theme.json`), edited in the library app |
| Runtime (Lit + `ThemeElement`) | `runtime/` (bundled by `lib/lit-runtime.js`) |
| Import / export transform | `lib/jsmodule.js` |
| Build | `lib/build.js` |
| Tests | `tests/` |
| These guidelines, the `/sel-component` command and the other rules | the **Rules & guides** section of the library app (`data/rules/`), pulled with `sel-pull rules` |

Reference implementations: **header-panel** (position-based state, measuring, cleanup), **stat-block** (smallest element), **multiselect** and **stepper-wizard** (authored markup plus a Lit-drawn part), **upload-manager** (a self-created singleton drawn entirely with Lit), **board** (a full behaviour with drag and drop).
