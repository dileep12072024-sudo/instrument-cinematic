#!/usr/bin/env bash
# Encodes a frame set's arrival flight (public/frames/<set>/fly/*.webp, 30 fps) to the video the story page plays:
#   scripts/snapshots-video.sh night-land
# H.264 for every browser; faststart so it plays while it downloads; the source frames are then not needed online.
set -euo pipefail
dir="$(dirname "$0")/../public/frames/$1"
ffmpeg -v error -y -framerate 30 -i "$dir/fly/%03d.webp" -c:v libx264 -preset slow -crf 26 -maxrate 3M -bufsize 6M -pix_fmt yuv420p -movflags +faststart "$dir/flight.mp4"
ls -la "$dir/flight.mp4"
