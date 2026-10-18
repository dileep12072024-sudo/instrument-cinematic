// Interpreted proportions from the September 21 plan and OG top view, not survey dimensions.
export const footprint = [
  { name: 'West wing', x: -28, z: 0, width: 12, depth: 30, height: 9.4, bays: 4, type: 'west' },
  { name: 'West corridor', x: -13, z: 0, width: 18, depth: 6.5, height: 9.4, bays: 5, type: 'low-corridor' },
  { name: 'Entrance block', x: 0, z: 0, width: 8, depth: 14, height: 14, bays: 2, type: 'tower' },
  { name: 'East corridor', x: 13, z: 0, width: 18, depth: 6.5, height: 13.4, bays: 5, type: 'corridor' },
  { name: 'East wing', x: 26.5, z: 0, width: 9, depth: 33, height: 13.4, bays: 3, type: 'room' },
];

// User-confirmed depth split. Room fronts, stair feet and the back of each gate align.
const spine = footprint.find(part => part.name === 'East corridor');
export const groundSpine = {
  front: spine.z + spine.depth / 2,
  rear: spine.z - spine.depth / 2,
  corridorDepth: spine.depth / 3,
  roomDepth: spine.depth * 2 / 3,
  roomFront: spine.z + spine.depth / 6,
  corridorCenter: spine.z + spine.depth / 3,
  hallFloor: .164,
  rightFloor: .704,
  screenBottom: 1.47,
};

// Entrance-hall side windows (key: side, -1 = west), measured in the 14 October photos and fitted
// to this hall; the shell openings and the steel windows share them. See docs/entrance-video.md.
export const hallWindows = {
  [-1]: { z0: 4.04, z1: 6.34, y0: .965, y1: 2.07 },
  [1]: { z0: 4.06, z1: 5.10, y0: .73, y1: 1.94 },
};

// Proportions inferred from the continuous Strong Room approach, not survey lengths.
export const seminarPassage = {
  x: 23.25, width: 2.24, end: -11.2, pierZ: -9.8,
  terminalX: 24.5, hallDoorZ: -8.3, labEnd: 7.85, // the hall's second door comes after the passage window at -6.4 (owner, 2026-10-18)
  // Keep the full reveal beyond the adjoining spine's rear wall, including its thickness.
  windowZ: [-4.4, -6.85, -9.35], windowWidth: 1.56,
};
