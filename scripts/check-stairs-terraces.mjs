import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';
import { isSheltered } from '../src/weather-effects.js';

assert.equal(isSheltered(0, 14.5, -3), true);
assert.equal(isSheltered(-5.1, 10, 2), true);
assert.equal(isSheltered(-15, 10, 1), false);
assert.equal(isSheltered(25, 14, 1), false);
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
    for (const route of ['stairs', 'terraceLeft', 'terraceRight', 'upperCorridor']) {
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
    return { failures, cavities, lockFace: lock.geometry.boundingBox.min.z };
  });
  await writeFile('artifacts/stairs-terraces/diagnostics.json', JSON.stringify(diagnostics, null, 2));
  console.log('Geometry diagnostics:', JSON.stringify(diagnostics));
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
  assert.equal(await page.evaluate(() => __portrait.entranceWalk.active), true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.selectOption('#walk-route', 'stairs');
  await page.locator('#walk-progress').evaluate(e => { e.value = 210; e.dispatchEvent(new Event('input')); });
  await page.evaluate(() => { __advance(); __portrait.renderer.render(__portrait.scene, __portrait.camera); });
  await page.screenshot({ path: 'artifacts/stairs-terraces/mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.ok(diagnostics.cavities.every(d => d > 1.8), 'Both gates must have usable depth behind them');
  assert.ok(diagnostics.lockFace > .07, 'Lock must be outside the timber leaf');
  assert.deepEqual(errors, []);
  assert.deepEqual(diagnostics.failures, [], 'Routes must remain supported without passing through stairs or slabs');
  console.log('PASS stair/terrace geometry, roof shelter, lock face, nonblank desktop/mobile, indoor zoom and panorama');
} finally { await browser.close(); }
