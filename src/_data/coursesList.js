const fs = require('fs');
const path = require('path');
const dir = __dirname;
const files = fs.readdirSync(dir).filter(n => /^course_.+\.json$/.test(n));
const courses = files.map(n => {
  try { return JSON.parse(fs.readFileSync(path.join(dir,n),'utf-8')); }
  catch(e){ console.warn('[coursesList] Parse failed:', n, e.message); return null; }
}).filter(Boolean);
courses.sort((a,b) => (a.semester||'').localeCompare((b.semester||'')) || (a.slug||'').localeCompare((b.slug||'')));
module.exports = courses;
