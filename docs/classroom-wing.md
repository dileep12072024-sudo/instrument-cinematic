# Upstairs Classroom Wing

References supplied by the user on 2026-10-04, all from `Pictures/Internal parts`.
The user confirmed that "right side" means **turn right when arriving upstairs**,
not the right wing when looking at the front elevation. With the existing model's
return stair facing the entrance, this maps to the west/negative-X upstairs wing.

## Observations

- `20260928_094055.mp4`, 0-29s: twin dark-stone stair flights, solid plaster
  parapets, blue-backed central storage recess and rear landing windows.
  35-64s: returning flight, upper landing and wall plaque.
- `20260928_094701.mp4`, 0-4s: CLASSROOM WING transom, narrow open entrance
  leaves, patterned windows to the left and room fronts to the right.
  7-20s: stairwell and a different grilled passage across the landing.
- `20260928_094920.mp4`, 12-30s: Library door beside the classroom entrance;
  the grilled passage is distinct from this doorway.
- `20260928_103154.mp4`, 0-60s: continuous classroom corridor, stone floor,
  sliding windows in front of pierced concrete screens, exposed conduits, ceiling beams and lights.
  72s: terminal door label is CLASS ROOM - III, with a small glazed pane and bolt.
  84-132s: perpendicular side passage, doors on the left, windows on the right,
  worn lower wall, contrasting floor bands and stored furniture at the far end.
- `20260928_103849.mp4`, 0-9s: three risers on the return toward the main
  corridor; 14-51s confirms the reverse window/door arrangement and upper landing.
- `20260928_103238.jpg`: closer view of the Class Room III approach, left-hand
  windows, ceiling beam, tube light, wall condition and veined stone finish.

## Limits

Lengths, heights and opening positions are proportional estimates, not surveyed
measurements. The preview starts at the upstairs landing; the existing stair
flights have not been rescaled to invent a traversable connection. Unseen room
interiors and illegible room names are not invented. Closed classroom fronts
stand in for filmed open doors until interior references are available.

The two closed under-stair corner gates follow the user's explicit location
confirmation; the view partly obscures their depth and bar pattern. Their narrow
frames remain separate from the open ground-floor wing entrances.

`node scripts/inspect-classroom-videos.mjs` generates timestamped contact sheets
and reference frames in the ignored `artifacts/classroom-video` directory.

## October 12 Fix

The window wall moved 0.115 inward (centre local x=-0.985) to clear the West corridor's front facade,
whose blue pilasters and inner face had protruded into the corridor beside the entrance. The open
leaves now hinge on posts set at the wall faces. Conduits and skirting follow the inset wall; the far
side passage keeps its original wall line.

## October 14 Rebuild (photos 2026-10-13, clips 094701, 094920, 103154, 103849)

- Entrance: black steel frame; transom with a white panel and the CLASSROOM WING board;
  a fixed sidelight and one leaf (glass above, cream panel below, PUSH sticker) opened
  against the right wall. Library door: LIBRARY plate above its pane, DEPARTMENT LIBRARY
  board over the door.
- Main corridor: the facade wall's sliding windows show the cream concrete lattice with
  daylit lens-shaped holes through clear glass (not printed film); grey-brown linear-grain
  floor; green-and-cream star inlay across the corridor past the second door; the first two
  room doors stand open into the corridor (unlit rooms behind; interiors not invented);
  blank hanging name boards (real names not reproduced). No grilled windows on this wall.
- Side passage: brown-framed brass-grilled windows, electrical boxes with conduit drops and
  high niches on the door wall; light-grey square tile band and a darker band on the floor;
  lattice windows above the stained lower wall opposite. Its window wall sits 0.3 m inside
  the west wing's east face (that face and its blue pilasters showed through). Ceiling at
  7.22, below the west wing roof slab. The stored furniture was removed (no debris).
- Ceilings carry a faint emissive term: the references show bright white ceilings.

## October 15 Correction: Classroom Levels and Windows

The new `Pictures/Internal_2/20261013_130612.mp4` was inspected first as 24 chronological
timestamped frames, then cropped detail frames at 0, 31, 35, 55, 58, 62, 80, 107 and 112 seconds.
This is frame-based review, not continuous playback. The seven Downloads photos supplied with
it and older clips 094701 (1s), 094920 (17s), 103849 (0s and 5s) were cross-checked afterward.

- New video 0-26s: Class Room III straight ahead, with a lower junction and room to its left.
- 31-56s: the left-hand door is labelled Class Room II; 58s returns to the III door.
- 61-102s: the camera turns right into the perpendicular passage. Room doors and timber/brass
  grilled windows are on the left; aluminium sliding windows are on the right.
- 107-117s: sliding glass is separate from the thick pierced concrete screen behind it;
  Class Room IV / Strong Room is near the passage end (the numeral was corrected on recheck).
  Retain the no-debris decision.
- Photo `RUIDa39d8438ea004ddb9d1eb7ed6a94ac2f.jpg` and return clip 0s show **three** junction risers.
  `RUID780e661b996046de896ac6c392bd759a.jpg` shows the entrance is higher than the corridor.
- User clarification: match the ground-floor right-wing flight count and height difference.
  Both classroom flights therefore have three 0.18 m rises (0.54 m total), derived from
  `groundSpine.rightFloor - groundSpine.hallFloor`, not independent guessed constants.

Entrance landing remains 4.044 m, main corridor is 3.504 m, Class II/III junction and side
passage 2.964 m. Walking away from the entrance descends at each flight. World positions of
the wing and its entrance are unchanged. The two treads plus the adjoining landing provide
three closed risers; they are not three floating platforms. Floor slab/ceiling ownership and
the old tower lintel were adjusted only where they obstructed this descending passage.

The classroom now owns its front and return window openings. Retained blue exterior strips
sit outside the interior finish. Opaque emissive window pictures and duplicate generic facade
screens were replaced with one continuous, geometrically pierced screen per bay, with recessed
depth, aluminium tracks, handles and partly slid clear/tinted glass panes. Window sill/head
and pier dimensions share the actual frame boundaries, avoiding unintentional slits.

Room II is now modelled on the left wall at the lower junction; III remains ahead. Side-passage
plain doors and Class Room IV inspection pane match the provided photos. Fine dimensions and
bay spacing remain proportion estimates, not a measured reconstruction. No room interiors
or readable faculty names were invented. No raw reference photos/videos are shipped publicly.

Checks: `node scripts/check-building-clearances.mjs` tests both flights across their width,
closed risers, unobstructed lower floors, real window holes and existing terrace/door regressions.
`node scripts/check-classroom-browser.mjs` checks route eye height, desktop/mobile rendering
and runtime errors; captures go only in ignored `artifacts/classroom-review/`.

Verified October 15: both geometry scripts, panorama/walk interaction unit checks, hall-side-wall
regression and production build pass. Browser checks pass for 501 route positions and nonblank
desktop/mobile views with no runtime/shader errors. Screenshots were inspected at the entrance,
main corridor, three-riser junction and side passage. Closed the ceiling-height transition and
floor seam at the turn; narrowed the old blue exterior trim to prevent an interior protrusion.
These software-rendered checks do not establish real-GPU frame rates or survey accuracy.

## October 15 Recheck: Three Classrooms, No Terminal Door

The owner clarified that the brown panel at the far end is stored against the wall with
discarded furniture, not a doorway into a fourth classroom. Re-extracted the October 13 clip
at 0, 12, 24, 32, 44, 56, 64, 72, 80, 88, 96, 104, 112 and 117 seconds, then compared the supplied
corridor photos. The 117-second close-up clearly reads **CLASS ROOM - IV**, not I. The three
identified classroom entrances are II (left at the junction), III (ahead), and IV (on the
side-passage room wall). The other photographed plain doors are retained without invented labels.

Removed the false terminal door and its hardware. The end remains a continuous plaster wall,
with no room recess, leaning panel, stacked furniture or loose debris. The existing passage
length and the confirmed three 18 cm risers per flight are unchanged. Dimensions remain
proportional estimates; this correction does not establish surveyed measurements.

The new `Videos/20261014_111121.mp4` was checked at 0, 4, 8, 12, 16, 20, 24, 28, 32, 36 and 38
seconds. It approaches the CLASSROOM WING doorway across the stair landing from the other
corridor. `Videos/20261014_110743.jpg` shows the decorated OFFICE corridor and dark stone steps;
its finishes must not be copied indiscriminately onto the lighter classroom corridor.

Regression rays now require an unobstructed solid plaster end wall at several heights and
across the passage width, and exactly the three identified classroom signs. The browser check
also captures the corridor end on desktop and mobile.

Rechecked the older continuous approach (`103154`, every five seconds from 0 to 70s) for
corridor proportions and door spacing. Its five facade bays constrain the main corridor;
the four room-front openings are distinct from the three labelled classrooms. The existing
20.3 m main run and 9.8 m return remain estimates, not newly measured dimensions. No global
length scaling was applied: it would also move the approved junction, facade and steps without
measurement evidence. Removing the false end door eliminates the suggestion of a further room.
The final main-corridor room front moved from local z=-12.6 to -16.2, close to the steps as
seen at 30-50s and in the reverse corridor photograph. This is a proportional placement,
not a measured distance. Faculty fronts use timber panels instead of copying the classroom
inspection pane onto every door; the two near leaves remain open.

At 60s, Class III's door is visibly left of centre, with a black plaque on the right pier.
Offset the door left, rebuilt its closed side piers and added a 0.74 x 0.62 m plaque (estimated
from its size relative to the door). The plaque is a shallow modelled slab with generated
gold border/lettering, transcribed only where readable in the local 60-second frame. The
unclear date and crest are omitted, not invented. No photo crop, reference frame or video
is shipped; the temporary crop remains in ignored `artifacts/` for comparison only.
Rounded the pointed lens-shaped lattice openings to match the close-ups and gave stair faces
the same world-scale tile mapping as the floor, avoiding stretched grain. Step heights,
panorama controls and the Blender master are unchanged.
Room-side skirting stops at each doorway; the procedural stone grain uses lower contrast so
it does not read as dense stripes across the treads and landings.

Final recheck: geometry and panorama/walk interaction tests pass, as does the strict coplanar
surface scan. The browser check passed on Windows Chrome / Intel UHD Direct3D11: 501 route
positions, six desktop views, two phone views, nonblank canvas pixels and no runtime/shader
errors. The production build passes (existing large-chunk warning remains). Initial Linux
software-rendered attempts hit the test memory cap or were interrupted by live-source reloads;
the final run used an isolated release snapshot. This validates rendering, not a frame-rate
guarantee or exact surveyed dimensions.

## October 16: Extend the Return to the Rear Shell

Rechecked October 13 frames at 58-64s and 80-96s against the owner's two screenshots.
The previous return stopped near world z=-8.83, leaving an unintended compartment
between it and the rear shell. Its solid end now reaches the rear inner boundary
at z=-14.84. The floor, ceiling, walls and walk route extend together; the old
4 m slab and generic facade are removed only within this passage footprint.

The window run now follows a plain wall after the turn. Three sliding bays are
centred at local x=8.2, 11.6 and 15; room fronts and grilles are spaced along the
extended run. These positions remain proportional estimates from the footage.
The main room wall continues through the return-wall thickness, closing the
corner slit. Both three-riser flights and the entrance position remain unchanged.

Added the observed high screened end-wall recess and upper conduit/tube-light
runs. Lower-wall wear stays below the windows; classroom plaster uses a quieter
procedural off-white finish. No reference photographs or videos are shipped.
The separately in-progress west-wing model's rear ceiling/beam was lowered to
the underside of the extended classroom slab to prevent it penetrating upstairs.

Regression checks cover the rear-shell alignment, blank wall before the windows,
full-height corner closure, and uninterrupted floor through the extended return.
Windows Chrome/Intel UHD checks pass all 501 route positions and seven desktop
plus two phone views, with nonblank canvas pixels and no runtime/shader errors.
