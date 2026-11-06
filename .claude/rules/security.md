---
paths:
  - "src/**"
  - "public/**"
  - "firebase.json"
  - "firestore.rules"
  - "scripts/**"
---

# Security

> Starting point pulled from the Shared Element Library. Edit freely: describe the project's real permission model and secrets below.

## Where enforcement lives

- Name the authority (server rules, API, database policies). Anything in the browser is a convenience: every permission must also exist where it is enforced and be tested there. Never loosen a rule to make a feature work.
- Say who may sign in and how that is checked. Roles stay few; capabilities are independent flags; rights derived from data (an owner field) beat stored grants.

## Stored and external data is hostile

- Every value that did not come from the code (database fields, query strings, API responses, file names) is attacker-controlled. Escape on output (`textContent`, templates, an escaping helper that also covers quotes), validate links by allowlist (scheme and host), and validate class names, colours and icons by pattern.
- Add the hostile case to the browser tests whenever a new stored value reaches the page.

## Input, paths and limits

- A path that comes from outside (a manifest, an upload name, a query) is checked for containment with `path.relative` on real paths, never a string prefix, and rejected when it has `..`, is absolute or goes through a link that leaves the folder. The same for deletes.
- Malformed input must not stop the process: parse and decode URLs inside the error boundary and answer 400. Bound request bodies, downloads and archives (size, entries, decompressed size) and validate an import completely before writing the first file.
- Replace files atomically (write a temporary file, then rename) so a crash never leaves a half-written file, and verify a downloaded package against its published checksum before it is parsed.

## Browser hardening

- Enforce a Content-Security-Policy: no inline scripts, handlers or style blocks. A new third-party host is added to the policy and to its test in the same change.
- Pin third-party scripts and styles to an exact version with an integrity hash and `crossorigin="anonymous"`.
- Clear session data on sign-out and when the signed-in user changes.

## Secrets and personal data

- Key files and tokens are never read, printed, committed, logged or pasted. They are in the ignore file; keep them there.
- Error reports and logs carry identifiers, not personal data: no emails, names, query strings or request bodies. Scrub before sending.

## Dependencies

- Prefer none at runtime. Audit what ships; accepted advisories are written down with the reason. Never run an automatic "fix" that downgrades a package.

## Working safely as an agent

- Do not change git config, commit or push unless asked. Do not bypass checks or disable a security header or test to make something work. Confirm before destructive actions (deleting data, rules that might lock people out).
