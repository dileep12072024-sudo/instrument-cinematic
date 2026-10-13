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
  sliding windows with patterned film, exposed conduits, ceiling beams and lights.
  72s: terminal door label is CLASS ROOM - III, with a small glazed pane and bolt.
  84-132s: perpendicular side passage, doors on the left, windows on the right,
  worn lower wall, contrasting floor bands and stored furniture at the far end.
- `20260928_103849.mp4`, 0-9s: shallow steps on the return toward the main
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
