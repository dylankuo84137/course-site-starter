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
