# Design: CLAUDE.md PIV Migration

**Date:** 2026-06-10
**Goal:** Replace the current bloated `CLAUDE.md` with the lean ai-layer-template structure, adopt the PIV Loop workflow, and migrate detailed rules to reference docs.

---

## Summary

Adopt the [ai-layer-template](../../../) structure for `CLAUDE.md`. This means:
- Four template sections carry over verbatim: Smart Zone, PIV Loop, System Evolution, Conventions
- Project Specifics section fills in stack, verify commands, architecture pointer, and ~8 footguns
- Detailed rules move to three new `docs/development/` reference files
- Full PIV infrastructure created: `.claude/validate.sh` and `.agents/plans/`

Target: ~2.5k token `CLAUDE.md`, down from ~355 lines.

---

## Section 1: New CLAUDE.md

### Template sections (verbatim from ai-layer-template)
- Smart Zone
- PIV Loop (with project-specific `/plan`, `/implement`, `/validate` commands)
- System Evolution
- Conventions

### Project Specifics (project-filled)

**Stack:** 11ty + Nunjucks + vanilla JS + Pagefind + Drive sync. Hosted on GitHub Pages at project subpath `/course-site-starter/`.

**Verify commands:**
- dev: `npm run dev:fast`
- check: `npm run validate`
- full: `npm run build:full`
- subpath: `ELEVENTY_BASE="/course-site-starter/" npm run build`

**Architecture:** `src/_data/course-configs/*.json` (data) → `src/_includes/` (templates) → `public/js/` (behavior) → `public/css/site.css` (styles). See `docs/development/STRUCTURE.md`.

**Do-not (footguns):**
1. Absolute paths — always `{{ '/path' | url }}`
2. Direct `course.material` / `course.docs` access — use `materialHelpers`
3. Direct i18n field access — use `i18nMacro.cf(course, field, lang)`
4. Translatable fields at JSON root — `i18n` object only
5. Legacy keys: `drive_folders`, `google_docs`, `files.*`, `youtube_videos`
6. `defer` on `lang-dynamic.js` — causes FOUC
7. JS ternaries in Nunjucks templates
8. Frameworks (React/Vue/Webpack/bundlers)

### Dropped from current CLAUDE.md
- Quality Gates → replaced by `.claude/validate.sh`
- Commit Style → team muscle memory, not AI layer
- Development Workflow → verify commands live in Project Specifics
- Simple vs. Easy Test → subsumed by Conventions section

---

## Section 2: Reference Docs (new files in `docs/development/`)

| File | Content |
|------|---------|
| `i18n-architecture.md` | Multi-Language Support: language detection flow, FOUC prevention, localStorage preference, translation data structure, Always/Never lists |
| `material-system.md` | Material helpers API, docs access patterns, material type list (`drive-folder`, `drive-file`, `manual`, `youtube`), template macro usage (`materialHelpers`, `i18nMacro.cf`) |
| `base-path.md` | Base Path Correctness, Drive Integration rules, Gallery & Search patterns, AI Accessibility requirements |

These files preserve all content that was in `CLAUDE.md` but is too detailed for a lean AI layer. Agents load them on-demand when working in those areas.

---

## Section 3: Infrastructure

**`.claude/validate.sh`**
```bash
#!/usr/bin/env bash
set -e
npm run validate
npm run build:full
ELEVENTY_BASE="/course-site-starter/" npm run build
```

**`.agents/plans/`** — empty directory (`.gitkeep`) for plan files produced by `/plan` sessions.

**Unchanged:** `.claude/settings.local.json`, `.claude/agents/`

---

## Implementation Order

1. Create three reference docs in `docs/development/` (content moved from current CLAUDE.md)
2. Rewrite `CLAUDE.md` using template + project specifics
3. Create `.claude/validate.sh`
4. Create `.agents/plans/.gitkeep`
5. Commit all as single changeset
