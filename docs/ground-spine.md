# Ground-floor spine

The owner confirmed on 29 September 2026 that the front corridor occupies one-third of the spine depth and the rear rooms two-thirds. The room-door wall, the bottom starting edge of the twin central stairs and the rear edge of the wing entrance gates share one depth line.

`groundSpine` in `src/footprint.js` is the shared source for those proportions. The existing interpreted shell is 6.5 units deep: the corridor is 2.1667 and the room zone 4.3333. These are model units, not surveyed measurements. Stair positions and passage widths now derive from that source.

Right-wing references: supplied images `20260928_102145.jpg` through `20260928_102613.jpg`, and sampled frames at 10/18 seconds of `20260928_095714.mp4` and 35 seconds of `20260928_095915.mp4`. These show short steps up at the entrance, the Simulation Lab door, blue panel doors, barred windows, high ventilation openings, wiring and a Seminar Hall door at the far end. The right-wing floor rise, door spacing, dimensions and terminal wall position are approximations. Only closed room fronts are modeled; internal room contents and subdivisions are unknown. The west side has the confirmed depth division only, with no invented door sequence.

The right-wing walkthrough follows the front third. It starts in the hall, crosses the gate and short stairs, then follows the corridor and turns into the side passage. A separate Seminar Hall surrounds route looks along that passage and returns through the front-corridor junction toward Electronics Lab II. No Blender assets or vehicles are added.

Continuation references: sampled frames at 2, 30, 60, 90, 120, 150 and 176 seconds of `20260928_100654.mp4`, and 2, 20, 40, 60 and 78 seconds of `20260928_101625.mp4`. Unseen lab interiors, people and vehicles are not reconstructed.

October correction: revisited `100654` at 35, 75, 95 and 105 seconds, `101625` at 40 seconds and `095915` at 45 seconds. These show a substantially longer approach, open left-hand casements and a projecting right pier/lintel before the recessed Strong Room door. The former 4.13-unit passage was incorrectly squeezed into the spine. It now occupies the east wing, with an 8.38-unit approach; this is a proportional correction, not a measured length. `seminarPassage` is shared by geometry and camera routes. The east-wing ground wall now has real window openings rather than solid walls behind decorative panes.

The front screen starts 0.766 units above the corridor floor with black stone skirting and a dark sill. Door leaves have recessed panels, thin bevelled frames, hinges and barrel bolts. Upper ventilators are shallow four-light timber frames with tilted lower flaps, not projecting boxes. Tile UVs use world dimensions, and shared paint/grain materials avoid large stretched blotches. Waiting benches, native cursor, weather and exterior roof geometry are unchanged.

The owner confirmed the corrected layout on October 4: Seminar Hall has TWO doors, its main entrance at the end of the long front corridor and a second entrance along the Strong Room passage. Electronics Lab II is at the opposite terminal end of that passage from the Strong Room, adjacent to the exterior folding gate, not in place of Seminar Hall's main door. The video `100654` at 2 seconds and `095915` at 45 seconds distinguish those entrances. Exact offsets remain approximate; no unobserved hall or lab interior is invented.

The Strong Room approach retains the right-hand pier and deeper plaster downstand. Reinspection of `100654` at 75 seconds shows a high timber ventilator in that downstand; it is retained, unlike the accidental exterior canopy seam. The ground-floor rear facade retains exterior plaster and blue trim instead of the interior plaster substitution. Passage windows remain actual openings through both finishes.

October 4 screenshot correction: the original near windows overlapped the spine's rear wall at z=-3.25. The three window reveals now lie fully beyond that wall, at z=-4.4, -6.65 and -9.05; the Strong Room end is moved to -10.2, retaining the recessed bay behind its pier. The resulting 11.28-unit approach remains an interpretation, not a survey. Tables, the opposite window and fans move with the longer passage. Interior walls use light aged plaster albedo; the shadowed video crop is retained only as subtle bump relief. The entrance shell now joins the 4.2-high upper facade, sealing the accidental strip above the canopy without covering the real windows or vents.

The October 4 video recheck places the second Seminar Hall entrance farther down the Strong Room passage; it is now at z=-3.25, over 4.5 model units from the main corridor-end door. The deepest passage table was moved clear of the projecting Strong Room pier. Entering the hall now enables the same panorama mode used outside, with the walk surface retaining pointer, touch and wheel look controls.

## Pending visual correction

October 4 owner report: the smaller moon is visible in the starting composition but frequently leaves the screen when the building is straightened in the camera view. Check framing across arrival, straight-on building views and mobile without enlarging the moon again. Preserve night-only visibility and the transparent unlit portion. This is recorded for a separate sky-framing correction, not changed by the interior layout update.
