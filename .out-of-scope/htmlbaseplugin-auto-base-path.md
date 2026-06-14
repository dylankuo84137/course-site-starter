# Auto base-path via HtmlBasePlugin (replacing `| url`)

This project does **not** register Eleventy's `HtmlBasePlugin` to auto-prefix the
GitHub Pages subpath, and it does **not** migrate HTML templates away from the
`| url` filter. The single authoring rule stays: **always write `{{ '/path' | url }}`**
(Do-not #1).

## What was proposed

Register `HtmlBasePlugin` so 11ty rewrites every root-relative `href`/`src` in the
rendered HTML at build time. Because the plugin and `| url` are **mutually exclusive**
for HTML output in Eleventy 3.x (the plugin re-applies the `url` filter to paths that
`| url` already prefixed, producing `/course-site-starter/course-site-starter/…` —
883 occurrences in a subpath build, see ADR-0003's implementation finding), adopting
the plugin requires first stripping `| url` from every HTML-context path (121 calls
across 18 templates) and keeping it only in non-HTML emitters.

## Why this is out of scope

The plugin's only real benefit is auto-*fixing* a forgotten prefix. But that leak class
is **already caught at build time** by the validation gate: `.claude/validate.sh`
Layer 1a greps `_site/**/*.html` for `href`/`src` paths that aren't prefixed with
`/course-site-starter/` and fails the build (landed in #9 / #13). So the net new value
over today is small — it converts "build fails, author adds the prefix" into "build is
silently correct."

That small gain is not worth its costs:

- **It inverts a core convention.** Do-not #1 is *one* uniform rule. The plugin forces a
  **split** rule — bare `/path` in HTML templates, but `| url` (or `{{ site.url }}/path`)
  in sitemap/feed/ai-index/JS/JSON. Authors would have to know which context they're in.
- **It is permanently fragile.** Because the plugin and `| url` are mutually exclusive in
  HTML, any future `| url` that slips into an HTML template silently re-introduces the
  double-prefix bug. The footgun is removed in one place and re-added in another.
- **It is a large, low-payoff migration.** 121 call sites across 18 files, to buy a guard
  we already have.

This conflicts with the project's "Simplicity first" and "Surgical changes" conventions.
A single `| url` idiom plus a build-time detection gate is simpler and equally safe.

```
# The guard that already covers the motivating leak (.claude/validate.sh, Layer 1a):
leaks=$(grep -rEno '(href|src)="/[^"]*"' _site --include='*.html' \
  | grep -vE '="(//|/course-site-starter/)' || true)
[ -n "$leaks" ] && { echo "❌ absolute-path leaks"; exit 1; }
```

## Consequence to clean up

ADR-0003 (`docs/adr/0003-htmlbaseplugin-for-base-path.md`) still carries
`status: accepted (planned)` for the plugin route. With this rejection, that decision is
reversed — the ADR should be re-statused (e.g. `rejected` / `superseded`) so the record
isn't stale. Tracked separately from this issue's closure.

## Prior requests

- #19 — "Migrate HTML templates from `| url` to bare paths, then register HtmlBasePlugin"
  (the `| url`-removal half of ADR-0003; the double-prefix fix in sitemap/feed/ai-index
  shipped independently in #12 and stays.)
