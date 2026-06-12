const fs = require('fs');
const path = require('path');
const coursesDir = path.join(__dirname, 'course-configs');

function stripCommentKeys(value) {
  if (!value || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(stripCommentKeys);
  return Object.entries(value).reduce((acc, [key, val]) => {
    if (key.startsWith('_comment')) {
      return acc;
    }
    acc[key] = stripCommentKeys(val);
    return acc;
  }, Array.isArray(value) ? [] : {});
}

function getSemester(course) {
  return (course && course.i18n && course.i18n['zh-TW'] && course.i18n['zh-TW'].semester) || '';
}

const files = fs.readdirSync(coursesDir).filter(n => /^course_.+\.json$/.test(n));
const courses = files.map(n => {
  try {
    const raw = JSON.parse(fs.readFileSync(path.join(coursesDir, n), 'utf-8'));
    const clean = stripCommentKeys(raw);
    return clean;
  } catch (e) {
    console.warn('[coursesList] Parse failed:', n, e.message);
    return null;
  }
}).filter(Boolean).filter(c => c.slug !== 'course-example');

courses.sort((a, b) => getSemester(a).localeCompare(getSemester(b)) || (a.slug || '').localeCompare(b.slug || ''));

module.exports = courses;
