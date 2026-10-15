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
  Class Room I / Strong Room is near the passage end. Retain the no-debris decision.
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
plain doors and Class Room I inspection pane match the provided photos. Fine dimensions and
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
