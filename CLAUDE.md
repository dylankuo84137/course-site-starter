# AI Assistant Guide: Cixin Course Weaver

**Core principle:** Build simple (unbraided) artifacts, not just easy (convenient) code.

## Project Facts

**Tech stack:** 11ty + Nunjucks + vanilla JS + Pagefind + Drive sync  
**Hosting:** GitHub Pages project subpath (e.g., `/course-site-starter/`)  
**Language:** Traditional Chinese UI, English docs/comments

### Key constraints:
- No external GitHub Actions allowed
- Base path must use `{{ '/path' | url }}` for all internal links
- Search via Pagefind (local first, CDN fallback)
- Drive sync pulls public folders using `GOOGLE_API_KEY`
- Images: thumbnail → lightbox gallery with text filter
- Audio: inline playback + download links

## Core Rules

### 1. Separation of Concerns
- **Data:** JSON files + `fetch-drive.mjs`
- **Templates:** Pure Nunjucks (no JS logic)
- **Behavior:** Small vanilla JS modules
- **Styles:** `public/css/site.css`

### 2. Base Path Correctness
```javascript
// .eleventy.js
pathPrefix: process.env.ELEVENTY_BASE || '/'
```
```html
<!-- All internal links -->
<a href="{{ '/page' | url }}">Link</a>
<link href="{{ '/css/site.css' | url }}">
```

### 3. Drive Integration
- Auto-tag images: grade/semester/unit/domain + `[tag]`/`#tag` from filenames
- Sync script only mutates JSON, never templates
- Handle shortcuts by resolving target ID
- Fail gracefully in CI (warn, don't block)

### 4. Gallery & Search
- Gallery: one overlay, keyboard nav (←/→/ESC), simple filter
- Search: build with `npx pagefind --site _site`, runtime fallback to CDN
- Images: try thumbnail first, fallback to `uc?export=view`

### 5. Multi-Language Support
**Architecture:** Client-side dynamic translation with zero-FOUC (Flash of Unstyled Content)

#### Data Structure: Single Source of Truth
**Course JSON** - All translatable content lives in `i18n` object only:
```json
{
  "slug": "course-example",
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
  },
  "tags": [...],
  "google_docs": {...}
}
```

**NEVER duplicate fields at root level** - eliminates maintenance burden.

#### Template Access: Unified Macro
Use `cf()` (course field) macro for consistent i18n access:
```nunjucks
{% import "macros/i18n.njk" as i18nMacro %}
{{ i18nMacro.cf(course, 'title', currentLang) }}
```

Fallback order: `course.i18n[lang][field]` → `course.i18n['zh-TW'][field]` → `course[field]`

#### Language Preference Flow
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
   - Hides body until translation completes
   - Removed when `data-lang-ready="true"` is set

3. **Dynamic Translation** (`lang-dynamic.js`)
   - Loads synchronously at end of `<body>`
   - Uses TreeWalker to find/replace UI text nodes
   - Parses `data-course-i18n` JSON for course content
   - Skips language switcher elements to avoid recursion
   - Marks page ready after translation

#### Homepage Behavior
- `/` → default (zh-TW)
- `/zh-TW/` → Traditional Chinese
- `/en-US/` → English
- Auto-redirects based on saved preference

#### Course Page Behavior
- All course pages built once (default zh-TW)
- Client-side translation if user prefers en-US
- Preference persists across navigation
- Page reload applies new language immediately

#### Performance Considerations
- **No duplicate builds:** One set of course pages, not N × languages
- **No duplication:** Each field exists once in `i18n` object
- **Inline critical script:** Language detection in `<head>` (< 0.2 KB)
- **Synchronous translation:** Executes before first paint
- **CSS-based hiding:** More efficient than JS visibility toggle
- **localStorage cache:** Instant preference recall

#### Translation Data
- **UI strings:** `_data/i18n/{zh-TW,en-US}.json`
- **Course content:** `_data/course_*.json` inside `i18n` object
- Embedded in page: `window.__I18N_DATA__` (UI), `data-course-i18n` (courses)
- TreeWalker reverse lookup: Chinese text → key path → English text
- No external API calls or async dependencies

#### Never Do
- Don't build duplicate pages per language (breaks simplicity)
- Don't use `defer` on `lang-dynamic.js` (causes FOUC)
- Don't skip `data-lang-ready` marker (causes flash)
- Don't translate language switcher labels (causes recursion)
- **Don't duplicate translatable fields at course JSON root level**
- **Don't access course fields directly** - always use `cf()` macro

#### Always Do
- Keep inline script minimal (localStorage check only)
- Use CSS for visibility control (declarative)
- Load translation script synchronously
- Test with preference cleared and set
- **Use `i18nMacro.cf(course, field, lang)` in templates**
- **Add new course fields inside `i18n` object only**

### 6. AI Accessibility (Text-First Design)
**Goal:** Make all content machine-readable for AI tools (NotebookLM, ChatGPT, Claude, etc.)

#### Semantic Structure
- Use proper HTML5 tags: `<article>`, `<section>`, `<nav>`, `<aside>`
- Maintain strict heading hierarchy: h1 → h2 → h3 (no skips)
- Add unique fragment IDs to all content blocks: `id="unit-2-lesson-3"`
- Use `<time datetime="...">` for all dates
- Meaningful alt text for all images (describe educational content)

#### Structured Metadata
- JSON-LD schema on all course pages (`@type: "Course"`)
- Include: `name`, `description`, `provider`, `teaches`, `educationalLevel`
- Add `learningObjectives` array to course JSON
- Use `<meta name="description">` with 2-3 sentence summaries

#### AI Discovery Files
Create these machine-readable endpoints:
- `/for-ai.html` - Human-readable guide to site structure
- `/ai-index.json` - Complete course catalog in structured format
- `/feed.json` - Course updates with ISO timestamps
- `/sitemap.xml` - All pages with priority/changefreq

#### Content Requirements
- **Lesson summaries:** 2-3 sentences intro on every course page
- **Alt text:** Educational context, not just description ("Week 3 blackboard: firefly lifecycle diagram")
- **Audio transcripts:** Text descriptions for songs/narration
- **Link context:** Use descriptive text, not "click here"

#### Interlinking Standards
```html
<!-- Good: precise citations -->
<a href="{{ '/courses/2a-nenggao/workbook' | url }}#week-3">Week 3 Firefly Study</a>

<!-- Bad: vague references -->
<a href="{{ '/courses/2a-nenggao/workbook' | url }}">Click here</a>
```

## Quality Gates

Every change must pass:
- [ ] `npm run dev` works locally
- [ ] `ELEVENTY_BASE="/repo/" npm run build` succeeds
- [ ] All internal links work under subpath
- [ ] Gallery keyboard navigation functions
- [ ] Filter narrows thumbnails correctly
- [ ] Audio plays inline with download option
- [ ] No cross-layer coupling
- [ ] Small, focused diffs

**AI Accessibility Checks:**
- [ ] All images have meaningful alt text
- [ ] Heading hierarchy is valid (no h1→h3 jumps)
- [ ] Course pages include JSON-LD schema
- [ ] Content blocks have unique IDs for citation
- [ ] Links use descriptive text, not generic phrases

**Language Switching Checks:**
- [ ] No flash of Chinese content on English preference
- [ ] Language switcher shows correct current language
- [ ] Preference persists across page navigation
- [ ] Homepage redirects to preferred language
- [ ] Course pages reload and translate correctly

## Simple vs. Easy Test

Before implementing, ask:
1. **Independence:** Can each piece be understood alone?
2. **Explicit boundaries:** Are data/template/behavior layers clear?
3. **No coupling:** Did I avoid binding unrelated concerns?
4. **Declarative first:** Could this be config instead of code?

If any answer is no, redesign.

## Never Do
- Add frameworks (React/Vue/Webpack/bundlers)
- Mix deployment logic with build logic
- Use absolute paths (`/css/site.css`)
- Add global mutable state
- Hardcode specific course details
- Use JS ternaries in Nunjucks templates

## Always Do
- Use `{{ '/path' | url }}` for internal references
- Keep `gallery.js` minimal and focused
- Reuse `components/course_nav.njk` and `components/drive.njk`
- Design for multiple courses
- Favor small functions over complex configurations

## Commit Style
```
feat(gallery): isolate overlay & add fallback URLs
- removes DOM coupling to page layout  
- consolidates keyboard handling
- code size -0.6 KB, no new deps
```

## When Uncertain
Choose **less**: fewer files, smaller surface area, clearer boundaries. Simplicity is a choice—make it consistently.