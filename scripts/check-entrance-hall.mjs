import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
  page.setDefaultTimeout(120000);
  const errors = [], failed = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.url().includes('/assets/') && response.status() >= 400) failed.push(response.url()); });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5178', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.locator('#hour').evaluate(e => { e.value = '10'; e.dispatchEvent(new Event('input')); });
  await page.locator('[data-chapter="1"]').click();
  await page.waitForFunction(() => __portrait.camera.position.z < 32);
  await page.locator('#enter-hall').click();
  assert.ok(await page.evaluate(() => __portrait.entranceWalk.active && __portrait.doorsOpen && !__portrait.controls.enabled));
  const seating = await page.evaluate(() => {
    const bank = __portrait.scene.getObjectByName('Right-side waiting benches');
    const shell = bank?.getObjectByName('Perforated brushed steel seating');
    return {
      seats: bank?.userData.seats, benches: bank?.userData.benches, meshes: bank?.children.length,
      rightOnly: bank?.children.every(mesh => {
        const p = mesh.geometry.attributes.position;
        return Array.from({ length: p.count }, (_, i) => p.getX(i)).every(x => x > 2.7 && x < 3.65);
      }),
      curved: new Set(Array.from(shell?.geometry.attributes.position.array || []).filter((_, i) => i % 3 === 1).map(y => y.toFixed(3))).size > 40,
      perforated: shell?.material.alphaTest === .5,
    };
  });
  assert.deepEqual(seating, { seats: 6, benches: 2, meshes: 3, rightOnly: true, curved: true, perforated: true });
  async function position(value, name) {
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, value);
    await page.waitForFunction(value => Math.abs(__portrait.entranceWalk.progress - value / 1000) < .002, value);
    await page.waitForTimeout(400);
    const stats = await page.evaluate(() => {
      const p = __portrait; p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), pixels = new Uint8Array(64 * 64 * 4);
      gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { colors: new Set(pixels).size, eye: p.camera.position.toArray(), calls: p.renderer.info.render.calls, triangles: p.renderer.info.render.triangles };
    });
    assert.ok(stats.colors > 25, `${name} has a nonblank canvas`);
    assert.equal(stats.eye[0], 0, 'The route stays centered in the recorded hall');
    assert.equal(stats.eye[1], 1.83, 'The walkthrough stays at eye level');
    await page.screenshot({ path: `artifacts/${name}.png` }); console.log(name, stats);
  }
  await position(240, 'hall-entry');
  await position(470, 'hall-stairs');
  await position(830, 'hall-recess');
  await position(1000, 'hall-looking-out');
  await position(350, 'hall-seating-approach');
  await page.mouse.move(1050, 510); await page.mouse.down(); await page.mouse.move(550, 420, { steps: 3 }); await page.mouse.up();
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/hall-right-seating.png' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  await page.screenshot({ path: 'artifacts/hall-mobile-seating.png' });
  await page.setViewportSize({ width: 1440, height: 1000 });
  await position(1000, 'hall-looking-out');
  await page.locator('#walk-back').click();
  assert.ok(await page.evaluate(() => __portrait.entranceWalk.progress < 1));
  await page.locator('#walk-play').click();
  const before = await page.evaluate(() => __portrait.entranceWalk.progress);
  await page.waitForFunction(before => __portrait.entranceWalk.progress > before + .005, before);
  await page.locator('#walk-play').click();
  const quaternion = await page.evaluate(() => __portrait.camera.quaternion.toArray());
  const directionBefore = await page.evaluate(() => {
    const c = __portrait.camera;
    return { forward: c.getWorldDirection(c.position.clone()).toArray(), right: c.matrixWorld.elements.slice(0, 3) };
  });
  await page.mouse.move(650, 420); await page.mouse.down(); await page.mouse.move(780, 450, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(400);
  assert.notDeepEqual(await page.evaluate(() => __portrait.camera.quaternion.toArray()), quaternion, 'Drag looks around the hall');
  const directionAfter = await page.evaluate(() => __portrait.camera.getWorldDirection(__portrait.camera.position.clone()).toArray());
  assert.ok(directionAfter.reduce((sum, v, i) => sum + (v - directionBefore.forward[i]) * directionBefore.right[i], 0) > .1, 'Dragging right turns the view right');
  assert.ok(directionAfter[1] < directionBefore.forward[1], 'Dragging down turns the view down');
  await page.setViewportSize({ width: 390, height: 844 });
  await position(240, 'hall-mobile-entry');
  await position(470, 'hall-mobile-stairs');
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const bounds = await page.locator('#walk-panel').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 844);
  await page.locator('#walk-exit').click();
  await page.waitForFunction(() => !__portrait.entranceWalk.active && __portrait.controls.enabled && __portrait.camera.position.z > 20);
  await page.locator('#door').click();
  await page.waitForFunction(() => !__portrait.doorsOpen && __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y) < .002));
  await page.locator('#reset').click();
  await page.waitForFunction(() => __portrait.selected === 0);
  assert.deepEqual(errors, []); assert.deepEqual(failed, []);
  console.log('PASS entrance route, inward doors, play/pause, drag, mobile framing, exit, native controls and no JavaScript errors');
} finally { await browser.close(); }
