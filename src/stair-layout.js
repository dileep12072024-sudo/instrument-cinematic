// Heights fit the existing storeys; runs are reference-based estimates, not a survey.
export const stairs = {
  ground: .164, first: 4.044, second: 8.444, top: 12.68,
  front: 1.083333, rear: -4.1, returnEnd: -.7, landingZ: -5.15,
};
export const stairFlights = [
  { base: stairs.ground, half: 2.484, top: stairs.first, sides: [-1, 1], sideSteps: 14, returnSteps: 10 },
  { base: stairs.first, half: 6.364, top: stairs.second, sides: [-1, 1], sideSteps: 14, returnSteps: 12 },
  { base: stairs.second, half: 10.644, top: stairs.top, sides: [1], sideSteps: 14, returnSteps: 12 },
];
export const terraceCovers = [
  { x: 0, z: -3.4, width: 8.4, depth: 7.4, top: 15.64 },
  { x: -5.1, z: 1.4, width: 2.3, depth: 4.1, top: 11.44 },
];
