import assert from 'node:assert/strict';
import { Vector2, Vector3, Box3, BufferGeometry, Float32BufferAttribute, Mesh, MeshStandardMaterial, MeshDepthMaterial } from 'three';
import { updateWind, applyWind } from '../src/weather-effects.js';
import { applyModelWind, clearModelVegetation } from '../src/blender-environment.js';

const makeState = () => ({ wind: { value: 0 }, windStrength: { value: 0 }, windDirection: { value: new Vector2(0, 1) } });
function settle(speed, fps = 60) {
  const state = makeState();
  for (let i = 0; i < fps * 8; i++) updateWind(state, { windSpeed: speed, windDirection: 90 }, 1 / fps);
  return state;
}
assert.equal(settle(0).windStrength.value, 0);
assert.ok(settle(8).windStrength.value < settle(30).windStrength.value);
assert.ok(settle(500).windStrength.value <= 1.5);
assert.ok(Math.abs(settle(25, 30).windStrength.value - settle(25, 144).windStrength.value) < 1e-6);
const state = settle(30), before = state.windDirection.value.clone();
updateWind(state, { windSpeed: 30, windDirection: 270 }, 1 / 60);
assert.ok(state.windDirection.value.distanceTo(before) < .03, 'Direction updates cannot snap');
for (let i = 0; i < 600; i++) {
  const speed = updateWind(state, { windSpeed: 10, windGusts: 35, windDirection: 270 }, 1 / 60);
  assert.ok(speed >= 10 && speed <= 35);
  assert.ok(state.windDirection.value.length() <= 1.000001);
}
const time = state.wind.value;
updateWind(state, { windSpeed: 50 }, 1, true);
assert.equal(state.wind.value, time);
assert.equal(state.windStrength.value, 0, 'Reduced motion stops wind deformation');
for (const Material of [MeshStandardMaterial, MeshDepthMaterial]) {
  const trunk = new Material(), leaf = new Material();
  applyWind(trunk, state.wind, state.windStrength, state.windDirection);
  applyWind(leaf, state.wind, state.windStrength, state.windDirection, 1);
  assert.notEqual(trunk.customProgramCacheKey(), leaf.customProgramCacheKey());
  const model = new Material();
  applyModelWind(model, state, 12);
  const shader = { uniforms: {}, vertexShader: '#include <project_vertex>' };
  model.onBeforeCompile(shader);
  assert.equal(shader.uniforms.uWindStrength, state.windStrength);
  assert.equal(shader.uniforms.uWindDirection, state.windDirection);
  assert.ok(shader.vertexShader.includes('_wind.x * wave'), 'Blender weights drive both color and depth shaders');
}
const geometry = new BufferGeometry();
geometry.setAttribute('position', new Float32BufferAttribute([0, 1, 0, .1, 1, 0, 0, 1.1, 0, 10, 1, 0, 10.1, 1, 0, 10, 1.1, 0], 3));
geometry.setIndex([0, 1, 2, 3, 4, 5]);
const plant = new Mesh(geometry, new MeshStandardMaterial()); plant.updateMatrixWorld(true);
assert.equal(clearModelVegetation(plant, [new Box3(new Vector3(-1, 0, -1), new Vector3(1, 2, 1))], 12), 1);
assert.equal(plant.geometry.index.count, 3);
assert.equal(geometry.index.count, 6, 'Shared export geometry is not mutated by clearance pruning');
console.log('PASS calm, speed scaling, gust bounds, frame-rate independence, direction smoothing and reduced motion');

if (process.argv.includes('--browser')) {
  const { chromium } = await import('playwright');
  const { mkdir } = await import('node:fs/promises');
  await mkdir('artifacts/wind', { recursive: true });
  const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .5 });
    page.setDefaultTimeout(180000);
    await page.clock.setFixedTime(new Date('2026-10-11T06:30:00Z'));
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
    await page.addInitScript(() => {
      const raf = requestAnimationFrame.bind(window);
      window.requestAnimationFrame = callback => {
        if (callback.name === 'animate') { window.__windFrame = callback; return 0; }
        return raf(t => {
          if (window.__portrait && !__portrait.ready) {
            __portrait.renderer.shadowMap.enabled = false;
            __portrait.renderer.setPixelRatio(.5);
          }
          callback(t);
        });
      };
    });
    await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: {
      current: { time: Date.parse('2026-10-11T06:30:00Z') / 1000, temperature_2m: 27, weather_code: 0, cloud_cover: 10, wind_speed_10m: 18, wind_gusts_10m: 28, wind_direction_10m: 90 },
    } }));
    await page.goto('http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
    await page.waitForFunction(() => window.__portrait?.ready);
    await page.locator('#loader').waitFor({ state: 'hidden' });
    await page.evaluate(() => __portrait.refreshWeather());
    const live = await page.evaluate(() => {
      const { renderer, landscape, weather } = __portrait, render = renderer.render;
      renderer.render = () => {};
      try {
        const start = performance.now();
        for (let i = 0; i < 120; i++) __windFrame(start + i * 60);
      } finally { renderer.render = render; }
      return { loaded: weather.loaded, speed: weather.windSpeed, gusts: weather.windGusts, strength: landscape.windStrength.value };
    });
    assert.equal(live.loaded, true);
    assert.equal(live.speed, 18); assert.equal(live.gusts, 28);
    assert.ok(live.strength > .2, 'Weather readings drive wind through the real animation loop');
    console.log('PASS live weather to vegetation', live);
    for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
      await page.setViewportSize({ width, height });
      const pixels = await page.evaluate(() => {
        const { renderer, scene, camera, landscape } = __portrait;
        renderer.shadowMap.enabled = false; renderer.setPixelRatio(.5);
        camera.position.set(2, 6, 24); camera.lookAt(-8, 9, 9); camera.updateMatrixWorld();
        function sample(time, strength) {
          landscape.wind.value = time; landscape.windStrength.value = strength;
          renderer.render(scene, camera);
          const gl = renderer.getContext(), data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
          gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
          return data;
        }
        const difference = (a, b) => a.reduce((n, v, i) => n + (Math.abs(v - b[i]) > 2 ? 1 : 0), 0);
        const calm = sample(0, 0), still = sample(8, 0), breeze = sample(0, .75), moving = sample(2, .75);
        return { colors: new Set(calm).size, calmChanges: difference(calm, still), windChanges: difference(breeze, moving) };
      });
      assert.ok(pixels.colors > 30, 'Canvas must show a rendered scene');
      assert.equal(pixels.calmChanges, 0, 'Zero wind must be motionless');
      assert.ok(pixels.windChanges > 100, 'Wind must visibly animate vegetation');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: `artifacts/wind/${name}.png` });
      console.log('PASS GPU wind', name, pixels);
    }
    assert.deepEqual(errors, []);
  } finally { await browser.close(); }
}
