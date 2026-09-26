import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { lunarState } from '../src/sky.js';

const location = { latitude: 17.728889, longitude: 83.323611 };
const newMoon = lunarState(new Date('2026-09-11T12:00:00Z'), location);
const fullMoon = lunarState(new Date('2026-09-26T12:00:00Z'), location);
assert.ok(newMoon.illumination < .02 && fullMoon.illumination > .98);
assert.ok(Number.isFinite(fullMoon.rotation));
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .6, reducedMotion: 'reduce' });
page.setDefaultTimeout(90000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
let code = 0, offline = false;
await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: offline ? {} : {
  current: { time: Date.now() / 1000, temperature_2m: 28, precipitation: code >= 61 ? 2 : 0, rain: code >= 61 ? 1 : 0, showers: 0, weather_code: code, cloud_cover: code ? 95 : 5, wind_speed_10m: 12 },
  hourly: { time: [Date.now() / 1000 + 3600], precipitation_probability: [code ? 80 : 5], weather_code: [code] }
} }));
async function hour(value) {
  await page.locator('#hour').evaluate((e, h) => { e.value = h; e.dispatchEvent(new Event('input')); }, value);
  await page.waitForFunction(h => Math.abs(__portrait.hour - h) < .1, value);
}
async function refresh() { await page.evaluate(() => __portrait.refreshWeather()); }
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5176', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await refresh();
  await page.waitForFunction(() => __portrait.weather.loaded);
  const geometry = await page.evaluate(() => {
    const { architecture, landscape, scene, renderer, camera } = __portrait;
    renderer.render(scene, camera);
    const gl = renderer.getContext(), p = new Uint8Array(64 * 64 * 4);
    gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, p);
    let surrounds = 0; scene.traverse(m => { if (m.name === 'Broken square tree surround') surrounds++; });
    return { trees: landscape.garden.trees.length, rightTrees: landscape.garden.trees.filter(t => t.x > 0 && t.x < 20 && t.z < 15).length, surrounds, panels: architecture.doors.map(d => d.pivot.children.filter(m => m.name === 'Single tall inset panel').length), colors: new Set(p).size };
  });
  assert.equal(geometry.trees, 9); assert.equal(geometry.rightTrees, 1); assert.ok(geometry.surrounds > 30);
  assert.deepEqual(geometry.panels, [2, 2]); assert.ok(geometry.colors > 25);
  await hour(21); await page.screenshot({ path: 'artifacts/live-night.png' });
  await page.locator('[data-chapter="1"]').click();
  await hour(16.5); await page.screenshot({ path: 'artifacts/live-entrance.png' });
  await page.locator('#door').click();
  await page.waitForFunction(() => __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y + d.side * Math.PI) < .002));
  await page.locator('#door').click();
  await page.locator('#reset').click();
  for (const weatherCode of [3, 61, 95]) {
    code = weatherCode; await refresh();
    const weather = await page.evaluate(() => ({ ...__portrait.weather }));
    assert.equal(weather.code, code); assert.equal(weather.storm, code === 95);
    assert.equal(weather.rainFactor > 0, code >= 61);
    assert.match(weather.forecast, /80%/);
  }
  await hour(21); await page.screenshot({ path: 'artifacts/live-storm.png' });
  offline = true; await refresh();
  assert.match(await page.locator('#weather-label').textContent(), /LAST REPORT/);
  assert.equal(await page.evaluate(() => __portrait.weather.code), 95);
  offline = false; code = 0; await refresh();
  await page.locator('#live-clock').evaluate(e => { e.checked = true; e.dispatchEvent(new Event('change')); });
  assert.equal(await page.evaluate(() => __portrait.liveClock), true);
  assert.match(await page.locator('#time-label').textContent(), /IST \/ LIVE/);
  await hour(21);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#reset').click(); await page.screenshot({ path: 'artifacts/live-mobile.png' });
  await page.locator('#light').click(); await page.screenshot({ path: 'artifacts/live-mobile-settings.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  code = 61;
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await refresh();
  await page.waitForFunction(() => __portrait.scene.getObjectByName('Live rain').visible);
  const before = await page.evaluate(() => ({ rain: __portrait.scene.getObjectByName('Live rain').instanceMatrix.array[13], cloud: __portrait.scene.getObjectByName('Live moving cloud cover').material.uniforms.time.value }));
  await page.waitForFunction(b => __portrait.scene.getObjectByName('Live rain').instanceMatrix.array[13] !== b.rain && __portrait.scene.getObjectByName('Live moving cloud cover').material.uniforms.time.value > b.cloud, before);
  await page.screenshot({ path: 'artifacts/live-moving-rain.png' });
  assert.deepEqual(errors, []);
  console.log('PASS lunar phase, reference geometry, canvas, inward doors, weather states, offline recovery, live clock, moving rain/clouds and mobile layout', geometry);
} catch (error) {
  console.error('Scene errors:', errors);
  console.error('Weather state:', await page.evaluate(() => window.__portrait?.weather).catch(() => null));
  throw error;
} finally { await browser.close(); }
