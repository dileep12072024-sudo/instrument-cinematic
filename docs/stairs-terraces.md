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

## Modeling Boundaries

Stair heights match the existing model's storeys. Counts, widths, run lengths, roof fittings and relative positions are proportional estimates, not measured survey dimensions. The top flight is single-sided; lower flights are paired. Stair slabs have open undersides, and the fixed lower corner gates have real cavities behind them. Interior room contents not visible in the references are not invented.

The Strong Room approach is lengthened by one model unit inside the existing right-wing footprint; the building's outer length is unchanged. Rain shelter covers the enclosed stair head and the terrace canopy, but not the open roof surfaces.

`scripts/check-stairs-terraces.mjs` checks camera support, gate recess depth, the exterior-facing lock, roof shelter classification, desktop/mobile rendering, indoor panorama and field-of-view controls. `scripts/check-entrance-look.mjs` checks pointer direction and retention of the viewing angle while moving.
