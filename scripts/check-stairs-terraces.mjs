import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { isSheltered } from '../src/weather-effects.js';

assert.equal(isSheltered(0, 14.5, -3), true);
assert.equal(isSheltered(-5.1, 10, 2), true);
assert.equal(isSheltered(-15, 10, 1), false);
assert.equal(isSheltered(25, 14, 1), false);
assert.equal(isSheltered(-28, 7.8, 1), false);
assert.equal(isSheltered(12, 12.2, 1), true);
await mkdir('artifacts/stairs-terraces', { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .8 });
page.setDefaultTimeout(120000);
const errors = [];
page.on('pageerror', e => { errors.push(e.message); console.error(e.message); });
page.on('console', m => { if (m.type() === 'error') console.error('Browser:', m.text()); if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
await page.addInitScript(() => {
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => { if (cb.name === 'animate') { window.__frame = cb; return 0; } return raf(cb); };
  window.__advance = (n = 60) => {
    const r = __portrait.renderer, render = r.render; r.render = () => {};
    try { for (let i = 0; i < n; i++) { window.__t = Math.max(performance.now(), (window.__t || 0) + 60); __frame(__t); } }
    finally { r.render = render; }
  };
});
await page.route('https://api.open-meteo.com/**', r => r.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 28, weather_code: 0, wind_speed_10m: 8 }, hourly: { time: [Date.now() / 1000 + 3600], precipitation_probability: [0], weather_code: [0] } } }));
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready, null, { timeout: 300000 });
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.locator('#hour').evaluate(e => { e.value = 11; e.dispatchEvent(new Event('input')); });
  await page.locator('[data-chapter="1"]').dispatchEvent('click');
  await page.evaluate(() => __advance());
  await page.locator('#enter-hall').dispatchEvent('click');
  console.log('Scene ready');
  const diagnostics = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { scene, camera, entranceWalk, architecture } = __portrait;
    const select = document.querySelector('#walk-route'), slider = document.querySelector('#walk-progress');
    const failures = [];
    scene.updateMatrixWorld(true);
    for (const route of ['stairs', 'terraceLeft', 'terraceRight', 'upperCorridor', 'classroom']) {
      select.value = route; select.dispatchEvent(new Event('change'));
      for (let p = 0; p <= 1000; p += 5) {
        slider.value = p; slider.dispatchEvent(new Event('input')); entranceWalk.update(0); camera.updateMatrixWorld();
        const down = new T.Raycaster(camera.position, new T.Vector3(0, -1, 0), 0, 8).intersectObject(architecture.group, true)[0];
        if (!down || down.distance < 1.25 || down.distance > 2.05) failures.push({ route, p, distance: down?.distance, position: camera.position.toArray() });
        const head = new T.Raycaster(camera.position, new T.Vector3(0, 1, 0), 0, .15).intersectObject(architecture.group, true)[0];
        if (head) failures.push({ route, p, headClearance: head.distance });
      }
    }
    const gates = scene.getObjectByName('Closed under-stair corner gates');
    const cavities = gates.children.map(g => {
      const side = Math.sign(g.position.x), start = new T.Vector3(side * 1.60, 1.2, -5.05);
      const hit = new T.Raycaster(start, new T.Vector3(side, 0, 0), 0, 5).intersectObject(architecture.group, true)[0];
      return hit?.distance;
    });
    const lock = scene.getObjectByName('Exterior sliding bolt and hanging padlock');
    lock.geometry.computeBoundingBox();
    const height = (x, z, start = 16) => {
      const hit = new T.Raycaster(new T.Vector3(x, start, z), new T.Vector3(0, -1, 0), 0, 20).intersectObject(architecture.group, true)[0];
      return hit?.point.y;
    };
    const stairways = scene.getObjectByName('Connected stairways: ground to roof');
    const windowHit = new T.Raycaster(new T.Vector3(.3, 4.5, -6.5), new T.Vector3(0, 0, -1), 0, 1).intersectObject(stairways, true)[0];
    const rearWindowBottom = new T.Box3().setFromObject(windowHit.object).min.y;
    const rearCanopyTop = height(0, -8.9, 6);
    const gate = scene.getObjectByName('Terrace double grille gate');
    const shutters = [];
    stairways.traverse(o => { if (o.name === 'Rear window with casement shutters and grille') shutters.push(o); });
    const joinFaces = [[-22.03, 7.61], [22.95, 12.11]].map(([x, y]) => new T.Raycaster(new T.Vector3(x, y + .5, 1.83), new T.Vector3(0, -1, 0), 0, .6).intersectObject(architecture.group, true).filter(hit => Math.abs(hit.point.y - y) < .005).length);
    return { failures, cavities, lockFace: lock.geometry.boundingBox.min.z,
      joinFaces,
      rearWindowCanopyGap: rearWindowBottom - rearCanopyTop,
      shutters: shutters.length,
      connectedFlights: stairways.userData.flights.slice(1).every(f => f.start === -.7),
      heights: { gateSide: height(-2.67, -2, 10.5), stoppedSide: height(2.67, -2, 10.5), groundApproach: height(2.67, .9, 1), leftStrip: height(-15, 1), leftWing: height(-28, 1), leftStepEnd: height(-22, 1.9), rightStrip: height(12, 1), rightWing: height(25, 1), roofDoor: height(0, 1.65, 13), roofApron: height(0, 3, 13), roofExit: height(5.1, 2.425, 13), cornerStep: height(4.35, 2.425, 13) },
      thirdWindow: windowHit?.object.material.transparent,
      inwardGate: gate.children.every(leaf => new T.Box3().setFromObject(leaf).min.x >= gate.position.x - .04 && new T.Box3().setFromObject(leaf).max.x > gate.position.x + .15),
    };
  });
  await writeFile('artifacts/stairs-terraces/diagnostics.json', JSON.stringify(diagnostics, null, 2));
  console.log('Geometry diagnostics:', JSON.stringify(diagnostics));
  assert.ok(diagnostics.heights.gateSide > diagnostics.heights.stoppedSide + 3, 'Only gate-side flight continues above second floor');
  assert.ok(Math.abs(diagnostics.heights.groundApproach - .164) < .02, 'Ground twin flights must not project into the hall');
  for (const [name, expected] of Object.entries({ leftStrip: 8.11, leftWing: 7.61, leftStepEnd: 7.61, rightStrip: 12.36, rightWing: 12.11, roofDoor: 12.11, roofApron: 12.11, roofExit: 12.36, cornerStep: 12.11 + .25 * 2 / 3 })) assert.ok(Math.abs(diagnostics.heights[name] - expected) < .02, name);
  assert.equal(diagnostics.shutters, 9, 'Each rear window has framed shutters');
  assert.equal(diagnostics.connectedFlights, true, 'Upper flights start at the preceding return landing');
  assert.equal(diagnostics.thirdWindow, true, 'Central first-floor rear window must be glazed, not solid wall');
  assert.ok(diagnostics.rearWindowCanopyGap > .1, 'All three first-floor rear windows must clear the canopy fascia');
  assert.equal(diagnostics.inwardGate, true, 'Terrace gate leaves must open inside');
  assert.deepEqual(diagnostics.joinFaces, [1, 1], 'Roof joins must not have coplanar duplicate treads');
  for (const [route, progress, name] of [['hall', 700, 'lower-gates'], ['stairs', 195, 'first-return'], ['stairs', 297, 'library-landing'], ['stairs', 820, 'top-windows'], ['stairs', 900, 'roof-stair'], ['terraceLeft', 100, 'left-gate'], ['terraceLeft', 450, 'left-roof'], ['terraceRight', 450, 'upper-tanks'], ['terraceRight', 850, 'upper-roof'], ['upperCorridor', 250, 'upper-corridor'], ['seminar', 220, 'strong-room-entry'], ['seminar', 490, 'strong-room-passage']]) {
    await page.selectOption('#walk-route', route);
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, progress);
    const colors = await page.evaluate(() => {
      __advance(); const { renderer, scene, camera } = __portrait; renderer.render(scene, camera);
      const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return new Set(pixels).size;
    });
    assert.ok(colors > 15, `${name}: nonblank scene`);
    await page.screenshot({ path: `artifacts/stairs-terraces/${name}.png` });
    console.log('Captured', name);
  }
  const beforeZoom = await page.evaluate(() => __portrait.camera.fov);
  await page.locator('#zoom-out').dispatchEvent('click');
  assert.ok(await page.evaluate(() => __portrait.camera.fov) > beforeZoom);
  await page.locator('#panorama').dispatchEvent('click');
  assert.equal(await page.evaluate(() => __portrait.entranceWalk.active), false, 'Panorama must release the guided camera');
  assert.equal(await page.locator('#walk-panel').isVisible(), false);
  assert.equal(await page.locator('#panorama').getAttribute('aria-pressed'), 'true');
  const dragBefore = await page.evaluate(() => {
    const { camera, renderer, scene } = __portrait; renderer.render(scene, camera);
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), pixels: renderer.domElement.toDataURL() };
  });
  await page.mouse.move(530, 320); await page.mouse.down(); await page.mouse.move(750, 385, { steps: 12 }); await page.mouse.up();
  const dragAfter = await page.evaluate(() => {
    __advance(); const { camera, renderer, scene } = __portrait; renderer.render(scene, camera);
    return { position: camera.position.toArray(), quaternion: camera.quaternion.toArray(), pixels: renderer.domElement.toDataURL() };
  });
  assert.notDeepEqual(dragAfter.quaternion, dragBefore.quaternion, 'Desktop panorama mouse drag must turn the camera');
  assert.deepEqual(dragAfter.position, dragBefore.position, 'Desktop look must stay at the eye');
  assert.notEqual(dragAfter.pixels, dragBefore.pixels, 'Desktop panorama drag must visibly change the canvas');
  await page.screenshot({ path: 'artifacts/stairs-terraces/panorama-after-drag.png' });
  assert.equal(await page.evaluate(() => document.elementFromPoint(700, 55) === __portrait.renderer.domElement), true, 'Empty header space must pass drags to the canvas');
  const freePosition = await page.evaluate(() => __portrait.camera.position.toArray());
  await page.locator('canvas[aria-label^="Interactive building"]').dispatchEvent('wheel', { deltaY: -100 });
  const movedPosition = await page.evaluate(() => { __advance(); return __portrait.camera.position.toArray(); });
  assert.notDeepEqual(movedPosition, freePosition, 'Free panorama movement must survive the next animation frame');
  await page.locator('#enter-hall').dispatchEvent('click');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.selectOption('#walk-route', 'stairs');
  await page.locator('#walk-progress').evaluate(e => { e.value = 210; e.dispatchEvent(new Event('input')); });
  await page.evaluate(() => { __advance(); __portrait.renderer.render(__portrait.scene, __portrait.camera); });
  await page.screenshot({ path: 'artifacts/stairs-terraces/mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#walk-exit').dispatchEvent('click');
  await page.evaluate(() => __advance());
  await page.locator('#panorama').dispatchEvent('click');
  const cameraBefore = await page.evaluate(() => ({ position: __portrait.camera.position.toArray(), quaternion: __portrait.camera.quaternion.toArray(), fov: __portrait.camera.fov }));
  await page.mouse.move(170, 350); await page.mouse.down(); await page.mouse.move(250, 390, { steps: 8 }); await page.mouse.up();
  const cameraAfter = await page.evaluate(() => { __advance(); return { position: __portrait.camera.position.toArray(), quaternion: __portrait.camera.quaternion.toArray(), fov: __portrait.camera.fov, shade: getComputedStyle(document.querySelector('.shade')).backgroundImage }; });
  assert.deepEqual(cameraAfter.position, cameraBefore.position, 'Looking must not orbit or move the eye');
  assert.notDeepEqual(cameraAfter.quaternion, cameraBefore.quaternion, 'Dragging must turn the camera');
  assert.equal(cameraAfter.fov, cameraBefore.fov, 'Dragging must not distort the field of view');
  assert.equal(cameraAfter.shade, 'none', 'Exploration must not have the dark screen overlay');
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [name, eye, target] of [
    ['gate-side-flight', [.2, 10.094, 2.9], [-1.5, 10.6, -3]],
    ['rear-window-canopy-clearance', [0, 6.5, -16], [0, 4.2, -6.9]],
    ['terrace-gate-steps', [-8, 9.76, 2.17], [-3.9, 9.5, 2.17]],
    ['left-elevation', [-28, 9.4, 5.5], [-14, 8.9, 0]],
    ['roof-exit-steps', [0, 13.76, 2.425], [8, 12.9, 2.425]],
    ['roof-door-apron', [7, 16.5, 8], [0, 12.8, 1.8]],
    ['ceiling-fan', [0, 2.4, 5.2], [0, 3.35, 3.9]],
    ['roof-enclosure', [15, 21, 17], [0, 13.2, -1]],
  ]) {
    const colors = await page.evaluate(({ eye, target }) => {
      const { camera, renderer, scene } = __portrait; camera.position.fromArray(eye); camera.lookAt(...target); camera.fov = 62; camera.updateProjectionMatrix(); renderer.render(scene, camera);
      const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4); gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels); return new Set(pixels).size;
    }, { eye, target });
    assert.ok(colors > 15); await page.screenshot({ path: `artifacts/stairs-terraces/${name}.png` });
  }
  assert.ok(diagnostics.cavities.every(d => d > 1.8), 'Both gates must have usable depth behind them');
  assert.ok(diagnostics.lockFace > .07, 'Lock must be outside the timber leaf');
  assert.deepEqual(errors, []);
  assert.deepEqual(diagnostics.failures, [], 'Routes must remain supported without passing through stairs or slabs');
  console.log('PASS stair/terrace geometry, roof shelter, lock face, nonblank desktop/mobile, indoor zoom and panorama');
} finally { await browser.close(); }
