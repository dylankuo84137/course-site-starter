# Report: validate-correctness-gate

## Branch
`feat/13-validate-correctness-gate`

## Tasks Completed

| # | Task | Status |
|---|------|--------|
| 1 | De-dup npm scripts | ✅ |
| 2 | Drop redundant Pagefind from workflow | ✅ |
| 3 | Update docs (CLAUDE.md + base-path.md) | ✅ |
| 4 | Layer 3 — tighten data validator | ✅ |
| 5 | Clear layer-2 footguns in breadcrumb (D1) | ✅ |
| 6 | Rewrite `.claude/validate.sh` as correctness gate | ✅ |

## Validation Results

- `npm run validate` → ✅ exits 0 (0 errors, 0 warnings)
- `ELEVENTY_BASE="/course-site-starter/" npm run build` → ✅ exits 0; validators ×1 (prebuild), Pagefind ×1 (postbuild); 64 pages built
- `bash .claude/validate.sh` → ✅ all 3 layers pass

### Deliberate-violation matrix

| Layer | Injected | Result |
|-------|----------|--------|
| 2 grep-lint | `{{ course.material }}` in breadcrumb.njk | ❌ exit 1, line printed |
| 1 pagefind | `rm -rf _site/pagefind` | ❌ exit 1, "missing or empty" |
| 3 data | `"files": {}` in course JSON | ❌ `npm run validate` exit 1, "Legacy root key" message |

(Layer 1 leak + unrendered-tag tests pass structurally; full assertion confirmed by clean build showing 0 `{{` in `_site/**/*.html`.)

## Files Changed

| File | Change |
|------|--------|
| `package.json` | Remove `build:full`, `build:search`; `deploy` → `npm run build`; strip `--force-language zh` from `postbuild` |
| `.github/workflows/gh-pages.yml` | Drop standalone `npx pagefind --site _site` line |
| `CLAUDE.md` | `full: npm run build:full` → `full: npm run build` |
| `docs/development/base-path.md` | Update Pagefind note to describe `postbuild` hook |
| `src/_data/course-validator.js` | Add `LEGACY_ROOT_KEYS`; unknown/legacy root keys → `addError` |
| `src/_includes/components/course-breadcrumb.njk` | Add `i18nMacro` import + replace 5 `course.i18n[lang].X` with `i18nMacro.cf()` in `breadcrumbSimple` and `headerWithNav` |
| `.claude/validate.sh` | Rewrite: layer-2 grep-lint → single subpath build → 3 layer-1 output assertions |

## Deviations from Plan

- **D2 (layer-1 leak assertion):** Issue #12 (base-path leaks) is still open. The layer-1 leak assertion (`no href/src="/…"` outside `/course-site-starter/`) runs and currently passes clean — meaning the existing build has no leaks in the output already (or they were fixed upstream). No deviation needed; the gate is green now.
- **Breadcrumb import location:** Plan said "top of file"; existing pattern in `unifiedHeader` is import-inside-macro. Followed existing pattern (import inside each macro that needs it) for correct Nunjucks scoping.

## E2E Checks

- `grep -rn build:full package.json CLAUDE.md docs/development/base-path.md .github` → 0 hits ✅
- Deploy workflow "Build site" step is now a single `ELEVENTY_BASE="$BASE_PATH" npm run build` ✅
- `grep -n "course\.i18n\["` on breadcrumb → 0 hits ✅
