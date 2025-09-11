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

const FOLDER_TO_OUTPUT = {
  workbook_photos: "workbook_photos",
  blackboard: "blackboard",
  photos: "photos",
  scripts_and_performance: "scripts_photos",
  songs_audio: "songs",
};

async function fetchGoogleDoc(docId) {
  if (!docId) return null;
  
  try {
    // First check file metadata to determine type
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${docId}?key=${API_KEY}&fields=id,name,mimeType`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      console.warn(`[fetch-drive] Failed to get metadata for doc ${docId}: ${metaRes.status} ${metaRes.statusText}`);
      return null;
    }
    const metadata = await metaRes.json();
    
    let contentUrl;
    let isGoogleDoc = false;
    
    if (metadata.mimeType === 'application/vnd.google-apps.document') {
      // Native Google Doc - use export API
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain&key=${API_KEY}`;
      isGoogleDoc = true;
    } else {
      // Other file types (docx, pdf, etc.) - download directly
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}?alt=media&key=${API_KEY}`;
    }
    
    const res = await fetch(contentUrl);
    if (!res.ok) {
      console.warn(`[fetch-drive] Failed to fetch doc ${docId}: ${res.status} ${res.statusText}`);
      return null;
    }
    
    let content;
    if (isGoogleDoc || metadata.mimeType.startsWith('text/')) {
      content = await res.text();
    } else {
      // For binary files like docx, we can't extract text easily
      // Return a placeholder with download info
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

async function updateCourseJson(courseJsonPath) {
  const course = JSON.parse(fs.readFileSync(courseJsonPath, "utf-8"));
  const folders = course.drive_folders || {};
  const courseTags = uniq([course.grade, course.semester, course.unit, course.domain]);

  const out = {
    workbook_photos: [],
    blackboard: [],
    photos: [],
    scripts_photos: [],
    songs: []
  };

  for (const [folderKey, outputKey] of Object.entries(FOLDER_TO_OUTPUT)) {
    const folderId = folders[folderKey];
    if (!folderId) continue;
    console.log(`[fetch-drive] Listing ${folderKey} (${folderId}) ...`);
    const files = await listFolderFiles(folderId);

    for (const f of files) {
      const mime = resolveShortcutMime(f) || "";
      const id = resolveId(f);
      const name = f.name || id;

      if (outputKey === "songs") {
        if (mime.startsWith("audio/") || mime === "application/vnd.google-apps.audio") {
          out.songs.push({ title: stripExt(name), id, mimeType: mime });
        }
      } else if (outputKey === "scripts_photos" || outputKey === "workbook_photos" || outputKey === "blackboard" || outputKey === "photos") {
        if (mime.startsWith("image/")) {
          const tags = uniq([...extractTagsFromName(name), ...courseTags]);
          out[outputKey].push({ id, name: stripExt(name), tags });
        }
      }
    }
  }

  // Fetch Google Docs content
  const googleDocs = course.google_docs || {};
  const docsOut = {};
  
  for (const [docKey, docId] of Object.entries(googleDocs)) {
    if (docId) {
      console.log(`[fetch-drive] Fetching Google Doc: ${docKey} (${docId}) ...`);
      const docContent = await fetchGoogleDoc(docId);
      docsOut[docKey] = docContent;
    } else {
      docsOut[docKey] = null;
    }
  }

  fs.writeFileSync(courseJsonPath + ".bak", fs.readFileSync(courseJsonPath));
  course.files = course.files || {};
  course.files.workbook_photos = out.workbook_photos;
  course.files.blackboard = out.blackboard;
  course.files.photos = out.photos;
  course.files.scripts_photos = out.scripts_photos;
  course.files.songs = out.songs;
  course.docs = docsOut;
  fs.writeFileSync(courseJsonPath, JSON.stringify(course, null, 2), "utf-8");
  console.log(`[fetch-drive] Updated ${path.basename(courseJsonPath)}`);
}

async function main() {
  const files = fs.readdirSync(path.join(ROOT, "src", "_data")).filter(n => n.startsWith("course_") && n.endsWith(".json") && n !== "course_template.json");
  if (files.length === 0) {
    console.error("[fetch-drive] No course_*.json found in src/_data");
    process.exit(1);
  }
  for (const name of files) {
    await updateCourseJson(path.join(ROOT, "src", "_data", name));
  }
}

main().catch(e => { console.error(e); process.exit(1); });
