import assert from 'node:assert/strict';
import * as T from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { hallWindows } from '../src/footprint.js';

// 14 October photographs: each side window opens through the hall wall and the shell; boards face the hall.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }), createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }) };
const scene = new T.Scene();
const { group } = buildArchitecture(scene); scene.updateMatrixWorld(true);
const see = ['Transparent entrance sidelights'];
// Clear points between bars, frames and the boards hung over each window.
for (const [side, y, z] of [[-1, 1.91, 6.0], [1, 1.675, 5.03]]) {
  const w = hallWindows[side];
  assert.ok(y > w.y0 && y < w.y1 && z > w.z0 && z < w.z1);
  const ray = new T.Raycaster(new T.Vector3(side * 3.2, y, z), new T.Vector3(side, 0, 0), 0, 1.4);
  const blocking = ray.intersectObject(group, true).filter(h => !see.includes(h.object.material.name)).map(h => h.object.material.name || h.object.name);
  assert.deepEqual(blocking, [], `${side < 0 ? 'West' : 'East'} window is open through wall and shell`);
  const boards = scene.getObjectByName(`${side < 0 ? 'West' : 'East'} hall boards and notices`);
  assert.ok(boards?.material.map, 'Photographed boards carry their atlas');
  const n = boards.geometry.attributes.normal;
  assert.ok(Array.from({ length: n.count }, (_, i) => Math.sign(n.getX(i))).every(s => s === -side), 'Boards face into the hall');
}
const bench = scene.getObjectByName('Right-side waiting benches');
assert.ok(new T.Box3().setFromObject(bench).max.y < .95, 'Bench backs stay low, as photographed');
console.log('PASS hall side windows open through wall and shell, photographed boards face the hall, low bench backs');
