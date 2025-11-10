function getI18nField(course, field, lang = "zh-TW") {
  if (!course || !field) return undefined;
  const locales = course.i18n || {};
  if (lang && locales[lang] && locales[lang][field] !== undefined) {
    return locales[lang][field];
  }
  if (locales["zh-TW"] && locales["zh-TW"][field] !== undefined) {
    return locales["zh-TW"][field];
  }
  if (course[field] !== undefined) {
    return course[field];
  }
  return undefined;
}

module.exports = {
  getI18nField
};
