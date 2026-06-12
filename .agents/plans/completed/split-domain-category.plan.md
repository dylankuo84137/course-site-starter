# Plan: Split `domain_category` into `subject` + `format`

## Summary

Replace the legacy `metadata.domain_category` field (which conflated two orthogonal concepts)
with two clean fields: `metadata.subject` (Subject Domain slug, exposed as the public filter)
and `metadata.format` (Teaching Format slug, stored but not filtered). All 4 real course JSONs
must receive both fields. The public `/courses/` filter continues to work via `data-domain`
HTML attributes—only the value source changes. Chinese display labels are resolved through new
`subject_labels` / `format_labels` maps added to both i18n files.

## User Story

As a site visitor browsing `/courses/`, I want the "Domain" filter to list coherent subject
areas (Nature, Arts, Language Arts, Social Studies) rather than a mixed bag of subjects and
format labels, so that I can find courses by what they teach rather than how they are taught.

## Metadata

| Field | Value |
|---|---|
| Type | Data migration + schema change |
| Complexity | Medium |
| Systems affected | Course JSON schema · Validator · Homepage grouping · Course index filter · AI-discovery endpoints |
| Issue | #1 (decision in ADR-0001) |
| ADR | `docs/adr/0001-split-domain-category-into-subject-and-format.md` |

---

## Blockers / Prerequisites

### BLOCKER (soft): `112-114-syllabus-and-teaching-records` archive not accessible

**Finding:** A full-text search of the repo returns only the ADR document as a reference to
`112-114-syllabus-and-teaching-records`. No file, Google-Sheet export, CSV, or JSON with that
name exists under any directory in the working tree. The archive is an external resource
(Google Drive / Sheets) that has not been downloaded into the repo.

**Impact:** The ADR says "the missing axis is hand-backfilled from the archive." For the 4
live courses the missing axis can be reliably *inferred* from the existing i18n `unit` and
`domain` display fields (see backfill table below), so the migration is unblocked in practice.
However, **the implementer cannot independently verify** that the inferred values match the
canonical archive records. The plan owner must confirm the table below before merging, or
accept the inferred values as authoritative.

**Backfill table (inferred from existing i18n unit + domain fields):**

| Course slug | Current `domain_category` | Inferred `subject` | Inferred `format` | Evidence |
|---|---|---|---|---|
| `2a-nenggao-113-summer` | `nature` | `nature` | `class-drama` | zh-unit=班級戲劇, zh-domain=自然主課, en-domain="Main Lesson - Nature" |
| `3a-sunshot-113-summer` | `arts` | `arts` | `class-drama` | zh-unit=班級戲劇, zh-domain=藝術課程, en-domain="Arts Program" |
| `4a-journey-to-the-west-114-autumn` | `main-lesson` | `language` | `main-lesson` | zh-unit=語文主課, zh-domain=語文, en-domain="Language Arts" |
| `9c-modern-history-114-autumn` | `main-lesson` | `social` | `main-lesson` | zh-unit=主課程, zh-domain=歷史 (→ 社會 in CONTEXT.md enum), en-domain="History" ⚠️ needs confirmation |

> ⚠️ `9c-modern-history` subject=`social` is the most uncertain mapping. "歷史" (History) sits
> in the 社會 (Social Studies) bucket in the CONTEXT.md enum (語文, 社會, 數學, 自然, 藝術, 體育,
> 輔導, 特教, 其他), but this should be confirmed against the archive or with the site owner
> before merge.

---

## Patterns to Follow

### Pattern 1 — `validateMetadata` required-field list and enum checks
```js
// SOURCE: src/_data/course-validator.js:205-216
function validateMetadata(metadata, addError, addWarning) {
  const requiredMetadata = ['grade_level', 'domain_category', 'teacher_name'];
  
  for (const field of requiredMetadata) {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      addWarning(`Missing or invalid metadata field: ${field}`, `metadata.${field}`);
    }
  }
  if (metadata.tags && !Array.isArray(metadata.tags)) {
    addError('metadata.tags must be an array', 'metadata.tags');
  }
}
```
Mirror: change `requiredMetadata` to `['grade_level', 'subject', 'format', 'teacher_name']`;
add separate enum-check blocks for `subject` and `format` using `addWarning`.

### Pattern 2 — homepage.categories slug → label mapping in i18n files
```json
// SOURCE: src/_data/i18n/zh-TW.json:24-29
"categories": [
  { "label": "藝術課程", "description": "...", "anchor": "arts", "icon": "🎨" },
  { "label": "自然主題", "description": "...", "anchor": "nature", "icon": "🌿" },
  { "label": "主課程",   "description": "...", "anchor": "main-lesson", "icon": "📖" },
  { "label": "歷史主課", "description": "...", "anchor": "history", "icon": "🕰️" }
]
```
The `anchor` field is matched against `course.metadata.domain_category` (line 35-36 of
`src/index.njk`). After the migration, `anchor` values must be valid **subject slugs** so they
match `course.metadata.subject`. `main-lesson` is a *format*, not a subject — replace it with
`language`. `history` is not a defined slug — replace it with `social`.

### Pattern 3 — data-domain attribute on course cards
```nunjucks
{# SOURCE: src/courses/index.njk:58-66 #}
<article
  class="course-card home-course-card"
  data-course-slug="{{ c.slug }}"
  data-course-i18n="{{ c.i18n | json }}"
  data-grade="{{ c.metadata.grade_level if c.metadata else '' }}"
  data-domain="{{ c.metadata.domain_category if c.metadata else '' }}"
  data-teacher="{{ c.metadata.teacher_name if c.metadata else '' }}"
>
```
Mirror exactly — only the value inside `data-domain` changes from `c.metadata.domain_category`
to `c.metadata.subject`. The `data-domain` attribute name stays; `course-filters.js` reads
`card.dataset.domain` and requires no changes.

### Pattern 4 — ai-index.njk metadata block (current)
```nunjucks
{# SOURCE: src/ai-discovery/ai-index.njk:86-91 #}
"metadata": {
  "grade_level": "{{ metadata.grade_level }}",
  "domain_category": "{{ metadata.domain_category }}",
  "teacher_name": "{{ metadata.teacher_name }}",
  "heroImage": {% if course.hero_image %}"{{ course.hero_image }}"{% else %}null{% endif %}
},
```
Mirror: replace the single `domain_category` line with two lines:
`"subject": "{{ metadata.subject }}"` and `"format": "{{ metadata.format }}"`.

### Pattern 5 — ai-index.njk statistics aggregation (current)
```nunjucks
{# SOURCE: src/ai-discovery/ai-index.njk:261-266 #}
{%- if course.metadata.domain_category and allDomains.indexOf(course.metadata.domain_category) == -1 -%}
  {%- set allDomains = allDomains.concat([course.metadata.domain_category]) -%}
{%- endif -%}
```
Mirror: replace `course.metadata.domain_category` with `course.metadata.subject` in both
the guard condition and the `concat` call.

---

## Files to Change

| File | Action | Purpose |
|---|---|---|
| `src/_data/course-configs/course_2a_nenggao_113_summer.json` | UPDATE | Add `subject: "nature"`, `format: "class-drama"`; remove `domain_category` |
| `src/_data/course-configs/course_3a_sunshot_113_summer.json` | UPDATE | Add `subject: "arts"`, `format: "class-drama"`; remove `domain_category` |
| `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json` | UPDATE | Add `subject: "language"`, `format: "main-lesson"`; remove `domain_category` |
| `src/_data/course-configs/course_9c_modern-history_114_autumn.json` | UPDATE | Add `subject: "social"`, `format: "main-lesson"`; remove `domain_category` (⚠️ confirm `social`) |
| `src/_data/course-configs/course_template.json` | UPDATE | Replace `domain_category` field + comment with `subject` and `format` fields + comments |
| `src/_data/course-validator.js` | UPDATE | Line 206: swap required-field list; add subject/format enum guards |
| `src/_data/i18n/zh-TW.json` | UPDATE | Add `subject_labels` + `format_labels` maps; fix `homepage.categories` anchors |
| `src/_data/i18n/en-US.json` | UPDATE | Add `subject_labels` + `format_labels` maps; fix `homepage.categories` anchors |
| `src/index.njk` | UPDATE | Line 25: `course.metadata.domain_category` → `course.metadata.subject` |
| `src/courses/index.njk` | UPDATE | Line 64: value in `data-domain` attribute → `c.metadata.subject` |
| `src/ai-discovery/ai-index.njk` | UPDATE | Lines 88-89, 265-266: replace domain_category refs with subject (+ add format) |
| `src/ai-discovery/for-ai.njk` | UPDATE | Lines 73, 279, 306, 378: update example JSON snippets + prose |
| `docs/development/i18n-architecture.md` | UPDATE | Line 16: update example metadata schema |

**Totals: 0 files created, 13 files updated.**

---

## Tasks

### Task 1 — Backfill: add `subject` + `format` to all 4 live course JSONs

**File:** All 4 `src/_data/course-configs/course_*.json` (excluding template)  
**Action:** In each `"metadata"` object, remove `"domain_category"` and insert two new fields
immediately after `"grade_level"`:

```json
"subject": "<slug>",
"format": "<slug>",
```

**⚠️ HITL — values must be human-confirmed before merge.** Issue #1 states an AFK agent
*cannot* infer the missing axis; the authoritative source is the
`112-114-syllabus-and-teaching-records` archive, which is NOT in the repo. The values below
are an **inferred proposal** (derived from existing i18n display fields) to unblock review —
treat them as provisional. The plan owner must confirm each against the archive (or
explicitly accept as provisional) before this task is done.

Proposed values per course (pending human confirmation):
- `2a-nenggao`: `subject: "nature"`, `format: "class-drama"`
- `3a-sunshot`: `subject: "arts"`, `format: "class-drama"`
- `4a-journey`: `subject: "language"`, `format: "main-lesson"`
- `9c-modern-history`: `subject: "social"`, `format: "main-lesson"` ⚠️ lowest confidence

**Mirror:** The pattern of `"_comment_grade_level"` / `"grade_level"` pairing from
`course_template.json:5-6` — do NOT add comment keys to live course JSONs (only template
has comment annotations).

**Validate:** `npm run validate` — must pass with no new errors (the validator still checks
for `domain_category` until Task 3 is done, so expect warnings; errors are the blocker).

---

### Task 2 — Update `course_template.json` schema

**File:** `src/_data/course-configs/course_template.json`  
**Action:** Replace:
```json
"_comment_domain_category": "課程領域分類，例：main-lesson、nature、language",
"domain_category": "main-lesson",
```
With:
```json
"_comment_subject": "主題領域（語言中立 slug），可選值：language | nature | arts | social | math | physical-education | counseling | special-education | other",
"subject": "nature",
"_comment_format": "教學型態（語言中立 slug），可選值：main-lesson | specialist | elective | class-drama",
"format": "main-lesson",
```

**Mirror:** Existing `_comment_*` + field pairs throughout `course_template.json:5-16`.

**Validate:** `npm run validate` (template is excluded from validation by the `c.slug !==
'course-example'` guard in `coursesList.js:47`).

---

### Task 3 — Update `course-validator.js`

**File:** `src/_data/course-validator.js`  
**Action — lines 205-216:** Replace the `validateMetadata` function body:

```js
// BEFORE (line 206)
const requiredMetadata = ['grade_level', 'domain_category', 'teacher_name'];

// AFTER
const requiredMetadata = ['grade_level', 'subject', 'format', 'teacher_name'];
```

Add enum-check blocks immediately after the existing `for` loop (after line 211, before
the `metadata.tags` check):

```js
const VALID_SUBJECTS = new Set([
  'language', 'nature', 'arts', 'social', 'math',
  'physical-education', 'counseling', 'special-education', 'other'
]);
const VALID_FORMATS = new Set(['main-lesson', 'specialist', 'elective', 'class-drama']);

if (metadata.subject && !VALID_SUBJECTS.has(metadata.subject)) {
  addWarning(`Unknown subject slug: "${metadata.subject}"`, 'metadata.subject');
}
if (metadata.format && !VALID_FORMATS.has(metadata.format)) {
  addWarning(`Unknown format slug: "${metadata.format}"`, 'metadata.format');
}
if (metadata.domain_category) {
  addWarning('metadata.domain_category is deprecated; use subject + format instead', 'metadata.domain_category');
}
```

> Note: declare `VALID_SUBJECTS` and `VALID_FORMATS` as module-level `const` at the top of
> the file alongside the existing `ALLOWED_ROOT_KEYS`, `DRIVE_ID_PATTERN`, etc. (lines 25-32).

**Mirror:** Existing `DRIVE_ID_PATTERN` and `YOUTUBE_ID_PATTERN` const declarations at
`course-validator.js:26-30`; existing `addWarning` calls at `course-validator.js:209-211`.

**Validate:** `npm run validate` — after Tasks 1 and 3 are both done, all 4 live courses
must pass with 0 errors and the `domain_category deprecated` warning must NOT appear (because
Task 1 already removed that field from the JSONs).

---

### Task 4 — Update i18n files: add slug→label maps + fix homepage categories

**Files:** `src/_data/i18n/zh-TW.json` and `src/_data/i18n/en-US.json`

**4a — Add `subject_labels` and `format_labels` to each file**

Add after the existing `"filters"` block in each file:

```json
// zh-TW
"subject_labels": {
  "language": "語文",
  "nature": "自然",
  "arts": "藝術",
  "social": "社會",
  "math": "數學",
  "physical-education": "體育",
  "counseling": "輔導",
  "special-education": "特教",
  "other": "其他"
},
"format_labels": {
  "main-lesson": "主課程",
  "specialist": "專科",
  "elective": "選修",
  "class-drama": "班級戲劇"
},
```

```json
// en-US
"subject_labels": {
  "language": "Language Arts",
  "nature": "Nature",
  "arts": "Arts",
  "social": "Social Studies",
  "math": "Math",
  "physical-education": "Physical Education",
  "counseling": "Counseling",
  "special-education": "Special Education",
  "other": "Other"
},
"format_labels": {
  "main-lesson": "Main Lesson",
  "specialist": "Specialist",
  "elective": "Elective",
  "class-drama": "Class Drama"
},
```

**4b — Fix `homepage.categories` anchors in both files**

Replace the `main-lesson` and `history` category entries with subject-slug entries that
match the real courses. In both files, the `categories` array should become:

```json
// zh-TW
"categories": [
  { "label": "藝術課程", "description": "黑板畫、戲劇、音樂等整合創作。", "anchor": "arts", "icon": "🎨" },
  { "label": "自然主題", "description": "山林、人文地景、節氣與環境。", "anchor": "nature", "icon": "🌿" },
  { "label": "語文主課", "description": "語文、閱讀與表達的主課紀錄。", "anchor": "language", "icon": "📖" },
  { "label": "歷史社會", "description": "從神話到近代史的跨文化旅程。", "anchor": "social", "icon": "🕰️" }
]
```

```json
// en-US
"categories": [
  { "label": "Arts program", "description": "Blackboard art, drama, music, and integrated creations.", "anchor": "arts", "icon": "🎨" },
  { "label": "Nature studies", "description": "Mountains, field work, seasons, and ecological stories.", "anchor": "nature", "icon": "🌿" },
  { "label": "Language Arts", "description": "Language arts, reading and expression main lesson blocks.", "anchor": "language", "icon": "📖" },
  { "label": "Social Studies", "description": "Journeys from myths to modern history.", "anchor": "social", "icon": "🕰️" }
]
```

**Mirror:** Current structure at `src/_data/i18n/zh-TW.json:24-29` and
`src/_data/i18n/en-US.json:24-29`.

**Validate:** `npm run validate`; also `npm run dev:fast` and manually verify that the four
category cards on the homepage link to courses correctly.

---

### Task 5 — Update `src/index.njk` homepage domain grouping

**File:** `src/index.njk`  
**Action — line 25:**
```nunjucks
{# BEFORE #}
{% set domainSlug = course.metadata.domain_category if course.metadata else '' %}

{# AFTER #}
{% set domainSlug = course.metadata.subject if course.metadata else '' %}
```

No other changes needed in this file. Lines 34-55 iterate `homepageCategorySource` and
match `category.anchor` against `domainSlugs` — this continues to work because Task 4
updated those `anchor` values to be subject slugs, and this task ensures the slugs
collected from courses are also subject slugs.

**Mirror:** The existing ternary-free pattern at `src/index.njk:25`; the CLAUDE.md do-not
rule forbids JS ternaries in Nunjucks — use `{% if c.metadata %}...{% else %}...{% endif %}`
form if the single-line `if/else` pattern is ever ambiguous, but the existing `if condition`
shorthand is fine here.

**Validate:** `npm run dev:fast`; check homepage category cards show correct counts.

---

### Task 6 — Update `src/courses/index.njk` course-card filter attribute

**File:** `src/courses/index.njk`  
**Action — line 64:**
```nunjucks
{# BEFORE #}
data-domain="{{ c.metadata.domain_category if c.metadata else '' }}"

{# AFTER #}
data-domain="{{ c.metadata.subject if c.metadata else '' }}"
```

The `data-domain` attribute name is intentionally kept the same to avoid touching
`course-filters.js` (which reads `card.dataset.domain`). Only the value source changes.

**Mirror:** The sibling attributes at `src/courses/index.njk:63-65`.

**Validate:** `npm run dev:fast`; open `/courses/`, confirm the Domain dropdown is populated
with `nature`, `arts`, `language`, `social` (not `main-lesson`), and that filtering by each
value returns the correct subset of courses.

---

### Task 7 — Update `src/ai-discovery/ai-index.njk`

**File:** `src/ai-discovery/ai-index.njk`

**7a — Metadata block (lines 86-91):** Replace the single `domain_category` line with two:
```nunjucks
{# BEFORE (line 88) #}
"domain_category": "{{ metadata.domain_category }}",

{# AFTER #}
"subject": "{{ metadata.subject }}",
"format": "{{ metadata.format }}",
```

**7b — Statistics aggregation (lines 259-267):**  
Replace the `allDomains` block:
```nunjucks
{# BEFORE (lines 265-266) #}
{%- if course.metadata.domain_category and allDomains.indexOf(course.metadata.domain_category) == -1 -%}
  {%- set allDomains = allDomains.concat([course.metadata.domain_category]) -%}
{%- endif -%}

{# AFTER #}
{%- if course.metadata.subject and allDomains.indexOf(course.metadata.subject) == -1 -%}
  {%- set allDomains = allDomains.concat([course.metadata.subject]) -%}
{%- endif -%}
```

**Mirror:** The sibling `allGrades` and `allTeachers` aggregation blocks in
`src/ai-discovery/ai-index.njk:261-270`.

**Validate:** `npm run build:full` — inspect the generated `_site/ai-index.json` and
confirm each course entry has `"subject"` and `"format"` instead of `"domain_category"`.

---

### Task 8 — Update `src/ai-discovery/for-ai.njk` documentation

**File:** `src/ai-discovery/for-ai.njk`

There are 4 references to `domain_category` to update:

| Location | Change |
|---|---|
| Line 73 — short metadata example | Replace `"domain_category": "main-lesson"` with `"subject": "language", "format": "main-lesson"` |
| Line 279 — full ai-index.json example | Replace `"domain_category": "nature"` with `"subject": "nature", "format": "class-drama"` |
| Line 306 — "Use metadata for filtering" prose | Replace `course.metadata.domain_category` with `course.metadata.subject` and `course.metadata.format` |
| Line 378 — changelog entry | Replace `domain_category` with `subject + format` in the changelog bullet |

Do NOT change the 2025 changelog dates — only the text.

**Validate:** `npm run build:full` and visit `/for-ai/` in the built site; no `domain_category`
should appear in the rendered page.

---

### Task 9 — Update `docs/development/i18n-architecture.md`

**File:** `docs/development/i18n-architecture.md`  
**Action — line 16:** In the example JSON block, replace:
```json
"domain_category": "nature",
```
with:
```json
"subject": "nature",
"format": "class-drama",
```

**Validate:** Visual inspection only (not a compiled artifact).

---

### Task 10 — Update ADR 0001 status

**File:** `docs/adr/0001-split-domain-category-into-subject-and-format.md`  
**Action:** Change the front-matter `status:` from `accepted (not yet implemented)` to
`accepted` (or `accepted (implemented)`), per Issue #1's acceptance criteria. Do this only
after Tasks 1–9 land and validation is green — the ADR should reflect implemented reality.

**Validate:** Visual inspection; `grep -n 'status:' docs/adr/0001-*.md` shows the updated value.

---

### Task 11 — Full validation pass

Run all three verify commands in sequence:

```bash
npm run validate
npm run build:full
ELEVENTY_BASE="/course-site-starter/" npm run build
```

Fix any failures before proceeding to Validate phase.

---

## Validation

### Automated checks

```bash
npm run validate          # schema + validator: 0 errors, no domain_category warnings
npm run build:full        # full Eleventy build with Pagefind: must be exit 0
ELEVENTY_BASE="/course-site-starter/" npm run build  # subpath build for GitHub Pages
```

### E2E checklist (manual, dev server)

1. **`/courses/` — Domain filter populated correctly**
   - Start dev server: `npm run dev:fast`
   - Open `/courses/`
   - Domain dropdown must contain: `nature`, `arts`, `language`, `social` (in some order)
   - `main-lesson` must NOT appear in the dropdown
   - Filter by each value — confirm the correct course(s) appear

2. **`/courses/` — URL query param filter still works**
   - Visit `/courses/?domain=nature` — only 2a-nenggao should appear
   - Visit `/courses/?domain=language` — only 4a-journey should appear
   - Visit `/courses/?domain=arts` — only 3a-sunshot should appear
   - Visit `/courses/?domain=social` — only 9c-modern-history should appear

3. **Homepage — category cards link correctly**
   - All 4 category cards visible on `/`
   - Clicking "Arts program" / "藝術課程" → `/courses/?domain=arts` → shows 3a-sunshot
   - Clicking "Language Arts" / "語文主課" → `/courses/?domain=language` → shows 4a-journey

4. **`/ai-index.json` — schema updated**
   - Each course entry has `"subject"` and `"format"` fields
   - No course entry has `"domain_category"`
   - Statistics `"domains"` array contains subject slugs only

5. **Validator exits clean**
   - `npm run validate` output: 0 errors for all 4 live courses; no `domain_category deprecated` warnings

---

## Acceptance Criteria

- [ ] All 4 live course JSONs have `metadata.subject` and `metadata.format`; `metadata.domain_category` is absent
- [ ] `course_template.json` uses `subject` and `format` with correct `_comment_` entries; no `domain_category`
- [ ] `course-validator.js` requires `subject` and `format` (not `domain_category`); known-slug enums present; `domain_category` presence triggers a deprecation warning
- [ ] `src/index.njk` domain grouping reads from `metadata.subject`; homepage category cards link to correct subject-filtered course lists
- [ ] `src/courses/index.njk` `data-domain` attribute emits the subject slug; Domain filter dropdown shows only subject slugs (no format slugs like `main-lesson`)
- [ ] `ai-index.json` contains `subject` + `format` per course; `domain_category` field gone; statistics `domains` array reflects subject slugs
- [ ] `/for-ai/` page contains no `domain_category` text
- [ ] `npm run validate` passes with 0 errors
- [ ] `npm run build:full` exits 0
- [ ] `ELEVENTY_BASE="/course-site-starter/" npm run build` exits 0
- [ ] ADR 0001 `status:` updated from "accepted (not yet implemented)" to accepted/implemented
- [ ] Backfill values human-confirmed against the `112-114-syllabus-and-teaching-records` archive (or explicitly accepted as provisional) — esp. `9c-modern-history subject=social`
