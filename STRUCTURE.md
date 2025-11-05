# Project Directory Structure

This document describes the current organized directory structure after restructuring for improved maintainability.

## Overview

The project follows a clean separation of concerns with organized subdirectories for different types of content and functionality.

## Directory Structure

```
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
├── fetch-drive.mjs                 # Google Drive sync script
└── validate-courses.js             # Course validation script (NEW)

public/                             # Static assets
├── css/
├── images/
└── js/
```

## Migration Notes

### Files Updated for New Structure
1. `src/_data/coursesList.js` - Updated to read from `course-configs/` subdirectory
2. `src/_data/course-validator.js` - Updated validation paths
3. `scripts/fetch-drive.mjs` - Updated to work with `course-configs/` subdirectory
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