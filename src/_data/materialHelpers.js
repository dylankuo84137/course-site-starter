function getMaterialEntries(course, key) {
  if (!course || !course.material || typeof course.material !== "object") {
    return [];
  }
  const entries = course.material[key];
  return Array.isArray(entries) ? entries : [];
}

function enrichItem(entry) {
  const enriched = { ...entry };
  if (!enriched.sourceType && entry.type) {
    enriched.sourceType = entry.type;
  }
  if (!enriched.sourceTitle && entry.title) {
    enriched.sourceTitle = entry.title;
  }
  if (!enriched.mimeType && (entry.type === "pdf" || entry.type === "drive-file")) {
    enriched.mimeType = "application/pdf";
  }
  if (
    entry.type === "pdf" ||
    entry.type === "drive-file" ||
    (enriched.mimeType && enriched.mimeType.toLowerCase().includes("pdf"))
  ) {
    enriched.isPdf = true;
  }
  return enriched;
}

function flattenItems(entries = []) {
  const items = [];
  for (const entry of entries) {
    if (!entry || typeof entry !== "object") continue;
    const entryItems = Array.isArray(entry.items) ? entry.items : [];
    if (entryItems.length > 0) {
      for (const item of entryItems) {
        if (!item || typeof item !== "object") continue;
        const enriched = enrichItem({
          ...item,
          sourceType: item.sourceType || entry.type,
          sourceTitle: item.sourceTitle || entry.title
        });
        items.push(enriched);
      }
      continue;
    }

    if (
      entry.type === "youtube" ||
      entry.type === "manual" ||
      entry.type === "pdf" ||
      entry.type === "drive-file"
    ) {
      items.push(enrichItem(entry));
    }
  }
  return items;
}

function isPdfItem(item = {}) {
  if (item.isPdf) return true;
  if (typeof item.mimeType === "string" && item.mimeType.toLowerCase().includes("pdf")) {
    return true;
  }
  return item.type === "pdf" || item.type === "drive-file";
}

function filterByOptions(items, options = {}) {
  let result = [...items];

  if (options.onlyPdf === true) {
    result = result.filter(isPdfItem);
  } else if (options.onlyPdf === false) {
    result = result.filter(item => !isPdfItem(item));
  }

  if (typeof options.filter === "function") {
    result = result.filter(options.filter);
  }

  return result;
}

function getMaterialItems(course, key, options = {}) {
  const entries = getMaterialEntries(course, key);
  const flattened = flattenItems(entries);
  return filterByOptions(flattened, options);
}

function hasMaterial(course, key, options = {}) {
  return getMaterialItems(course, key, options).length > 0;
}

function splitEntryItems(entry = {}) {
  const directItems = [];
  const nestedFolders = [];
  const rawItems = Array.isArray(entry.items) ? entry.items : [];
  for (const item of rawItems) {
    if (item && Array.isArray(item.items) && item.items.length > 0) {
      nestedFolders.push(item);
    } else if (item) {
      directItems.push(item);
    }
  }
  return { directItems, nestedFolders };
}

function normalizeFolder(entry, options = {}) {
  const { directItems, nestedFolders } = splitEntryItems(entry);
  const directWrapper = { ...entry, items: directItems };
  const normalizedSubfolders = nestedFolders
    .map(folder => ({
      ...folder,
      items: filterByOptions(flattenItems([folder]), options)
    }))
    .filter(folder => Array.isArray(folder.items) && folder.items.length > 0);

  const normalizedItems = filterByOptions(flattenItems([directWrapper]), options);

  return {
    ...entry,
    items: normalizedItems,
    subfolders: normalizedSubfolders
  };
}

function getMaterialGroups(course, key, options = {}) {
  const entries = getMaterialEntries(course, key);
  return entries
    .map(entry => normalizeFolder(entry, options))
    .filter(group => {
      const hasItems = Array.isArray(group.items) && group.items.length > 0;
      const hasSubfolders = Array.isArray(group.subfolders) && group.subfolders.length > 0;
      return hasItems || hasSubfolders;
    });
}

function getDoc(course, key) {
  if (!course || !course.docs || typeof course.docs !== "object") {
    return null;
  }
  const doc = course.docs[key];
  if (!doc || typeof doc !== "object") {
    return null;
  }
  return doc;
}

function normalizeVideos(course) {
  const videos = getMaterialItems(course, "videos");
  return videos.map((video = {}, idx) => {
    const mimeType = video.mimeType || "";
    const sourceType = video.sourceType || video.type || "";
    const baseTitle = video.title || video.name || `Video ${idx + 1}`;
    const normalized = {
      ...video,
      title: baseTitle,
      mimeType
    };

    let isYouTube = sourceType === "youtube";
    if (!isYouTube && typeof video.id === "string" && video.id.length === 11 && !mimeType) {
      isYouTube = true;
    }

    if (isYouTube && video.id) {
      normalized.kind = "youtube";
      normalized.youtubeId = video.id;
      normalized.embedUrl = `https://www.youtube.com/embed/${video.id}?rel=0&vq=hd720`;
      normalized.thumbnail = `https://img.youtube.com/vi/${video.id}/hqdefault.jpg`;
      normalized.downloadUrl = null;
    } else {
      const fileId = video.id;
      const previewUrl = video.previewUrl || (fileId ? `https://drive.google.com/file/d/${fileId}/preview` : "");
      const downloadUrl = video.downloadUrl || (fileId ? `https://drive.google.com/file/d/${fileId}/view` : "");
      normalized.kind = "drive";
      normalized.driveId = fileId;
      normalized.embedUrl = previewUrl;
      normalized.thumbnail = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w600` : "";
      normalized.downloadUrl = downloadUrl;
    }

    if (mimeType === "video/quicktime") {
      normalized.noteType = "mov";
    } else if (normalized.kind === "drive") {
      normalized.noteType = "drive";
    } else {
      normalized.noteType = "";
    }

    return normalized;
  });
}

module.exports = {
  getMaterialItems,
  hasMaterial,
  getDoc,
  getMaterialEntries,
  getMaterialGroups,
  normalizeVideos
};
