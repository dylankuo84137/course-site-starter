// Mirrors the helper module shape of materialHelpers.js (src/_data/materialHelpers.js:195-202)

/**
 * Returns the locale-specific tags for a course.
 * Formula: dedupe(i18n[lang].tags)
 * Tags exist only per-language; untranslatable tokens are written into each locale's list.
 *
 * @param {Object} course - Hydrated course object
 * @param {string} lang - Locale key, e.g. 'zh-TW' or 'en-US'
 * @returns {string[]}
 */
function getCourseTags(course, lang) {
  const localeTags = (course && course.i18n && course.i18n[lang] && Array.isArray(course.i18n[lang].tags))
    ? course.i18n[lang].tags
    : [];
  return Array.from(new Set(localeTags.filter(Boolean)));
}

module.exports = { getCourseTags };
