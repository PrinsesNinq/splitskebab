# Getting started with the Shared Element Library

The Shared Element Library (sel) is the one place where reusable UI and project rules are built: a Bootstrap theme, components (Lit custom elements `<sel-...>` and plain CSS components), and the rules and guides that keep projects consistent. Projects **pull** what they use with one small script, `sel-pull`; they never keep their own copy.

## What a project gets

| From the library | Lands in the project at | Pulled by |
|---|---|---|
| Bootstrap theme: the base CSS, Bootstrap's JS, icon fonts, plus the CSS of the components the project uses (one `theme.css`) | `public/vendor/sel/theme/` | `init`, `sync` |
| Components' scripts (the `<sel-...>` elements, as ES modules) | `public/vendor/sel/elements/` | `sync`, `elements` |
| Claude rules, commands and guides | `.claude/` and `docs/` | `init`, `rules` |
| `CLAUDE.md` starting point | `CLAUDE.md` (only when there is none) | `init` |
| A local dev environment on the Firebase emulators (Firebase projects) | `scripts/sel-dev/`, plus `scripts/dev-seed.mjs` for the project's own demo data | `firebase`, `init --firebase` |
| What was pulled, with versions and hashes | `sel.lock.json` (commit it) | every pull |

Only **what the project uses** is pulled: `sync` scans the project's markup and scripts for `<sel-...>` elements and for the CSS classes only a component owns, pulls those components' scripts, and joins just their CSS to the theme. Components nobody uses stay in the library.

## 1. Start the library

In the library project: `npm start` (http://localhost:4000). The app shows what is committed; projects only ever see **committed versions**.

## 2. Start a new project

### With the wizard (recommended): `sel new`

Install the `sel` command once (from the library's folder; it has no dependencies and fetches the newest scripts from the running library every time, so it never needs reinstalling):

```
npm install -g ./cli
```

Then, from the folder the new project's folder goes in:

```
sel new
```

`sel new --no-firebase`, `sel new --dry-run` and the other options below work the same. Inside a project, `sel sync`, `sel check` and `sel status` are the sel-pull commands (they run the project's own `scripts/sel-pull.mjs`); `sel help` lists them all.

Without installing anything, the same wizard in one line, in PowerShell:

```
irm http://localhost:4000/client/new.ps1 | iex
```

bash / zsh:

```
curl -s http://localhost:4000/client/new.sh | sh
```

(Options for the wizard: `& ([scriptblock]::Create((irm http://localhost:4000/client/new.ps1))) --no-firebase` in PowerShell, `... | sh -s -- --no-firebase` in bash. Or download it: `curl -o sel-new.mjs http://localhost:4000/client/sel-new.mjs`, then `node sel-new.mjs`.) It asks for the app's name and folder, and whether to set up **Firebase (the default)**:

- **With Firebase**: a new or an existing Firebase project (the ID and the Firestore region; a new project goes under the Aperam organisation, `--org <id>` or `--org none` to change that), the email domain that may sign in and the first admin. It then creates the project, registers the web app and writes its config into the starter, which gets its **Firebase layer** on top: a Google sign-in page for your domain, every page behind it, a first-admin setup and a live Users tab in Settings (everyone who signed in, their role, adding someone, groups on the drag board, all from Firestore), and demo data, creates the Firestore database, writes `firebase.json` and the security rules, sets up `npm run dev` on the emulators (`docs/sel-firebase-dev.md`), and deploys.
  - **An existing project keeps its security rules.** Firebase has one rule set per project and a deploy replaces all of it, so the starter's rules (which only know `settings/`, `users/` and `userProfiles/`) would close every other collection, for every app on that project. With `--existing` the wizard deploys hosting only, leaves `firebase.json` without a `firestore` block (a plain `firebase deploy` cannot touch the rules), and writes the starter's rules to `firestore.rules.proposed`. Merge them into the project's own rules (Firebase console > Firestore > Rules), or run `sel new --existing --deploy-rules` during the set-up, or later at any time `sel firebase-rules` (it only shows the difference; `sel firebase-rules --deploy` replaces them): it reads the rules deployed now (with your own Google login), saves them as `firestore.rules.live-backup`, shows the lines that would change, asks you to type the project id, and only then deploys them. Until the starter's rules are in place, the sign-in and Settings pages are denied by Firestore. One step has no API: it opens the Firebase console to turn on Google sign-in, and waits for you.
- **Without Firebase** (answer no, or `--no-firebase`): the Default starter, plain pages and a small dev server.

It shows the plan before it creates anything (`--dry-run` shows the commands too). The folder: Enter in an empty folder sets the project up right there, elsewhere it makes a folder named after the app. If a step fails, run `sel new` again in the project folder (or with `--dir <folder>`): it continues where it stopped and never creates a second project. Needs the Firebase CLI (logged in) and Java for Firebase; it remembers the region and domain for next time. Every question is also an option (`--name`, `--project`, `--org`, `--region`, `--domain`, `--admin`, `--existing`, `--yes`); the header of the script lists them.

### By hand: `sel-pull init`

In the new project's root:

One line (the script is piped into Node and installs itself as `scripts/sel-pull.mjs`):

```
curl -s http://localhost:4000/client/sel-pull.mjs | node --input-type=module - init
```

In Windows PowerShell:

```
(irm http://localhost:4000/client/sel-pull.mjs) | node --input-type=module - init
```

Or in two steps, when you want to read the script first:

```
mkdir -p scripts
curl -o scripts/sel-pull.mjs http://localhost:4000/client/sel-pull.mjs
node scripts/sel-pull.mjs init
```

`init` does this, and never overwrites anything the project made its own:

1. Pulls the rule sets `base` (generic code-style, testing and security rules: starting points to adapt) and `sel` (the component workflow, the `/sel-component` command, this guide) into `.claude/` and `docs/`.
2. Creates `CLAUDE.md` from the template when there is none.
3. Adds the npm scripts `pull:elements`, `pull:rules`, `sel:sync`, `sel:check` and `sel:check:soft` to `package.json`.
4. Stops ignoring `.claude/` in `.gitignore` (only `settings.local.json` and lock files stay out), so the rules are shared.
5. Pulls the Bootstrap theme and whatever components the project already uses (a new project: the base theme only).
6. Adds a starting point to develop on right away, when there is no `public/index.html`: a **starter theme** of the library. The default one has the gradient navbar (notification bell, an account menu with a dark mode switch), the main container on the theme background, soft page transitions, and a Settings page with tabs, a sortable users table and a drag board: `public/index.html`, `public/settings.html`, `public/css/app.css`, `public/js/app.js`, `public/js/settings.js`, `public/js/theme-mode.js`, the logo images and `scripts/serve.mjs` with an `npm run dev` script (http://localhost:3000, this computer only). Starter themes are edited in the library under **Starter themes** (code editor, live preview, "+ New variant") and ship in committed versions like the components; pick another with `init --starter <id>` (sel new asks only when there are variants). A starter can have a **Firebase layer**: the files a project set up with Firebase gets on top (`init --firebase`, which sel new uses), edited in the library with the starter's Plain / Firebase layer switch. Every starter is an installable app (PWA): `manifest.json`, `images/app-icon.svg`, `sw.js` and `js/pwa.js`, which shows an Install button in the navbar when the browser offers installing. The project owns the files afterwards: they are never overwritten or locked.

Skip the theme with `init --no-theme` (a project that has its own Bootstrap setup) and the starter theme with `init --no-starter`. Pull other rule sets with `init <set> <set>`. A **Firebase** project adds `--firebase`: `npm run dev` then runs the whole app on the Firebase emulators with demo data and fake sign-in, and `npm run dev:pull` copies the live data in to debug with (see `docs/sel-firebase-dev.md`).

Then: fill in `CLAUDE.md`, adapt `.claude/rules/code-style.md`, `testing.md`, `security.md` and `code-review.md` to the project, and add to the pages:

```html
<link rel="stylesheet" href="vendor/sel/theme/theme.css">
<script src="vendor/sel/theme/bootstrap.bundle.min.js"></script>
<script type="module">import "./vendor/sel/elements/header-panel.js";</script>   <!-- one line per element you use -->
```

## 3. Use components

Write the component's markup (its HTML tab in the library has the markup, attributes and events), then run `npm run sel:sync`. It finds the `<sel-...>` tags and component classes in your files and pulls exactly those (and drops what is no longer used). `--also id,id` keeps a component before any markup uses it; `npm run pull:elements -- <id>` pulls one by name.

Pulled files are **generated**: never edit them. `sel:check` reports a hand-edited file and a pull refuses to overwrite it without `--force`.

### The company's users and groups

The library keeps the people and groups your apps share once, on its **Users & groups** page (a theme setting, so a change ships in a committed version). They are staff data (emails, groups, who is an admin), so they are **never** put in `public/`, which Hosting serves to anyone:

- `node scripts/sel-pull.mjs users` writes them to `.sel/directory.json` (git-ignored) and prints how many.
- In a Firebase project, `npm run users:import` (brought by `sel-pull firebase`) adds them to Firestore with your own Google login (`gcloud auth application-default login`). It is a **dry run** until you add `--apply`, it only **adds** (nobody is removed, no group is taken away, existing names stay), and the directory's admins become admins only with `--admins`. `--emulator` targets the local emulators; `npm run dev:seed` includes them too.
- Keep the list up to date in the library, commit a version, and run both commands again: new apps never need the colleagues typed in.

## 4. Stay current

```
npm run sel:check          # behind? what changed, per component you use, since your version? (exit 2 if behind)
npm run sel:sync           # update the components and theme
npm run pull:rules         # update the rules you pulled
```

`npm run check` ends with a soft `sel:check`: a reminder that never fails the build and says nothing when the library is not running. Read the notes, update, run the project's checks, deploy. A breaking change is marked in its note.

### What sel-pull promises about your files

- **Only one sel-pull runs in a project at a time.** A second one is refused while the first runs (a lock in the system's temp folder, not in your project). A lock left by a process that is gone, an unfinished lock file, or a lock older than six hours (a reused process id) is cleared by itself. If the message names a lock that is wrong and you are sure no sel-pull runs, add `--break-lock`.
- **Your own work is never replaced silently.** A pull replaces a file only when sel-pull wrote it and nobody edited it, or it is identical to the new content, or it is one of sel-pull's own generated files. A file of your own at the same path stops the command and nothing is changed (exit 2): move it, or pass `--force`. An edited pulled file is not removed either: it is kept, reported, and stays listed until you remove it (or pass `--force`).
- **Everything is downloaded and checked before the first file is written**, files are replaced one by one through a temporary file with the lockfile last, and a failed write puts the files already written back (anything that could not be put back is listed). If a file changes while the command runs, it stops before writing.
- **A killed process or a power cut in the middle of the writes is recovered.** Before the first file is touched, sel-pull saves a journal (the file list and a copy of every original) in the system's temp folder. The next command that writes puts the originals back (a file you changed since stays as it is and is listed), says what it did and stops: run it again. The one limit: if the temp folder was cleared by a reboot, only git, `sel-pull check` and pulling again (`--force` for what check reports as changed) are left.
- **`sync` says what it could not read.** A line `Not scanned: N files (...)` lists source files over 1 MB or minified (`*.min.js`), which the scan skips; a component only they use is not seen (name it with `--only` / `--also`). When such files exist and `sync` removes something as unused, it says so.
- **Options are strict.** An unknown option, an option that does not belong to that command, a stray argument, a missing value or `--force false` is an error before anything happens; `--key=value` works; `--dry-run` is not supported (use `check`).
- `sel-pull self-update` installs the library's newest script only after it has parsed and started; the hash of the script is recorded in `sel.lock.json` and shown by `sel-pull status`. The old script stays as `scripts/sel-pull.mjs.prev` (added to `.gitignore` when the project has one).

## 5. Change a component (in the library)

1. Edit it in the library app (or its `theme.json`). The app flags uncommitted changes everywhere (top bar, banner, sidebar markers).
2. Write a **change note** for each changed component (its History tab): what changed, and whether it breaks existing markup. A version cannot be committed while a changed component has no note.
3. Run the library's tests, commit a version (patch = fix, minor = addition, major = breaking), then update the projects as in step 4.

Never fix a component inside a project: the fix would be overwritten by the next pull and the other projects would not get it.

## 6. Rules and guides

**Rules & guides** in the library edits the markdown files projects pull: rules (`.claude/rules/`), commands (`.claude/commands/`), guides, templates. Each belongs to one or more **sets**. **Saving only edits the working copy**; a separate **Commit** (a note is required) publishes every changed file as its next **revision**, so a stray save never reaches a project. The bar at the top lists the new, modified and deleted files, and a dot in the sidebar tells you something is waiting. A file edited outside the app (an editor, git) is simply a modified file until it is committed. You can **discard** a file's changes back to its committed content. Projects only pull committed revisions (`sel-pull rules --working` pulls the uncommitted copies, to try something). All committed revisions are kept: open a file's History to **compare** an older revision with the editor, or **restore** it (it lands in the editor; save and commit it to make it the newest, nothing is lost). Revisions made before the library started keeping content show "content not kept".

A pulled rule file you edit in the project is kept: a pull will not overwrite it without `--force`. Project-specific rules (the project's own `code-style.md` etc.) are simply local files.

## The hosted library (no `npm start` needed)

The library is also published to a Firebase project (`firebase://sel-library-d6ap`), behind a Google sign-in: only @aperam.com accounts on the developers list can read it.

1. Install `sel` once (clone the repository, `npm install -g ./cli`).
2. `sel login` and sign in with your @aperam.com Google account in the browser. This also makes the hosted library your default, so a plain `sel new` or `sel sync` uses it. (A project's `sel.lock.json` and `--library` / `SEL_LIBRARY` still win.)
3. Not on the list? The command tells you which address it saw: ask an admin to add it (`node scripts/hosted.js grant developers <address>` in the library project).

`sel logout` forgets the sign-in. Only committed versions are hosted: `--version working` and the library's editor need the local library (`npm start`). The sign-in is kept in `~/.sel/credentials.json` (readable by you only); never put it in a project.
## Commands

| Command | What it does |
|---|---|
| `init [set...] [--no-theme] [--firebase]` | set up a project: rules, `CLAUDE.md`, scripts, `.gitignore`, theme (and the Firebase dev environment) |
| `firebase` | the local dev environment on the Firebase emulators: `npm run dev`, `dev:seed`, `dev:pull`, `dev:load` (`docs/sel-firebase-dev.md`) |
| `sync [--also id,id] [--only id,id] [--no-theme]` | pull what the project uses (components and theme CSS) and drop the rest. `--only` names the components a project has adopted so far (remembered in the lockfile; `--only all` clears it). A component the project's scripts import (`import ".../elements/modal.js"`) counts as used even when it is not on that list, and joins it; the generated `scripts/sel-pull.mjs` and `scripts/sel-dev/` are not read as project code. `--no-theme` leaves the project's own Bootstrap alone and writes just the used components' CSS to `components.css` |
| `elements [id...]` | pull components by name, or refresh the ones already pulled. Named components join the adopted list (`only`) when the project keeps one. A pull that would remove an element the code still imports stops and names it (`--force` removes it anyway) |
| `rules [set|path...]` | pull rule sets or files, or refresh the ones already pulled |
| `update` | the daily command: self-update, then sync, rules and firebase (only what the project has), with one summary line per step. Stops at the first failure `sel update --all [folder ...]` does it for every sel project under the folders you name (default: here), one after the other, asking you to type yes first (`--yes` skips the question, `--list` only lists, `--hosted` moves them all to the hosted library); one project failing does not stop the others, a cancelled run does. |
| `plan [sync|elements|rules|firebase|users]` | what that command would add, replace, keep or remove, and which of your files would stop it, without writing anything (also `--plan` on the command itself). Exit 2 when a real run would stop or keep a file |
| `changes [--from x.y.z]` | the change notes of the components you use since the version you pulled, oldest first; notes that mention a break are marked |
| `doctor` | what could be wrong (library, script version, a pulled version the library deleted, edited files, a stuck lock or recovery journal, Firebase CLI, Java, firebase-admin), with the fix next to each. Changes nothing |
| `components [word] [--json]` | what the library offers: with no word, EVERY component with its tag or main class and the first sentence of its own description, grouped; a word filters on name, group, tag, class or description. Needs no project; this is how a person or an agent finds the component that fits before writing UI |
| `component <name> [--html] [--full] [--json]` | how to use one component: tag, classes, the import line, an example of the markup (the library's own preview) and what the component says about itself (attributes, events, behaviour). `--html` prints only the markup |
| `report [--remove]` | tell the hosted library which components this project uses: one record per project and developer (the project name, the components with their versions, who reported and when; no paths). `sel sync` and `sel elements` do it by themselves against the hosted library, printing one line, and a failure never fails the pull; `--no-report` or `SEL_NO_REPORT=1` turns it off. `--remove` deletes your own record. The library's editor shows it under Usage, so a breaking change can name the projects it reaches |
| `firebase-rules [--deploy]` | for an existing Firebase project: compare `firestore.rules.proposed` (the starter's rules) with the rules deployed in the project and show every changed line. `--deploy` saves the deployed rules to `firestore.rules.live-backup`, asks you to type the project id (`--yes` skips the question, for a script) and deploys only the Firestore rules. Needs `gcloud auth application-default login` and the Firebase CLI |
| `propose [component...]` | write up the edits you made to pulled files as a proposal for the library: a diff against the library's file (in the version you pulled), the edited file and a short explanation, in `.sel/proposals/<time>/` (git-ignored). Then make the same change in the component in the library, commit a version, and `sel sync --force` takes the library's file in place of your edit. Nothing else in the project changes |
| `check [--soft]` | current? what changed? Breaking notes for components the project uses come first, with the project files that use them |
| `diff [--component <id>] [--full]` | what an update would change: the change notes and a compact diff of the pulled files against the library's newest. Writes nothing |
| `release [<version>] [--plan] [--yes] [--commit] [--project p] [--app slug] [--allow-long] [--prune\|--no-prune]` | push this app's `CHANGELOG.md` to the Aperam App Store ("What's new"); with a version it first turns the `## [Unreleased]` bullets into `## [<version>] - <today>` and bumps `package.json`. It shows what would change and asks before writing. Needs no script in the project and no key file: sign in once with `gcloud auth application-default login` (an account with the Cloud Datastore User role on the App Store project), or keep a service account key as `service-account-appstore.json`. Refuses a release of more than 12 notes or 2500 characters (`--allow-long`) |
| `search "<need>" [--limit n] [--json]` | the components that best fit a need in free words, ranked. Needs no project; `components` lists everything |
| `status` | what `sel.lock.json` says |
| `self-update` | replace `sel-pull.mjs` with the library's newest |

A library can set a minimum for `scripts/sel-pull.mjs` (`client/compat.json`): an older script still runs `check`, `doctor` and `self-update`, but a command that writes stops with "run sel self-update", and nothing is changed.

Options: `--library <url>` (default http://localhost:4000), `--version latest|x.y.z` (`working` pulls the library's uncommitted copy: for trying things, never for what you deploy), `--out <folder>` (it must be inside the project: a folder outside it, also through a link, is refused before anything is written, so that an interrupted pull can always be put back), `--force`.

Good to know: a pull writes only what changes (a file that already holds the new bytes keeps its modification time, so a file watcher stays quiet); the library's compatibility policy must be readable (only a missing `client/compat.json` means no minimum, any other failure stops a write); `--plan` works on `sync`, `elements`, `rules`, `firebase` and `users` and is refused on any other command; `sel update` stops at a step that fails or is cancelled and exits with that step's code.

## When something does not work

- **"library is not reachable"**: start it (`npm start` in the library project).
- **"changed locally"**: a generated file was edited. Put the change in the library, or `--force` to discard the edit.
- **A component does not appear in `sync`**: it is found by its `<sel-...>` tag or a class only it owns, in `.html`, `.js`, `.ts`, `.jsx`, `.tsx`, `.vue`, `.svelte` or `.php` files outside `node_modules` and the pulled folder. Use `--also` for the rest.
