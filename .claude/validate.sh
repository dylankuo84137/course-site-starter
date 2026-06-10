#!/usr/bin/env bash
set -e

npm run validate
npm run build:full
ELEVENTY_BASE="/course-site-starter/" npm run build
