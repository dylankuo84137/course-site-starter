# Plan: Per-Language Tags

## Summary

Implement per-language tags so the zh-TW build shows Chinese tags and the en-US build shows
English tags. The change couples three debts that cannot ship independently: (a) move each
course's Chinese `metadata.tags` → `i18n.zh-TW.tags`, (b) backfill `i18n.en-US.tags` with
English translations, (c) replace the merge-all `deriveTags` logic with a locale-selecting
`tagHelpers.getCourseTags(course, lang)` helper and thread it through every njk consumer.

## User Story

As a visitor on the English site, I see English tag pills on course cards and the homepage
tag cloud. As a visitor on the Chinese site, I see Chinese tag pills. Neither site shows tags
from the other locale.

## Metadata

| Field | Value |
|---|---|
| Type | Coupled data + code change (must ship together) |
| Complexity | Medium — 1 new file, 14 updates, 8 ordered tasks |
| Systems affected | Course JSON data, `coursesList.js` hydration, `tagHelpers`, `.eleventy.js`, 7 njk consumers |
| Issue | #2 |

---

## Ordering Trap

**The regression**: `deriveTags` currently *merges* `metadata.tags + i18n.zh-TW.tags +
i18n.en-US.tags` into one shared `course.tags` array. If the code is switched to
*select-by-locale* (`dedupe(metadata.tags ++ i18n[lang].tags)`) BEFORE `i18n.en-US.tags` is
backfilled, the en-US build renders zero tags because that array was empty.

**How task order prevents it**: Task 1 (data backfill, all 4 real course JSONs + template) is
unconditionally first. It populates both `i18n.zh-TW.tags` and `i18n.en-US.tags`. After Task 1
the current merge logic still builds fine (it merges Chinese + English into one list — ugly but
not broken). Only then do Tasks 2–7 switch the code to locale-select. When the code switch
lands, every locale already has its own array populated. Task 8 (remove old `course.tags`
hydration) runs last after all njk consumers have migrated.

**The invariant**: `i18n.en-US.tags` must be non-empty for every real course BEFORE the code
switch. Tasks 2–8 MUST NOT proceed until all JSON files in Task 1 are saved and validated.

---

## Patterns to Follow

### Helper-as-globalData (the registration pattern to mirror)

```js
// SOURCE: .eleventy.js:3-4
const materialHelpers = require('./src/_data/materialHelpers.js');
const courseHelpers = require('./src/_data/courseHelpers.js');

// SOURCE: .eleventy.js:242-243
eleventyConfig.addGlobalData("materialHelpers", materialHelpers);
eleventyConfig.addGlobalData("courseHelpers", courseHelpers);
```

`tagHelpers` must follow the identical pattern: `require` at the top of `.eleventy.js`,
`addGlobalData("tagHelpers", tagHelpers)` in the config body.

### Helper module shape (mirror materialHelpers)

```js
// SOURCE: src/_data/materialHelpers.js:195-202
module.exports = {
  getMaterialItems,
  hasMaterial,
  getDoc,
  getMaterialEntries,
  getMaterialGroups,
  normalizeVideos
};
```

`tagHelpers.js` exports a plain object of named functions — no class, no factory.

### i18n field access pattern (mirror courseHelpers.getI18nField)

```js
// SOURCE: src/_data/courseHelpers.js:1-14
function getI18nField(course, field, lang = "zh-TW") {
  if (!course || !field) return undefined;
  const locales = course.i18n || {};
  if (lang && locales[lang] && locales[lang][field] !== undefined) {
    return locales[lang][field];
  }
  // ...fallback to zh-TW, then root field
}
```

`getCourseTags` follows the same defensive access pattern: check `course.metadata`, then
`course.i18n[lang]`, never assume keys exist.

### Template call-site pattern (mirror materialHelpers usage in templates)

```njk
{# SOURCE: src/courses/home.njk:77-78 #}
{% set courseDescriptionDoc = materialHelpers.getDoc(c, 'course_description') %}
{% set syllabusPdfs = materialHelpers.getMaterialItems(c, 'syllabus') %}
```

In templates, call `tagHelpers.getCourseTags(course, currentLang)` via a `{% set %}` variable
exactly as materialHelpers calls are used.

### Existing deriveTags (what to remove / replace)

```js
// SOURCE: src/_data/coursesList.js:17-31  (ENTIRE BLOCK IS REPLACED)
function deriveTags(course) {
  if (Array.isArray(course.tags) && course.tags.length > 0) {  // line 18 — dead branch
    return course.tags;
  }
  const metadataTags = course.metadata && Array.isArray(course.metadata.tags) ? course.metadata.tags : [];
  const zhTags = course.i18n && course.i18n['zh-TW'] && Array.isArray(course.i18n['zh-TW'].tags) ? course.i18n['zh-TW'].tags : [];
  const enTags = course.i18n && course.i18n['en-US'] && Array.isArray(course.i18n['en-US'].tags) ? course.i18n['en-US'].tags : [];
  return Array.from(new Set([...metadataTags, ...zhTags, ...enTags].filter(Boolean)));  // merge — BAD
}

function hydrateCourse(course) {
  if (!course) return course;
  course.tags = deriveTags(course);  // sets course.tags — REMOVE
  return course;
}
```

After the change: delete `deriveTags`, delete `hydrateCourse` (or inline its removal — it sets
only `course.tags`). The `courses.map(n => { ...; return hydrateCourse(clean); })` line becomes
`return clean;`.

---

## Files to Change

| File | Action | Purpose |
|---|---|---|
| `src/_data/tagHelpers.js` | CREATE | New `getCourseTags(course, lang)` helper |
| `src/_data/course-configs/course_2a_nenggao_113_summer.json` | UPDATE | Data move + en-US backfill |
| `src/_data/course-configs/course_3a_sunshot_113_summer.json` | UPDATE | Data move + en-US backfill |
| `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json` | UPDATE | Data move + en-US backfill |
| `src/_data/course-configs/course_9c_modern-history_114_autumn.json` | UPDATE | Data move + en-US backfill |
| `src/_data/course-configs/course_template.json` | UPDATE | Update canonical template pattern |
| `.eleventy.js` | UPDATE | Register tagHelpers global; update `jsonLD` filter signature |
| `src/_data/coursesList.js` | UPDATE | Remove `deriveTags` + `hydrateCourse`; kill dead `course.tags` branch |
| `src/index.njk` | UPDATE | Consumer 1: `course.tags` → `tagHelpers.getCourseTags` |
| `src/feed.njk` | UPDATE | Consumer 2: `course.tags` → `tagHelpers.getCourseTags` |
| `src/_includes/layouts/base.njk` | UPDATE | Consumer 3: `c.tags` → `tagHelpers.getCourseTags` |
| `src/courses/home.njk` | UPDATE | Consumer 4: `c.metadata.tags` + `jsonLD` call |
| `src/courses/index.njk` | UPDATE | Consumer 5: `c.tags` → `tagHelpers.getCourseTags` |
| `src/ai-discovery/ai-index.njk` | UPDATE | Consumer 6: per-language tag output in JSON index |
| `src/_includes/macros/utility-filters.njk` | UPDATE | Consumer 7: fix dead `jsonLD` macro signature |

---

## Tasks

### Task 1 — Data backfill (all JSON files)
**Files**: 4 real course configs + `course_template.json`  
**MUST be first — the ordering trap depends on this.**

For each real course JSON, make three edits atomically:
1. Clear `metadata.tags` → `[]`
2. Add the Chinese tags to `i18n.zh-TW.tags`
3. Add English translations to `i18n.en-US.tags`

**Exact values per file**:

`course_2a_nenggao_113_summer.json`:
```json
"metadata": {
  "grade_level": "2",
  "domain_category": "nature",
  "teacher_name": "王琬婷/Wang Wan-Ting",
  "tags": []
},
"i18n": {
  "zh-TW": {
    ...existing fields...,
    "tags": ["戲劇", "黑板畫", "工作本", "歌曲"]
  },
  "en-US": {
    ...existing fields...,
    "tags": ["drama", "blackboard drawings", "workbook", "songs"]
  }
}
```

`course_3a_sunshot_113_summer.json`:
```json
"metadata": { ..., "tags": [] }
"i18n.zh-TW.tags": ["戲劇", "劇本", "歌曲", "表演"]
"i18n.en-US.tags": ["drama", "script", "songs", "performance"]
```

`course_4a_journey-to-the-west_114_autumn.json`:
```json
"metadata": { ..., "tags": [] }
"i18n.zh-TW.tags": ["西遊記", "戲劇", "語文", "主課", "工作本"]
"i18n.en-US.tags": ["Journey to the West", "drama", "language arts", "main lesson", "workbook"]
```

`course_9c_modern-history_114_autumn.json`:
```json
"metadata": { ..., "tags": [] }
"i18n.zh-TW.tags": ["現代史", "工業革命", "青年行動", "學習筆記"]
"i18n.en-US.tags": ["modern history", "industrial revolution", "youth action", "study notes"]
```

`course_template.json` — update to show the canonical pattern. The template currently has
`metadata.tags: ["tag1","tag2","tag3"]`. Change it to show `metadata.tags` as the neutral
escape hatch (empty or a placeholder comment only), with per-language tags in `i18n.{lang}.tags`.
The `i18n.zh-TW.tags` and `i18n.en-US.tags` sections already exist in the template — keep them
but clear `metadata.tags`:
```json
"_comment_tags": "Neutral escape hatch for untranslatable tokens (proper-noun slugs, years). Empty for most courses.",
"tags": []
```

**Mirror file:lines**: existing `i18n.zh-TW` / `i18n.en-US` block structure in
`course_2a_nenggao_113_summer.json:15-30`  
**Validate**: `npm run validate` — must pass with no errors before proceeding.

---

### Task 2 — Create `src/_data/tagHelpers.js`
**File**: `src/_data/tagHelpers.js` (CREATE)  
**Action**:

```js
// Mirrors the helper module shape of materialHelpers.js (src/_data/materialHelpers.js:195-202)

/**
 * Returns the locale-specific tags for a course.
 * Formula: dedupe(metadata.tags ++ i18n[lang].tags)
 * metadata.tags is the neutral escape hatch for untranslatable tokens.
 *
 * @param {Object} course - Hydrated course object
 * @param {string} lang - Locale key, e.g. 'zh-TW' or 'en-US'
 * @returns {string[]}
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

**Mirror file:lines**: `src/_data/materialHelpers.js:195-202` (module.exports shape),
`src/_data/courseHelpers.js:1-14` (defensive access pattern)  
**Validate**: `npm run validate` — structural only; no build impact yet.

---

### Task 3 — Register tagHelpers in `.eleventy.js`; update `jsonLD` filter
**File**: `.eleventy.js`

**Change 1 — require** (at top of file, alongside existing helper requires, `.eleventy.js:3-4`):
```js
const tagHelpers = require('./src/_data/tagHelpers.js');
```

**Change 2 — addGlobalData** (alongside existing registrations, `.eleventy.js:242-243`):
```js
eleventyConfig.addGlobalData("tagHelpers", tagHelpers);
```

**Change 3 — update `jsonLD` filter signature** (`.eleventy.js:42-72`).
The filter must accept a `lang` parameter so the call site in `courses/home.njk` can pass
`currentLang`. Change the declaration from:
```js
jsonLD: (course, site) => {
  ...
  if (course.tags && course.tags.length > 0) {      // line 68 — OLD
    schema.keywords = course.tags.join(', ');        // line 69 — OLD
  }
```
to:
```js
jsonLD: (course, site, lang = 'zh-TW') => {
  ...
  const tags = tagHelpers.getCourseTags(course, lang);
  if (tags.length > 0) {
    schema.keywords = tags.join(', ');
  }
```

**Mirror file:lines**: `.eleventy.js:242-243` (addGlobalData pattern)  
**Validate**: `npm run validate`

---

### Task 4 — Update template consumers batch 1: `index.njk`, `feed.njk`, `base.njk`

#### `src/index.njk:14`
Before:
```njk
{% for tag in course.tags or [] %}
```
After:
```njk
{% for tag in tagHelpers.getCourseTags(course, currentLang) %}
```
(This is inside the `{% for course in coursesList %}` loop at line 13. `currentLang` is set at
the top of the file via frontmatter.)

#### `src/feed.njk:32`
Before:
```njk
"tags": {{ course.tags | json }},
```
After:
```njk
"tags": {{ tagHelpers.getCourseTags(course, 'zh-TW') | json }},
```
Rationale: the feed declares `"language": "zh-Hant"` (line 11) and has no `currentLang`.
Hard-code `'zh-TW'` — it is the correct locale for this feed.

#### `src/_includes/layouts/base.njk:35`
Before:
```njk
<meta name="keywords" content="{{ i18n[currentLang].metadata.keywords }}{% if c and c.tags %}, {{ c.tags | join(', ') }}{% endif %}">
```
After:
```njk
<meta name="keywords" content="{{ i18n[currentLang].metadata.keywords }}{% if c %}{% set _ctags = tagHelpers.getCourseTags(c, currentLang) %}{% if _ctags and _ctags.length %}, {{ _ctags | join(', ') }}{% endif %}{% endif %}">
```

**Validate after this task**: `npm run validate` then `npm run build:full` and confirm the
homepage tag cloud renders.

---

### Task 5 — Update template consumers batch 2: `courses/home.njk`, `courses/index.njk`

#### `src/courses/home.njk:55-63` (tags section)
Before:
```njk
{% if c.metadata and c.metadata.tags and c.metadata.tags.length > 0 %}
<aside class="innovation-tags-section">
  <h4 class="innovation-tags-header">{{ i18n[currentLang].course.tags or '標籤' }}</h4>
  <div class="innovation-tags-list">
    {% for tag in c.metadata.tags %}
    <span class="innovation-tag-pill">#{{ tag }}</span>
    {% endfor %}
  </div>
</aside>
{% endif %}
```
After:
```njk
{% set _ctags = tagHelpers.getCourseTags(c, currentLang) %}
{% if _ctags and _ctags.length > 0 %}
<aside class="innovation-tags-section">
  <h4 class="innovation-tags-header">{{ i18n[currentLang].course.tags or '標籤' }}</h4>
  <div class="innovation-tags-list">
    {% for tag in _ctags %}
    <span class="innovation-tag-pill">#{{ tag }}</span>
    {% endfor %}
  </div>
</aside>
{% endif %}
```

#### `src/courses/home.njk:70` (jsonLD filter call site)
Before:
```njk
{{ c | jsonLD(site) | safe }}
```
After:
```njk
{{ c | jsonLD(site, currentLang) | safe }}
```
(Passes `currentLang` to the updated `jsonLD` filter so schema.org `keywords` are per-locale.)

#### `src/courses/index.njk:107-113`
Before:
```njk
{% if c.tags and c.tags.length %}
<div class="home-tag-list">
  {% for tag in c.tags.slice(0, 3) %}
  <span class="home-tag-pill">#{{ tag }}</span>
  {% endfor %}
</div>
{% endif %}
```
After:
```njk
{% set _ctags = tagHelpers.getCourseTags(c, currentLang) %}
{% if _ctags and _ctags.length %}
<div class="home-tag-list">
  {% for tag in _ctags.slice(0, 3) %}
  <span class="home-tag-pill">#{{ tag }}</span>
  {% endfor %}
</div>
{% endif %}
```

**Validate**: `npm run validate` then `npm run build:full`.

---

### Task 6 — Update `src/ai-discovery/ai-index.njk`
**File**: `src/ai-discovery/ai-index.njk`

This is a language-agnostic JSON index. Output per-language tags as a nested object instead
of a single flat array (breaking change to schema, intentional — aligns with the domain model).

**Change 1 — Remove `courseTags` local var (line 51)**:
Delete this line:
```njk
{%- set courseTags = metadata.tags or [] -%}
```
It is no longer needed.

**Change 2 — Replace `"tags"` output (line 93)**:
Before:
```njk
"tags": [{% for tag in courseTags %}"{{ tag | replace('"', '\\"') }}"{{ "," if not loop.last }}{% endfor %}],
```
After:
```njk
"tags": {
  "zh-TW": [{% for tag in tagHelpers.getCourseTags(course, 'zh-TW') %}"{{ tag | replace('"', '\\"') }}"{{ "," if not loop.last }}{% endfor %}],
  "en-US": [{% for tag in tagHelpers.getCourseTags(course, 'en-US') %}"{{ tag | replace('"', '\\"') }}"{{ "," if not loop.last }}{% endfor %}]
},
```

**Change 3 — Statistics section (lines 271-278)**:
Before (accumulates only `course.metadata.tags`):
```njk
{%- if course.metadata.tags -%}
  {%- for tag in course.metadata.tags -%}
    {%- if allTags.indexOf(tag) == -1 -%}
      {%- set allTags = allTags.concat([tag]) -%}
    {%- endif -%}
  {%- endfor -%}
{%- endif -%}
```
After (accumulates zh-TW tags for the uniqueTags count — stat is a zh-TW aggregate):
```njk
{%- for tag in tagHelpers.getCourseTags(course, 'zh-TW') -%}
  {%- if allTags.indexOf(tag) == -1 -%}
    {%- set allTags = allTags.concat([tag]) -%}
  {%- endif -%}
{%- endfor -%}
```

**Validate**: `npm run validate` then `npm run build:full`. Confirm `_site/ai-index.json`
contains `"tags": { "zh-TW": [...], "en-US": [...] }` for each course.

---

### Task 7 — Fix dead code in `src/_includes/macros/utility-filters.njk`
**File**: `src/_includes/macros/utility-filters.njk:91-124`

This `jsonLD` macro is **never imported** anywhere — confirmed by grepping all njk files for
`utility-filters`. `courses/home.njk:70` uses the Eleventy filter `jsonLD`, not this macro.
Update the macro to remove the `course.tags` reference (Nunjucks macros are sandboxed and
cannot call `tagHelpers`). Add `tags = []` as an explicit parameter:

Before (lines 119-121):
```njk
{%- if course.tags and course.tags.length > 0 -%}
  {%- set schema = schema | set('keywords', course.tags.join(', ')) -%}
{%- endif -%}
```
After:
```njk
{%- if tags and tags.length > 0 -%}
  {%- set schema = schema | set('keywords', tags.join(', ')) -%}
{%- endif -%}
```
And update the macro signature (line 91) from:
```njk
{% macro jsonLD(course, site) -%}
```
to:
```njk
{% macro jsonLD(course, site, tags = []) -%}
```

**Validate**: `npm run validate`

---

### Task 8 — Remove dead code from `src/_data/coursesList.js`
**File**: `src/_data/coursesList.js`  
**MUST be last** — all templates must have migrated off `course.tags` before this runs.

Delete the entire `deriveTags` function (lines 17-25):
```js
// DELETE: src/_data/coursesList.js:17-25
function deriveTags(course) { ... }
```

Delete the entire `hydrateCourse` function (lines 27-31):
```js
// DELETE: src/_data/coursesList.js:27-31
function hydrateCourse(course) { ... }
```

In the `files.map(...)` callback (line 43), change `return hydrateCourse(clean)` → `return clean`:
```js
// BEFORE: src/_data/coursesList.js:43
return hydrateCourse(clean);
// AFTER:
return clean;
```

**Validate**: `npm run validate` then the full `.claude/validate.sh` gate.

---

## Validation

Run `.claude/validate.sh` in sequence after Task 8 is complete:

```sh
npm run validate               # course JSON schema + innovation schema checks
npm run build:full             # builds zh-TW (default) + Pagefind index
ELEVENTY_BASE="/course-site-starter/" npm run build   # subpath build
```

**E2E checklist** (manual browser checks or `npm run dev:fast`):

1. **zh-TW homepage tag cloud** (`/` with `currentLang: zh-TW`): tag pills show Chinese —
   e.g., `#戲劇`, `#黑板畫`. No English tags.
2. **en-US homepage** (switch lang or visit `/en-US/`): tag cloud shows English —
   e.g., `#drama`, `#blackboard drawings`. No Chinese tags.
3. **Course card on `/courses/`** (zh-TW): card tag pills show Chinese tags.
4. **Course card on `/courses/`** (en-US, via lang switcher): card tag pills show English.
5. **Course home page** (e.g., `/courses/2a-nenggao-113-summer/`): tags aside shows
   Chinese for zh-TW, English for en-US.
6. **`<meta name="keywords">`** in page source for a course page: includes locale-correct tags.
7. **JSON-LD `<script>` block** in course home page source: `keywords` field contains only
   locale-correct tags.
8. **`/ai-index.json`**: each course entry has `"tags": { "zh-TW": [...], "en-US": [...] }`
   structure (not a flat array).
9. **`/feed.json`**: each entry `"tags"` array contains Chinese tags only (feed is zh-Hant).
10. **`npm run validate`** exits 0 with no warnings about `course.tags`.

---

## Acceptance Criteria

- [ ] All 4 real course JSONs have `metadata.tags: []`, non-empty `i18n.zh-TW.tags` (Chinese),
      and non-empty `i18n.en-US.tags` (English)
- [ ] `course_template.json` has `metadata.tags: []` with per-language tags in `i18n.{lang}.tags`
- [ ] `src/_data/tagHelpers.js` exists and exports `getCourseTags(course, lang)` returning
      `dedupe(metadata.tags ++ i18n[lang].tags)`
- [ ] `tagHelpers` is registered as `addGlobalData` in `.eleventy.js` (identical pattern to
      `materialHelpers`)
- [ ] `jsonLD` filter in `.eleventy.js` accepts `lang` parameter and uses
      `tagHelpers.getCourseTags(course, lang)` — no reference to `course.tags`
- [ ] `coursesList.js` has no `deriveTags`, no `hydrateCourse`, no `course.tags =` assignment
- [ ] All 7 njk consumers use `tagHelpers.getCourseTags(course, currentLang)` (or `'zh-TW'`
      for the feed); no consumer references `course.tags` or `c.metadata.tags` for tags
- [ ] `utility-filters.njk` `jsonLD` macro accepts a `tags = []` parameter; no reference to
      `course.tags`
- [ ] `ai-index.njk` outputs `"tags": { "zh-TW": [...], "en-US": [...] }` per course
- [ ] `npm run validate` exits 0
- [ ] `npm run build:full` succeeds
- [ ] `ELEVENTY_BASE="/course-site-starter/" npm run build` succeeds
- [ ] zh-TW build: tag cloud and course card pills contain only Chinese tags
- [ ] en-US build: tag cloud and course card pills contain only English tags
- [ ] No intermediate task leaves the build broken (each task is independently validatable)
