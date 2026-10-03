# Ground-floor spine

The owner confirmed on 29 September 2026 that the front corridor occupies one-third of the spine depth and the rear rooms two-thirds. The room-door wall, the bottom starting edge of the twin central stairs and the rear edge of the wing entrance gates share one depth line.

`groundSpine` in `src/footprint.js` is the shared source for those proportions. The existing interpreted shell is 6.5 units deep: the corridor is 2.1667 and the room zone 4.3333. These are model units, not surveyed measurements. Stair positions and passage widths now derive from that source.

Right-wing references: supplied images `20260928_102145.jpg` through `20260928_102613.jpg`, and sampled frames at 10/18 seconds of `20260928_095714.mp4` and 35 seconds of `20260928_095915.mp4`. These show short steps up at the entrance, the Simulation Lab door, blue panel doors, barred windows, high ventilation openings, wiring and a Seminar Hall door at the far end. The right-wing floor rise, door spacing, dimensions and terminal wall position are approximations. Only closed room fronts are modeled; internal room contents and subdivisions are unknown. The west side has the confirmed depth division only, with no invented door sequence.

The right-wing walkthrough follows the front third. It starts in the hall, crosses the gate and short stairs, then follows the corridor and turns into the side passage. A separate Seminar Hall surrounds route looks along that passage and returns to the front corridor. No Blender assets or vehicles are added.

Continuation references: sampled frames at 2, 30, 60, 90, 120, 150 and 176 seconds of `20260928_100654.mp4`, and 2, 20, 40, 60 and 78 seconds of `20260928_101625.mp4`. Unseen lab interiors, people and vehicles are not reconstructed.

October correction: revisited `100654` at 35, 75, 95 and 105 seconds, `101625` at 40 seconds and `095915` at 45 seconds. These show a substantially longer approach, open left-hand casements and a projecting right pier/lintel before the recessed Strong Room door. The former 4.13-unit passage was incorrectly squeezed into the spine. It now occupies the east wing, with an 8.38-unit approach; this is a proportional correction, not a measured length. `seminarPassage` is shared by geometry and camera routes. The east-wing ground wall now has real window openings rather than solid walls behind decorative panes.

The front screen starts 0.766 units above the corridor floor with black stone skirting and a dark sill. Door leaves have recessed panels, thin bevelled frames, hinges and barrel bolts. Upper ventilators are shallow four-light timber frames with tilted lower flaps, not projecting boxes. Tile UVs use world dimensions, and shared paint/grain materials avoid large stretched blotches. Waiting benches, native cursor, weather and exterior roof geometry are unchanged.

The owner's October 3 clarification places Seminar Hall along the right-hand wall of the passage leading to the Strong Room, not facing the grille or the exterior folding gate. Its doorway now occupies that side wall; no unobserved hall interior is invented. The doorway at the front-corridor junction is identified as Electronics Lab II in `100654` at 2 seconds. Exact offsets remain approximate.
