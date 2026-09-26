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
page.setDefaultTimeout(90000);
await page.clock.setFixedTime(instant);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
await page.route('https://api.open-meteo.com/**', r => r.fulfill({ json: { current: { time: instant.getTime() / 1000, temperature_2m: 27, precipitation: 0, rain: 0, showers: 0, weather_code: 0, cloud_cover: 1, wind_speed_10m: 9 } } }));
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5176', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.evaluate(() => __portrait.refreshWeather());
  const position = await page.evaluate(() => {
    const { scene, camera, renderer, moon } = __portrait;
    renderer.render(scene, camera);
    const object = scene.getObjectByName('Photographic phased moon');
    const relative = object.position.clone().sub(camera.position);
    const gl = renderer.getContext(), bytes = new Uint8Array(64 * 64 * 4);
    gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight * .34 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, bytes);
    return { visible: object.visible, altitude: moon.altitude, relative: relative.toArray(), radius: relative.length(), pixels: new Set(bytes).size };
  });
  assert.equal(position.visible, true);
  assert.ok(position.altitude > 60 && position.relative[1] > 20 && position.radius > 200);
  assert.ok(position.pixels > 25);
  await page.screenshot({ path: 'artifacts/decorative-moon-desktop.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset').click();
  await page.screenshot({ path: 'artifacts/decorative-moon-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.match(await page.locator('#weather-label').textContent(), /FULL MOON/);
  assert.match(await page.locator('#moon-detail').textContent(), /99\.9%|100\.0% illuminated/);
  assert.deepEqual(errors, []);
  console.log('PASS live lunar calculations, decorative moon framing, full-moon metadata, mobile canvas and solar timing', position);
} finally { await browser.close(); }
