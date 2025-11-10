/**
 * Course Data Validator
 * Validates course JSON files for required structure and data integrity
 */

// Required i18n fields for each language
const REQUIRED_I18N_FIELDS = [
  'title',
  'grade', 
  'semester',
  'unit',
  'domain',
  'teacher',
  'overview'
];

// Optional i18n fields that should match across languages if present
const OPTIONAL_I18N_FIELDS = [
  'learningObjectives'
];

// Supported languages
const SUPPORTED_LANGUAGES = ['zh-TW', 'en-US'];

// Google Drive ID format validation (28-50 characters, alphanumeric + underscore/hyphen)
// Google Docs: ~44 chars, Drive folders: ~28-33 chars
const DRIVE_ID_PATTERN = /^[a-zA-Z0-9_-]{28,50}$/;

// YouTube video ID format validation (11 characters, alphanumeric + underscore/hyphen)
const YOUTUBE_ID_PATTERN = /^[a-zA-Z0-9_-]{11}$/;

const ALLOWED_ROOT_KEYS = new Set(['slug', 'hero_image', 'metadata', 'i18n', 'material', 'docs']);

/**
 * Validation error class
 */
class ValidationError extends Error {
  constructor(message, field = null, course = null) {
    super(message);
    this.name = 'ValidationError';
    this.field = field;
    this.course = course;
  }
}

/**
 * Validates a single course object
 * @param {Object} course - Course data object
 * @param {string} filename - Source filename for error reporting
 * @returns {Object} Validation result with errors and warnings
 */
function validateCourse(course, filename = 'unknown') {
  const errors = [];
  const warnings = [];
  
  const addError = (message, field = null) => {
    errors.push(new ValidationError(message, field, filename));
  };
  
  const addWarning = (message, field = null) => {
    warnings.push({ message, field, course: filename });
  };

  try {
    if (!course || typeof course !== 'object') {
      addError('Course data must be an object');
      return { errors, warnings, isValid: false };
    }

    if (!course.slug || typeof course.slug !== 'string') {
      addError('Missing or invalid slug field', 'slug');
    }

    if (!course.i18n || typeof course.i18n !== 'object') {
      addError('Missing i18n object', 'i18n');
    } else {
      validateI18nStructure(course.i18n, addError, addWarning);
    }

    if (course.metadata && typeof course.metadata !== 'object') {
      addError('Metadata must be an object', 'metadata');
    } else if (course.metadata) {
      validateMetadata(course.metadata, addError, addWarning);
    }

    if (!course.material || typeof course.material !== 'object' || Object.keys(course.material).length === 0) {
      addError('Missing material object', 'material');
    } else {
      validateMaterial(course.material, addError, addWarning);
    }

    if (course.docs && typeof course.docs === 'object' && Object.keys(course.docs).length > 0) {
      validateDocs(course.docs, addError, addWarning);
    } else {
      addWarning('Missing docs object; provide course.docs for new schema', 'docs');
    }

    for (const key of Object.keys(course)) {
      if (!ALLOWED_ROOT_KEYS.has(key) && !key.startsWith('_comment')) {
        addWarning(`Unknown root-level key: ${key}`, key);
      }
    }

  } catch (error) {
    addError(`Validation failed with error: ${error.message}`);
  }

  return {
    errors,
    warnings,
    isValid: errors.length === 0
  };
}

function validateMaterial(material, addError, addWarning) {
  for (const [materialKey, entries] of Object.entries(material)) {
    if (!Array.isArray(entries)) {
      addError(`material.${materialKey} must be an array`, `material.${materialKey}`);
      continue;
    }

    entries.forEach((entry, index) => {
      const baseField = `material.${materialKey}[${index}]`;
      if (!entry || typeof entry !== 'object') {
        addError('Material entry must be an object', baseField);
        return;
      }
      if (!entry.type || typeof entry.type !== 'string') {
        addError('Material entry missing type field', `${baseField}.type`);
      }
      if ((entry.type === 'drive-folder' || entry.type === 'drive-file') && (!entry.id || typeof entry.id !== 'string')) {
        addError('Drive-based material must include an id', `${baseField}.id`);
      }
      if ((entry.type === 'drive-folder' || entry.type === 'drive-file') && entry.id && !DRIVE_ID_PATTERN.test(entry.id)) {
        addError(`Invalid Google Drive ID format: ${entry.id}`, `${baseField}.id`);
      }
      if (entry.type === 'youtube' && entry.id && !YOUTUBE_ID_PATTERN.test(entry.id)) {
        addWarning(`Unexpected YouTube video ID: ${entry.id}`, `${baseField}.id`);
      }
      if (entry.items !== undefined && !Array.isArray(entry.items)) {
        addError('Material items must be an array', `${baseField}.items`);
      }
    });
  }
}

function validateDocs(docs, addError, addWarning) {
  for (const [docKey, docEntry] of Object.entries(docs)) {
    if (!docEntry || typeof docEntry !== 'object') {
      addError('Doc entry must be an object', `docs.${docKey}`);
      continue;
    }
    if (!docEntry.type || typeof docEntry.type !== 'string') {
      addWarning('Doc entry missing type field, defaulting to google-doc', `docs.${docKey}.type`);
    }
    if ((!docEntry.type || docEntry.type !== 'manual') && (!docEntry.id || typeof docEntry.id !== 'string')) {
      addError('Doc entry must include a Google Drive ID', `docs.${docKey}.id`);
    }
    if (docEntry.id && !DRIVE_ID_PATTERN.test(docEntry.id)) {
      addError(`Invalid Google Doc ID format: ${docEntry.id}`, `docs.${docKey}.id`);
    }
  }
}

function validateI18nStructure(i18n, addError, addWarning) {
  for (const lang of SUPPORTED_LANGUAGES) {
    if (!i18n[lang] || typeof i18n[lang] !== 'object') {
      addError(`Missing or invalid i18n data for language: ${lang}`, `i18n.${lang}`);
      continue;
    }

    for (const field of REQUIRED_I18N_FIELDS) {
      if (!i18n[lang][field] || typeof i18n[lang][field] !== 'string') {
        addError(`Missing or invalid required field: ${field}`, `i18n.${lang}.${field}`);
      }
    }

    for (const field of OPTIONAL_I18N_FIELDS) {
      if (i18n[lang][field] !== undefined) {
        if (field === 'learningObjectives') {
          if (!Array.isArray(i18n[lang][field])) {
            addError(`Field ${field} must be an array`, `i18n.${lang}.${field}`);
          }
        }
      }
    }
  }

  if (i18n['zh-TW'] && i18n['en-US']) {
    for (const field of OPTIONAL_I18N_FIELDS) {
      const zhField = i18n['zh-TW'][field];
      const enField = i18n['en-US'][field];
      
      if (Array.isArray(zhField) && Array.isArray(enField)) {
        if (zhField.length !== enField.length) {
          addWarning(`Array field ${field} has different lengths across languages`, `i18n.${field}`);
        }
      } else if ((zhField && !enField) || (!zhField && enField)) {
        addWarning(`Field ${field} exists in one language but not the other`, `i18n.${field}`);
      }
    }
  }
}

function validateMetadata(metadata, addError, addWarning) {
  const requiredMetadata = ['grade_level', 'domain_category', 'teacher_name'];
  
  for (const field of requiredMetadata) {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      addWarning(`Missing or invalid metadata field: ${field}`, `metadata.${field}`);
    }
  }
  if (metadata.tags && !Array.isArray(metadata.tags)) {
    addError('metadata.tags must be an array', 'metadata.tags');
  }
}

function validateAllCourses(dataDir = 'src/_data') {
  const fs = require('fs');
  const path = require('path');
  
  const allErrors = [];
  const allWarnings = [];
  const courseResults = {};

  try {
    const coursesDir = path.join(dataDir, 'course-configs');
    const files = fs.readdirSync(coursesDir);
    const courseFiles = files.filter(f => 
      f.startsWith('course_') && 
      f.endsWith('.json') && 
      f !== 'course_template.json'
    );

    for (const filename of courseFiles) {
      const filepath = path.join(coursesDir, filename);
      try {
        const courseData = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
        const result = validateCourse(courseData, filename);
        
        courseResults[filename] = result;
        allErrors.push(...result.errors);
        allWarnings.push(...result.warnings);
        
      } catch (error) {
        const parseError = new ValidationError(
          `Failed to parse JSON: ${error.message}`,
          null,
          filename
        );
        allErrors.push(parseError);
        courseResults[filename] = {
          errors: [parseError],
          warnings: [],
          isValid: false
        };
      }
    }

  } catch (error) {
    allErrors.push(new ValidationError(`Failed to read directory: ${error.message}`));
  }

  return {
    overall: {
      isValid: allErrors.length === 0,
      errorCount: allErrors.length,
      warningCount: allWarnings.length,
      courseCount: Object.keys(courseResults).length
    },
    errors: allErrors,
    warnings: allWarnings,
    courses: courseResults
  };
}

function formatValidationResults(results) {
  const lines = [];
  
  lines.push('='.repeat(60));
  lines.push('COURSE DATA VALIDATION RESULTS');
  lines.push('='.repeat(60));
  
  const { overall, errors, warnings } = results;
  
  lines.push(`Courses validated: ${overall.courseCount}`);
  lines.push(`Errors: ${overall.errorCount}`);
  lines.push(`Warnings: ${overall.warningCount}`);
  lines.push(`Overall status: ${overall.isValid ? '✅ VALID' : '❌ INVALID'}`);
  lines.push('');
  
  if (errors.length > 0) {
    lines.push('ERRORS:');
    lines.push('-'.repeat(40));
    for (const error of errors) {
      lines.push(`❌ ${error.course || 'unknown'}: ${error.message}`);
      if (error.field) {
        lines.push(`   Field: ${error.field}`);
      }
    }
    lines.push('');
  }
  
  if (warnings.length > 0) {
    lines.push('WARNINGS:');
    lines.push('-'.repeat(40));
    for (const warning of warnings) {
      lines.push(`⚠️  ${warning.course || 'unknown'}: ${warning.message}`);
      if (warning.field) {
        lines.push(`   Field: ${warning.field}`);
      }
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

module.exports = {
  validateCourse,
  validateAllCourses,
  formatValidationResults,
  ValidationError,
  REQUIRED_I18N_FIELDS,
  SUPPORTED_LANGUAGES
};
