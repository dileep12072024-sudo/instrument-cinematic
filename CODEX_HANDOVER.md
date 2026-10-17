# Codex Account Handover: Instrument Technology Campus

Updated 2026-10-17. Start here before editing. This is the consolidated handover
requested by the owner for a new Codex account. It records confirmed corrections,
mistakes to avoid, reference locations, current work and verification limits.
It is not evidence that every part of the reconstruction is finished or exact.

## 1. Start Here

- Repository: `C:\Users\Dileep\instrument-cinematic`.
- WSL: `/mnt/c/users/dileep/instrument-cinematic` (Windows path casing may vary).
- Branch: `main`; remote: `https://github.com/dileep12072024-sudo/instrument-cinematic.git`.
- Classroom implementation commit: `dc31849`, "Build Class II and III interiors
  and fix classroom floor clearances". This handover is committed separately.
- Review site: https://moon-review.instrument-cinematic.pages.dev/ . Use this
  existing preview; do not publish to production without approval.
- October 17 deployment: https://be785fa4.instrument-cinematic.pages.dev . The
  review alias and `/assets/index-T2gOGuqO.js` both returned HTTP 200; the latter
  is 377378 bytes. This deploy uses the verified working tree, including existing
  pending environment/performance/visitor work, not only `dc31849`. Those other
  changes remain uncommitted; cloning only Git does not reproduce that whole tree.
- Local development started on http://localhost:5191 . Check whether it is still
  running. Do not kill another agent's server or assume a port is free.
- Read `git status --short`, `git diff`, and `git diff --cached` before any edit.
  A substantial amount of unrelated work remains uncommitted. Preserve it.
- Read `docs/classroom-wing.md`, then relevant sections of `context.md`,
  `handoff.md`, `docs/west-wing.md`, `docs/stairs-terraces.md`,
  `docs/ground-spine.md`, `docs/entrance-video.md` and `blender/GIS-NOTES.md`.
  Some are untracked local files, not available in a fresh clone.
- Older handoffs are chronological records with superseded claims, stale commit
  hashes, counts, elevations and plant coordinates. Do not treat every paragraph
  as simultaneously current. Latest explicit owner corrections take precedence.
- A new account does not inherit chat memory, MCP connections, credentials or
  local reference media through Git. Inspect actual files and available tools.
  Never claim to have watched footage or connected to Blender without doing it.

## 2. Owner's Non-Negotiables

- Reconstruct this real department, not a generic campus or classroom. Quality
  and faithful layout matter more than rushing. "Quick" never means skip checks.
- Establish geometry, levels, doors and window placement first; then realistic
  materials, fixtures, lighting and vegetation. Detail cannot hide a wrong plan.
- Inspect video chronologically before using still photos to refine details.
  The owner intentionally filmed oblique views to show depth and relationships.
- Distinguish observed, owner-confirmed, inferred and unknown. Photos/GIS do not
  provide survey-grade dimensions. Do not say "perfect", "exact" or "approved"
  merely because tests pass. Show matching viewpoints for owner review.
- Preserve approved features while fixing the requested area. Do not repeatedly
  relocate terraces, flatten stair flights or change unrelated camera controls.
- Use real 3D geometry for forms and fixtures, not whole reference photos pasted
  onto surfaces. Procedural/generated material textures and text are acceptable.
  The later owner instruction overrides older permission for photo crops.
- Do not publish raw reference photos/videos or upload them to third-party
  processing services. A prior remote-processing proposal was declined.
- One existing Blender master, organized into scenes/collections. No piles of
  alternate `.blend` files. Do not delete existing user-created alternatives.
- Trees, shrubs, flowers and leaves must react naturally to the site's wind
  speed, direction and gusts, with anchored roots and reduced-motion support.
- Do not restore animated birds. Ambient sound should respect time and weather.
- Keep desktop/mobile navigation usable and smooth. Do not trade fidelity for
  crude box-like trees, opaque leaf cards or permanently blurry rendering.
- Commit reviewed changes when asked. Stage specific files/hunks, never the
  entire dirty tree. Push/deploy only within the owner's authorized scope.
- Give the owner the preview URL and ask them to refresh after a verified deploy.

## 3. Confirmed Spatial Corrections and Lessons

### Terraces, slopes and stairs

- The terrace slope was incorrectly moved as a whole. The requested change was
  to connect its extremities to the exterior faces of the pillars facing the
  open terrace/AC units, while keeping its approved height and position.
- An earlier "cut farther inward" interpretation was superseded by that explicit
  pillar-face clarification. Never replay it as permission to shift the terrace.
- Keep a small overhang so the slope reads as a cap on the lower wall; do not
  leave a large sharp projecting sheet or trim the entire cap flush. Apply the
  same treatment to the right terrace, retaining its approved half-height cap.
- The right terrace needs three taller steps, not two. Owner approved raising
  its surfaces together. Align treads, risers, adjoining walls and landing;
  avoid shallow cosmetic strips, slots and floating stair edges.
- Close accidental cracks/openings at corners, parapets and joins, but preserve
  actual doors, screen holes, ventilation openings and legitimate passages.
- Tanks and pillars must not intersect. Foliage clearance must allow wind sway,
  not merely avoid collisions in a static screenshot.
- Blue stair door: keep the corrected right-hand hinge. From the steps it pulls
  toward the viewer onto the top landing, not away into the room. Check from the
  approach viewpoint rather than guessing from the sign of a rotation angle.

### Glass

- Main-entry glass has clean green-tinted exterior reflections. It is not
  frosted, blurry, milky or simply opaque/dark. From inside it has the tinted
  see-through appearance shown in the door photographs.
- Preserve crisp reflections and inspect both sides under different lighting;
  do not achieve "one-way" appearance by making all glazing black.

### Terrain and planting

- Define left/right consistently while facing the main entrance. Turning toward
  the gate reverses screen left/right. This caused repeated flower-placement
  errors. Correct side alone does not establish correct location.
- Anchor plant groups to driveway bends, kerbs, beds, gate and facade, across
  multiple views. Do not blindly mirror the whole terrain or a single frame.
- The owner could not describe "inversion" precisely and asked us to inspect
  video. Do not claim a global mirror or slope reversal is verified without
  evidence. Road and side-ground level differences must be checked separately.
- Left terrain is low-lying. Later local ground-floor work uses a lower west
  wing and regraded earth; old provisional GIS grades are not universal levels.
- Preserve the left forked tree at the porch corner and the right tree in its
  square planter aligned with the wooden entrance doors (later handoff records).
- Include flowering shrubs and the substantial trees beside and behind the
  building. Rear foliage can overhang the parapets, but not pass through tanks,
  pillars, rooms or roofs. Fine fern-like and broadleaf canopy structures differ.
- Move stems, leaves, blooms and roots as one plant group; resample the ground.
- White-sheet-like terrain artifacts were unwanted. However, a later separate
  ground-floor reference identifies a real propped sheet at the water-cooler
  gate. Do not globally delete every pale rectangular object as "scrap".

### Classroom corridor

- From the main corridor: descend to the lower junction, Class III straight
  ahead, Class II to the left, return passage to the right.
- Both agreed classroom corridor flights have three 0.18 m rises (0.54 m per
  flight), matching the ground-floor right-wing reference. Do not flatten them.
- Current vertical datums: entrance landing 4.044, main corridor 3.504, lower
  junction and both classroom floors 2.964 (metres, website world Y).
- A false terminal door and imagined extra room were added from stored panels
  leaning against the wall. Owner asked to remove the debris and false door.
- Later the owner explicitly corrected this again: a small rear room DOES exist,
  so the return partition was restored. Preserve the restored room; do not repeat
  the earlier instruction to push every wall to the extreme exterior boundary.
- The circled corridor "door" was actually a window. It was replaced. There are
  no windows on either side of the Class IV door, by explicit owner instruction.
- The pierced/meshed corridor screen parts were explicitly praised as correct.
  Preserve them and their actual openings; do not revert to glowing flat textures
  or lay a second generic facade/window band over them.
- Corridor length and openings must be established from the route, not invented
  by repeating a door/window module. Preserve the information plaque near III.
- Class II's doorway was buried by an obsolete floor slab. Fix the whole room's
  floor relationship, surrounding facade and underlying ceiling, not just a hole
  at the door or a door floated above the real landing.
- There is NO interconnecting II-III door. A sign seen at about 81 seconds in the
  Class II video is not authority to invent one. Owner clarified this explicitly.

### Class III and Class II interiors

- Class III: four longitudinal bench lines across the view from the board, not
  only four benches deep. Benches were too large; current width is 1.55 m.
  Six benches per line is an inferred fit, not a confirmed count.
- III has four outer windows, two inner/corridor windows, maroon/cream patterned
  curtains, a raised teaching platform, green board partly covered by a display,
  lectern, teacher table/chair, grid ceiling, light panels, fans, ACs and hanging
  decorations. The nearer inner window has a sloping curtain rod and AC above.
- II is a distinct room, not a duplicate of III: a pillar-separated entrance
  aisle, three square pillars, side-window rows, raised teaching platform,
  central white projection/whiteboard overlapping a window with green boards
  either side, teacher furniture, curtains, network cabinet/cables and projector.
- Both current models use nine animated ceiling fans and 24 small desks in four
  lines. II desk count and exact fixture spacing remain estimates for review.
- No people or stored debris are modelled in these classroom interiors.
- Do not extend a shared wall opening merely because an opposite room has a
  labelled door. Trace which side of the corridor the camera is on first.

## 4. Video/Image Analysis Workflow

1. Locate the actual local files; use `ffprobe` or the installed FFmpeg tooling
   to inspect duration, resolution and rotation metadata. Never infer a video
   from its name or a single thumbnail.
2. Sample the entire clip in order with timestamps. Review contact sheets, then
   full-resolution frames at every doorway, junction, turn and elevation change.
   Densify sampling around ambiguous transitions. Replay the relevant segment
   where motion/parallax is needed. Sampling is not "every encoded frame".
3. Track camera position and facing direction using persistent landmarks. Write
   a small plan of connected spaces and a separate elevation profile. Screen
   left/right is not a global axis. Link views before counting repeated fixtures.
4. Count doorways, leaves, frames, windows and screen bays separately. A leaning
   stored panel is not an installed door; furniture is not a partition. Label
   readings alone do not prove room-to-room connectivity.
5. Track each stair flight: approach level, risers, landing and destination level.
   Distinguish a visible tread from a landing. Carry changes into slabs, skirting,
   thresholds, walls, ceilings below and camera walking heights.
6. Use photos for material/detail and opposite views. Prefer confirmed dimensions;
   otherwise use consistent scale estimates and record their uncertainty. Avoid
   deriving metric distances directly from perspective pixels.
7. Maintain an evidence list: source, timestamp, observation, inference, confidence
   and any conflicting view. Ask one precise landmark-based question when evidence
   cannot settle a consequential topology change. Do not repeatedly ask the owner
   to explain something the supplied footage clearly shows.
8. Model one section, render a matching camera, compare, correct, then refine its
   finish. Inspect desktop AND phone. Review corners and reverse views, not only
   the attractive forward view. Keep an executable regression for corrected bugs.
9. Do not publish the source media. Put disposable extracted frames/screenshots in
   the ignored `artifacts/` tree, not a pile of tracked files or new Blender masters.

Current classroom helper: `scripts/inspect-classroom-videos.mjs` uses installed
`ffmpeg-static`. III was reviewed at 94 half-second timestamps over 47.12 seconds,
plus three photos. II was reviewed at 24 chronological timestamps over 89.82
seconds, with closer checks around 35, 39, 62 and 81 seconds and four photos.
Further refinement should densify II sampling; do not claim every frame was seen.

## 5. Reference Locations (Local, Not Bundled)

Windows root is `C:\Users\Dileep`; WSL equivalent `/mnt/c/Users/Dileep`.

- `Videos\Class III\Class III.mp4` and photos
  `20261014_112017.jpg`, `20261014_112037.jpg`, `20261014_112042.jpg`.
- `Videos\Class II\20261014_122755.mp4` and photos named
  `20261014_122550`, `20261014_122625`, `20261014_122652`, `20261014_122723`.
  List the folder for actual extensions rather than guessing.
- Classroom corridor: `Pictures\Internal_2\20261013_130612.mp4`,
  `Videos\20261014_111121.mp4`, `Videos\20261014_110743.jpg`.
- Corridor stills in Downloads: `RUIDa39d8438ea004ddb9d1eb7ed6a94ac2f.jpg`,
  `RUID780e661b996046de896ac6c392bd759a.jpg`,
  `RUIDaf9a67d4bc614da387523a7551032621.jpg`,
  `RUIDfbc86c8711c54d45a02f8e4d496f96de.jpg`,
  `RUID073a561324b349bea83ed300f3dde28a.jpg`,
  `RUIDe76dc46fc4194f2ba99e804069b91464.jpg`,
  `RUID0a9fb9f25958416790c43c3eef4ac4ec.jpg`.
- West ground floor: `Pictures\20261014_110415.mp4`; local photo names and
  route timestamps in `docs/west-wing.md` and `handoff.md`.
- Planting/terrain: Downloads videos `WhatsApp Video 2026-10-12 at 12.38.21 PM.mp4`
  and `WhatsApp Video 2026-10-12 at 12.38.14 PM.mp4`.
- Terrace video: `Pictures\Internal parts\20260928_112159.mp4`.
- Rear canopy/terrace photos: `Pictures\Internal parts\20260928_105519.jpg`,
  `20260928_105754(1).jpg`, `20260928_110004.jpg`. The alternate
  `20260928_105519(1).jpg` has less foreground canopy; do not confuse them.
- Site references: `Pictures\Reference images\Entire building.jpg`,
  `Central\Road from the main door.jpg`, `Central\Right side door.jpg`,
  `Central\Left side door.jpg`, and the `Left` folder, including
  `View from left side block towards right.jpg`.
- User-marked website screenshots in `Pictures\Screenshots` and Downloads
  are diagnostic references, not photographs of real construction.

## 6. Current Code and Coordinates

- `src/classroom-three.js`: shared minimal classroom building helpers and III.
- `src/classroom-two.js`: II-specific layout and fixtures.
- `src/classroom-wing.js`: corridor, stair transitions, doorway/window placement,
  plaque and calls to both room builders.
- `src/architecture.js`: facade/slab ownership and building integration. The
  classroom modules own their openings; generic walls must not overlap them.
- `src/west-wing.js`: separately developed ground-floor model. Owner explicitly
  approved including its existing model in the classroom commit because the
  ceiling below II needed adjustment. Later unrelated edits remain unstaged.
- `src/entrance-walk.js`: `classII`, `classIII` and corridor walking routes.
- `src/main.js`: selector options and classroom fan update; many other local
  edits in this file belong to pending environment/performance work.
- Room local transform: origin world `(-4, 0, 2.166667)`, rotation Y `PI/2`.
  World X = -4 + local Z; world Z = 2.166667 - local X.
- III bounds: local X -1.085..7.3, Z -29.82..-20.43; ceiling Y 6.25.
- II bounds: local X -12.65..-1.18, Z -29.82..-18.16; ceiling Y 6.25.
- Both floor tops Y 2.964; platform rise 0.16. II entry local X -1.04,
  Z -19.15. III entry near X -0.35, Z -20.24. Values are reconstruction estimates.
- Old Y 4.03 slab removed over both rooms. Under-II ceiling follows
  `classroom.lowerFloor - .2` = 2.764; ground-floor doors/stairs stay put.
- Inspect `src/footprint.js`, `src/stair-layout.js`, `src/spine-interior.js` before
  changing shared levels. Do not fix one doorway while breaking the floor below.

## 7. Blender, GIS and Wind: Preserve the Pipeline

- Existing master: `blender/campus-terrain-working.blend` (Git LFS; new clone
  needs `git lfs pull`). Inspect live Blender filepath/scene before editing.
  Classroom work above is Three.js-generated, not a new Blender export.
- Historical scenes: `Instrument campus - GIS working layout`,
  `Entrance road and ground - photo draft`, `Website environment export`.
  Verify their current contents; old mesh/tree counts are not immutable.
- Keep original GIS reference separate from photo-guided authoring and runtime
  derivatives in this same file. Current interior task did not modify the master.
- GIS origin recorded as lon 83.323715, lat 17.728887, EPSG:32644. Old prototype
  driveway fall 0.9 m, ground depression 0.45 m and DEM apparent 6 m fall are not
  surveyed truth. Runtime regrading now also changes the exported landscape.
- Source local Y points out toward road. Source Z is elevation. Runtime maps
  local X to X, elevation to Y and local Y + 10.75 to Z. Verify registration in
  `blender/export-website-environment.py` and `context.md` before transforming.
- After source moves, activate source scene and update the view layer BEFORE
  reading `matrix_world`. Stale inactive-scene matrices once exported old positions.
- Match derivative objects by `source_object` custom property, not globally
  suffixed names. Move whole plants by deltas, accounting for baked geometry.
- One-time builder/migration scripts may refuse reruns. Never regenerate the
  whole master over current edits. Synchronize and export the existing scene.
- Pack resources; save to the same master. If temporarily suppressing `.blend1`
  backup creation, restore the Blender save-version preference afterward.
- GLB: `public/media/campus-environment.glb`; fresh exports go through
  `scripts/prepare-environment.mjs`. Pages limit is 25 MiB per file. Do not
  repeatedly recompress an already packed asset or destroy fine twigs for size.
- Preserve source foliage RGB/alpha. RGB+separate masks must combine correctly;
  wrong color-space handling darkened plants, missing masks made opaque sheets.
  A prior lossless WebP conversion lost RGB under transparent edges and was rejected.
- Preserve `_WIND` bend/flexibility/phase attributes and extras (`source_object`,
  `vegetation`, `tree`, `source_collection`, `wind_height`). Shader deformation
  must match shadows. Keep roots anchored and use max wind reach for clearances.
- Mesh simplification previously detached twigs into floating dark shards.
  Preserve connected wood and nearby leaves; current pending branch restoration,
  pruning and distance detail work must not be overwritten by an old export.

## 8. Realism and Performance Checks

- Correct silhouette, scale, topology and surface depth before adding stains.
  Keep furniture proportionate, aisles walkable, curtains folded, frames inset,
  real screen holes open, and lights/shadows consistent with the references.
- Use measured/observed surface variation, not uniform noisy grime everywhere.
  Current classroom finishes are procedural approximations, not photoreal scans.
  Remaining refinement includes wear, curtain fabric, bench proportions/counts,
  fixture spacing and matching reference-camera lighting. Do not call these final.
- Avoid coplanar faces, duplicate generic walls, accidental slits, floor clipping,
  floating roots and tangencies. Check reverse angles and exterior counterparts.
- Keep contrast and reflection detail without crushing interiors into black or
  washing rooms out. Test daytime/night/rain and transparent/reflective materials.
- Do not show/hide lights every update: pending performance work keeps intensities
  at zero when off, avoiding material recompilation freezes on Intel UHD.
- Preserve batching, tree distance detail, reduced motion, adaptive-resolution
  recovery and panorama controls. No unmeasured performance claims.
- Measure frame time on the owner's real GPU, ideally on mains power with a quiet
  machine. Software WebGL is useful for correctness, not hardware FPS claims.
- Screenshots must be nonblank, correctly framed, free of UI overlap, with the
  intended assets and animation. A successful build alone proves none of this.

## 9. Verification at This Handover

Passed 2026-10-17:

```sh
npm run test:geometry
npm run test:interaction
node scripts/check-zfight.mjs --strict
npm run build
"/mnt/c/Program Files/nodejs/node.exe" scripts/check-classroom-browser.mjs http://localhost:5191
```

- Windows Chrome renderer reported ANGLE Intel UHD Direct3D11.
- Browser check sampled 501 positions on each of corridor, III and II routes,
  checked floor height/body clearance, desktop/mobile canvas pixels, overflow,
  fan motion and runtime/shader errors. All passed. This is not a full FPS test.
- Staged-only snapshot independently passed geometry and production build, so
  the classroom commit does not need the unrelated pending work to compile.
- Existing Three.js >500 kB chunk warning remains. Full site/environment/weather
  suites were NOT rerun in this final classroom pass. Older results are historical.
- Screenshots: ignored `artifacts/classroom-review/`, including II entry,
  pillars, teaching and benches, III entry/teaching/rear, mobile counterparts,
  corridor steps, corner, end-wall and II threshold.
- Browser checks import dev-only Three URLs. Do not run them against production
  unchanged. Startup/reflection work can take minutes; wait for completion.
- Run focused geometry checks after any level/door change, then the browser
  route checks. Tests check model relationships, not owner approval of accuracy.

## 10. Pending Changes: Do Not Lose Them

After `dc31849`, these tracked files still have unrelated local modifications:

```text
context.md
docs/stairs-terraces.md
public/media/campus-environment.glb
public/media/entrance-hall/east-boards.webp
public/media/entrance-hall/west-boards.webp
scripts/check-birds.mjs
scripts/check-environment.mjs
src/ambience.js
src/architecture.js
src/batching.js
src/blender-environment.js
src/entrance-hall.js
src/main.js
src/puddles.js
src/sky.js
src/spine-interior.js
src/surroundings.js
src/terraces.js
src/west-wing.js
wrangler.jsonc
```

Local untracked work includes `.claude/`, `blender/IT_evnironment.blend`,
`blender/Terrain.blend`, `db/`, `functions/`, `docs/west-wing.md`, `handoff.md`,
mobile board WebPs, `scripts/check-regrade.mjs`, `scripts/check-zfight.mjs`,
`scripts/fetch-environment.mjs`, `scripts/restore-branch-detail.mjs`,
`src/regrade.js`, `src/seasons.js`, and `visitors-dashboard/`.

Do not stage or discard these just because they appear in status. The west-wing
file's committed version includes the approved base model and ceiling fix; its
remaining local ramp/ground changes belong to separate work. The same distinction
applies to the partial commits of architecture and main.

The pending tree/environment/performance/terrain/visitor work is described in
the older local `handoff.md`. Its old "everything uncommitted" and old geometry
test failure notes are superseded for the classroom files by this handover.
Visitor secrets are NOT in this document. Do not copy credentials into Git.
Do not mutate D1, deploy the separate visitor dashboard or production as part of
a classroom edit. New account authentication may need owner setup.

## 11. Continue Safely

1. Confirm repository/branch/status, local media availability and latest preview.
2. Read this file and the focused room documentation. Inspect rendered II and III
   against their videos; ask owner which remaining discrepancy matters first.
3. Preserve II-left/III-ahead topology, both three-riser flights, no II-III door,
   restored rear room, no Class IV flanking windows, and approved meshed screens.
4. Densify II video review and refine confirmed details; do not silently promote
   estimated counts/dimensions to fact. Avoid unrelated environment alterations.
5. Make scoped edits, test, review screenshots, update this handover with evidence.
6. Stage only authorized changes. For partial files, inspect the staged version:
   filtering zero-context patches once misplaced a fan update outside `animate`.
   Use contextual hunks and test a staged-only snapshot before committing.
7. Commit and push only after checks. Existing preview command:
   `npx wrangler pages deploy dist --project-name instrument-cinematic --branch moon-review --commit-dirty=true`.
   A working-tree deployment can contain pending changes beyond the commit;
   record that clearly. Check `functions/` and current configuration because they
   are part of the existing preview. Never erase live pending features accidentally.
8. Verify HTTP response and new asset fingerprint, not just the CLI success line.
   Give the owner the preview URL and exact commit(s), and state test limitations.
9. Do not overwrite old handoffs or user work to make the tree look clean.

## 12. Suggested First Message to the New Codex Account

"Open C:\Users\Dileep\instrument-cinematic and read CODEX_HANDOVER.md first.
Inspect Git status without reverting or staging existing changes. Continue the
photo/video-faithful Class II and III reconstruction using the local references.
Preserve all latest owner-confirmed geometry and the approved corridor screens.
Review video chronologically and compare matching render viewpoints before edits.
Separate observations from estimates, test clearances and desktop/mobile renders,
and show me the result before making further uncertain layout changes. Keep the
single Blender master, preserve wind/performance work, and commit only authorized
files after verification. Do not publish raw reference media."
