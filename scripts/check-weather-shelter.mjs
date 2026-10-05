import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import { rainfall, windVector, isSheltered, shelters } from '../src/weather-effects.js';

assert.equal(rainfall({ rain: 2, showers: 1, precipitation: 3 }).rate, 3);
assert.equal(rainfall({ snowfall: 2, precipitation: 2 }).factor, 0);
assert.equal(rainfall({ weather_code: 0 }).factor, 0);
assert.ok(rainfall({ rain: .1 }).factor < rainfall({ rain: 8 }).factor);
assert.ok(Math.abs(windVector(36, 90).x + 10) < 1e-6);
assert.ok(Math.abs(windVector(36, 0).y - 10) < 1e-6);
for (const s of shelters) {
  assert.equal(isSheltered(s.x, s.top - .1, s.z), true);
}
assert.equal(isSheltered(0, 20, 0), false);
assert.equal(isSheltered(12, 2, 15), false);
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .7 });
page.setDefaultTimeout(120000);
// Advance animation explicitly so software WebGL does not spend minutes drawing
// intermediate frames that are irrelevant to the assertions.
await page.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => {
    if (callback.name === 'animate') { window.__sceneFrame = callback; return 0; }
    return raf(callback);
  };
  window.__advanceScene = (frames = 1) => {
    const { renderer } = window.__portrait, render = renderer.render;
    renderer.render = () => {};
    try {
      for (let i = 0; i < frames; i++) {
        window.__testTime = Math.max(performance.now(), (window.__testTime || 0) + 60);
        window.__sceneFrame(window.__testTime);
      }
    } finally { renderer.render = render; }
  };
});
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
let rain = .1, wind = 0;
await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
  current: { time: Date.now() / 1000, temperature_2m: 27, weather_code: rain ? 63 : 0, rain, showers: 0, precipitation: rain, cloud_cover: 90, wind_speed_10m: wind, wind_gusts_10m: wind * 1.4, wind_direction_10m: 90 },
  hourly: { time: [Date.now() / 1000 + 3600], precipitation_probability: [80], weather_code: [63] }
} }));
try {
  await page.goto(process.argv[2] || 'http://localhost:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  console.log('Scene ready');
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.evaluate(() => __portrait.refreshWeather());
  await page.evaluate(() => __advanceScene(120));
  assert.ok(await page.evaluate(() => __portrait.rain.current > .025));
  const drizzle = await page.evaluate(() => __portrait.scene.getObjectByName('Live rain').count);
  rain = 9; wind = 38;
  await page.evaluate(() => __portrait.refreshWeather());
  await page.evaluate(() => __advanceScene(120));
  assert.ok(await page.evaluate(() => __portrait.rain.current > .8));
  const heavy = await page.evaluate(() => __portrait.scene.getObjectByName('Live rain').count);
  assert.ok(heavy > drizzle * 4);
  console.log('Rain intensity responds', { drizzle, heavy });
  const before = await page.evaluate(() => __portrait.scene.getObjectByName('Live rain').instanceMatrix.array[13]);
  await page.evaluate(() => __advanceScene());
  assert.notEqual(await page.evaluate(() => __portrait.scene.getObjectByName('Live rain').instanceMatrix.array[13]), before);
  const particleCheck = await page.evaluate(async () => {
    const { isSheltered } = await import('/src/weather-effects.js');
    const mesh = __portrait.scene.getObjectByName('Live rain');
    let sheltered = 0;
    for (let t = 0; t < 180; t++) {
      __portrait.rain.update(.06, __portrait.weather);
      const a = mesh.instanceMatrix.array;
      for (let i = 0; i < mesh.count; i++) if (isSheltered(a[i * 16 + 12], a[i * 16 + 13], a[i * 16 + 14])) sheltered++;
    }
    return { sheltered, strength: __portrait.landscape.windStrength.value };
  });
  assert.equal(particleCheck.sheltered, 0);
  assert.ok(particleCheck.strength > .2);
  const pixels = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { createRain } = await import('/src/weather-effects.js');
    const scene = new T.Scene(), camera = new T.OrthographicCamera(-1, 1, 1, -1, .1, 10);
    const renderer = new T.WebGLRenderer(); renderer.setSize(64, 64); renderer.setClearColor(0x000000, 1);
    const effect = createRain(scene, camera); effect.update(1, { rainFactor: 1, windSpeed: 0 });
    const mesh = scene.children[0]; mesh.count = 1; mesh.material.opacity = 1;
    function sample(x) {
      camera.position.set(x, 2, 4); camera.lookAt(x, 2, 0); camera.updateMatrixWorld();
      mesh.setMatrixAt(0, new T.Matrix4().compose(new T.Vector3(x, 2, 0), new T.Quaternion(), new T.Vector3(60, 1, 1))); mesh.instanceMatrix.needsUpdate = true;
      renderer.render(scene, camera);
      const gl = renderer.getContext(), data = new Uint8Array(64 * 64 * 4); gl.readPixels(0, 0, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, data);
      let lit = 0; for (let i = 0; i < data.length; i += 4) if (data[i] > 0) lit++;
      return lit;
    }
    const inside = sample(0), outside = sample(45);
    renderer.dispose(); mesh.geometry.dispose(); mesh.material.dispose();
    return { inside, outside };
  });
  assert.equal(pixels.inside, 0); assert.ok(pixels.outside > 100);
  console.log('GPU shelter clipping passed', pixels);
  await page.evaluate(() => __portrait.renderer.render(__portrait.scene, __portrait.camera));
  await page.screenshot({ path: 'artifacts/weather-outdoor-desktop.png' });
  await page.locator('[data-chapter="1"]').dispatchEvent('click');
  await page.evaluate(() => __advanceScene(60));
  await page.locator('#enter-hall').dispatchEvent('click');
  await page.locator('#walk-progress').evaluate(e => { e.value = 700; e.dispatchEvent(new Event('input')); });
  await page.evaluate(() => __advanceScene(60));
  assert.equal(await page.evaluate(() => {
    const { camera } = __portrait;
    return camera.position.y < 3 && camera.position.z < 0;
  }), true, 'Walkthrough camera should be inside the roofed hall');
  assert.ok(await page.evaluate(() => __portrait.scene.getObjectByName('Live rain').visible));
  await page.evaluate(() => __portrait.renderer.render(__portrait.scene, __portrait.camera));
  await page.screenshot({ path: 'artifacts/weather-sheltered-desktop.png' });
  console.log('Indoor view captured; outdoor rain remains enabled');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'artifacts/weather-sheltered-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  rain = 0; wind = 0;
  await page.evaluate(() => __portrait.refreshWeather());
  await page.evaluate(() => __advanceScene(240));
  assert.ok(await page.evaluate(() => !__portrait.scene.getObjectByName('Live rain').visible && __portrait.landscape.windStrength.value < .02));
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.selectOption('#walk-route', 'classroom');
  for (const [progress, name] of [[0, 'entrance'], [350, 'corridor'], [700, 'class-iii'], [950, 'side-passage']]) {
    await page.locator('#walk-progress').evaluate((e, p) => { e.value = p; e.dispatchEvent(new Event('input')); }, progress);
    await page.evaluate(() => __advanceScene(60));
    const colors = await page.evaluate(() => {
      const { renderer, scene, camera } = __portrait; renderer.render(scene, camera);
      const gl = renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return new Set(pixels).size;
    });
    await page.screenshot({ path: `artifacts/classroom-${name}.png` });
    assert.ok(colors > 15, `${name} must not be blank`);
    console.log('Classroom view captured:', name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#walk-progress').evaluate(e => { e.value = 300; e.dispatchEvent(new Event('input')); });
  await page.evaluate(() => { __advanceScene(60); __portrait.renderer.render(__portrait.scene, __portrait.camera); });
  await page.screenshot({ path: 'artifacts/classroom-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS shelter volumes, rainfall scaling, moving drops, wind response, GPU indoor clipping/outdoor visibility, clear-weather recovery and mobile layout', { drizzle, heavy, particleCheck, pixels });
} finally { await browser.close(); }
