---
status: rejected
---

# Handle the GitHub Pages subpath with HtmlBasePlugin, keep `| url` as the authoring idiom

> **Status: REJECTED (2026-06-15).** The plugin route was abandoned during triage of
> Issue #19 — see "Decision reversed" at the end of this file. The double-prefix fix in
> sitemap/feed/ai-index (a genuine bug, independent of the plugin) shipped in Issue #12 and
> stands. `| url` remains the single base-path idiom (Do-not #1). The body below is retained
> as the original record.

The site deploys to a subpath (`/course-site-starter/`), set via `pathPrefix` in
`.eleventy.js`. Until now the *only* mechanism applying that prefix was the explicit `| url`
filter, called by hand at every link and asset reference. `HtmlBasePlugin` was never
registered, so 11ty did **not** auto-rewrite output URLs.

That made base-path correctness a per-reference discipline with no safety net — and the net
was already torn: a hand-authored page (`src/en-US/ai-guide/index.md`) shipped 12 root-relative
paths that never went through `| url`, breaking links and assets on the production subpath. One
of them (`/reflections/`) was also a stale route the `/discussion/` rename missed — a separate
content bug the prefix mechanism cannot fix either way.

We register `HtmlBasePlugin` so every root-relative `href`/`src` in the rendered HTML is
prefixed automatically, eliminating the whole leak class at the source rather than relying on
authors to remember `| url`. We keep the existing `| url` calls rather than ripping them out:
the plugin is idempotent on already-prefixed URLs, and `| url` remains the correct, explicit
idiom for paths constructed in data files and non-HTML contexts the transform doesn't cover.

> **Implementation finding (2026-06-14, Issue #12):** The idempotency claim above is **incorrect
> for Eleventy 3.x**. `HtmlBasePlugin`'s HTML transformer calls the built-in `url` filter on
> every root-relative URL it finds in HTML output — including paths that were already prefixed by
> `| url` at template render time — producing double-prefixed URLs like
> `/course-site-starter/course-site-starter/…`. The plugin and `| url` are therefore **mutually
> exclusive** for HTML output: registering the plugin while keeping `| url` in HTML templates
> causes 883 double-prefixed URLs in a subpath build. The `| url` alternative in the ADR
> ("Drop `| url`, rely solely on the plugin") is the only compatible path forward; it requires a
> dedicated migration session to remove `| url` from HTML-context templates while retaining it in
> non-HTML emitters (sitemap, feed, ai-index). Plugin registration is deferred to that session.

Alternatives considered:

- **Hand-fix the one offending page** — surgical, but leaves the systemic gap: the next
  hand-authored page bypassing the templates re-introduces the bug.
- **Drop `| url`, rely solely on the plugin** — loses explicit intent in data/JS contexts and
  risks gaps where the HTML transform doesn't reach.

## Consequences

- `| url` and the plugin coexist; the implementing change must verify URLs are **not
  double-prefixed** (`/course-site-starter/course-site-starter/…`) across both the default and
  subpath builds.
- The base-path footgun moves from "every author must remember `| url`" to "the build handles
  it" — but the regression guard is retained: ADR-0002's output-assertion layer stays as a
  belt-and-suspenders check against any URL the transform misses.
- This is the fix landed by Issue A; the route-rename miss (`/reflections/` → `/discussion/`)
  is fixed in the same issue but is independent of the base-path mechanism.

## Decision reversed (2026-06-15, triage of Issue #19)

The remaining half of this ADR — migrate HTML templates off `| url` so the plugin can be
registered — was rejected. The reasoning (full record in
[`.out-of-scope/htmlbaseplugin-auto-base-path.md`](../../.out-of-scope/htmlbaseplugin-auto-base-path.md)):

- The plugin's only real benefit is auto-**fixing** a forgotten prefix, but that leak class
  is **already detected at build time** by `.claude/validate.sh` Layer 1a (greps
  `_site/**/*.html` for unprefixed `href`/`src` and fails the build; landed in #9 / #13).
  Net new value over today is just "build silently correct" instead of "build fails, author
  adds the prefix."
- Adopting the plugin would **invert Do-not #1** from one uniform rule into a split rule
  (bare `/path` in HTML, `| url` only in non-HTML emitters), and is **permanently fragile**:
  the plugin and `| url` are mutually exclusive in HTML (see the implementation finding
  above), so any future `| url` in an HTML template silently re-introduces the double-prefix.
- The migration touches 121 `| url` call sites across 18 templates to buy a guard we already
  have — contrary to *Simplicity first* / *Surgical changes*.

`HtmlBasePlugin` is therefore **not** registered. `| url` stays the single base-path idiom.
The double-prefix bug in the non-HTML emitters (sitemap/feed/ai-index) was a real defect and
was fixed independently in Issue #12.
