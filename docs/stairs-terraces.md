# Stair and terrace references

Sources are the user's September 28, 2026 photographs and local videos. The Samsung Quick Share URL returned HTTP 403; the two Strong Room photographs were subsequently supplied directly. No geometry was inferred from inaccessible content.

## Observations

- `094055`: paired ground flights lead to a common rear landing, then a central return to the first-floor front landing.
- `094920`, especially 12-30 seconds: the Library is in the front middle block. Its door is beside the classroom-wing entrance, not in the classroom corridor's rear wall.
- `110452` (194.74 seconds): the lower terrace grille entrance, corrugated canopy, small utility enclosure, brick pile, long roof strip, tanks and level change to the wider open roof.
- `111002` (30 seconds): the lower terrace perimeter, projecting concrete posts, condensers and overhanging trees.
- `111313` (111.83 seconds): the second-floor landing connects the terrace and opposite blue-door corridor; one side flight continues to the three-window landing and the central return reaches a blue roof-access door.
- `111652` (66.62 seconds): the blue door opens onto the upper roof, with a small change of level beside the stair enclosure.
- `112159` (198.47 seconds): two white tanks on round plinths, an empty circular base, a black upright tank, a disused tank on its side, perimeter pipework and standing water.
- Photographs `104806` through `112952` supplement those views. Original photos take precedence over the versions marked AI-generated content for foliage and visible geometry.
- The two supplied Strong Room photos show a solid, partly mauve wall section before three windows, tables along the window side, a clear walking strip, a right-side doorway and barred window, and the recessed terminal door.

Videos were sampled at 12 timestamps each with `node scripts/inspect-classroom-videos.mjs 110452 111002 111313 111652 112159 094920`. Contact sheets and individual frames remain in ignored `artifacts/classroom-video/`.

## October 8 Corrections

The opening sequences were additionally inspected at one-second intervals for `110452` (first 24 seconds) and `112159` (first 15 seconds), and two-second intervals for `111313` (first 48 seconds). The user's October 9 clarification corrects the earlier interpretation of the upper exit: the camera has already turned and moved to the corner, so the steps climb along the terrace, not directly out of the blue doorway.

- The user explicitly confirmed that the final side flight is on the terrace-gate side (world -X), with a low wall where the opposite flight stops.
- The ground side flights start at Z=.2 instead of Z=1.083333. Their inner parapets extend down to the floor, framing the blue-backed recess. Stored debris is omitted with the user's permission.
- All three rear window rows have three actual glazed openings.
- October 9: the lowest three-window row has its sill at 3.95, above the rear canopy fascia at 3.78. Frames and wall openings move together, retaining a visible masonry gap instead of intersecting the canopy.
- The lower gate is at 8.444, its outside strip at 8.11 and the broad classroom roof at 7.61. The roof junction has a capped vertical face alongside the steps, not a broad ramp.
- The blue roof threshold and outside apron are at 12.11. After turning along the enclosure, three steps at the east corner climb to 12.36. The far wing returns to 12.11. This .25 height change is half the .50 change on the classroom roof, as requested. Dimensions remain proportional estimates, not measurements.
- Duplicate front landing surfaces were removed; roof slabs stop before the descending steps. The headhouse retains a rectangular blank-sided form, blue corner strips and a gently pitched corrugated cover.
- Free exploration now rotates around the camera's eye, not the building centre. Wheel/zoom moves forward and back, right-drag pans, and the full-screen dark overlay is absent in exploration and walkthroughs. The default interior field of view is 68 degrees.

## October 9 Follow-up

- Panorama now exits the guided route at the current camera position; the walkthrough no longer overwrites free movement. The canvas receives keyboard focus. WASD and Q/E provide translation as well as wheel and right-drag controls.
- Upper side flights start at the preceding central return's endpoint, with the front landing connecting the turn. The ground twin flights are unchanged.
- Recess gates use blue painted ironwork, continuous masonry reveals, fitted frames and hinges. The later clarification below supersedes the initial terrace-gate swing interpretation.
- All nine rear windows have glazed casement shutters, handles and fixed blue grilles. The first row retains clearance above the canopy.
- The terrace-side enclosure and its canopy extend farther across the classroom-facing elevation. The upper headhouse is deeper, with an outward-open blue door onto a level apron. The east opening's lintel is below the apron, removing the exposed wall across the route.
- Ceiling fans have thin curved blades, rounded motor housings and ceiling cups rather than rectangular blades.

## October 9 Evening Corrections

- The terrace grille and classroom-wing doors are pushed from the stair hall toward the left wing. The roof-access blue door is hinged on the right when viewed from the terrace.
- Both terrace junctions have a straight raised face toward the building and a capped slope descending toward the open roof, following the October 10 clarification. The right raised face remains .25, half the left .50. The right profile begins at the original x=22 roof junction. Stairs extend to the parapet without a narrow coping stub alongside them.
- The left terrace has square concrete posts above the parapet and at the ramp/stair extremities. Placement follows the 110452 video frames at 106s, 141s and 194s and the supplied 105519 photograph; dimensions remain proportional estimates.
- The left cap terminates slightly inside the first tread: a .18 overlap covers only that tread's .35 run. Its existing height and slope, the supporting body, and the right terrace remain unchanged by this endpoint correction.
- Parapet bases follow the actual roof finishes; the right corridor no longer has an open slit underneath its parapet. Legacy parapets inside the headhouse walls are omitted, and the headhouse walls reach the apron.
- Structural roof slabs sit below their finish layers rather than leaving nearly coplanar exposed surfaces. Corrugated roofing has a less reflective finish.
- Passage tables stop before the corridor-junction pier, with clearance from the window wall and between tables.
- Free panorama and guided look use gentle frame-rate-independent easing. Regression tests cover pointer interruption, fixed-eye/no-roll behavior, monotonic settling and matching results at 30/60/120 Hz. Software-rendered browser tests verify dragging, mode switching and mobile layout, but do not establish frame rates on the user's hardware.
- Flying birds were removed at the user's request on October 10. Ambient calls still follow solar daylight and fade out at night.
- The utility enclosure and canopy end inside the terrace footprint. Its rear wall is inset from the rear parapet, its side wall has a small gap from the stairwell, and its entire base is supported by the terrace plinth.

Run `npm run test:interaction`, `npm run test:geometry`, and `node scripts/check-birds.mjs` for the focused regressions. Browser checks are `scripts/check-panorama-browser.mjs`, `scripts/check-birds-browser.mjs` and `scripts/check-terrace-fixes-browser.mjs` against the preview on port 5190.

## Modeling Boundaries

Stair heights match the existing model's storeys. Counts, widths, run lengths, roof fittings and relative positions are proportional estimates, not measured survey dimensions. The top flight is single-sided; lower flights are paired. Stair slabs have open undersides, and the fixed lower corner gates have real cavities behind them. Interior room contents not visible in the references are not invented.

The Strong Room approach is lengthened by one model unit inside the existing right-wing footprint; the building's outer length is unchanged. Rain shelter covers the enclosed stair head and the terrace canopy, but not the open roof surfaces.

`scripts/check-stairs-terraces.mjs` checks camera support, gate recess depth, the exterior-facing lock, roof shelter classification, desktop/mobile rendering, indoor panorama and field-of-view controls. `scripts/check-entrance-look.mjs` checks pointer direction and retention of the viewing angle while moving.
