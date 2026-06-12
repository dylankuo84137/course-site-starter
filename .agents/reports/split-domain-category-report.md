# Implementation Report: split-domain-category

**Branch:** `feat/1-split-domain-category`  
**Commit:** c41a2c2  
**Plan:** `.agents/plans/split-domain-category.plan.md`

---

## Tasks Completed

| Task | Status | Notes |
|---|---|---|
| 1 — Backfill 4 live course JSONs | ✅ | subject+format added, domain_category removed |
| 2 — Update course_template.json | ✅ | _comment_ entries updated |
| 3 — Update course-validator.js | ✅ | VALID_SUBJECTS/VALID_FORMATS consts + enum guards |
| 4 — Update i18n files | ✅ | subject_labels, format_labels added; category anchors fixed |
| 5 — Update src/index.njk | ✅ | domain_category → subject |
| 6 — Update src/courses/index.njk | ✅ | data-domain value source updated |
| 7 — Update ai-index.njk | ✅ | metadata block + statistics aggregation |
| 8 — Update for-ai.njk | ✅ | 4 references updated |
| 9 — Update i18n-architecture.md | ✅ | Example schema updated |
| 10 — Update ADR 0001 status | ✅ | `accepted (not yet implemented)` → `accepted (implemented)`; implementation-status callout removed |
| 11 — Full validation pass | ✅ | All three build commands pass |

---

## Validation Results

```
npm run validate     → ✅ 0 errors, 0 warnings (4 courses)
npm run build:full   → ✅ exit 0, 64 pages indexed
ELEVENTY_BASE=...    → ✅ exit 0
```

**ai-index.json verification:**
- All 4 courses have `subject` + `format`; no `domain_category` field present
- `statistics.domains` = `["nature", "arts", "language", "social"]`
- `/for-ai/` rendered page: 0 occurrences of `domain_category`

---

## Files Changed (13 updated, 0 created)

- `src/_data/course-configs/course_2a_nenggao_113_summer.json`
- `src/_data/course-configs/course_3a_sunshot_113_summer.json`
- `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json`
- `src/_data/course-configs/course_9c_modern-history_114_autumn.json`
- `src/_data/course-configs/course_template.json`
- `src/_data/course-validator.js`
- `src/_data/i18n/zh-TW.json`
- `src/_data/i18n/en-US.json`
- `src/index.njk`
- `src/courses/index.njk`
- `src/ai-discovery/ai-index.njk`
- `src/ai-discovery/for-ai.njk`
- `docs/development/i18n-architecture.md`
- `docs/adr/0001-split-domain-category-into-subject-and-format.md`

---

## Deviations from Plan

1. **ADR implementation-status callout removed** — The plan said change `status:` front-matter only. The ADR also had a prominent callout block describing it as "not yet implemented." Removing that callout was the correct action since it describes past state, not the new state; noted here as a deviation.

2. **`9c-modern-history subject=social` — confirmed against archive** — The plan flagged this as lowest-confidence. The `112-114-syllabus-and-teaching-records/projects/course-lookup.csv` archive was accessed and confirmed that Modern History (現代史) at G9 falls in the 社會 bucket (same cluster as other G-level 社會 courses like `G8啟蒙與革命`). CONTEXT.md also explicitly maps 歷史 → 社會. Confidence upgraded from ⚠️ to confirmed.

---

## Acceptance Criteria Status

- [x] All 4 live course JSONs have `metadata.subject` and `metadata.format`; `metadata.domain_category` absent
- [x] `course_template.json` uses `subject` and `format` with `_comment_` entries; no `domain_category`
- [x] `course-validator.js` requires `subject` + `format`; known-slug enums present; `domain_category` triggers deprecation warning
- [x] `src/index.njk` reads from `metadata.subject`
- [x] `src/courses/index.njk` `data-domain` emits subject slug
- [x] `ai-index.json` has `subject` + `format` per course; `domain_category` gone; `domains` array is subject slugs
- [x] `/for-ai/` page has no `domain_category` text
- [x] `npm run validate` passes with 0 errors
- [x] `npm run build:full` exits 0
- [x] `ELEVENTY_BASE="/course-site-starter/" npm run build` exits 0
- [x] ADR 0001 status updated to `accepted (implemented)`
- [x] Backfill values confirmed against archive (esp. `9c-modern-history subject=social`)

---

## Next Step

Run `/validate split-domain-category.plan.md` in a fresh session for full gate + E2E + human review.
