const fs = require('fs');
const path = require('path');
const coursesDir = path.join(__dirname, 'course-configs');
const files = fs.readdirSync(coursesDir).filter(n => /^course_.+\.json$/.test(n));
const courses = files.map(n => {
  try { return JSON.parse(fs.readFileSync(path.join(coursesDir,n),'utf-8')); }
  catch(e){ console.warn('[coursesList] Parse failed:', n, e.message); return null; }
}).filter(Boolean).filter(c => c.slug !== 'course-example');
courses.sort((a,b) => (a.semester||'').localeCompare((b.semester||'')) || (a.slug||'').localeCompare((b.slug||'')));
module.exports = courses;
