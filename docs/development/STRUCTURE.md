# Project Directory Structure

This document describes the current organized directory structure after restructuring for improved maintainability.

## Overview

The project follows a clean separation of concerns with organized subdirectories for different types of content and functionality.

## Directory Structure

```
Root Level:
├── CLAUDE.md                      # AI assistant guidelines (project-wide)
├── AGENTS.md                      # Agent workflow documentation (project-wide)
└── ... (other root files)

src/
├── _data/
│   ├── course-configs/             # Course JSON files (NEW)
│   │   ├── course_2a_nenggao_113_summer.json
│   │   ├── course_3a_sunshot_113_summer.json
│   │   └── course_template.json    # Template for new courses
│   ├── i18n/                       # Internationalization data
│   │   ├── zh-TW.json             # Traditional Chinese translations
│   │   └── en-US.json             # English translations
│   ├── coursesList.js              # Dynamic course list generator
│   ├── courseValidation.js         # Build-time validation (NEW)
│   ├── course-validator.js         # Validation logic (NEW)
│   ├── i18n.js                     # i18n utilities
│   ├── locale.js                   # Locale detection
│   └── site.json                   # Site metadata
├── _includes/
│   ├── components/                 # Reusable UI components
│   │   ├── course-breadcrumb.njk   # Course navigation (NEW)
│   │   ├── course_nav.njk          # Legacy navigation
│   │   ├── drive.njk               # Google Drive integration
│   │   └── lang_switcher.njk       # Language switching
│   ├── layouts/                    # Page layouts
│   │   └── base.njk               # Base layout template
│   └── macros/                     # Template utilities
│       ├── i18n.njk               # i18n helper macros
│       └── utility-filters.njk     # Utility filters (NEW)
├── courses/                        # Course page templates
├── zh-TW/                         # Traditional Chinese pages
├── en-US/                         # English pages
└── ... (other template files)

scripts/
├── sync/                           # Synchronization scripts
│   └── fetch-drive.mjs             # Google Drive sync script
├── migration/                      # Data migration scripts
│   └── migrate-material-schema.mjs # Schema migration tool
└── validation/                     # Validation scripts
    └── validate-courses.js         # Course validation script

public/                             # Static assets
├── css/
├── images/
└── js/
```

## Migration Notes

### Files Updated for New Structure
1. `src/_data/coursesList.js` - Updated to read from `course-configs/` subdirectory
2. `src/_data/course-validator.js` - Updated validation paths
3. `scripts/sync/fetch-drive.mjs` - Updated to work with `course-configs/` subdirectory
4. All course template files - Updated to use new navigation component

### Backward Compatibility
- All existing functionality preserved
- Course URLs and page structure unchanged
- Build process remains the same for end users

## Working with Course Data

### Adding New Courses
1. Copy `src/_data/course-configs/course_template.json`
2. Rename to `course_[identifier].json`
3. Update all required fields according to validation schema
4. Run `npm run validate` to ensure data integrity

### Validation Commands
```bash
npm run validate              # Validate all course data
npm run validate:watch        # Watch for changes and validate
npm run build                 # Includes automatic validation
```

### Google Drive Sync
```bash
npm run sync:drive           # Sync content from Google Drive
```

The sync script automatically works with the new course directory structure.

### Course JSON Quick Reference
- Place all course files inside `src/_data/course-configs/`.
- `material.*` holds arrays of resources. Supported `type` values:
  - `drive-folder`: stores a Google Drive folder ID. The sync script replaces `items` with the folder's files (each file includes `id`, `name`, `mimeType`, `tags`, preview/download URLs, etc.).
  - `drive-file`: tracks a single Drive asset such as PDFs or sheet music.
  - `manual`: use when you want to maintain `items` by hand (sync will not override).
  - `youtube`: list of `{ id, title }` entries for embedded videos.
- `docs.*` centralizes Google Docs IDs. Each entry should specify `{ type: "google-doc", id: "..." }`. The sync task fills `content`, `downloadUrl`, and `lastSynced`.
- Legacy keys (`drive_folders`, `google_docs`, `files.*`, `youtube_videos`, root-level `tags`) are now **blocked** by `npm run validate`.

### Template Helpers for Material / Docs
`src/_data/materialHelpers.js` exposes common helpers across Nunjucks templates:

- `materialHelpers.getMaterialItems(course, key, options?)`  
  Flattens `material[key]` into a list of ready-to-render items. Supports `options.onlyPdf` and custom filters.
- `materialHelpers.hasMaterial(course, key, options?)`  
  Boolean convenience wrapper used to toggle UI pills/sections.
- `materialHelpers.getDoc(course, key)`  
  Returns a doc entry (with `content`, `downloadUrl`, `lastSynced`) or `null`. Use this instead of referencing `course.docs` directly.

Always prefer these helpers over manual traversal so templates stay consistent with future schema tweaks.

### Verification Checklist
Before opening a PR or merging:

1. `GOOGLE_API_KEY=... npm run sync:drive`
2. `npm run validate`
3. `npm run build`
4. Spot check `/courses/<slug>/` and key material pages (workbook/photos/songs/videos)

## Benefits of New Structure

1. **Maintainability**: Clear organization makes code easier to maintain
2. **Scalability**: Easy to add new courses and components
3. **Validation**: Built-in data integrity checks
4. **Consistency**: Standardized patterns across all course data
5. **Development Experience**: Better tooling and error detection

## Future Enhancements

The new structure supports future improvements:
- Environment-specific configuration (`env.js`)
- Enhanced search interface components
- Additional validation rules
- Automated course generation tools
- Multi-tenant course management

This structure follows best practices for static site generation and provides a solid foundation for continued development.
