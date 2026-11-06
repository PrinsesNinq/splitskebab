# Shared Element Library: using it

The Shared Element Library (sel) is the one place reusable UI is built. Projects pull the built result; they do not keep their own copy.

- **A new project**: `docs/sel-getting-started.md` (`sel-pull init`, then `sel-pull sync`).
- **Before you build any UI (a page, a form, a list, a chart, a dialog)**: ask the library what it already has. Run `sel components` (no word): it lists EVERY component, grouped, with its tag or class and a one-line description, so you choose from the full list instead of guessing a name (add a word only to narrow it, e.g. `sel components upload`; `sel search "a list I can sort"` ranks the components that fit a need in your own words); `sel component <name>` prints its tag, classes, import, example markup, attributes and events (`--html` for the markup only). Use a library component instead of writing your own; if none fits, say so before you build something new (a new component is built in the library, see below).
- **Building or converting a component**: read `docs/sel-component-authoring.md` first (the `/sel-component` command does, in a project that pulled it). It holds the rules, the definition of done and the bugs to avoid. It is not needed to *use* a component.

## Using the library in a project

- Pulled files live in `public/vendor/sel/` (or the `out` folder in `sel.lock.json`). They are **generated: never edit them**. A change goes into the library, a version is committed there, and the project pulls it.
- `node scripts/sel-pull.mjs elements <component...>` pulls components (and what they import); with no names it refreshes what the lockfile lists. `sync` pulls what the project uses. `sel update` does all of it in order (self-update, sync, rules, firebase); `sel plan` shows what a sync would change without writing; `sel doctor` says what is wrong; `sel changes` lists the change notes since the pulled version; `check` says whether the project is current and lists what changed, per component, since the pulled version. `self-update` refreshes the script itself. Commit `sel.lock.json` with the pulled files.
- A pull never deletes a pulled element the project's own code still imports. `sync` treats every `.../elements/<id>.js` import as use (and adds it to the adopted list, `only`), `elements <names>` adds the names to that list, and an `elements` call that would drop an imported element stops and says which one (`--force` removes it anyway). Import a component by its pulled path and it stays.
- Use a component by importing its module (`import "../vendor/sel/elements/header-panel.js"`, which defines the element) and writing its tag (`<sel-header-panel class="header-panel">`). Its CSS comes with the theme (`theme.css`); a project that keeps its own theme pulls just the components' CSS with `sync --no-theme` (`components.css`).
- Before pulling a new version, read what changed for the components you use (`sel-pull check` prints it; the library's History tab and `CHANGELOG.md` have the full history). A breaking change is called out in the note; update the markup and imports in the same change, then run the project's checks.
- Pull from a **committed** version in anything that is deployed. `--version working` (the library's uncommitted copy) is only for trying something.

On a page, with ES modules: `<script type="module">import "./vendor/sel/elements/board.js";</script>` per element (or `elements/index.js` for all). Without modules: `theme.bundle.js` (everything) after `theme.min.css`. `elements/index.js` also loads the icon runtime (`window.ThemeIcons`).

## Page transitions and soft navigation

- Give the navbar (anything identical on every page) the class `page-transition-static`. It stands still while the page changes, and it is what brings the page-transitions CSS into `theme.css` with `sel-pull sync`: without it there is no transition.
- Soft navigation (the Default starter has it): wrap each page's own markup in `<div id="page-content">`, put `<sel-soft-nav></sel-soft-nav>` once on every page outside it, import `elements/page-transitions.js`. Links between the site's pages then swap only `#page-content`.
- Inside `#page-content`, put module code in a file (`<script type="module" src="js/page.js">`), not inline: the browser gives no event for an inline module, so `soft-nav:load` can fire before it has finished. Page scripts run again after every swap; shared scripts run once (re-run per-page work on `soft-nav:load`, stop timers with `onPageLeave(fn)`).
- Something outside the content that differs per page (a sub page's back-link brand) gets an `id` and `data-soft-nav-replace`. Opt a link out with `data-soft-nav="off"`, a page with `exclude="login.html"`.
- Don't write your own soft navigation in a project: improve `<sel-soft-nav>` in the library so every project gets the fix.

## Changing or adding a component (in the library)

1. Make the change in the library (its app, or `theme.json` through `lib/store.js`).
2. Write a **change note** for the component (its History tab, or `store.addChangeNote`): what changed, and say clearly if it breaks existing markup. The library refuses to commit a version while a changed component has no note, and also when the built scripts do not link (a missing import or export, a circle).
3. Add or extend its test, run `npm test`, commit a version (patch for a fix, minor for an addition, major for a breaking change; before 1.0 a breaking change is a minor bump).
4. In each project: `sel-pull elements`, project checks, deploy.

Whenever a component or any Bootstrap component or theme setting is edited in the library, tell the user a new version has to be committed. Rule and guide files (Rules & guides) have their own, separate commit: when one is edited, tell the user a rules commit is needed.
