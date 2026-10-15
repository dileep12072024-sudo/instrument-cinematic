import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

await mkdir('artifacts/classroom-review', { recursive: true });
const executablePath = process.env.CHROMIUM_PATH || (process.platform === 'win32' ? 'C:/Program Files/Google/Chrome/Application/chrome.exe' : '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome');
const browser = await chromium.launch({ executablePath, args: ['--no-sandbox', ...(process.platform === 'win32' ? ['--use-angle=d3d11'] : ['--enable-unsafe-swiftshader'])] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .75 });
page.setDefaultTimeout(300000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|THREE|WebGL/i.test(message.text())) errors.push(message.text()); });
await page.addInitScript(() => {
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = callback => { if (callback.name === 'animate') { window.__frame = callback; return 0; } return raf(callback); };
  window.__advance = () => {
    const renderer = __portrait.renderer, render = renderer.render; renderer.render = () => {};
    try { for (let i = 0; i < 80; i++) { window.__time = Math.max(performance.now(), (window.__time || 0) + 60); __frame(__time); } }
    finally { renderer.render = render; }
  };
});
await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 28, weather_code: 0, wind_speed_10m: 8 }, hourly: { time: [Date.now() / 1000 + 3600], precipitation_probability: [0], weather_code: [0] } } }));
try {
  await page.goto(process.argv[2] || 'http://localhost:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  console.log('Renderer:', await page.evaluate(() => {
    const gl = __portrait.renderer.getContext(), info = gl.getExtension('WEBGL_debug_renderer_info');
    return info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : 'Unavailable';
  }));
  assert.ok(await page.evaluate(() => __portrait.scene.getObjectByName('Class III information plaque')?.material.map.image?.width > 0), 'Modelled plaque lettering is available');
  await page.waitForFunction(() => typeof window.__frame === 'function');
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.locator('#hour').evaluate(e => { e.value = 11; e.dispatchEvent(new Event('input')); });
  await page.locator('[data-chapter="1"]').dispatchEvent('click');
  await page.evaluate(() => __advance());
  await page.locator('#enter-hall').dispatchEvent('click');
  await page.selectOption('#walk-route', 'classroom');
  console.log('Classroom scene ready');
  const failures = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { camera, entranceWalk, architecture, scene } = __portrait;
    const slider = document.querySelector('#walk-progress'), failures = [];
    scene.updateMatrixWorld(true);
    for (let p = 0; p <= 1000; p += 2) {
      slider.value = p; slider.dispatchEvent(new Event('input')); entranceWalk.update(0); camera.updateMatrixWorld();
      const hit = new T.Raycaster(camera.position, new T.Vector3(0, -1, 0), 0, 3).intersectObject(architecture.group, true)[0];
      if (!hit || hit.distance < 1.25 || hit.distance > 1.95) failures.push({ progress: p, distance: hit?.distance, position: camera.position.toArray() });
    }
    return failures;
  });
  await writeFile('artifacts/classroom-review/route.json', JSON.stringify(failures, null, 2));
  assert.deepEqual(failures, [], 'Camera must remain at walking height across both stair transitions');
  for (const [progress, name, reverse] of [[0, 'entry', false], [350, 'main', false], [630, 'three-steps', true], [700, 'junction', false], [860, 'side', false], [1000, 'end-wall', false]]) {
    await page.locator('#walk-progress').evaluate((e, p) => { e.value = p; e.dispatchEvent(new Event('input')); }, progress);
    const colors = await page.evaluate(reverse => {
      __advance(); const { renderer, scene, camera } = __portrait;
      if (reverse) { camera.lookAt(-20.9, 3.6, camera.position.z); camera.updateMatrixWorld(); }
      renderer.render(scene, camera);
      const gl = renderer.getContext(), data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return new Set(data).size;
    }, reverse);
    assert.ok(colors > 20, `${name} canvas must not be blank`);
    await page.screenshot({ path: `artifacts/classroom-review/${name}.png` });
    console.log('Captured', name);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  for (const [progress, name] of [[700, 'mobile-junction'], [1000, 'mobile']]) {
    await page.locator('#walk-progress').evaluate((e, p) => { e.value = p; e.dispatchEvent(new Event('input')); }, progress);
    const colors = await page.evaluate(() => {
      __advance(); const { renderer, scene, camera } = __portrait; renderer.render(scene, camera);
      const gl = renderer.getContext(), data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return new Set(data).size;
    });
    assert.ok(colors > 20, `${name} canvas must not be blank`);
    await page.screenshot({ path: `artifacts/classroom-review/${name}.png` });
  }
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log('PASS classroom route, desktop/mobile renders, nonblank canvas and no runtime/shader errors');
} finally { await browser.close(); }
