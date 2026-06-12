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
    "subject": "nature",
    "format": "class-drama",
    "teacher_name": "Teacher Name"
  },
  "i18n": {
    "zh-TW": {
      "title": "課程標題",
      "grade": "年級",
      "overview": "課程簡介...",
      "tags": ["戲劇", "黑板畫"]
    },
    "en-US": {
      "title": "Course Title",
      "grade": "Grade Level",
      "overview": "Course overview...",
      "tags": ["drama", "blackboard drawings"]
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

## Payload Completeness Invariant

`data-course-i18n` (the full `course.i18n` object) is the **only** data the client has when
re-rendering on a language switch. Therefore: any rendered output that is expected to track
the selected language must be derivable **solely** from `i18n.{lang}`. If a template computes
language-tracking output from data outside `i18n` (e.g. a `metadata` field), the client
cannot reproduce it and the output silently freezes in the build-time language — this exact
bug class shipped once as issue #5 (tag pills computed from `metadata.tags` + `i18n` while
the client saw only `i18n`). Anything rendered from non-`i18n` data is by definition
build-time static and must not be expected to change on language switch.

## Route Behavior

**Homepage:** `/` → zh-TW default. `/zh-TW/` and `/en-US/` are statically-built language variants; the language switcher navigates to them or reloads the current page with the saved preference applied.

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
- Access `course.i18n` at any depth directly — always use `i18nMacro.cf()`
- Render language-tracking output from data outside `i18n` — the client can't reproduce it
  (see Payload Completeness Invariant)

**Always:**
- Add new course fields inside `i18n` object only
- Keep inline script minimal (localStorage check only)
- Test with preference cleared and preference set
