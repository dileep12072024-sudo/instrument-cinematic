import assert from 'node:assert/strict';
import * as T from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { stairs, stairFlights, terraceCovers, terraceLevels } from '../src/stair-layout.js';

// Only texture painting is stubbed; rays inspect the complete production geometry.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = {
  createElement: () => ({ getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }),
};
const scene = new T.Scene();
const { group, materials } = buildArchitecture(scene); scene.updateMatrixWorld(true);
const hits = (eye, direction, far = 10) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(group, true);
for (const x of [-2.3, 2.3]) {
  const glassHits = (z, direction) => hits([x, 2.3, z], [0, 0, direction], 3).filter(hit => [materials.entranceReflectiveGlass, materials.entranceTintedGlass].includes(hit.object.material));
  assert.deepEqual(glassHits(9, -1).map(hit => hit.object.material), [materials.entranceReflectiveGlass], 'Outside sees only the reflective face');
  assert.deepEqual(glassHits(5, 1).map(hit => hit.object.material), [materials.entranceTintedGlass], 'Inside sees only the transparent tinted face');
}
assert.equal(materials.entranceReflectiveGlass.transparent, false);
assert.ok(materials.entranceReflectiveGlass.metalness > .5);
assert.ok(materials.entranceTintedGlass.transparent && materials.entranceTintedGlass.opacity < .3 && !materials.entranceTintedGlass.depthWrite);
assert.equal(materials.entranceGlazing.side, T.FrontSide, 'Side notice windows retain their existing glazing');
const terrace = scene.getObjectByName('Reference terraces and roof stair enclosure');
const terraceHits = (eye, direction, far) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(terrace, true);
assert.equal(terraceHits([-5.5, 10, -3.25], [0, 0, -1], 4).length, 0, 'Utility enclosure must not project beyond the rear roof edge');
assert.equal(terraceHits([-4.28, 11.3, -1], [0, -1, 0], 2.7).length, 0, 'Utility enclosure keeps a gap from the stairwell wall');
const rear = terraceHits([-5.5, 10, -3.25], [0, 0, 1], 1)[0];
assert.ok(rear && rear.point.z > -2.8, 'Utility rear wall is inset from the parapet');
assert.ok(terraceHits([-5.5, 8.6, -2.6], [0, -1, 0], .5).length, 'Rear enclosure is supported on its terrace plinth');
const cover = terraceCovers[1];
assert.ok(cover.z - cover.depth / 2 > -3.25 && cover.z + cover.depth / 2 < 3.25, 'Utility canopy stays within the roof depth');
for (const [x, z, expected] of [[-22.1, 2.8, terraceLevels.leftWing], [-21.6, 3.02, terraceLevels.leftWing + .5 / 3], [-22, 1.35, terraceLevels.leftWing], [-21.7, 1.35, terraceLevels.leftWing + .5 / 3]]) {
  const hit = hits([x, 8.3, z], [0, -1, 0], 1).find(h => h.object.material.name !== 'Terrace tanks and PVC pipework');
  assert.ok(Math.abs(hit.point.y - expected) < .001, 'Old facade pier/lintel must not protrude beside the terrace steps');
}
assert.ok(hits([13, terraceLevels.rightStrip + .04, 0], [0, 0, 1], 3.4).length, 'Right parapet must meet the strip without a daylight gap');
for (const x of [4.15, 4.5, 4.9]) for (const z of [-2, 0, 1]) {
  const hit = terraceHits([x, 12.7, z], [0, -1, 0], 1)[0];
  assert.ok(hit && Math.abs(hit.point.y - terraceLevels.rightStrip) < .001, 'Right terrace meets enclosure without a lowered strip');
}
for (const [x, expected] of [[3.79, stairs.top], [3.81, stairs.top + .15], [4.03, stairs.top + .15], [4.17, stairs.top + .15], [4.19, stairs.top + .3], [4.55, stairs.top + .3], [4.57, terraceLevels.rightStrip], [4.95, terraceLevels.rightStrip]]) {
  for (const z of [1.5, 1.55, 2.425, 3.05]) {
    const near = hits([x, 12.8, z], [0, -1, 0], .8);
    assert.ok(near[0] && Math.abs(near[0].point.y - expected) < .001, `Unobstructed, full-width tread at ${x}, ${z}`);
    assert.equal(new Set(near.filter(h => Math.abs(h.point.y - expected) < .01).map(h => h.point.y.toFixed(4))).size, 1, 'No flickering duplicate finish on the steps');
  }
}
for (const [x, y] of [[3.8, stairs.top + .07], [4.18, stairs.top + .22], [4.56, stairs.top + .37]]) {
  for (const z of [1.5, 2.425, 3.05]) {
    const face = hits([x - .02, y, z], [1, 0, 0], .04)[0];
    assert.ok(face && Math.abs(face.point.x - x) < .001, 'Every riser is closed across the passage');
  }
}
for (const y of [12.05, 12.2, 12.4]) {
  assert.ok(hits([13, y, 4], [0, 0, -1], 1).length, 'Raised right roof remains sealed to the facade');
}
const stairGroup = scene.getObjectByName('Connected stairways: ground to roof');
const stairHits = (eye, direction, far) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(stairGroup, true);
for (const x of [1.6, 1.63, 1.645, 3.76]) {
  assert.ok(stairHits([x, stairs.second + .4, 0], [0, 0, -1], 1).length, 'Stopped-flight wall joins its adjoining walls without a slit');
}
for (const f of stairFlights) for (const side of f.sides) {
  const z = -2, start = f.start ?? stairs.front;
  const y = f.base + (f.half - f.base) * (z - start) / (stairs.rear - start);
  assert.ok(stairHits([side * 1.645, y + 1.2, z], [0, -1, 0], .5).length, 'Every side-flight parapet closes against the treads');
}
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
const blueBounds = new T.Box3().setFromObject(blue);
assert.ok(blueBounds.min.z < blue.position.z - 1 && blueBounds.max.z < blue.position.z + .04, 'Blue door pulls toward the stair landing, not out onto the terrace');
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
