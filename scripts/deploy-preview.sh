#!/usr/bin/env bash
# Builds and deploys the preview (branch "portfolio"): the story over the live campus (no pre-rendered frames since
# 2026-10-26; they are archived beside the project).
set -euo pipefail
cd "$(dirname "$0")/.."
npx vite build
# Cloudflare's API sometimes errors after the upload; up to three tries
for try in 1 2 3; do
  if npx wrangler pages deploy dist --project-name instrument-technology-au --branch main --commit-dirty=true; then break; fi
  [ "$try" = 3 ] && { echo "DEPLOY FAILED after three tries" >&2; exit 1; }
  echo "deploy try $try failed; again in 20 s" >&2; sleep 20
done
# the live site must now serve this build: its page has to match dist/index.html (a deploy that silently failed once
# left a whole test round running against the old site)
sleep 8
# the edge can serve the old page for a few seconds after the upload: checked for up to a minute
live=no; for i in 1 2 3 4 5 6; do curl -s https://instrument-technology-au.pages.dev/ | cmp -s - dist/index.html && { live=yes; break; }; sleep 10; done
if [ "$live" != yes ]; then echo "DEPLOY CHECK FAILED: the live page is not this build" >&2; exit 1; fi
echo "deploy verified: the live page is this build"
