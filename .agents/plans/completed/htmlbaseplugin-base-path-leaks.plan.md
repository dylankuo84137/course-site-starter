# Plan: Register HtmlBasePlugin to close the base-path leak class

## Summary

Register Eleventy's built-in `HtmlBasePlugin` in `.eleventy.js` so every root-relative
`href`/`src` in rendered HTML is auto-prefixed with the GitHub Pages subpath, turning
base-path correctness from a per-author discipline (`| url` by hand) into a build
guarantee (per `docs/adr/0003-htmlbaseplugin-for-base-path.md`). Existing `| url` calls
stay — the plugin is idempotent on already-prefixed URLs.

**This plan is heavily shaped by ground-truth findings that diverge from the issue's
framing — read the "Critical Grounding Findings" section before implementing.** In short:
(1) the 12 leaks the issue cites are **stale `_site/` build artifacts**, not live template
bugs — a clean subpath build already greps to **0 leaks** today, even without the plugin;
(2) the `/reflections/ → /discussion/` route fix was **already completed** by issue #3 —
there is no `/reflections/` reference left in `src/`; (3) there is a **separate,
pre-existing double-prefix bug** (`/course-site-starter/course-site-starter/…`, 57
occurrences) in `sitemap.njk` / `feed.njk` / `ai-index.njk` that `HtmlBasePlugin` does NOT
touch (non-HTML output) and that the issue's acceptance criteria nonetheless demands be
zero. **Scope decided (2026-06-14): this fix is IN scope for #12 — Task 2 takes Option A
(drop `| url` in the absolute-URL emitters).**

## User Story

As a maintainer of a subpath-deployed site, I want root-relative links/assets to be
prefixed automatically at build time so that a hand-authored page that forgets `| url`
can no longer ship broken links/assets to the `/course-site-starter/` production subpath.

## Metadata

| Field | Value |
|-------|-------|
| Type | BUG_FIX / hardening (systemic safety net) |
| Complexity | MEDIUM (plugin registration + double-prefix fix in the absolute-URL emitters) |
| Systems affected | Build config (`.eleventy.js`); sitemap / feed / ai-index emitters |
| Issue | #12 |

## Critical Grounding Findings

All findings below were verified by building this exact repo at HEAD (`2ecf675`),
Eleventy `v3.1.2`. Reproduce with the commands in the Validation section.

1. **`HtmlBasePlugin` is a named export of `@11ty/eleventy` v3** (verified:
   `require('@11ty/eleventy').HtmlBasePlugin` is a `function`). No new dependency needed.
   It reads `pathPrefix` from the returned config automatically.

2. **The "12 leaks" are stale `_site/` artifacts, not template bugs.** Eleventy does NOT
   clean `_site/` between builds (no clean option set; `.gitignore` line 2 = `_site/`).
   The acceptance-criteria grep command does not `rm -rf _site` first, so on a dev machine
   with a dirty `_site/` it reports ~12 leaks — including a `_site/reflections/index.html`
   left over from before issue #3's rename. After `rm -rf _site` + a fresh subpath build,
   the **leak grep returns 0** *even without the plugin*, because every current template
   already uses `| url` correctly.
   - Consequence: registering `HtmlBasePlugin` produces **no diff** in current HTML output.
     Its value is purely the forward safety net (the ADR's whole point). The implementer
     must not interpret "identical output" as "plugin not working" — verify with the
     deliberate probe in Task 1's E2E step.

3. **The `/reflections/` route fix is already done.** `grep -rn "/reflections" src/` →
   **0 hits**. `src/reflections/` does not exist; `src/discussion/index.njk` does. The
   ai-guide pages (`src/ai-guide/index.md`, `src/en-US/ai-guide/index.md`) contain **no**
   `/reflections/` link and no root-relative paths at all — they use absolute
   `{{ site.url }}/…` URLs. Issue #3's report
   (`.agents/reports/rename-reflections-to-discussion-report.md`) confirms the rename was
   exhaustive. The only `/reflections/` that appears anywhere is the stale `_site/`
   artifact from finding #2, which a clean build deletes. **No source change is required
   for `/reflections/`; this is a verify-only item.**

4. **Pre-existing double-prefix bug, independent of `HtmlBasePlugin`.** A clean SUBPATH
   build emits **57** occurrences of `/course-site-starter/course-site-starter/…`, all in
   `_site/feed.json`, `_site/sitemap.xml`, `_site/ai-index.json`. Root cause: the pattern
   `{% if site.url %}{{ site.url }}{% endif %}{{ '/path' | url }}` — `site.url`
   (`https://dylankuo84137.github.io/course-site-starter`, see `src/_data/site.json`)
   already carries the subpath, and `| url` adds it again under
   `ELEVENTY_BASE="/course-site-starter/"`. The DEFAULT build has **0** double-prefixes
   (because `| url` is a near no-op at root base), so the bug is subpath-build-only.
   `HtmlBasePlugin` transforms HTML output only (`html` extension by default) — it neither
   causes nor fixes these `.json`/`.xml` files. **The acceptance criterion "No
   double-prefix in either build" currently FAILS on the subpath build for reasons
   unrelated to this issue's headline change.** See Task 2 for the scope decision.

5. **The leak grep is meaningful only on the SUBPATH build.** The DEFAULT build emits 883
   "leaks" by the same grep — correctly, since root-relative paths are valid when deployed
   at root. The acceptance-criteria grep pins `ELEVENTY_BASE="/course-site-starter/"`, so
   always evaluate leaks against the subpath build with a clean `_site/`.

## Patterns to Follow

### Plugin require + registration (mirror existing style in `.eleventy.js`)

The file already requires plugins at the top and registers them inside the exported
function. Mirror both.

```js
// SOURCE: .eleventy.js:1-9  (existing require block — add the HtmlBasePlugin import here)
const i18n = require('eleventy-plugin-i18n');
const markdownIt = require('markdown-it');
const materialHelpers = require('./src/_data/materialHelpers.js');
// ...
```

```js
// SOURCE: .eleventy.js:193-200  (existing addPlugin call to mirror)
module.exports = function(eleventyConfig) {
  // i18n configuration
  eleventyConfig.addPlugin(i18n, {
    translations,
    fallbackLocales: { 'en-US': 'zh-TW' }
  });
```

```js
// SOURCE: .eleventy.js:248-253  (pathPrefix the plugin consumes — DO NOT change)
return {
  dir: { input: "src", output: "_site", includes: "_includes" },
  markdownTemplateEngine: "njk",
  htmlTemplateEngine: "njk",
  pathPrefix: process.env.ELEVENTY_BASE || "/"
};
```

### Double-prefix source pattern (only relevant if Task 2 is taken)

```njk
{# SOURCE: src/sitemap.njk:8,14,20,26,38,45,52,58,65,73,80,86,93,101 #}
<loc>{% if site.url %}{{ site.url }}{% endif %}{{ '/courses/' | url }}</loc>
{# SOURCE: src/feed.njk:8,9,11,21 — same compound pattern #}
{# SOURCE: src/ai-discovery/ai-index.njk:135,137,139,140,142,145,147,148,150,153 —
   uses {{ site.url }}{{ (...) | url }} (no `if site.url`, but same double-apply) #}
```
Fix recipe (Option A in Task 2): drop the `| url` filter in these absolute-URL contexts so
the canonical production URL is `{{ site.url }}/path` (site.url already carries the
subpath). Do NOT touch `ai-index.njk:29` (`"url": "{{ site.url }}"`, no path appended) or
the `{{ site.url }}/…` literals already without `| url` in the ai-guide pages and
`for-ai.njk` — those are already correct.

## Files to Change

| File | Action | Purpose |
|------|--------|---------|
| `.eleventy.js` | UPDATE | Require `HtmlBasePlugin` from `@11ty/eleventy`; register via `eleventyConfig.addPlugin(HtmlBasePlugin)`. Core deliverable. |
| `docs/adr/0003-htmlbaseplugin-for-base-path.md` | UPDATE | Flip front-matter `status: accepted (planned)` → `accepted` once landed (it is now implemented, not planned). |
| `src/sitemap.njk` | UPDATE *(Task 2)* | Remove `| url` from `<loc>` so subpath build stops double-prefixing. |
| `src/feed.njk` | UPDATE *(Task 2)* | Same double-prefix fix on `home_page_url`/`feed_url`/`icon`/item `url`. |
| `src/ai-discovery/ai-index.njk` | UPDATE *(Task 2)* | Same fix on the per-course `{{ site.url }}{{ (…) | url }}` link fields. |

No new files. No test files (this repo's gate is build + grep, not unit tests — see
`scripts/validation/` which validates JSON data only).

## Tasks

### Task 1: Register HtmlBasePlugin (core deliverable)
- File: `.eleventy.js`
- Action: UPDATE
- Implement:
  1. Add to the top require block (mirror `.eleventy.js:1-9`):
     `const { HtmlBasePlugin } = require('@11ty/eleventy');`
  2. Inside the exported function, near the other `addPlugin` call
     (mirror `.eleventy.js:195`), add: `eleventyConfig.addPlugin(HtmlBasePlugin);`
  3. Leave `pathPrefix` (`.eleventy.js:252`) and all existing `| url` calls untouched.
- Mirror: `.eleventy.js:1-9`, `.eleventy.js:193-200`
- Validate (run all from repo root):
  - `npm run validate` → exit 0.
  - Clean subpath leak grep (the acceptance command, with a clean `_site` first):
    `rm -rf _site && SKIP_PDF_CACHE=1 ELEVENTY_BASE="/course-site-starter/" npx @11ty/eleventy --quiet && grep -rhoE '(href|src)="/[^/"][^"]*"' _site | grep -vE '"/course-site-starter/' | wc -l`
    → expect `0`.
  - **No double-prefix in HTML** (the part the plugin governs):
    `grep -rhoE '/course-site-starter/course-site-starter/' _site --include='*.html' | wc -l`
    → expect `0` (proves the plugin is idempotent and does not compound with `| url`).
  - **Plugin-is-active probe (temporary, REVERT after):** add a deliberately un-filtered
    link to a shared layout, e.g. in `src/_includes/layouts/base.njk` add
    `<a href="/probe-test/">probe</a>` in `<body>`; run the clean subpath build; confirm
    `grep -r 'href="/course-site-starter/probe-test/"' _site` finds it (plugin prefixed a
    path that never went through `| url`). Then **remove the probe and rebuild.** This is
    the only way to observe the safety net, since real output is otherwise unchanged.

### Task 2: Fix the pre-existing subpath double-prefix in sitemap/feed/ai-index
- Status: **In scope for #12 (decided 2026-06-14).** Take Option A below.
- The problem: the acceptance criterion "No double-prefix … in either the default-base or
  subpath build" currently FAILS (57 hits in `_site/sitemap.xml`, `_site/feed.json`,
  `_site/ai-index.json`) — see Finding #4. This is a real production bug: the deployed site
  builds with the subpath, so these canonical absolute URLs are double-prefixed today.
  `HtmlBasePlugin` (Task 1) does not touch non-HTML output, so this must be fixed at source.
- **Fix (Option A):** in `src/sitemap.njk`, `src/feed.njk`,
  `src/ai-discovery/ai-index.njk`, drop the `| url` filter on the path segment appended
  after `{{ site.url }}` (e.g. `{{ site.url }}{{ '/courses/' | url }}` →
  `{{ site.url }}/courses/`). `site.url` already carries the canonical `/course-site-starter`
  base, and sitemap/feed/JSON URLs must always reflect the canonical production URL
  regardless of build base, so `| url` is wrong in these absolute-URL contexts. Touch only
  `site.url`+path concatenations; leave the bare `{{ site.url }}` (no path) and the
  already-correct `{{ site.url }}/…` literals alone.
- Files: `src/sitemap.njk`, `src/feed.njk`, `src/ai-discovery/ai-index.njk`
- Mirror: the line lists in "Patterns to Follow"
- Validate: `rm -rf _site && SKIP_PDF_CACHE=1 ELEVENTY_BASE="/course-site-starter/" npx @11ty/eleventy --quiet && grep -rhoE '/course-site-starter/course-site-starter/' _site | wc -l`
  → expect `0`. Also rebuild DEFAULT base and confirm sitemap/feed URLs still read
  `https://dylankuo84137.github.io/course-site-starter/…` (single, correct).

### Task 3: Verify `/reflections/` is already resolved (verify-only, no code)
- Action: confirm, do not change.
- Implement: `grep -rn "/reflections" src/` → expect 0 hits (already true at HEAD). Confirm
  a clean build produces `_site/discussion/index.html` and NO `_site/reflections/`.
- Note in the implementation report that the route fix was delivered by issue #3 and that
  the issue #12 mention of it referred to a stale `_site/` artifact.

### Task 4: Promote ADR-0003 status to accepted
- File: `docs/adr/0003-htmlbaseplugin-for-base-path.md`
- Action: UPDATE front-matter `status: accepted (planned)` → `status: accepted`.
- Validate: none (doc-only); included in `git diff` review.

## Validation

Run from repo root. Always `rm -rf _site` before a leak/double-prefix grep — Eleventy does
not auto-clean and stale artifacts cause false positives (Finding #2).

1. **Data/correctness gate:** `npm run validate` → exit 0.
2. **Subpath leak grep (= acceptance criterion, clean):**
   `rm -rf _site && SKIP_PDF_CACHE=1 ELEVENTY_BASE="/course-site-starter/" npx @11ty/eleventy --quiet && grep -rhoE '(href|src)="/[^/"][^"]*"' _site | grep -vE '"/course-site-starter/'`
   → expect **no output** (0 leaks).
3. **No double-prefix:**
   - HTML (governed by the plugin): `grep -rhoE '/course-site-starter/course-site-starter/' _site --include='*.html' | wc -l` → `0` (always).
   - All output (sitemap/feed/json): `grep -rhoE '/course-site-starter/course-site-starter/' _site | wc -l` → `0` only if Task 2 Option A is taken; otherwise document the pre-existing count.
4. **Plugin-active probe:** temporary un-filtered link → prefixed in output → revert
   (Task 1).
5. **`/reflections/` gone:** `grep -rn "/reflections" src/` → 0; `_site/reflections/`
   absent after clean build.
6. **Full subpath build sanity:** `ELEVENTY_BASE="/course-site-starter/" npm run build`
   → exit 0.
7. **Full gate (`.claude/validate.sh`):** `npm run validate && npm run build:full &&
   ELEVENTY_BASE="/course-site-starter/" npm run build` → all exit 0.

## Acceptance Criteria

- [ ] `HtmlBasePlugin` registered in `.eleventy.js`; all existing `| url` calls retained.
- [ ] Clean subpath build leak grep returns **0**.
- [ ] **No double-prefix in HTML output** (plugin is idempotent) — always required.
- [ ] Double-prefix in sitemap/feed/ai-index resolved (Task 2): clean subpath build greps
      to **0** `/course-site-starter/course-site-starter/` across ALL output.
- [ ] `grep -rn "/reflections" src/` returns 0 (verified already true; no regression).
- [ ] `npm run validate` passes.
- [ ] ADR-0003 status promoted to `accepted`.
- [ ] Probe test confirmed the plugin prefixes an un-filtered path, then reverted.
- [ ] Implementation report notes the issue/code divergences (Findings #2–#4).
