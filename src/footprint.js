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
};
