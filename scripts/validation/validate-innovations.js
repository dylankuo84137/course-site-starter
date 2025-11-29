/**
 * Validate Course Innovations
 *
 * Ensures that all course innovations have both language versions (zh-TW and en-US)
 * and that files contain valid content.
 *
 * No frontmatter validation needed - all metadata inferred from file path and course JSON.
 *
 * Usage: node scripts/validation/validate-innovations.js
 */

const fs = require('fs');
const path = require('path');

const INNOVATIONS_DIR = path.join(__dirname, '../../src/course-innovations');
const ZH_DIR = path.join(INNOVATIONS_DIR, 'zh-TW');
const EN_DIR = path.join(INNOVATIONS_DIR, 'en-US');

function getMarkdownFiles(dir) {
  if (!fs.existsSync(dir)) {
    return [];
  }
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('.md') && !f.startsWith('_') && f !== 'README.md')
    .sort();
}

function validateContent(filepath, lang) {
  const content = fs.readFileSync(filepath, 'utf-8').trim();
  const errors = [];

  // Validate content exists
  if (!content || content.length === 0) {
    errors.push(`Empty content`);
  }

  // Validate slug from filename matches expected pattern
  const filename = path.basename(filepath, '.md');
  if (!/^[a-z0-9]+-[a-z0-9-]+$/.test(filename)) {
    errors.push(`Filename "${filename}" doesn't match slug pattern (e.g., "2a-nenggao-113-summer")`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

function main() {
  console.log('🔍 Validating course innovation files...\n');

  const zhFiles = getMarkdownFiles(ZH_DIR);
  const enFiles = getMarkdownFiles(EN_DIR);

  let hasErrors = false;

  // Check for missing translations
  const missingZh = enFiles.filter(f => !zhFiles.includes(f));
  const missingEn = zhFiles.filter(f => !enFiles.includes(f));

  if (missingZh.length > 0) {
    console.error('❌ Missing Chinese (zh-TW) translations:');
    missingZh.forEach(f => console.error(`   - ${f}`));
    console.log('');
    hasErrors = true;
  }

  if (missingEn.length > 0) {
    console.warn('⚠️  Missing English (en-US) translations:');
    missingEn.forEach(f => console.warn(`   - ${f}`));
    console.log('');
    // Note: Missing English is a warning, not an error
  }

  // Validate content for all files
  const allFiles = new Set([...zhFiles, ...enFiles]);
  const validationErrors = [];

  allFiles.forEach(filename => {
    const zhPath = path.join(ZH_DIR, filename);
    const enPath = path.join(EN_DIR, filename);

    // Validate Chinese version
    if (fs.existsSync(zhPath)) {
      const result = validateContent(zhPath, 'zh-TW');
      if (!result.valid) {
        validationErrors.push({
          file: `zh-TW/${filename}`,
          errors: result.errors
        });
      }
    }

    // Validate English version
    if (fs.existsSync(enPath)) {
      const result = validateContent(enPath, 'en-US');
      if (!result.valid) {
        validationErrors.push({
          file: `en-US/${filename}`,
          errors: result.errors
        });
      }
    }
  });

  if (validationErrors.length > 0) {
    console.error('❌ Content validation errors:\n');
    validationErrors.forEach(({ file, errors }) => {
      console.error(`   ${file}:`);
      errors.forEach(err => console.error(`     - ${err}`));
      console.log('');
    });
    hasErrors = true;
  }

  // Summary
  console.log('='.repeat(60));
  console.log('📊 Validation Summary:');
  console.log('='.repeat(60));
  console.log(`  Chinese innovations: ${zhFiles.length}`);
  console.log(`  English innovations: ${enFiles.length}`);
  console.log(`  Missing Chinese: ${missingZh.length}`);
  console.log(`  Missing English: ${missingEn.length}`);
  console.log(`  Content errors: ${validationErrors.length}`);
  console.log('='.repeat(60));

  if (hasErrors) {
    console.error('\n❌ Validation failed. Please fix the errors above.\n');
    process.exit(1);
  } else if (missingEn.length > 0) {
    console.log('\n⚠️  Validation passed with warnings. Consider adding English translations.\n');
    process.exit(0);
  } else {
    console.log('\n✅ All course innovations are valid!\n');
    process.exit(0);
  }
}

// Run validation
try {
  main();
} catch (error) {
  console.error('\n❌ Validation error:', error.message);
  console.error(error.stack);
  process.exit(1);
}
