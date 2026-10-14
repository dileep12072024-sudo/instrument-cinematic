import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader', '--disable-dev-shm-usage'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
page.setDefaultTimeout(180000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/.test(m.text())) errors.push(m.text()); });
await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 28, precipitation: 0, rain: 0, showers: 0, weather_code: 0, cloud_cover: 5, wind_speed_10m: 9 }, hourly: { time: [], precipitation_probability: [], weather_code: [] } } }));
async function hour(value) {
  await page.locator('#hour').evaluate((e, h) => { e.value = h; e.dispatchEvent(new Event('input')); }, value);
  await page.waitForFunction(h => Math.abs(__portrait.hour - h) < .02, value);
}
async function view(name, eye, target) {
  const stats = await page.evaluate(({ eye, target }) => {
    const p = __portrait;
    p.camera.position.set(...eye); p.controls.target.set(...target); p.controls.update(); p.renderer.render(p.scene, p.camera);
    const gl = p.renderer.getContext(), pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return { colors: new Set(pixels).size, calls: p.renderer.info.render.calls, triangles: p.renderer.info.render.triangles };
  }, { eye, target });
  assert.ok(stats.colors > 25, `${name}: canvas must show geometry`);
  await page.screenshot({ path: `artifacts/details-${name}.png` });
  console.log(name, stats);
}
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5176', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  const checks = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { architecture: a, footprint, scene } = __portrait;
    const bounds = material => {
      const mesh = a.group.children.find(m => m.material === material); mesh.geometry.computeBoundingBox();
      return { min: mesh.geometry.boundingBox.min.toArray(), max: mesh.geometry.boundingBox.max.toArray() };
    };
    const light = scene.getObjectByName('Entrance tube light');
    const ray = new T.Raycaster(light.position, new T.Vector3(0, 1, 0), 0, 1);
    const hits = ray.intersectObject(a.group, true);
    const occluder = hits.find(h => h.object.castShadow && h.object.material === a.materials.wall);
    const units = a.group.children.find(m => m.material?.name === 'Right canopy AC casings');
    units.geometry.computeBoundingBox();
    return {
      west: footprint[0], eastGate: bounds(a.materials.gate), westGate: bounds(a.materials.westGate),
      ac: { min: units.geometry.boundingBox.min.toArray(), max: units.geometry.boundingBox.max.toArray() },
      light: { shadow: light.castShadow, map: !!light.shadow.map, ceilingDistance: occluder?.distance, position: light.position.toArray() },
    };
  });
  assert.equal(checks.west.bays, 4); assert.equal(checks.west.width, 12);
  assert.ok(checks.eastGate.max[2] - checks.eastGate.min[2] > 3.9);
  assert.ok(checks.westGate.min[0] > -25 && checks.westGate.max[0] < -22);
  assert.ok(checks.westGate.min[2] > 15 && checks.westGate.max[2] < 15.2);
  assert.ok(checks.ac.min[0] >= 31 && checks.ac.max[0] < 32);
  assert.ok(checks.light.shadow && checks.light.map && checks.light.ceilingDistance > 0 && checks.light.ceilingDistance < .2);
  console.log('Reference geometry and canopy occlusion:', checks);
  await hour(10);
  const hide = await page.addStyleTag({ content: '#experience > :not(#viewport){visibility:hidden!important}' });
  if (process.argv[3] !== 'night') {
    await view('west-end', [-28, 5.5, 31], [-28, 4.5, 15]);
    await view('east-gate', [9, 5.5, 9], [22, 4.8, 9]);
    await view('ac-canopy', [42, 5.5, 20], [31, 4.5, 1]);
    await view('screen', [-16, 2.4, 9.125], [-22, 1.9, 9.125]);
  }
  await view('ground-trees', [-14, 3, 32], [-10, 5, 12]);
  await hour(22);
  await view('canopy-night', [8, 7, 17], [0, 3.5, 8.8]);
  await hide.evaluate(e => e.remove());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset').click();
  await page.waitForTimeout(2000);
  await page.screenshot({ path: 'artifacts/details-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('#panorama').click();
  assert.equal(await page.evaluate(() => __portrait.controls.enablePan), true);
  await view('mobile-wing', [-12, 5.5, 32], [-26, 4.8, 12]);
  assert.deepEqual(errors, []);
  console.log('PASS reference details, shadow occlusion, desktop/mobile canvas and panorama');
} finally { await browser.close(); }
