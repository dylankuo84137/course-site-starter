# Plan: Abolish `metadata.tags` (tags are per-language only)

## Summary
The 2026-06-13 grill session decided tags exist **only per-language** (`i18n.{lang}.tags`); the language-neutral `metadata.tags` layer is abolished (CONTEXT.md → Tags). Today it survives as an always-empty merge input: `tagHelpers.getCourseTags()` merges it (`src/_data/tagHelpers.js:13-15`), the validator type-checks it (`src/_data/course-validator.js:217-219`), every course config plus the template carries `"tags": []` under `metadata`, the migration script still *writes* it (`scripts/migration/migrate-material-schema.mjs:155-161`), and `docs/development/material-system.md:69` still directs legacy root tags into it. This refactor removes the field everywhere, flips the validator from type-check to legacy-key rejection (build-failing error, like the other blocked legacy keys documented in `material-system.md:62-69`), and deletes the "Abolition decided, not yet implemented" note from CONTEXT.md. All 10 `getCourseTags` call sites keep working unchanged because the function signature and per-locale output are identical (the neutral input is `[]` in every config — verified).

## User Story
As a maintainer of the course-site data layer, I want `metadata.tags` removed from code, configs, validator, and docs so that the per-language-only tag model is the only model — no dead escape hatch a future config can silently reintroduce and the client (which only sees `i18n`) can never reproduce.

## Metadata
| Field | Value |
|-------|-------|
| Type | REFACTOR |
| Complexity | LOW |
| Systems affected | Tag selection (`tagHelpers.js`), course-data validation, course configs + template, migration script, docs (CONTEXT.md, material-system.md) |
| Issue | #6 |

## Verified Facts (assumptions already checked — do not re-derive)
- **Current formula:** `getCourseTags` (`src/_data/tagHelpers.js:12-20`) returns `dedupe([...metadata.tags, ...i18n[lang].tags].filter(Boolean))`. The doc comment (lines 4-6) documents the merge and calls `metadata.tags` "the neutral escape hatch" — both must change. Abolished formula: `dedupe(i18n[lang].tags.filter(Boolean))`.
- **`metadata.tags` is `[]` in every config:** `course_2a_nenggao_113_summer.json:8`, `course_3a_sunshot_113_summer.json:8`, `course_4a_journey-to-the-west_114_autumn.json:8`, `course_9c_modern-history_114_autumn.json:8`. The template `src/_data/course-configs/course_template.json:11-12` additionally has a `_comment_tags` line describing the escape hatch — delete both lines. (Per-locale `_comment_tags`/`tags` at template lines 38-39 and 72-73 stay.)
- **No error-level legacy-key rejection pattern exists in the validator.** Despite `material-system.md:62-69` saying "The validator rejects these keys", `drive_folders`/`google_docs`/`youtube_videos` are only caught by the unknown-root-key **warning** (`course-validator.js:32` `ALLOWED_ROOT_KEYS`, lines 98-101) — root-level only, so it can never catch `metadata.tags`. The new rejection is therefore a fresh `addError` inside `validateMetadata` (lines 209-220), written in the file's existing `addError(message, field)` style.
- **Errors fail the gate; warnings don't.** `npm run validate` → `scripts/validation/validate-courses.js:24-26` exits 1 when any course has errors. `.claude/validate.sh` runs `npm run validate` first, so an error fails the whole gate.
- **The validator skips the template:** `validateAllCourses` filters out `course_template.json` (`course-validator.js:233-237`). The negative test must inject `metadata.tags` into a *real* config, not the template.
- **Key-presence check precedent:** `'tags' in i18n[lang]` at `course-validator.js:188` — use the same `'tags' in metadata` form so even `"tags": []` is rejected (the key is abolished, not just non-empty values).
- **Consumers need zero changes (confirmed, exhaustive list):** `src/feed.njk:32`, `src/_includes/layouts/base.njk:35`, `src/courses/index.njk:107`, `src/courses/home.njk:55`, `src/ai-discovery/ai-index.njk:94-95,274-279`, `.eleventy.js:69` (global data registration at `.eleventy.js:246`). All call `tagHelpers.getCourseTags(course, lang)`; signature and output are unchanged because the neutral input is empty everywhere.
- **Client JS already matches the abolished formula:** `public/js/lang-dynamic.js` pill re-render (issue #5) derives tags from `i18n.{lang}.tags` only — no `metadata.tags` reference anywhere under `public/`. No client change.
- **Migration script writes the abolished key:** `scripts/migration/migrate-material-schema.mjs:155-161` merges legacy root-level `tags` into `newCourse.metadata.tags`. Left alone, a future migration would emit configs the new validator hard-rejects. Replace the merge with a console warning telling the operator to place tags in `i18n.{lang}.tags`.
- **Docs touchpoints:** `CONTEXT.md:58-61` (the "Abolition decided, not yet implemented" blockquote — remove; the `_Avoid_` line 55-56 already says "abolished" and stays). `docs/development/material-system.md:69` ("Root-level `tags` → use `metadata.tags`" — retarget to `i18n.{lang}.tags`). `docs/development/i18n-architecture.md:80` mentions `metadata.tags` only as past-tense history of the issue-#5 bug class — leave it.
- **Historical artifacts to leave untouched:** `.agents/plans/completed/per-language-tags.plan.md`, `.agents/plans/rerender-tag-pills-on-lang-switch.plan.md`, `docs/superpowers/plans/2026-06-10-claude-md-piv-migration.md` — plan/spec records, not live docs.
- **Issue body unavailable in the planning session** (`gh` and web access denied by permissions). Touchpoints were taken from the grill-session note in `CONTEXT.md:58-61`, which lists the same four code touchpoints, and verified against the code; the migration script and `material-system.md:69` were found by repo-wide grep and added on top.

## Patterns to Follow

**1. Helper to rewrite — current state:**
```javascript
// SOURCE: src/_data/tagHelpers.js:1-22 (entire file)
// Mirrors the helper module shape of materialHelpers.js (src/_data/materialHelpers.js:195-202)

/**
 * Returns the locale-specific tags for a course.
 * Formula: dedupe(metadata.tags ++ i18n[lang].tags)
 * metadata.tags is the neutral escape hatch for untranslatable tokens.
 * ...
 */
function getCourseTags(course, lang) {
  const neutral = (course && course.metadata && Array.isArray(course.metadata.tags))
    ? course.metadata.tags
    : [];
  const localeTags = (course && course.i18n && course.i18n[lang] && Array.isArray(course.i18n[lang].tags))
    ? course.i18n[lang].tags
    : [];
  return Array.from(new Set([...neutral, ...localeTags].filter(Boolean)));
}

module.exports = { getCourseTags };
```

**2. Validator block to replace, and the `addError` style + key-presence form to mirror:**
```javascript
// SOURCE: src/_data/course-validator.js:217-219 (the block being replaced)
  if (metadata.tags && !Array.isArray(metadata.tags)) {
    addError('metadata.tags must be an array', 'metadata.tags');
  }
```
```javascript
// SOURCE: src/_data/course-validator.js:188-190 ('key in object' presence-check precedent)
    if ('tags' in i18n[lang] && !Array.isArray(i18n[lang].tags)) {
      addError(`i18n.${lang}.tags must be an array`, `i18n.${lang}.tags`);
    }
```

**3. Config field to delete (identical in all four configs; template adds a comment line):**
```json
// SOURCE: src/_data/course-configs/course_2a_nenggao_113_summer.json:5-9
    "domain_category": "nature",
    "teacher_name": "王琬婷/Wang Wan-Ting",
    "tags": []
  },
```
```json
// SOURCE: src/_data/course-configs/course_template.json:10-13
    "teacher_name": "teacher-name",
    "_comment_tags": "中性逸出口，用於無法翻譯的標記（專有名詞縮寫、年份等）。大多數課程保持空陣列即可。",
    "tags": []
  },
```

**4. Migration-script block to replace (console messaging style: `[migrate-material-schema]` prefix, see lines 168, 178+):**
```javascript
// SOURCE: scripts/migration/migrate-material-schema.mjs:155-161
  if (Array.isArray(course.tags) && course.tags.length > 0) {
    const existingTags = Array.isArray(newCourse.metadata.tags) ? newCourse.metadata.tags : [];
    const merged = Array.from(new Set([...existingTags, ...course.tags]));
    if (merged.length > 0) {
      newCourse.metadata.tags = merged;
    }
  }
```

**5. Docs blockquote to remove:**
```markdown
<!-- SOURCE: CONTEXT.md:58-61 -->
> **Abolition decided, not yet implemented:** `metadata.tags` is still in code as an (always
> empty) merge input. Removal touches: `tagHelpers.js` (merge → pure per-locale selection),
> `course-validator.js:217` (type-check → reject as legacy key), `course_template.json` +
> the four course configs (delete the empty field).
```

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `src/_data/tagHelpers.js` | UPDATE | Merge → pure per-locale selection; doc comment drops the neutral layer |
| `src/_data/course-configs/course_2a_nenggao_113_summer.json` | UPDATE | Delete `metadata.tags: []` (line 8) |
| `src/_data/course-configs/course_3a_sunshot_113_summer.json` | UPDATE | Delete `metadata.tags: []` (line 8) |
| `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json` | UPDATE | Delete `metadata.tags: []` (line 8) |
| `src/_data/course-configs/course_9c_modern-history_114_autumn.json` | UPDATE | Delete `metadata.tags: []` (line 8) |
| `src/_data/course-configs/course_template.json` | UPDATE | Delete metadata `_comment_tags` + `tags: []` (lines 11-12) |
| `src/_data/course-validator.js` | UPDATE | Replace type-check with legacy-key rejection (error) |
| `scripts/migration/migrate-material-schema.mjs` | UPDATE | Stop writing `metadata.tags`; warn instead |
| `docs/development/material-system.md` | UPDATE | Legacy mapping: root `tags` → `i18n.{lang}.tags` |
| `CONTEXT.md` | UPDATE | Remove the "Abolition decided, not yet implemented" blockquote |

Task order keeps `npm run validate` green after every step: helper first (no behavior change — neutral input is empty), then config cleanup (absent key is legal under the *current* validator's `metadata.tags &&` guard), and only then the validator flip (all configs are clean by that point).

## Tasks

### Task 1: Make `getCourseTags` pure per-locale selection
- File: `src/_data/tagHelpers.js`
- Action: UPDATE
- Implement: Delete the `neutral` computation (lines 13-15) and the spread of it (line 19) so the function returns `Array.from(new Set(localeTags.filter(Boolean)))`. Rewrite the doc comment: formula becomes `dedupe(i18n[lang].tags)`; drop the "neutral escape hatch" sentence (line 6); state tags exist only per-language (untranslatable tokens are written into each locale's list — see CONTEXT.md → Tags). Keep the module-shape comment on line 1, the signature, and the export unchanged.
- Mirror: `src/_data/tagHelpers.js:16-19` (existing guarded-array + dedupe style)
- Validate: `node --check src/_data/tagHelpers.js && npm run validate`

### Task 2: Delete `metadata.tags` from the four course configs
- Files: `src/_data/course-configs/course_2a_nenggao_113_summer.json`, `course_3a_sunshot_113_summer.json`, `course_4a_journey-to-the-west_114_autumn.json`, `course_9c_modern-history_114_autumn.json`
- Action: UPDATE
- Implement: In each file, remove line 8 (`"tags": []`) and the trailing comma on the preceding `teacher_name` line so the `metadata` object stays valid JSON. Touch nothing in `i18n`.
- Mirror: Pattern 3 above (the exact lines)
- Validate: `npm run validate` (also confirms JSON parses)

### Task 3: Delete `metadata.tags` from the template
- File: `src/_data/course-configs/course_template.json`
- Action: UPDATE
- Implement: Remove lines 11-12 (`"_comment_tags": …` and `"tags": []`) and the trailing comma on line 10 (`teacher_name`). The per-locale `_comment_tags`/`tags` blocks (lines 38-39, 72-73) stay.
- Mirror: Pattern 3 above
- Validate: `node -e "JSON.parse(require('fs').readFileSync('src/_data/course-configs/course_template.json','utf8'))" && npm run validate`

### Task 4: Validator — reject `metadata.tags` as a legacy key
- File: `src/_data/course-validator.js`
- Action: UPDATE
- Implement: Replace the block at lines 217-219 inside `validateMetadata` with a key-presence rejection:
  ```javascript
  if ('tags' in metadata) {
    addError('metadata.tags is a legacy key — tags are per-language only; use i18n.{lang}.tags', 'metadata.tags');
  }
  ```
  `addError` (not `addWarning`): abolished keys must fail the build, and the error message names the replacement, matching the doc's "Legacy Keys (Blocked)" framing (`docs/development/material-system.md:62-69`).
- Mirror: `src/_data/course-validator.js:188-190` (`'tags' in …` presence check), `course-validator.js:217-218` (message/field style)
- Validate: `npm run validate` (must pass — configs were cleaned in Tasks 2-3), then the negative test in the Validation section.

### Task 5: Migration script — stop writing `metadata.tags`
- File: `scripts/migration/migrate-material-schema.mjs`
- Action: UPDATE
- Implement: Replace lines 155-161 with a warning that does not mutate the course:
  ```javascript
  if (Array.isArray(course.tags) && course.tags.length > 0) {
    console.warn(`[migrate-material-schema] Root-level tags found (${course.tags.join(", ")}); metadata.tags is abolished — add them to i18n.{lang}.tags manually.`);
  }
  ```
- Mirror: `scripts/migration/migrate-material-schema.mjs:168` (console message prefix style)
- Validate: `node --check scripts/migration/migrate-material-schema.mjs && npm run validate`

### Task 6: Docs — retarget legacy mapping, remove the CONTEXT.md note
- Files: `docs/development/material-system.md`, `CONTEXT.md`
- Action: UPDATE
- Implement:
  1. `material-system.md:69`: change `- Root-level \`tags\` → use \`metadata.tags\`` to `- Root-level \`tags\` / \`metadata.tags\` → use \`i18n.{lang}.tags\` (tags are per-language only)`.
  2. `CONTEXT.md`: delete the blockquote at lines 58-61 ("Abolition decided, not yet implemented…") and the blank line left behind. The `_Avoid_` sentence (lines 55-56) stays — it remains true and is now fully accurate.
- Mirror: surrounding list/blockquote formatting in each file
- Validate: `npm run validate`

### Task 7: Full gate + negative test + E2E parity check
- Action: VERIFY (no code)
- Implement: run `.claude/validate.sh`, then the negative test and E2E checklist below.
- Validate: all items pass; the temporary config edit from the negative test is reverted (confirm `git status` is clean of it).

## Validation

**Automated gate:**
```bash
npm run validate                                      # course-data integrity (exits 1 on error)
npm run build:full                                    # full build
ELEVENTY_BASE="/course-site-starter/" npm run build   # subpath build
```
(`.claude/validate.sh` runs exactly these three.)

**Negative test (validator actually blocks the legacy key):**
1. Temporarily add `"tags": ["smoke-test"]` inside `metadata` of `src/_data/course-configs/course_2a_nenggao_113_summer.json` (a real config — the validator skips `course_template.json`, `course-validator.js:233-237`).
2. Run `npm run validate` → must **exit non-zero** and print the `metadata.tags is a legacy key` error for that file.
3. Also verify `"tags": []` (empty array) is rejected the same way — the key itself is abolished.
4. Revert the edit; `npm run validate` passes again.

**E2E checklist** (dev server: `npm run dev:fast`):
- [ ] `/courses/` cards show the same tag pills as before the change in both languages (zh-TW: e.g. `#戲劇 #黑板畫 #工作本`; en-US: `#drama #blackboard drawings #workbook`) — output parity, since the removed merge input was always empty.
- [ ] Language switch on `/courses/` still re-renders pills correctly (issue #5 behavior intact).
- [ ] `<meta name="keywords">` on a course page (`base.njk:35`) still includes the locale's course tags.
- [ ] Built `ai-index` and feed outputs still contain per-locale tag arrays (`src/ai-discovery/ai-index.njk:94-95`, `src/feed.njk:32`).
- [ ] Grep the repo for `metadata.tags`: remaining hits are only historical artifacts (`docs/development/i18n-architecture.md:80`, `.agents/plans/*`, `docs/superpowers/*`) and the new validator error message / migration warning.

## Risks
1. **Validator rejection breaks older/external configs.** Any not-yet-migrated config (or a future one copied from an old template) carrying `metadata.tags` now hard-fails `npm run validate`. Intended behavior; mitigated by the error message naming the replacement (`i18n.{lang}.tags`) and by Task 3 fixing the template people copy from.
2. **Output drift in `getCourseTags`.** Only possible if some config had non-empty `metadata.tags` — verified false for all four configs (each is `[]` at line 8), so rendered tags are byte-identical. The E2E parity checks confirm.
3. **Migration script regression.** The script is a one-time legacy tool; removing the tags merge changes its output for legacy inputs with root `tags`. Mitigated by the explicit warning telling the operator where tags now live — silently inventing a locale for untranslated tags would be worse.
4. **JSON syntax slips during config edits** (trailing commas). Caught immediately by `npm run validate`, which parses every config (`course-validator.js:242,250-255`).

## Acceptance Criteria
- [ ] All tasks completed
- [ ] `getCourseTags` reads only `i18n.{lang}.tags`; no `metadata.tags` reference left in `src/`, `public/`, `.eleventy.js`, or `scripts/` (except the validator's rejection message and the migration warning)
- [ ] Validator **errors** (not warns) on any config where `'tags' in metadata`, including `[]` — negative test demonstrated and reverted
- [ ] All four configs + template no longer contain `metadata.tags`
- [ ] CONTEXT.md "Abolition decided, not yet implemented" note removed; `material-system.md` legacy mapping points to `i18n.{lang}.tags`
- [ ] `.claude/validate.sh` passes with zero errors; rendered tag output is unchanged in both languages (E2E parity checks)
