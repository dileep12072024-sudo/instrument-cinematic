# Handoff — Instrument Technology campus site

Updated 2026-10-15. Read this first, then `context.md` (longer history) and `docs/west-wing.md`.

## Current goal

Build the **left (west) wing ground floor** part by part, exactly as filmed, and get the owner's approval for each section
before committing. The first section is built and on the preview, **not committed**:

- the three steps down at the end of the main west corridor and the landing,
- the lab double door ahead (open, lab glimpse),
- the front passage to the water cooler and folding gate,
- the dim rear corridor (lab doors, screens, clutter) and the washing bay at its end.

Preview: https://moon-review.instrument-cinematic.pages.dev/ (enter the hall, walk west).

## Reference video and photos

Never publish these files on the site (owner's rule: no raw photos or videos on the site).

**Video**
- `C:\Users\Dileep\Pictures\20261014_110415.mp4` — 178 s walkthrough, 14 October 2026, 11:04. Already sampled at about
  1 frame per second end to end; route and timestamps are in `docs/west-wing.md`.

**Photos (owner, 15 October 2026)**

| # | What it shows | File |
|---|---|---|
| 33 | Dim corridor: grilled doors left, screens and grilled door right, screened end wall | `C:\Users\Dileep\Downloads\RUIDb54f8e998eca46c695dec4b74b251b30 (1).jpg` |
| 34 | Grilled courtyard door beside a screen panel (right wall) | `C:\Users\Dileep\Downloads\RUID62fb111ca0ba4c55a5dbec37acd6cbb6 (1).jpg` |
| 35 | Right wall: screen panels with a grilled door between | `C:\Users\Dileep\Downloads\RUID5fd21fabf93341eea2e37fce17215b3c (1).jpg` |
| 36 | Near the junction: pier, table with steel vessels, corridor beyond | `C:\Users\Dileep\Downloads\RUIDd458021cf085408580a957b0de890b8e (1).jpg` |
| 37 | Junction: dim corridor left, pier and steps up to the garlanded OFFICE door right | `C:\Users\Dileep\Downloads\RUIDae031c66658e45b9819ba1fe55f278db (1).jpg` |
| 38 | Dim corridor from the junction: fuse boxes, Industrial Instruments Lab, ladder, box | `C:\Users\Dileep\Downloads\RUIDb9c041dad4124279ae844f7d71bcf33f (1).jpg` |
| 39 | Water cooler front (Divis), screen above, plywood board | `C:\Users\Dileep\Pictures\west-wing-2026-10-15\water-cooler-front.png` |
| 40 | Water cooler beside the folding gate on its low wall | `C:\Users\Dileep\Pictures\west-wing-2026-10-15\water-cooler-and-gate.png` |
| 41 | Behind the cooler: pipes, tap, plywood boards | `C:\Users\Dileep\Pictures\west-wing-2026-10-15\cooler-pipes-and-plywood.png` |

Photos 39–41 were pasted into the chat; they were copied to the folder above so they are not lost.

## Files modified (all uncommitted; last commit `e5ffa47`)

**West wing (this section)**
- `src/west-wing.js` (new): the whole ground-floor passage; `westWing` constants.
- `src/architecture.js`: calls `buildWestWing`; west wing slab and plinth lowered and hollow; the generic ground-floor wall
  facing the passage is skipped; screened end bay; west gate opens onto the passage; corridor slab and plinth stop at the
  top step.
- `src/spine-interior.js`: the west corridor floor stops at the top step.
- `src/regrade.js`: earth inside the west wing footprint sits below the lowered floor.
- `docs/west-wing.md` (new): video route, timestamps and what is estimated.
- 2026-10-15 second pass (full video + photos 33-41 re-read): doors moved and re-detailed (open folded-back lab
  leaves, Control Systems gate open, one-leaf grid gate on the east door), AU monogram in the screens, recessed panel
  surrounds, high windows, two barred windows, one flat ceiling to the washing bay, modelled water cooler (photo texture
  deleted), solid pier beside the folding gate (`architecture.js`), bay screen 2.4 m high, kolams, clock, extinguishers,
  lab glimpse rebuilt; earth under the landing lowered (`regrade.js`).

**15 October pass (also uncommitted, also on the preview)**
- `src/regrade.js` (new): ground regrade, earth clamped under roads, ground continuation at the model's edge,
  rectangular concrete slabs.
- `src/seasons.js` (new): seasonal leaf thinning and fallen leaves (`?month=3` previews March).
- `src/batching.js`: `resolveCoplanar`, the flicker fix.
- `src/blender-environment.js`: pruning of floating branches and leaves; seasonal thinning; ground continuation.
- `src/surroundings.js`: left tree back in the porch corner; square right planter on the door line; pink shrub box; bank
  shrubs; sapling bed.
- `src/terraces.js`: slot beside the terrace steps closed; slope kept.
- `src/puddles.js`: wind ripples and roughness; shared grid rasteriser.
- `src/ambience.js`: birdsong in phrases (dawn and dusk chorus, quiet in wind, rain and at night).
- `src/entrance-hall.js`, `public/media/entrance-hall/*-boards.webp` and `*-boards-mobile.webp`: 2x board crops on
  desktop, the lighter crops on phones, per-board finishes.
- `src/main.js`: wiring for the above.
- Checks: `scripts/check-zfight.mjs` (new), `scripts/check-regrade.mjs` (new), `scripts/check-birds.mjs`,
  `scripts/check-environment.mjs`.
- Docs: `context.md`, `docs/stairs-terraces.md`.

**Not ours, do not touch:** `blender/IT_evnironment.blend`, `blender/Terrain.blend`, `scripts/fetch-environment.mjs`.

## 2026-10-16 pass: speed, trees, terrain, rain (on moon-review, uncommitted)

Measured on the owner's Intel UHD (real off-screen Chrome, see memory "real-gpu-measurement"):
- Opening scene 13 fps with an 8 s freeze after loading -> steady 30 fps (p50 33.3 ms), no freeze. GPU 44-56 ms -> ~26 ms.
- Freeze cause: lights were hidden/shown (moon, lightning, entrance, hall lights). Every change of the light count rebuilt
  every material's shader. Lights are now never hidden, only dimmed to 0 (`main.js`, `sky.js`). Do not hide lights.
- Trees (`blender-environment.js`): BatchedMesh per material, one instance per tree (frustum culled), 4 detail levels
  by distance (leaf cards thinned and grown; wood vertex-clustered), Lambert for wood and leaves.
- Full-detail trunks/branches restored into the GLB (`scripts/restore-branch-detail.mjs` from git 922b5b7): the old
  meshopt pass had collapsed twigs into floating dark shards. `pruneDetached` rewritten (pieces must still reach the
  trunk; leaves must keep wood about as near as before trimming).
- Draw calls 547 -> ~305: west wing fittings drawn only within 30 m; small parts (<1.2 m) skipped below ~8 px;
  gate iron and sheds merged. Draw-call count, not pixels, made every few frames late (p90 50 ms).
- Textures uploaded and the scene drawn in six directions behind the loader (first-turn hitches in the panorama).
- Adaptive resolution jumps once to its estimate (each resize stalls ~0.15 s).
- Terrain (`regrade.js`): earth outside the west wing held at plinth level (building no longer floats); earth inside
  the lowered wing clamped under its floor; road/slab undersides no longer dig trenches (rasterize `top`).
- Porch base slab sunk into the ground (no gap under the kerb end); right slab 5 mm under the pink tiles (flicker).
- West wing: steps full corridor width, corridor skirting stops at the top step, corner pier reaches the landing.
- Rain (`puddles.js`): water runs downhill on concrete/asphalt (flow map from the grading), drops land at new random
  spots every time, puddles collect in low points in heavy rain; nothing on vertical faces.
- Owner confirmed (2026-10-16): three steps down from the hall into the west corridor at the gate, three more at the
  office junction. `westWing.corridor` = hall - 0.54, `westWing.floor` = hall - 1.08. Steps at x -4.0..-4.6.
- West wing screens now use the facade's own block screen (`concreteScreenParts` in architecture.js); east screens sit
  1.15-3.0 above the wing floor so their sills clear the courtyard earth outside. Courtyard door: sunken well with steps
  (estimated, not filmed outside). Ground inside the wing/corridor/well is discarded in the ground shader (puddles.js).
- Owner, 2026-10-16 (screenshots 47-49): junction steps end flush with the screened wall (stepsTop -21.56); the west
  gate is full passage width on a 0.8 dwarf wall, 1.55 tall (frame 57), the pier is gone; D C S LAB door on the west
  wall at the gate corner (frame 57); left terrain low-lying: earth around the wing lies at its floor, rising to about
  -0.15 along the front (regrade.js); wall plaster continues down to it; the wing's east exterior keeps facade plaster,
  blue pilasters, storey trim and band (the upper floor looked cut off); east screens 0.5-2.6 above the floor (photos
  33/35); RO purifier modelled (blinking lamp, display, dispenser, hoses). Courtyard door well removed (earth is low).
- Owner, 2026-10-16 (later): the wing floor is sunk below the terrain; the earth outside lies at the gate sill
  (`westWing.sill`, floor + 0.77) all round, at `westWing.courtyard` (floor + 0.45) on the rear courtyard; the base
  wall under the gate is the building's plaster wall; three steps up outside the courtyard door. Lab clock shows real
  IST. Rain: puddles only in hollows and stable low spots (muddy on soil, clear on paving), wet ground matt-dark.
- Superseded the same day (owner, screenshot 52): no wall under the west gate; the gate reaches the floor; the whole
  ground storey of the west block (walls, screens, windows, gate) is sunk with its floor (`sunk` in architecture.js
  face()); earth all round the wing is level with the floor (`westWing.ground`), sloping smoothly beyond; beside the
  left slab the earth is left free so it slopes from the slab's edge. Courtyard door: plain threshold.
- White sheet propped against the lower gate (owner: the grey band in photo 40 is a sheet, not a wall). Water
  machines work: tap/click (not drag) within 8 m starts a 3.2 s pour (main.js raycast on invisible hit boxes,
  `userData.dispensers`); purifier display redraws live (TDS, DISPENSING); glass fills, emptied 4 s later; pour
  sound and machine hum near them (ambience.js `pour`, `machine`). Cooler tap bay was buried in its carcass: fixed.
- Left terrain (owner photos 54-56, 2026-10-16): flat plain at the west gate level (westWing.ground), left slab 0.1 above it; porch base runs down to it (PLAIN in regrade.js), banks
  ~2.5 m wide down from the driveway/main road, slope down to the west gate (ground = wing floor). Left slab lowered to
  the corridor level; the west corridor's front facade ground storey is sunk with its floor (`sunk` in face()).
- Left terrain (owner photos 54-56, 2026-10-16): flat plain at the west gate level (westWing.ground), left slab 0.1 above it; porch base runs down to it (PLAIN in regrade.js), banks
  ~2.5 m wide down from the driveway/main road, slope down to the west gate (ground = wing floor). Left slab lowered to
  the corridor level; the west corridor's front facade ground storey is sunk with its floor (`sunk` in face()).
- Deploy copies must use `git diff HEAD` (the classroom session stages files in the index).
- Speed: with live rain and a busy laptop (360 tool, dllhost) both deployed and current builds run ~20 fps; earlier
  quiet runs gave 30. GPU ~28 ms at 0.8 resolution, render() CPU 20 ms (was 10): machine load, not the scene.
- Speed checks: measure on mains power only. On battery (Balanced plan) the same build drops from 30 to 20 fps.
- `check-building-clearances.mjs` fails on the Class III door sign position: from the parallel classroom work, not this pass.

## Visitor list (added 2026-10-15, live on moon-review, uncommitted)

- `functions/api/visit.js` records anonymous visits; `functions/api/visitors.js` shows the private list at
  `/api/visitors?key=<VISITOR_KEY>` (secret set for preview and production with `wrangler pages secret put`).
- Cloudflare D1 database `instrument-visits` (binding `VISITS` in `wrangler.jsonc`, schema `db/visits.sql`). One row
  per device (random ID in the visitor's localStorage), one per visit (tab session, 60 s heartbeat). No names, no IPs.
- The site's About dialog says anonymous visit statistics are kept. Local dev and automated tests are not recorded.
- Past visits before this cannot be recovered. Production (`instrument-cinematic.pages.dev`) records only after it is
  deployed with this code (owner approval needed). Deploys must copy `functions/` next to `dist`.

## Visitor dashboard (separate site)

- https://instrument-visitors.pages.dev/ — Pages project `instrument-visitors`, source in `visitors-dashboard/`
  (`public/index.html`, `functions/api/data.js`, `label.js`, `_auth.js`). Reads the same D1 database.
- Sign in with the private key (secret `VISITOR_KEY`, also set on this project); stored in that browser only.
- Live: refreshes every 10 s; the campus site sends a heartbeat every 30 s, so "online" means seen in the last 75 s.
- Owner can name devices ("Ravi's phone") and mark their own devices to hide them.
- Deploy: `cd visitors-dashboard && npx wrangler pages deploy public --project-name instrument-visitors --branch main`.

## Design decisions agreed with the owner

- **Build real 3D in three.js, not photos stuck on models (owner, 2026-10-15).** The owner filmed the videos at slanting
  angles on purpose so depth and form can be read for modelling. Use photos and videos only as references for geometry,
  proportion, colour and wear, never as textures pasted onto surfaces. Generated (procedural/canvas) textures are fine.
  Existing photo-based pieces to replace with modelled ones: hall boards and notices (`west-boards.webp`,
  `east-boards.webp` and their `-mobile` versions, `environment-notice.webp`, `department-notice.webp`), the water cooler
  front (done 2026-10-15: modelled), and the photo-derived plaster relief (`plaster.webp`).
- Work part by part. Owner checks the preview, then says whether to commit. Ask the owner to refresh after every deploy.
- Build exactly as filmed. State what is observed and what is estimated; never invent dimensions or present them as
  surveyed.
- Never show raw photos or videos on the site; only small perspective-corrected crops (boards, cooler front).
- No compromise on speed, smoothness or quality. Measure on the owner's real GPU (scripts in
  `C:\Users\Dileep\AppData\Local\Temp\ic-gpu\`), and check desktop and phone without being asked.
- Deploy from a clean copy (git worktree of HEAD plus our diff), to `moon-review` only.
- The left terrain is low-lying. The right concrete slab is level with the pink porch tiles; the left slab is lower and
  stops short of the porch. Both slabs are plain rectangles from the screen wall to the pink tiles' front edge.
- The left forked tree stays in the porch corner; the right tree stays in a **square** brick planter in line with the
  wooden doors.
- Terrace: keep the sloped cap at the left junction; only openings get closed.
- No coplanar faces of different materials (flicker); `check-zfight.mjs --strict` must pass.
- Birds are not a constant loop; everything follows the live wind and rain; trees change with the seasons.
- No debris, no animated birds. Keep Blender master `blender/campus-terrain-working.blend` untouched.
- No third-party online processing of the owner's photos or videos (the Hugging Face idea was declined: privacy, and it
  would not speed up the site).

## Next steps

- [ ] Replace the photo-textured pieces listed under the design decisions with modelled three.js geometry: board frames,
      panels and lettering as real or generated text, the cooler as a modelled cabinet with taps, cups and panels.
- [ ] Owner walks the new west wing on the preview and lists what doesn't match the video, section by section.
- [ ] Fix those differences: door positions and spacing, screen panel sizes, the step height, clutter placement.
- [ ] Once approved, commit the west wing and the 15 October pass (stage only our files; keep the three files above out).
- [ ] Re-run `scripts/check-entrance-hall.mjs` on a quiet machine. It timed out at page load while Windows `dllhost.exe`
      and the 360 security tool (`QHSafeTray`) were busy; restart Windows or pause 360 first.
- [ ] Next wing sections: the main west corridor's boards (OFFICE, notices, time table, red box, shelf), its whitewashed
      ceiling and tube lights, the tinsel garlands, and the notice papers on the screens.
- [ ] Then the room interiors behind the doors, as the owner supplies footage.
- [ ] Owner may later choose: the right terrace junction (still a raised cap), a building-wide taller ground storey (the
      real hall is about 4.4 m high, the model 3.6 m), and crisper wall detail as the contrast upgrade.
- [ ] Purge the old raw-file URLs from Cloudflare's edge cache (owner's dashboard; e.g. `/media/campus.mp4`, and `/media/west-wing/water-cooler.webp`, removed 2026-10-15 but still cached).
- [ ] Full headless suite (`check-site.mjs`) hung for 20 min in software WebGL with WSL near its memory limit on
      2026-10-15 and was stopped; re-run on a quiet machine. Real-GPU renders and `check-zfight --strict` passed.

## Owner's queue (2026-10-17) - work strictly in this order, one section at a time, perfect before moving on
1. West wing: tube lights and fans working, switchboards where the references show them.
2. Upstairs classroom windows: remove the duplicate outside windows (added 273a5ad/32bb8c0); no glass in the
   building is transparent - translucent patterned (frosted) glass.
3. Classroom-wing corridor exactly as the videos/photos incl. text: library-wall black text plates
   (Internal parts/20260928_094701.mp4, Videos/Wall of Library), ground-floor hall boards rebuilt in three.js
   (no photo stickers), calendar text, the water filter near it; Internal_2/20261013_130612.mp4 door names;
   a door (not a wall) at the end of the classroom corridors.
4. Class IV (Videos/Class IV.mp4): doors, textures etc. exactly.
5. East wing corridor (Videos/20261014_111121.mp4, photo 20261014_110743.jpg); ground floor: seminar hall's
   second door goes after the window (move the door, not the window).
6. West wing: all room doors and windows closed; glazed windows -> lab-door wood, closed.
7. West block ground-floor facade bay (owner image 69): add the same windows as its neighbours, closed; leave the others.
8. Switchboards in the right places; everything functional (the site becomes a game: avatars interact).
Context: two layers planned - portfolio layer (motion graphics) and virtual exploration (game, user avatars);
building the exploration layer now.

## Progress, 2026-10-17 evening (section 3)
- f6f2d61 library-wall granite plaques (three.js, exact text), landing tiles, conduits, DEPARTMENT/LIBRARY notice.
- 0ebaaec hall boards drawn in src/hall-boards.js (photo atlases removed except the anti-ragging poster's printed photos).
  Hidden letters left out; list in docs/entrance-video.md. Owner to supply the missing names.
- 456790e Divi's water cooler panels: real lettering + printed pictures (calendar = the landmark near it; its face is never visible).
- 3ffae80 side-passage end door, Class IV IV YEAR paper + STRONG ROOM board, wall phones, faculty blade signs (real names).
- Open for owner: Class II/III doors are open in the model, closed in the 130612 video; stored furniture before the end door omitted;
  the washing-bay "AquaPure" RO unit carries invented branding (no source to read it from).

## Progress, 2026-10-18 (owner's six-point list + images 72, 73)
- 094e085 corridor room doors closed, girls' washroom door, switch boxes off the windows, Strong Room windows, seminar door at z -8.3.
- 5dc4b65 Class IV interior (src/classroom-four.js); its outer windows lowered to classroom sills like Class II/III.
- 1c945fc first-floor east corridor + wing passage (src/first-floor-east.js); round-hole screens on that floor's facade.
- e29f7ed west wing: washing-bay screen full height, table/grille overlap, Control Systems boxes, all windows timber, doors shut.
- 7eaa97a perf: room fans/switches drawn only from inside. Draw calls ~382 at the arrival view; 15-20 fps on battery.
- Open: queue item 8 (switchboard positions everywhere per references); first-floor wing passage west wall shows the
  existing facade windows where the video shows a teal wall then screens; north stub end-door and lab-door plate text unreadable.

## Progress, 2026-10-18 (second list: images 74-76)
- ae37d4e stair half-landings reach the rear wall (0.6 m slot closed); stair-top roof = corrugated sheet on brown purlins,
  blue steel roof door shut, top windows without grille (111313); second floor east junction (plain, coffee-brown doors,
  first-floor-east.js level 2); second floor wall + white door over the library door (terraces.js).
- a2197e2 Bermuda grass drapes per vertex over the regraded earth (was floating up to 1 m on the left plain);
  door hardware from refs 75/76: P.padlock, P.aldrop, P.hardware() materials, knurled handles and tower bolts in panelLeaf.
- Not done: debris in the stair-top room (owner said avoid); switchboard placement pass (queue item 8) still open.
