# Campus Terrain Working File

Open **`campus-terrain-working.blend`** in Blender. This is the single master file
for all environment work, with collections and scenes inside it, not alternate
working-file copies. The approved website building and camera controls are
unchanged; the website landscape now uses this master. Existing `IT_evnironment.blend` and `Terrain.blend` files
are untouched. Textures are packed into the master file.
The packed file is stored with Git LFS; fresh clones need `git lfs pull`.

## Scenes

- **Instrument campus - GIS working layout**: 600 x 600 metre elevation mesh,
  39 road ribbons and 82 OSM footprint/line references. Road widths without OSM
  width tags are estimates. Roads are draped onto the triangulated ground.
- **Entrance road and ground - photo draft**: entrance driveway with flared
  junction, adjoining mapped road alignment, white edges, kerbs, open metal
  gates, concrete apron, lower side paving and planted ground. The blue
  shape is a footprint registration reference, not the finished building.
- **Website environment export**: reduced, textured derivatives of the actual
  photo-draft meshes, registered to the website building. This is an export scene
  inside the same master, not another working file.

## Environment Pass 01

- Four environment collections hold vegetation, ground cover, gate details and
  review cameras/daylight. These extend the existing photo draft in place.
- Fourteen textured trees share two source meshes. They are visual proxies,
  not surveyed locations or confirmed campus species. Detailed source geometry
  is for Blender authoring, **not yet suitable for direct browser export**.
- Ten thousand small Bermuda grass clumps are combined into one textured mesh,
  avoiding the roads, side paving, apron and tree roots.
- Asphalt and leaf-litter ground use 1K color, normal and roughness textures.
  Foliage uses standard Principled shaders with texture alpha, not solid cards.
- Open gates sit beside the drive. Piers are moved to the narrow throat before
  the flare, roughly 25.61 m from the proposed entrance, so they do not overlap
  the road surface. Gate placement, dimensions and materials remain estimates.
- Three cameras: `Environment overview`, `Entrance approach - eye level`, and
  `Lower courtyard - eye level`. Daylight is for review, not runtime lighting.
- GIS and environment checks pass. Root and gate clearances are checked; this
  is not an exhaustive collision test of every leaf. Road join error remains 0.
- Before website integration: confirm registration/levels, bake portable ground
  materials, create tree LODs, and test frame time with existing pano controls.

## Courtyard Planting Pass 02

- Added three pink flowering shrubs and three green understory groups, including
  low growth around the slender facade tree. Flower clusters use folded bract
  geometry on textured leaf sprays, supported by tapered woody stems.
- Added a narrow facade-side tree and a broader forked entrance-side tree,
  bringing the total to 16 trees. They reuse the existing textured tree mesh.
- Added the low weathered tree-bed edging seen beside the entrance and a
  `Facade planting review` camera. Existing terrain levels remain unchanged.
- This is photo-guided planting, not a botanical identification or a survey.
  The pink shrub is a visual proxy, not a claim of an exact bougainvillea model.
  Final canopy clearance against the detailed building awaits registration.
- The new shrub leaves and blooms are checked against the road surfaces and
  building footprint. All referenced textures are packed in the same master.

## Coordinates and Accuracy

- WGS84 origin: longitude **83.323715**, latitude **17.728887**.
- Projected CRS: **EPSG:32644**, WGS84 / UTM zone 44N, metres.
- OSM department footprint: way **509878600**, named Instrumentation Engineering
  Department. Its record was last edited in 2017; compare against current photos.
- GIS scene Z is elevation minus **62.5544503 m**, the sampled origin elevation.
- Photo-draft scene Z=0 is the proposed entrance paving datum, **not** the GIS
  vertical datum. Its XY coordinates match the GIS scene.
- The terrain is sampled on a 10 m grid from regional elevation tiles. This is
  interpolated spacing, not a claim of 10 m survey accuracy. Tree canopy,
  buildings and source age may affect the elevation surface.
- The raw DEM suggests about 6 m descent near the proposed entrance-to-road
  axis. That has **not** been accepted as the actual driveway grade.
- The photo draft uses a provisional **0.9 m driveway fall**, **0.45 m side-ground
  depression**, **0.14 m kerbs**, **5.3 m drive width**, and **6.5 m road width**.
  These are editable estimates, not measurements or heights inferred precisely
  from photographs. The proposed entrance axis needs visual confirmation.

Do not merge the two vertical surfaces. The runtime uses the photo-based grading;
the unmodified GIS reference is retained for comparison. Levels remain provisional
until measured on site.

## Rear Canopy and Wind

Pass 03 adds seven ground-rooted trees outside the rear and side wings, using
the existing two shared tree meshes. Compound-leaf crowns extend toward the
tank terrace; broadleaf crowns form the denser screen beside the AC terrace.
References: `20260928_105519.jpg`, `20260928_105754(1).jpg`, and
`20260928_110004.jpg`. Species are visual proxies, not botanical identification.
The master still contains a footprint placeholder, so precise crown clearance
against the detailed building and tanks must be verified during registration.

Website wind uses live speed, direction and gust readings with slow canopy bend
and independent tip-weighted leaf flutter. Calm wind settles and reduced-motion
mode disables movement. The shader now runs on the exported Blender trees,
shrubs, blooms and grass, replacing the old procedural website planting.

## Website Integration

- `Website environment export` contains all 23 trees and the authored terrain,
  drive, road, kerbs, gates, shrubs and ground cover. Tree leaves and wood have
  separate simplification budgets so thin leaf sprays survive reduction.
- `_WIND` is a vertex attribute: normalized bend, leaf flexibility and phase.
  Roots stay anchored; the runtime adds world-space bend and leaf flutter on the
  GPU, including the matching shadow deformation. No baked animation is needed.
- The source photo-draft meshes remain unchanged. The export maps its entrance
  axis to website +Z, with the drive starting at Z=10.75 beside the pink apron.
- The website trims exported plant triangles against the approved building and
  tank volumes with clearance for maximum wind excursion. It does not replace
  or remodel the building to fit vegetation.
- The 2026-10-12 WhatsApp videos confirm flowering shrubs on the **right** of
  the driveway when facing the main entrance. The three flowering groups and
  two adjoining green shrubs were moved together in both authoring/export scenes;
  the small understory at the left facade tree remains there.
- Embedded textures are capped at 1024 pixels; Draco geometry compression and
  shared tree meshes keep the GLB within the hosting asset limit. A distant
  ground continuation lies below, not over, the authored local terrain.
- Export the existing export scene as GLB to `public/media/campus-environment.glb`
  with extras, custom attributes, applied modifiers and Draco enabled. Then run
  `node scripts/prepare-environment.mjs`. On a fresh checkout, unpack the master's
  grass/shrub source textures into their existing `blender/sources/` paths first;
  the packer combines their original color and alpha without changing color space.
  The Python export script constructs
  derivatives once and refuses to duplicate an existing export scene.
- Verify using `npm run test:environment`, `node scripts/check-wind.mjs --browser`,
  and the interaction and geometry regression suites. Browser checks require
  the development server on port 5190 and the configured Playwright Chromium.

## October 12 Video Forecourt Correction

`correct-video-forecourt.py` was applied to the existing authoring/export scenes,
not to the raw GIS reference. It refuses to apply twice. The entrance drive now
widens toward the porch; its campus-road junction and provisional downhill grade
are retained. The videos do not establish measured elevations or justify a
global left/right reflection of the whole terrain.

The continuous pale 40 m draft apron was replaced by textured facade-side paving
around the existing tiled porch. The lower left paving now lies inside the left
wing's courtyard, not beyond that wing. Both near-building courts have exposed
earth and open road access; kerbs begin at the planted verges. Flower groups now
follow the right kerbed edge at local XY (4.3,8.6), (5.6,10.2), (4.4,12.1), with
stems/blooms moved together. These are video-guided estimates pending user review.
Tree roots and grass follow the revised local surface; wind attributes remain.

The rough grey paving reuses packed aggregate maps; no untextured bright draft
sheet spans the entrance. The browser regression samples both earth courts,
the driveway flare, inner left paving, flower strip and textured apron. The
round masonry feature visible near the flowers is not yet modeled.

## Sources and Attribution

Retrieved 2026-10-11:

- OpenStreetMap contributors, ODbL: <https://www.openstreetmap.org/copyright>.
  Footprint: <https://www.openstreetmap.org/way/509878600>.
  Principal Office Road: <https://www.openstreetmap.org/way/509848677>.
  Raw download: <https://api.openstreetmap.org/api/0.6/map?bbox=83.316,17.724,83.329,17.734>.
- Mapzen / Tilezen Terrain Tiles on AWS:
  <https://registry.opendata.aws/terrain-tiles/>.
  Tile URLs: `https://s3.amazonaws.com/elevation-tiles-prod/terrarium/14/11984/7371.png`
  and the adjacent `7372.png`.
  Encoding and source attribution:
  <https://github.com/tilezen/joerd/blob/master/docs/formats.md> and
  <https://github.com/tilezen/joerd/blob/master/docs/attribution.md>.
- User photographs: `Entire building.jpg`, `Central/Road from the main door.jpg`,
  and `Left/RUIDbda25da3be3443d5bafdc3c6c7e9dfd6.jpg`.
- Powered by Poly Haven, [CC0 asset license](https://polyhaven.com/license):
  [Jacaranda tree](https://polyhaven.com/a/jacaranda_tree),
  [Island tree 02](https://polyhaven.com/a/island_tree_02),
  [Bermuda grass](https://polyhaven.com/a/grass_bermuda_01),
  [Shrub 03 foliage](https://polyhaven.com/a/shrub_03),
  [Asphalt 02](https://polyhaven.com/a/asphalt_02), and
  [Brown mud leaves 01](https://polyhaven.com/a/brown_mud_leaves_01).
  Local original downloads remain under ignored `sources/`; working geometry
  and textures are embedded in the single master `.blend`.
- Esri World Imagery was inspected as a temporary orientation reference only.
  No satellite imagery is packaged, committed, or exported in the working file.

## Reproduce

1. From the repository, run `node scripts/prepare-gis-elevation.mjs` against the
   two included raw elevation PNGs.
2. In Blender with BlenderGIS enabled, execute `import-campus-gis.py` with its
   `__file__` set to the script path. It creates a new scene and saves the working
   file. The script refuses to overwrite an existing scene of the same name.
3. Execute `build-entrance-layout.py` to create the separate local grading draft.
4. Execute `check-campus-gis.py` to check source coverage, geometry, road joins,
   finite coordinates, and closed slab modifiers. Results go to `gis/checks.json`.
5. With the three vegetation source libraries in `sources/`, run
   `node scripts/fetch-ground-materials.mjs` for the two verified ground sets.
6. Execute `build-environment.py` once in the same master file, then
   `check-environment.py`. The build refuses to overwrite an existing pass.
   Pack resources and save the master file, not another `.blend` variant.

Build scripts are for initial construction; subsequent hand edits belong in the
master file. Use Git history for previous versions instead of making alternate
working files. BlenderGIS preferences are restored after the temporary CRS
registration; no permanent add-on settings are changed.
