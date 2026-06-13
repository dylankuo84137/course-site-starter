# Implementation Report: Abolish `metadata.tags`

**Branch:** `feat/6-abolish-metadata-tags`
**Issue:** #6
**Plan:** `.agents/plans/abolish-metadata-tags.plan.md`

## Tasks Completed

| Task | Status | Notes |
|------|--------|-------|
| 1. `tagHelpers.js` — pure per-locale selection | ✅ | Removed `neutral` var and spread; updated doc comment |
| 2. Delete `metadata.tags` from 4 course configs | ✅ | Removed `"tags": []` + trailing comma from each |
| 3. Delete `metadata.tags` from template | ✅ | Removed `_comment_tags` + `"tags": []` lines |
| 4. Validator — legacy-key rejection | ✅ | `'tags' in metadata` → `addError`; negative test confirmed |
| 5. Migration script — warn, don't write | ✅ | Replaced merge block with `console.warn` |
| 6. Docs — `material-system.md` + `CONTEXT.md` | ✅ | Retargeted mapping; removed "not yet implemented" blockquote |
| 7. Full gate + negative test | ✅ | `validate.sh` exits 0; negative test errors on both `[]` and non-empty |

## Validation Results

- `npm run validate`: ✅ 0 errors, 0 warnings, 4 courses
- `npm run build:full`: ✅ 67 files written
- `ELEVENTY_BASE="/course-site-starter/" npm run build`: ✅ (via validate.sh, exit 0)
- Negative test: `metadata.tags` (with `["smoke-test"]` and with `[]`) → error fires, reverted cleanly

## Files Changed

| File | Change |
|------|--------|
| `src/_data/tagHelpers.js` | Simplified to pure per-locale formula |
| `src/_data/course-validator.js` | `'tags' in metadata` hard error |
| `src/_data/course-configs/course_2a_nenggao_113_summer.json` | Deleted `metadata.tags` |
| `src/_data/course-configs/course_3a_sunshot_113_summer.json` | Deleted `metadata.tags` |
| `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json` | Deleted `metadata.tags` |
| `src/_data/course-configs/course_9c_modern-history_114_autumn.json` | Deleted `metadata.tags` |
| `src/_data/course-configs/course_template.json` | Deleted `_comment_tags` + `tags` |
| `scripts/migration/migrate-material-schema.mjs` | Replaced merge with `console.warn` |
| `docs/development/material-system.md` | Retargeted legacy mapping to `i18n.{lang}.tags` |
| `CONTEXT.md` | Removed "Abolition decided, not yet implemented" blockquote |

10 files changed, 25 insertions(+), 33 deletions(-)

## Deviations from Plan

**None.** All assumptions in the plan were verified correct against the actual code.

**Setup note:** The worktree had no `node_modules` (NFS mount; worktrees don't inherit node_modules). Symlinked from the main repo (`ln -s .../course-site-starter/node_modules`) to run the full build gate. The symlink is untracked and was not committed.

## Tests Written

The plan specified a **negative test** (not a persistent test file) — inject `metadata.tags` into a real config, confirm error fires, revert. Executed and confirmed:
- `"tags": ["smoke-test"]` → validator errors with `metadata.tags is a legacy key`
- `"tags": []` → same error (key presence is what matters)
- Reverted; `npm run validate` passes clean

No permanent test files added — consistent with the project's validation approach (no test suite; the `npm run validate` script is the gate).

## Acceptance Criteria

- [x] All tasks completed
- [x] `getCourseTags` reads only `i18n[lang].tags`; no live `metadata.tags` reference in `src/`, `public/`, `.eleventy.js`, or `scripts/` (only validator message + migration warning)
- [x] Validator errors (not warns) on any config where `'tags' in metadata`, including `[]`
- [x] All four configs + template no longer contain `metadata.tags`
- [x] CONTEXT.md note removed; `material-system.md` legacy mapping points to `i18n.{lang}.tags`
- [x] `.claude/validate.sh` passes with exit 0
