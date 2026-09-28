import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
  page.setDefaultTimeout(90000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(process.argv[2] || 'http://127.0.0.1:5178', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  await page.locator('#hour').evaluate(e => { e.value = '10'; e.dispatchEvent(new Event('input')); });
  const details = await page.evaluate(() => {
    const a = __portrait.architecture;
    const hardware = a.group.getObjectByName('Interior sliding bolt and hanging padlock');
    const ramp = a.group.children.find(mesh => mesh.material === a.materials.eastRamp);
    ramp.geometry.computeBoundingBox();
    const vertices = ramp.geometry.attributes.position;
    const topLevels = new Set(Array.from({ length: vertices.count }, (_, i) => vertices.getY(i).toFixed(2)));
    return { parent: hardware.parent.name, parts: a.group.getObjectsByProperty('name', hardware.name).length, rampMin: ramp.geometry.boundingBox.min.toArray(), rampMax: ramp.geometry.boundingBox.max.toArray(), levels: [...topLevels], red: a.materials.eastRamp.color.getHexString(), nativeCursor: !document.querySelector('#liquid-cursor') };
  });
  assert.equal(details.parent, 'Right entrance door');
  assert.equal(details.parts, 1);
  assert.equal(details.red, 'a54637');
  assert.deepEqual(details.levels.sort(), ['0.02', '0.16']);
  assert.ok(details.rampMin[0] > 20 && details.rampMax[0] < 22.1);
  assert.ok(details.nativeCursor);
  await page.locator('[data-chapter="1"]').click();
  await page.waitForFunction(() => __portrait.selected === 1 && __portrait.camera.position.z < 32);
  await page.locator('#door').click();
  await page.waitForFunction(() => __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y - d.openAngle) < .002));
  await page.addStyleTag({ content: '#experience > :not(#viewport){visibility:hidden!important}' });
  async function view(name, eye, target) {
    const colors = await page.evaluate(({ eye, target }) => {
      const p = __portrait;
      p.controls.minDistance = .2;
      p.camera.position.set(...eye); p.controls.target.set(...target); p.controls.update(); p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), pixels = new Uint8Array(64 * 64 * 4);
      gl.readPixels(gl.drawingBufferWidth / 2 - 32, gl.drawingBufferHeight / 2 - 32, 64, 64, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return new Set(pixels).size;
    }, { eye, target });
    assert.ok(colors > 25, name);
    await page.screenshot({ path: `artifacts/${name}.png` });
  }
  await page.evaluate(() => document.querySelector('#door').click());
  await page.waitForFunction(() => __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y) < .002));
  await view('right-door-lock', [.8, 1.8, 4.4], [.8, 1.65, 6.82]);
  await view('red-gate-ramp', [15, 3, 8.5], [22, .8, 5.6]);
  await page.setViewportSize({ width: 390, height: 844 });
  await view('red-gate-ramp-mobile', [13, 3, 8.5], [22, .8, 5.6]);
  assert.deepEqual(errors, []);
  console.log('PASS door hardware, opening, red slope, native cursor, desktop/mobile canvas', details);
} finally { await browser.close(); }
