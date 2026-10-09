import assert from 'node:assert/strict';
import { Euler, PerspectiveCamera, Vector3 } from 'three';
import { createPanoramaLook } from '../src/panorama-look.js';

class Canvas extends EventTarget { setPointerCapture() {} focus() {} }
const canvas = new Canvas(), camera = new PerspectiveCamera(43);
let active = true;
const controls = createPanoramaLook(camera, canvas, () => active, () => {});
const send = (type, fields) => { const result = canvas.dispatchEvent(Object.assign(new Event(type, { cancelable: true }), fields)); controls.update(1); return result; };
assert.equal(send('contextmenu', {}), false, 'Right-drag must not open the browser menu');
for (const pointerType of ['mouse', 'touch']) {
  camera.position.set(4, 10, 2); camera.rotation.set(0, 0, 0);
  const position = camera.position.clone();
  send('pointerdown', { pointerType, pointerId: 1, button: 0, clientX: 100, clientY: 100 });
  send('pointermove', { pointerType, pointerId: 1, clientX: 160, clientY: 140 });
  const direction = camera.getWorldDirection(new Vector3());
  assert.ok(direction.x > 0 && direction.y < 0, `${pointerType} follows right/down look`);
  assert.deepEqual(camera.position, position, 'Turning must keep the eye fixed');
  assert.ok(Math.abs(new Euler().setFromQuaternion(camera.quaternion, 'YXZ').z) < 1e-12, 'No camera roll');
  assert.equal(camera.fov, 43);
  send('pointerup', { pointerId: 1 });
  send('pointermove', { pointerId: 1, clientX: 400, clientY: 400 });
  assert.ok(camera.getWorldDirection(new Vector3()).distanceTo(direction) < 1e-8);
  controls.move(1);
  controls.update(1);
  assert.ok(camera.position.clone().sub(position).distanceTo(direction) < 1e-8, 'Move follows the view');
  const next = camera.position.clone();
  send('keydown', { key: 'ArrowRight' });
  assert.deepEqual(camera.position, next, 'Arrow look must not orbit');
  active = false; send('wheel', { deltaY: 100 }); assert.deepEqual(camera.position, next);
  active = true;
}
console.log('PASS fixed-eye mouse/touch look, no roll/FOV distortion, movement and inactive state');

// A fresh gesture must recover even if the preceding pointerup never reached the canvas.
send('pointerdown', { pointerId: 7, clientX: 0, clientY: 0, button: 0 });
send('pointerdown', { pointerId: 8, clientX: 0, clientY: 0, button: 0 });
const before = camera.quaternion.clone();
send('pointermove', { pointerId: 8, clientX: 90, clientY: 0 });
assert.ok(camera.quaternion.angleTo(before) > .1, 'Interrupted drag must not lock future gestures');
send('pointercancel', { pointerId: 8 });

const owner = new EventTarget(); owner.defaultView = new EventTarget();
const external = new Canvas(); external.ownerDocument = owner;
external.setPointerCapture = () => { throw new Error('Capture unavailable'); };
const externalCamera = new PerspectiveCamera();
const externalLook = createPanoramaLook(externalCamera, external, () => true, () => {});
const dispatch = (target, type, fields) => target.dispatchEvent(Object.assign(new Event(type), fields));
dispatch(external, 'pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
dispatch(owner, 'pointermove', { pointerId: 1, buttons: 1, pointerType: 'mouse', clientX: 60, clientY: 0 });
externalLook.update(1);
assert.ok(externalCamera.quaternion.angleTo(new PerspectiveCamera().quaternion) > .1);
const stopped = externalCamera.quaternion.clone();
owner.defaultView.dispatchEvent(new Event('blur'));
dispatch(owner, 'pointermove', { pointerId: 1, buttons: 1, pointerType: 'mouse', clientX: 120, clientY: 0 });
assert.deepEqual(externalCamera.quaternion.toArray(), stopped.toArray());
console.log('PASS interrupted gesture, document-level drag, unavailable capture and window blur');

function smoothTurn(rate) {
  const surface = new Canvas(), eye = new PerspectiveCamera();
  const look = createPanoramaLook(eye, surface, () => true, () => {});
  dispatch(surface, 'pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
  dispatch(surface, 'pointermove', { pointerId: 1, clientX: 150, clientY: 0 });
  look.update(1 / rate);
  const first = Math.abs(new Euler().setFromQuaternion(eye.quaternion, 'YXZ').y);
  assert.ok(first > .02 && first < .15, 'First frame eases into a gentle turn instead of flashing');
  for (let i = 1; i < rate / 2; i++) look.update(1 / rate);
  return eye.quaternion.toArray();
}
smoothTurn(30).forEach((value, i) => assert.ok(Math.abs(value - smoothTurn(60)[i]) < 1e-10, 'Smoothing must be frame-rate independent'));
smoothTurn(120).forEach((value, i) => assert.ok(Math.abs(value - smoothTurn(60)[i]) < 1e-10, 'High-refresh displays must retain the same easing'));
const easedCanvas = new Canvas(), easedCamera = new PerspectiveCamera();
const eased = createPanoramaLook(easedCamera, easedCanvas, () => true, () => {});
dispatch(easedCanvas, 'pointerdown', { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
dispatch(easedCanvas, 'pointermove', { pointerId: 1, clientX: 150, clientY: 0 });
dispatch(easedCanvas, 'pointerup', { pointerId: 1 });
let last = 0;
for (let i = 0; i < 120; i++) {
  eased.update(1 / 60);
  const turn = -new Euler().setFromQuaternion(easedCamera.quaternion, 'YXZ').y;
  assert.ok(turn >= last && turn <= .3375 + 1e-10, 'Release must settle monotonically, without overshoot');
  last = turn;
}
assert.ok(Math.abs(last - .3375) < 1e-10, 'A 150px drag stays a gentle 19-degree turn');
console.log('PASS responsive, frame-rate-independent panorama smoothing');
