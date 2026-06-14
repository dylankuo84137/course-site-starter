Core Generation Files

  1. src/ai-discovery/llms-full.njk (Main Template)

  - Purpose: The Nunjucks template that generates /llms-full.txt (zh-TW) and /en-US/llms-full.txt (en-US)
  - What it does:
    - Paginates over locale.available (size 1, alias lang) to emit one file per language
    - Outputs monolingual Markdown inlining the full course corpus
    - Per course: title, metadata, overview, innovation fields, course-innovation body
    - Documents: Google Doc prose via materialHelpers.getDoc (course_description, story, play_script, course_innovation)
    - Materials: catalog via materialHelpers.getMaterialItems (all material keys)
    - PDF text: inlines pdfTextCache text for PDF items
    - Uses cfRaw() for plain-text safe output (Do-not #8), | url for links (Do-not #1), materialHelpers for all material/doc access (Do-not #2)
  - Note: file name is "ai-index-core-generation-files.md" — a rename to "llms-full-core-generation-files.md" is optional but was not done to avoid churn

  2. src/_data/pdfTextCache.js (Data Loader)

  - Purpose: Loads extracted PDF text from cache directory
  - Structure: Returns { courseSlug: { materialKey: { fileId: { name, text, lastSynced } } } }
  - Performance optimization: Can skip loading with SKIP_PDF_CACHE=1 env var (saves ~45s build time)
  - Cache location: src/_data/pdf-text-cache/*.json

  3. scripts/sync/fetch-drive.mjs (Drive Sync & PDF Extraction)

  - Purpose: Syncs Google Drive content and extracts PDF text
  - PDF extraction (lines 117-188):
    - Google Docs: Uses Drive API export to plain text (fast)
    - Native PDFs: Uses pdf-parse library to extract text (downloads file)
    - Handles scanned PDFs gracefully (warns if no text layer)
  - Caching (lines 194-220):
    - Saves extracted text to src/_data/pdf-text-cache/{courseSlug}.json
    - Separate from course JSON (keeps course files clean)
  - Material sync (lines 385-413):
    - Processes material.syllabus, worksheet, play_scripts, sheet_music
    - Auto-extracts PDF text during sync
    - Rate-limited to avoid Drive API throttling (500ms delay)

  4. src/ai-discovery/llms-txt.njk (AI Discovery Index)

  - Purpose: Machine-readable Markdown discovery index of the course corpus at /llms.txt (+ /en-US/llms.txt)
  - Content: Localized preamble + per-course title, summary, metadata, and Markdown links to each course's HTML pages
  - Sibling: links to /llms-full.txt for whole-corpus fetches

  How It Works Together

  graph LR
      A[npm run sync:drive] --> B[fetch-drive.mjs]
      B --> C[Extract PDF Text]
      C --> D[Cache to pdf-text-cache/*.json]
      D --> E[pdfTextCache.js loads cache]
      F[npm run build] --> G[llms-full.njk template]
      E --> G
      G --> H[/llms-full.txt + /en-US/llms-full.txt output]

  Key Commands

  # Sync Drive content & extract PDF text
  GOOGLE_API_KEY=xxx npm run sync:drive

  # Build with PDF cache (full llms-full.txt with pdfText)
  npm run build

  # Fast dev mode (skips PDF cache loading)
  npm run dev:fast  # Sets SKIP_PDF_CACHE=1

  Performance Notes

  - PDF cache loading: ~2-5s for large courses (358KB cache)
  - Skipping cache: Saves build time but omits pdfText from llms-full.txt
  - Fast mode: Use dev:fast for development, run build:full before committing

  The /llms-full.txt file is generated at src/ai-discovery/llms-full.njk with permalink
  /llms-full.txt (zh-TW) and /en-US/llms-full.txt (en-US).
