import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';

const url = process.argv[2] || 'http://127.0.0.1:5176';
await mkdir('artifacts', { recursive: true });
const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
// Keep real CSS viewport sizes while bounding SwiftShader's pixel workload in CI.
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: .5, reducedMotion: 'reduce' });
page.setDefaultTimeout(240000); // software WebGL boot takes ~90 s here
const errors = [], failedAssets = [];
let birdRequests = 0;
page.on('request', request => { if (new URL(request.url()).pathname === '/media/birds.mp3') birdRequests++; });
page.on('pageerror', error => { errors.push(error.message); console.error('BROWSER ERROR', error.stack); });
page.on('response', response => { if (response.status() >= 400 && new URL(response.url()).origin === new URL(url).origin) failedAssets.push(`${response.status()} ${response.url()}`); });
async function pixels() {
  return page.evaluate(() => {
    const r = __portrait.renderer; r.render(__portrait.scene, __portrait.camera);
    const g = r.getContext(), p = new Uint8Array(64 * 64 * 4);
    g.readPixels(Math.floor(g.drawingBufferWidth * .5) - 32, Math.floor(g.drawingBufferHeight * .45) - 32, 64, 64, g.RGBA, g.UNSIGNED_BYTE, p);
    return new Set(Array.from({ length: 4096 }, (_, i) => `${p[i * 4]},${p[i * 4 + 1]},${p[i * 4 + 2]}`)).size;
  });
}
try {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 300000 });
  await page.waitForFunction(() => window.__portrait?.ready, { timeout: 300000 });
  await page.locator('#loader').waitFor({ state: 'hidden', timeout: 600000 }); // first software-rendered frame can take minutes
  assert.ok(await pixels() > 25, 'Desktop WebGL canvas should have visible geometry');
  await page.screenshot({ path: 'artifacts/desktop-arrival.png' });
  console.log('PASS desktop scene', await page.evaluate(() => ({ calls: __portrait.renderer.info.render.calls, triangles: __portrait.renderer.info.render.triangles, pixelRatio: __portrait.renderer.getPixelRatio() })));
  const facade = await page.evaluate(() => {
    const { group, materials } = __portrait.architecture;
    const rear = group.children.find(mesh => mesh.material === materials.rearGlass);
    const vertices = rear.geometry.attributes.position;
    let lowestWindow = Infinity;
    for (let i = 0; i < vertices.count; i++) {
      if (Math.abs(vertices.getX(i)) < 21.7) lowestWindow = Math.min(lowestWindow, vertices.getY(i));
    }
    return { lowestWindow, reflective: !!materials.glass.envMap?.image?.width && !!materials.rearGlass.envMap?.image?.width, separateProbes: materials.glass.envMap !== materials.rearGlass.envMap };
  });
  assert.ok(facade.lowestWindow > 4, 'Central rear ground floor remains solid; outer wing rooms have windows');
  assert.ok(facade.reflective && facade.separateProbes, 'Both courtyards must have their own scene reflection');
  const gate = await page.evaluate(() => {
    const a = __portrait.architecture, mesh = a.group.children.find(m => m.material === a.materials.gate);
    mesh.geometry.computeBoundingBox();
    const { min, max } = mesh.geometry.boundingBox;
    return { min: min.toArray(), max: max.toArray() };
  });
  assert.ok(gate.min[0] > 21.7 && gate.max[0] < 22.2 && gate.max[0] - gate.min[0] < .2, 'Gate must be on the east return plane, facing the courtyard');
  assert.ok(gate.min[2] > 3.4 && gate.max[2] < 7.9 && gate.max[2] - gate.min[2] > 3.9, 'Wider gate must sit beside the right-wing windows, not on the long corridor wall');
  await page.evaluate(() => {
    const motion = document.querySelector('#motion'); motion.checked = false; motion.dispatchEvent(new Event('change'));
    __portrait.camera.position.set(0, 5.5, -42); __portrait.controls.target.set(0, 5, -3); __portrait.controls.update();
  });
  await page.screenshot({ path: 'artifacts/desktop-rear.png' });
  await page.locator('[data-chapter="1"]').click();
  await page.waitForFunction(() => __portrait.selected === 1 && __portrait.camera.position.z < 32);
  await page.screenshot({ path: 'artifacts/desktop-entrance.png' });
  assert.equal(await page.evaluate(() => __portrait.architecture.doors.every(({ pivot }) =>
    pivot.getObjectByName('Solid timber leaf')?.material.map && pivot.getObjectByName('Timber panels') &&
    !pivot.children.some(child => child.material === __portrait.architecture.materials.glass)
  )), true, 'Entrance leaves must be paneled timber, with glazing confined to the fixed sidelights');
  await page.locator('#door').click();
  assert.equal(await page.evaluate(() => __portrait.doorsOpen), true);
  await page.waitForFunction(() => __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y + d.side * Math.PI) < .002));
  await page.screenshot({ path: 'artifacts/desktop-doors-inward.png' });
  await page.locator('#door').click();
  assert.equal(await page.evaluate(() => __portrait.doorsOpen), false);
  await page.waitForFunction(() => __portrait.architecture.doors.every(d => Math.abs(d.pivot.rotation.y) < .002));
  await page.waitForFunction(() => __portrait.sound.enabled && __portrait.sound.birdsReady);
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('#sound').getAttribute('aria-label'), 'Mute ambient sound');
  assert.equal(birdRequests, 1, 'Default ambience should load one bird recording');
  await page.locator('#sound').click();
  await page.waitForFunction(() => !__portrait.sound.enabled && __portrait.sound.context.state === 'suspended');
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'false');
  await page.locator('#sound').click();
  await page.waitForFunction(() => __portrait.sound.enabled && __portrait.sound.context.state === 'running');
  assert.equal(await page.locator('#sound').getAttribute('aria-pressed'), 'true');
  console.log('PASS entrance and opening doors');
  const distance = await page.evaluate(() => __portrait.camera.position.distanceTo(__portrait.controls.target));
  await page.locator('#zoom-in').click();
  await page.waitForFunction(d => __portrait.camera.position.distanceTo(__portrait.controls.target) < d - 1, distance);
  console.log('PASS zoom');
  await page.locator('#orbit').click({ noWaitAfter: true });
  console.log('Orbit state', await page.evaluate(() => ({ auto: __portrait.controls.autoRotate, last: __portrait.lastRendered })));
  const angle = await page.evaluate(() => __portrait.controls.getAzimuthalAngle());
  await page.waitForFunction(a => Math.abs(__portrait.controls.getAzimuthalAngle() - a) > .008, angle);
  await page.locator('#orbit').click({ noWaitAfter: true });
  await page.locator('#film').click({ noWaitAfter: true });
  assert.equal(await page.evaluate(() => __portrait.journey), true);
  const cameraBefore = await page.evaluate(() => __portrait.camera.position.toArray());
  await page.waitForFunction(p => __portrait.camera.position.distanceTo({ x: p[0], y: p[1], z: p[2] }) > .2, cameraBefore);
  await page.locator('#film').click({ noWaitAfter: true });
  assert.equal(await page.evaluate(() => __portrait.journey), false);
  console.log('PASS doors, zoom, orbit and animated camera journey');
  await page.locator('#light').click();
  console.log('Checking daylight controls');
  await page.locator('#ambient-volume').evaluate(input => { input.value = '23'; input.dispatchEvent(new Event('input', { bubbles: true })); });
  assert.equal(await page.evaluate(() => __portrait.sound.volume), .23);
  await page.locator('[data-hour="18.8"]').click();
  await page.waitForFunction(() => __portrait.hour > 18.6);
  await page.locator('#light-close').click();
  await page.screenshot({ path: 'artifacts/desktop-blue-hour.png' });
  await page.locator('#light').click();
  await page.locator('[data-hour="16.5"]').click();
  await page.locator('#quality').selectOption('low');
  console.log('Checking quality controls');
  assert.equal(await page.evaluate(() => __portrait.renderer.getPixelRatio()), .9);
  await page.locator('#quality').selectOption('auto');
  await page.locator('#light-close').click();
  await page.locator('#archive').click();
  console.log('Checking archive');
  await page.locator('#archive-dialog').waitFor({ state: 'visible' });
  await page.waitForFunction(() => document.querySelector('#archive-image').complete && document.querySelector('#archive-image').naturalWidth > 0);
  assert.equal(await page.locator('[data-photo]').count(), 15);
  await page.locator('#photo-next').click();
  assert.equal(await page.locator('#photo-index').textContent(), '02 / 15');
  await page.screenshot({ path: 'artifacts/desktop-archive.png' });
  await page.getByRole('button', { name: 'Close archive', exact: true }).click();
  await page.locator('#reset').click();
  await page.locator('#original-film').click();
  await page.waitForFunction(() => document.querySelector('video').readyState >= 2);
  await page.waitForFunction(() => __portrait.sound.muted && __portrait.sound.context.state === 'suspended');
  assert.ok(await page.locator('video').evaluate(v => v.duration) > 30);
  await page.getByRole('button', { name: 'Close film', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('video').paused);
  assert.equal(await page.locator('video').evaluate(v => v.paused), true);
  await page.waitForFunction(() => !__portrait.sound.muted && __portrait.sound.context.state === 'running');
  await page.locator('#sound').click();
  await page.waitForFunction(() => !__portrait.sound.enabled && __portrait.sound.context.state === 'suspended');
  console.log('PASS solid rear wall, reflections, inward 180-degree doors and ambient audio controls');
  console.log('PASS daylight, quality, 15-image archive and original video playback');
  await page.locator('#reset').click();
  const download = page.waitForEvent('download');
  await page.locator('#capture').click();
  assert.equal((await download).suggestedFilename(), 'instrument-technology.png');
  await page.locator('#plan').click();
  await page.waitForFunction(() => __portrait.camera.position.y > 70);
  await page.screenshot({ path: 'artifacts/desktop-footprint.png' });
  const footprint = await page.evaluate(() => __portrait.footprint);
  assert.equal(footprint.length, 5);
  assert.equal(footprint[0].depth, 30);
  assert.equal(footprint[4].depth, 33);
  assert.equal(footprint[2].width, 8);
  for (let i = 1; i < footprint.length; i++) assert.equal(footprint[i - 1].x + footprint[i - 1].width / 2, footprint[i].x - footprint[i].width / 2, 'Blocks must connect without gaps or overlaps');
  await page.locator('#reset').click();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.ok(await pixels() > 25, 'Mobile WebGL canvas should be nonblank');
  await page.screenshot({ path: 'artifacts/mobile-arrival.png' });
  await page.locator('#sound').click();
  await page.waitForFunction(() => __portrait.sound.enabled && __portrait.sound.context.state === 'running');
  await page.locator('#sound').click();
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.locator('[data-chapter="2"]').click();
  await page.waitForFunction(() => __portrait.selected === 2);
  await page.screenshot({ path: 'artifacts/mobile-courtyard.png' });
  const beforeDrag = await page.evaluate(() => __portrait.camera.position.toArray());
  await page.mouse.move(170, 300); await page.mouse.down(); await page.mouse.move(220, 320, { steps: 8 }); await page.mouse.up();
  const afterDrag = await page.evaluate(() => __portrait.camera.position.toArray());
  assert.notDeepEqual(beforeDrag, afterDrag);
  await page.locator('#archive').click();
  await page.screenshot({ path: 'artifacts/mobile-archive.png' });
  await page.getByRole('button', { name: 'Close archive', exact: true }).click();
  const overflows = await page.evaluate(() => [...document.querySelectorAll('button,h1')].filter(e => e.offsetWidth > 0 && e.scrollWidth > e.clientWidth + 3).map(e => e.textContent));
  assert.deepEqual(overflows, []);
  await page.setViewportSize({ width: 844, height: 390 });
  await page.locator('#reset').click();
  await page.screenshot({ path: 'artifacts/landscape.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []); assert.deepEqual(failedAssets, []);
  assert.equal(birdRequests, 1, 'Sound toggles should reuse the decoded recording');
  console.log('PASS export, footprint, mobile framing, pointer interaction and responsive layout');
  console.log('PASS: no page errors or failed assets');
} finally { await browser.close(); }
