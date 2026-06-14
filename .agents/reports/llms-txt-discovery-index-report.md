# Implementation Report: Bilingual `/llms.txt` discovery index + retire `/for-ai/`

**Plan:** `.agents/plans/llms-txt-discovery-index.plan.md`
**Issue:** #16
**Branch:** `feat/16-llms-txt-discovery-index`
**Worktree:** `../course-site-starter-feat-16-llms-txt-discovery-index`

## Tasks completed
| # | Task | Status |
|---|------|--------|
| 1 | Add `llms` preamble strings to both i18n files | ✅ |
| 2 | Create `src/ai-discovery/llms-txt.njk` generator | ✅ |
| 3 | Delete `/for-ai/` page | ✅ |
| 4 | Remove `/for-ai/` from sitemap, add `/llms.txt` | ✅ |
| 5 | Repoint README `/for-ai.html` reference | ✅ |
| 6 | Repoint `ai-index.njk` `documentation` field | ✅ |
| 7 | Repoint dev-doc mentions of `/for-ai/` | ✅ |

## Files changed
- **CREATE** `src/ai-discovery/llms-txt.njk` — paginates over `locale.available`, emits `/llms.txt` (zh-TW, root) + `/en-US/llms.txt`.
- **UPDATE** `src/_data/i18n/zh-TW.json`, `src/_data/i18n/en-US.json` — added `llms` block (`intro`, `full_corpus`, `license`).
- **UPDATE** `src/_includes/macros/i18n.njk` — added `cfRaw()` macro (see Deviation 1).
- **DELETE** `src/ai-discovery/for-ai.njk` (406 lines).
- **UPDATE** `src/sitemap.njk` — dropped `/for-ai/` `<url>`, added `/llms.txt` `<url>`.
- **UPDATE** `src/ai-discovery/ai-index.njk` — `documentation` field `/for-ai/` → `/llms.txt`.
- **UPDATE** `README.md`, `docs/development/base-path.md`, `docs/development/ai-index-core-generation-files.md` — repointed references.

## Validation results
- `npm run validate` → ✅ all course data + innovations valid.
- `npm run build` (default) → ✅ exit 0. After a clean build: `_site/for-ai/` **not** generated; `_site/llms.txt` + `_site/en-US/llms.txt` present.
- Entity-escape check `grep -E '&amp;|&lt;|&gt;|&#' _site/llms.txt _site/en-US/llms.txt` → **clean** (apostrophes render literally).
- Monolingual check → zh file has 0 `Course Home`, en file has 0 `課程主頁`.
- `grep for-ai _site/sitemap.xml _site/ai-index.json` → clean; sitemap has `<loc>…/llms.txt</loc>`; ai-index `documentation` = `/llms.txt`.
- Subpath build `ELEVENTY_BASE="/course-site-starter/" npm run build` → **every** Markdown link in `_site/llms.txt` carries the `/course-site-starter/` prefix, including the `llms-full.txt` pointer (`/course-site-starter/llms-full.txt`). No bare `/courses/...` links.
- `npm run build:full` → ✅ exit 0.

## Tests written
No unit-test harness exists for `.njk` templates in this repo; the verification gate is the build + the grep-based output assertions above (per the plan's Validation section). The probe evidence (entity-escape, monolingual, subpath-prefix greps) stands in for behavioral tests and is reproducible from the report.

## Deviations from plan

### 1. Added a `cfRaw()` macro instead of `cf(...) | safe` (PROBE-VERIFIED)
The plan (Task 2, Do-not #8) mandated course fields via `i18nMacro.cf()` and assumed a call-site `| safe` would prevent HTML-entity escaping. **Probe result:** it does not. `cf()` emits its value through an internal `{{ course.i18n[lang][field] }}`, which Nunjucks autoescape converts (`'` → `&#39;`) *inside the macro* before any call-site `| safe` can apply. The first en-US build leaked `&#39;` throughout the overview text, failing the plan's own "no HTML-entity escaping" gate.

Autoescape is global in this Eleventy/Nunjucks setup (no per-block `{% autoescape %}` in Nunjucks), so it can't be toggled for one template. The sibling machine artifact `ai-index.njk` sidesteps this by reading `course.i18n[lang].overview` **directly** with `| jsonstr | safe` (lines 49–77) — raw value flows through the filter, only terminal output escapes.

To keep templates going through the macro layer (honoring the spirit of Do-not #8 — no direct i18n field access in templates) while fixing the escaping, I added **`cfRaw()`** to `macros/i18n.njk`: identical fallback chain to `cf()`, but each branch emits `| safe`, so the macro returns raw text. It is documented as plain-text-only ("Do NOT use in HTML templates — there `cf()` is correct, as escaping guards against markup injection"). `cf()` is untouched, so HTML pages keep their injection-safe escaping.

This expands the change set to a shared template (`macros/i18n.njk`) beyond the plan's file list — additive only.

### 2. `/for-ai/` vs `/ai-guide/` — doc framing corrected via user feedback
Mid-implementation the user rejected the first pass of the doc edits (Tasks 5, 7), then clarified: `/ai-guide/` is the human-readable Documentation guide to retain (its repoint is #17's scope); `/for-ai/` is genuinely retired (as planned); `/llms.txt` is the **machine** index superseding `/ai-index.json`. This aligns with ADR-0004. The doc edits were redone to frame `llms.txt` as the machine discovery index / `ai-index.json` successor (never the human usage guide), and **not** to claim `ai-index.json` is already gone — it still builds in this PR; the two coexist until #17 retires the JSON. `base-path.md` and `ai-index-core-generation-files.md` note "retirement tracked in #17".

### 3. `course_home` link always emitted
Per the plan, the course-home link is emitted unconditionally for every course, whereas `src/en-US/index.njk:34` gates it on `courseDescriptionDoc`. Plan-directed ("**Always** emit the course-home link").

## Not touched (intentional, per plan)
- `docs/development/pdf-text-extraction.md` and `docs/superpowers/plans/2026-06-10-claude-md-piv-migration.md` still mention `for-ai.njk` — archival, left alone per plan Task 7.
- `docs/adr/0004-…md` mentions `/for-ai/` — intentional; it documents the removal decision.
- No `llms-full.txt`, no `ai-index.njk` deletion, no `/ai-guide/` change — those belong to #17.

## Next step
`/validate .agents/plans/llms-txt-discovery-index.plan.md` in a fresh session (full gate + E2E + human review), then open a PR. After merge: `/clean-worktree feat/16-llms-txt-discovery-index`.
