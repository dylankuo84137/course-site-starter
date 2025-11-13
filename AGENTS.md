# Repository Guidelines

## Project Structure & Module Organization
Eleventy 3 compiles everything inside `src` into `_site`. Course metadata lives in `src/_data/course-configs/` (one `course_*.json` per offering) and is transformed by helpers in `src/_data/courseValidation.js` and `coursesList.js`. Reusable layouts are under `src/_includes/layouts` and `src/_includes/components`, while route-level views stay in `src/courses/`, `src/reflections/`, and `src/index.njk`. Static assets belong in `public/` (e.g., `public/css/site.css`, `public/js/lang-dynamic.js`). Automation scripts such as `scripts/fetch-drive.mjs` and `scripts/validate-courses.js` handle Drive sync and schema checks; skim `STRUCTURE.md` for a directory deep dive.

## Build, Test, and Development Commands
- `npm install` - install Eleventy, Pagefind, and helper tooling.
- `npm run dev` - start Eleventy with live reload at `localhost:8080`.
- `npm run build` - produce a clean `_site/` bundle.
- `npm run postbuild` - index the `_site` output with Pagefind.
- `npm run deploy` - run build + search indexing for CI/CD.
- `GOOGLE_API_KEY=... npm run sync:drive` - mirror Drive folders locally.
- `npm run validate` / `npm run validate:watch` - enforce `course_*.json` schema.

## Coding Style & Naming Conventions
Use two-space indentation for JS/Nunjucks, keep imports and filters sorted, and prefer `const` for helpers. Name course configs `course_<grade>_<slug>.json` and keep slugs kebab-case (`3a_sunshot_113_summer`). Component filenames stay kebab-case as well (`course-breadcrumb.njk`). Keep Tailwind classes declarative (layout > typography > effects) and avoid ad-hoc inline styles that deviate from `public/css/site.css`.

## Simple vs. Easy
Adopt the principle of **building simple (unbraided) artifacts, not just easy (convenient) code**. Favor designs that keep data, templates, and behaviors loosely coupled even if that extra thought feels slower in the moment. When evaluating solutions:
- Prefer reshaping a feature so it stays within the existing layers (data ➝ templates ➝ JS) over adding cross-cutting helpers or hidden state.
- Remove incidental complexity (duplicate config, repeated selectors, brittle selectors) instead of masking it with quick fixes or nested conditionals.
- Document invariants and entry points when you must introduce complexity, so the next change can still be simple to reason about.
- Treat "easy" shortcuts (inline styles, ad-hoc scripts, implicit globals) as last resorts—reach for them only after confirming the simple shape truly cannot fit the requirement.

## Testing Guidelines
`npm run validate` must pass before commits; it inspects required fields, tag formats, and Drive IDs through `src/_data/course-validator.js`. Use `validate:watch` while editing JSON to catch regressions early. Smoke-test pages with `npm run dev` whenever templates change, and run `npm run build` before sharing screenshots or deploying.

## Commit & Pull Request Guidelines
Follow the Conventional Commit style already used (`feat(course-ui): ...`, `fix(i18n): ...`). Scope names should map to directories (`course-data`, `i18n`, `scripts`). PRs need: a concise summary, linked issue (if any), validation proof (`npm run validate` output), and screenshots for visual or content shifts (e.g., `/courses` filters, gallery pages). Mention any Drive assets that must be pre-synced, and keep secrets out of diffs.

## Data Sync & Configuration
Store Drive folder IDs under `drive_folders.*` and ensure they are "Anyone with the link can view" before syncing. Supply `GOOGLE_API_KEY` via `.env` or CI secrets, never hard-coded. After syncing, commit only metadata JSON -- asset payloads remain remote. When adjusting site settings, change `src/_data/site.json` and keep bilingual strings updated in `src/_data/i18n/*.json`.

## TASK Agent Instructions
Act as the workflow agent for the files under `TASK/` and run through this checklist every time:
1. List every `TASK/*.md`, but only touch entries whose front matter sets `enabled: true`; ignore everything else.
2. Before editing anything, read the task metadata (`id`, `title`, `log_file`, `auto_run`) and append a short "starting task" line to the referenced `log_file` (e.g., `printf '%s start' "$(date -Iseconds)" >> logs/...`).
3. Record every shell command, file edit (`apply_patch`, `cat > file`, etc.), git action, and plan step (include the step label + status whenever you open/update the plan) in that same log so humans can replay the session later.
4. When `auto_run: false`, stop and ask for approval before each shell or git command; once granted, continue executing while keeping the log up to date.
5. If a task requires a commit, use `git commit -m "agent: <short-desc> (task <id>)"`; otherwise leave changes staged/untracked and mention the log path when handing off.

## Running Auto-Run Agents (No Approval Mode)
Use this mode only when automation needs to finish end-to-end without interaction:
- Launch Codex CLI with `sandbox_mode=workspace-write` (or higher) and `approval_policy=never`, then note those settings in the log so reviewers know the constraints.
- Export required secrets and environment variables (e.g., `export GOOGLE_API_KEY=...`) before the first command because you cannot pause mid-run to request them.
- Batch commands (`npm ci && npm run validate`, `GOOGLE_API_KEY=... node scripts/fetch-drive.mjs`, etc.) and tee their output into repo logs for later review.
- Never call `git commit` unless the user explicitly instructs you; keep diffs staged or unstaged and report pending actions instead.
- When automation stops, record the log location plus any remaining manual steps (deploy, screenshots, Drive sync) so a human can finish the workflow.
