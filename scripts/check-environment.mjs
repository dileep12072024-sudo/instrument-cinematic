import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(240000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|THREE|WebGL/i.test(m.text())) errors.push(m.text()); });
  await page.clock.setFixedTime(new Date('2026-10-12T06:30:00Z'));
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.parse('2026-10-12T06:30:00Z') / 1000, temperature_2m: 27, weather_code: 0, cloud_cover: 10, wind_speed_10m: 18, wind_gusts_10m: 28, wind_direction_10m: 90 } } }));
  // Manually advance the actual animation callback to bound software-WebGL test time.
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
  });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  const model = await page.evaluate(async () => {
    const T = await import('/node_modules/three/build/three.module.js');
    const { scene, landscape } = __portrait;
    const nodes = []; landscape.group.traverse(o => nodes.push(o));
    const sources = nodes.map(o => o.userData.source_object).filter(Boolean);
    const vegetation = landscape.vegetation;
    const road = nodes.find(o => o.userData.source_object === 'Entrance driveway with flared junction');
    scene.updateMatrixWorld(true);
    const ray = new T.Raycaster(new T.Vector3(0, 2, 10.76), new T.Vector3(0, -1, 0));
    const hit = ray.intersectObject(road, true)[0];
    const ground = nodes.find(o => o.userData.source_object === 'Editable verges and lower courtyard grading');
    const down = new T.Vector3(0, -1, 0);
    const sample = (object, x, z) => new T.Raycaster(new T.Vector3(x, 3, z), down).intersectObject(object, true)[0];
    const bareCourts = [[-12, 16], [12, 14]].map(([x,z]) => {
      const hit = sample(ground, x, z);
      return hit?.object.material.userData.source_material;
    });
    const apron = nodes.find(o => o.userData.source_object === 'Entrance concrete apron');
    const paving = [];
    apron.traverse(o => { if (o.isMesh) paving.push(o); });
    const pavingBounds = new T.Box3().setFromObject(apron);
    const point = new T.Vector3();
    const flowers = nodes.filter(o => o.userData.source_object?.startsWith('Pink flowering shrub')).map(o => new T.Box3().setFromObject(o).getCenter(new T.Vector3()).toArray());
    let rootWeight = 0;
    for (const o of vegetation) {
      const p = o.geometry.attributes.position, w = o.geometry.attributes._wind;
      let low = Infinity, weight = 0;
      for (let i = 0; i < p.count; i++) {
        point.fromBufferAttribute(p, i);
        if (point.y < low) { low = point.y; weight = w.getX(i); }
      }
      rootWeight = Math.max(rootWeight, weight);
    }
    return { name: landscape.group.name, trees: landscape.trees.length, vegetation: vegetation.length, sources, missingWeights: vegetation.filter(o => !o.geometry.attributes._wind).length,
      trimmed: landscape.trimmedTriangles, visiblePlants: vegetation.filter(o => o.visible).length,
      missingLeafMaps: vegetation.filter(o => o.material.userData.foliage && /leaves|shrub|grass/.test(o.material.name) && !o.material.map).length,
      roadStartY: hit?.point.y, rootWeight, flowers, bareCourts,
      approachFlare: !!sample(road, 4.7, 10.8) && !sample(road, 4.7, 28),
      pavingTextured: paving.every(o => !!o.material.map), pavingTop: pavingBounds.max.y,
      noPavingAcrossDrive: !sample(apron, 0, 9),
      leftReturnInsideWing: sample(nodes.find(o => o.userData.source_object === 'Lower side courtyard paving'), -19, 18)?.point.y };
  });
  assert.equal(model.name, 'Blender campus environment');
  assert.equal(model.trees, 24); // 23 exported + the video-guided tree right of the entrance assert.equal(model.missingWeights, 0); assert.equal(model.missingLeafMaps, 0);
  assert.ok(model.visiblePlants > 40);
  assert.ok(Math.abs(model.roadStartY) < .02, 'Drive joins the entrance datum');
  assert.ok(model.sources.some(s => s.startsWith('Pink bloom clusters')));
  assert.ok(model.sources.includes('Spreading canopy beside tank terrace'));
  assert.equal(model.flowers.length, 3);
  console.log('Flower centres', model.flowers);
  assert.ok(model.flowers.every(p => p[0] > 3), 'Flowers are right of the driveway, facing the entrance');
  assert.ok(model.flowers.every(p => p[0] < 6 && p[2] > 18 && p[2] < 24), 'Flowers follow the near right kerbed strip, not the distant lawn');
  assert.deepEqual(model.bareCourts, ['Exposed red earth', 'Exposed red earth']);
  assert.ok(model.approachFlare, 'Drive widens at the entrance, not only at the campus road');
  assert.ok(model.pavingTextured && model.pavingTop < 0 && model.noPavingAcrossDrive, 'No bright continuous draft sheet across the porch');
  assert.ok(Number.isFinite(model.leftReturnInsideWing), 'Left courtyard paving is inside the wing');
  console.log('PASS exported Blender environment', { ...model, sources: model.sources.length });
  await mkdir('artifacts/environment', { recursive: true });
  for (const [name, eye, target] of [
    ['approach', [0, 2, 46], [0, 5, 0]],
    ['overview', [48, 35, 65], [0, 3, 14]],
    ['flowers', [0, 1.65, 24], [5, .8, 20.5]],
    ['left-court', [-3, 1.65, 25], [-15, .2, 12]],
    ['right-court', [1, 1.65, 23], [14, .2, 12]],
    ['rear-canopy', [-20, 11, 6], [-25, 13, -23]],
  ]) {
    await page.evaluate(({ eye, target }) => {
      const { camera, renderer, scene } = __portrait;
      camera.position.fromArray(eye); camera.lookAt(...target); camera.fov = 60; camera.updateProjectionMatrix();
      renderer.setPixelRatio(.75); renderer.render(scene, camera);
    }, { eye, target });
    await page.screenshot({ path: `artifacts/environment/${name}.png` });
  }
  for (const [name, width, height] of [['desktop', 1280, 800], ['mobile', 390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.evaluate(() => {
      if (document.querySelector('#panorama').getAttribute('aria-pressed') !== 'true') document.querySelector('#panorama').click();
    });
    const before = await page.evaluate(() => __portrait.camera.quaternion.toArray());
    await page.mouse.move(width * .35, height * .5); await page.mouse.down();
    await page.mouse.move(width * .55, height * .55, { steps: 6 }); await page.mouse.up();
    const result = await page.evaluate(() => {
      const { renderer, scene, camera } = __portrait, render = renderer.render;
      renderer.render = () => {};
      try { const t = performance.now(); for (let i = 0; i < 30; i++) __frame(t + i * 16.667); }
      finally { renderer.render = render; }
      renderer.render(scene, camera);
      const gl = renderer.getContext(), data = new Uint8Array(gl.drawingBufferWidth * gl.drawingBufferHeight * 4);
      gl.readPixels(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight, gl.RGBA, gl.UNSIGNED_BYTE, data);
      return { q: camera.quaternion.toArray(), colors: new Set(data).size, triangles: renderer.info.render.triangles, calls: renderer.info.render.calls };
    });
    assert.notDeepEqual(result.q, before, 'Pano drag turns the loaded scene');
    assert.ok(result.colors > 30); assert.ok(result.triangles > 10000);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: `artifacts/environment/${name}-pano.png` });
    console.log('PASS rendered panorama', name, result);
  }
  assert.deepEqual(errors, []);
} finally { await browser.close(); }
