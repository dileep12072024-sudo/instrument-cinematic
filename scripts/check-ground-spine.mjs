import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright';
import { groundSpine as layout, seminarPassage as passage } from '../src/footprint.js';

assert.equal(layout.roomDepth, layout.corridorDepth * 2);
assert.equal(layout.roomFront + layout.corridorDepth, layout.front);
assert.ok(layout.roomFront - passage.end > 8, 'Strong Room approach must not be compressed into the spine');
for (const z of passage.windowZ) {
  assert.ok(z + passage.windowWidth / 2 + .08 < layout.rear - .16, 'Full window reveal clears the connecting corridor rear wall');
  assert.ok(z - passage.windowWidth / 2 - .08 > passage.end + .15, 'Window reveal clears the Strong Room end pier');
}
assert.ok(layout.roomFront - passage.end > 11, 'Passage includes the spine overlap before the external window bays');
assert.ok(layout.screenBottom - layout.rightFloor > .7, 'Screen starts above a substantial solid base');
assert.ok(passage.x - passage.width / 2 >= 22 && passage.x + passage.width / 2 < 31, 'Passage fits inside the east wing');
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
    return { roomFront: spine.userData.roomFront, stairStart: scene.getObjectByName('Entrance hall from September walkthrough').userData.stairStartZ, pier: spine.userData.strongRoomPier, screen: spine.userData.screenSillAboveFloor, seminar: spine.userData.seminarHallEntrance, main: spine.userData.seminarHallMainEntrance, lab: spine.userData.electronicsLabEntrance, downstand: spine.userData.strongRoomDownstand };
  });
  assert.equal(positions.roomFront, positions.stairStart);
  assert.equal(positions.pier.z, passage.pierZ);
  assert.ok(positions.screen > .7);
  assert.equal(positions.seminar.z, passage.hallDoorZ);
  assert.equal(positions.seminar.x, passage.x + passage.width / 2, 'Seminar Hall sits along the right wall of the Strong Room passage');
  assert.deepEqual(positions.main, { x: passage.terminalX, z: layout.corridorCenter }, 'Main Seminar Hall door remains at the long-corridor end');
  assert.deepEqual(positions.lab, { x: passage.x, z: passage.labEnd }, 'Electronics Lab terminates the opposite end of the passage');
  assert.ok(positions.lab.z > layout.front && passage.end < layout.roomFront);
  assert.ok(positions.downstand.top - positions.downstand.bottom > .8 && positions.downstand.depth === .36);
  const facade = await page.evaluate(() => {
    let exterior = false, blockedGate = false;
    __portrait.scene.traverse(mesh => {
      if (!mesh.isMesh || !mesh.geometry.attributes.position || Array.isArray(mesh.material)) return;
      const p = mesh.geometry.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), z = p.getZ(i);
        if (Math.abs(x - 21.84) < .001 && y === 0 && z < -10.2 && mesh.material.map?.image instanceof HTMLCanvasElement && mesh.material.bumpMap) exterior = true;
        if (Math.abs(x - 22.43) < .001 && z > 3.5 && z < 7.6 && y < 3 && mesh.material.color?.getHexString() === '222a27') blockedGate = true;
      }
    });
    return { exterior, blockedGate };
  });
  assert.equal(facade.exterior, true, 'Rear ground wall retains exterior plaster texture and bump map');
  assert.equal(facade.blockedGate, false, 'Folding gate has no opaque placeholder behind its lattice');
  const finish = await page.evaluate(() => {
    const a = __portrait.architecture;
    let paint = false;
    __portrait.scene.traverse(mesh => {
      if (mesh.material?.name === 'Aged entrance hall plaster') paint = mesh.material.map === a.materials.wall.map && mesh.material.bumpScale <= .002;
    });
    const geometry = a.group.children.find(mesh => mesh.material === a.materials.wall).geometry;
    const p = geometry.attributes.position, indices = geometry.index;
    const sealed = [-3, 0, 3].every(x => {
      for (let i = 0; i < (indices?.count ?? p.count); i += 3) {
        const ids = [i, i + 1, i + 2].map(j => indices ? indices.getX(j) : j);
        if (ids.every(j => Math.abs(p.getZ(j) - 7.175) < .001) &&
          Math.min(...ids.map(j => p.getX(j))) <= x && Math.max(...ids.map(j => p.getX(j))) >= x &&
          Math.min(...ids.map(j => p.getY(j))) < 4.1 && Math.max(...ids.map(j => p.getY(j))) > 4.1) return true;
      }
      return false;
    });
    return { paint, sealed };
  });
  assert.ok(finish.paint, 'Interior uses light plaster albedo, not baked-in grey photographic shading');
  assert.ok(finish.sealed, 'Entrance lintel closes the seam below the 4.2-high facade');
  await page.locator('#walk-route').selectOption('right');
  async function seek(progress, name) {
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, progress);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const p = __portrait; p.entranceWalk.update(0); p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return { eye: p.camera.position.toArray(), colors: new Set(data).size };
    });
    await page.screenshot({ path: `artifacts/${name}.png` }); console.log(name, state);
    assert.ok(state.colors > 50, `${name} canvas is nonblank`);
    assert.ok(Math.abs(state.eye[2] - (progress >= 940 ? passage.hallDoorZ : layout.corridorCenter)) < .001);
    if (progress >= 430) assert.ok(Math.abs(state.eye[1] - layout.rightFloor - 1.666) < .001);
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
  await seek(840, 'seminar-main-entrance');
  await seek(940, 'seminar-hall-entrance');
  await seek(1000, 'spine-return');
  await page.locator('#walk-route').selectOption('seminar');
  for (const progress of [220, 600, 820, 1000]) {
    await page.locator('#walk-progress').evaluate((e, value) => { e.value = value; e.dispatchEvent(new Event('input')); }, progress);
    await page.waitForTimeout(500);
    const state = await page.evaluate(() => {
      const p = __portrait; p.entranceWalk.update(0); p.renderer.render(p.scene, p.camera);
      const gl = p.renderer.getContext(), pixels = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
      return { x: p.camera.position.x, z: p.camera.position.z, colors: new Set(pixels).size };
    });
    await page.screenshot({ path: `artifacts/seminar-${progress}.png` });
    console.log('seminar', progress, state);
    assert.ok(Math.abs(state.x - passage.x) < .001);
    if (progress === 1000) assert.ok(Math.abs(state.z - (passage.labEnd - 1.7)) < .001);
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
  await page.locator('#walk-route').selectOption('seminar');
  await page.locator('#walk-progress').evaluate(e => { e.value = 420; e.dispatchEvent(new Event('input')); });
  await page.waitForTimeout(500);
  await page.screenshot({ path: 'artifacts/seminar-mobile.png' });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const bounds = await page.locator('#walk-panel').boundingBox();
  assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 390 && bounds.y + bounds.height <= 844);
  await page.locator('#walk-exit').click();
  await page.waitForFunction(() => !__portrait.entranceWalk.active && __portrait.controls.enabled);
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.evaluate(() => {
    const p = __portrait; p.controls.dispatchEvent({ type: 'start' });
    p.camera.position.set(12, 3.2, -9); p.controls.target.set(22, 2.2, -6.5);
    p.controls.update(); p.renderer.render(p.scene, p.camera);
  });
  await page.screenshot({ path: 'artifacts/restored-rear-wing.png' });
  await page.evaluate(() => {
    const p = __portrait; p.camera.position.set(0, 5.5, 23); p.controls.target.set(0, 4.1, 7);
    p.controls.update(); p.renderer.render(p.scene, p.camera);
  });
  await page.screenshot({ path: 'artifacts/sealed-canopy-front.png' });
  assert.deepEqual(errors, []);
  assert.deepEqual(failedAssets, []);
  console.log('PASS 2:1 depth split, aligned stairs, right-wing and side-passage routes, mouse/touch panorama, mobile layout and exit');
} finally { await browser.close(); }
