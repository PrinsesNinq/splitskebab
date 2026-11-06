---
paths:
  - "tests/**"
  - "scripts/**"
  - "package.json"
---

# Testing

> Starting point pulled from the Shared Element Library. Edit freely and fill in the project's real commands.

A feature or a bug fix is not finished until a test that would have caught it exists and passes. Add it in the same change.

## Layers

- **Unit**: pure logic (escaping, URL checks, dates, parsers). Fast; runs on every commit.
- **Browser (end to end)**: anything a person sees or clicks, in a real browser against fakes or a local emulator, served with the production security headers so a CSP violation fails the test.
- **Rules / permissions**: every server-side permission, negative cases first (uninvited user, forged field, revoked right).
- **Page conventions**: integrity hashes on CDN tags, no inline scripts or handlers, every fetched host allowed by the CSP.

## Conventions

- A test name is a sentence describing behaviour. Failures carry the detail needed to diagnose them.
- **No fixed sleeps.** Wait for a visible result, or for the app to go quiet (a `settle` helper that waits for network, animations and fake backends).
- Drive the page like a person: click, type, drag, press keys; hover before clicking hover-only controls. Do not reach into internals except by importing a module's exports.
- Cover the hostile case wherever stored data is shown, and test cleanup: remove the element or page, check nothing is left behind, bring it back, check it works.
- Time-dependent code is tested across several time zones and across DST and year boundaries.
- Extend the fakes or the harness when a test needs new behaviour instead of working around it.
- A blocking child process (`spawnSync`) freezes a fake server running in the same process: start the child asynchronously and wait for it.
- In a browser test scroll instantly (`scrollTo({ top, behavior: "instant" })`): smooth scrolling (Bootstrap turns it on) lags behind a scroll loop and makes the test flaky.
- On Windows a folder stays locked while a child process has it as its working directory: wait for the process to exit before deleting the folder.
- A test never writes to the real data folders: use a temporary copy, and clean it up in `finally`.

## Gates

- Pre-commit: lint + unit. Before a deploy: everything. A failing gate is fixed, not bypassed; an emergency bypass is only used when the owner asks for it.
- Do not weaken or delete a test to get green: fix the cause, or explain why the test was wrong.
- Report what you actually ran. Never say tests pass without running them; quote the failing output when they fail.
