import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { lunarState, solarState, campusDate, skyDirection } from '../src/sky.js';

const location = { latitude: 17.728889, longitude: 83.323611 };
const instant = new Date('2026-09-26T16:49:00Z');
const moon = lunarState(instant, location);
assert.ok(moon.altitude > 60 && moon.altitude < 70);
assert.ok(moon.illumination > .999);
assert.equal(solarState(instant, location).night, 1);
assert.equal(campusDate(0, instant.getTime()).toISOString(), '2026-09-25T18:30:00.000Z');
assert.equal(solarState(campusDate(12, instant.getTime()), location).night, 0);
assert.ok(lunarState(campusDate(12, instant.getTime()), location).altitude < 0);
assert.ok(Math.abs(skyDirection(moon.altitude, moon.azimuth).length() - 1) < 1e-9);

const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .6, reducedMotion: 'reduce' });
page.setDefaultTimeout(120000);
await page.clock.setFixedTime(instant);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') { console.error(m.text()); if (/shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); } });
await page.route('https://api.open-meteo.com/**', r => r.fulfill({ json: { current: { time: instant.getTime() / 1000, temperature_2m: 27, precipitation: 0, rain: 0, showers: 0, weather_code: 0, cloud_cover: 1, wind_speed_10m: 9 } } }));
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5176', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' }).catch(async error => { console.error(await page.locator('#loader').innerText(), errors); throw error; });
  await page.evaluate(() => __portrait.refreshWeather());
  const position = await page.evaluate(() => {
    const { scene, camera, renderer, moon } = __portrait;
    renderer.render(scene, camera);
    const object = scene.getObjectByName('Photographic phased moon');
    const relative = object.position.clone().sub(camera.position);
    const gl = renderer.getContext(), bytes = new Uint8Array(64 * 64 * 4);
    gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight * .34 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return { visible: object.visible, diameter: object.geometry.parameters.width, altitude: moon.altitude, relative: relative.toArray(), radius: relative.length(), pixels: new Set(bytes).size };
  });
  assert.equal(position.visible, true);
  assert.equal(position.diameter, 11.5, 'Moon stays a small backdrop accent');
  assert.ok(position.altitude > 60 && position.relative[1] > 20 && position.radius > 200);
  assert.ok(position.pixels > 25);
  await page.screenshot({ path: 'artifacts/decorative-moon-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset').click();
  await page.screenshot({ path: 'artifacts/decorative-moon-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.match(await page.locator('#weather-label').textContent(), /FULL MOON/);
  assert.match(await page.locator('#moon-detail').textContent(), /99\.9%|100\.0% illuminated/);
  const phasePixels = await page.evaluate(() => {
    const { scene, camera, renderer } = __portrait;
    const source = scene.getObjectByName('Photographic phased moon'), moon = source.clone();
    moon.material = source.material.clone(); moon.material.uniforms.light.value.set(1, 0, 0); moon.material.uniforms.opacity.value = 1;
    const testScene = new scene.constructor(); testScene.background = scene.fog.color.clone().set('#123456'); testScene.add(moon);
    const testCamera = camera.clone(); testCamera.aspect = 1; testCamera.fov = 6; testCamera.lookAt(moon.position); testCamera.updateProjectionMatrix();
    renderer.setSize(192, 192, false); renderer.render(testScene, testCamera);
    const gl = renderer.getContext(), w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
    const sample = (x, y) => { const p = new Uint8Array(4); gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, p); return Array.from(p).slice(0, 3); };
    const result = { sky: sample(2, 2), dark: sample(Math.floor(w * .40), Math.floor(h / 2)), lit: sample(Math.floor(w * .60), Math.floor(h / 2)) };
    moon.material.dispose(); renderer.setSize(innerWidth, innerHeight, false); renderer.render(scene, camera);
    return result;
  });
  assert.deepEqual(phasePixels.dark, phasePixels.sky, 'Unilluminated half is transparent, not a dark disc');
  assert.ok(phasePixels.lit.some((v, i) => Math.abs(v - phasePixels.sky[i]) > 20), 'Illuminated half retains lunar texture');
  for (const hour of [10, 12, 16.5]) {
    await page.locator('#hour').evaluate((e, hour) => { e.value = hour; e.dispatchEvent(new Event('input')); }, hour);
    await page.waitForFunction(() => !__portrait.scene.getObjectByName('Photographic phased moon').visible);
    assert.equal(await page.evaluate(() => __portrait.scene.getObjectByName('Photographic phased moon').material.uniforms.opacity.value), 0);
  }
  await page.screenshot({ path: 'artifacts/celestial-daylight-no-moon.png' });
  assert.deepEqual(errors, []);
  console.log('PASS small night-only moon, transparent dark phase, live lunar calculations, desktop/mobile framing and daylight hiding', position, phasePixels);
} finally { await browser.close(); }
