import assert from 'node:assert/strict';
import * as T from 'three';
import { buildArchitecture, buildLandscape } from '../src/architecture.js';
import { footprint } from '../src/footprint.js';
import { terraceCovers, terraceLevels } from '../src/stair-layout.js';

const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = {
  createElement: () => ({ getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }),
};
const scene = new T.Scene();
buildArchitecture(scene);
const landscape = buildLandscape(scene);
const tanks = scene.getObjectByName('Reference terraces and roof stair enclosure').userData.tanks;
const tops = { west: terraceLevels.leftWing + 1.6, 'low-corridor': terraceLevels.leftStrip + 1.6, corridor: terraceLevels.rightStrip + 1.6, room: terraceLevels.rightWing + 1.6, tower: terraceCovers[0].top };
const obstacles = [
  ...footprint.map(p => new T.Box3(new T.Vector3(p.x - p.width / 2 - .3, 0, p.z - p.depth / 2 - .3), new T.Vector3(p.x + p.width / 2 + .3, tops[p.type], p.z + p.depth / 2 + .3))),
  ...terraceCovers.map(p => new T.Box3(new T.Vector3(p.x - p.width / 2, terraceLevels.leftStrip, p.z - p.depth / 2), new T.Vector3(p.x + p.width / 2, p.top, p.z + p.depth / 2))),
  ...tanks.map(t => new T.Box3(new T.Vector3(t.x - t.radius, t.y, t.z - t.radius), new T.Vector3(t.x + t.radius, t.top, t.z + t.radius))),
];
for (const mesh of [landscape.foliage, landscape.garden.foliage]) {
  assert.ok(mesh.count > 0 && mesh.userData.trimmedLeaves > 0, 'Trim only foliage encroaching on the building');
  assert.ok(mesh.count > mesh.userData.trimmedLeaves, 'Retain most of the surrounding canopy');
  const matrix = new T.Matrix4(), bounds = new T.Box3();
  for (let i = 0; i < mesh.count; i++) {
    mesh.getMatrixAt(i, matrix);
    bounds.copy(mesh.geometry.boundingBox).applyMatrix4(matrix);
    const sway = 1.5 * (Math.max(0, bounds.max.y - .3) / 12) ** 2;
    bounds.expandByVector(new T.Vector3(sway + .0525, .021, sway + .0525));
    assert.ok(obstacles.every(obstacle => !obstacle.intersectsBox(bounds)), `Leaf ${i} stays clear even at maximum wind displacement`);
  }
  console.log('PASS foliage clearance', { kept: mesh.count, trimmed: mesh.userData.trimmedLeaves });
}
