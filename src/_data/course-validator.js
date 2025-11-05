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
  
  // Helper function to add error
  const addError = (message, field = null) => {
    errors.push(new ValidationError(message, field, filename));
  };
  
  // Helper function to add warning
  const addWarning = (message, field = null) => {
    warnings.push({ message, field, course: filename });
  };

  try {
    // 1. Validate basic structure
    if (!course || typeof course !== 'object') {
      addError('Course data must be an object');
      return { errors, warnings, isValid: false };
    }

    // 2. Validate required top-level fields
    if (!course.slug || typeof course.slug !== 'string') {
      addError('Missing or invalid slug field', 'slug');
    }

    // 3. Validate i18n structure
    if (!course.i18n || typeof course.i18n !== 'object') {
      addError('Missing i18n object', 'i18n');
    } else {
      validateI18nStructure(course.i18n, addError, addWarning);
    }

    // 4. Validate metadata structure
    if (course.metadata && typeof course.metadata !== 'object') {
      addError('Metadata must be an object', 'metadata');
    } else if (course.metadata) {
      validateMetadata(course.metadata, addError, addWarning);
    }

    // 5. Validate Google Drive folder IDs
    if (course.drive_folders && typeof course.drive_folders === 'object') {
      validateDriveFolders(course.drive_folders, addError, addWarning);
    }

    // 6. Validate Google Docs IDs
    if (course.google_docs && typeof course.google_docs === 'object') {
      validateGoogleDocs(course.google_docs, addError, addWarning);
    }

    // 7. Validate YouTube video IDs
    if (course.youtube_videos && typeof course.youtube_videos === 'object') {
      validateYouTubeVideos(course.youtube_videos, addError, addWarning);
    }

    // 8. Validate files structure
    if (course.files && typeof course.files === 'object') {
      validateFilesStructure(course.files, addError, addWarning);
    }

    // 9. Validate tags
    if (course.tags && !Array.isArray(course.tags)) {
      addError('Tags must be an array', 'tags');
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

/**
 * Validates i18n structure and field consistency
 */
function validateI18nStructure(i18n, addError, addWarning) {
  // Check each supported language exists
  for (const lang of SUPPORTED_LANGUAGES) {
    if (!i18n[lang] || typeof i18n[lang] !== 'object') {
      addError(`Missing or invalid i18n data for language: ${lang}`, `i18n.${lang}`);
      continue;
    }

    // Check required fields exist for this language
    for (const field of REQUIRED_I18N_FIELDS) {
      if (!i18n[lang][field] || typeof i18n[lang][field] !== 'string') {
        addError(`Missing or invalid required field: ${field}`, `i18n.${lang}.${field}`);
      }
    }

    // Check optional field types
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

  // Check field consistency across languages
  if (i18n['zh-TW'] && i18n['en-US']) {
    // Check that optional arrays have same length
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

/**
 * Validates metadata structure
 */
function validateMetadata(metadata, addError, addWarning) {
  const requiredMetadata = ['grade_level', 'domain_category', 'teacher_name'];
  
  for (const field of requiredMetadata) {
    if (!metadata[field] || typeof metadata[field] !== 'string') {
      addWarning(`Missing or invalid metadata field: ${field}`, `metadata.${field}`);
    }
  }
}

/**
 * Validates Google Drive folder IDs
 */
function validateDriveFolders(driveFolders, addError, addWarning) {
  const knownFolderTypes = [
    'workbook_photos', 'blackboard', 'photos', 
    'performance', 'scripts_and_performance', 
    'songs_audio'
  ];

  for (const [folderType, folderId] of Object.entries(driveFolders)) {
    if (folderId && typeof folderId === 'string') {
      if (!DRIVE_ID_PATTERN.test(folderId)) {
        addError(`Invalid Google Drive folder ID format: ${folderId}`, `drive_folders.${folderType}`);
      }
    }

    if (!knownFolderTypes.includes(folderType)) {
      addWarning(`Unknown folder type: ${folderType}`, `drive_folders.${folderType}`);
    }
  }
}

/**
 * Validates Google Docs IDs
 */
function validateGoogleDocs(googleDocs, addError, addWarning) {
  const knownDocTypes = ['course_description', 'play_script', 'story'];

  for (const [docType, docId] of Object.entries(googleDocs)) {
    if (docId && typeof docId === 'string') {
      if (!DRIVE_ID_PATTERN.test(docId)) {
        addError(`Invalid Google Doc ID format: ${docId}`, `google_docs.${docType}`);
      }
    }

    if (!knownDocTypes.includes(docType)) {
      addWarning(`Unknown document type: ${docType}`, `google_docs.${docType}`);
    }
  }
}

/**
 * Validates YouTube video IDs
 */
function validateYouTubeVideos(youtubeVideos, addError, addWarning) {
  for (const [videoType, videoId] of Object.entries(youtubeVideos)) {
    if (videoId && typeof videoId === 'string') {
      if (!YOUTUBE_ID_PATTERN.test(videoId)) {
        addError(`Invalid YouTube video ID format: ${videoId}`, `youtube_videos.${videoType}`);
      }
    }
  }
}

/**
 * Validates files structure
 */
function validateFilesStructure(files, addError, addWarning) {
  const expectedFileTypes = [
    'workbook_pdfs', 'play_scripts', 'sheet_music',
    'workbook_photos', 'blackboard', 'photos', 
    'scripts_photos', 'songs'
  ];

  for (const [fileType, fileList] of Object.entries(files)) {
    if (fileList !== null && fileList !== undefined && !Array.isArray(fileList)) {
      addError(`File list for ${fileType} must be an array`, `files.${fileType}`);
    }

    if (!expectedFileTypes.includes(fileType)) {
      addWarning(`Unknown file type: ${fileType}`, `files.${fileType}`);
    }
  }
}

/**
 * Validates all course files in a directory
 * @param {string} dataDir - Path to _data directory
 * @returns {Object} Combined validation results
 */
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

/**
 * Formats validation results for display
 */
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