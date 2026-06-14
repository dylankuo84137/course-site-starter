# Report: llms-txt-locale-link-fix

## Branch
`feat/30-llms-txt-locale-link-fix`

## Tasks Completed

- ✅ Task 1: `llms-txt.njk` — replaced hardcoded `/llms-full.txt` with `_fullUrl` var derived via inline-if idiom
- ✅ Task 2: `llms-full.njk` — replaced two hardcoded literals (`/llms.txt` and `/en-US/llms.txt`) with `_discoveryUrl` var derived via inline-if idiom
- ✅ Task 3: Build verification — all four cross-links correct in both default and subpath builds

## Validation Results

| Gate | Result |
|------|--------|
| `npm run validate` | ✅ PASS — 0 errors, 0 warnings |
| `npm run build` | ✅ PASS |
| `ELEVENTY_BASE="/course-site-starter/" npm run build` | ✅ PASS |
| `/llms.txt` → `/llms-full.txt` | ✅ |
| `/en-US/llms.txt` → `/en-US/llms-full.txt` | ✅ |
| `/llms-full.txt` → `/llms.txt` | ✅ |
| `/en-US/llms-full.txt` → `/en-US/llms.txt` | ✅ |
| No hardcoded `/en-US/llms` literals | ✅ |
| Subpath prefix on all four links | ✅ `/course-site-starter/...` present |

## Files Changed

| File | Change |
|------|--------|
| `src/ai-discovery/llms-txt.njk` | Line 14: added `_fullUrl` set var above, removed literal `/llms-full.txt` |
| `src/ai-discovery/llms-full.njk` | Line 14: added `_discoveryUrl` set var above, replaced both hardcoded literals |

## Tests Written
No unit tests — these are Nunjucks template files; correctness verified by build output inspection per the plan's validation strategy.

## Deviations from Plan
None. All changes match the exact code snippets in the plan.
