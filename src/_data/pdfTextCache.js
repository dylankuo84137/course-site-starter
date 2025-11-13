/**
 * PDF Text Cache Loader
 *
 * Loads extracted PDF text from separate cache directory.
 * This keeps course JSON files clean while making PDF text available
 * for AI-friendly outputs like ai-index.json.
 *
 * Structure: { courseSlug: { materialKey: { fileId: { name, text, lastSynced } } } }
 */

const fs = require("node:fs");
const path = require("node:path");

const PDF_CACHE_DIR = path.join(__dirname, "pdf-text-cache");

/**
 * Load all PDF text cache files
 * @returns {Object} Map of courseSlug to PDF text data
 */
module.exports = function() {
  const cache = {};

  // Check if cache directory exists
  if (!fs.existsSync(PDF_CACHE_DIR)) {
    console.log("[pdfTextCache] PDF cache directory not found, returning empty cache");
    return cache;
  }

  // Load all course PDF cache files
  const files = fs.readdirSync(PDF_CACHE_DIR).filter(f => f.endsWith(".json"));

  for (const filename of files) {
    const courseSlug = path.basename(filename, ".json");
    const cachePath = path.join(PDF_CACHE_DIR, filename);

    try {
      const content = fs.readFileSync(cachePath, "utf-8");
      cache[courseSlug] = JSON.parse(content);
      console.log(`[pdfTextCache] Loaded PDF text cache for ${courseSlug}`);
    } catch (err) {
      console.warn(`[pdfTextCache] Failed to load ${filename}:`, err.message);
    }
  }

  return cache;
};
