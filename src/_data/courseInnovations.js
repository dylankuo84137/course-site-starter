/**
 * Course Innovations Data Loader
 *
 * Loads pedagogical innovation content from two sources:
 * 1. Google Docs (via course JSON `docs.course_innovation.content`)
 * 2. Legacy markdown files (from course-innovations/{lang}/)
 *
 * Google Docs format:
 *   Plain text with bilingual markers:
 *   ---zh-TW---
 *   Chinese content here
 *   ---en-US---
 *   English content here
 *
 * Legacy markdown format:
 *   course-innovations/
 *     zh-TW/{course-slug}.md
 *     en-US/{course-slug}.md
 *
 * Output structure:
 *   {
 *     "course-slug": {
 *       "zh-TW": { body: "...", source: "google-doc" | "markdown" },
 *       "en-US": { body: "...", source: "google-doc" | "markdown" }
 *     }
 *   }
 */

const fs = require('fs');
const path = require('path');
const matter = require('gray-matter');

/**
 * Parse bilingual Google Doc content separated by language markers
 * @param {string} content - Raw plain text content
 * @returns {Object} { 'zh-TW': '...', 'en-US': '...' }
 */
function parseBilingualContent(content) {
  if (!content) return {};

  const result = {};
  const zhMarker = '---zh-TW---';
  const enMarker = '---en-US---';

  const zhStart = content.indexOf(zhMarker);
  const enStart = content.indexOf(enMarker);

  if (zhStart !== -1) {
    const zhContent = enStart !== -1
      ? content.substring(zhStart + zhMarker.length, enStart)
      : content.substring(zhStart + zhMarker.length);
    result['zh-TW'] = zhContent.trim();
  }

  if (enStart !== -1) {
    const enContent = content.substring(enStart + enMarker.length);
    result['en-US'] = enContent.trim();
  }

  return result;
}

module.exports = function() {
  const innovations = {};
  const languages = ['zh-TW', 'en-US'];

  // ========================================================================
  // Step 1: Load innovations from course JSON files (Google Docs)
  // ========================================================================
  const courseConfigsDir = path.join(__dirname, 'course-configs');
  if (fs.existsSync(courseConfigsDir)) {
    const courseFiles = fs.readdirSync(courseConfigsDir)
      .filter(f => f.startsWith('course_') && f.endsWith('.json') && f !== 'course_template.json');

    courseFiles.forEach(filename => {
      try {
        const filepath = path.join(courseConfigsDir, filename);
        const courseData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        const slug = courseData.slug;

        // Check if course has innovation content from Google Docs
        if (courseData.docs?.course_innovation?.content) {
          const content = courseData.docs.course_innovation.content;
          const bilingualContent = parseBilingualContent(content);

          if (!innovations[slug]) {
            innovations[slug] = { slug };
          }

          // Add language-specific content
          if (bilingualContent['zh-TW']) {
            innovations[slug]['zh-TW'] = {
              body: bilingualContent['zh-TW'],
              source: 'google-doc'
            };
          }
          if (bilingualContent['en-US']) {
            innovations[slug]['en-US'] = {
              body: bilingualContent['en-US'],
              source: 'google-doc'
            };
          }
        }
      } catch (err) {
        console.error(`[courseInnovations] Error reading course JSON ${filename}:`, err.message);
      }
    });
  }

  // ========================================================================
  // Step 2: Load legacy markdown files (backward compatible)
  // ========================================================================
  const innovationsDir = path.join(__dirname, '../course-innovations');
  if (!fs.existsSync(innovationsDir)) {
    console.log('[courseInnovations] No legacy markdown directory found, using Google Docs only');
    const googleDocCount = Object.keys(innovations).length;
    console.log(`[courseInnovations] Loaded ${googleDocCount} innovation(s) from Google Docs`);
    return innovations;
  }

  let legacyCount = 0;

  // Process each language directory
  languages.forEach(lang => {
    const langDir = path.join(innovationsDir, lang);

    // Skip if language directory doesn't exist
    if (!fs.existsSync(langDir)) {
      return;
    }

    // Read all markdown files in this language directory
    let files;
    try {
      files = fs.readdirSync(langDir)
        .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md');
    } catch (err) {
      console.error(`[courseInnovations] Error reading ${lang}/ directory:`, err.message);
      return;
    }

    // Process each file
    files.forEach(filename => {
      const filepath = path.join(langDir, filename);

      try {
        // Read file content
        const fileContent = fs.readFileSync(filepath, 'utf-8');

        // Parse frontmatter and body using gray-matter
        const { data, content: body } = matter(fileContent);

        // Derive slug from filename
        const slug = path.basename(filename, '.md');

        // Initialize innovation object if it doesn't exist
        if (!innovations[slug]) {
          innovations[slug] = { slug };
        }

        // Only add markdown content if Google Doc content doesn't exist
        // (Google Docs take priority)
        if (!innovations[slug][lang]) {
          innovations[slug][lang] = {
            ...data,
            body: body.trim(),
            source: 'markdown',
            filename: filename
          };
          legacyCount++;
        }
      } catch (err) {
        console.error(`[courseInnovations] Error processing ${lang}/${filename}:`, err.message);
      }
    });
  });

  const googleDocCount = Object.keys(innovations).filter(slug =>
    innovations[slug]['zh-TW']?.source === 'google-doc' ||
    innovations[slug]['en-US']?.source === 'google-doc'
  ).length;

  console.log(`[courseInnovations] Loaded ${googleDocCount} Google Doc innovation(s) and ${legacyCount} legacy markdown file(s)`);

  return innovations;
};
