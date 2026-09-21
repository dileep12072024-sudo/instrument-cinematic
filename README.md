# Instrument Technology: A Campus Portrait

A Three.js experience built directly from the supplied department footprint, photographs, and 34-second campus video. The September 21 plan and original OG model's top view inform the revised proportions. No Blender meshes or other imported building models are shipped; all building geometry is constructed in Three.js.

## Run

```sh
npm install
npm run dev -- --port 5176
npm run build
npm test
npm run deploy
```

`npm test` uses Playwright Chromium. Set `CHROMIUM_PATH` if the browser is installed elsewhere. Pass a live site URL with `npm test -- https://instrument-cinematic.pages.dev`.

## Implementation

- `src/footprint.js`: shared five-block H plan used by both the 3D building and overhead map. The end wings are substantially deeper than the connecting corridors; the entrance block projects on both sides.
- `src/architecture.js`: original Three.js geometry for the asymmetrical H footprint, two- and three-level wings, entrance canopy, windows, ventilation screens, grilles, doors, trees, paths and scooters. Static geometry is merged by material; foliage and ground debris are instanced.
- `src/main.js`: damped orbit controls, four viewpoints, spline camera journey, continuous daylight controls, opening doors, photo export, footprint view, gallery and original video.
- `src/style.css`: responsive full-screen layout, self-hosted fonts, dialogs and reduced-motion support.
- `scripts/prepare-media.mjs`: reproducible local reference-image conversion. Originals remain untouched.
- `scripts/check-site.mjs`: browser interaction, media, canvas-pixel and responsive checks.

The building is a visual reconstruction, not a measured survey. Dimensions, hidden elevations, material textures and planting positions are approximated. Some supplied reference images are AI generated; the on-site photographs and video guide the building's visible architecture. Interior rooms are not reconstructed. Door controls reveal the entrance recess only.

## Media

All fifteen reference images and the supplied original video are included in the archive. Reference photographs are converted to WebP, while video is loaded only when opened. Both HEIC references are converted locally.

CC0 lighting and ground textures from Poly Haven:

- https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky
- https://polyhaven.com/a/brown_mud_leaves_01

Self-hosted DM Sans and Libre Caslon Display fonts are licensed under the SIL Open Font License. Font license copies are in `public/media/`.

This is an independent campus portrait, not an official university website.
