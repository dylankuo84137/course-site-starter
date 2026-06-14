#!/usr/bin/env bash
set -e

# ─── Layer 2: source grep-lint (fast; runs before the build) ─────────────────
hits=$(grep -rEn 'course\.i18n\[|course\.material|course\.docs' src/_includes --include='*.njk' \
  | grep -v 'macros/i18n.njk' || true)
if [ -n "$hits" ]; then
  echo "❌ Layer 2: footgun pattern found in templates:"
  echo "$hits"
  exit 1
fi
echo "✅ Layer 2: source grep-lint clean"

# ─── Single production-faithful build (validators ×1 via prebuild, Pagefind ×1 via postbuild) ──
ELEVENTY_BASE="/course-site-starter/" npm run build

# ─── Layer 1: output assertions on _site/**/*.html ───────────────────────────

# 1a. Absolute-path leaks (href/src that start with "/" but not "/course-site-starter/" or "//")
leaks=$(grep -rEno '(href|src)="/[^"]*"' _site --include='*.html' \
  | grep -vE '="(//|/course-site-starter/)' || true)
if [ -n "$leaks" ]; then
  echo "❌ Layer 1: absolute-path leaks found:"
  echo "$leaks"
  exit 1
fi
echo "✅ Layer 1a: no absolute-path leaks"

# 1b. Unrendered Nunjucks template tags
tags=$(grep -rn '{{' _site --include='*.html' || true)
if [ -n "$tags" ]; then
  echo "❌ Layer 1: unrendered template tags found:"
  echo "$tags"
  exit 1
fi
echo "✅ Layer 1b: no unrendered template tags"

# 1c. Pagefind index present and non-empty
if [ ! -d _site/pagefind ] || [ -z "$(ls -A _site/pagefind 2>/dev/null)" ]; then
  echo "❌ Layer 1: _site/pagefind is missing or empty"
  exit 1
fi
echo "✅ Layer 1c: pagefind index present"

echo ""
echo "✅ All validation layers passed."
