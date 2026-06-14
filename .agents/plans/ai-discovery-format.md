# PRD draft · AI-discovery format — from `ai-index.json` to `llms.txt`

Status: **design settled** (2026-06-14) — ready to promote to a tracker issue via `/to-issues`.
Origin: split out of architecture-deepening candidate **D** mid-grill; D is now superseded by this.
Decision record: **ADR-0004** (`docs/adr/0004-ai-discovery-as-llms-txt-markdown.md`) — the
directional JSON→`llms.txt` commitment and its rejected alternatives.

## Why

The current AI-facing surface is `/ai-index.json` (schemaVersion "2") — a JSON dump assembled in
`src/ai-discovery/ai-index.njk`, which also re-flattens `course.material` by hand (Do-not #2 leak).
We are redesigning the **format** of the AI-facing surface, not just patching the leak.

## Settled decisions (grilled)

1. **Consumer model = (C)** — an LLM carrying a web/fetch tool, hitting a *single URL*. (Not the
   "human uploads a file to a chat" model, not autonomous schema.org crawling.)
2. **Granularity = (ii)** — an index + links, reusing the existing Course Pages, rather than one
   monolithic dump only.
3. **Format = Markdown / `llms.txt` convention** — over HTML. Rationale: matches consumer (C)+(ii);
   Markdown is ~10x more token-efficient than HTML for LLM ingestion; `/llms.txt` is an established
   2026 convention and is audited by Chrome Lighthouse's "Agentic Browsing" category (since
   2026-05). HTML's only edge (browser dual-use) is already covered by the existing HTML Course
   Pages.
4. **Delivery = (a) dual-file** —
   - `/llms.txt` — a *Markdown index*: each Course (title/summary) + links.
   - `/llms-full.txt` — *full inline* Markdown payload for "I want it all in one fetch".
   - Per-page `.md` variants (`/courses/{slug}/syllabus.md` …) are **deferred** — a future scaling
     step, triggered when `llms-full.txt` grows too big to fetch in one shot. Building them now
     would violate CLAUDE.md "no speculative features".
5. **Content depth = (i) inline everything, including `pdfText`** — `llms-full.txt` inlines Doc
   prose *and* the extracted full text of Material PDFs (`pdfText`). This makes `llms-full.txt` a
   strict Markdown **superset** of today's `ai-index.json`.
   - Consequence: `ai-index.json` can be genuinely **retired** (not kept for a distinct use case),
     since `llms-full.txt` carries everything it did. _(to confirm)_
   - Consequence: `llms-full.txt` size grows linearly with scanned PDFs; the (b) per-page split
     trigger moves *earlier*. Record the trigger condition in "Future scaling".
6. **Material seam is a hard constraint (inherited from D / Do-not #2).** Both generators MUST
   consume `materialHelpers` (`getMaterialItems` / `getMaterialGroups` / `flattenItems`), never
   re-flatten `course.material` by hand. Closing this leak is an acceptance criterion, not a nicety.
7. **Bilingual = per-language, mirroring site routing.** Four outputs via 11ty pagination over
   `['zh-TW','en-US']`:
   - `/llms.txt` + `/llms-full.txt` (zh-TW, canonical/default, at the project root)
   - `/en-US/llms.txt` + `/en-US/llms-full.txt`
   Each file is **monolingual** (no `---zh-TW---` interleaving) — an LLM fetch tool serves a single
   language context and gets clean single-language content. Field text resolved per-language through
   `cf()`.
8. **Index links point to the human HTML Course Pages.** `/llms.txt` lists each Course with links
   to its Course Pages (`/courses/{slug}/{type}/`), and carries a top-of-file one-liner advertising
   the `llms-full.txt` sibling for whole-corpus fetch. Rationale: the index's job is *discovery* —
   give the agent stable, citable, user-openable canonical URLs, and "one link = one page" precision
   (following a link fetches just that page). Anchors into `llms-full.txt` were rejected: `#`
   fragments don't reduce transfer on a plain-text file, so an anchor forces the agent to pull the
   entire `llms-full.txt` anyway — a fake subdivision. The whole-corpus path is served by the
   `llms-full.txt` sibling instead. **Smooth upgrade:** when per-page `.md` (deferred) ships, these
   links flip in place from `/syllabus/` to `/syllabus.md` with no structural change.

## Constraints (recorded, not decisions)

- **Subpath, not domain root.** This is a GitHub Pages *project* site at
  `…github.io/course-site-starter/`; it can only publish under that subpath, so the canonical path
  is `/course-site-starter/llms.txt`, not the true domain root the `llms.txt` convention /
  Lighthouse audit expect. The true root belongs to a user-site repo this project doesn't own.
  Consequence: a root-targeted Lighthouse audit will miss, but any agent handed the project URL
  works fine. Satisfying the literal convention would require a custom domain (infra, out of scope).
  All internal links use the base-path `| url` filter (Do-not #1).

9. **`ai-index.json` is removed in the same PR.** `llms-full.txt` is a strict superset, so the JSON
   surface is deleted, not kept-deprecated: delete `src/ai-discovery/ai-index.njk` and repoint the
   docs. Bonus: deleting the `.njk` **eliminates the D / Do-not #2 hand-rolled flatten for free** —
   no need to rewrite it through `materialHelpers` just to keep a redundant surface. (Premise: no
   known external system programmatically consumes `ai-index.json`; the only known consumer is the
   teacher NotebookLM-upload flow, which `llms-full.txt` serves. If an external JSON consumer later
   surfaces, that's a new request, not a reason to delay.)

10. **Explainer pages.**
    - `/ai-guide/` (teacher-facing) — **kept, repointed**: change its instruction from "give
      `ai-index.json` to ChatGPT/Claude/Gemini/NotebookLM" to "give `llms-full.txt` (URL)". It
      serves a human audience `llms.txt` can't replace.
    - `/for-ai/` (machine-facing HTML "Guide for AI Tools") — **removed**: its role is taken by
      `llms.txt` (a fetch tool reads `llms.txt` directly, no HTML pre-guide needed). Fold its
      essentials ("what's here; `llms-full.txt` is the full corpus") into the `llms.txt` top-of-file
      preamble. Avoids maintaining two overlapping explainer surfaces (it overlapped `/ai-guide/`).

## Acceptance criteria

- [ ] `/llms.txt` + `/en-US/llms.txt` and `/llms-full.txt` + `/en-US/llms-full.txt` generated at
      build time (11ty pagination over `['zh-TW','en-US']`), all valid Markdown, all monolingual.
- [ ] Both generators consume `materialHelpers`; **no hand-rolled `course.material` flatten remains**
      (closes D / Do-not #2).
- [ ] `llms.txt` = per-Course summary + links to HTML Course Pages (`/courses/{slug}/{type}/`) +
      a top-of-file preamble pointing at `llms-full.txt` (absorbs the removed `/for-ai/`).
- [ ] `llms-full.txt` inlines Doc prose + Material catalog + `pdfText` (strict superset of the old
      `ai-index.json`).
- [ ] Course Field text resolved through the `cf()` fallback chain (Do-not #8); all internal links
      use the base-path `| url` filter (Do-not #1).
- [ ] `src/ai-discovery/ai-index.njk` deleted; `/ai-index.json` no longer emitted.
- [ ] `/for-ai/` removed; `/ai-guide/` repointed from `ai-index.json` to `llms-full.txt`.

## Deferred / future scaling

- **Per-page `.md` variants** (`/courses/{slug}/{type}.md`) — build only when `llms-full.txt` grows
  too big to fetch in one shot (trigger arrives *earlier* now that `pdfText` is inlined). When it
  ships, `llms.txt` links flip in place from `/{type}/` to `/{type}.md` — no structural change.
- **Custom domain** — the only way to satisfy the literal domain-root `/llms.txt` convention /
  Lighthouse audit; out of scope (infra).
