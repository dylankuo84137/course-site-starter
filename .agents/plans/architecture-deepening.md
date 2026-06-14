# Architecture deepening backlog

Deepening opportunities surfaced by an `improve-codebase-architecture` review on 2026-06-13,
informed by `CONTEXT.md` and `docs/adr/0001`. Not yet issues — this is the grilling worktable.
Each candidate is refined in a grilling session; when its design settles, promote that one (and
only that one) to a tracker issue via `/to-issues`.

Vocabulary: **module / interface / implementation / depth / deep / shallow / seam / adapter /
leverage / locality**. Domain terms from `CONTEXT.md`.

Status legend: `draft — pending grill` → `grilled — design settled` → `promoted to #<issue>`.

Reference report (ephemeral, `/tmp`): `architecture-review-20260613-165349.html`.

---

## A · Enforce the `cf()` seam — close the leaks, delete the dead twin

- **Strength:** Strong · **Type:** AFK · **Related:** —
- **Status:** `grilled — design settled` (2026-06-13)
- **Files:** `src/_includes/macros/i18n.njk` · `src/_data/courseHelpers.js` · `src/_data/tagHelpers.js`
  · `src/_includes/components/course-breadcrumb.njk` · `src/_data/coursesList.js` · `src/_data/course-validator.js`

**Problem (rescoped after grill).** The plan's premise was wrong. There is *one* 3-tier
resolver — `cf()`, 29 call sites — not two. `getI18nField()` is dead code (0 callers).
`tagHelpers` (tags are per-language, no fallback by design), `coursesList.js:18` (deliberate
zh-TW canonical read for grouping), and `course-validator.js` (must see raw per-locale values)
are **not** fallback duplications and must not be routed through a resolver. The genuine defect
is template leaks that bypass `cf()`: `course-breadcrumb.njk:37,55,240,266–269` and
`course_nav.njk:44` (visible `.title` only) — Do-not #8 violations.

**Solution (settled).** Three small moves, no new abstraction:
1. Delete dead `getI18nField()` from `courseHelpers.js`. Do **not** revive it as a "shared JS
   resolver" — no JS caller needs fallback today; that would be an abstraction for a single
   (template) consumer, against CLAUDE.md "Simplicity first".
2. Route the ~8 template leaks through the existing `cf()` macro. In `course_nav.njk:44` change
   only the visible option text; keep `data-course-switcher-i18n='{{ other.i18n | json }}'` raw
   (it intentionally ships the full i18n payload to the client switcher).
3. Fix `cf()`'s resolution semantics to **falsy-fallback**: empty string / falsy means "absent",
   fall back to zh-TW. (`getI18nField` had used `!== undefined`, which would keep `""` — divergent.
   Decision: empty is never a deliberate blank on a content site.) `cf()` already uses truthiness,
   so this is mostly locking the contract in a test rather than changing behavior.

**Wins.** Enforces Do-not #8 by construction · deletes dead code · one documented semantic for
every Course field · `cf()` becomes the single test surface for fallback. Net diff is small.

**Grill notes (2026-06-13).** Rescoped from "merge two resolvers behind a new seam" to
"enforce the existing seam." Q1: empty-string is absent → falsy-fallback (content site, no
deliberate-blank requirement). Validator/coursesList/tagHelpers explicitly excluded. ADR not
warranted (local code decisions, not architectural shape). Ready for `/to-issues`.

---

## B · One nav descriptor for the Course Pages

- **Strength:** Strong · **Type:** AFK · **Related:** C, D (same module)
- **Status:** `grilled — design settled` (2026-06-13)
- **Files:** `src/_data/materialHelpers.js` · `src/{zh-TW,en-US,courses}/index.njk`
  · `src/_includes/components/course-breadcrumb.njk` · `src/_includes/components/course_nav.njk`
  · `scripts/sync/fetch-drive.mjs` · `src/_data/course-validator.js`

**Problem (corrected after grill).** The plan's "7 places" inventory was wrong in both
directions. The validator (`course-validator.js`) has **no** category list — it validates entry
*shape* generically over `Object.entries(material)` and is category-agnostic by design; it stays
out. The sync's `MATERIAL_IMAGE/AUDIO/PDF_KEYS` group keys by **media class for extraction** — a
separate reason-to-change from navigation; it stays put. The genuine, larger duplication is in the
**templates**: ~11 hand-written `<option>` blocks in `course-breadcrumb.njk`, re-listed in
`course_nav.njk` and `courses/index.njk` (+ homepage cards), each carrying {visibility source,
route slug, i18n label key}. These rows are **not uniform**: route ≠ material key
(`scripts_photos`→`scripts`/`performance`; `sheet_music`→`sheet-music`); `hasPlayScript` is a
Doc+Material composite; `story` is Doc-only; some tabs have an `or currentPage==` fallback, some
don't.

**Solution (settled — scope (c)→(b)).** Introduce **one ordered nav descriptor** — a list of
**Course Page** specs, each row `{ route, labelKey, visible(course), currentPageFallback? }` where
`visible` may be Material-backed, Doc-backed, or composite. Render the breadcrumb/nav/card tabs by
**looping** over it, deleting the 11 duplicated `<option>` blocks and the repeated `set hasX`
declarations. Explicitly **excluded**: sync (keeps its media-class sets — extraction is a separate
concern) and the validator (category-agnostic). Lives as its own template-facing helper that
*composes* `materialHelpers` + `getDoc`; it is a **navigation** model, not a Material registry, so
it respects the Material↔Doc boundary by letting each row declare its source.

**Guardrail (naming).** Course Pages are realized as 11ty pages, so the term sits next to 11ty's
`page` runtime global in the exact files this touches (breadcrumb/nav/index all use `page.lang`).
The descriptor loop and rows must **never** bind `page`/`coursePage` as a local — shadowing the
11ty global is a silent-bug footgun. Loop var is `section`/`nav`. Carry this into the issue.

**Wins.** Deletes the real copy-paste (the per-tab option markup, not just `set hasX`) · adding a
section = one descriptor row + one label key · route/label/visibility for a section live together ·
honours single-reason-to-change by keeping sync's extraction taxonomy separate.

**ADR.** No conflict with ADR-0001 (that is about *classification* — Subject Domain / Teaching
Format — not sections). ADR for B itself: not warranted — it's a template consolidation, not a
hard-to-reverse architectural commitment.

**Glossary.** Candidate was mis-titled "Material taxonomy." The modelled concept is the
**Course Page** — landed in CONTEXT.md as a *page type / nav slot* (the 14 sub-page templates in
`src/courses/` are 11ty pages realized one-per-Course via pagination; the term names the type, not
the runtime `page`).

**Grill notes (2026-06-13).** Validator + sync excluded with reasons. Descriptor is navigation,
not Material. Term settled: **Course Page** (chose over Section/Tab — these literally *are* 11ty
pages, so Page is the honest term; risk is shadowing 11ty `page`, handled by the naming guardrail).
Ready for `/to-issues`.

---

## C · Test the (already-pure) sync transform; lift the cache side-effect

- **Strength:** Worth exploring · **Type:** AFK · **Related:** — (B dependency dissolved)
- **Status:** `grilled — design settled` (2026-06-13)
- **Files:** `scripts/sync/fetch-drive.mjs` (484 lines)

**Problem (corrected after grill).** The premise "the transform can only be exercised end-to-end
against live Drive" is half-wrong. The `payload → material` transform is **already pure and
extracted**: `mapFolderFile` / `shouldIncludeFile` / `createFileItem` / `resolveId` /
`extractTagsFromName` take `(materialKey, file, courseTags) → item` with no IO and are unit-testable
today. What's tangled is the *orchestration* (`syncMaterialEntry` / `syncMaterial` interleave
`listFolderFiles`, `fetchDriveMetadata`, `extractPdfText`) — and a side-effect the plan missed: the
material loop also **writes the PDF-text cache** (`fetch-drive.mjs:396–409`).

**Solution (settled — scope (2)).** Don't "carve out" a transform that's already carved. Instead:
1. Add unit tests for the pure mappers — classification (`shouldIncludeFile`) is the real
   bug-surface and needs no network to cover.
2. Lift the PDF-cache write out of the `syncMaterial` loop so the material transform stops doubling
   as a file-writer.
Explicitly **deferred**: full Drive-client dependency-injection (real client / in-memory fixture).
It's a genuine seam but gold-plating for a build-time script that runs occasionally — do it only
when a concrete orchestration bug motivates it (CLAUDE.md "no speculative features").

**B dependency dissolved.** C imported nothing from B once sync was excluded from B's scope; sync
keeps its own `MATERIAL_IMAGE/AUDIO/PDF_KEYS` (media-class for extraction).

**Wins.** Covers the classification logic cheaply · transform loop stops writing files · no
speculative DI abstraction.

**Grill notes (2026-06-13).** Pure mappers already a seam → reframed from "extract transform" to
"test it + lift the cache write". Full client-injection DI deferred until a real bug. Ready for
`/to-issues`.

---

## D · ~~Route the AI index through the Material module~~ — SUPERSEDED

- **Strength:** Worth exploring · **Type:** AFK · **Related:** B (same module)
- **Status:** `superseded — folded into the AI-discovery format PRD` (2026-06-14)
- **Files:** `src/ai-discovery/ai-index.njk` (path corrected) · `src/_data/materialHelpers.js`

**Problem (original).** `ai-index.njk` bypasses the mandated Material module and re-flattens
`course.material` by hand — a duplicate of `flattenItems` + enrichment, and a Do-not #2 violation.
The only leak past the Material seam.

**Why superseded.** Mid-grill the output format itself was redesigned: the AI-facing surface moves
from `ai-index.json` to a **Markdown `/llms.txt` index + per-resource markdown** (separate PRD, see
below). That rewrite *replaces* the hand-rolled Nunjucks flatten rather than patching it, so D no
longer stands as its own refactor. **The Do-not #2 principle is carried into the new PRD as a hard
constraint:** the markdown generator MUST consume `getMaterialItems`/`getMaterialGroups`, not
re-flatten `course.material` — otherwise the new surface just re-introduces the same leak.

**Disposition.** Do **not** promote D to its own issue. Track its concern inside the AI-discovery
format PRD's acceptance criteria.

**Grill notes (2026-06-14).** Decoupled. Consumer pinned = (C) LLM fetch tool / single URL.
Granularity = (ii) index + links reusing existing Course Pages. Format = **Markdown / `llms.txt`**
(over HTML: ~10x token, Lighthouse-audited convention as of 2026-05). The Material-seam fix lives on
as a constraint in the new PRD, not as a standalone item.

---

## E · Name and harden the DOM-attribute translation contract

- **Strength:** Worth exploring (upgraded from Speculative — a real, demonstrated defect, not a
  hunch) · **Type:** AFK for the contract work (the HITL module-split is excluded) · **Related:** —
- **Status:** `grilled — design settled` (2026-06-14)
- **Files:** `public/js/lang-dynamic.js` (441 lines) · `public/js/course-filters.js` ·
  `src/_includes/layouts/base.njk` (the sole global-injection site) · the 12 templates emitting
  `data-i18n*` attributes · a new `docs/development/` reference

**Scope settled — (乙) name + harden the external contract; module-split EXCLUDED.** The plan
bundled two things: (甲) split the deep module (text-replace / card-render / Pagefind re-init) and
(乙) name + harden the attribute contract. (甲) is HITL, FOUC-risky (Do-not #6 forbids `defer` on
this synchronous pre-paint script), and unmotivated by any concrete bug → cut as speculative
gold-plating. The demonstrated defect is **contract drift**, which a split would not fix; (乙) does.

**Problem (verified against code, 2026-06-14).** The translator's interface is an undocumented
contract — **7** `data-i18n*` attributes + **6** `window.__*` globals (all injected in one place,
`base.njk:40-44,190`) — and it has **already drifted in both directions**, silently (7+ swallow
paths, no console warning):
- `data-lang-only` — **read** by `lang-dynamic.js:285`, **emitted by zero templates**. Dead read.
- `data-i18n-select="course.course_materials"` (`course-breadcrumb.njk:109`) — **emitted, read by
  nobody**. Dead emit.
- `data-i18n-template="filters.showing_results"` (`courses/index.njk:28`) — **emitted but inert**:
  the `#resultsCount` element is actually translated by `course-filters.js:153` using a *hard-coded*
  key path + `getElementById`, ignoring the attribute. The attribute can silently de-sync from the
  real key.
- **Two translation engines** share `window.__I18N_DATA__`: `lang-dynamic.js` (attribute-driven) and
  `course-filters.js` (hard-coded key, bypasses the contract). This duplication is the drift's root.

(Plan's minor miscounts: 441 lines not 442; 8 concerns not 5 — but the split is cut anyway.)

**Wins.** Names a real boundary · the three orphans get resolved · drift surfaces instead of failing
silent · FOUC contract untouched (no `defer`, no restructure).

**Solution (settled).**
1. **Registry (the "name") + build-time validator (the "harden").** A single-source-of-truth
   registry lists the legal `data-i18n*` attributes (+ which script reads each, + the `window.__*`
   bootstrap globals). A validator — mirroring `course-validator.js`, run under `npm run validate` —
   enforces the **emit side**: every `data-i18n*` attribute a template emits must be in the registry
   → typos and dead emits fail the build. It does **not** reverse-enforce "every registry entry has
   an emitter" (so it needn't parse JS, and a documented read-only entry can stay). A thin
   `docs/development/` page is the human-readable companion to the registry.
2. **Orphan dispositions:**
   - `data-i18n-select` (`course-breadcrumb.njk:109`) — dead emit, **deleted**.
   - `data-lang-only` — dead read, **kept** in `lang-dynamic.js`, **registered as read-only / no
     current emitter** (CLAUDE.md "leave pre-existing dead code, mention it"; the registry is the
     mention; don't disturb the FOUC script).
   - `data-i18n-template` — **converged, not deleted (option B):** rewire `course-filters.js` to
     **read** `data-i18n-template` for its key instead of hard-coding `filters.showing_results`,
     then interpolate `{count}`. This kills the hard-coded-key duplication (the drift root) and
     promotes the attribute to a real registry member — semantics: "a template string with
     placeholders, translated + interpolated by JS" (distinct from `data-i18n`'s plain replacement).
3. **Two engines acknowledged, one contract.** Both `lang-dynamic.js` and `course-filters.js` are
   registered readers of the same contract; after (2) neither holds a hard-coded key off-contract.

**Module-split (甲) remains excluded.** No `defer`, no restructure of the synchronous pre-paint
script (Do-not #6 intact).

**Grill notes (2026-06-14).** Premises verified by code sweep. Scope cut to (乙). Mechanism =
registry + emit-side validator (over macro / runtime-warn / doc-only). Orphans: delete dead emit,
register-and-keep dead read, converge `data-i18n-template` (option B — kills the second-engine
hard-coded key). Name settled: **Translation Hook** (landed in CONTEXT.md, Localization section,
beside UI String / Course Field). Ready for `/to-issues`.
