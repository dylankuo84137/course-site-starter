# Course Site

A bilingual (zh-TW / en-US) static site that publishes Waldorf course materials —
workbook photos, blackboard drawings, scripts, sheet music, songs, and videos —
sourced from Google Drive and Google Docs.

## Language

### Identity

**Course**:
The unit a single course site represents. A Course is *either* a main-lesson block — an
epoch, one class's single-theme teaching block in a term — *or* a whole-semester specialist
subject. Each Course is one `course_*.json` file, identified by a `slug` encoding class,
theme, academic year, and season (e.g. `3a-sunshot-113-summer`).
_Avoid_: subject, class, lesson

### Classification

**Subject Domain**:
The subject area a Course belongs to — its concept space mirrors the teaching-records `domain`
enum (語文, 社會, 數學, 自然, 藝術, 體育, 輔導, 特教, 其他). The **stored value is a
language-neutral slug** — `language`, `nature`, `arts` — never the Chinese label; the display
text is resolved via an i18n map (see Domain (display)). The single axis exposed as a filter
on `/courses/` and homepage grouping.
_Avoid_: domain_category, category; storing the Chinese label as the value

**Teaching Format**:
The pedagogical form of a Course — main-lesson/epoch (主課程), specialist subject (專科),
elective (選修), or class drama (班級戲劇). Like Subject Domain, the **stored value is a
language-neutral slug** (`main-lesson`, `specialist`, `elective`, `class-drama`), with the
Chinese label from an i18n map. Orthogonal to Subject Domain: one subject can be taught as
either format, and one format spans many subjects. Recorded per Course but not (yet) a UI filter.
_Avoid_: domain, unit type, lesson type; storing the Chinese label as the value

**Domain** (display) / **Unit** (display):
The free-prose, per-language labels shown on a course card (`i18n.{lang}.domain` ≈ 自然主課,
歷史; `i18n.{lang}.unit` ≈ 班級戲劇, 主課程). Human-readable only; they may blend Subject
Domain and Teaching Format and are NOT canonical facet keys.
_Avoid_: treating these as filter keys

**Tags**:
Free-form, **translatable** discovery keywords for a Course — used for search, the homepage
tag cloud, and `<meta>` keywords. Tags exist **only per-language** (`i18n.{lang}.tags`): a
tag means something only against the content it describes, so there is no language-neutral
tag layer. An untranslatable token (a proper noun, a year) is just written into each locale's
list. Each locale shows its own tags — en-US shows English, zh-TW shows Chinese.
_Avoid_: keywords, labels, categories; `metadata.tags` (abolished — there are no
language-neutral tags)

### Content

**Material**:
Media assets attached to a Course — Drive folders, Drive files / PDFs, and YouTube videos —
grouped by display category (workbook photos, blackboard, sheet music, songs, videos, …) and
shown as galleries, embedded players, or download links.
_Avoid_: files, attachments, resources

**Doc**:
Long-form prose attached to a Course, synced as **plain text** from a single Google Doc
(one per key: course description, story, play script, course innovation) and rendered as
on-page text. Plain-text sync deliberately drops rich layout; when formatting matters, the
content is also kept as a PDF in Material (see Play Script).
_Avoid_: document, page, article

**Play Script**:
The script text of a class drama. May exist in two forms: a Doc (`play_script`, readable
inline) and/or a PDF in Material (`play_scripts`). Both are kept because plain-text Doc sync
mangles a script's layout (character names, stage directions), so the PDF preserves it. The
play-script page renders whichever forms exist.
_Avoid_: script (ambiguous with performance photos)

**Performance Photos** (`scripts_photos`):
Photographs of a drama performance — NOT the script text. A Material category, distinct
from Play Script despite the shared "script" wording.
_Avoid_: scripts, play scripts

**Course Page**:
A **page type** in a Course's fixed, ordered navigation — syllabus, worksheet, story,
play-script, workbook, photo gallery, blackboard, performance, songs, sheet-music, video.
Each type becomes one 11ty page per Course via pagination (route `/courses/{slug}/{type}/`),
so a Course Page names the **type/slot**, not the per-Course instance or the runtime `page`
object. A Course Page appears only when its backing content exists — its Material category
and/or Doc — so it may be Material-backed, Doc-backed, or a composite.
_Avoid_: tab, section; conflating with the 11ty `page` runtime global (never shadow it —
see the nav descriptor)

### Innovation

**Innovation** (教學創新 / 教學反思):
A Course's pedagogical-novelty narrative — what is distinctive about *how* it was taught.
Two layers with different provenance: a required, hand-authored **teaser** and an optional,
synced **essay**. "Teaching Reflection" (教學反思) is a synonym for the same concept — the
UI titles the section "教學創新與反思 / Teaching Innovation & Reflection" — not a separate thing.
_Avoid_: feature, highlight, (standalone) reflection

**Innovation Question** / **Innovation Summary**:
The teaser — a headline question plus a 2–3 sentence pitch. Hand-authored per language in
`i18n.{lang}`, never touched by Drive sync. Required: every Course has one, shown on homepage
highlight cards and the course-home teaser card.
_Avoid_: tagline, abstract

**Innovation Essay**:
The full long-form piece, synced from a Google Doc (`docs.course_innovation`, bilingual via
`---zh-TW---` / `---en-US---` markers) or a legacy markdown file. Optional, currently empty
for every Course. When absent, the "read more" CTA is hidden and the page shows an empty-state
— the teaser never links to a dead end.
_Avoid_: reflection, article

### Localization

**UI String**:
Static interface text (nav labels, button captions, section headings) that is the same for
every Course. Lives in the site-wide locale dictionary, read directly as `i18n[lang].<key>`
in templates — direct access is the *correct* idiom here. Unlike a Course Field, a UI String
never varies by Course.
_Avoid_: conflating with course content; routing UI strings through `i18nMacro.cf`

**Course Field**:
A per-Course translatable value stored under `course.i18n.{lang}`, always **text** — never a
number or boolean. Most are **scalar strings** (`title`, `overview`, `unit`, `domain`, …); a
few are **structured** (`learningObjectives` is an **array of strings**). Resolve *only*
through the sanctioned **resolver family** — never by reaching into `course.i18n[lang][field]`
directly in a template:
- `cf()` — scalar fields in HTML sinks (Nunjucks-escaped).
- `cfRaw()` — scalar fields in plain-text / Markdown sinks (un-escaped).
- `getI18nField()` (in `courseHelpers.js`) — **structured** fields, where a string-rendering
  macro can't return the raw value to iterate over.

All three share **one fallback semantic**: a value that is absent *or empty* (`null`, empty
string, or empty array) means "not authored in this locale" and falls back to the zh-TW
canonical — the same rule for scalar and structured fields. Since a Course Field is always
text, "empty" is fully defined by those cases; there is deliberately no numeric/boolean field
for a falsy `0`/`false` to misfire on. (`Tags` are the exception: per-language, no fallback —
see Tags.)
_Avoid_: direct `course.i18n[...]` access outside the resolver family; calling these "UI strings"

**Translation Hook**:
Any `data-*` DOM attribute a template puts on an element so the client-side runtime translators
(`lang-dynamic.js` / `course-filters.js`) localize it *after load*. The `data-i18n*` family
substitutes text or attributes (the value names the i18n key or Course Field to apply);
`data-lang-only` controls visibility by locale (value is a comma-separated locale list, no text
substitution). The full set of legal hooks is the **Translation Hook contract**, pinned in a
registry. A build-time validator enforces the `data-i18n*` subset — a typo'd or orphaned
`data-i18n*` hook fails the build instead of failing silently. `data-lang-only` is registered
for documentation but not emit-enforced (its naming falls outside `data-i18n*`).
_Avoid_: data attribute, i18n tag, translation marker

### Community

**Discussion** (留言與交流):
The site-wide page where visitors submit course materials (via a Google Form) and leave
comments (via a CommentBox widget). Display label is 留言與交流 / "Comments & Discussions".
Route: `/discussion/`.

### Machine-readable Surface

**Discovery Index**:
The per-locale Markdown file at `/llms.txt` (zh-TW) and `/en-US/llms.txt` (en-US) — lists
every Course with a summary, metadata, and links to its Course Pages, opening with a preamble
that points at the same-locale Full Corpus. The primary entry point for LLMs using a fetch
tool. Generated by 11ty pagination over `locale.available` in `src/ai-discovery/llms-txt.njk`.
_Avoid_: ai-index, llms index, discovery page

**Full Corpus**:
The per-locale Markdown file at `/llms-full.txt` (zh-TW) and `/en-US/llms-full.txt`
(en-US) — a superset of the Discovery Index with Doc prose and Material PDF text inlined.
For LLMs that need the complete payload in one fetch. Retired the old `ai-index.json`.
Generated by `src/ai-discovery/llms-full.njk`.
_Avoid_: ai-index.json (retired), full text, full payload

**Cross-link**:
The mutual reference between the Discovery Index and the Full Corpus within one locale: each
links to the other's same-locale page. Both paths must derive from `lang` via the locale-aware
URL idiom (see `docs/development/base-path.md`) — never a hardcoded locale literal.
_Avoid_: back-link (ambiguous)
