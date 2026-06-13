---
status: accepted (planned)
---

# `.claude/validate.sh` is a correctness gate, not a build smoke test

The PIV "Validate" gate (`.claude/validate.sh`) originally ran three things: the two data
validators, `npm run build:full`, and a subpath build. That proves only that the course JSON
is well-formed and that 11ty compiles without throwing — it asserts **nothing about the
rendered output**. A snapshot audit found this gap was not theoretical: the subpath build
emitted 12 absolute-path link/asset leaks (broken on the GitHub Pages subpath in production),
and *none* of the eight "Do-not" footguns in `CLAUDE.md` were caught by the gate. A passing
build was silently shipping wrong HTML.

We deliberately reject two simpler framings:

- **Crash-only smoke test** (the status quo) — leaves every prod-only and footgun-class bug to
  the plan's manual E2E checklist and human review. Too leaky for a gate the AI Layer leans on
  after *every* task.
- **Data-only gate** — pushes build/render correctness to CI. Rejected: the per-task loop needs
  fast local feedback on the bugs that actually break this site.

So the gate enforces invariants at three layers:

1. **Output assertions** on `_site/**/*.html` — no `(href|src)="/…"` that isn't under
   `/course-site-starter/` (excluding protocol-relative `//`), and no unrendered `{{ }}`.
   Scoped to HTML only — `.js`/`.css` and embedded JSON (e.g. `data-course-i18n`) are not
   scanned, which kept false positives at zero in the audit.
2. **Source grep-lint** of `src/_includes/**/*.njk` — flags `course.i18n[`, `course.material`,
   `course.docs` (the helper-bypass footguns), excluding the one sanctioned macro
   `macros/i18n.njk`. The global `i18n[lang]` UI-string dictionary (see CONTEXT.md: **UI
   String** vs **Course Field**) is left alone — direct access there is the correct idiom.
3. **Data validator** — `drive_folders`, `google_docs`, `youtube_videos`, `files` are hard
   errors, and an unknown root key is an error (enforcing "translatable fields live in `i18n`
   only"). A missing `docs` object stays a warning — Innovation Essays are legitimately empty.

## The base build the layers sit on

The three layers attach to a single, production-faithful build — not the original three-step
script. An audit of the original `validate.sh` found heavy redundancy caused by npm's
`prebuild`/`postbuild` lifecycle hooks: `prebuild` runs the validators and `postbuild` runs
Pagefind on *every* `npm run build`, so each composition that re-invoked `build` (or `build:full`,
or an explicit Pagefind call) silently re-ran the same work. One `validate.sh` run executed the
validators **3×**, Pagefind **3×** (two of those indexing a `_site` that the next build
overwrote), and two Eleventy builds.

We collapse the gate to the one build that actually ships:

```bash
ELEVENTY_BASE="/course-site-starter/" npm run build   # validators ×1 (prebuild), eleventy ×1, pagefind ×1 (postbuild)
```

Production deploys only the subpath build (`.github/workflows/gh-pages.yml`), and any compile
error the default-base build could catch is a strict subset of what the subpath build exercises —
so the default-base build earns no place in the gate. This also leaves `_site` in its subpath
state as the gate's final artifact, which is exactly what layer 1's output assertions read.

The de-dup principle — **`npm run build` is the single build entry point; nothing re-invokes the
validators or Pagefind on top of it** — is applied repo-wide: `build:full` is removed (`deploy`
points at `build`), and the workflow's explicit `npx pagefind` line is dropped since `postbuild`
already covers it. While consolidating Pagefind to one invocation we also drop `--force-language
zh` from the hook: pages carry distinct `lang` attributes (`zh-Hant`, `en-US`), so Pagefind's
per-page language auto-detection is correct, and forcing `zh` mis-indexed the English pages and
disabled stemming. (This realigns local builds with what CI/production already did.)

This contradicts the surface reading of CLAUDE.md's "simplicity first / surgical" conventions
(a gate that greps built HTML is more machinery than "does it build"), which is why it is
recorded here: the trade-off is deliberate. The cost of a prod-only subpath bug reaching a
public site outweighs the cost of the gate's brittleness and upkeep.

## Consequences

- The gate now has standing maintenance: the subpath prefix, the allowlist of legitimate
  non-prefixed URL forms, and the closed root-key set must be kept current as the site grows.
- Genuine new patterns (a new root key, a new sanctioned helper) will trip the gate until the
  check is updated — false negatives become loud rather than silent, by design.
- Rollout is two ordered issues: first fix the existing leaks (see ADR-0003), then add the
  three layers as a hard failure (`exit 1`) so the gate lands green and stays green.
- The "single build entry point" rule must hold to stay de-duplicated: callers compose
  `npm run build`, never the validators or Pagefind on top of it. Re-introducing a `build:full`
  or a standalone Pagefind step in a build flow would silently restore the redundancy.
