---
status: accepted (planned)
---

# Node's built-in `node:test` is the test runner, wired into `.claude/validate.sh`

Two sibling issues (#26 — align the Course-Field resolver family's fallback semantic; #28 —
make the Drive-sync transforms testable) introduced the project's first unit tests, forcing a
choice this repo had never made: which test runner, and where does it run?

We use **Node's built-in `node:test` runner** (`require('node:test')` / `import` from
`node:test`, asserted with `node:assert`), invoked as a single path-less `node --test` line in
**`.claude/validate.sh`**. No test framework is added.

## Why no framework

CLAUDE.md's "Do-not #8" forbids React/Vue/Webpack/bundlers but is silent on *test* frameworks,
so Jest/Vitest/Mocha were genuinely on the table. We reject them:

- **Zero new dependency.** `node:test` ships with the Node version already in use (v22),
  matching the minimalist stack (11ty + Nunjucks + vanilla JS). A framework would be the
  largest dependency subtree in a project that deliberately avoids them.
- **Path-less auto-discovery is enough.** `node --test` with no arguments discovers
  `**/*.test.{js,mjs}` and `test/**` and skips `node_modules` — probe-verified to pick up
  **both** #26's `test/*.test.js` (CommonJS, the data helper's module type) and #28's
  `scripts/sync/*.test.mjs` (ESM, the sync script's module type) in one run. Each test file's
  extension follows the module type of the code under test; the runner spans both with no config.

The cost we accept: no built-in watch mode, mocking, or coverage. For a static-site repo whose
tests pin pure functions and one macro render, those aren't worth a framework.

## Why `.claude/validate.sh`, not the `validate` npm script

The PIV Validate gate is `.claude/validate.sh` (see ADR-0002), and it does **not** invoke the
`validate` npm script — it runs `npm run build` (validators via the `prebuild` hook) plus the
HTML output assertions. So chaining `&& npm test` into the `validate` npm script would put the
tests where the gate never looks — running on a manual `npm run validate` but silently absent
from `/validate`. The tests live in `.claude/validate.sh` itself, as a `node --test` line after
the cheap grep-lint and before the expensive subpath build (fail fast under `set -e`). No
`"test"` script is added to `package.json`.

## Consequences

- **One shared wiring line, idempotent across issues.** The first of #26/#28 to land adds the
  single `node --test` line; the other reuses it and only adds its test file. Glob discovery
  means no second edit and no merge conflict beyond that line.
- **Mixed module types coexist by design.** CommonJS `*.test.js` and ESM `*.test.mjs` both run
  under one invocation; the repo has no top-level `"type": "module"`, so each extension keeps its
  intended semantics.
- **"Can I add Vitest?" is answered here.** Adding a test framework now requires revisiting this
  ADR — a deliberate rejection, not an omission.
- **The gate owns test wiring.** Re-introducing a `package.json` `test` script chained into the
  `validate` npm script would restore the "tests that never run in the gate" trap and must be
  avoided.
