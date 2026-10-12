# Agent Handoff

Updated: 2026-10-12. Read this before changing the project.

## Current Task: Plant Placement Is Not Approved

The user's latest feedback is: "I'm feeling like they are not located in correct
position..." They then requested this handoff because they are switching agents.
The immediate subject is the flowering plants, although check whether nearby
trees are included if that remains unclear. **Do not mark placement complete.**

The last environment commit corrected the flower groups to the right of the
driveway when facing the main entrance. It mirrored their lateral positions but
kept earlier estimated distances along the driveway. Correct side does not mean
correct position. Recheck the driveway bend, kerb, planting strip, and low round
masonry feature in the videos before moving anything again. Do not blindly
mirror the plants or move the entire landscape.

Latest references, available locally:

- `C:\Users\Dileep\Downloads\WhatsApp Video 2026-10-12 at 12.38.21 PM.mp4`
- `C:\Users\Dileep\Downloads\WhatsApp Video 2026-10-12 at 12.38.14 PM.mp4`

WSL paths start with `/mnt/c/users/dileep/Downloads/`. Existing extracted contact
sheets are `artifacts/planting-videos/21.jpg`, `14.jpg`, and `flowers-detail.jpg`.
The helper `artifacts/inspect-planting-videos.mjs` uses installed `ffmpeg-static`.
These artifacts may be ignored by Git and unavailable in a fresh clone.

Previous visual interpretation, **not final user-approved placement**:

- The short video pans from the relatively open left courtyard to the entrance.
- In the longer video, approximately 23-28 seconds show the right wing, a bend
  in the driveway edge, flowering vegetation and a low round masonry feature.
- Looking outward toward the gate reverses screen left/right. Use "facing the
  main entrance" consistently when discussing sides.
- The current model has three separate flowering shrubs in open ground. Their
  grouping and distance from the kerb may be wrong; the round feature has not
  been modeled. Review full-resolution frames rather than assuming its purpose.

## Repository and Published Baseline

- Repository: `/mnt/c/users/dileep/instrument-cinematic`
- Branch: `main`
- Remote: `https://github.com/dileep12072024-sudo/instrument-cinematic.git`
- Last application commit: `1b02ea1`, "Integrate Blender terrain and wind-driven
  planting; correct flower bed side". It was pushed and deployed.
- Existing preview: https://moon-review.instrument-cinematic.pages.dev/
- Last deployment: https://6003874c.instrument-cinematic.pages.dev/
- Local preview: http://127.0.0.1:5190/ (check whether the server is still running).
- Start locally: `npm run dev -- --port 5190 --strictPort`. If occupied by an
  unrelated server, use another port and adjust test URLs where supported.

At handoff, `git status --short` showed these preexisting changes:

```text
 M blender/campus-terrain-working.blend
?? blender/IT_evnironment.blend
?? blender/Terrain.blend
?? scripts/fetch-environment.mjs
```

The modified master has not been inspected to determine the new differences.
Do not overwrite it from Git or silently include it in a documentation commit.
The other untracked files were already present; leave them alone. This handoff
adds only `context.md`. Recheck status before proceeding.

## User Constraints

- Use **one Blender master**, `blender/campus-terrain-working.blend`. Do not
  create piles of alternate `.blend` files. Organize scenes/collections inside it.
- Preserve the approved building, terrace caps, stairs, door hinges and openings.
  The current request concerns landscape placement, not another architecture pass.
- Preserve smooth panorama interaction. Increasing rotation speed is not a
  substitute for smoothness. Do not change camera controls for plant placement.
- Trees, shrubs, blooms and grass must respond naturally to the website's live
  wind speed/direction/gusts. Keep roots anchored and reduced-motion support.
- Do not reintroduce animated birds; the user explicitly asked to remove them.
  Preserve the prior suppression of bird chirps at night.
- Main entrance glass should have clean green-tinted exterior reflections, not
  blurry/frosted glass. Do not undo prior glass work while editing the environment.
- User has repeatedly requested verified changes be committed and the existing
  preview updated. Tell them to refresh after a successful deployment. Do not
  claim deployment or visual approval without evidence.
- No survey measurements were supplied. GIS and photo-guided estimates must not
  be described as exact measured terrain or botanically confirmed tree species.

## Blender Master and Coordinates

The master is tracked using Git LFS; fresh clones need `git lfs pull`. Textures
are packed. Live Blender can be accessed through Blender MCP when connected.
Use Windows paths in Windows Blender, not WSL paths.

Master path:
`C:\Users\Dileep\instrument-cinematic\blender\campus-terrain-working.blend`

Scenes:

1. `Instrument campus - GIS working layout`: original 600 m GIS reference.
2. `Entrance road and ground - photo draft`: editable environment authoring scene.
3. `Website environment export`: reduced, registered website derivatives inside
   the same file, currently 95 source mesh objects and 23 trees.

`blender/GIS-NOTES.md` documents sources, attribution, provisional grading, and
earlier passes. Some early-pass descriptions are historical; read Website
Integration and this handoff for the current runtime state.

Source photo-draft local axes:

```python
anchor = Vector(source['gis_anchor_xy_m'])  # previously (-4.8, 9)
right = Vector((0.926, 0.377)).normalized()
forward = Vector((-right.y, right.x))
source_xy = anchor + right * local_x + forward * local_y
```

Local Y increases outward from the entrance toward the campus road. Source
Blender Z is elevation. Runtime coordinates map local X to X, source Z to Y,
and local Y + 10.75 to Z. The drive begins at runtime Z=10.75 beside the pink
entrance apron. Gate position is approximately runtime Z=36.36.

Provisional grading: 0.9 m driveway fall, 0.45 m side-ground depression, 0.14 m
kerbs, 5.3 m driveway width. Do not substitute the raw DEM's apparent 6 m fall.
GIS origin is lon 83.323715, lat 17.728887, EPSG:32644. GIS and photo-draft Z
datums differ; do not merge their vertical surfaces.

Last exported shrub positions in source local XY (verify against dirty master):

- `Pink flowering shrub 00`: (5.7, 12.5)
- `Pink flowering shrub 01`: (7.2, 14.0)
- `Pink flowering shrub 02`: (8.4, 13.0)
- `Bright green understory 03`: (6.5, 9.3)
- `Bright green understory 04`: (7.5, 9.6)
- `Bright green understory 05`: (-18.1, 0.65), beside left facade tree; unchanged.

Move each plant's matching `Supporting shrub stems NN` and, for flowers,
`Pink bloom clusters NN` together with its foliage. `base_local_xy` is stored
on the foliage object. Geometry is baked in source coordinates; existing
object translations include the previous move. Apply a delta, not an assumed
absolute world location. Sample ground elevation for the new root position.

`Low entrance tree-bed edging` belongs to the left entrance tree. It is not the
round feature beside the flowers and must not be moved with them by mistake.

### Synchronizing Export Objects

Activate the source scene and call `bpy.context.view_layer.update()` **before**
reading source `matrix_world` after edits. Previously, inactive-scene stale
matrices caused an export to retain old plant positions despite source edits.

Export objects have globally suffixed names. Locate them by the custom property
`obj.get('source_object') == original.name`, not by exact object name.
The source-to-export registration before glTF's axis conversion is:

```python
registration = Matrix((
    (right.x, right.y, 0, -right.dot(anchor)),
    (-forward.x, -forward.y, 0, forward.dot(anchor) - 10.75),
    (0, 0, 1, 0),
    (0, 0, 0, 1),
))
export_object.matrix_world = registration @ original.matrix_world
```

Update the initial position list in `blender/build-environment.py` when placement
is settled, but do not rerun the entire construction script over the master.
Likewise `blender/export-website-environment.py` constructs derivatives once and
asserts that its export scene does not already exist. Export the existing scene
instead of rerunning that script wholesale.

Save back to the same master, pack resources, and temporarily set Blender
`preferences.filepaths.save_version = 0` during saving to avoid extra variants.
Restore the preference afterward. Keep the source scene active for user editing.

## Website Export Pipeline

1. Synchronize changed objects from authoring to existing export scene.
2. Export active `Website environment export` as
   `public/media/campus-environment.glb`, with GLB format, extras, custom
   attributes, applied modifiers, Draco compression level 6, and without
   animations/cameras/lights. Use the existing `export()` function's settings in
   `blender/export-website-environment.py`; refresh `blender/gis/runtime-checks.json`.
3. Run `node scripts/prepare-environment.mjs` after each fresh Blender export.
   Raw output is about 80 MB; the packer reduces it below the Pages 25 MiB limit.
   Avoid repeatedly recompressing an already packed GLB.
4. Preserve the original source alpha/color textures. On a fresh checkout,
   unpack the grass/shrub textures to their expected `blender/sources/` paths.
5. Save the packed master, run checks, commit reviewed files, push, and deploy.

Texture pitfalls already fixed: original tree RGBA PNG alpha passes directly to
the shader. Grass/shrub RGB JPEG textures need their separate alpha masks; the
packer combines original RGB and alpha without Blender's unwanted color-space
darkening. Do not turn these back into opaque leaf cards or dark foliage.

Last deployed GLB: 20,747,700 bytes; SHA-256
`0cea00ecb9bc9e850c02c473aad4a19607f20f05ad9a79534277c9bd2cd6743d`.

## Relevant Code

- `src/blender-environment.js`: GLTF/Draco loading, wind shaders, root weighting,
  shadow deformation, runtime building/tank clearance trimming, terrain materials.
- `src/main.js`: loads Blender environment and retains live weather/wind updates.
- `src/architecture.js`: approved building and `buildEntranceApron`; old landscape
  builder remains for legacy checks but is not the active website vegetation.
- `blender/export-website-environment.py`: derivative construction and export.
- `scripts/prepare-environment.mjs`: texture packing, GLB size checks, decoder copy.
- `scripts/check-environment.mjs`: scene counts, maps, placement, screenshots and
  desktop/mobile panorama drag checks. Its flower assertion only checks side,
  **not exact correct placement**. Improve that after reviewing the videos.

Wind uses `_WIND` attributes (bend weight, leaf flexibility, phase). Export extras
include `source_object`, `vegetation`, `tree`, `source_collection`, `wind_height`.
Runtime clearance removes offending plant triangles without mutating shared
source geometry. Keep maximum wind reach in collision clearance calculations.

## Verification and Deployment

Previously passed on the last application revision:

```sh
npm run test:interaction
npm run test:geometry
npm run test:wind
npm run test:environment
node scripts/check-wind.mjs --browser
npm run build
```

The full environment browser check preceded the final grass/shrub mask patch;
the browser wind check and build passed after that patch. These are historical
results, not proof that the current uncommitted Blender master is verified.

Browser checks use local dev port 5190 and Playwright Chromium, previously at
`/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome`.
`check-environment.mjs` imports Three from a dev-only `/node_modules/` URL, so
do not assume it runs unchanged against production. Browser execution may need
sandbox approval. Software WebGL and initial reflection probes are slow; allow
minutes. Test controlled frames where existing scripts do so. Do not claim
hardware frame-rate performance from headless software rendering.

Existing local screenshots: `artifacts/environment/{approach,overview,flowers,
rear-canopy,desktop-pano,mobile-pano}.png` and `artifacts/wind/{desktop,mobile}.png`.
Use these as comparisons, not as evidence that the user approved placement.

After verified application changes:

```sh
npm run build
# Stage only reviewed changes, then commit and push main.
npx wrangler pages deploy dist --project-name instrument-cinematic --branch moon-review
```

Verify the existing preview serves the new build/asset, then ask the user to
refresh. A documentation-only handoff does not require an application deployment.

## Recommended Next Action

Inspect the dirty Blender master before editing. Review both videos with focused
frames around the flowering strip and compare a matching website/model camera.
Establish positions relative to the kerb, bend, round masonry feature and facade.
If the footage cannot settle a location, ask one precise landmark-based question
or show a proposed placement for confirmation. Then move whole plant groups in
both scenes, retain wind behavior, export, test and deploy. Do not present the
previous right-side correction as resolving the user's latest complaint.
