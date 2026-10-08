import assert from 'node:assert/strict';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { createPanoramaLook } from '../src/panorama-look.js';

class Canvas extends EventTarget { setPointerCapture() {} }
const canvas = new Canvas(), camera = new PerspectiveCamera(43);
let active = true;
const controls = createPanoramaLook(camera, canvas, () => active, () => {});
const send = (type, fields) => canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields));
assert.equal(send('contextmenu', {}), false, 'Right-drag must not open the browser menu');
for (const pointerType of ['mouse', 'touch']) {
  camera.position.set(4, 10, 2); camera.rotation.set(0, 0, 0);
  const position = camera.position.clone();
  send('pointerdown', { pointerType, pointerId: 1, button: 0, clientX: 100, clientY: 100 });
  send('pointermove', { pointerType, pointerId: 1, clientX: 160, clientY: 140 });
  const direction = camera.getWorldDirection(new Vector3());
  assert.ok(direction.x > 0 && direction.y < 0, `${pointerType} follows right/down look`);
  assert.deepEqual(camera.position, position, 'Turning must keep the eye fixed');
  assert.equal(new Euler().setFromQuaternion(camera.quaternion, 'YXZ').z, 0, 'No camera roll');
  assert.equal(camera.fov, 43);
  send('pointerup', { pointerId: 1 });
  send('pointermove', { pointerId: 1, clientX: 400, clientY: 400 });
  assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(direction) < 1e-8);
  controls.move(1);
  assert.ok(camera.position.clone().sub(position).distanceTo(direction) < 1e-8, 'Move follows the view');
  const next = camera.position.clone();
  send('keydown', { key: 'ArrowRight' });
  assert.deepEqual(camera.position, next, 'Arrow look must not orbit');
  active = false; send('wheel', { deltaY: 100 }); assert.deepEqual(camera.position, next);
  active = true;
}
console.log('PASS fixed-eye mouse/touch look, no roll/FOV distortion, movement and inactive state');
