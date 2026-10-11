# Campus Terrain Working File

Open `campus-terrain-working.blend` in Blender. This is a separate environment
study; the approved website building, camera controls and deployed preview are
unchanged. `IT_evnironment.blend` and the pre-existing asset library are untouched.

## Scenes

- **Instrument campus - GIS working layout**: 600 x 600 metre elevation mesh,
  39 road ribbons and 82 OSM footprint/line references. Road widths without OSM
  width tags are estimates. Roads are draped onto the triangulated ground.
- **Entrance road and ground - photo draft**: entrance driveway with flared
  junction, adjoining mapped road alignment, white edges, kerbs, gate-pier
  placeholders, concrete apron, lower side paving and planted ground. The blue
  shape is a footprint registration reference, not the finished building.

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

Do not merge the two vertical surfaces or export them as an approved runtime
environment until the road junction, building registration and level differences
have been checked. The unmodified GIS reference is retained for comparison.

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

Both scripts are intended for a fresh working file. Save copies before rebuilding
after manual edits. BlenderGIS preferences are restored after the temporary CRS
registration; no permanent add-on settings are changed.
