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

### 5. AI Accessibility (Text-First Design)
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