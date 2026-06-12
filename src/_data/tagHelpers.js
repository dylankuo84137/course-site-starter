// Mirrors the helper module shape of materialHelpers.js (src/_data/materialHelpers.js:195-202)

/**
 * Returns the locale-specific tags for a course.
 * Formula: dedupe(metadata.tags ++ i18n[lang].tags)
 * metadata.tags is the neutral escape hatch for untranslatable tokens.
 *
 * @param {Object} course - Hydrated course object
 * @param {string} lang - Locale key, e.g. 'zh-TW' or 'en-US'
 * @returns {string[]}
 */
function getCourseTags(course, lang) {
  const neutral = (course && course.metadata && Array.isArray(course.metadata.tags))
    ? course.metadata.tags
    : [];
  const localeTags = (course && course.i18n && course.i18n[lang] && Array.isArray(course.i18n[lang].tags))
    ? course.i18n[lang].tags
    : [];
  return Array.from(new Set([...neutral, ...localeTags].filter(Boolean)));
}

module.exports = { getCourseTags };
