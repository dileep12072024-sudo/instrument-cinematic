import assert from 'node:assert/strict';
import * as T from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { terraceLevels } from '../src/stair-layout.js';

// Only texture painting is stubbed; rays inspect the complete production geometry.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = {
  createElement: () => ({ getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }),
};
const scene = new T.Scene();
const { group } = buildArchitecture(scene); scene.updateMatrixWorld(true);
const hits = (eye, direction, far = 10) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(group, true);
for (const [x, z, expected] of [[-22.1, 2.97, terraceLevels.leftWing], [-21.6, 3.02, terraceLevels.leftWing + .5 / 3], [-22, 1, terraceLevels.leftWing], [-21.7, 1, terraceLevels.leftWing + .5 / 3]]) {
  const hit = hits([x, 8.3, z], [0, -1, 0], 1).find(h => h.object.material.name !== 'Terrace tanks and PVC pipework');
  assert.ok(Math.abs(hit.point.y - expected) < .001, 'Old facade pier/lintel must not protrude beside the terrace steps');
}
assert.ok(hits([13, terraceLevels.rightStrip + .04, 0], [0, 0, 1], 3.4).length, 'Right parapet must meet the strip without a daylight gap');
for (const side of [-1, 1]) {
  const hit = hits([side * 5, 13.2, 0], [-side, 0, 0], 2)[0];
  assert.ok(Math.abs(hit.point.x - side * 4.04) < .025, 'No legacy parapet projects from the headhouse side');
}
const gate = scene.getObjectByName('Terrace double grille gate');
for (const leaf of gate.children) {
  const bounds = new T.Box3().setFromObject(leaf);
  assert.ok(bounds.max.x < gate.position.x + .03 && bounds.min.x < gate.position.x - .8, 'Terrace gates push toward the left terrace');
}
for (const leaf of scene.getObjectsByProperty('name', 'Open classroom entrance leaf')) {
  const hinge = leaf.getWorldPosition(new T.Vector3()), bounds = new T.Box3().setFromObject(leaf);
  assert.ok(bounds.max.x < hinge.x + .03 && bounds.min.x < hinge.x - .8, 'Classroom doors push into the left wing');
}
const blue = scene.getObjectByName('Open blue roof-access door');
assert.ok(blue.position.x > .5 && new T.Box3().setFromObject(blue).min.x > .5, 'Blue door is right-hinged viewed from the terrace');
const tables = scene.getObjectsByProperty('name', 'Strong Room passage table');
assert.equal(tables.length, 3);
for (const table of tables) {
  const b = new T.Box3().setFromObject(table);
  assert.ok(b.min.x > 22.3 && b.max.z < -3.5, 'Tables clear the window wall and projecting junction pier');
}
for (const [x, y] of [[-28, terraceLevels.leftWing], [26, terraceLevels.rightWing], [-15, terraceLevels.leftStrip]]) {
  const near = hits([x, y + .1, 0], [0, -1, 0], .13);
  const surfaces = new Set(near.map(h => h.point.y.toFixed(4)));
  assert.equal(surfaces.size, 1, 'Roof finish has no nearly coplanar second surface');
}
console.log('PASS parapet closure, headhouse clearance, push-open gates, right hinge, tables and roof surfaces');
