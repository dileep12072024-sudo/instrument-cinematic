import assert from 'node:assert/strict';
import * as T from 'three';
import { createRain } from '../src/weather-effects.js';

// Rain leans with the same gusting wind the trees sway to: upright in still air, more slant in stronger gusts.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }) };
const scene = new T.Scene(), camera = new T.PerspectiveCamera(); camera.position.set(0, 30, 60); camera.updateMatrixWorld();
const rain = createRain(scene, camera), mesh = scene.getObjectByName('Live rain');
const tilt = windSpeed => {
  for (let i = 0; i < 120; i++) rain.update(.05, { rainFactor: 1, windSpeed: 5, windDirection: 90 }, false, windSpeed);
  const m = new T.Matrix4(), q = new T.Quaternion(), axis = new T.Vector3();
  mesh.getMatrixAt(0, m); m.decompose(new T.Vector3(), q, new T.Vector3());
  return T.MathUtils.radToDeg(axis.set(0, 1, 0).applyQuaternion(q).angleTo(new T.Vector3(0, 1, 0)));
};
const calm = tilt(0), breeze = tilt(18), gale = tilt(60);
assert.ok(calm < .5, `calm rain falls straight (${calm})`);
assert.ok(breeze > 15 && breeze < 40, `5 m/s gust leans the rain (${breeze})`);
assert.ok(gale > breeze + 15, `stronger gusts lean it further (${gale})`);
console.log('PASS rain slant follows the gusting wind', { calm: +calm.toFixed(1), breeze: +breeze.toFixed(1), gale: +gale.toFixed(1) });
