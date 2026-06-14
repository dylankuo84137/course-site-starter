# Plan: Locale-aware cross-links between llms.txt and llms-full.txt

## Summary
The AI-discovery pages cross-link the discovery index (`llms.txt`) and the full corpus
(`llms-full.txt`), but two of those links don't track the paginated `lang` alias.
In `src/ai-discovery/llms-txt.njk` the full-corpus link is the literal `/llms-full.txt`
for **both** locales, so the en-US page (`/en-US/llms.txt`) wrongly points at the zh-TW
corpus — the actual functional bug. In `src/ai-discovery/llms-full.njk` the discovery
back-links are hardcoded per-branch (`/llms.txt` and `/en-US/llms.txt`); they happen to
resolve correctly today but violate the "derive from `lang`, never hardcode a locale
segment" contract and will silently drift if locales change. The fix derives both paths
from `lang` using the repo's existing inline-if idiom, exactly as `lang_switcher.njk`
already does, and keeps the `| url` filter so the GitHub Pages subpath is preserved.

## User Story
As an LLM (or human) reading the en-US AI-discovery index, I want the "full corpus" link
to resolve to the **en-US** full corpus so that I follow the right-language payload, not
the zh-TW one.

## Metadata
| Field | Value |
|-------|-------|
| Type | BUG_FIX |
| Complexity | LOW |
| Systems affected | AI-discovery templates (`src/ai-discovery/`) |
| Issue | #30 |

## Assumptions & Risks
| Claim | VERIFIED / ASSUMED | Evidence (probe command + result) or mitigation |
|-------|--------------------|--------------------------------------------------|
| **PR #25 (which introduced `llms-full.njk`, #17) is already MERGED to `main`** — the task brief's premise that it is OPEN/unmerged is now stale. Both fixes therefore land together on `main` today; no BLOCKED-ON gating remains. | VERIFIED | `gh pr view 25 --json state` → `"state":"MERGED"`, headRef `feat/17-llms-full-txt-superset`. `git show HEAD:src/ai-discovery/llms-full.njk` returns content (file present on `main`, commit `ebdd8a6`). |
| `llms-txt.njk` is the functionally-broken file: line `{{ '/llms-full.txt' \| url }}` sits **outside** any `if/else`, so en-US emits the zh-TW path. | VERIFIED | `git show HEAD:src/ai-discovery/llms-txt.njk` — the full_corpus line is unconditional. |
| `llms-full.njk` back-links are hardcoded literals (`/llms.txt`, `/en-US/llms.txt`) inside the if/else; correct today but must derive from `lang` per acceptance criteria. | VERIFIED | `grep -n "llms.txt" src/ai-discovery/llms-full.njk` → line 14 has both literals in the two branches. |
| The proposed Nunjucks idiom `('/llms-full.txt' if lang == locale.default else '/' + lang + '/llms-full.txt') \| url` renders the correct subpath for each locale. | VERIFIED | Throwaway `node -e` nunjucks render with a stub `url` filter (`p => '/course-site-starter'+p`): `zh-TW => /course-site-starter/llms-full.txt`, `en-US => /course-site-starter/en-US/llms-full.txt`. |
| The inline-if expression is **Nunjucks** (`X if cond else Y`), NOT a JS ternary — so it does not violate Do-not #7 ("JS ternaries in Nunjucks templates"). | VERIFIED | Established repo idiom: `lang_switcher.njk:23` = `{% set langUrl = ('/' + lang + '/') if lang != locale.default else '/' %}`; `drive.njk` uses the same form throughout. |
| The `url` filter applies the base path and is the correct mechanism (Do-not #1: never hardcode absolute paths). | VERIFIED | `.eleventy.js:54` registers `"url": baseUrl`; all sibling links in `llms-txt.njk` already use `\| url`. |
| Risk: editing the worktree copy at `../course-site-starter-feat-17-...` is a no-op — that branch is merged and its uncommitted edit already contains a `_discoveryUrl` variant. | n/a | Make changes only on `main` working tree; ignore the stale worktree. |

## Patterns to Follow
Repo's canonical locale-conditional path idiom (inline-if + `| url`, no JS ternary):
```njk
{% set langUrl = ('/' + lang + '/') if lang != locale.default else '/' %}
// SOURCE: src/_includes/components/lang_switcher.njk:23
```

The same idiom already lands a derived URL into a `set` var and reuses it — mirror this
shape for the new `_fullUrl` / `_discoveryUrl` vars:
```njk
{%- set pdfDownloadUrl = pdf.downloadUrl if pdf.downloadUrl else ("https://drive.google.com/file/d/" + pdfId + "/view") %}
// SOURCE: src/_includes/components/drive.njk:26
```

Current buggy line to replace in `llms-txt.njk`:
```njk
{{ i18n[lang].llms.full_corpus | safe }} {{ '/llms-full.txt' | url }}
// SOURCE: src/ai-discovery/llms-txt.njk:14
```

Current hardcoded line to replace in `llms-full.njk`:
```njk
{% if lang == locale.default %}完整語料庫（內嵌所有課程文件、教材目錄與 PDF 文字）。探索索引：{{ '/llms.txt' | url }}{% else %}Full corpus (all course documents, material catalog, and PDF text inlined). Discovery index: {{ '/en-US/llms.txt' | url }}{% endif %}
// SOURCE: src/ai-discovery/llms-full.njk:14
```

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `src/ai-discovery/llms-txt.njk` | UPDATE | Derive full-corpus link from `lang` (fixes the en-US→zh-TW functional bug). |
| `src/ai-discovery/llms-full.njk` | UPDATE | Derive discovery back-link from `lang` in both branches (remove hardcoded locale literals). |

## Tasks

### Task 1: Make the full-corpus link locale-aware in `llms-txt.njk`
- File: `src/ai-discovery/llms-txt.njk`
- Action: UPDATE
- Implement: Replace the full_corpus line (currently line 14, the unconditional
  `{{ '/llms-full.txt' | url }}`) with a derived var:
  ```njk
  {%- set _fullUrl = ('/llms-full.txt' if lang == locale.default else '/' + lang + '/llms-full.txt') | url -%}
  {{ i18n[lang].llms.full_corpus | safe }} {{ _fullUrl }}
  ```
  Place the `{%- set -%}` on the line directly above so the rendered text line is unchanged
  except for the URL. Keep the `| safe` on the i18n label.
- Mirror: `src/_includes/components/lang_switcher.njk:23` (inline-if path idiom); the
  no-locale segment for the default locale matches the existing `permalink` on
  `llms-txt.njk:6`.
- Validate: `npm run validate`

### Task 2: Derive the discovery back-link from `lang` in `llms-full.njk`
- File: `src/ai-discovery/llms-full.njk`
- Action: UPDATE
- Implement: Replace the two hardcoded literals (`/llms.txt` in the zh-TW branch and
  `/en-US/llms.txt` in the en-US branch, line 14) with a single derived var used in both
  branches:
  ```njk
  {%- set _discoveryUrl = ('/llms.txt' if lang == locale.default else '/' + lang + '/llms.txt') | url -%}
  {% if lang == locale.default %}完整語料庫（內嵌所有課程文件、教材目錄與 PDF 文字）。探索索引：{{ _discoveryUrl }}{% else %}Full corpus (all course documents, material catalog, and PDF text inlined). Discovery index: {{ _discoveryUrl }}{% endif %}
  ```
  This satisfies the acceptance criterion that **no** locale segment is a string literal —
  the zh-TW branch's `/llms.txt` is now derived too, not just the en-US `else` branch.
- Mirror: `src/_includes/components/lang_switcher.njk:23`; matches `llms-full.njk:6`
  permalink locale logic.
- Validate: `npm run validate`

### Task 3: Build and inspect the four cross-links
- File: (no source change) — verification only
- Action: VERIFY
- Implement: Run a full build and inspect rendered output (see Validation). Confirm all
  four links resolve to the right-locale target with the `/course-site-starter` subpath.
- Validate: `npm run build` then grep the built files (commands below).

## Validation
1. **Check gate:** `npm run validate` — must pass with zero errors.
2. **Full build:** `npm run build`
3. **Subpath build (Do-not #1 regression):**
   `ELEVENTY_BASE="/course-site-starter/" npm run build`
4. **Inspect the four built files** (after build; default-locale files have no locale
   segment, en-US files live under `/en-US/`):
   - `_site/llms.txt` (zh-TW) → full-corpus link contains `/llms-full.txt` (NOT `/en-US/`)
   - `_site/en-US/llms.txt` → full-corpus link contains `/en-US/llms-full.txt`
   - `_site/llms-full.txt` (zh-TW) → discovery back-link contains `/llms.txt`
   - `_site/en-US/llms-full.txt` → discovery back-link contains `/en-US/llms.txt`

   Suggested probe:
   ```bash
   grep -o "[^ ]*llms-full.txt" _site/llms.txt _site/en-US/llms.txt
   grep -o "[^ ]*llms.txt" _site/llms-full.txt _site/en-US/llms-full.txt
   ```
   Confirm each path carries the correct locale segment (and the subpath prefix when built
   with `ELEVENTY_BASE`).
5. **No hardcoded locale literals remain:**
   `grep -n "'/en-US/llms" src/ai-discovery/*.njk` → no matches.

## Acceptance Criteria
- [ ] All tasks completed
- [ ] `npm run validate` passes with zero errors
- [ ] `/llms.txt` (zh-TW) links to `/llms-full.txt`
- [ ] `/en-US/llms.txt` links to `/en-US/llms-full.txt` (not `/llms-full.txt`)
- [ ] `/llms-full.txt` (zh-TW) links back to `/llms.txt`
- [ ] `/en-US/llms-full.txt` links back to `/en-US/llms.txt` (derived, not hardcoded)
- [ ] No locale path segment is a string literal; all derive from `lang` via the
      `lang_switcher.njk:23` inline-if idiom (Do-not #7 compliant — Nunjucks if, not JS ternary)
- [ ] All paths still pass through the `| url` filter (Do-not #1)
- [ ] Subpath build (`ELEVENTY_BASE`) emits the `/course-site-starter/...` prefix on all four links
