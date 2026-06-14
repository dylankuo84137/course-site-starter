# Plan: Make `validate.sh` a correctness gate + de-dup the base build

## Summary
Turn the PIV Validate gate (`.claude/validate.sh`) from a crash-only build smoke test into a
real correctness gate, per `docs/adr/0002-validate-as-correctness-gate.md`. Two coupled parts:
(1) **De-dup** the build onto a single production-faithful subpath build by removing the
`build:full` composition and the redundant Pagefind re-invocations (npm `prebuild`/`postbuild`
lifecycle hooks already cover validators + Pagefind ×1 per `npm run build`); (2) **add three
assertion layers** as hard failures (`exit 1`): output assertions on `_site/**/*.html`, a source
grep-lint of `src/_includes/**/*.njk`, and tightened data-validator root-key rules.

## User Story
As an agent running the PIV Validate phase after every task, I want the gate to assert on the
*rendered output and source footguns* (not just "does it compile"), so that prod-only subpath
bugs and helper-bypass footguns fail locally instead of silently shipping to the public site.

## Metadata
| Field | Value |
|-------|-------|
| Type | REFACTOR + ENHANCEMENT |
| Complexity | MEDIUM |
| Systems affected | `.claude/validate.sh`, `package.json` scripts, `.github/workflows/gh-pages.yml`, `src/_data/course-validator.js`, `src/_includes/components/course-breadcrumb.njk`, docs (`CLAUDE.md`, `docs/development/base-path.md`) |
| Issue | #13 |

---

## ⚠️ Open decisions — resolve before/while implementing

These were surfaced by grounding the issue against the real code. They are NOT optional polish;
the gate cannot land green without addressing #1.

### D1 (BLOCKER for layer 2) — pre-existing `course.i18n[` footguns in `course-breadcrumb.njk`
The issue lists only #12 as a blocker (for layer 1). But the **layer-2 grep-lint** pattern
`course.i18n[` already matches **real violations** in source that the issue did not enumerate:

```
src/_includes/components/course-breadcrumb.njk:240:  {{ course.i18n[lang].title }}
src/_includes/components/course-breadcrumb.njk:266:  {{ course.i18n[lang].grade }}
src/_includes/components/course-breadcrumb.njk:267:  {{ course.i18n[lang].semester }}
src/_includes/components/course-breadcrumb.njk:268:  {{ course.i18n[lang].unit }}
src/_includes/components/course-breadcrumb.njk:269:  {{ course.i18n[lang].domain }}
```

This component is imported by 14 page templates (`src/courses/*.njk`), so it ships. Per
`CONTEXT.md` ("Course Field … Reaching into `course.i18n[lang][field]` directly … is the footgun
the AI Layer forbids") these are exactly what the gate should flag. **Resolution (recommended,
folded into this plan as Task 5):** refactor those 5 lines to `i18nMacro.cf(course, field, lang)`.
The refactor is behavior-preserving for valid data (every required i18n field is present in both
languages, enforced by the validator), so `cf`'s fallback chain yields identical output. If the
reviewer prefers to keep this issue surgical, the alternative is to split D1 into a new blocking
issue — but then `validate.sh` is red on arrival and cannot be merged. This plan assumes Task 5
is folded in.

Note: `other.i18n[lang].title` (loop var `other`, in the same file lines 37/55 and
`course_nav.njk:44`) does **not** match the literal `course.i18n[` pattern, so it is correctly
left alone. Global `i18n[lang].…` UI-string access (the correct idiom) also does not match.

### D2 (depends on #12) — layer 1 needs base-path leaks cleared first
Issue #13 is **Blocked by #12** ("Fix base-path leaks at the source"), which is still **OPEN** as
of planning. The layer-1 output assertion (`no (href|src)="/…"` outside `/course-site-starter/`)
will be **red** until #12 merges. Implement order: land #12 first, then build this on top.

### D3 (scope of "single build entry point") — orphaned `build:search`
Removing `build:full` orphans `build:search` (its only caller). Per the ADR's single-entry-point
rule and the "remove only the orphans *your* change created" convention, the cleanest action is to
**remove `build:search` entirely** (a standalone Pagefind call re-introduces the redundancy the ADR
forbids). The issue text instead says "remove `--force-language zh` from postbuild/**build:search**",
implying it survives. **Recommended:** remove `build:search`; remove `--force-language zh` from
`postbuild`. If a manual search-only script must be retained, keep `build:search` but strip its
`--force-language zh`. This plan assumes removal (Task 1).

### D4 (out of issue scope — mention only) — stale `build:full` references elsewhere
`README.md` (~8 refs), `docs/development/ai-index-core-generation-files.md:68`, and the JS comment
`src/_includes/layouts/base.njk:206` ("Using --force-language zh …") will go stale. The issue
scopes docs to `CLAUDE.md` + `docs/development/base-path.md` only. Leave the rest; flagged here for
a possible follow-up. (`docs/superpowers/**` and `.agents/plans/completed/**` are historical
artifacts — do **not** touch.)

---

## Patterns to Follow

### `cf` macro import + call (for Task 5 breadcrumb refactor)
```nunjucks
{# SOURCE: src/index.njk:6 #}
{% import "macros/i18n.njk" as i18nMacro %}
...
{# SOURCE: src/index.njk:143,155 — call site #}
{{ i18nMacro.cf(c, 'title', currentLang) }}
<span>{{ i18nMacro.cf(c, 'grade', currentLang) }}</span> • <span>{{ i18nMacro.cf(c, 'unit', currentLang) }}</span>
```
The macro definition (the one sanctioned exception to the lint), for reference:
```nunjucks
{# SOURCE: src/_includes/macros/i18n.njk:17 #}
{% macro cf(course, field, lang = 'zh-TW') -%} … fallback: i18n[lang][field] → i18n['zh-TW'][field] → course[field] -%}{%- endmacro %}
```

### Data-validator error/warning idiom (for Task 4)
```javascript
// SOURCE: src/_data/course-validator.js:104-108 — current unknown-root-key (WARNING, must become ERROR)
for (const key of Object.keys(course)) {
  if (!ALLOWED_ROOT_KEYS.has(key) && !key.startsWith('_comment')) {
    addWarning(`Unknown root-level key: ${key}`, key);   // ← change addWarning → addError
  }
}
// SOURCE: src/_data/course-validator.js:234-236 — existing legacy-key HARD ERROR to mirror
if ('tags' in metadata) {
  addError('metadata.tags is a legacy key — tags are per-language only; use i18n.{lang}.tags', 'metadata.tags');
}
// SOURCE: src/_data/course-validator.js:32 — closed allow-list to extend the check against
const ALLOWED_ROOT_KEYS = new Set(['slug', 'hero_image', 'metadata', 'i18n', 'material', 'docs']);
```
Verified: all 4 live course JSONs use only `{slug, hero_image, metadata, i18n, material, docs}` and
contain **no** legacy keys — so promoting unknown-key to a hard error is safe (current data passes).

### Bash gate scaffolding (for Task 6 — no existing repo file to mirror; build from ADR §1-3)
`set -e` aborts on the first non-zero exit. `grep` returns 1 when it finds **nothing** (the success
case here), which would wrongly abort under `set -e` — so capture matches into a variable and test
emptiness, then `exit 1` with a message. The single build line is fixed by the ADR:
```bash
# SOURCE: docs/adr/0002 §"The base build the layers sit on":50
ELEVENTY_BASE="/course-site-starter/" npm run build   # validators ×1 (prebuild), eleventy ×1, pagefind ×1 (postbuild)
```

---

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `package.json` | UPDATE | Remove `build:full` (+ orphaned `build:search`, D3); `deploy` → `npm run build`; strip `--force-language zh` from `postbuild` |
| `.github/workflows/gh-pages.yml` | UPDATE | Drop redundant explicit `npx pagefind --site _site` line (line 72); `postbuild` already indexes |
| `CLAUDE.md` | UPDATE | Project Specifics `full:` → `npm run build` (line 105) |
| `docs/development/base-path.md` | UPDATE | Fix stale "(included in `npm run build:full`)" note (line 44) |
| `src/_data/course-validator.js` | UPDATE | Layer 3: legacy keys + unknown root key become hard errors; missing-`docs` stays a warning |
| `src/_includes/components/course-breadcrumb.njk` | UPDATE | D1: replace 5 `course.i18n[lang].X` with `i18nMacro.cf(...)` so layer-2 lands green |
| `.claude/validate.sh` | UPDATE | Rewrite: single subpath build + 3 assertion layers, each `exit 1` on violation |

---

## Tasks
Ordered so every footgun the new assertions catch is cleared *before* the assertion is switched on
(TDD-style). Run `npm run validate` after data/template tasks; run the full subpath build after the
de-dup task.

### Task 1: De-dup npm scripts
- File: `package.json`
- Action: UPDATE
- Implement:
  - Delete the `build:full` line (`"build:full": "npm run build && npm run build:search"`).
  - Delete the `build:search` line (orphaned — see D3; if reviewer rejects removal, instead change it to `"npx pagefind --site _site"`).
  - Change `"deploy": "npm run build:full"` → `"deploy": "npm run build"`.
  - Change `"postbuild": "npx pagefind --site _site --force-language zh"` → `"postbuild": "npx pagefind --site _site"`.
  - Leave `prebuild`, `build`, `dev`, `dev:fast`, `validate*`, `sync:drive` untouched.
- Mirror: `package.json:9-14`
- Validate: `ELEVENTY_BASE="/course-site-starter/" npm run build` exits 0; observe validators run once (prebuild) and Pagefind run once (postbuild); `_site/pagefind/` is populated.

### Task 2: Drop redundant Pagefind line from the deploy workflow
- File: `.github/workflows/gh-pages.yml`
- Action: UPDATE
- Implement: In the "Build site" step (lines 69-72), remove the `npx pagefind --site _site` line; keep `ELEVENTY_BASE="$BASE_PATH" npm run build` (its `postbuild` now indexes). Result: the step is a single build line, matching production = the gate's build.
- Mirror: `.github/workflows/gh-pages.yml:69-72`
- Validate: `grep -c pagefind .github/workflows/gh-pages.yml` → 0; YAML still parses (visual check / `npx --yes yaml-lint` optional).

### Task 3: Update docs
- Files: `CLAUDE.md`, `docs/development/base-path.md`
- Action: UPDATE
- Implement:
  - `CLAUDE.md:105` — `- full: \`npm run build:full\`` → `- full: \`npm run build\``.
  - `docs/development/base-path.md:44` — replace `- Build index: \`npx pagefind --site _site\` (included in \`npm run build:full\`)` with a note that the index is built automatically by the `postbuild` hook on `npm run build` (no separate full build / no `--force-language`).
- Mirror: `CLAUDE.md:103-107` (Verify commands block), `docs/development/base-path.md:42-46`
- Validate: `grep -rn "build:full" CLAUDE.md docs/development/base-path.md` → no hits.

### Task 4: Layer 3 — tighten the data validator
- File: `src/_data/course-validator.js`
- Action: UPDATE
- Implement:
  - Add `const LEGACY_ROOT_KEYS = new Set(['drive_folders', 'google_docs', 'youtube_videos', 'files']);` near `ALLOWED_ROOT_KEYS` (line 32).
  - In the root-key loop (lines 104-108): if the key is in `LEGACY_ROOT_KEYS`, `addError` with a targeted message (e.g. `` `Legacy root key "${key}" is forbidden — see CLAUDE.md Do-not #5` ``); else if not in `ALLOWED_ROOT_KEYS` and not `_comment*`, change the existing `addWarning` → `addError` (`` `Unknown root-level key: ${key} — translatable fields live in i18n only` ``).
  - Leave the missing-`docs` branch (lines 98-102) as `addWarning` (Innovation Essays are legitimately empty).
  - Leave the `metadata.tags` hard error (lines 234-236) as-is.
- Mirror: `src/_data/course-validator.js:104-108` (loop), `:234-236` (legacy-key error idiom), `:32` (allow-list)
- Validate: `npm run validate` exits 0 on current data (verified: no live course JSON has unknown/legacy root keys). Temporarily add `"files": {}` to one course JSON → `npm run validate` exits 1 with the legacy-key message → revert.

### Task 5: Clear layer-2 footguns in the breadcrumb component (see D1)
- File: `src/_includes/components/course-breadcrumb.njk`
- Action: UPDATE
- Implement:
  - Add `{% import "macros/i18n.njk" as i18nMacro %}` at the top of the file (a macro file may import another macro file).
  - Replace `{{ course.i18n[lang].title }}` (line 240) → `{{ i18nMacro.cf(course, 'title', lang) }}`.
  - Replace lines 266-269 `course.i18n[lang].grade|semester|unit|domain` → `i18nMacro.cf(course, 'grade'|'semester'|'unit'|'domain', lang)`.
  - Do **not** touch `other.i18n[lang].title` (loop var, not a `course.i18n[` match) or any `i18n[lang].…` UI-string access.
- Mirror: `src/index.njk:6` (import), `src/index.njk:143,155` (call sites)
- Validate: `grep -n "course\.i18n\[" src/_includes/components/course-breadcrumb.njk` → no hits; `ELEVENTY_BASE="/course-site-starter/" npm run build` exits 0 and the breadcrumb still renders the course title/grade/semester/unit/domain (spot-check a `_site/courses/*/index.html`).

### Task 6: Rewrite `.claude/validate.sh` as the correctness gate
- File: `.claude/validate.sh`
- Action: UPDATE
- Implement (replace the whole body; keep `#!/usr/bin/env bash` + `set -e`):
  1. **Layer 2 — source grep-lint** (run first; source-only, fast). Search `src/_includes/**/*.njk`
     for `course.i18n[`, `course.material`, `course.docs`, excluding `macros/i18n.njk`; if any
     match, print them and `exit 1`. E.g.
     `hits=$(grep -rEn 'course\.i18n\[|course\.material|course\.docs' src/_includes --include='*.njk' | grep -v 'macros/i18n.njk' || true)`; `[ -n "$hits" ] && { echo "$hits"; exit 1; }`.
  2. **Single production-faithful build** (runs layer-3 validators via `prebuild` and Pagefind via
     `postbuild`): `ELEVENTY_BASE="/course-site-starter/" npm run build`.
  3. **Layer 1 — output assertions** on `_site/**/*.html` only:
     - **Absolute-path leaks:** find `(href|src)="/…"` not starting with `/course-site-starter/` and
       not protocol-relative `//`. E.g.
       `leaks=$(grep -rEno '(href|src)="/[^"]*"' _site --include='*.html' | grep -vE '="(//|/course-site-starter/)' || true)`; fail if non-empty.
     - **Unrendered template tags:** `tags=$(grep -rn '{{' _site --include='*.html' || true)`; fail if non-empty.
     - **Pagefind index present + non-empty:** `[ -d _site/pagefind ] && [ -n "$(ls -A _site/pagefind 2>/dev/null)" ] || { echo "missing/empty _site/pagefind"; exit 1; }`.
  - Each failing assertion echoes the offending lines and `exit 1`. Mind `set -e` + `grep`: a
    no-match `grep` returns 1 — use `|| true` when capturing, then test the captured string.
- Mirror: `docs/adr/0002-validate-as-correctness-gate.md:23-35` (the three layers) and `:47-56`
  (the single build). Current file `.claude/validate.sh:1-6` shows the baseline being replaced.
- Validate: see Validation section below (clean pass + four deliberate-violation checks).

---

## Validation

**Project checks**
- `npm run validate` → exits 0 (data validator clean on current JSON).
- `ELEVENTY_BASE="/course-site-starter/" npm run build` → exits 0; `_site/pagefind/` populated;
  validators + Pagefind each run exactly once (no triple-run).
- `bash .claude/validate.sh` → exits 0 on a clean tree **after #12 is merged** (before #12, the
  layer-1 leak assertion is expected red — see D2).

**Deliberate-violation matrix (each must make `validate.sh` exit non-zero, then revert):**
| Layer | Inject | Expect |
|-------|--------|--------|
| 2 grep-lint | add `{{ course.material }}` to any non-macro `.njk` | `exit 1`, footgun line printed |
| 1 leak | add `<a href="/oops">` to a template | `exit 1`, leak line printed |
| 1 unrendered | add a literal `{{ broken }}` that survives to HTML | `exit 1` |
| 1 pagefind | `rm -rf _site/pagefind` then run only the assertion section | `exit 1` |
| 3 data | add `"files": {}` (or any unknown root key) to a course JSON | `npm run validate` / build `prebuild` `exit 1` |

**E2E / manual**
- Confirm `grep -rn build:full package.json CLAUDE.md docs/development/base-path.md .github` → no hits.
- Confirm the deploy workflow "Build site" step is a single `npm run build` line.
- Spot-check one built course page renders breadcrumb course fields correctly post-refactor.

## Acceptance Criteria
- [ ] `.claude/validate.sh` = single subpath `npm run build` + 3 assertion layers, each `exit 1` on violation.
- [ ] `build:full` removed; `deploy` → `npm run build`; redundant `npx pagefind` line removed from the workflow; `--force-language zh` removed from the Pagefind hook(s).
- [ ] Source grep-lint flags `course.i18n[` / `course.material` / `course.docs`, excludes `macros/i18n.njk`, and does **not** flag global `i18n[lang]` UI-string access.
- [ ] Output assertions scan `_site/**/*.html` only and pass green on a clean subpath build (post-#12).
- [ ] Gate fails when `_site/pagefind/` is missing/empty; passes when present + non-empty.
- [ ] Docs updated: `CLAUDE.md` Project Specifics + `docs/development/base-path.md`.
- [ ] Data validator: legacy keys + unknown root key are hard errors; missing `docs` stays a warning.
- [ ] A deliberately introduced violation of each layer makes `validate.sh` (or `npm run validate`) exit non-zero.
- [ ] Follows existing patterns (`i18nMacro.cf`, validator error idiom).
- [ ] D1 resolved (breadcrumb refactor folded in, or split to a tracked blocking issue) and D2 (#12) merged before this lands.
