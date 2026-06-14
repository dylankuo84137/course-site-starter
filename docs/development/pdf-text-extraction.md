# PDF Text Extraction System

## Overview

This system automatically extracts text from PDF documents during the Drive sync process and makes it available in `llms-full.txt` for AI tools, while keeping course JSON files clean with only metadata.

**Current Status:** ✅ Implemented and working in production

**Implementation Details:**
- **Library:** `pdf-parse@1.1.1` (stable version with simple function API)
- **Supported formats:** Native PDFs (text-based) + Google Docs
- **GitHub Actions compatible:** No native dependencies required
- **Tested:** 3 PDFs successfully extracted (51,830 total characters from 64 pages)
- **Impact:** llms-full.txt size increased significantly when pdfText is included

## Architecture

### Separation of Concerns

```
Course JSON (metadata only)     PDF Text Cache (text content)     Full Corpus (combined)
━━━━━━━━━━━━━━━━━━━━━━━       ━━━━━━━━━━━━━━━━━━━━━━━━━━       ━━━━━━━━━━━━━━━━━━━━
course_*.json:                  pdf-text-cache/*.json:           llms-full.txt:
{                               {                                ## Course Title
  "material": {                   "worksheet": {                 ...
    "worksheet": [{                 "FILE_ID": {                 #### worksheet
      "id": "FILE_ID",                "name": "...",             - filename — url
      "name": "...",                  "text": "...",
      "mimeType": "pdf"               "lastSynced": "..."          <pdfText inlined>
    }]                              }
  }                               }
}                               }
```

### Data Flow

```
1. Drive Sync (scripts/sync/fetch-drive.mjs)
   ↓
   For each PDF in material:
   - Fetch metadata → Store in course JSON
   - Extract text → Store in pdf-text-cache/
   ↓
2. Eleventy Build
   ↓
   pdfTextCache.js loads cache
   ↓
3. Template Rendering (src/ai-discovery/llms-full.njk)
   ↓
   Combines course JSON + PDF cache
   ↓
4. Output: /llms-full.txt (and /en-US/llms-full.txt) with pdfText inlined
```

## File Structure

```
src/
├── _data/
│   ├── course-configs/
│   │   └── course_*.json          # Clean metadata only
│   ├── pdf-text-cache/             # Separate text storage
│   │   ├── 2a-nenggao-113-summer.json
│   │   ├── 9c-modern-history-114-autumn.json
│   │   └── ...
│   └── pdfTextCache.js             # Eleventy data loader
└── ai-discovery/                   # AI tool pages
    ├── llms-full.njk               # Full-payload Markdown template with pdfText
    └── llms-txt.njk                # Markdown discovery index

scripts/
└── sync/fetch-drive.mjs            # PDF extraction logic
```

## How It Works

### 1. PDF Text Extraction (scripts/sync/fetch-drive.mjs)

**Function:** `extractPdfText(pdfId, pdfName)`

- Checks file type via Drive API metadata endpoint
- **Method 1 - Google Docs**: Uses Drive API `/export?mimeType=text/plain` (fast, no download)
- **Method 2 - Native PDFs**: Downloads PDF binary and extracts text using `pdf-parse v1.1.1`
- Returns extracted text or null if extraction fails

**Function:** `cachePdfText(courseSlug, materialKey, fileId, fileName, textContent)`

- Stores extracted text in `src/_data/pdf-text-cache/{courseSlug}.json`
- Structure: `{ materialKey: { fileId: { name, text, lastSynced } } }`

**Integration in** `syncMaterial()`

```javascript
// After syncing material metadata
if (MATERIAL_PDF_KEYS.has(key) && synced && synced.items) {
  for (const item of synced.items) {
    if (item.mimeType === "application/pdf" && item.id && courseSlug) {
      console.log(`[fetch-drive] Attempting PDF text extraction: ${item.name}`);
      const pdfText = await extractPdfText(item.id, item.name);
      if (pdfText) {
        cachePdfText(courseSlug, key, item.id, item.name, pdfText);
      }
      // Add small delay to avoid rate limiting
      await sleep(500);
    }
  }
}
```

### 2. Cache Loading (pdfTextCache.js)

Eleventy data file that runs during build:

```javascript
module.exports = function() {
  // Load all JSON files from pdf-text-cache/
  // Return: { courseSlug: { materialKey: { fileId: {...} } } }
};
```

Makes cache available as `pdfTextCache` variable in templates.

### 3. Template Inclusion (src/ai-discovery/llms-full.njk)

```nunjucks
{%- if item.isPdf and pdfTextCache and pdfTextCache[course.slug]
    and pdfTextCache[course.slug][key] and pdfTextCache[course.slug][key][item.id] -%}
{%- set pdfCache = pdfTextCache[course.slug][key][item.id] %}
{{ pdfCache.text | safe }}
{%- endif -%}
```

## Google Drive API Limitation & Solution

### The Problem

**Google Drive API can only extract text from Google Docs, NOT native PDFs.**

When you upload a PDF to Drive:
- File type: `application/pdf` (binary)
- API endpoint `/export` returns: **403 Forbidden**
- Reason: Native PDFs are not convertible via API

### Why This Happens

The `/export` endpoint is designed for **Google Workspace file format conversion**:
- Google Docs → Plain text ✅
- Google Sheets → CSV ✅
- Google Slides → Plain text ✅
- PDF → Plain text ❌ (not a Google format)

### Solutions

#### ✅ Option 2: Use External PDF Library (IMPLEMENTED)

**Status:** Currently implemented and working in production.

**Implementation:** Uses `pdf-parse@1.1.1` library to extract text from native PDFs.

```javascript
// In scripts/sync/fetch-drive.mjs
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");

async function extractPdfText(pdfId, pdfName) {
  // Method 1: Google Docs - use API export (fast)
  if (mimeType === "application/vnd.google-apps.document") {
    const exportUrl = `https://www.googleapis.com/drive/v3/files/${pdfId}/export?mimeType=text/plain&key=${API_KEY}`;
    const text = await fetch(exportUrl).then(r => r.text());
    return text.trim();
  }

  // Method 2: Native PDF - download and parse
  if (mimeType === "application/pdf") {
    const downloadUrl = `https://www.googleapis.com/drive/v3/files/${pdfId}?alt=media&key=${API_KEY}`;
    const arrayBuffer = await fetch(downloadUrl).then(r => r.arrayBuffer());
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    return pdfData.text.trim();
  }
}
```

**Tested Results:**
- ✅ 9c worksheet: 47,451 chars from 54 pages
- ✅ 3a play script: 2,408 chars from 6 pages
- ✅ 3a sheet music: 1,971 chars from 4 pages
- 📊 Total: 51,830 characters across 3 PDFs
- 📈 llms-full.txt grows proportionally when pdfText is included

**Pros:**
- ✅ Works with native PDFs (text-based)
- ✅ No manual conversion required
- ✅ Works in GitHub Actions (no native dependencies)
- ✅ Dual support for Google Docs and PDFs

**Cons:**
- ⚠️ Downloads entire PDF (slower than API export)
- ⚠️ May fail on scanned PDFs (needs OCR)
- ⚠️ Adds 136KB dependency

**Known Limitations:**
- Font loading warnings (non-critical, doesn't affect extraction)
- Scanned PDFs without embedded text will return empty results

#### Option 1: Convert PDFs to Google Docs (Alternative)

**Steps:**
1. In Google Drive, right-click the PDF
2. Select "Open with" → "Google Docs"
3. File → Save (or it auto-saves as Google Doc)
4. The document is now `application/vnd.google-apps.document`
5. Next CI run will extract text automatically using API export

**Pros:**
- No code changes needed
- Text extraction is instant (no download)

**Cons:**
- Manual conversion required
- Formatting may be lost
- Not suitable for scanned PDFs

#### Option 3: Google Cloud Vision API OCR

For scanned PDFs or images:

```javascript
// Requires @google-cloud/vision
const vision = require("@google-cloud/vision");
const client = new vision.ImageAnnotatorClient();

async function extractPdfWithOcr(pdfId) {
  const gcsUri = `gs://your-bucket/${pdfId}.pdf`;
  const [result] = await client.documentTextDetection(gcsUri);
  return result.fullTextAnnotation.text;
}
```

**Pros:**
- Works with scanned PDFs
- High accuracy OCR

**Cons:**
- Requires Google Cloud project
- Costs money (after free tier)
- More complex setup

## Testing

### Test with Mock Google Doc

1. Create a Google Doc in Drive
2. Add it to a course's `material.worksheet`:

```json
{
  "type": "drive-file",
  "id": "YOUR_GOOGLE_DOC_ID",
  "title": "Test Worksheet"
}
```

3. Run sync:
```bash
npm run sync:drive
```

4. Check cache:
```bash
cat src/_data/pdf-text-cache/your-course-slug.json
```

5. Build and verify:
```bash
npm run build
grep -A5 "worksheet" _site/llms-full.txt | head -20
```

## Usage in AI Tools

### Example: llms-full.txt Output (worksheet section)

```markdown
#### worksheet

- 9年級現代史：學生筆記格式 — https://drive.google.com/file/d/1Jv4.../view

  學生筆記格式內容...（全文 47,451 字元）
```

### AI Tool Access

**NotebookLM / ChatGPT / Claude:**
1. Share `{{ site.url }}/llms-full.txt` URL with the AI tool
2. Ask: "Summarize the worksheet content for 9th grade Modern History"
3. AI reads the inlined pdfText directly from the corpus

## Maintenance

### Cache Management

**Location:** `src/_data/pdf-text-cache/`

**When to clear:**
- PDF content changed in Drive
- Corrupted cache files
- Want to force re-extraction

**How to clear:**
```bash
rm -rf src/_data/pdf-text-cache/*.json
npm run sync:drive
```

### Monitoring

Check sync logs for extraction status:
```bash
npm run sync:drive 2>&1 | grep -E "(PDF|Extracting|Cached)"
```

**Success indicators:**
- `[fetch-drive] ✓ Extracted text from Google Doc: [name] ([size] chars)`
- `[fetch-drive] ✓ Extracted text from native PDF: [name] ([size] chars, [pages] pages)`
- `[fetch-drive] Cached PDF text for [course]/[material]/[file]`

**Info indicators:**
- `[fetch-drive] Attempting PDF text extraction: [name]`
- `[fetch-drive] 📄 Downloading native PDF: [name] ([size] MB)`

**Warning indicators:**
- `[fetch-drive] Error extracting text from [name]: [error message]`

**Example successful run:**
```
[fetch-drive] Attempting PDF text extraction: 9年級現代史：學生筆記格式
[fetch-drive] 📄 Downloading native PDF: 9年級現代史：學生筆記格式 (0.28 MB)
[fetch-drive] ✓ Extracted text from native PDF: 9年級現代史：學生筆記格式 (47451 chars, 54 pages)
[fetch-drive] Cached PDF text for 9c-modern-history-114-autumn/worksheet/1Jv4ah9Ed6W8GHfroGV8PUMsW8HttI0QG
```

## Best Practices

1. **Use Google Docs for text-heavy materials** (worksheets, syllabi, scripts)
2. **Keep PDFs for visual-heavy materials** (sheet music, scanned artwork)
3. **Monitor cache size** - Large text extracts grow llms-full.txt proportionally
4. **Document source format** in course JSON comments
5. **Test extraction** after adding new PDF materials

## Troubleshooting

### Problem: No pdfText in llms-full.txt

**Check:**
1. Is cache file created? `ls src/_data/pdf-text-cache/`
2. Is pdfTextCache.js loading? Check build logs for `[pdfTextCache] Loaded PDF text cache for [course]`
3. Is course slug correct in template?
4. Is the PDF ID matching between course JSON and cache?

**Debug steps:**
```bash
# Check cache content
cat src/_data/pdf-text-cache/your-course-slug.json | jq .

# Verify pdfTextCache is loaded during build
npm run build 2>&1 | grep pdfTextCache

# Check llms-full.txt output
grep -A3 "worksheet" _site/llms-full.txt | head -10
```

### Problem: Module import errors with pdf-parse

**Symptoms:**
- `The requested module 'pdf-parse' does not provide an export named 'default'`
- `pdfParse is not a function`

**Solution:**
Ensure you're using CommonJS require pattern, not ESM import:

```javascript
// ❌ Wrong - ESM import doesn't work
import pdfParse from "pdf-parse";

// ✅ Correct - CommonJS require
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse");
```

**Version requirement:** Use `pdf-parse@1.1.1` for stable, simple function API. Newer versions have complex class-based API that may cause compatibility issues.

### Problem: Empty pdfText or extraction fails

**Possible causes:**

1. **Scanned PDF without embedded text**
   - pdf-parse can only extract embedded text, not OCR
   - Solution: Use Google Cloud Vision API or convert to Google Doc

2. **Permission issues**
   - Check file sharing settings in Google Drive
   - Ensure API key has access to the file

3. **API rate limiting**
   - Add delays between extraction calls (500ms recommended)
   - Monitor for 429 rate limit errors

4. **Corrupted PDF**
   - Check sync logs for specific error messages
   - Try opening PDF manually to verify it's valid

### Problem: Font loading warnings

**Warning message:**
```
Warning: loadFont - translateFont failed: "UnknownErrorException: Ensure that the cMapUrl and cMapPacked API parameters are provided."
```

**Impact:** Non-critical - text extraction still succeeds despite warnings

**Action:** Safe to ignore, doesn't affect functionality

## Related Files

- [scripts/sync/fetch-drive.mjs](../../scripts/sync/fetch-drive.mjs) - Extraction logic
- [src/_data/pdfTextCache.js](../src/_data/pdfTextCache.js) - Cache loader
- [src/ai-discovery/llms-full.njk](../../src/ai-discovery/llms-full.njk) - Full-payload Markdown template with pdfText
