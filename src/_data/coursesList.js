const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname);
const files = fs.readdirSync(dataDir).filter(n => /^course_.+\.json$/.test(n));

const courses = files.map(name => {
  const raw = fs.readFileSync(path.join(dataDir, name), 'utf-8');
  try {
    const json = JSON.parse(raw);
    return json;
  } catch (e) {
    console.warn('[coursesList] Failed to parse', name, e.message);
    return null;
  }
}).filter(Boolean);

courses.sort((a, b) => (a.semester || '').localeCompare(b.semester || '') || (a.slug || '').localeCompare(b.slug || ''));

module.exports = courses;
