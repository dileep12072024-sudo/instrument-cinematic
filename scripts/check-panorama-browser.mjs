import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
page.setDefaultTimeout(180000);
await page.clock.setFixedTime(new Date('2026-10-09T05:30:00Z'));
const errors = [];
// Software WebGL in CI: lower rendering cost without replacing the animation loop.
await page.addInitScript(() => {
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => raf(t => {
    if (window.__portrait && !__portrait.ready) {
      __portrait.renderer.shadowMap.enabled = false;
      __portrait.renderer.setPixelRatio(.25);
    }
    cb(t);
  });
});
page.on('pageerror', e => errors.push(e.message));
const state = () => page.evaluate(() => ({ q: __portrait.camera.quaternion.toArray(), p: __portrait.camera.position.toArray(), active: document.querySelector('#panorama').getAttribute('aria-pressed'), walk: __portrait.entranceWalk.active }));
async function drag(label) {
  const before = await state();
  await page.mouse.move(540, 360); await page.mouse.down();
  await page.mouse.move(710, 395, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(600);
  const after = await state();
  console.log(label, { before, after });
  assert.notDeepEqual(after.q, before.q, `${label}: drag must turn the camera`);
}
try {
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.evaluate(() => { __portrait.renderer.setPixelRatio(.5); });
  await page.locator('#panorama').click();
  await drag('Exterior panorama');
  await page.locator('[data-chapter="1"]').click();
  await page.waitForTimeout(2500);
  await page.locator('#enter-hall').click();
  await drag('Guided interior');
  await page.locator('#panorama').click();
  await drag('Free interior panorama');
  await page.locator('#panorama').click();
  await page.locator('#panorama').click();
  await drag('Re-enabled panorama');
  await page.setViewportSize({ width: 390, height: 844 });
  const mobileBefore = await state();
  await page.mouse.move(140, 350); await page.mouse.down();
  await page.mouse.move(240, 380, { steps: 4 }); await page.mouse.up();
  await page.waitForTimeout(600);
  assert.notDeepEqual((await state()).q, mobileBefore.q);
  await mkdir('artifacts/panorama', { recursive: true });
  await page.screenshot({ path: 'artifacts/panorama/browser.png' });
  await page.evaluate(() => { window.requestAnimationFrame = () => 0; });
  await page.waitForTimeout(500);
  await page.setViewportSize({ width: 1280, height: 800 });
  for (const [name, eye, target] of [
    ['left-coping', [-27, 9.2, 4.5], [-18, 8.1, 0]],
    ['right-coping', [27, 13.7, 4.5], [18, 12.4, 0]],
  ]) {
    await page.evaluate(({ eye, target }) => {
      const { camera, renderer, scene } = __portrait;
      camera.position.fromArray(eye); camera.lookAt(...target); camera.fov = 62; camera.updateProjectionMatrix(); renderer.render(scene, camera);
    }, { eye, target });
    await page.screenshot({ path: `artifacts/panorama/${name}.png` });
  }
  assert.deepEqual(errors, []);
  console.log('PASS real animation-loop panorama and guided drag');
} finally { await browser.close(); }
