import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('artifacts/terrace-fixes', { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
page.setDefaultTimeout(180000);
await page.clock.setFixedTime(new Date('2026-10-09T05:30:00Z'));
const errors = [];
page.on('pageerror', e => errors.push(e.message));
// Keep the actual model/materials; omit shadows in software-rendered geometry captures.
await page.addInitScript(() => {
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => cb.name === 'animate' ? 0 : raf(t => {
    if (window.__portrait && !__portrait.ready) {
      __portrait.renderer.shadowMap.enabled = false;
      __portrait.renderer.setPixelRatio(.5);
    }
    cb(t);
  });
});
async function view(name, eye, target) {
  const colors = await page.evaluate(({ eye, target }) => {
    const { renderer, camera, scene } = __portrait;
    renderer.setPixelRatio(.75);
    camera.position.fromArray(eye); camera.lookAt(...target); camera.fov = 58; camera.updateProjectionMatrix();
    renderer.render(scene, camera);
    const gl = renderer.getContext(), pixels = new Uint8Array(64 * 64 * 4);
    gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return new Set(pixels).size;
  }, { eye, target });
  assert.ok(colors > 25, `${name} must render geometry`);
  await page.screenshot({ path: `artifacts/terrace-fixes/${name}.png` });
  const stats = await sharp(`artifacts/terrace-fixes/${name}.png`).stats();
  assert.ok(stats.channels.some(channel => channel.stdev > 10), `${name} screenshot must not be a cleared canvas`);
  console.log('PASS', name, colors);
}
try {
  await page.goto('http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.addStyleTag({ content: '#experience > :not(#viewport){visibility:hidden!important}' });
  assert.equal(await page.evaluate(() => !!__portrait.scene.getObjectByName('Daytime campus birds')), false);
  await view('utility-rear', [-13, 13, -14], [-5, 10, -1]);
  await view('left-cap', [-27, 9.2, 4.5], [-18, 8.1, 0]);
  await view('left-cap-front', [-28, 8.65, -.8], [-20, 8.35, -.8]);
  await view('left-cap-step-junction', [-23, 10, 3.2], [-21.25, 8.25, .8]);
  await view('right-cap', [27, 13.7, 4.5], [18, 12.4, 0]);
  await view('left-ramp-outward', [-18, 10.4, 2], [-25, 7.9, -1.2]);
  await view('right-ramp-outward', [18, 14.1, 2], [25, 12.3, -1.2]);
  await view('headhouse', [12, 20, 14], [0, 13.4, -.2]);
  await view('terrace-gates', [0, 10.09, 2.16], [-6, 9.8, 2.16]);
  await view('classroom-doors', [-1.5, 5.9, 2.16], [-7, 5.8, 2.16]);
  await view('tables', [23.5, 2.4, -1.4], [22.8, 1.6, -5.7]);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await view('mobile-utility', [-11, 14, -12], [-5, 10, -1]);
  await view('mobile-left-cap-front', [-28, 8.65, -.8], [-20, 8.35, -.8]);
  await view('mobile-parapet', [23.5, 13.8, -1], [15, 12.7, 3.25]);
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
