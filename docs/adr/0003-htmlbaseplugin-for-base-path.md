---
status: accepted (planned)
---

# Handle the GitHub Pages subpath with HtmlBasePlugin, keep `| url` as the authoring idiom

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
