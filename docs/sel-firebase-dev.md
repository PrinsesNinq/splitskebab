# Local development on the Firebase emulators

A Firebase project runs on this machine the way it runs in production, against local data: the Hosting emulator serves `public/` with the headers from `firebase.json`, Firestore enforces the project's real `firestore.rules`, and Auth swaps the Google popup for a fake account picker. Nothing reaches the live project, so you can sign in as anyone, break data and reset it, and debug with real pages (DevTools, the Chrome DevTools MCP, Playwright).

## Set it up

In a Firebase project (`firebase.json` and `.firebaserc` exist; otherwise run `firebase init` first):

```
node scripts/sel-pull.mjs firebase
npm install
```

A new project can do it in one go: `sel-pull init --firebase`. Needs the Firebase CLI (`npm install -g firebase-tools`) and Java.

`firebase` adds, and never overwrites what the project made its own:

| What | Where | Owned by |
|---|---|---|
| The generic scripts (start, seed runner, live pull, load, shared helpers) | `scripts/sel-dev/` | the library: generated, hashed in `sel.lock.json`, replaced by the next pull |
| The project's demo data and accounts | `scripts/dev-seed.mjs` (from a template, only when missing) | the project |
| One emulator per service the project uses, plus Auth and the UI (port 4001: 4000 is the library) | `firebase.json` → `emulators` (only when there is none) | the project |
| `npm run dev`, `dev:seed`, `dev:pull`, `dev:load` (the starter's `node scripts/serve.mjs` dev script is replaced; any other script of your own is kept) | `package.json` | the project |
| `firebase-admin` as a dev dependency | `package.json` | the project |
| `.emulator/`, `*-debug.log` and `firebase.dev.json` | `.gitignore` | the project |

Then two edits in the app itself (they are the project's code, so `sel-pull` prints them instead of making them):

1. **Point the app at the emulators on this machine**, where it initialises Firebase (the ports are the ones in `firebase.json`):

   ```js
   import { getFirestore, connectFirestoreEmulator } from ".../firebase-firestore.js";
   import { getAuth, connectAuthEmulator } from ".../firebase-auth.js";

   export const db = getFirestore(app);
   export const auth = getAuth(app);
   if (["localhost", "127.0.0.1"].includes(location.hostname)) {
     connectFirestoreEmulator(db, "127.0.0.1", 8080);
     connectAuthEmulator(auth, "http://127.0.0.1:9099");
   }
   ```

   On `localhost` the app then can never read or write production data. The Auth emulator shows a banner at the bottom of the page as a reminder.
2. **Skip the service worker on this machine**: a cached shell hides the edit you just made. Unregister one left from an earlier session:

   ```js
   if (["localhost", "127.0.0.1"].includes(location.hostname)) {
     navigator.serviceWorker.getRegistrations().then((regs) => regs.forEach((r) => r.unregister()));
   } else navigator.serviceWorker.register("/sw.js");
   ```

### An enforced Content-Security-Policy

A project that sets a `Content-Security-Policy` header in `firebase.json` (the live site should) would block the page's own connections to the emulators, and the live policy must not allow them. `npm run dev` therefore starts the emulators with `firebase.dev.json`: a copy of `firebase.json` whose policy also allows the emulator addresses in `connect-src` and `frame-src`, and nothing else. It is rewritten at every start and git-ignored (`scripts/sel-dev/dev-config.mjs` makes it), `firebase.json` itself is never changed, and a project without a policy gets no copy.

### Browsers must not cache what the emulator serves

The Hosting emulator ignores the `headers` of `firebase.json` (checked on firebase-tools 15: not even a catch-all rule is applied), so it sends no `Cache-Control` and a browser keeps every file for a long time. After an edit, or on an address another project used before (every Firebase project defaults to `localhost:5000`), the page then runs old scripts against new ones and fails with errors such as "the requested module does not provide an export named ...", which an ordinary reload does not clear. `npm run dev` therefore runs the Hosting emulator a few thousand ports higher (in the same `firebase.dev.json` copy) and puts a small proxy (`scripts/sel-dev/dev-proxy.mjs`) on the address the app is opened at: it forwards everything and answers `Cache-Control: no-store`, without ETag or Last-Modified. The address you open does not change. If that port is taken (another project's emulators), `npm run dev` says so and stops instead of starting half. A browser that cached files before this existed needs one hard reload (Ctrl+Shift+R).

## Use it

```
npm run dev        # start; the first run fills the database from scripts/dev-seed.mjs. Ctrl+C stops and keeps the data
npm run dev:seed   # reset to the demo data
npm run dev:pull   # copy the LIVE database and accounts in (read-only on production)
npm run dev:load   # reload the last live copy without reading production again
npm run dev:load -- .emulator/backup-before-seed-<time>.json   # put back what a seed or load replaced
```

- **App**: http://localhost:5000. Sign in by picking an account.
- **Emulator UI**: http://localhost:4001. Browse and edit the local data and accounts, and see in the Firestore requests which rule allowed or denied each call: the quickest way to debug a rules error.
- The local data is saved to `.emulator/data` when you stop with Ctrl+C and comes back on the next `npm run dev`.
- **A safety copy before every replacement.** `dev:seed` and `dev:load` replace the local data. When the emulators hold anything, all of it (every document, and the accounts that have an email address) is first saved to `.emulator/backup-before-seed-<time>.json` or `backup-before-load-<time>.json`, in the same format as a live copy, so `npm run dev:load -- <that file>` puts it back. If the copy cannot be made (disk full, unreadable emulator), nothing is wiped; `--no-backup` skips the copy when you do not want it. After a successful run only the newest copy of each kind is kept. After a failed run the copy is kept for good, renamed `...failed.json`, and the message names it and the command to restore it. Accounts without an email address (anonymous sign-ins) and passwords made by hand in the Emulator UI are not in the copy.
- **`npm run users:import` is add-only, also while the app is in use**: it sends the group lists, the admins and a person's groups as Firestore array unions of just the additions, inside a transaction per document, and sets a name only while the person has none. Whatever the app (or another admin) added between the dry run and the write stays. It does nothing without `--apply`; a document that fails is reported, and running it again finishes the rest.
- **One replacement at a time.** A lock file (`.emulator/replace.lock`) refuses a second `dev:seed`/`dev:load` while one runs, and says which. The lock of a process that is gone is taken over by itself.

## The demo data (`scripts/dev-seed.mjs`)

The project's own file: a function that returns `{ docs, people }`.

```js
export default function seed({ Timestamp, GeoPoint, daysAgo, ref }) {
  const people = [
    { email: "admin@example.com", displayName: "Admin", note: "admin", uid: "admin" },
    { email: "user@example.com", displayName: "User", note: "a normal user", uid: "user" },
  ];
  const docs = [
    { path: "settings/admins", data: { emails: ["admin@example.com"] } },
    { path: "items/first", data: { title: "First item", owner: "user", createdAt: daysAgo(3) } },
  ];
  return { docs, people };
}
```

- `docs` are written as they are (the rules do not apply to the seed). Paths can go as deep as the data does (`apps/x/reviews/y`).
- `people` become local accounts in the sign-in picker. `note` says what an account is for and is printed after a seed. `provider` is `google.com` (the default) or `password` (password: `password`). Give a `uid` when the data refers to people by uid.
- Make it **small and known**, and cover every case worth checking by hand: each role, data only some people may see, someone the app must refuse (a wrong email domain), empty states, long texts.
- Data the app normally derives itself (an index, a counter) belongs in the seed too, or a page that reads it is empty until someone triggers the rebuild.

## A copy of the live data

`npm run dev:pull` reads the whole live Firestore database and the Auth accounts, saves them to `.emulator/live-copy.json` and loads them into the emulators. Every live account becomes a local one with its own uid, so signing in as a specific person shows exactly what they see: the way to reproduce "it doesn't work for me".

- **Read-only on production**: the reading process has no write call at all; the loading runs in a separate process that only talks to the emulators.
- The emulators may be stopped while you pull: the copy is then loaded by the next `npm run dev` (instead of the data saved at the last stop). With them running it is loaded straight away; refresh the app.
- It uses your own Google login, no key file. Once per machine: `gcloud auth application-default login`, with an account that can read the project.
- Without access to the Auth accounts it still works: it then makes an account for every email address it finds in the data.
- **What the Auth accounts carry over**: uid, email, display name, photo, the sign-in provider (one: Google, or email + password), whether the email is verified, whether the account is disabled, the phone number and the custom claims (the `admin: true` kind). A copy made by an older sel-pull has none of the last four: loading it keeps the old behaviour (every email counts as verified).
- **What is not copied**: passwords and password hashes (an email + password account gets the password `password`), further sign-in providers, multi-factor settings, sign-in dates, and accounts without an email address. Firestore values keep their type exactly (timestamps, geopoints, references, bytes, NaN and infinity); an unreadable value stops the load before anything is changed.
- **A copy of production loads even when production holds odd accounts**: several accounts with one email, an over-long uid, an invalid phone number or photo URL, or claims over the limit are left out of the local copy (or only the offending field) with a warning, instead of making the whole copy unloadable. A seed (`scripts/dev-seed.mjs`) is held to the emulator's limits and is refused instead.
- **A safe copy file**: it is written to a temporary file and renamed, so a pull that fails halfway keeps the last good `live-copy.json`. The file says `version: 2`; a copy from before that (no `version`) still loads. Loading checks the whole file first and wipes the emulators only when it is usable.
- `.emulator/` is git-ignored. `live-copy.json`, and the saved data after a pull, are **production data**: keep them on this machine.
- Firestore and Auth only. Files in Cloud Storage are not copied.

## When something does not work

- **"The local database could not be checked"** (at the start of `npm run dev`): the emulator did not give a clear answer, so it was not filled with the demo data. Run `npm run dev:seed` when you are sure it can be reset.
- **"The local emulator data was cleared and is INCOMPLETE"**: a seed or load failed after the wipe. If the message names a safety copy, `npm run dev:load -- <that file>` puts your previous data back; otherwise run `npm run dev:seed` or `npm run dev:load` again. A broken seed file or copy is refused before the wipe and leaves the data as it was.
- **"Another replacement of the local data is running"**: wait for the other `dev:seed`/`dev:load`. If none is running, delete `.emulator/replace.lock`.
- **"The seed function must return { docs: [...], people: [...] }"**: `scripts/dev-seed.mjs` returned nothing (a missing `return`) or no `docs` list. Return the lists; `docs: []` is an intentionally empty database.
- **"The current local data could not be saved first"**: the safety copy failed, so nothing was changed. Fix the cause (disk space), or run again with `--no-backup`.
- **"The emulators aren't running"**: start them with `npm run dev` (in another terminal).
- **"Could not run the Firebase CLI"** or a Java error: install `firebase-tools` globally, and Java.
- **A port is in use**: change it in `firebase.json` → `emulators` and in the app's `connect...Emulator` calls.
- **The app still shows live data**: the emulator switch is missing where Firebase is initialised, or the page is not opened on `localhost`.
- **"No Google login for scripts"**: `gcloud auth application-default login`.
- **"changed locally: scripts/sel-dev/..."**: a generated script was edited. Put the change in the library (`public/client/firebase-dev/`), or `--force` to take the library's copy. The project's data belongs in `scripts/dev-seed.mjs`.
