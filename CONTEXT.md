# Course Site

A bilingual (zh-TW / en-US) static site that publishes Waldorf course materials —
workbook photos, blackboard drawings, scripts, sheet music, songs, and videos —
sourced from Google Drive and Google Docs.

## Language

### Identity

**Course**:
The unit a single course site represents. A Course is *either* a main-lesson block
(an epoch — one class's single-theme teaching block in a given term) *or* a
whole-semester specialist subject. Each Course is one `course_*.json` file, identified
by a `slug` encoding class, theme, academic year, and season (e.g. `3a-sunshot-113-summer`).
_Avoid_: subject, class, lesson

### Classification

**Subject Domain**:
The subject area a Course belongs to. The concept space mirrors the teaching-records
`domain` enum (語文, 社會, 數學, 自然, 藝術, 體育, 輔導, 特教, 其他), but the **stored value is
a language-neutral slug** (`language`, `nature`, `arts`, …) — never the Chinese label. The
Chinese/English text is a display concern (see Domain (display)), resolved via an i18n label
map. The single classification axis exposed as a filter on `/courses/` and as homepage grouping.
_Avoid_: domain_category, category; storing the Chinese label as the value

**Teaching Format**:
The pedagogical form of a Course — main-lesson/epoch (主課程), specialist subject (專科),
elective (選修), or class drama (班級戲劇). Like Subject Domain, the **stored value is a
language-neutral slug** (`main-lesson`, `specialist`, `elective`, `class-drama`), with the
Chinese label resolved via an i18n map. Orthogonal to Subject Domain: the same subject can be
taught as a main-lesson or a specialist subject, and one format spans many subjects. Recorded
for each Course but not (yet) a UI filter.
_Avoid_: domain, unit type, lesson type; storing the Chinese label as the value

**Domain** (display) / **Unit** (display):
The free-prose, per-language labels shown on a course card (`i18n.{lang}.domain` ≈ 自然主課,
歷史; `i18n.{lang}.unit` ≈ 班級戲劇, 主課程). Human-readable only; they may blend Subject
Domain and Teaching Format and are NOT the canonical facet keys.
_Avoid_: treating these as filter keys

> **Known conflation:** the legacy `metadata.domain_category` field mixes both axes —
> values like `nature`/`arts` are Subject Domain while `main-lesson` is Teaching Format.
> Canonically these are two separate concepts; the field should be split into Subject
> Domain and Teaching Format.

**Tags**:
Free-form, **translatable** discovery keywords for a Course, used for search, the homepage
tag cloud, and `<meta>` keywords. Each locale shows its own tags — the en-US site shows
English tags, the zh-TW site shows Chinese ones. Tags are fundamentally **per-language**
(`i18n.{lang}.tags`); `metadata.tags` is a rarely-used neutral escape hatch for genuinely
untranslatable tokens (a proper-noun slug, a year) and is empty for most Courses.
_Avoid_: keywords, labels, categories; putting language-specific tags in `metadata.tags`

> **Known gap (two coupled debts + a hard ordering):** Per-language tags require both a code
> fix *and* a data move, shipped together, or the en-US site regresses.
> 1. **Data:** today every Course's tags sit in `metadata.tags` written in Chinese, while
>    both `i18n.{lang}.tags` slots are empty. They must move: Chinese → `i18n.zh-TW.tags`,
>    and `i18n.en-US.tags` must be backfilled with English.
> 2. **Code:** `deriveTags` *merges* `metadata.tags` + every locale's tags into one shared
>    list. It must instead *select* by current locale — `dedupe(metadata.tags ++
>    i18n.{lang}.tags)` — which means it can no longer run language-agnostically at
>    hydration (`coursesList.js` serves one array to both language builds); selection moves
>    to render time, where `currentLang` is known, via a `tagHelpers` helper threaded
>    through the ~7 consumers. (`deriveTags:18`'s root-level `course.tags` branch is dead —
>    the validator blocks that legacy key.)

### Content

**Material**:
Collections of media assets attached to a Course — Drive folders, Drive files / PDFs, and
YouTube videos — grouped by display category (workbook photos, blackboard, sheet music,
songs, videos, …) and presented as galleries, embedded players, or download links.
_Avoid_: files, attachments, resources

**Doc**:
Long-form prose attached to a Course, synced as **plain text** from a single Google Doc
(one per key: course description, story, play script, course innovation) and rendered as
readable on-page text. Plain-text sync intentionally drops rich layout — when faithful
formatting matters, the same content is also kept as a PDF in Material (see Play Script).
_Avoid_: document, page, article

**Play Script**:
The script text of a class drama. May exist in two complementary forms: a Doc
(`play_script`, readable inline) and/or a PDF in Material (`play_scripts`). Both are kept
because plain-text Doc sync mangles a script's layout (character names, stage directions),
so the PDF preserves faithful formatting. The play-script page renders whichever forms exist.
_Avoid_: script (ambiguous with performance photos)

**Performance Photos** (`scripts_photos`):
Photographs of a drama performance — NOT the script text. A Material category, distinct
from Play Script despite the shared "script" wording.
_Avoid_: scripts, play scripts

### Innovation

**Innovation** (教學創新 / 教學反思):
A Course's pedagogical-novelty narrative — what is distinctive about *how* it was taught.
It has two layers with different provenance: a required, hand-authored **teaser** and an
optional, synced **essay**. "Teaching Reflection" (教學反思) is a synonym — the UI titles
the section "教學創新與反思 / Teaching Innovation & Reflection" — and refers to this same
concept, not a separate one.
_Avoid_: feature, highlight, (standalone) reflection

**Innovation Question** / **Innovation Summary**:
The teaser — a provocative headline question plus a 2–3 sentence pitch. Hand-authored per
language in `i18n.{lang}`; never touched by Drive sync. Required: every Course carries one,
shown on homepage highlight cards and the course-home teaser card.
_Avoid_: tagline, abstract

**Innovation Essay**:
The full long-form piece, synced from a Google Doc (`docs.course_innovation`, bilingual via
`---zh-TW---` / `---en-US---` markers) or a legacy markdown file. Optional and currently
empty for every Course. When absent, the "read more" CTA is hidden and the innovation page
degrades to an empty-state — the teaser never links to a dead end.
_Avoid_: reflection, article

### Community

**Discussion** (留言與交流):
The site-wide page where visitors submit course materials (via a Google Form) and leave
comments (via a CommentBox widget). Display label is 留言與交流 / "Comments & Discussions".
_Avoid_: reflections (the term means course-level Innovation, not this page)

> **Route rename (decided, not yet implemented):** this Discussion page is currently served
> at `/reflections/` — a legacy slug that collides with the domain term *Reflection* (Teaching
> Reflection, which lives on the Innovation page, not here). The decision is to rename the
> route to `/discussion/` and the nav key `nav.reflections → nav.discussion`. Until that
> lands, read `/reflections/` as the Discussion route. The migration touches the `src/reflections/`
> dir, the `permalink`, the `base.njk` nav link + the CommentBox trigger (`page.fileSlug ==
> 'reflections'`), `sitemap.njk`, `for-ai.njk`, and the i18n key — and should fold in the stale
> CommentBox title check (`'Messages & Discussions'`, which no longer matches any real label).
