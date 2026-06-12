Core Generation Files

  1. src/ai-discovery/ai-index.njk (Main Template)

  - Purpose: The Nunjucks template that generates /ai-index.json
  - What it does:
    - Outputs structured JSON of all course data
    - Includes i18n (zh-TW and en-US) content
    - Embeds Google Docs full text from docs object
    - Includes Drive file metadata (images, audio, PDFs)
    - Injects PDF text from pdfTextCache (lines 181-184)
    - Generates site statistics (grades, domains, teachers, tags)
  - Key feature: Uses materialHelpers to access course materials consistently

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

  4. src/ai-discovery/for-ai.njk (Documentation Page)

  - Purpose: Human-readable guide for AI tools at /for-ai/
  - Content: Explains data structure, machine-readable formats, usage examples

  How It Works Together

  graph LR
      A[npm run sync:drive] --> B[fetch-drive.mjs]
      B --> C[Extract PDF Text]
      C --> D[Cache to pdf-text-cache/*.json]
      D --> E[pdfTextCache.js loads cache]
      F[npm run build] --> G[ai-index.njk template]
      E --> G
      G --> H[/ai-index.json output]

  Key Commands

  # Sync Drive content & extract PDF text
  GOOGLE_API_KEY=xxx npm run sync:drive

  # Build with PDF cache (full ai-index.json)
  npm run build

  # Fast dev mode (skips PDF cache loading)
  npm run dev:fast  # Sets SKIP_PDF_CACHE=1

  Performance Notes

  - PDF cache loading: ~2-5s for large courses (358KB cache)
  - Skipping cache: Saves build time but omits pdfText from ai-index.json
  - Fast mode: Use dev:fast for development, run build:full before committing

  The ai-index.json file is generated at src/ai-discovery/ai-index.njk:2 with permalink
  /ai-index.json.