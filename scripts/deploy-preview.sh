#!/usr/bin/env bash
# Builds and deploys the preview (branch "portfolio"). The frames (public/frames, made by scripts/snapshots.mjs) ship;
# the flight's source frames do not: only its video is played.
set -euo pipefail
cd "$(dirname "$0")/.."
npx vite build
rm -rf dist/frames/*/fly
npx wrangler pages deploy dist --project-name instrument-cinematic --branch portfolio --commit-dirty=true
