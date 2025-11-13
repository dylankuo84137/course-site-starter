import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COURSES_DIR = path.join(ROOT, "src", "_data", "course-configs");
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(COURSES_DIR, "course_4a_journey-to-the-west_114_autumn.json");

const DRIVE_FOLDER_MAP = {
  workbook_photos: "workbook_photos",
  blackboard: "blackboard",
  photos: "photos",
  performance: "scripts_photos",
  scripts_and_performance: "scripts_photos",
  songs_audio: "songs_audio"
};

const FILE_KEY_MAP = {
  workbook_pdfs: "workbook_pdfs",
  play_scripts: "play_scripts",
  sheet_music: "sheet_music",
  workbook_photos: "workbook_photos",
  blackboard: "blackboard",
  photos: "photos",
  scripts_photos: "scripts_photos",
  songs: "songs_audio"
};

const DOC_TITLE_MAP = {
  course_description: "課程介紹",
  play_script: "劇本",
  story: "故事稿"
};

function ensureArray(value) {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function createFolderEntry(id, title = "") {
  return {
    type: "drive-folder",
    id,
    title,
    items: []
  };
}

function cloneItems(list = []) {
  return list.map(item => {
    if (typeof item === "string") {
      return { id: item };
    }
    return { ...item };
  });
}

function migrateDocs(course) {
  const docs = {};
  const existingDocs = course.docs && typeof course.docs === "object" ? course.docs : {};
  for (const [key, docData] of Object.entries(existingDocs)) {
    if (!docData) continue;
    docs[key] = {
      type: docData.type || "google-doc",
      id: docData.id || "",
      title: docData.title || DOC_TITLE_MAP[key] || key,
      content: docData.content ?? null,
      lastSynced: docData.lastSynced ?? null
    };
  }

  const googleDocs = course.google_docs && typeof course.google_docs === "object" ? course.google_docs : {};
  for (const [key, docId] of Object.entries(googleDocs)) {
    if (!docId || typeof docId !== "string" || !docId.trim()) continue;
    if (!docs[key]) {
      docs[key] = {
        type: "google-doc",
        id: docId.trim(),
        title: DOC_TITLE_MAP[key] || key,
        content: null,
        lastSynced: null
      };
    } else if (!docs[key].id) {
      docs[key].id = docId.trim();
    }
    if (!docs[key].type) {
      docs[key].type = "google-doc";
    }
  }
  return docs;
}

function migrateMaterial(course) {
  const material = {};

  const driveFolders = course.drive_folders && typeof course.drive_folders === "object" ? course.drive_folders : {};
  for (const [folderKey, folderData] of Object.entries(driveFolders)) {
    const targetKey = DRIVE_FOLDER_MAP[folderKey];
    if (!targetKey) continue;
    const entries = (material[targetKey] ||= []);
    const list = ensureArray(folderData);
    for (const entry of list) {
      if (!entry) continue;
      if (typeof entry === "string") {
        const trimmed = entry.trim();
        if (trimmed) entries.push(createFolderEntry(trimmed));
      } else if (typeof entry === "object" && entry.id) {
        entries.push(createFolderEntry(entry.id, entry.name || entry.title || ""));
      }
    }
  }

  const files = course.files && typeof course.files === "object" ? course.files : {};
  for (const [fileKey, fileList] of Object.entries(files)) {
    const targetKey = FILE_KEY_MAP[fileKey];
    if (!targetKey) continue;
    const clonedItems = cloneItems(fileList);
    if (!clonedItems.length) continue;
    (material[targetKey] ||= []).push({
      type: "manual",
      title: `手動素材：${targetKey}`,
      items: clonedItems
    });
  }

  const youtubeVideos = course.youtube_videos && typeof course.youtube_videos === "object" ? course.youtube_videos : {};
  for (const [videoKey, videoId] of Object.entries(youtubeVideos)) {
    if (!videoId || typeof videoId !== "string" || !videoId.trim()) continue;
    (material.videos ||= []).push({
      type: "youtube",
      id: videoId.trim(),
      title: videoKey.replace(/_/g, " "),
      items: []
    });
  }

  return material;
}

function migrateCourse(course) {
  const newCourse = {
    slug: course.slug || "",
    hero_image: course.hero_image || "",
    metadata: course.metadata && typeof course.metadata === "object" ? { ...course.metadata } : {},
    i18n: course.i18n && typeof course.i18n === "object" ? course.i18n : {},
    material: course.material && typeof course.material === "object" ? course.material : {},
    docs: {}
  };

  if (!newCourse.material || Object.keys(newCourse.material).length === 0) {
    newCourse.material = migrateMaterial(course);
  }

  newCourse.docs = migrateDocs(course);

  if (Array.isArray(course.tags) && course.tags.length > 0) {
    const existingTags = Array.isArray(newCourse.metadata.tags) ? newCourse.metadata.tags : [];
    const merged = Array.from(new Set([...existingTags, ...course.tags]));
    if (merged.length > 0) {
      newCourse.metadata.tags = merged;
    }
  }

  return newCourse;
}

function main() {
  if (!fs.existsSync(TARGET)) {
    console.error(`[migrate-material-schema] File not found: ${TARGET}`);
    process.exit(1);
  }

  const original = fs.readFileSync(TARGET, "utf-8");
  const course = JSON.parse(original);
  const migrated = migrateCourse(course);

  const allowedRootKeys = new Set(["slug", "hero_image", "metadata", "i18n", "material", "docs"]);
  for (const key of Object.keys(migrated)) {
    if (!allowedRootKeys.has(key) && !key.startsWith("_comment")) {
      delete migrated[key];
    }
  }

  fs.writeFileSync(TARGET, JSON.stringify(migrated, null, 2) + "\n", "utf-8");
  console.log(`[migrate-material-schema] Migrated ${path.basename(TARGET)}`);
}

main();
