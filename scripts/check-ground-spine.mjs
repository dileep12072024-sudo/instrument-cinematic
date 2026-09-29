import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { groundSpine as layout } from '../src/footprint.js';

assert.equal(layout.roomDepth, layout.corridorDepth * 2);
assert.equal(layout.roomFront + layout.corridorDepth, layout.front);
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .5, reducedMotion: 'reduce', hasTouch: true });
  page.setDefaultTimeout(120000);
  const errors = [], failedAssets = []; page.on('pageerror', error => { errors.push(error.message); console.error(error.message); });
  page.on('response', response => { if (/\/(assets|media)\//.test(response.url()) && response.status() >= 400) failedAssets.push(response.url()); });
  page.on('console', message => { if (message.type() === 'error') console.error(message.text()); });
  await page.goto(process.argv[2] || 'http://localhost:5180');
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' }).catch(async error => { console.error(await page.locator('#loader').innerText()); throw error; });
  await page.locator('#hour').evaluate(e => { e.value = '10'; e.dispatchEvent(new Event('input')); });
  await page.locator('[data-chapter="1"]').click();
  await page.locator('#enter-hall').click();
  const positions = await page.evaluate(() => {
    const scene = __portrait.scene, spine = scene.getObjectByName('Ground-floor spine');
    return { roomFront: spine.userData.roomFront, stairStart: scene.getObjectByName('Entrance hall from September walkthrough').userData.stairStartZ };
  });
  assert.equal(positions.roomFront, positions.stairStart);
  await page.locator('#walk-route').selectOption('right');
  async function seek(progress, name) {
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, progress);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const p = __portrait; p.entranceWalk.update(0); p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), data = new Uint8Array(32 * 32 * 4);
      gl.readPixels(gl.drawingBufferWidth / 2 - 16, gl.drawingBufferHeight / 2 - 16, 32, 32, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return { eye: p.camera.position.toArray(), colors: new Set(data).size };
    });
    assert.ok(state.colors > 20, `${name} canvas is nonblank`);
    assert.ok(Math.abs(state.eye[2] - layout.corridorCenter) < .001);
    if (progress >= 430) assert.ok(Math.abs(state.eye[1] - layout.rightFloor - 1.666) < .001);
    await page.screenshot({ path: `artifacts/${name}.png` }); console.log(name, state);
  }
  await seek(320, 'spine-gate');
  await seek(550, 'spine-corridor');
  const before = await page.evaluate(() => {
    const c = __portrait.camera, point = c.getWorldDirection(c.position.clone()).multiplyScalar(3).add(c.position);
    window.__lookPoint = point; return point.clone().project(c).x;
  });
  await page.mouse.move(550, 350); await page.mouse.down(); await page.mouse.move(630, 350); await page.mouse.up();
  await page.waitForTimeout(400);
  assert.ok(await page.evaluate(() => __lookPoint.clone().project(__portrait.camera).x) > before + .05, 'Mouse drag pulls the visible scene right');
  await seek(1000, 'spine-return');
  await page.locator('#walk-route').selectOption('seminar');
  for (const progress of [220, 600, 820]) {
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, progress);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const p = __portrait; p.entranceWalk.update(0); p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { x: p.camera.position.x, colors: new Set(pixels).size };
    });
    await page.screenshot({ path: `artifacts/seminar-${progress}.png` });
    console.log('seminar', progress, state);
    assert.ok(Math.abs(state.x - 21.08) < .001);
    assert.ok(state.colors > 50, 'Side passage renders visible geometry');
  }
  await page.locator('#walk-route').selectOption('right');
  await page.setViewportSize({ width: 390, height: 844 });
  await seek(550, 'spine-mobile');
  const client = await page.context().newCDPSession(page);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: 160, y: 350 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: 230, y: 350 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(400);
  const touch = await page.evaluate(() => {
    const c = __portrait.camera; return c.getWorldDirection(c.position.clone()).toArray();
  });
  assert.ok(touch[2] < -.05, 'Touch drag uses the same panorama direction');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const bounds = await page.locator('#walk-panel').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 844);
  await page.locator('#walk-exit').click();
  await page.waitForFunction(() => !__portrait.entranceWalk.active && __portrait.controls.enabled);
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  console.log('PASS 2:1 depth split, aligned stairs, right-wing and side-passage routes, mouse/touch panorama, mobile layout and exit');
} finally { await browser.close(); }
