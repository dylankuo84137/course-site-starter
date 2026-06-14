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

**Tags**:
Free-form, **translatable** discovery keywords for a Course, used for search, the homepage
tag cloud, and `<meta>` keywords. Tags exist **only per-language** (`i18n.{lang}.tags`): a
tag is meaningful only in relation to the course content it describes, so there is no
language-neutral tag layer. A genuinely untranslatable token (a proper noun, a year) is
simply written into each locale's list. Each locale shows its own tags — the en-US site
shows English tags, the zh-TW site shows Chinese ones.
_Avoid_: keywords, labels, categories; `metadata.tags` (abolished — there are no
language-neutral tags)

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

**Course Page**:
A **page type** in a Course's fixed, ordered navigation — syllabus, worksheet, story,
play-script, workbook, photo gallery, blackboard, performance, songs, sheet-music, video.
Each type is realized as one 11ty page per Course via pagination (route
`/courses/{slug}/{type}/`), so a Course Page *is* a kind of 11ty page — the term names the
**type/slot**, not the per-Course instance or the runtime `page` object. A Course Page
*appears* only when its backing content exists; visibility is driven by the presence of its
Material category and/or Doc (so it may be Material-backed, Doc-backed, or a composite).
_Avoid_: tab, section; conflating with the 11ty `page` runtime global (never shadow it —
see the nav descriptor)

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

### Localization

**UI String**:
A piece of static interface text (nav labels, button captions, section headings) that is
the same for every Course. Lives in the site-wide locale dictionary and is read directly as
`i18n[lang].<key>` in templates — direct access is the *correct* idiom here. Distinct from a
Course Field: a UI String never varies by Course.
_Avoid_: conflating with course content; routing UI strings through `i18nMacro.cf`

**Course Field**:
A per-Course translatable value (`title`, `overview`, `unit`, `domain`, tags, …) stored under
`course.i18n.{lang}`. Resolved *only* through the `i18nMacro.cf(course, field, lang)` macro,
which applies the zh-TW fallback chain. Reaching into `course.i18n[lang][field]` directly in a
template is the footgun the AI Layer forbids — the sole sanctioned exception is the macro itself.
_Avoid_: direct `course.i18n[...]` access outside `macros/i18n.njk`; calling these "UI strings"

**Translation Hook**:
A `data-i18n*` DOM attribute a template puts on an element to mark it for the client-side runtime
translator (`lang-dynamic.js` / `course-filters.js`) to localize *after load* — its value names the
i18n key or Course Field to apply. Variants carry distinct semantics: `data-i18n` (plain text),
`data-i18n-placeholder` (an attribute), `data-i18n-template` (a string with `{count}`-style
placeholders), `data-i18n-course*` (per-card JSON-seeded fields). The set of legal hooks is the
**Translation Hook contract** — pinned in a registry and enforced on the emit side by a validator,
so a typo'd or orphaned hook fails the build instead of failing silently.
_Avoid_: data attribute, i18n tag, translation marker

### Community

**Discussion** (留言與交流):
The site-wide page where visitors submit course materials (via a Google Form) and leave
comments (via a CommentBox widget). Display label is 留言與交流 / "Comments & Discussions".
Route: `/discussion/`.
