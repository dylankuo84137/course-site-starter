# Plan: Bilingual `/llms.txt` discovery index + retire `/for-ai/`

## Summary
Replace the machine-facing AI surface with an `llms.txt` Markdown discovery index. Add one
new Nunjucks template that paginates over `locale.available` (`['zh-TW','en-US']`) to emit
two monolingual Markdown files — `/llms.txt` (zh-TW, canonical/root) and `/en-US/llms.txt`.
Each file opens with a localized preamble (folding in the essentials of the retired `/for-ai/`
HTML page and pointing at the `llms-full.txt` sibling), then lists every Course (title +
summary + per-language metadata) with Markdown links to its human HTML Course Pages
(`/courses/{slug}/{type}/`). All Course-Field text resolves through `i18nMacro.cf()`; the set
of links per course is gated through `materialHelpers` (`getDoc` / `hasMaterial`) — never a
hand-rolled `course.material` flatten. All internal links use the `| url` base-path filter.
The `/for-ai/` page and its references (sitemap, the `ai-index.json` `documentation` field,
README/dev-doc mentions) are removed or repointed.

## User Story
As an LLM carrying a fetch tool, I want to hit a single stable URL (`/llms.txt`) and get a
clean, monolingual Markdown map of the whole course corpus with links to each course's pages,
so that I can discover and cite the material without parsing HTML or guessing at structure.

## Metadata
| Field | Value |
|-------|-------|
| Type | ENHANCEMENT (new surface) + REFACTOR (retire `/for-ai/`) |
| Complexity | MEDIUM |
| Systems affected | AI-discovery templates, i18n data, sitemap, README/dev docs |
| Issue | #16 |

## Scope boundary vs. sibling #17 (READ FIRST)
This slice is **only** `/llms.txt` + retiring `/for-ai/`. The sibling issue **#17** owns
`/llms-full.txt`, **deleting `src/ai-discovery/ai-index.njk`**, and **repointing `/ai-guide/`**.
Do **NOT** create `llms-full.txt`, do **NOT** delete `ai-index.njk`, do **NOT** touch
`/ai-guide/` here. The one allowed touch of `ai-index.njk` is repointing its single `/for-ai/`
link (Task 6) — that is a "repoint a link referencing the retired page" change, squarely #16's
job, and it degrades gracefully to a no-op if #17 lands first and deletes the file.

## Key environment facts discovered (do not re-derive)
- **There is no existing language-pagination pattern in this repo.** Course pages build once
  (zh-TW) and translate client-side; the homepage uses two hand-written files (`src/index.njk`
  + `src/en-US/index.njk`). So the `pagination over ['zh-TW','en-US']` required by the issue/
  ADR-0004 is a **new** pattern here. It is still the correct, mandated approach — implement it.
- `locale.available = ['zh-TW','en-US']`, `locale.default = 'zh-TW'` — `src/_data/locale.js:2-3`.
- Nunjucks interpolation works inside `permalink` front matter (course pages do
  `permalink: "/courses/{{ c.slug }}/index.html"`), so `{% if %}` in permalink is fine.
- **Nunjucks autoescaping is ON.** A `.njk` template that outputs Markdown will HTML-escape
  `{{ }}` (e.g. `&` → `&amp;`). Course titles/overviews must be emitted with `| safe` so the
  Markdown/plain-text stays literal. Verify in the built file (see Validation).
- The full set of per-course page links + their `materialHelpers` gates already exists verbatim
  in `src/en-US/index.njk:16-72` — mirror it exactly, swapping pill `<a>` tags for Markdown links.
- Course-field labels (workbook, syllabus, story, …) live at `i18n[lang].course.*`; site strings
  at `i18n[lang].site.*`. The `course_home` label exists: `i18n[lang].course.course_home`.

## Patterns to Follow

### 1. Per-language output (NEW pattern — derive permalink from the homepage pair + locale)
The zh-TW-at-root / en-US-under-`/en-US/` split, expressed today as two files:
```yaml
# SOURCE: src/index.njk:1-5  (zh-TW, root)
permalink: /
currentLang: zh-TW
```
```yaml
# SOURCE: src/en-US/index.njk:1-7  (en-US, prefixed)
permalink: /en-US/
lang: en-US
currentLang: en-US
```
The lang-switcher already encodes the exact root-vs-prefix rule we must reproduce in one
computed permalink:
```njk
{# SOURCE: src/_includes/components/lang_switcher.njk:23 #}
{% set langUrl = ('/' + lang + '/') if lang != locale.default else '/' %}
```

### 2. Pagination front matter shape (mirror, swap `coursesList` → `locale.available`)
```yaml
# SOURCE: src/courses/home.njk:3-8
pagination:
  data: coursesList
  size: 1
  alias: c
permalink: "/courses/{{ c.slug }}/index.html"
```

### 3. Per-course link list gated by materialHelpers (mirror EXACTLY, emit Markdown)
```njk
{# SOURCE: src/en-US/index.njk:16-69 (abridged) #}
{% for c in coursesList %}
  {% set hasWorkbook = materialHelpers.hasMaterial(c, 'workbook_photos') or materialHelpers.hasMaterial(c, 'workbook_pdfs') %}
  {% set hasSyllabus = materialHelpers.hasMaterial(c, 'syllabus') %}
  {% set hasWorksheet = materialHelpers.hasMaterial(c, 'worksheet') %}
  {% set hasBlackboard = materialHelpers.hasMaterial(c, 'blackboard') %}
  {% set hasPhotos = materialHelpers.hasMaterial(c, 'photos') %}
  {% set hasPlayScript = materialHelpers.getDoc(c, 'play_script') or materialHelpers.hasMaterial(c, 'play_scripts') %}
  {% set hasScripts = materialHelpers.hasMaterial(c, 'scripts_photos') %}
  {% set hasSongs = materialHelpers.hasMaterial(c, 'songs_audio') %}
  {% set hasSheetMusic = materialHelpers.hasMaterial(c, 'sheet_music') %}
  {% set hasStory = materialHelpers.getDoc(c, 'story') %}
  {% set hasVideos = materialHelpers.hasMaterial(c, 'videos') %}
  ...
  <a class="pill" href="{{ ('/courses/' + c.slug + '/workbook/') | url }}">{{ i18n[currentLang].course.workbook }}</a>
{% endfor %}
```

### 4. Course-field resolution via cf() (Do-not #8)
```njk
{# SOURCE: src/courses/index.njk:6, 89-91 #}
{% import "macros/i18n.njk" as i18nMacro %}
{{ i18nMacro.cf(c, 'title', currentLang) }}
{{ i18nMacro.cf(c, 'grade', currentLang) }}
```
`cf()` fallback chain (`src/_includes/macros/i18n.njk:17-25`):
`course.i18n[lang][field] → course.i18n['zh-TW'][field] → course[field]`.

### 5. Internal links via | url, absolute via site.url (Do-not #1)
```njk
{# SOURCE: src/sitemap.njk:38 #}
<loc>{% if site.url %}{{ site.url }}{% endif %}{{ ('/courses/' + course.slug + '/') | url }}</loc>
```

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `src/ai-discovery/llms-txt.njk` | CREATE | New template; paginates over `locale.available`, emits `/llms.txt` + `/en-US/llms.txt` Markdown. |
| `src/_data/i18n/zh-TW.json` | UPDATE | Add `llms` block (preamble strings: intro, full-corpus pointer, license note). |
| `src/_data/i18n/en-US.json` | UPDATE | Same `llms` block, English. |
| `src/ai-discovery/for-ai.njk` | DELETE | Retire the `/for-ai/` HTML guide; its essentials move into the preamble. |
| `src/sitemap.njk` | UPDATE | Remove the `/for-ai/` `<url>` entry (lines 19-24); add a `/llms.txt` entry. |
| `src/ai-discovery/ai-index.njk` | UPDATE | Repoint the lone `"documentation": "{{ '/for-ai/' | url }}"` (line 303) to `/llms.txt`. |
| `README.md` | UPDATE | Repoint the `/for-ai.html` table row (line 449) to `/llms.txt`. |
| `docs/development/base-path.md` | UPDATE | Drop/repoint the `/for-ai.html` mention (line 65). |
| `docs/development/ai-index-core-generation-files.md` | UPDATE | Drop the `for-ai.njk` doc-page mention (lines 37-39). |

Dependency order: i18n keys (Task 1) must exist before the template reads them (Task 2);
everything else is independent.

## Tasks

### Task 1: Add `llms` preamble strings to both i18n files
- File: `src/_data/i18n/zh-TW.json`, `src/_data/i18n/en-US.json`
- Action: UPDATE
- Implement: Add a sibling `"llms"` object (next to `"site"`) in each file with three keys:
  - `intro` — one short paragraph: what the site is (a bilingual Waldorf course archive) and
    that *this* file is the machine-readable discovery index of the corpus. Fold the essence of
    the retired `/for-ai/` intro (`src/ai-discovery/for-ai.njk:14-16`).
  - `full_corpus` — one sentence advertising the `llms-full.txt` sibling for a whole-corpus
    fetch (this is the "what's here; the full corpus lives at llms-full.txt" job inherited from
    `/for-ai/`). The actual URL is emitted by the template via `| url`, not hardcoded here.
  - `license` — one line: CC BY-NC-SA, educational use (condense `for-ai.njk:317-321`;
    zh-TW may reuse the spirit of `site.json:license_text`).
  Keep strings plain text (no Markdown control chars that would fight the template).
- Mirror: existing `site.*` string entries in `src/_data/i18n/en-US.json:2-6` and the zh-TW
  equivalent.
- Validate: `npm run validate` (JSON must stay parseable; `validate-courses.js` loads i18n
  indirectly via build in `.claude/validate.sh`).

### Task 2: Create the `llms.txt` generator template
- File: `src/ai-discovery/llms-txt.njk`
- Action: CREATE
- Implement:
  - Front matter:
    ```yaml
    ---
    pagination:
      data: locale.available
      size: 1
      alias: lang
    permalink: "{% if lang == locale.default %}/llms.txt{% else %}/{{ lang }}/llms.txt{% endif %}"
    eleventyExcludeFromCollections: true
    ---
    ```
    (No `layout` — raw text output. Mirror `eleventyExcludeFromCollections` from
    `src/ai-discovery/ai-index.njk:2`.)
  - At top of body: `{% import "macros/i18n.njk" as i18nMacro %}` and use `lang` (the alias)
    everywhere a language is needed — pass it as the `cf()` 3rd arg and index `i18n[lang].*`.
  - **Preamble** (localized, from Task 1 strings):
    - `# {{ i18n[lang].site.title }}` (H1)
    - paragraph: `{{ i18n[lang].llms.intro | safe }}`
    - pointer line linking the sibling, e.g.
      `{{ i18n[lang].llms.full_corpus | safe }}: {{ '/llms-full.txt' | url }}`
      (link is base-path-correct even though #17 creates the file; #16 only references it).
    - license line: `{{ i18n[lang].llms.license | safe }}`
  - **Body** — `{% for course in coursesList %}` … per course emit:
    - `## {{ i18nMacro.cf(course, 'title', lang) | safe }}`
    - a metadata line via `cf()`:
      `{{ cf(course,'grade',lang) }} · {{ cf(course,'semester',lang) }} · {{ cf(course,'unit',lang) }}`
      (each `| safe`).
    - a summary paragraph: `{{ i18nMacro.cf(course, 'overview', lang) | safe }}` (this is the
      "summary" field — the course overview; mirrors `src/en-US/index.njk:32`).
    - a Markdown bullet list of links. **Always** emit the course-home link:
      `- [{{ i18n[lang].course.course_home }}]({{ ('/courses/' + course.slug + '/') | url }})`
      then emit each sub-page link **only when its materialHelpers gate is true**, mirroring the
      exact gate set + URL suffixes in `src/en-US/index.njk:18-69`:
      workbook→`/workbook/`, syllabus→`/syllabus/`, worksheet→`/worksheet/`,
      blackboard→`/blackboard/`, photos→`/photos/`, play-script→`/play-script/`,
      scripts(performance)→`/scripts/`, songs→`/songs/`, sheet-music→`/sheet-music/`,
      story→`/story/`, videos→`/videos/`. Link labels from `i18n[lang].course.*`.
  - Use Nunjucks whitespace control (`{%- … -%}`) as in `src/sitemap.njk` / `ai-index.njk` to
    keep the Markdown free of stray blank lines.
  - **Do NOT** read `course.material` / `course.docs` directly — only `materialHelpers.*`
    (Do-not #2). **Do NOT** use a JS ternary `?:` (Do-not #7) — Nunjucks inline-if is fine.
- Mirror: `src/en-US/index.njk:16-72` (gates + links), `src/courses/home.njk:3-8` (pagination
  shape), `src/ai-discovery/ai-index.njk:1-2` (exclude-from-collections).
- Validate: `npm run validate` then inspect `_site/llms.txt` and `_site/en-US/llms.txt`
  (see Validation section for the exact checks).

### Task 3: Delete the `/for-ai/` page
- File: `src/ai-discovery/for-ai.njk`
- Action: DELETE
- Implement: Remove the file (its essentials now live in the Task-1 preamble strings).
- Validate: `npm run validate`; confirm `_site/for-ai/` no longer generated.

### Task 4: Remove `/for-ai/` from the sitemap, add `/llms.txt`
- File: `src/sitemap.njk`
- Action: UPDATE
- Implement: Delete the `<url>` block at lines 19-24 (`'/for-ai/'`). Add one `<url>` for
  `'/llms.txt'` mirroring the existing block style (use `{{ '/llms.txt' | url }}`,
  `changefreq>weekly`, `priority>0.7`). (en-US/llms.txt is optional and may be omitted — the
  sitemap currently lists no `/en-US/` routes; stay consistent.)
- Mirror: `src/sitemap.njk:13-18` (a single static `<url>` block).
- Validate: `npm run validate`; confirm built `_site/sitemap.xml` has no `for-ai` and has `llms.txt`.

### Task 5: Repoint the README `/for-ai.html` reference
- File: `README.md` (line ~449)
- Action: UPDATE
- Implement: Change the table cell referencing `/for-ai.html` (site-structure guide) to point at
  `/llms.txt` (the AI discovery index). Keep the surrounding table intact (surgical change).
- Validate: visual diff only (README is not built).

### Task 6: Repoint the `ai-index.njk` `documentation` field
- File: `src/ai-discovery/ai-index.njk` (line 303)
- Action: UPDATE
- Implement: Change `"documentation": "{{ '/for-ai/' | url }}"` to
  `"documentation": "{{ '/llms.txt' | url }}"`. This is the only `/for-ai/` link inside a built
  artifact and must not dangle. (If #17 already deleted this file, skip — no-op.)
- Validate: `npm run validate`; built `_site/ai-index.json` `documentation` no longer 404s.

### Task 7: Repoint dev-doc mentions of `/for-ai/`
- File: `docs/development/base-path.md` (line 65),
  `docs/development/ai-index-core-generation-files.md` (lines 37-39)
- Action: UPDATE
- Implement: Drop or repoint the `/for-ai.html` / `for-ai.njk` mentions to reflect that the
  surface is now `/llms.txt`. Surgical: change only those lines. (Leave `pdf-text-extraction.md`
  and the `docs/superpowers/plans/…` historical plan alone — those are archival; mention them in
  the report rather than editing.)
- Validate: visual diff only (docs are not built).

## Validation
Run from repo root.

1. **Project gate:** `npm run validate`
   (runs `validate-courses.js` + `validate-innovations.js`; the full gate
   `.claude/validate.sh` also runs `npm run build:full` and the subpath build).
2. **Default build:** `npm run build`, then verify:
   - `_site/llms.txt` and `_site/en-US/llms.txt` both exist and are valid, **monolingual**
     Markdown (zh-TW file has no English course titles and vice-versa; no `---zh-TW---`
     interleaving).
   - Each file: H1 + intro preamble + a line linking `llms-full.txt` + per-course `##` sections
     with title, metadata, summary, and a Markdown bullet list of `/courses/{slug}/{type}/` links.
   - **No HTML-entity escaping** leaked from autoescape:
     `grep -E '&amp;|&lt;|&gt;|&#' _site/llms.txt` returns nothing (if it does, add `| safe`).
   - `_site/for-ai/` does **not** exist; `grep -r 'for-ai' _site/sitemap.xml _site/ai-index.json`
     returns nothing; `_site/sitemap.xml` contains a `llms.txt` `<loc>`.
3. **Subpath build:** `ELEVENTY_BASE="/course-site-starter/" npm run build`, then verify every
   internal link in `_site/llms.txt` is prefixed `/course-site-starter/...` (so the `| url`
   filter is doing its job; no domain-root or bare `/courses/...` links). Check the
   `llms-full.txt` pointer is `/course-site-starter/llms-full.txt`.
4. **Manual read:** open `_site/llms.txt`, confirm it reads as a coherent discovery index a
   fetch-tool LLM could follow, and that the preamble carries the retired `/for-ai/` essentials
   ("what this site is" + "the full corpus lives at llms-full.txt").

## Acceptance Criteria
- [ ] `/llms.txt` (zh-TW, root) and `/en-US/llms.txt` generated via 11ty pagination over
      `locale.available`; each is valid, monolingual Markdown.
- [ ] Body lists each Course (title + summary + metadata) with links to its HTML Course Pages
      (`/courses/{slug}/{type}/`).
- [ ] Top-of-file preamble explains the site and points at the `llms-full.txt` sibling.
- [ ] `/for-ai/` removed; sitemap / `ai-index.json` documentation field / README / dev-docs
      references repointed or dropped; its essentials survive in the preamble.
- [ ] Course fields via `cf()` (Do-not #8); all internal links via `| url` (Do-not #1);
      link gating via `materialHelpers` with **no** hand-rolled `course.material` flatten (Do-not #2).
- [ ] No `ai-index.njk` deletion, no `llms-full.txt`, no `/ai-guide/` change (those are #17).
- [ ] `npm run validate` passes; subpath build links all carry the `/course-site-starter/` prefix.
- [ ] Follows existing patterns; Markdown output has no HTML-entity escaping.
