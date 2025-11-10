import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const API_KEY = process.env.GOOGLE_API_KEY;
if (!API_KEY) {
  console.error("[fetch-drive] Missing GOOGLE_API_KEY env var.");
  process.exit(1);
}

const ROOT = process.cwd();
const DATA_DIR = path.join(ROOT, "src", "_data");
const COURSE_ORIGINAL_DIR = path.join(DATA_DIR, "course-original");
if (!fs.existsSync(COURSE_ORIGINAL_DIR)) {
  fs.mkdirSync(COURSE_ORIGINAL_DIR, { recursive: true });
}

const MATERIAL_IMAGE_KEYS = new Set(["workbook_photos", "photos", "blackboard", "scripts_photos"]);
const MATERIAL_AUDIO_KEYS = new Set(["songs_audio"]);
const MATERIAL_PDF_KEYS = new Set(["sheet_music", "play_scripts", "worksheet", "workbook_pdfs"]);

function deriveCourseTags(course) {
  const tags = new Set();
  const zh = course.i18n && course.i18n["zh-TW"] ? course.i18n["zh-TW"] : {};
  const metadata = course.metadata || {};
  [
    metadata.grade_level,
    metadata.domain_category,
    metadata.teacher_name,
    zh.grade,
    zh.semester,
    zh.unit,
    zh.domain
  ].forEach(t => { if (t) tags.add(t); });
  return Array.from(tags);
}

async function fetchGoogleDoc(docId) {
  if (!docId) return null;

  try {
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${docId}?key=${API_KEY}&fields=id,name,mimeType&supportsAllDrives=true`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      console.warn(`[fetch-drive] Failed to get metadata for doc ${docId}: ${metaRes.status} ${metaRes.statusText}`);
      return null;
    }
    const metadata = await metaRes.json();

    let contentUrl;
    let isGoogleDoc = false;

    if (metadata.mimeType === "application/vnd.google-apps.document") {
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain&key=${API_KEY}&supportsAllDrives=true`;
      isGoogleDoc = true;
    } else {
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}?alt=media&key=${API_KEY}&supportsAllDrives=true`;
    }

    const res = await fetch(contentUrl);
    if (!res.ok) {
      if (res.status === 403 && isGoogleDoc) {
        console.warn(`[fetch-drive] Export forbidden for ${docId}, trying alternative download method...`);
        const altUrl = `https://www.googleapis.com/drive/v3/files/${docId}?alt=media&key=${API_KEY}&supportsAllDrives=true`;
        const altRes = await fetch(altUrl);
        if (altRes.ok) {
          const altContent = await altRes.text();
          return {
            id: docId,
            name: metadata.name,
            mimeType: metadata.mimeType,
            content: altContent.trim(),
            lastUpdated: new Date().toISOString(),
            downloadUrl: `https://drive.google.com/file/d/${docId}/view`
          };
        }
      }
      console.warn(`[fetch-drive] Failed to fetch doc ${docId}: ${res.status} ${res.statusText}`);
      return null;
    }

    let content;
    if (isGoogleDoc || metadata.mimeType.startsWith("text/")) {
      content = await res.text();
    } else if (metadata.mimeType === "application/pdf") {
      content = `文件類型: ${metadata.name}\n檔案格式: PDF\n\n請使用下方的 PDF 檢視器或下載檢視。\n下載連結: https://drive.google.com/file/d/${docId}/view`;
      console.log(`[fetch-drive] PDF document ${metadata.name}`);
    } else {
      content = `文件類型: ${metadata.name}\n檔案格式: ${metadata.mimeType}\n\n此檔案需要下載檢視，無法直接顯示文字內容。\n下載連結: https://drive.google.com/file/d/${docId}/view`;
    }

    return {
      id: docId,
      name: metadata.name,
      mimeType: metadata.mimeType,
      content: content.trim(),
      lastUpdated: new Date().toISOString(),
      downloadUrl: `https://drive.google.com/file/d/${docId}/view`
    };
  } catch (err) {
    console.warn(`[fetch-drive] Error fetching doc ${docId}:`, err.message);
    return null;
  }
}

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function listFolderFiles(folderId) {
  const results = [];
  let pageToken = undefined;

  do {
    const url = new URL("https://www.googleapis.com/drive/v3/files");
    const params = {
      key: API_KEY,
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id,name,mimeType,shortcutDetails),nextPageToken",
      orderBy: "name",
      pageSize: "200",
      includeItemsFromAllDrives: "true",
      supportsAllDrives: "true"
    };
    Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const res = await fetch(url.href);
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Drive API error: ${res.status} ${res.statusText} :: ${text}`);
    }
    const data = await res.json();
    (data.files || []).forEach(f => results.push(f));
    pageToken = data.nextPageToken;
    if (pageToken) await sleep(200);
  } while (pageToken);

  return results;
}

function stripExt(name) {
  const i = name.lastIndexOf(".");
  return i === -1 ? name : name.slice(0, i);
}

function resolveShortcutMime(file) {
  if (file.mimeType !== "application/vnd.google-apps.shortcut") return file.mimeType;
  const targetMime = file.shortcutDetails && file.shortcutDetails.targetMimeType;
  return targetMime || file.mimeType;
}

function resolveId(file) {
  if (file.mimeType !== "application/vnd.google-apps.shortcut") return file.id;
  const targetId = file.shortcutDetails && file.shortcutDetails.targetId;
  return targetId || file.id;
}

function extractTagsFromName(name) {
  const base = stripExt(name);
  const tags = new Set();
  const bracketRegex = /[\[【]([^\]】]+)[\]】]/g;
  let m;
  while ((m = bracketRegex.exec(base)) !== null) {
    const t = m[1].trim();
    if (t) tags.add(t);
  }
  const hashRegex = /#(\S+)/g;
  while ((m = hashRegex.exec(base)) !== null) {
    const t = m[1].trim();
    if (t) tags.add(t);
  }
  return Array.from(tags);
}

function uniq(arr) {
  return Array.from(new Set(arr.filter(Boolean)));
}

async function fetchDriveMetadata(fileId) {
  const metaUrl = `https://www.googleapis.com/drive/v3/files/${fileId}?key=${API_KEY}&fields=id,name,mimeType&supportsAllDrives=true`;
  const res = await fetch(metaUrl);
  if (!res.ok) {
    console.warn(`[fetch-drive] Failed to read file metadata ${fileId}: ${res.status} ${res.statusText}`);
    return null;
  }
  return await res.json();
}

function shouldIncludeFile(materialKey, mimeType) {
  if (!mimeType) return false;
  if (MATERIAL_IMAGE_KEYS.has(materialKey)) {
    return mimeType.startsWith("image/") || (materialKey === "workbook_photos" && mimeType === "application/pdf");
  }
  if (MATERIAL_AUDIO_KEYS.has(materialKey)) {
    return mimeType.startsWith("audio/") || mimeType === "application/vnd.google-apps.audio";
  }
  if (MATERIAL_PDF_KEYS.has(materialKey)) {
    return mimeType === "application/pdf" || mimeType === "application/vnd.google-apps.document";
  }
  return true;
}

function createFileItem(id, name, mimeType, tags = []) {
  return {
    id,
    name: stripExt(name || id),
    mimeType,
    tags,
    downloadUrl: `https://drive.google.com/file/d/${id}/view`,
    previewUrl: `https://drive.google.com/file/d/${id}/preview`
  };
}

function mapFolderFile(materialKey, file, courseTags) {
  const mime = resolveShortcutMime(file) || "";
  const id = resolveId(file);
  if (!id || !shouldIncludeFile(materialKey, mime)) return null;
  const rawTags = extractTagsFromName(file.name || id);
  const tags = uniq([...(Array.isArray(file.tags) ? file.tags : []), ...rawTags, ...courseTags]);
  const item = createFileItem(id, file.name || id, mime, tags);
  if (mime === "application/pdf") {
    item.isPdf = true;
    item.viewerUrl = item.previewUrl;
  }
  return item;
}

async function syncMaterialEntry(materialKey, entry, courseTags) {
  if (!entry || typeof entry !== "object") return null;
  const synced = { ...entry };
  const existingItems = Array.isArray(entry.items) ? entry.items : [];
  synced.items = existingItems.map(item => ({ ...item }));

  if (entry.type === "drive-folder" && entry.id) {
    console.log(`[fetch-drive] Syncing material folder ${materialKey}: ${entry.id}`);
    try {
      const files = await listFolderFiles(entry.id);
      const mapped = [];
      for (const f of files) {
        const item = mapFolderFile(materialKey, f, courseTags);
        if (item) mapped.push(item);
      }
      synced.items = mapped;
      synced.lastSynced = new Date().toISOString();
    } catch (err) {
      console.warn(`[fetch-drive] Failed to list folder ${entry.id}: ${err.message}`);
    }
  } else if (entry.type === "drive-file" && entry.id) {
    console.log(`[fetch-drive] Syncing material file ${materialKey}: ${entry.id}`);
    const metadata = await fetchDriveMetadata(entry.id);
    if (metadata) {
      const tags = uniq([...(entry.tags || []), ...courseTags]);
      const item = createFileItem(metadata.id, metadata.name || metadata.id, metadata.mimeType, tags);
      if (metadata.mimeType === "application/pdf") {
        item.isPdf = true;
        item.viewerUrl = item.previewUrl;
      }
      synced.items = [item];
      synced.lastSynced = new Date().toISOString();
    }
  } else if (entry.type === "manual") {
    synced.items = existingItems.map(item => ({ ...item }));
  }

  return synced;
}

async function syncMaterial(course, courseTags) {
  const material = course.material || {};
  for (const [key, entries] of Object.entries(material)) {
    if (!Array.isArray(entries)) continue;
    const syncedEntries = [];
    for (const entry of entries) {
      const synced = await syncMaterialEntry(key, entry, courseTags);
      if (synced) syncedEntries.push(synced);
    }
    material[key] = syncedEntries;
  }
}

async function syncModernDocs(course) {
  const docs = course.docs && typeof course.docs === "object" ? course.docs : {};
  const updated = {};
  for (const [docKey, docEntry] of Object.entries(docs)) {
    if (!docEntry || typeof docEntry !== "object") {
      updated[docKey] = docEntry;
      continue;
    }
    const docId = docEntry.id;
    if (docId) {
      console.log(`[fetch-drive] Fetching modern doc ${docKey} (${docId}) ...`);
      const docContent = await fetchGoogleDoc(docId);
      if (docContent) {
        updated[docKey] = {
          ...docEntry,
          name: docContent.name,
          mimeType: docContent.mimeType,
          content: docContent.content,
          lastSynced: docContent.lastUpdated,
          downloadUrl: docContent.downloadUrl
        };
        continue;
      }
    }
    updated[docKey] = docEntry;
  }
  course.docs = updated;
}

async function updateCourseJson(courseJsonPath) {
  backupCourseJson(courseJsonPath);
  const original = fs.readFileSync(courseJsonPath, "utf-8");
  const course = JSON.parse(original);
  const courseTags = deriveCourseTags(course);
  await syncMaterial(course, courseTags);
  await syncModernDocs(course);

  fs.writeFileSync(courseJsonPath, JSON.stringify(course, null, 2), "utf-8");
  console.log(`[fetch-drive] Updated ${path.basename(courseJsonPath)} with Drive content`);
}

function backupCourseJson(courseJsonPath) {
  const basename = path.basename(courseJsonPath);
  if (basename === "course_template.json") return;
  const backupPath = path.join(COURSE_ORIGINAL_DIR, `${basename}.orig`);
  if (fs.existsSync(backupPath)) {
    console.log(`[fetch-drive] Backup exists for ${basename}, skipping backup step`);
    return;
  }
  fs.copyFileSync(courseJsonPath, backupPath);
  console.log(`[fetch-drive] Backed up ${basename} to ${path.relative(ROOT, backupPath)}`);
}

async function main() {
  const coursesDir = path.join(ROOT, "src", "_data", "course-configs");
  const files = fs.readdirSync(coursesDir).filter(n =>
    n.startsWith("course_") &&
    n.endsWith(".json") &&
    n !== "course_template.json"
  );
  if (files.length === 0) {
    console.error("[fetch-drive] No course_*.json found in src/_data/course-configs");
    process.exit(1);
  }
  for (const name of files) {
    await updateCourseJson(path.join(coursesDir, name));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
