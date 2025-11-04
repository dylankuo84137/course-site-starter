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
  performance: "scripts_photos",
  songs_audio: "songs",
};

async function fetchGoogleDoc(docId) {
  if (!docId) return null;

  try {
    // First check file metadata to determine type
    // Add supportsAllDrives for Shared Drive support
    const metaUrl = `https://www.googleapis.com/drive/v3/files/${docId}?key=${API_KEY}&fields=id,name,mimeType&supportsAllDrives=true`;
    const metaRes = await fetch(metaUrl);
    if (!metaRes.ok) {
      console.warn(`[fetch-drive] Failed to get metadata for doc ${docId}: ${metaRes.status} ${metaRes.statusText}`);
      return null;
    }
    const metadata = await metaRes.json();

    let contentUrl;
    let isGoogleDoc = false;

    if (metadata.mimeType === 'application/vnd.google-apps.document') {
      // Native Google Doc - use export API with Shared Drive support
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}/export?mimeType=text/plain&key=${API_KEY}&supportsAllDrives=true`;
      isGoogleDoc = true;
    } else {
      // Other file types (docx, pdf, etc.) - download directly with Shared Drive support
      contentUrl = `https://www.googleapis.com/drive/v3/files/${docId}?alt=media&key=${API_KEY}&supportsAllDrives=true`;
    }

    const res = await fetch(contentUrl);
    if (!res.ok) {
      // If export fails with 403 (common for Shared Drive docs), try alternative method
      if (res.status === 403 && isGoogleDoc) {
        console.warn(`[fetch-drive] Export forbidden for ${docId}, trying alternative download method...`);
        // Try using the download endpoint instead
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
    if (isGoogleDoc || metadata.mimeType.startsWith('text/')) {
      content = await res.text();
    } else if (metadata.mimeType === 'application/pdf') {
      // For PDFs, just provide download info
      content = `文件類型: ${metadata.name}\n檔案格式: PDF\n\n請使用下方的 PDF 檢視器或下載檢視。\n下載連結: https://drive.google.com/file/d/${docId}/view`;
      console.log(`[fetch-drive] PDF document ${metadata.name}`);
    } else {
      // For other binary files like docx, we can't extract text easily
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
    workbook_pdfs: [],
    blackboard: [],
    photos: [],
    scripts_photos: [],
    songs: []
  };

  for (const [folderKey, outputKey] of Object.entries(FOLDER_TO_OUTPUT)) {
    const folderId = folders[folderKey];
    if (!folderId) continue;
    console.log(`[fetch-drive] Listing ${folderKey} (${folderId}) ...`);

    // Check if this is actually a file instead of a folder
    let files = [];
    try {
      // First try to get metadata to see if it's a file (with Shared Drive support)
      const metaUrl = `https://www.googleapis.com/drive/v3/files/${folderId}?key=${API_KEY}&fields=id,name,mimeType&supportsAllDrives=true`;
      const metaRes = await fetch(metaUrl);
      if (metaRes.ok) {
        const metadata = await metaRes.json();
        if (metadata.mimeType === "application/pdf" && folderKey === "workbook_photos") {
          // Handle PDF file directly
          console.log(`[fetch-drive] Found PDF file instead of folder: ${metadata.name}`);
          files = [{ id: metadata.id, name: metadata.name, mimeType: metadata.mimeType }];
        } else if (metadata.mimeType === "application/vnd.google-apps.folder") {
          // It's a folder, proceed normally
          files = await listFolderFiles(folderId);
        } else {
          // It's some other type of file
          files = [{ id: metadata.id, name: metadata.name, mimeType: metadata.mimeType }];
        }
      } else {
        // If metadata fetch fails, try as folder
        files = await listFolderFiles(folderId);
      }
    } catch (err) {
      console.warn(`[fetch-drive] Error checking ${folderKey}: ${err.message}`);
      // Fallback to treating as folder
      try {
        files = await listFolderFiles(folderId);
      } catch (folderErr) {
        console.warn(`[fetch-drive] Failed to list folder ${folderKey}: ${folderErr.message}`);
        continue;
      }
    }

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
        } else if (outputKey === "workbook_photos" && mime === "application/pdf") {
          const tags = uniq([...extractTagsFromName(name), ...courseTags]);

          // Add PDF to workbook_pdfs for embedded viewer
          out.workbook_pdfs.push({
            id,
            name: stripExt(name),
            tags,
            mimeType: mime,
            isPdf: true,
            viewerUrl: `https://drive.google.com/file/d/${id}/preview`,
            downloadUrl: `https://drive.google.com/file/d/${id}/view`
          });

          console.log(`[fetch-drive] Added PDF: ${name}`);
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

  // Backup clean JSON before syncing (for manual restore before git commit)
  fs.writeFileSync(courseJsonPath + ".bak", fs.readFileSync(courseJsonPath));
  console.log(`[fetch-drive] Backed up clean ${path.basename(courseJsonPath)} → .bak`);

  // Add synced Drive content, preserving manually-added static content
  course.files = course.files || {};

  // For arrays, keep manually-added items that aren't objects with 'id' field
  // (e.g., keep plain string IDs like "1KmhiSfHtnn8H1hF96gE-vaKTZuPbL3-Q")
  const preserveManualItems = (existing, synced) => {
    const existingManual = (existing || []).filter(item =>
      typeof item === 'string' || (typeof item === 'object' && !item.id)
    );
    return [...existingManual, ...synced];
  };

  course.files.workbook_photos = out.workbook_photos;
  course.files.workbook_pdfs = preserveManualItems(course.files.workbook_pdfs, out.workbook_pdfs);
  course.files.blackboard = out.blackboard;
  course.files.photos = out.photos;
  course.files.scripts_photos = out.scripts_photos;
  course.files.songs = out.songs;
  course.docs = docsOut;

  // Write synced data to original JSON (for local testing)
  fs.writeFileSync(courseJsonPath, JSON.stringify(course, null, 2), "utf-8");
  console.log(`[fetch-drive] Updated ${path.basename(courseJsonPath)} with Drive content`);
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
