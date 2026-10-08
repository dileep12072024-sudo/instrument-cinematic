import assert from 'node:assert/strict';
import { PerspectiveCamera, Vector3 } from 'three';
import { createEntranceWalk } from '../src/entrance-walk.js';

class Element extends EventTarget {
  dataset = {};
  setAttribute() {}
  setPointerCapture() {}
  focus() {}
  querySelector() { return new Element(); }
}
const elements = new Map();
globalThis.document = new Element();
document.querySelector = selector => {
  if (!elements.has(selector)) elements.set(selector, new Element());
  return elements.get(selector);
};
const camera = new PerspectiveCamera(), canvas = new Element();
const walk = createEntranceWalk(camera, canvas, () => {}, () => {});
const send = (type, fields) => canvas.dispatchEvent(Object.assign(new Event(type), fields));
const direction = () => { walk.update(0); return camera.getWorldDirection(new Vector3()); };
for (const pointerType of ['mouse', 'touch']) {
  walk.enter();
  send('pointerdown', { pointerType, pointerId: 1, clientX: 100, clientY: 100 });
  send('pointermove', { pointerType, pointerId: 1, clientX: 150, clientY: 130 });
  let d = direction();
  assert.ok(d.x > 0 && d.y < 0, `${pointerType}: dragging right/down looks right/down`);
  send('pointermove', { pointerType, pointerId: 1, clientX: 50, clientY: 70 });
  d = direction();
  assert.ok(d.x < 0 && d.y > 0, `${pointerType}: dragging left/up looks left/up`);
  send('pointerup', { pointerId: 1 });
  send('pointermove', { pointerType, pointerId: 1, clientX: 300, clientY: 300 });
  assert.deepEqual(direction(), d, 'Releasing the pointer stops turning');
  send('wheel', { deltaY: 100 });
  assert.ok(direction().distanceTo(d) < 1e-6, 'Moving must retain the viewing angle');
  send('keydown', { key: 'w' });
  assert.ok(direction().distanceTo(d) < 1e-6, 'Walking forward must retain the viewing angle');
}
for (const [key, sign] of [['ArrowRight', 1], ['ArrowLeft', -1]]) {
  walk.enter(); send('keydown', { key });
  assert.ok(direction().x * sign > 0, `${key} turns in the named direction`);
}
console.log('PASS mouse, touch and arrow-key look directions; pointer release');
