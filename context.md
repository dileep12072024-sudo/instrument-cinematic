# Agent Handoff

Updated: 2026-10-12. Read this before changing the project.

## Hall Side Walls From Photographs (2026-10-14, latest, awaiting user approval)

- Three photos of the hall's side walls and the left (west) wing passage were measured with the
  known lens and solved camera poses; method, numbers and the fit factors are in
  `docs/entrance-video.md` ("14 October photographs"). Boards use perspective-corrected crops
  (`public/media/entrance-hall/{west,east}-boards.webp`), so their lettering is real.
- Finding: the real hall is about 4.4 high and its side walls about 4.9 long; the model hall is
  3.6 and 3.45. Side-wall contents are fitted (heights x0.82, positions x0.704). Raising the ground
  storey would be a building-wide change, not made.
- `hallWindows` in `src/footprint.js` drives both the hall walls and the shell openings in
  `architecture.js`. Check: `node scripts/check-hall-side-walls.mjs`.

## Rain: Wind Slant, Splashes, Puddles (2026-10-14, awaiting user approval)

- Slant: rain drifts with the same gusting wind speed the trees use (`updateWind` -> `rain.update`),
  damped like the foliage, so lean = atan(wind / fall speed). Check: `scripts/check-rain-slant.mjs`.
- Splashes: drops landing on the ground (height grid) or on a roof (`shelterAt`) throw a 0.26 s
  crown within 18 m of the eye (pool of 320, additive).
- Puddles (`src/puddles.js`): ground meshes rasterised to a 0.5 m grid with small micro-relief
  (a visual estimate), then a priority-flood depression fill. Water drains off where the
  modelled ground ends; building footprints are walls. The deepest hollows are the authored
  0.45 m side-ground swales beside the drive. A fill/drain model (paving vs soil) follows the live
  rain rate and is warm-started from the past 48 h of hourly Open-Meteo precipitation. Wet film:
  ~30 s to wet, ~8 min to dry. Puddles from heavy rain last about an hour on paving. The
  shader darkens and glosses ground, flattens and mirrors in puddles, and adds random drop
  rings within ~15 m. Check: `scripts/check-puddles.mjs`. Map build ~0.1-0.3 s during loading.
- Measured on the user's GPU: no frame-time increase vs the previous preview (within noise).

## Walkable Guide Avatar (2026-10-14)

- Toolbar person icon enters avatar mode (`src/avatar.js`): the user steers a human figure
  to show where their photos were taken, then copies the readout (`x y z`, level, facing
  in degrees where 0 = toward the main entrance) into the chat. Use those coordinates to
  place the camera when matching a photo; they are scene metres, not survey data.
- Model `public/media/avatar/person.glb` is the three.js r183 example `Soldier.glb`
  (Mixamo, Idle/Walk/Run). Collisions use `three-mesh-bvh` 0.9.15 against architecture,
  landscape and sheds only (not foliage). Pose persists in localStorage `avatar-pose`.
- Fixed with it: hall lights switch on when the camera crosses the doorway; with
  `shadowMap.autoUpdate` off they also need `renderer.shadowMap.needsUpdate`, otherwise
  their shadow maps are never drawn and the frame shows only sky.
- Next (user-led, part by part): three photos around the central stair entry, then a
  ground-floor west-wing video. Confirm each part with the user before the next.

## Archive Removal and Classroom Wing Rebuild (2026-10-14)

- The user asked that raw files not be shown: archive and original-film UI, dialogs and
  code are gone, and the 15 photos, `photos.json` and `campus.mp4` are deleted from
  `public/media` (also from `dist`). Do not reintroduce them. Old copies may linger in
  Cloudflare's edge cache for the exact old URLs until expiry; nothing links to them.
- Classroom wing rebuilt from the references; details in `docs/classroom-wing.md`
  ("October 14 Rebuild").

## Photo-Guided Detail and GPU Pass (2026-10-14)

Verified on the user's Intel UHD laptop (real off-screen Chrome window, GPU timer queries;
see user memory "real-gpu-measurement") and the full 17-script suite.

- Cleanup: git-ignored `artifacts/` removed; LFS copies already on the remote pruned.
  Blender files untouched.
- Flicker source (frame differencing): leaf specular sparkle. Leaves are matte.
- `scripts/simplify-environment.mjs` simplified branch/trunk geometry only; GLB 20.7 ->
  17.9 MB, identical in side-by-side GPU captures.
- `src/batching.js`: static detail groups and gate parts merged; trees batched per
  material (`batchTrees`, bend scale baked into _wind.x); distance LOD removed.
  Draw calls 629 -> 307, render() CPU ~17 -> ~8 ms. Batched leaves use Lambert.
- Lights that are off are excluded (hall lights only inside the hall, entrance light at
  night, moonlight when lit, lightning in storms); duplicate sky flash removed.
- Adaptive quality settles once: 30 fps, then x0.88 resolution steps to 0.8, then 20 fps;
  failed levels never retried. On the user's laptop: steady 50 ms frames at 0.8.
- Leaf cost (~14 ms) is the jacaranda canopies' screen coverage. Tried and rejected,
  with measurements: depth pre-pass (slower), coverage-compensated thinning (no gain),
  outside-in ordering (much slower, breaks vertex reuse), alpha-to-coverage (noise).
- Visuals from the 2026-10-13 photos/video: right tree in a raised brick planter with a
  cracked concrete cap (`raisedPlanter`, tree at 7.2, 5.0); sparse magenta-pink blooms
  (every 3rd bract piece, centres hidden); low uncapped brick edging behind the east
  kerb; two weathered sheds among the left trees (`leftSheds`, skipped if on a road).
  Classroom corridor: brass-grilled brown windows, electrical boxes and conduit drops,
  high niches, blank faculty name boards (no invented text), dark floor bands and a
  patterned tile inlay. No debris, per the user. Positions/sizes are photo estimates.

## Real-GPU Performance Pass (2026-10-13)

Measured on the user's laptop (Intel UHD Graphics, ANGLE/D3D11) by driving Windows
Chrome over the DevTools protocol from `%TEMP%\ic-gpu\probe.mjs` (Windows node.exe,
separate profile). WSL itself has no GPU, so headless numbers there are not performance.

- Bottleneck: vegetation, both vertex (~3M tris, 1.8 verts/tri) and leaf fill.
  Sky+building+ground alone ran at ~50-60 fps; adding vegetation dropped it to ~18.
  Cheaper leaf shaders and an EffectComposer/SMAA path were measured and rejected
  (the composer cost more than MSAA saved).
- Adaptive quality now: even cadence first (60 -> 30 -> 20 fps, every Nth vsync),
  then far-foliage LOD scale, then one resolution step to 0.85 (never 0.65);
  restored in reverse. Measured: steady 50 ms frames at full resolution and LOD,
  instead of uneven 20-40 fps blurring down to 0.65 (the reported "flashing").
- Flicker fixes: LOD hysteresis, shadow map re-rendered only when the sun moves
  ~0.3 degrees, earth patches raised with polygon offset, roof-slab band covered.
- Right facade tree trunk was being cut: foliage trimming used the crown's 1.76 m
  sway for every triangle. Trimming now uses each vertex's own wind weights.
- Load: blocking `compileAsync` removed (~4 s). Deployed preview on the user's GPU
  (HTTP cache disabled, so the 20 MB GLB downloads each time in ~5-6 s): ready in
  ~36 s with cold shader caches, ~16 s on a repeat visit; served locally ~9-10 s.
  Remaining cost is first-time ANGLE/D3D11 shader compilation and the download.
- Frame pacing on that GPU: steady 50 ms frames (20 fps cadence), resolution held
  at 1.0, far-foliage LOD scale ~0.6. Vegetation still limits it to ~20 fps there.
- `performance.mark` stage markers (architecture-built, env-downloaded, env-parsed,
  env-trimmed, surroundings-built, probe-N-rendered, reflections-captured) remain
  for future load profiling.

## Bug-Fix, Tree and Performance Pass (2026-10-12)

- Right wing (East corridor) front: two open facade bands were closed in
  `src/terraces.js`: 8.0-8.70 (first-floor wall top to the second-floor parapet)
  and 11.84-12.56 (corridor lintel to roof parapet, which exposed the roof slab).
- Classroom-wing doorway (`src/classroom-wing.js`): the window wall now stands
  inside the front facade (centre local x=-0.985) so the facade's blue pilasters
  and inner face no longer poke into the corridor; the open leaves hinge on posts
  at the wall faces instead of inside the walls.
- Facade trees (`placeFacadeTrees` in `src/surroundings.js`, applied before
  foliage trimming): forked tree moved to about 1.6 m from the left facade with
  its edged bed, slender tree likewise, and a clone placed right of the porch
  (videos 12.38.21 at 2.5-4.5 s, 12.38.14 at 6-8.5 s). Runtime-only: fold these
  into the Blender master when it is next exported. Tree count is now 24.
- Performance: far foliage LOD (every 2nd leaf card beyond 45 m, every 4th beyond
  90 m) cut the arrival view from ~4.36M to ~2.37M triangles; shaders are
  precompiled before the loader clears; static scenery matrices are frozen.
- Loading: environment and sky downloads start at page load with real progress.
- Mobile: panorama supports pinch (walk) and two-finger pan; `scripts/check-mobile.mjs`
  drives real touch input on an emulated phone.
- Rain (`src/weather-effects.js`): 5200 soft streaks fall in a volume that follows
  the camera (was a fixed box around the building, invisible from far views); fog
  closes in and the sky dims/greys while it rains (`src/main.js`).
- Sound (`src/ambience.js`): audio now unlocks on touch release/tap as well as
  pointerdown (phones never unlocked before) and fades in whenever the context
  starts running; light rain is louder (sqrt curve); night crickets around the
  building; distant thunder during thunderstorm weather codes.
- Thunderstorms (weather codes 95/96/99): lightning flashes (one or two 110 ms
  pulses, a cool directional light plus sky brightening) every 12-40 s, each
  followed by thunder after a 0.8-4.3 s distance delay (`sound.thunder`). No
  flashes with reduced motion. `npm run test:storm` covers both.
- Birds: the recording fetch had a 15 s abort and no retry, so on slow links
  (now sharing bandwidth with the early environment download) daytime ambience
  stayed silent. Limit is 90 s with a retry every 20 s. `npm test` (check-site)
  passes end to end again; pass the dev URL, e.g. `node scripts/check-site.mjs http://127.0.0.1:5190`.
- Lossless WebP for the foliage PNGs was tried and rejected: sharp's encoder drops
  the colour under transparent pixels, which darkens leaf edges in distant mips.
- Test machine: run headless browser checks through `memcap` (see user memory) one
  at a time; software WebGL boot takes ~90 s and the first frame up to ~2 min.

## Video-Guided Surroundings and Quality Pass (2026-10-12)

Both WhatsApp videos were reviewed frame by frame (480p re-encodes, so fine detail
is limited). Runtime changes, all in three.js; the Blender master was not touched:

- `src/surroundings.js` (new): material tints matching the footage (dark asphalt,
  weathered kerb, red laterite earth, red hibiscus-like blooms instead of magenta);
  a 260-tree impostor belt beyond the site (cards captured from the real Blender
  trees, never on roads/kerbs/paving, chapter sightlines kept clear); a hazy hill
  ridge only on the gate-facing arc, where the videos show it; and a provisional low
  brick plinth with concrete cap directly behind the east kerb at runtime Z=20.5.
- The "round masonry feature" is a low rectangular brick plinth with a concrete cap
  (video 12.38.14 at ~25-26 s), right behind the kerb, beside a kerb break. Its
  position along the drive and its size (1.4 x 0.9 x 0.38 m) are estimates.
- Distant ground now uses the verge material, not bare soil.
- Quality: auto resolution used to ratchet down permanently, and every tab switch
  counted as one huge frame, so it lost 20% each time. It now ignores stalls and
  recovers (`scripts/check-resolution.mjs`, `npm run test:resolution`). All
  textures get the GPU's maximum anisotropy.
- Smoothness: panorama wheel/trackpad movement is proportional to scroll delta.
- Still not determinable from the footage: a measured driveway fall, side-ground
  depression, exact shrub positions. The provisional 0.9 m grade is unchanged.

## Latest Terrain Edit (Supersedes Baseline Below)

After this handoff was first committed, the user requested terrain correction
and removal of white sheet-like scraps. They asked the agent to use the videos
rather than trying to explain "inversion" verbally. No measured elevations or
explicit instruction to globally mirror the terrain were supplied.

`blender/correct-video-forecourt.py` has now been applied in the existing master:

- Replaced the broad pale draft apron with textured facade-side paving.
- Moved the left return paving inside the left courtyard, rather than outside
  the left wing. Preserved the existing website porch and building.
- Widened the driveway toward the entrance, kept the mapped road junction fixed,
  and retained the provisional downhill grade toward the gate.
- Restored bare-earth pockets beside both wings with open access from the drive;
  kept kerbs around the planted verges rather than blocking court access.
- Repositioned whole flower groups beside the right-hand kerb. New local XY:
  (4.3,8.6), (5.6,10.2), (4.4,12.1). Green groups 03/04: (6.7,8), (7,10.5).
- Adjusted tree roots/grass to the revised ground without changing panorama code.

The script is a one-time corrective migration, not a second Blender project;
it refuses to run twice. The raw GIS scene is unchanged. Final positions remain
video-guided estimates pending user review. The round masonry feature remains
unmodeled. Do not claim a surveyed match or a confirmed global inversion fix.

Check Git history for the terrain commit/deployment after `028c250`. All baseline
positions, asset hashes and dirty-state notes below describe the earlier handoff,
not this new export. Current asset metadata is in `blender/gis/runtime-checks.json`.

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
