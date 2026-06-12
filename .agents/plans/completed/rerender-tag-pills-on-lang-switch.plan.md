# Plan: Re-render /courses/ tag pills on client-side language switch

## Summary
On `/courses/`, course-card tag pills are static build-time HTML (`src/courses/index.njk:107-114`), so they stay frozen in the build-time language when a visitor switches language. Every card already embeds its full per-locale data as JSON in `data-course-i18n`, and `translateCourseContent()` in `public/js/lang-dynamic.js` already iterates those cards to update `[data-i18n-course]` fields. The fix adds a pill re-render step inside that same loop: derive the target-language tags from the embedded JSON (mirroring the server-side `tagHelpers.getCourseTags()` formula), then rebuild, create, or remove the card's `.home-tag-list` to exactly match what the server would have rendered for that language. Behavior-only change; one file touched.

## User Story
As a bilingual visitor browsing `/courses/`, I want the tag pills on each course card to follow my selected language so that tags are readable in the same language as the rest of the card.

## Metadata
| Field | Value |
|-------|-------|
| Type | BUG_FIX |
| Complexity | LOW |
| Systems affected | Client-side i18n (`public/js/lang-dynamic.js`) only |
| Issue | #5 |

## Verified Facts (assumptions already checked — do not re-derive)
- **Language-switch mechanics:** `src/_includes/components/lang_switcher.njk:77-84` stores the choice in `localStorage('preferredLang')` and reloads. On load, `lang-dynamic.js` (loaded synchronously, **no `defer`** — `src/_includes/layouts/base.njk:136`) runs before first paint and calls `translateCourseContent(savedLang)` when saved ≠ build-time lang (`public/js/lang-dynamic.js:376-416`). Adding pills to that pass automatically satisfies the issue's "in step with `data-i18n-course` updates / no FOUC" criterion. Do not touch the switcher.
- **Embedded data shape:** `data-course-i18n="{{ c.i18n | json }}"` (`src/courses/index.njk:62`) — i.e. `{ "zh-TW": { ..., "tags": [...] }, "en-US": { ..., "tags": [...] } }`. Tags may be absent for a locale.
- **Server formula:** `tagHelpers.getCourseTags()` (`src/_data/tagHelpers.js:12-20`) returns `dedupe([...metadata.tags, ...i18n[lang].tags].filter(Boolean))`. **`metadata.tags` is `[]` in every course config today (verified across all `src/_data/course-configs/*.json`)**, and it is *not* embedded in `data-course-i18n` — so client-side parity reduces to `dedupe(i18n[lang].tags.filter(Boolean))`. See Risks.
- **Server pill markup** (`src/courses/index.njk:107-114`): `<div class="home-tag-list">` containing `<span class="home-tag-pill">#{{ tag }}</span>` for the **first 3** tags (`_ctags.slice(0, 3)`); the whole `<div>` is omitted when there are no tags. The div is the **last child of `a.course-card-link`** (after `.home-card-header` and `.home-card-body`), so `link.appendChild()` recreates the exact server position.
- **Scope discriminator:** `data-course-i18n` is emitted by 9 other templates (home page `src/index.njk:138`, course subpages, breadcrumb, etc.) that render **no** `home-tag-list`. The class `home-course-card` appears **only** on `/courses/` cards (`src/courses/index.njk:60`) — gate the new logic on it so no pills are injected elsewhere. (`src/courses/home.njk:57-65` has separate `innovation-tag-pill` markup — out of scope per issue.)
- **No JS test infra:** no test runner, no ESLint for `public/js/`. Validation = build gate + manual E2E.

## Patterns to Follow

**1. The card loop and translations object the new code slots into** — add the pill step after the existing `listElements` block, inside the same `try`:
```javascript
// SOURCE: public/js/lang-dynamic.js:207-260 (abridged)
function translateCourseContent(toLang) {
  const courseCards = document.querySelectorAll('[data-course-i18n]');
  courseCards.forEach(function(card) {
    const i18nJSON = card.getAttribute('data-course-i18n');
    if (!i18nJSON) { return; }
    try {
      const i18nData = JSON.parse(i18nJSON);
      const targetLang = toLang || 'zh-TW';
      const translations = i18nData[targetLang];
      if (!translations) { return; }
      // ... [data-i18n-course] loop ...
      // ... [data-i18n-course-list] loop ...   <-- insert pill step after this
    } catch (e) {
      // Silently handle parsing errors
    }
  });
}
```

**2. Array-field innerHTML rebuild pattern to mirror** (style: `map` + `escapeHtml` + `join`):
```javascript
// SOURCE: public/js/lang-dynamic.js:246-255
const listElements = card.querySelectorAll('[data-i18n-course-list]');
listElements.forEach(function(listEl) {
  const field = listEl.getAttribute('data-i18n-course-list');
  const items = translations[field];
  if (Array.isArray(items)) {
    listEl.innerHTML = items
      .map(item => `<li>${escapeHtml(item)}</li>`)
      .join('');
  }
});
```
`escapeHtml` is already defined at `public/js/lang-dynamic.js:74-81` — reuse it.

**3. Server output to reproduce exactly:**
```nunjucks
{# SOURCE: src/courses/index.njk:107-114 #}
{% set _ctags = tagHelpers.getCourseTags(c, currentLang) %}
{% if _ctags and _ctags.length %}
<div class="home-tag-list">
  {% for tag in _ctags.slice(0, 3) %}
  <span class="home-tag-pill">#{{ tag }}</span>
  {% endfor %}
</div>
{% endif %}
```

**4. Code style:** IIFE-internal `function` declarations, `forEach(function(x) { ... })` callbacks (arrows OK inside `map`), `const`/`let`, one `//` section comment above the block (e.g. line 206 `// Translate course content with data attributes`).

## Files to Change
| File | Action | Purpose |
|------|--------|---------|
| `public/js/lang-dynamic.js` | UPDATE | Add tag-pill re-render to `translateCourseContent()` |

## Tasks

### Task 1: Add pill re-render step to `translateCourseContent()`
- File: `public/js/lang-dynamic.js`
- Action: UPDATE
- Implement: Inside the per-card `try` block, after the `listElements` loop (after line 255), add a block that:
  1. Gates on `/courses/` cards only: `if (!card.classList.contains('home-course-card')) { return-from-block; }` (structure it as a plain `if` wrapping the block, or an early guard in a small helper function — do **not** `return` from the card callback before the existing loops).
  2. Computes target tags mirroring `tagHelpers.getCourseTags` minus the (empty, un-embedded) neutral tags:
     ```javascript
     const rawTags = Array.isArray(translations.tags) ? translations.tags : [];
     const tags = Array.from(new Set(rawTags.filter(Boolean))).slice(0, 3);
     ```
  3. Syncs the DOM to the server-equivalent output:
     - `let tagList = card.querySelector('.home-tag-list');`
     - If `tags.length === 0`: remove `tagList` if present (`tagList.remove()`), done. (Covers "no stale pills, no empty artifacts".)
     - If `tags.length > 0` and no `tagList`: create `<div class="home-tag-list">` and `appendChild` it to `card.querySelector('.course-card-link')` (guard: skip if the link is missing).
     - Set `tagList.innerHTML = tags.map(tag => `<span class="home-tag-pill">#${escapeHtml(tag)}</span>`).join('')` — mirror of pattern 2.
  4. One section comment above the block, e.g. `// Re-render tag pills (/courses/ cards) to match the selected language`.
- Mirror: `public/js/lang-dynamic.js:246-255` (rebuild pattern), `src/courses/index.njk:107-114` (output), `src/_data/tagHelpers.js:12-20` (formula)
- Validate: `npm run validate && npm run build` (the JS file is copied verbatim; the build catches nothing JS-specific, so also do a quick syntax check: `node --check public/js/lang-dynamic.js`)

### Task 2: Full gate + E2E verification
- Action: VERIFY (no code)
- Implement: run `.claude/validate.sh`, then the E2E checklist below with `npm run dev:fast`.
- Validate: all E2E items pass.

## Validation

**Automated gate:**
```bash
node --check public/js/lang-dynamic.js   # syntax
npm run validate                          # course-data integrity
npm run build:full                        # full build
ELEVENTY_BASE="/course-site-starter/" npm run build   # subpath build
```
(`.claude/validate.sh` covers the last three.)

**E2E checklist** (dev server: `npm run dev:fast`; toggle language via the site's language switcher):
- [ ] On `/courses/`, switch to en-US: every card's pills show the en-US tags (e.g. Mt. Nenggao card: `#drama #blackboard drawings #workbook`), prefixed `#`, max 3.
- [ ] Switch back to zh-TW: pills return to zh-TW tags (`#戲劇 #黑板畫 #工作本`).
- [ ] Parity check: with `preferredLang=en-US` saved, the pills on `/courses/` match a card-by-card comparison against the en-US build output (same tags, same order, same markup classes).
- [ ] No FOUC: pills change in the same paint as the card title/overview (no flash of old-language pills). Confirm `lang-dynamic.js` still has no `defer`.
- [ ] Empty-tags case: temporarily delete the `tags` array from one locale of one course config, rebuild, switch to that locale — the card renders **no** `.home-tag-list` div (inspect DOM); switching back restores pills. Revert the config edit afterwards.
- [ ] Regression: home page (`/`) innovation slider cards and course subpages (e.g. `/courses/<slug>/`) gained **no** tag pills after switching language (they have `data-course-i18n` but must stay pill-free).

## Risks
1. **Neutral `metadata.tags` not embedded client-side.** ~~If a course ever sets non-empty `metadata.tags`, client output would diverge.~~ **Resolved by decision (2026-06-13 grill session): `metadata.tags` is abolished — tags exist only per-language (issue #6, CONTEXT.md → Tags, i18n-architecture.md → Payload Completeness Invariant).** All configs have `metadata.tags: []` today (verified); this plan needs no change either way since the client formula `dedupe(i18n[lang].tags.filter(Boolean))` is the final formula.
2. **Pill injection on non-/courses/ pages.** Nine other templates emit `data-course-i18n`. Mitigated by gating on `.home-course-card` (unique to `src/courses/index.njk:60`) plus the E2E regression check.
3. **XSS via tag strings in `innerHTML`.** Mitigated by reusing `escapeHtml()` exactly like the existing `data-i18n-course-list` pattern.

## Acceptance Criteria
- [ ] All tasks completed
- [ ] Automated gate passes with zero errors (syntax check, validate, full build, subpath build)
- [ ] Follows existing patterns (IIFE style, `escapeHtml`, rebuild-into-container approach)
- [ ] All four issue criteria verified end-to-end: pills track language switch; parity with server-rendered output; no FOUC; no stale/empty pill artifacts when a locale has no tags
