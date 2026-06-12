# Plan: Rename `/reflections/` Route to `/discussion/`

## Summary

The Discussion page (留言與交流) is currently served at `/reflections/` — a legacy slug that collides with the domain term *Reflection* (Teaching Reflection / Innovation, a different page). This plan renames the route to `/discussion/`, updates the nav i18n key `nav.reflections → nav.discussion` in all locale files, removes a stale CommentBox title trigger, and updates all references across the codebase. No redirect stub is needed (see redirect decision below). Decision is settled per `CONTEXT.md` (lines 121–133).

## User Story

As a developer maintaining the site's terminology, I want the Discussion page served at `/discussion/` so the route name aligns with domain language and no longer collides with *Reflection* (Teaching Reflection / Innovation).

## Metadata

| Field | Value |
|---|---|
| Type | Rename / cleanup |
| Complexity | Low — pure mechanical rename, no logic changes |
| Systems affected | Routing (permalink), Nav, i18n, Sitemap, for-ai page, CommentBox trigger |
| Issue | #3 (decision in CONTEXT.md → Discussion) |

## Redirect Decision

**SKIP** the `/reflections/` redirect stub. This is a ~6-month-old showcase site on a GitHub Pages subpath (`/course-site-starter/`), not a public-facing production site with established inbound links. A search of the codebase finds no canonical backlinks to the old route from external sources. The cost of a stub (extra file, permanent maintenance surface) outweighs the negligible risk.

If inbound links are later discovered, a redirect stub would be a single `src/reflections-redirect/index.njk` with `permalink: /reflections/index.html` and a `<meta http-equiv="refresh" content="0; url={{ '/discussion/' | url }}">`.

## Complete Enumeration of `reflections` Occurrences

These are ALL occurrences in the repo (excluding `.git/`, `node_modules/`, `_site/`, and prose uses of the English word "reflections" in course content):

### Route-bearing references (MUST change):

| File | Line | Content |
|---|---|---|
| `src/reflections/index.njk` | 4 | `permalink: /reflections/index.html` |
| `src/_includes/layouts/base.njk` | 6 | `{ href: '/reflections/' \| url, label: i18n[currentLang].nav.reflections }` |
| `src/_includes/layouts/base.njk` | 220 | comment: `<!-- CommentBox.io initialization for reflections page -->` |
| `src/_includes/layouts/base.njk` | 221 | `{% if page.fileSlug == 'reflections' or title == '留言與交流' or title == 'Messages & Discussions' or includeCommentBox %}` |
| `src/sitemap.njk` | 26 | `{{ '/reflections/' \| url }}` |
| `src/ai-discovery/for-ai.njk` | 53 | `<li><strong>Reflections (<code>/reflections/</code>)</strong>: Community discussion forum</li>` |

### i18n key references (MUST change):

| File | Line | Content |
|---|---|---|
| `src/_data/i18n/en-US.json` | 52 | `"reflections": "Comments & Discussions"` |
| `src/_data/i18n/zh-TW.json` | 52 | `"reflections": "留言與交流"` |

### Directory to rename:

| Path | Action |
|---|---|
| `src/reflections/` (dir) | RENAME → `src/discussion/` |
| `src/reflections/index.njk` | moves to `src/discussion/index.njk` as part of dir rename |

### Documentation references (update for accuracy, not functionality):

| File | Line | Content |
|---|---|---|
| `README.md` | 82 | `│   ├── reflections/` in directory tree |
| `CONTEXT.md` | 127–133 | The "until that lands" migration note — should be removed/updated post-merge |

### False positives (do NOT change):

| File | Line | Reason |
|---|---|---|
| `src/_data/i18n/en-US.json` | 45 | `"...teachers' experiments and reflections."` — prose English word, not a route/key |
| `src/_data/course-configs/course_4a_journey-to-the-west_114_autumn.json` | 46, 53 | Prose English word in course description, not a route/key |

---

## Patterns to Follow

### Permalink pattern (source of truth for new permalink)
```njk
// SOURCE: src/courses/index.njk:3
permalink: /courses/index.html
```
New permalink follows the same pattern: `permalink: /discussion/index.html`

### Nav href with url filter (CRITICAL — no absolute paths)
```njk
// SOURCE: src/_includes/layouts/base.njk:2–7
{% set navLinks = [
  { href: '/' | url, label: i18n[currentLang].nav.home },
  { href: '/courses/' | url, label: i18n[currentLang].nav.courses },
  { href: '/ai-guide/' | url, label: i18n[currentLang].nav.ai_guide },
  { href: '/reflections/' | url, label: i18n[currentLang].nav.reflections }
] %}
```
The `| url` filter is mandatory for all route hrefs — it prepends the subpath (`/course-site-starter/`). The renamed nav entry must read `'/discussion/' | url`.

### Sitemap url filter (same pattern)
```njk
// SOURCE: src/sitemap.njk:26
<loc>{% if site.url %}{{ site.url }}{% endif %}{{ '/reflections/' | url }}</loc>
```
Must become `{{ '/discussion/' | url }}`.

### CommentBox trigger (current state — lines 220–226)
```njk
// SOURCE: src/_includes/layouts/base.njk:220–226
<!-- CommentBox.io initialization for reflections page -->
{% if page.fileSlug == 'reflections' or title == '留言與交流' or title == 'Messages & Discussions' or includeCommentBox %}
<script src="https://unpkg.com/commentbox.io/dist/commentBox.min.js"></script>
<script>
  commentBox('5698158134820864-proj');
</script>
{% endif %}
```
After the rename `page.fileSlug` will be `'discussion'` (11ty sets fileSlug from the containing directory name for `index.njk` files in a named folder). The title check `title == '留言與交流'` remains valid as a belt-and-suspenders fallback. The stale `title == 'Messages & Discussions'` check must be removed (it has never matched any real label; the actual EN label is `'Comments & Discussions'`).

### i18n key rename pattern
```json
// SOURCE: src/_data/i18n/en-US.json:48–53
"nav": {
  "home": "Course Introduction",
  "courses": "All Courses",
  "ai_guide": "Application Guide",
  "reflections": "Comments & Discussions"
}
```
Rename `"reflections"` → `"discussion"` in both `en-US.json` and `zh-TW.json`. The value strings do NOT change.

---

## Files to Change

| File | Action | Purpose |
|---|---|---|
| `src/reflections/` (directory) | RENAME → `src/discussion/` | New route slug |
| `src/discussion/index.njk` (was `src/reflections/index.njk`) | UPDATE | Change permalink from `/reflections/index.html` → `/discussion/index.html` |
| `src/_includes/layouts/base.njk` | UPDATE | Nav href, CommentBox fileSlug check, remove stale title check, update comment |
| `src/_data/i18n/en-US.json` | UPDATE | Rename `nav.reflections` → `nav.discussion` |
| `src/_data/i18n/zh-TW.json` | UPDATE | Rename `nav.reflections` → `nav.discussion` |
| `src/sitemap.njk` | UPDATE | Change `/reflections/` → `/discussion/` |
| `src/ai-discovery/for-ai.njk` | UPDATE | Update route display label and URL |
| `README.md` | UPDATE | Update directory tree |
| `CONTEXT.md` | UPDATE | Remove/resolve the "until that lands" migration note |

---

## Tasks

### Task 1 — Rename directory
**File:** `src/reflections/` → `src/discussion/`
**Action:** RENAME directory
**Implement:** `mv src/reflections src/discussion`
**Mirror:** No code pattern — this is a filesystem rename.
**Validate:** `ls src/discussion/index.njk` confirms file exists at new path.

---

### Task 2 — Update permalink in the page file
**File:** `src/discussion/index.njk`
**Action:** UPDATE front matter
**Implement:** Change line 4 from:
```
permalink: /reflections/index.html
```
to:
```
permalink: /discussion/index.html
```
**Mirror:** `src/courses/index.njk:3` — same `permalink: /path/index.html` pattern.
**Validate:** `npm run validate` — build must succeed, `_site/discussion/index.html` must exist, `_site/reflections/` must NOT exist.

---

### Task 3 — Update base.njk nav href and i18n key reference
**File:** `src/_includes/layouts/base.njk`
**Action:** UPDATE line 6
**Implement:** Change:
```njk
{ href: '/reflections/' | url, label: i18n[currentLang].nav.reflections }
```
to:
```njk
{ href: '/discussion/' | url, label: i18n[currentLang].nav.discussion }
```
**Mirror:** Lines 3–5 of same file — same `href: '/path/' | url` + `i18n[...].nav.key` pattern.
**Validate:** `npm run validate` — nav link in rendered HTML must point to `/discussion/` (or `/course-site-starter/discussion/` in subpath build).

---

### Task 4 — Fix CommentBox trigger in base.njk
**File:** `src/_includes/layouts/base.njk`
**Action:** UPDATE lines 220–221
**Implement:** Change the comment and condition from:
```njk
<!-- CommentBox.io initialization for reflections page -->
{% if page.fileSlug == 'reflections' or title == '留言與交流' or title == 'Messages & Discussions' or includeCommentBox %}
```
to:
```njk
<!-- CommentBox.io initialization for discussion page -->
{% if page.fileSlug == 'discussion' or title == '留言與交流' or includeCommentBox %}
```
**Notes:**
- `page.fileSlug == 'discussion'` fires when 11ty processes `src/discussion/index.njk` (fileSlug is derived from the containing directory name).
- `title == '留言與交流'` is kept as a valid belt-and-suspenders fallback (the page still sets `title: 留言與交流`).
- `title == 'Messages & Discussions'` is removed — it was stale (the actual EN label is `'Comments & Discussions'`) and has never matched any rendered page title.
- `includeCommentBox` is kept for any future opt-in use.
**Mirror:** `src/_includes/layouts/base.njk:229` — similar `{% if page.url == '/' %}` pattern for conditional script loading.
**Validate:** Build and open `_site/discussion/index.html` — the CommentBox `<script>` tag must appear in the rendered HTML.

---

### Task 5 — Update i18n key in en-US.json
**File:** `src/_data/i18n/en-US.json`
**Action:** UPDATE line 52
**Implement:** Change:
```json
"reflections": "Comments & Discussions"
```
to:
```json
"discussion": "Comments & Discussions"
```
The display value does NOT change.
**Mirror:** Adjacent nav keys in same file (`"home"`, `"courses"`, `"ai_guide"`).
**Validate:** `npm run validate` — no template errors about missing i18n key; nav renders the label "Comments & Discussions".

---

### Task 6 — Update i18n key in zh-TW.json
**File:** `src/_data/i18n/zh-TW.json`
**Action:** UPDATE line 52
**Implement:** Change:
```json
"reflections": "留言與交流"
```
to:
```json
"discussion": "留言與交流"
```
The display value does NOT change.
**Mirror:** Same as Task 5 — adjacent nav keys.
**Validate:** `npm run validate` — nav renders the label "留言與交流" in zh-TW mode.

---

### Task 7 — Update sitemap.njk
**File:** `src/sitemap.njk`
**Action:** UPDATE line 26
**Implement:** Change:
```njk
<loc>{% if site.url %}{{ site.url }}{% endif %}{{ '/reflections/' | url }}</loc>
```
to:
```njk
<loc>{% if site.url %}{{ site.url }}{% endif %}{{ '/discussion/' | url }}</loc>
```
**Mirror:** `src/sitemap.njk:8,14` — same `{{ '/path/' | url }}` pattern.
**Validate:** After `npm run build:full`, `_site/sitemap.xml` must contain `/discussion/` and NOT `/reflections/`.

---

### Task 8 — Update for-ai.njk
**File:** `src/ai-discovery/for-ai.njk`
**Action:** UPDATE line 53
**Implement:** Change:
```html
<li><strong>Reflections (<code>/reflections/</code>)</strong>: Community discussion forum</li>
```
to:
```html
<li><strong>Discussion (<code>/discussion/</code>)</strong>: Community discussion forum</li>
```
**Mirror:** Surrounding `<li>` items in the same file for formatting consistency.
**Validate:** `npm run validate` — no build errors; `_site/ai-discovery/for-ai/index.html` (or equivalent) shows `/discussion/`.

---

### Task 9 — Update README.md directory tree
**File:** `README.md`
**Action:** UPDATE line 82
**Implement:** Change:
```
│   ├── reflections/
```
to:
```
│   ├── discussion/
```
**Validate:** Visual inspection only — README is not part of the build.

---

### Task 10 — Update CONTEXT.md migration note
**File:** `CONTEXT.md`
**Action:** UPDATE lines 126–133
**Implement:** Remove the "until that lands" block (the `> **Route rename (decided, not yet implemented):**` blockquote) since the migration is now complete. The **Discussion** entry header and description (lines 121–125) should remain, updated to reflect the new route `/discussion/` and drop the avoidance note that was only needed while the stale `/reflections/` slug existed.

The updated entry should read:
```markdown
**Discussion** (留言與交流):
The site-wide page where visitors submit course materials (via a Google Form) and leave
comments (via a CommentBox widget). Display label is 留言與交流 / "Comments & Discussions".
Route: `/discussion/`.
```
**Validate:** Visual inspection — CONTEXT.md is not part of the build.

---

## Validation

Run in order after ALL tasks complete:

```bash
# 1. Fast check (syntax, template rendering)
npm run validate

# 2. Full build (confirms _site output is clean)
npm run build:full

# 3. Subpath build (confirms url filter works with base path)
ELEVENTY_BASE="/course-site-starter/" npm run build
```

### E2E checklist (manual inspection of `_site/` after `build:full`):

- [ ] `_site/discussion/index.html` exists
- [ ] `_site/reflections/` does NOT exist (no stray old output)
- [ ] `_site/discussion/index.html` contains the CommentBox `<script>` tag (`commentBox('5698158134820864-proj')`)
- [ ] `_site/sitemap.xml` contains `/discussion/` and does NOT contain `/reflections/`
- [ ] Nav HTML in any rendered page contains a link to `/discussion/` (or `/course-site-starter/discussion/` in subpath build) — NOT `/reflections/`
- [ ] Nav link label renders "Comments & Discussions" (EN) / "留言與交流" (zh-TW)
- [ ] `grep -r "fileSlug == 'reflections'" src/` returns zero results
- [ ] `grep -r "nav\.reflections" src/` returns zero results
- [ ] `grep -r "'/reflections/'" src/` returns zero results
- [ ] `grep -r "Messages & Discussions" src/` returns zero results

---

## Acceptance Criteria

- [ ] `GET /discussion/` (or `/course-site-starter/discussion/` on GitHub Pages) returns the Discussion page (留言與交流, HTTP 200)
- [ ] `GET /reflections/` returns 404 (no stub, no stale output)
- [ ] CommentBox widget loads on the `/discussion/` page (the `<script>` appears in rendered HTML)
- [ ] Both locale nav labels render correctly: "Comments & Discussions" (EN) and "留言與交流" (zh-TW)
- [ ] Sitemap lists `/discussion/` and omits `/reflections/`
- [ ] `/ai-discovery/for-ai/` page shows Discussion at `/discussion/`
- [ ] Zero occurrences of the string `reflections` in any route-bearing context (verified by the grep checklist above)
- [ ] `npm run validate` exits 0
- [ ] `npm run build:full` exits 0
- [ ] `ELEVENTY_BASE="/course-site-starter/" npm run build` exits 0
