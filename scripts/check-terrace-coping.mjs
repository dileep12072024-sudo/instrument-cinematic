import assert from 'node:assert/strict';
import * as T from 'three';
import { buildTerraces } from '../src/terraces.js';
import { terraceLevels } from '../src/stair-layout.js';

// Texture painting is immaterial to the ray checks; use the real generated geometry.
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, beginPath() {}, ellipse() {}, fill() {} }) }) };
const materials = Object.fromEntries(['wall', 'metal', 'dark', 'brick', 'blue'].map(name => [name, new T.MeshStandardMaterial()]));
const scene = new T.Scene(); buildTerraces(scene, materials); scene.updateMatrixWorld(true);
const down = (x, z, high) => new T.Raycaster(new T.Vector3(x, high + 1, z), new T.Vector3(0, -1, 0)).intersectObject(scene, true)[0];
for (const [edge, low, high] of [[-22.05, terraceLevels.leftWing, terraceLevels.leftStrip], [22, terraceLevels.rightWing, terraceLevels.rightStrip]]) {
  const side = Math.sign(edge), rise = high - low;
  const lip = down(edge + side * .1, -1.2, high);
  assert.equal(lip.object.material.name, 'Projecting weathered terrace coping');
  assert.ok(Math.abs(lip.point.y - (high - .025 * 1.1 / 1.12)) < .001, 'Cap has a shallow outward fall');
  const y = low + (rise - .12) / 2;
  const ray = new T.Raycaster(new T.Vector3(edge + side, y, -1.2), new T.Vector3(-side, 0, 0));
  const face = ray.intersectObject(scene, true)[0];
  assert.ok(Math.abs(face.point.x - (edge + side * rise * .08)) < .001, 'Solid face has only a slight batter below its cap');
  const sideFace = new T.Raycaster(new T.Vector3(edge - side * .5, low + .05, 1.1), new T.Vector3(0, 0, -1));
  assert.ok(sideFace.intersectObject(scene, true)[0]?.distance < .3, 'The cap is supported along the stair side, not floating');
  assert.notEqual(down(edge + side * .1, 3.02, high)?.object.material.name, 'Projecting weathered terrace coping', 'No skinny coping stub protrudes beside the last stair');
}
assert.ok(Math.abs((terraceLevels.rightStrip - terraceLevels.rightWing) * 2 - (terraceLevels.leftStrip - terraceLevels.leftWing)) < 1e-9);
console.log('PASS solid capped terrace plinths, shallow fall, no beam stubs and half-height right terrace');
