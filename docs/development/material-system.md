# Material System

Course materials and docs are accessed through helper functions — never directly via
`course.material` or `course.docs`.

## Data Structure

Materials live under `course.material` (media assets) and `course.docs` (text documents):

```json
{
  "material": {
    "workbook_photos": [
      { "type": "drive-folder", "id": "folder-id", "items": [] }
    ],
    "songs": [
      { "type": "drive-folder", "id": "folder-id", "items": [] }
    ]
  },
  "docs": {
    "syllabus": {
      "type": "google-doc",
      "id": "doc-id",
      "content": "",
      "downloadUrl": "",
      "lastSynced": ""
    }
  }
}
```

## Material Types

| Type | Description |
|------|-------------|
| `drive-folder` | Google Drive folder — items populated by `fetch-drive.mjs` sync |
| `drive-file` | Single Google Drive file |
| `manual` | Manually specified file/link |
| `youtube` | YouTube video (id field holds video ID) |
| `google-doc` | Google Doc — content synced via `fetch-drive.mjs` into `docs.*` entries |

## Accessing Materials in Templates

Use `materialHelpers` (available as a global in all templates):

```nunjucks
{# Check if a material section exists before rendering #}
{% if materialHelpers.hasMaterial(course, 'songs') %}
  {# ... render songs ... #}
{% endif %}

{# Get items from a material section #}
{% set items = materialHelpers.getMaterialItems(course, 'workbook_photos') %}

{# Get a doc #}
{% set syllabus = materialHelpers.getDoc(course, 'syllabus') %}
```

Never access `course.material.songs` or `course.docs.syllabus` directly — the helpers
handle missing sections, type normalization, and schema changes.

## Legacy Keys (Blocked)

The validator rejects these keys — do not use them:
- `drive_folders` → use `material.workbook_photos` etc.
- `google_docs` → use `docs`
- `files.*` → use `material`
- `youtube_videos` → use `material` with type `youtube`
- Root-level `tags` → use `metadata.tags`

## Sync Script

`scripts/sync/fetch-drive.mjs` populates `items[]` arrays in `material` sections.
It only mutates the JSON data files — never templates. Requires `GOOGLE_API_KEY` env var.
Handles Drive shortcuts by resolving the target ID automatically.

Run: `npm run sync:drive`
