---
paths:
  - "src/**"
  - "public/**"
  - "lib/**"
  - "scripts/**"
  - "tests/**"
---

# Code review

> Starting point pulled from the Shared Element Library. Edit freely: keep the dimensions that fit the project, add its own (the permission model, the database) and drop the rest.

A review finds what is wrong, says how sure it is, and says what is fine. It is not a rewrite and not a style opinion.

## Before you start

- Write the **threat model in one line**: who can reach this code (a local developer tool, a page in a visitor's browser, a public service)? Severity follows exposure. A trusted local owner is not a hostile publisher; code that ships into other projects runs with their users' rights.
- Read the change, then the code around it. Run the matching tests and say which commands you ran.

## Dimensions

Check each. Skip the ones that do not apply and say so in a word.

### Security

- **Untrusted data reaching a sink**: `innerHTML`, `unsafeHTML`, `href`/`src` (a `javascript:` or `data:` URL), `eval`, queries, shell commands, file paths. Escape on output; links go through a scheme check.
- **Paths**: containment with `path.relative` on real paths, never a string prefix (`/a/public-secret` starts with `/a/public`); no `..`, absolute or drive paths; symlinks and links that point nowhere. For deletes as well as writes.
- **Malformed or hostile input must not stop the process**: URL parsing and decoding sit inside the error boundary; request bodies, downloads and archives are bounded (size, entry count, decompressed size); an import or package is validated completely before the first file is written; downloads are checked against a published checksum.
- **CSRF and origin**: a state-changing endpoint checks `Host` and `Origin` (a local server is reachable by a web page through DNS rebinding).
- **Authentication and authorization** are enforced where the data lives, never only in the browser. Secrets and personal data are not in code, logs or error reports.
- **SSRF** (a server fetching a URL somebody else supplied) and **insecure deserialization** (data turned into objects or code): only where present, but check when they are.
- **Dependencies**: a new one is justified, pinned and audited.

### Correctness

- **Edge cases**: empty, `null`, one item, very long text, Unicode, time zones and DST, overflow, negative numbers.
- **Races**: a stale async answer replacing a newer one (use a generation number), work that finishes after the element or page is gone (abort the fetch, the `FileReader`, the timer), overlapping requests and double clicks.
- **Cleanup**: listeners, observers, timers, nodes and requests are removed when the thing goes away, and it works again when it comes back.
- **Errors** are handled where something can be done and propagate otherwise. No silent `catch`. The message says what happened and what to do next.
- **Names that hide native members** (`matches`, `closest`, `hidden`, `title`, `part`): they break code that calls the native one.
- **Partial failure and invariants**: files are replaced atomically (temp file, then rename); a pull downloads and checks everything first, writes after, and the lockfile last; published data (version numbers, revisions) is never overwritten or reused.
- **Boundaries and shapes**: off-by-one; data from outside (JSON files, packages, API answers) is checked where it enters.

### Performance

- **Unbounded** loops, lists, queries, caches and request bodies: set a limit.
- **Hot paths** (scroll, resize, input, observer callbacks): no layout reads mixed with writes, batch with `requestAnimationFrame`, no O(n²) over rows.
- **Memory**: needless copies, caches that only grow, listeners that keep objects alive.
- **A database** (if the project has one): N+1 reads, a missing index, a listener without a limit or cleanup.
- **Feedback loops**: a change that alters the page length or size and so triggers itself.

### Maintainability

- Clear names, one responsibility per module, no third copy (extract), comments that say why, non-obvious logic explained.
- **Tests**: the change has a test that would have caught the problem, the hostile case, and cleanup. In the library: both builds.
- Docs, change notes and the changelog are updated; a breaking change is called out.

### Accessibility and appearance (UI changes)

- Keyboard use, focus and labels; reduced motion; light and dark mode (run the contrast audit); narrow screens.

## Verify before you report

- Every finding is **reproduced** (a test, a probe, command output) or **traced** in the code from the input to the effect. Say which. What you could not check is marked **unverified**. A guess is not a finding.
- **Say when something is not an issue**, and why. Keep a short *Not an issue* list of what you suspected and checked, so the next review does not repeat it.
- **Calibrate severity** to the threat model: *Critical* is exploitable, or loses or corrupts data, in the real setting. *High* is a real bug people hit. *Medium* is correct but fragile. *Low* is polish. Do not mix threat models and do not inflate.
- Do not pad. A review with two findings is fine. Do not suggest changes that only restyle.

## Output

```
## Code Review: [PR title or file]

Threat model: [one line]

### Summary
[1-2 sentences: what changed and the overall quality]

### Critical and high
| # | File:line | Issue | Severity | How verified |
|---|-----------|-------|----------|--------------|

### Suggestions
| # | File:line | Suggestion | Category | How verified |
|---|-----------|------------|----------|--------------|

### Not an issue
- [what you checked and why it is fine]

### What looks good
- [specific positives]

### Commands run
- [tests and probes, with the result]

### Verdict
[Approve / Request changes / Needs discussion]
```

## After the review

- Every accepted finding is fixed **with a test** in the same change. Run the suite again and report the real result.
- Do not commit or push unless asked.
