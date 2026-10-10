import assert from 'node:assert/strict';
import * as T from 'three';
import { buildTerraces } from '../src/terraces.js';
import { terraceLevels } from '../src/stair-layout.js';

// Texture painting is immaterial to the ray checks; use the real generated geometry.
globalThis.document = { createElement: () => ({ getContext: () => ({ fillRect() {}, beginPath() {}, ellipse() {}, fill() {} }) }) };
const materials = Object.fromEntries(['wall', 'metal', 'dark', 'brick', 'blue'].map(name => [name, new T.MeshStandardMaterial()]));
const scene = new T.Scene(); buildTerraces(scene, materials); scene.updateMatrixWorld(true);
const down = (x, z, high) => new T.Raycaster(new T.Vector3(x, high + 1, z), new T.Vector3(0, -1, 0)).intersectObject(scene, true)[0];
for (const [edge, low, high] of [[-22.05, terraceLevels.leftWing, terraceLevels.leftStrip], [23, terraceLevels.rightWing, terraceLevels.rightStrip]]) {
  const side = Math.sign(edge), rise = high - low;
  const inner = edge - side, crest = high + rise;
  const slope = (crest - low) / 1.12 * (edge < 0 ? .35 / 1.30 : 1);
  for (const distance of [.05, .15, .3]) {
    const surface = down(inner + side * distance, -1.2, crest);
    assert.equal(surface.object.material.name, 'Projecting weathered terrace coping');
    assert.ok(Math.abs(surface.point.y - (crest - slope * distance)) < .001, 'Capped ramp descends toward the open terrace');
  }
  for (const y of [high + .03, crest - .03]) {
    const ray = new T.Raycaster(new T.Vector3(inner - side * .2, y, -1.2), new T.Vector3(side, 0, 0), 0, .3);
    const face = ray.intersectObject(scene, true)[0];
    assert.ok(face && Math.abs(face.point.x - inner) < .001, 'Raised building-facing edge is visible above the approach and stays vertical');
  }
  const sideFace = new T.Raycaster(new T.Vector3(inner + side * .2, low + .05, 1.1), new T.Vector3(0, 0, -1));
  assert.ok(sideFace.intersectObject(scene, true)[0]?.distance < .3, 'The cap is supported along the stair side, not floating');
  assert.notEqual(down(edge + side * .1, 3.02, high)?.object.material.name, 'Projecting weathered terrace coping', 'No skinny coping stub protrudes beside the last stair');
}
assert.ok(Math.abs((terraceLevels.rightStrip - terraceLevels.rightWing) * 2 - (terraceLevels.leftStrip - terraceLevels.leftWing)) < 1e-9);
for (const y of [7.7, 7.9]) {
  const front = new T.Raycaster(new T.Vector3(-23, y, -1.2), new T.Vector3(1, 0, 0)).intersectObject(scene, true)[0];
  assert.equal(front.object.material.name, 'Weathered terrace plaster');
  assert.ok(Math.abs(front.point.x + 22.35) < .001, 'Left cap front aligns with the exterior AC-facing pillar faces');
  for (const z of [-3.25, .825]) {
    const post = new T.Raycaster(new T.Vector3(-23, y, z), new T.Vector3(1, 0, 0)).intersectObject(scene, true)[0];
    assert.ok(Math.abs(post.point.x - front.point.x) < .001, 'Both end pillars and the cap share the same exterior face line');
  }
}
for (const x of [-22.4, -22.6, -23]) {
  assert.ok(Math.abs(down(x, -1.2, 10).point.y - terraceLevels.leftWing) < .001, 'Open terrace stays flat beyond the pillar-aligned front');
}
for (const z of [-2.94, 0, .515]) {
  assert.equal(down(-22.34, z, 10).object.material.name, 'Projecting weathered terrace coping', 'Cap reaches the exterior face beside both end posts');
}
for (const y of [12.16, 12.24]) {
  const front = new T.Raycaster(new T.Vector3(24, y, -1.2), new T.Vector3(-1, 0, 0)).intersectObject(scene, true)[0];
  assert.equal(front.object.material.name, 'Weathered terrace plaster');
  assert.ok(Math.abs(front.point.x - 22.35) < .001, 'Right cap has the same inward cut at its original half-height');
}
for (const x of [22.45, 22.7, 23.1]) {
  assert.ok(Math.abs(down(x, -1.2, 14).point.y - terraceLevels.rightWing) < .001, 'Right terrace stays flat beyond the shortened cap');
}
const leftEnd = down(-21.225, .95, 10), leftProfile = down(-21.225, 0, 10);
assert.equal(leftEnd.object.material.name, 'Projecting weathered terrace coping', 'Left cap ends within the first tread');
assert.ok(Math.abs(leftEnd.point.y - leftProfile.point.y) < .001, 'Extending the cap does not change its height or slope');
assert.notEqual(down(-21.225, 1.03, 10).object.material.name, 'Projecting weathered terrace coping', 'Left cap stops after the short overlap');
assert.notEqual(down(-21.6, .95, 10).object.material.name, 'Projecting weathered terrace coping', 'The lower tread is not covered by the extension');
assert.notEqual(down(22.175, .95, 14).object.material.name, 'Projecting weathered terrace coping', 'Right cap termination is unchanged');
for (const z of [-3.25, .825, 3.25]) {
  assert.ok(Math.abs(down(-22.05, z, 10).point.y - (terraceLevels.leftWing + 1.85)) < .001, 'Ramp and stair ends have concrete pillars');
}
for (const x of [-7, -10, -13, -16, -19]) {
  assert.ok(Math.abs(down(x, 3.25, 11).point.y - (terraceLevels.leftStrip + 1.8)) < .001, 'Square pillars rise above the terrace wall');
}
assert.ok(Math.abs(down(21.5, -1.2, 14).point.y - terraceLevels.rightStrip) < .001, 'Right approach reaches the original junction without a gap');
const rightFace = new T.Raycaster(new T.Vector3(21.8, terraceLevels.rightStrip + .1, -1.2), new T.Vector3(1, 0, 0), 0, .3).intersectObject(scene, true)[0];
assert.ok(rightFace && Math.abs(rightFace.point.x - 22) < .001, 'Right ramp high face returns to the original roof junction');
let crossingVertices = 0;
for (const mesh of scene.getObjectsByProperty('isMesh', true).filter(mesh => mesh.material.name === 'Terrace tanks and PVC pipework')) {
  const pipe = mesh.geometry.attributes.position;
  for (let i = 0; i < pipe.count; i++) {
    const x = pipe.getX(i), z = pipe.getZ(i);
    if (x >= 22 && x <= 23.12 && z > -3.05 && z < -2.5) {
      const surface = terraceLevels.rightStrip + .25 - .5 * (x - 22) / 1.12;
      assert.ok(pipe.getY(i) > surface, 'PVC crossing stays above the repositioned cap');
      crossingVertices++;
    }
  }
}
assert.ok(crossingVertices > 0);
console.log('PASS vertical high faces, capped ramps descending toward open terraces and half-height right rise');
