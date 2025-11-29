/**
 * Course Innovations Data Loader
 *
 * Loads pedagogical innovation and teaching insight markdown files
 * from language-specific directories (zh-TW/, en-US/).
 * Each innovation is mapped by course slug for easy template access.
 *
 * Directory structure:
 *   course-innovations/
 *     zh-TW/{course-slug}.md
 *     en-US/{course-slug}.md
 *
 * No frontmatter required - all metadata inferred from:
 *   - Language: from directory name (zh-TW or en-US)
 *   - Slug: from filename
 *   - Published: file presence = published
 *   - Other metadata: from course JSON
 */

const fs = require('fs');
const path = require('path');

module.exports = function() {
  const innovationsDir = path.join(__dirname, '../course-innovations');
  const innovations = {};
  const languages = ['zh-TW', 'en-US'];

  // Return empty object if directory doesn't exist
  if (!fs.existsSync(innovationsDir)) {
    console.warn('[courseInnovations] Directory not found:', innovationsDir);
    return innovations;
  }

  let processedCount = 0;

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
        // Read raw content (no frontmatter parsing needed)
        const content = fs.readFileSync(filepath, 'utf-8').trim();

        // Derive slug from filename
        const slug = path.basename(filename, '.md');

        // Initialize innovation object if it doesn't exist
        if (!innovations[slug]) {
          innovations[slug] = {
            slug
          };
        }

        // Add language-specific data
        innovations[slug][lang] = {
          content: content,
          filename: filename
        };

        processedCount++;
      } catch (err) {
        console.error(`[courseInnovations] Error processing ${lang}/${filename}:`, err.message);
      }
    });
  });

  console.log(`[courseInnovations] Loaded ${processedCount} innovation(s) across ${languages.length} languages`);

  return innovations;
};
