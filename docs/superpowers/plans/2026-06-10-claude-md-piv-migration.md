# CLAUDE.md PIV Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the bloated `CLAUDE.md` with the lean ai-layer-template structure, adopt PIV Loop workflow, migrate detailed rules to reference docs, and create full PIV infrastructure.

**Architecture:** Content from `CLAUDE.md` splits three ways — footguns stay in `CLAUDE.md` Project Specifics, detailed architecture rules move to three new `docs/development/` reference files, and operational rules (Quality Gates, Commit Style, Workflow commands) are either absorbed into `validate.sh` or dropped entirely.

**Tech Stack:** 11ty + Nunjucks + vanilla JS. No build tools involved — all tasks are file writes and shell script creation.

---

## File Map

| Action | Path |
|--------|------|
| Rewrite | `CLAUDE.md` |
| Create | `docs/development/i18n-architecture.md` |
| Create | `docs/development/material-system.md` |
| Create | `docs/development/base-path.md` |
| Create | `.claude/validate.sh` |
| Create | `.agents/plans/.gitkeep` |

---

### Task 1: Create `docs/development/i18n-architecture.md`

**Files:**
- Create: `docs/development/i18n-architecture.md`

- [ ] **Step 1: Write the file**

```markdown
# i18n Architecture

Client-side dynamic translation with zero-FOUC (Flash of Unstyled Content). All course pages
build once (default zh-TW); the browser translates on the fly if the user prefers en-US.

## Data Structure: Single Source of Truth

All translatable content lives inside the `i18n` object in course JSON — never at root level.

```json
{
  "slug": "course-example",
  "hero_image": "drive-file-id",
  "metadata": {
    "grade_level": "2",
    "domain_category": "nature",
    "teacher_name": "Teacher Name",
    "tags": ["戲劇", "黑板畫"]
  },
  "i18n": {
    "zh-TW": {
      "title": "課程標題",
      "grade": "年級",
      "overview": "課程簡介..."
    },
    "en-US": {
      "title": "Course Title",
      "grade": "Grade Level",
      "overview": "Course overview..."
    }
  }
}
```

## Template Access

Use `cf()` for all i18n field access — never access `course.i18n` directly:

```nunjucks
{% import "macros/i18n.njk" as i18nMacro %}
{{ i18nMacro.cf(course, 'title', currentLang) }}
```

Fallback order: `course.i18n[lang][field]` → `course.i18n['zh-TW'][field]` → `course[field]`

- **UI strings:** `src/_data/i18n/{zh-TW,en-US}.json`
- Embedded in page as: `window.__I18N_DATA__` (UI), `data-course-i18n` attribute (courses)
- TreeWalker reverse lookup: Chinese text → key path → English text

## Language Preference Flow

1. **Early Detection** (`base.njk` inline `<script>` in `<head>`)
   - Runs before ANY content renders
   - Checks `localStorage.preferredLang`
   - Sets `html[lang]` and `data-user-lang` attributes synchronously

2. **FOUC Prevention** (`site.css`)
   ```css
   html:not([data-lang-ready]) body {
     visibility: hidden;
   }
   ```
   Body hidden until translation completes. Revealed when `data-lang-ready="true"` is set.

3. **Dynamic Translation** (`public/js/lang-dynamic.js`)
   - Loads **synchronously** (no `defer`) at end of `<body>`
   - Uses TreeWalker to find/replace UI text nodes
   - Parses `data-course-i18n` JSON for course content
   - Skips language switcher elements to avoid recursion
   - Sets `data-lang-ready="true"` after translation

## Route Behavior

**Homepage:** `/` → zh-TW default; `/zh-TW/` and `/en-US/` redirect based on saved preference.

**Course pages:** All built once (zh-TW). Client-side translation applies on load if preference is en-US.

## Performance

- No duplicate builds — one set of pages, not N × languages
- Inline critical script in `<head>` (< 0.2 KB, localStorage check only)
- CSS-based body hiding — more efficient than JS visibility toggle
- No external API calls or async dependencies

## Rules

**Never:**
- Build duplicate pages per language
- Use `defer` on `lang-dynamic.js` — causes FOUC
- Skip `data-lang-ready` marker — causes flash
- Translate language switcher labels — causes recursion
- Duplicate translatable fields at JSON root level
- Access `course.i18n[lang]` directly — use `i18nMacro.cf()`

**Always:**
- Add new course fields inside `i18n` object only
- Keep inline script minimal (localStorage check only)
- Test with preference cleared and preference set
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l docs/development/i18n-architecture.md
```
Expected: file exists, ~80+ lines.

- [ ] **Step 3: Commit**

```bash
git add docs/development/i18n-architecture.md
git commit -m "docs: add i18n-architecture reference doc (moved from CLAUDE.md)"
```

---

### Task 2: Create `docs/development/material-system.md`

**Files:**
- Create: `docs/development/material-system.md`

- [ ] **Step 1: Write the file**

```markdown
# Material System

Course materials and docs are accessed through helper functions — never directly via
`course.material` or `course.docs`.

## Data Structure

Materials live under `course.material` (media assets) and `course.docs` (text documents):

```json
{
  "material": {
    "workbook_photos": [
      { "type": "drive-folder", "id": "folder-id", "items": [] }
    ],
    "songs": [
      { "type": "drive-folder", "id": "folder-id", "items": [] }
    ]
  },
  "docs": {
    "syllabus": {
      "type": "google-doc",
      "id": "doc-id",
      "content": "",
      "downloadUrl": "",
      "lastSynced": ""
    }
  }
}
```

## Material Types

| Type | Description |
|------|-------------|
| `drive-folder` | Google Drive folder — items populated by `fetch-drive.mjs` sync |
| `drive-file` | Single Google Drive file |
| `manual` | Manually specified file/link |
| `youtube` | YouTube video (id field holds video ID) |

## Accessing Materials in Templates

Use `materialHelpers` (available as a global in all templates):

```nunjucks
{# Check if a material section exists #}
{% if materialHelpers.hasMaterial(course, 'songs') %}

{# Get items from a material section #}
{% set items = materialHelpers.getMaterialItems(course, 'workbook_photos') %}

{# Get a doc #}
{% set syllabus = materialHelpers.getDoc(course, 'syllabus') %}
```

Never access `course.material.songs` or `course.docs.syllabus` directly — the helpers
handle missing sections, type normalization, and schema changes.

## Legacy Keys (Blocked)

The validator rejects these keys — do not use them:
- `drive_folders` → use `material.workbook_photos` etc.
- `google_docs` → use `docs`
- `files.*` → use `material`
- `youtube_videos` → use `material` with type `youtube`
- Root-level `tags` → use `metadata.tags`

## Sync Script

`scripts/sync/fetch-drive.mjs` populates `items[]` arrays in `material` sections.
It only mutates the JSON data files — never templates. Requires `GOOGLE_API_KEY` env var.
Handles Drive shortcuts by resolving the target ID automatically.

Run: `npm run sync:drive`
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l docs/development/material-system.md
```
Expected: file exists, ~60+ lines.

- [ ] **Step 3: Commit**

```bash
git add docs/development/material-system.md
git commit -m "docs: add material-system reference doc (moved from CLAUDE.md)"
```

---

### Task 3: Create `docs/development/base-path.md`

**Files:**
- Create: `docs/development/base-path.md`

- [ ] **Step 1: Write the file**

```markdown
# Base Path, Drive Integration, Gallery, and AI Accessibility

## Base Path

The site deploys to a GitHub Pages project subpath (e.g., `/course-site-starter/`).
All internal links must use the `url` filter — never hardcode absolute paths.

`.eleventy.js` sets the prefix:
```javascript
pathPrefix: process.env.ELEVENTY_BASE || '/'
```

**In templates:**
```html
<!-- Correct -->
<a href="{{ '/courses/2a' | url }}">Link</a>
<link href="{{ '/css/site.css' | url }}">

<!-- Wrong — breaks on subpath deployment -->
<a href="/courses/2a">Link</a>
```

Test subpath correctness before every commit:
```bash
ELEVENTY_BASE="/course-site-starter/" npm run build
```

## Drive Integration

- Auto-tag images from filenames: grade/semester/unit/domain + `[tag]`/`#tag` notation
- Sync script (`scripts/sync/fetch-drive.mjs`) only mutates JSON — never templates
- Handle Drive shortcuts by resolving target file ID (not the shortcut ID)
- Fail gracefully in CI: warn on sync errors, never block the build

## Gallery & Search

**Gallery (`public/js/gallery.js`):**
- One overlay element, keyboard nav: ← / → (prev/next), ESC (close)
- Simple text filter narrows thumbnails
- Image loading: try Drive thumbnail first, fallback to `uc?export=view` URL
- Keep `gallery.js` minimal and focused — no extra features

**Search (Pagefind):**
- Build index: `npx pagefind --site _site` (included in `npm run build:full`)
- Runtime: load from local index first, CDN fallback if index missing
- `npm run dev:fast` skips indexing — use `npm run dev` to test search

## AI Accessibility

Goal: make all content machine-readable for AI tools (NotebookLM, ChatGPT, Claude, etc.)

**HTML structure:**
- Use semantic tags: `<article>`, `<section>`, `<nav>`, `<aside>`
- Strict heading hierarchy: h1 → h2 → h3 (no skips)
- Unique fragment IDs on all content blocks: `id="unit-2-lesson-3"`
- `<time datetime="...">` for all dates
- Meaningful alt text describing educational content (not just "photo")

**Metadata:**
- JSON-LD schema on all course pages (`@type: "Course"`)
- Required fields: `name`, `description`, `provider`, `teaches`, `educationalLevel`
- `<meta name="description">` with 2-3 sentence summary

**Machine-readable endpoints (already built):**
- `/for-ai.html` — human-readable site guide
- `/ai-index.json` — complete course catalog

**Links:** use descriptive text, not generic phrases:
```html
<!-- Good -->
<a href="{{ '/courses/2a-nenggao/workbook' | url }}#week-3">Week 3 Firefly Study</a>

<!-- Bad -->
<a href="{{ '/courses/2a-nenggao/workbook' | url }}">Click here</a>
```
```

- [ ] **Step 2: Verify file was created**

```bash
wc -l docs/development/base-path.md
```
Expected: file exists, ~70+ lines.

- [ ] **Step 3: Commit**

```bash
git add docs/development/base-path.md
git commit -m "docs: add base-path reference doc (moved from CLAUDE.md)"
```

---

### Task 4: Rewrite `CLAUDE.md`

**Files:**
- Modify: `CLAUDE.md` (full rewrite)

- [ ] **Step 1: Replace the entire file with the new content**

Write `CLAUDE.md` with exactly this content:

```markdown
# CLAUDE.md

This file is the **AI Layer** for this project: the always-loaded contract that tells
Claude how to think, work, and verify here. Keep it lean (aim for under ~2.5k tokens); a bloated system
prompt starts every session already degraded.

---

## Smart Zone

LLMs have two hard limits this project is designed around:

1. **Context decay** — an agent does its best work in roughly the first ~100k tokens of a
   session. Past that, attention relationships overload and decisions get sloppy. A larger
   context window does not fix this; it only buys more *dumb zone*.
2. **Amnesia** — clearing context resets the agent entirely. Nothing survives a session
   except what was written to a file.

The working rules that follow from this:

- **One job per session.** Plan, implement, and review are separate sessions (see
  [PIV Loop](#piv-loop)). Don't review code in the same session that wrote it — the
  reviewer would be a dumber version of the implementer.
- **Prefer `/clear` over compaction.** Clearing returns you to a known baseline. Compaction
  leaves sediment that destabilizes later behavior. Re-prime from files instead.
- **Offload research to sub-agents.** Codebase exploration can burn hundreds of thousands
  of tokens. Delegate it; pull back only the summary so the main context stays in the
  smart zone.
- **Files are the only durable memory.** The handoff between sessions is a written
  artifact (a plan, a report), never the agent's recollection.
- **Watch your own budget.** If a task is pushing you past the smart zone mid-build, write
  a checkpoint file describing remaining work and stop cleanly rather than degrading.

## PIV Loop

The per-task inner loop: **Plan → Implement → Validate**. Each phase is a *fresh session*;
the plan file is the only interface between Plan and Implement. This separation is
deliberate — it stops planning bias and context pollution from leaking into implementation.

1. **Plan** (`/plan`) — New session. Load the Issue plus the relevant slice of the
   codebase, explore (delegate heavy research to sub-agents), and emit a context-rich
   plan to `.agents/plans/{name}.plan.md`. No code is written. The plan names the exact
   `file:line` patterns to mirror, the files to change, an ordered task list, and the
   validation strategy.
2. **Implement** (`/implement`) — **Reopen a fresh session.** Read the plan, verify its
   assumptions against the real code, then execute task by task. Run the project's checks
   after every task and fix failures before moving on — never accumulate broken state.
3. **Validate** (`/validate`) — **Own fresh session.** Runs the full gate (`.claude/validate.sh` +
   the plan's E2E checklist), then hands to human review. Pass → merge. Problem →
   drop into the [System Evolution](#system-evolution) outer loop via `/retroactive`.

Anytime you find yourself prompting the same thing more than three times, promote it to a
command or skill.

## System Evolution

The outer loop. When a PIV Loop surfaces a bug or a miss, don't just patch the surface
code — treat it as a signal that the **AI Layer itself** is incomplete. Run a *retroactive
session*:

> "You let this problem reach the codebase. Look at your AI Layer — the rules, commands,
> skills, and workflow — and find what we can change so this class of problem can't recur."

Four places to look:

1. **Commands** — is the procedure itself missing a step?
2. **On-demand context** — do `docs/development/` reference files need updating?
3. **Global rules** (this file) — is an existing constraint too vague to bind?
4. **Plan / PRD templates** — is a section structurally missing?

## Conventions

Behavioral guardrails for every change. These bias toward caution over speed; for trivial
tasks, use judgment.

**Think before coding.** State assumptions explicitly; if uncertain, ask. If multiple
interpretations exist, surface them all — don't silently pick one. If something is unclear,
stop and name what's confusing.

**Simplicity first.** Write the minimum code that solves the problem. No speculative
features, no abstractions for single-use code, no error handling for impossible scenarios.
If 200 lines could be 50, rewrite it.

**Surgical changes.** Touch only what the task requires. Don't "improve" adjacent code or
reformat unrelated lines. Match existing style. Remove only the orphans *your* change
created; leave pre-existing dead code (mention it instead). Every changed line should trace
to the request.

**Goal-driven execution.** Turn each task into a verifiable success criterion before
starting — "add validation" becomes "write tests for invalid inputs, then make them pass."
Strong criteria let the agent loop independently; weak ones ("make it work") force constant
clarification.

**Verification-led.** Rate of feedback is your speed limit. Define how you'll verify work
*before* doing it. Run `.claude/validate.sh` after every meaningful change.

---

### Project Specifics

- **Stack:** 11ty + Nunjucks + vanilla JS + Pagefind + Drive sync. GitHub Pages subpath `/course-site-starter/`.
- **Verify commands:**
  - dev: `npm run dev:fast`
  - check: `npm run validate`
  - full: `npm run build:full`
  - subpath: `ELEVENTY_BASE="/course-site-starter/" npm run build`
- **Architecture:** `src/_data/course-configs/*.json` (data) → `src/_includes/` (templates) → `public/js/` (behavior) → `public/css/site.css` (styles). See `docs/development/STRUCTURE.md`.
- **Do-not:**
  1. Absolute paths — always `{{ '/path' | url }}` (see `docs/development/base-path.md`)
  2. Direct `course.material` / `course.docs` access — use `materialHelpers` (see `docs/development/material-system.md`)
  3. Direct i18n field access — use `i18nMacro.cf(course, field, lang)` (see `docs/development/i18n-architecture.md`)
  4. Translatable fields at JSON root — `i18n` object only
  5. Legacy keys: `drive_folders`, `google_docs`, `files.*`, `youtube_videos`
  6. `defer` on `lang-dynamic.js` — causes FOUC
  7. JS ternaries in Nunjucks templates
  8. Frameworks (React/Vue/Webpack/bundlers)
```

- [ ] **Step 2: Count lines to verify it's lean**

```bash
wc -l CLAUDE.md
```
Expected: ~100 lines (down from 355).

- [ ] **Step 3: Verify build still passes**

```bash
npm run validate
```
Expected: exits 0, no errors.

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md
git commit -m "refactor(ai-layer): migrate CLAUDE.md to lean PIV template structure

- adopt Smart Zone / PIV Loop / System Evolution / Conventions from ai-layer-template
- condense project rules to 8 footguns in Project Specifics
- detailed rules moved to docs/development/{i18n-architecture,material-system,base-path}.md
- drop Quality Gates, Commit Style, Development Workflow sections"
```

---

### Task 5: Create `.claude/validate.sh`

**Files:**
- Create: `.claude/validate.sh`

- [ ] **Step 1: Write the file**

```bash
#!/usr/bin/env bash
set -e

npm run validate
npm run build:full
ELEVENTY_BASE="/course-site-starter/" npm run build
```

- [ ] **Step 2: Make it executable**

```bash
chmod +x .claude/validate.sh
```

- [ ] **Step 3: Run it to verify it works**

```bash
.claude/validate.sh
```
Expected: all three commands pass, exits 0. This will take ~45-60 seconds.

- [ ] **Step 4: Commit**

```bash
git add .claude/validate.sh
git commit -m "feat(ai-layer): add .claude/validate.sh for PIV validate gate"
```

---

### Task 6: Create `.agents/plans/` directory

**Files:**
- Create: `.agents/plans/.gitkeep`

- [ ] **Step 1: Create the directory and placeholder**

```bash
mkdir -p .agents/plans
touch .agents/plans/.gitkeep
```

- [ ] **Step 2: Verify**

```bash
ls -la .agents/plans/
```
Expected: `.gitkeep` file present.

- [ ] **Step 3: Commit**

```bash
git add .agents/plans/.gitkeep
git commit -m "feat(ai-layer): add .agents/plans/ directory for PIV plan files"
```

---

## Self-Review Notes

**Spec coverage check:**
- ✅ Three reference docs created (i18n-architecture, material-system, base-path)
- ✅ CLAUDE.md rewritten with template + project specifics
- ✅ `.claude/validate.sh` created with all three verify commands
- ✅ `.agents/plans/` directory created

**Content migration check:**
- i18n-architecture.md: covers language detection flow, FOUC, translation data, template access, Always/Never rules
- material-system.md: covers material types, helper API, docs access, legacy keys, sync script
- base-path.md: covers url filter rule, drive integration, gallery/search, AI accessibility
- Nothing from current CLAUDE.md is lost — Quality Gates and Commit Style dropped intentionally per design

**No placeholders:** all file content is complete and literal.
