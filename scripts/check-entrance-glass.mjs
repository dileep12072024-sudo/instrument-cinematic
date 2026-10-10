import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import sharp from 'sharp';

await mkdir('artifacts/entrance-glass', { recursive: true });
const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' });
  page.setDefaultTimeout(180000);
  await page.clock.setFixedTime(new Date('2026-10-10T05:30:00Z'));
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = callback => callback.name === 'animate' ? 0 : raf(time => {
      if (window.__portrait && !__portrait.ready) {
        __portrait.renderer.shadowMap.enabled = false;
        __portrait.renderer.setPixelRatio(.5);
      }
      callback(time);
    });
  });
  await page.goto('http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.addStyleTag({ content: '#experience > :not(#viewport){visibility:hidden!important}' });
  assert.ok(await page.evaluate(() => !!__portrait.architecture.materials.entranceReflectiveGlass.envMap));
  async function view(name, inside) {
    const result = await page.evaluate(inside => {
      const { renderer, camera, scene, architecture } = __portrait;
      renderer.setPixelRatio(.75);
      camera.position.set(2.3, 2.3, inside ? 5 : 10.5);
      camera.lookAt(2.3, 2.3, inside ? 12 : 7);
      camera.fov = 58; camera.updateProjectionMatrix();
      const read = () => {
        renderer.render(scene, camera);
        const gl = renderer.getContext(), pixels = new Uint8Array(32 * 32 * 4);
        gl.readPixels(gl.drawingBufferWidth / 2 - 16, gl.drawingBufferHeight / 2 - 16, 32, 32, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
        return pixels;
      };
      const original = read();
      const { entranceReflectiveGlass: exterior, entranceTintedGlass: interior } = architecture.materials;
      const opposite = inside ? exterior : interior;
      opposite.visible = false; const withoutOpposite = read(); opposite.visible = true;
      const visible = inside ? interior : exterior;
      visible.visible = false; const withoutGlass = read(); visible.visible = true;
      const intensity = exterior.envMapIntensity;
      exterior.envMapIntensity = 0; const withoutReflection = read(); exterior.envMapIntensity = intensity;
      read();
      const difference = pixels => original.reduce((sum, value, i) => sum + Math.abs(value - pixels[i]), 0) / original.length;
      return { colors: new Set(original).size, oppositeDifference: difference(withoutOpposite), glassDifference: difference(withoutGlass), reflectionDifference: difference(withoutReflection) };
    }, inside);
    const path = `artifacts/entrance-glass/${name}.png`;
    await page.screenshot({ path });
    const stats = await sharp(path).stats();
    assert.ok(stats.channels.some(channel => channel.stdev > 10), `${name} renders a nonblank view`);
    assert.equal(result.oppositeDifference, 0, `${name} is not obscured by the opposite glass face`);
    assert.ok(result.glassDifference > .1, `${name} applies its glass finish`);
    if (inside) assert.ok(result.glassDifference < 30, 'Interior tint preserves the view outside');
    else assert.ok(result.reflectionDifference > 2, 'Exterior glass actually reflects the entrance environment');
    console.log('PASS', name, result);
  }
  await view('outside-green-reflection', false);
  await view('inside-cool-tint', true);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(500);
  await view('mobile-outside', false);
  await view('mobile-inside', true);
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
