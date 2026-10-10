import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';
import sharp from 'sharp';

await mkdir('artifacts/birds', { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: .5 });
page.setDefaultTimeout(180000);
await page.clock.setFixedTime(new Date('2026-10-09T05:30:00Z'));
await page.addInitScript(() => {
  const raf = requestAnimationFrame.bind(window);
  window.requestAnimationFrame = cb => {
    if (cb.name === 'animate') { window.__frame = cb; return 0; }
    return raf(t => {
      if (window.__portrait && !__portrait.ready) {
        __portrait.renderer.shadowMap.enabled = false;
        __portrait.renderer.setPixelRatio(.5);
      }
      cb(t);
    });
  };
  window.__advance = () => {
    const { renderer } = __portrait, render = renderer.render; renderer.render = () => {};
    try { for (let i = 0; i < 180; i++) { window.__t = Math.max(performance.now(), (window.__t || 0) + 60); __frame(__t); } }
    finally { renderer.render = render; }
  };
});
try {
  await page.goto('http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  const check = async hour => {
    await page.locator('#hour').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, hour);
    return page.evaluate(() => {
      __advance(); const { scene, sound } = __portrait;
      return { flockPresent: !!scene.getObjectByName('Daytime campus birds'), level: sound.birdLevel };
    });
  };
  assert.deepEqual(await check(23), { flockPresent: false, level: 0 });
  const day = await check(11); assert.ok(!day.flockPresent && day.level > 0);
  for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    const pixels = await page.evaluate(() => {
      const { camera, renderer, scene } = __portrait;
      camera.position.set(42, 24, 70); camera.lookAt(0, 17, 0); renderer.render(scene, camera);
      const gl = renderer.getContext(), data = new Uint8Array(4 * gl.drawingBufferWidth * gl.drawingBufferHeight);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return new Set(Array.from(data).filter((_, i) => i % 4 !== 3)).size;
    });
    assert.ok(pixels > 50, 'Rendered scene must not be blank');
    await page.screenshot({ path: `artifacts/birds/${name}.png` });
  }
  await page.setViewportSize({ width: 1000, height: 650 });
  const savedPhoto = page.waitForEvent('download');
  await page.locator('#capture').click();
  await (await savedPhoto).saveAs('artifacts/birds/export.png');
  const stats = await sharp('artifacts/birds/export.png').stats();
  assert.ok(stats.channels[0].stdev > 10, 'Photo export must still contain the rendered scene');
  console.log('PASS no flying birds, silent nighttime chirps, nonblank desktop/mobile canvas and export');
} finally { await browser.close(); }
