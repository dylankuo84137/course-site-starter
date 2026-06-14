# Implementation Report: htmlbaseplugin-base-path-leaks

## Branch
`feat/12-htmlbaseplugin-base-path`

## Tasks

### Task 1: Register HtmlBasePlugin — ❌ NOT IMPLEMENTED (critical deviation)

**Deviation from plan**: The plan claimed `HtmlBasePlugin` is idempotent on already-prefixed
URLs. This is **false in Eleventy 3.x**. Testing confirmed:

- The plugin's HTML transformer calls the built-in `url` filter on every root-relative URL in
  HTML output — including paths already prefixed by `| url` at template render time.
- `TemplatePath.normalizeUrlPath("/", "/course-site-starter/", "/course-site-starter/css/site.css")` 
  returns `/course-site-starter/course-site-starter/css/site.css`.
- Registering the plugin while keeping `| url` in HTML templates produced **883 double-prefixed
  URLs** in a subpath build (every `href`/`src` in every HTML page).

**Root cause**: `HtmlBasePlugin` and `| url` are mutually exclusive for HTML output. Eleventy 3.x
marks the `url` filter as "Deprecated, use HtmlBasePlugin instead" — the intended workflow is to
drop `| url` from HTML templates and let the plugin handle prefixing. This project uses `| url`
throughout HTML templates, making the plugin incompatible without a migration.

**Decision**: Plugin registration reverted. ADR-0003 updated with an implementation note
correcting the idempotency claim and documenting the migration prerequisite.

**Path forward**: A future session should migrate HTML-context templates away from `| url` (bare
paths in `href`/`src`) and then register the plugin. Non-HTML emitters (sitemap, feed, ai-index)
must retain `| url` or use `site.url` directly — the plugin only transforms `.html` output.

### Task 2: Fix pre-existing subpath double-prefix in sitemap/feed/ai-index — ✅ DONE

**Files changed**:
- `src/sitemap.njk` — all 14 `<loc>` entries changed from
  `{% if site.url %}{{ site.url }}{% endif %}{{ '/path/' | url }}` to
  `{{ site.url }}/path/` (or `{{ site.url }}/courses/{{ course.slug }}/` for dynamic paths).
- `src/feed.njk` — 4 lines (home_page_url, feed_url, icon, item url) changed from
  `{% if site.url %}{{ site.url }}{% endif %}{{ '...' | url }}` to
  `{{ site.url }}/...`. Line 20 (`"id"`) left unchanged (no `site.url` prefix, not a
  double-prefix site).
- `src/ai-discovery/ai-index.njk` — 10 `pages.*` fields changed from
  `"{{ site.url }}{{ (...) | url }}"` to `"{{ site.url }}/courses/{{ course.slug }}/..."`.
  Lines 29, 30, 93, 303 left unchanged (no `site.url`+path double-apply).

**Validation**:
- `npm run validate` → exit 0
- Subpath build: `grep -rhoE '/course-site-starter/course-site-starter/' _site | wc -l` → **0**
- Default build: sitemap/feed URLs read `https://dylankuo84137.github.io/course-site-starter/…` (single, correct)
- Leak grep: `grep -rhoE '(href|src)="/[^/"][^"]*"' _site | grep -vE '"/course-site-starter/' | wc -l` → **0**

### Task 3: Verify `/reflections/` already resolved — ✅ VERIFIED (no code change)

- `grep -rn "/reflections" src/` → **0 hits**
- `_site/reflections/` absent; `_site/discussion/index.html` exists
- Route fix was delivered by Issue #3 as confirmed by its report. The issue #12 citation
  referred to a stale `_site/` artifact.

### Task 4: Promote ADR-0003 status — ⚠️ PARTIALLY DONE

ADR-0003 front-matter status left as `accepted (planned)` because Task 1 (plugin registration)
was not implemented. An implementation note was added to the ADR correcting the idempotency
claim and documenting the migration prerequisite.

## Deviations from Plan

| Deviation | Impact |
|-----------|--------|
| Plan finding #1 "plugin is idempotent on already-prefixed URLs" — false | Task 1 blocked entirely. Plugin NOT registered. |
| Task 4 plan said promote to "accepted" — conditional on Task 1 landing | Status left as "accepted (planned)" |
| Probe test ran briefly, confirmed plugin IS active and prefixes unfiltered paths — but also showed double-prefix issue; reverted | Documents the incompatibility empirically |

## Files Changed

| File | Status |
|------|--------|
| `src/sitemap.njk` | Updated (Task 2) |
| `src/feed.njk` | Updated (Task 2) |
| `src/ai-discovery/ai-index.njk` | Updated (Task 2) |
| `docs/adr/0003-htmlbaseplugin-for-base-path.md` | Updated (Task 4 — implementation note only) |
| `.eleventy.js` | Unchanged (Task 1 reverted) |

## Validation Summary

- `npm run validate` → ✅ exit 0
- Clean subpath build leak grep → **0**
- Double-prefix all output (subpath build) → **0** (was 57 before Task 2)
- Double-prefix HTML only → **0** (was 0 before Task 1 attempt; confirmed plugin would cause 883)
- `/reflections/` in src/ → **0**
- Default build sitemap/feed URLs → correct single-prefix canonical URLs

## Issue Comment

Sent to GitHub Issue #12.
