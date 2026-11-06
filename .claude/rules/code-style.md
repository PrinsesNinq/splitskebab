---
paths:
  - "src/**"
  - "public/**"
  - "scripts/**"
  - "tests/**"
---

# Code style

> Starting point pulled from the Shared Element Library. Edit freely: a pull never overwrites your local changes without --force. Replace the paths above with the project's.

## Shape

- Keep the stack small and say what it is here (frameworks, build step or none). Do not add a dependency, bundler or framework without asking.
- One responsibility per module, named for it (`html-utils`, `permit-save`). Pages stay thin; shared logic lives in shared modules.
- Match the surrounding file for indentation, quotes and naming; do not reformat files you are not changing. Let the linter (not opinions) be the gate: no unused variables or imports, no undefined names.
- File names kebab-case, functions and variables camelCase, constants UPPER_SNAKE, booleans `is`/`has`/`can`.

## Comments

- Explain **why**: the constraint, the failure being avoided, the module it cooperates with. Do not narrate what the line does. A workaround always says what goes wrong without it.

## Reuse

- Before writing a helper, grep for an existing one. When a second caller appears, extract a shared module; never leave a third copy. Do not abstract a single use or merge snippets that only look alike.
- Reusable UI comes from the Shared Element Library: do not hand-roll a copy and do not edit pulled files.

## CSS: a stylesheet first, inline only when you must

- Styling lives in the project's shared stylesheet(s), under a class. That is the default for every rule, including one used on a single page (scope it with a page class such as `.login-page`).
- No `style="..."` attributes and no `<style>` blocks in markup. No `element.style.x = "..."` for a value that never changes: make it a class and toggle the class.
- Inline is allowed only for a value that **differs per instance at runtime** and cannot be a class: a colour that comes from data, a progress width, a measured position or size. Set it from script (`style.setProperty`, or a CSS custom property such as `--chip-color`) and keep the rule that uses it in the stylesheet (`border-top: 4px solid var(--category-color)`): the value is inline, the styling is not.
- "It is only used once", "it is a small tweak" and "it is quicker" are not reasons for inline CSS.
- A fixed inline style you come across gets moved to the stylesheet in the same change.

## Markup

- No inline scripts or `on...=` handlers if the project has a CSP: use delegated listeners.
- Anything that draws data escapes it (templates, `textContent`); see the security rule.

## Lifecycle

- Anything that adds listeners, observers, timers or nodes outside its own element removes them when it goes away, and works again when it comes back. Prefer an `init(el)` that returns a dispose function.
- Modules shared between pages must not capture page elements at import time.

## Errors

- A catch that tells the person something also reports it, without personal data. Say what happened and what they can do next.

## Releases

- Keep a CHANGELOG (Keep a Changelog format) for user-visible changes under `[Unreleased]`.
