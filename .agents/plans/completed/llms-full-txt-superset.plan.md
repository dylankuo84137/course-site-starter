# Plan: Bilingual `/llms-full.txt` full-payload superset + retire `ai-index.json` + repoint `/ai-guide/`

## Summary
Emit a per-language Markdown **full-payload** file (`/llms-full.txt` for zh-TW at root,
`/en-US/llms-full.txt` for en-US) via 11ty pagination over `locale.available`
(`['zh-TW','en-US']`). Each file is monolingual Markdown and inlines, per Course: Doc prose
+ the Material catalog + extracted PDF text (`pdfText`) — a strict superset of today's
`ai-index.json`. Because it is a superset, **delete** `src/ai-discovery/ai-index.njk` (so
`/ai-index.json` is no longer emitted), which also deletes its hand-rolled `course.material`
flatten for free (closes Do-not #2). The new generator consumes `materialHelpers`
(`getMaterialItems` / `getDoc`) and resolves text through `i18nMacro.cf(course, field, lang)`
(Do-not #8). Finally, repoint the teacher-facing `/ai-guide/` pages (both languages) from the
"download `ai-index.json` and upload it" flow to "give the `llms-full.txt` URL", and repoint
the forward-looking docs that named `ai-index.json`.

## User Story
As an LLM-with-a-fetch-tool (and a teacher pasting one URL into ChatGPT/Claude/Gemini/
NotebookLM), I want a single Markdown file that inlines the entire course corpus in my
served language, so that I can ingest everything in one fetch without parsing JSON or
flattening material by hand.

## Metadata
| Field | Value |
|-------|-------|
| Type | REFACTOR (format migration + teardown) |
| Complexity | MEDIUM-HIGH |
| Systems affected | `src/ai-discovery/` (new template + deletion), `src/ai-guide/` + `src/en-US/ai-guide/` (repoint), `docs/` (repoint) |
| Issue | #17 |

## Ordering dependency (READ FIRST — flag for the human before merge)
- **#16 (`/llms.txt` index + retire `/for-ai/`) is still OPEN** (verified `gh issue view 16` →
  `state: OPEN`; no `llms.txt`/`llms-full.txt`/`llms*.njk` scaffolding exists in `src/`).
  #17 is a sibling, not blocked, but:
  1. The `llms-full.txt` preamble should point readers at the `llms.txt` **index** sibling
     (decision 8). If #16 hasn't merged, that link targets a not-yet-existent file. Emit the
     link anyway (root-relative `| url`); note it goes live when #16 lands. Do **not** create
     `llms.txt` here — that is #16's slice.
  2. `src/ai-discovery/for-ai.njk` still references `ai-index.json` 8 times. **#16 removes
     `/for-ai/`.** This plan does **not** touch `for-ai.njk`. If #17 merges before #16, those
     references become stale links (cosmetic, not a build break) until #16 lands. Flag at
     review; do not expand scope to fix `for-ai.njk` here.
  - **Recommended merge order: #16 then #17.** If merged out of order, the two cosmetic gaps
    above are acceptable and self-heal when the sibling lands.
- **#12 (base-path HtmlBasePlugin) coordination:** `ai-index.njk` was named as a possibly
  base-path-affected file, but #17 **deletes** it, so no #12 work is needed there. The
  base-path concern that DOES matter here is the ai-guide link form (see Task 3/4 — `site.url`
  already carries the subpath, so do NOT add `| url` there or you create a double-prefix).

## Critical grounding facts (verified this session)
- **`site.url` already includes the subpath:** `src/_data/site.json:3` →
  `"url": "https://dylankuo84137.github.io/course-site-starter"`. So the existing ai-guide
  link `{{ site.url }}/ai-index.json` (`src/ai-guide/index.md:61`) is already correct. The new
  link must keep the literal `{{ site.url }}/llms-full.txt` form (NO `| url`) — adding `| url`
  would produce `…/course-site-starter/course-site-starter/llms-full.txt` (the #12 double-prefix).
- **Languages list:** `src/_data/locale.js` exports `available: ['zh-TW','en-US']` and
  `default: 'zh-TW'`. Use `locale.available` as the pagination source and `locale.default`
  for the root-vs-`/en-US/` permalink branch.
- **`.txt`/data templates are NOT processed by HtmlBasePlugin** (it only rewrites HTML).
  So inside `llms-full.njk`, root-relative links MUST use the `| url` filter (mirror
  `feed.njk:20`, `sitemap.njk`). No double-prefix risk there because `site.url` is not prepended.
- **`pdfText` source is the `pdfTextCache` global** (`src/_data/pdfTextCache.js`), keyed
  `pdfTextCache[course.slug][materialKey][item.id]` → `{ name, text, lastSynced }`.
  `materialHelpers` does NOT attach pdfText to items, so look it up by `item.id` (preserved by
  `flattenItems` for both folder items and direct `pdf`/`drive-file` entries). Using
  `getMaterialItems` for the catalog still closes Do-not #2 — the leak is the *material flatten*,
  not the pdfText lookup.
- **Validation gate is safe:** `npm run validate` runs only `scripts/validation/validate-courses.js`
  + `validate-innovations.js` (course/innovation schema) — nothing asserts `ai-index.json` exists,
  so deleting the template will not fail validation.

## Patterns to Follow

**1. Paginate one page per language with a computed permalink** (new pattern for `.txt`;
mirror the pagination mechanics of the course pages and the bilingual permalink split):
```njk
// SOURCE: src/courses/home.njk:1-8 (pagination size:1 + alias) and src/en-US/index.njk:1-6 (lang/currentLang + /en-US/ permalink)
---
pagination:
  data: locale.available
  size: 1
  alias: lang
permalink: "{% if lang == locale.default %}/llms-full.txt{% else %}/{{ lang }}/llms-full.txt{% endif %}"
eleventyExcludeFromCollections: true
---
```
(No `layout:` — leave it off so 11ty emits raw text, exactly like `feed.njk`/`sitemap.njk`.)

**2. Data-file template emitting non-HTML with `| url` links** (mirror verbatim):
```njk
// SOURCE: src/feed.njk:1-21
---
permalink: /feed.json
eleventyExcludeFromCollections: true
---
...
{%- for course in coursesList -%}
{%- set hasPhotos = materialHelpers.hasMaterial(course, 'photos') -%}
  "id": "{{ ('/courses/' + course.slug + '/') | url }}",
{%- endfor -%}
```

**3. `cf()` per-language field access** (Do-not #8):
```njk
// SOURCE: src/courses/home.njk:11,25 and src/_includes/macros/i18n.njk:16-24
{% import "macros/i18n.njk" as i18nMacro %}
{{ i18nMacro.cf(course, 'title', lang) }}
```

**4. Material catalog via helpers (closes Do-not #2)** — replace the hand-rolled flatten:
```njk
// SOURCE: src/_data/materialHelpers.js:84-88 (getMaterialItems) and src/ai-discovery/ai-index.njk:188 (the materialKeys set to reuse)
{%- set materialKeys = ["workbook_photos","photos","blackboard","scripts_photos","songs_audio","sheet_music","workbook_pdfs","play_scripts","worksheet","syllabus","videos"] -%}
{%- for key in materialKeys -%}
  {%- set items = materialHelpers.getMaterialItems(course, key) -%}
  {%- for item in items -%}
    ... item.name / item.title / item.downloadUrl / item.tags ...
  {%- endfor -%}
{%- endfor -%}
```

**5. Doc prose via `getDoc` (no direct `course.docs` iteration)** — iterate a known key list:
```njk
// SOURCE: src/_data/materialHelpers.js:138-147 (getDoc) and src/ai-discovery/ai-index.njk:167-184 (the docs being inlined: name + content)
{%- set docKeys = ["course_description","story","play_script","course_innovation"] -%}
{%- for key in docKeys -%}
  {%- set doc = materialHelpers.getDoc(course, key) -%}
  {%- if doc and doc.content -%} ... doc.name + doc.content ... {%- endif -%}
{%- endfor -%}
```
(Confirm the doc-key list against `src/_data/course-configs/course_template.json` `docs` keys
+ `docs/development/material-system.md` during implement; add any missing key rather than
falling back to `course.docs` iteration.)

**6. `pdfText` lookup** (mirror exactly, but keyed off the helper loop):
```njk
// SOURCE: src/ai-discovery/ai-index.njk:245-248
{%- if item.isPdf and pdfTextCache and pdfTextCache[course.slug] and pdfTextCache[course.slug][key] and pdfTextCache[course.slug][key][item.id] -%}
  {%- set pdfCache = pdfTextCache[course.slug][key][item.id] -%}
  ... pdfCache.text ...
{%- endif -%}
```

**7. Teacher-facing absolute link (keep literal — `site.url` carries the subpath):**
```njk
// SOURCE: src/ai-guide/index.md:61 — change ONLY the filename, do NOT add | url
<a href="{{ site.url }}/llms-full.txt" target="_blank">{{ site.url }}/llms-full.txt</a>
```

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `src/ai-discovery/llms-full.njk` | CREATE | Paginated bilingual Markdown full-payload generator |
| `src/ai-discovery/ai-index.njk` | DELETE | Retire `/ai-index.json` (superset now exists); removes Do-not #2 flatten |
| `src/ai-guide/index.md` | UPDATE | Repoint zh-TW teacher guide: `ai-index.json` download/upload → give `{{ site.url }}/llms-full.txt` URL |
| `src/en-US/ai-guide/index.md` | UPDATE | Repoint en-US teacher guide → `{{ site.url }}/en-US/llms-full.txt` URL |
| `docs/development/base-path.md` | UPDATE | Repoint the machine-endpoint list entry (`/ai-index.json` → `/llms-full.txt`, ~line 66) |
| `docs/development/pdf-text-extraction.md` | UPDATE | Repoint pipeline references from `ai-index.json` to `llms-full.txt` |
| `docs/development/ai-index-core-generation-files.md` | UPDATE | Repoint content to the `llms-full.txt` generation files (note possible rename — flag, don't block) |
| `README.md` | UPDATE | Repoint user-facing instructions that name `ai-index.json` |
| `src/_data/pdfTextCache.js` | UPDATE | Repoint the comment "needed for ai-index.json generation" → `llms-full.txt` |

**Do NOT touch** (out of scope): `src/ai-discovery/for-ai.njk` (#16), `docs/CHANGELOG.md`,
`docs/adr/0004-*.md`, `.agents/plans/ai-discovery-format.md` (historical records — leave as-is).

## Tasks

### Task 1: Create `src/ai-discovery/llms-full.njk` (the generator)
- File: `src/ai-discovery/llms-full.njk`
- Action: CREATE
- Implement:
  - Front matter: pagination over `locale.available`, `size: 1`, `alias: lang`; computed
    `permalink` branching on `lang == locale.default` (Pattern 1); `eleventyExcludeFromCollections: true`;
    NO `layout`.
  - Body (Nunjucks → plain Markdown). Import `macros/i18n.njk as i18nMacro`.
  - **Preamble:** site name (`site.title`), `i18n[lang].site.description`, a one-line statement
    that this file inlines the whole corpus, and a pointer to the `llms.txt` index sibling.
    **The pointer MUST be per-language** (each file is strictly monolingual): branch on
    `lang == locale.default` exactly like the permalink — `{{ '/llms.txt' | url }}` for the
    zh-TW root file, `{{ '/en-US/llms.txt' | url }}` for the en-US file. Do not hard-code a
    single `/llms.txt` for both. Build date `{{ buildTime }}`.
  - **Per course** (`{% for course in coursesList %}`): an `H2` with `i18nMacro.cf(course,'title',lang)`;
    a metadata line from `cf()` for `grade`/`semester`/`unit`/`domain`/`teacher`; the human course
    page link `{{ ('/courses/' + course.slug + '/') | url }}`; the `overview` via `cf()`; the
    innovation fields (`innovation_summary`/`innovation_question` via `cf()`; optionally the
    `courseInnovations[course.slug][lang]` body, mirror `ai-index.njk:103-133`).
  - **Documents section:** loop `docKeys` via `materialHelpers.getDoc` (Pattern 5); inline
    `doc.name` as a heading + `doc.content` as prose.
  - **Materials section:** loop `materialKeys` via `materialHelpers.getMaterialItems` (Pattern 4);
    per item render title/name + `downloadUrl` + tags; for PDF items append `pdfCache.text`
    (Pattern 6). Use `materialHelpers.normalizeVideos(course)` for the `videos` key if you want
    YouTube/Drive URLs resolved, else render `item.downloadUrl`.
  - All field text via `cf()` (Do-not #8); all internal links via `| url` (Do-not #1); never read
    `course.material`/`course.docs` directly (Do-not #2).
- Mirror: `src/feed.njk:1-21`, `src/courses/home.njk:1-8`, `src/en-US/index.njk:1-6`,
  `src/ai-discovery/ai-index.njk:38-258` (for *what* to inline, not *how* it flattens).
- Validate: `ELEVENTY_BASE="/course-site-starter/" npm run build`, then confirm
  `_site/llms-full.txt` and `_site/en-US/llms-full.txt` exist, are monolingual Markdown, and
  contain at least one course's overview + one doc's prose + one `pdfText` block. Spot-check that
  the en-US file has English text (cf fallback to zh-TW only where en-US is absent).

### Task 2: Delete `src/ai-discovery/ai-index.njk`
- File: `src/ai-discovery/ai-index.njk`
- Action: DELETE
- Implement: remove the file. This stops `/ai-index.json` emission and deletes the hand-rolled
  `course.material`/`course.docs` flatten (closes Do-not #2). Nothing imports it.
- Validate: build, then confirm `_site/ai-index.json` is **absent**. `npm run validate` still passes.

### Task 3: Repoint zh-TW `/ai-guide/`
- File: `src/ai-guide/index.md`
- Action: UPDATE
- Implement: rewrite the JSON-download/upload narrative (lines ~22-36, 60-68, and the role-prompt
  at ~109) into the new "fetch a URL" model: instruct the teacher to give the AI the
  `llms-full.txt` URL. Change the link at line 61 to `{{ site.url }}/llms-full.txt`
  (literal, **no `| url`** — Pattern 7). Update the role-prompt text to reference the corpus by URL
  rather than an uploaded `ai-index.json` file. Keep `/ai-guide/` itself (human audience).
- Mirror: `src/ai-guide/index.md:61` (link form to preserve).
- Validate: build; confirm the rendered `_site/ai-guide/index.html` contains the
  `llms-full.txt` URL and no `ai-index.json`.

### Task 4: Repoint en-US `/ai-guide/`
- File: `src/en-US/ai-guide/index.md`
- Action: UPDATE
- Implement: same rewrite as Task 3, English prose; link → `{{ site.url }}/en-US/llms-full.txt`
  (literal, no `| url`).
- Mirror: Task 3.
- Validate: build; confirm `_site/en-US/ai-guide/index.html` contains the en-US `llms-full.txt`
  URL and no `ai-index.json`.

### Task 5: Repoint forward-looking docs + code comment
- Files: `docs/development/base-path.md` (~line 66), `docs/development/pdf-text-extraction.md`,
  `docs/development/ai-index-core-generation-files.md`, `README.md`, `src/_data/pdfTextCache.js`
  (comments ~lines 6,12).
- Action: UPDATE
- Implement: replace functional references to `ai-index.json` / `/ai-index.json` with
  `llms-full.txt` / `/llms-full.txt`, describing the new Markdown surface. For
  `ai-index-core-generation-files.md`, note in the plan handoff that a file rename may be
  warranted but is optional — update the content regardless. Leave historical records
  (`CHANGELOG.md`, `docs/adr/0004-*`, the PRD in `.agents/plans/`) untouched.
- Validate: `grep -rn "ai-index" src/ docs/development README.md` returns no *functional*
  references (only historical/ADR/CHANGELOG mentions remain, which are out of scope).

### Task 6: Full gate
- Run `npm run validate`.
- Run `npm run build:full` and `ELEVENTY_BASE="/course-site-starter/" npm run build`.
- E2E assertions below.

## Validation
- **Lint/schema:** `npm run validate` (course + innovation validators) passes with zero errors.
- **Default build:** `npm run build:full` succeeds.
- **Subpath build:** `ELEVENTY_BASE="/course-site-starter/" npm run build` succeeds.
- **E2E checklist:**
  - [ ] `_site/llms-full.txt` and `_site/en-US/llms-full.txt` exist; each is monolingual Markdown.
  - [ ] Each inlines, per course: overview/Doc prose + material catalog + at least one `pdfText`
        block where a scanned PDF exists (run a full build with PDF cache present, i.e. NOT
        `SKIP_PDF_CACHE=1`, to verify pdfText inlining).
  - [ ] `_site/ai-index.json` is **absent**; `src/ai-discovery/ai-index.njk` is deleted.
  - [ ] No hand-rolled `course.material`/`course.docs` flatten remains in `src/` (the new
        template uses `materialHelpers` only) — `grep -rn "course.material\[" src/` and
        `grep -rn "for .* in course.docs" src/` return nothing in the new template.
  - [ ] `_site/ai-guide/index.html` and `_site/en-US/ai-guide/index.html` reference the
        correct `llms-full.txt` URL (subpath-correct, not double-prefixed) and no `ai-index.json`.
  - [ ] In the subpath build, internal `| url` links in `llms-full.txt` read
        `/course-site-starter/courses/...` (single prefix), and the ai-guide absolute URLs read
        `https://dylankuo84137.github.io/course-site-starter/...llms-full.txt` (single subpath).

## Acceptance Criteria
- [ ] All tasks completed
- [ ] `npm run validate`, `build:full`, and subpath build pass with zero errors
- [ ] `/llms-full.txt` + `/en-US/llms-full.txt` generated via pagination; monolingual; superset of old `ai-index.json` (Doc prose + Material catalog + `pdfText`)
- [ ] `ai-index.njk` deleted; `/ai-index.json` no longer emitted; Do-not #2 flatten gone
- [ ] `/ai-guide/` repointed in both languages (no double-prefix); forward-looking docs repointed
- [ ] Follows existing patterns (`cf()` Do-not #8, `| url` Do-not #1, `materialHelpers` Do-not #2)
- [ ] Ordering dependency on #16 (and the `for-ai.njk` cosmetic note) flagged at review
```
