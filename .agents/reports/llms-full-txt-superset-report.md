# Report: feat/17 — `/llms-full.txt` superset + retire `ai-index.json`

**Date:** 2026-06-15  
**Branch:** `feat/17-llms-full-txt-superset`  
**Issue:** [#17](https://github.com/dylankuo84137/course-site-starter/issues/17)  
**Plan:** `.agents/plans/llms-full-txt-superset.plan.md`

---

## Tasks Completed

| Task | Description | Commit | Status |
|------|-------------|--------|--------|
| 1 | Created `src/ai-discovery/llms-full.njk` — paginated bilingual Markdown generator | `323a9eb` | ✅ |
| 2 | Deleted `src/ai-discovery/ai-index.njk`, retired `/ai-index.json` | `3f5929c` | ✅ |
| 3 | Repointed zh-TW `src/ai-guide/index.md` from ai-index.json → llms-full.txt URL | `8a97528` | ✅ |
| 4 | Repointed en-US `src/en-US/ai-guide/index.md` similarly | `1782445` | ✅ |
| 5 | Updated all functional references in docs, src header comments, and README | `86edab5` | ✅ |
| 6 | Full validation gate | — | ✅ |

---

## Validation Results

| Check | Result |
|-------|--------|
| `npm run validate` | ✅ passed |
| `npm run build` (standard) | ✅ passed (0 errors, 63 pages indexed) |
| `ELEVENTY_BASE="/course-site-starter/" npm run build` | ✅ passed (0 errors) |
| `_site/llms-full.txt` exists (zh-TW, 6.7 KB) | ✅ |
| `_site/en-US/llms-full.txt` exists (en-US, 8.0 KB) | ✅ |
| Both files strictly monolingual | ✅ |
| `_site/ai-index.json` absent from clean build | ✅ |
| ai-guide HTML (`_site/ai-guide/index.html`) has `llms-full.txt` URL, no `ai-index.json` | ✅ |
| ai-guide HTML (`_site/en-US/ai-guide/index.html`) has `llms-full.txt` URL, no `ai-index.json` | ✅ |
| `grep -rn "course.material["` in new templates | ✅ none (only in materialHelpers.js — the helper itself) |
| `grep -rn "ai-index"` in `src/` | ✅ none |
| `grep -n "ai-index"` in `README.md` | ✅ none |
| `grep "ai-index"` in `docs/development/` | ✅ one meta-comment (intentional — see Deviations) |
| Subpath build URL prefix (`/course-site-starter/courses/…`) | ✅ single prefix confirmed |

---

## Files Changed

**New files:**
- `src/ai-discovery/llms-full.njk` — bilingual paginated Markdown corpus generator

**Deleted files:**
- `src/ai-discovery/ai-index.njk`

**Modified files:**
- `src/ai-guide/index.md` — llms-full.txt URL, NotebookLM guidance rewritten
- `src/en-US/ai-guide/index.md` — same for en-US
- `docs/development/base-path.md` — endpoint list: replaced `/ai-index.json` with `/llms-full.txt` + `/en-US/llms-full.txt`
- `docs/development/pdf-text-extraction.md` — all functional ai-index references replaced
- `docs/development/ai-index-core-generation-files.md` — fully rewritten to describe `llms-full.njk`
- `src/_data/pdfTextCache.js` — header comment updated
- `README.md` — 11 functional references repointed to `llms-full.txt`

---

## Deviations from Plan

1. **`cfRaw()` instead of `cf()`** in `llms-full.njk`: `cfRaw()` is already in `i18n.njk` (added in #16) specifically for plain-text / non-HTML contexts. It applies `| safe` so `&`, `<`, `'` are not entity-encoded in Markdown output. The plan mentioned `cf()` but also noted the `cfRaw` pattern from the `llms-txt.njk` sibling — `cfRaw()` is the correct choice.

2. **`ai-index-core-generation-files.md` filename not renamed**: The plan flagged the optional rename to `llms-full-core-generation-files.md` but said "don't block on it." The file was not renamed to avoid churn. A meta-comment in the file explains this intentional decision. The remaining `ai-index` string in `docs/development/` is this filename reference, not a functional link.

3. **`ai-guide` link form uses `site.url` literal**: `{{ site.url }}/llms-full.txt` (no `| url`) because `site.url` already carries the subpath. Adding `| url` would double-prefix. Confirmed in rendered HTML: `https://dylankuo84137.github.io/course-site-starter/llms-full.txt`.

---

## Tests Written

This feature has no unit-testable logic — the output is verified via build artifact inspection (E2E gate above). No new test files.

---

## Ordering Dependencies (resolved)

- `#16 ↔ #17`: `llms-full.txt` preamble links to `/llms.txt` (the discovery index from #16). #16 merged at `07af367` — link is live. ✅
- `for-ai.njk` stale references: #16 retired `/for-ai/` entirely, making those stale links moot. ✅
