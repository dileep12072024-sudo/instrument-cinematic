// Auto quality must survive tab switches, drop under sustained load, and recover afterwards.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 800, height: 500 }, deviceScaleFactor: 1 });
  page.setDefaultTimeout(240000);
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 27, weather_code: 0, cloud_cover: 10, wind_speed_10m: 5 } } }));
  await page.addInitScript(() => {
    const raf = requestAnimationFrame.bind(window);
    window.requestAnimationFrame = cb => cb.name === 'animate' ? (window.__frame = cb, 0) : raf(cb);
  });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready && window.__frame);
  const ratios = await page.evaluate(() => {
    const { renderer } = __portrait;
    renderer.render = () => {}; // timing logic only; software WebGL frames are irrelevant here
    let t = performance.now() + 10000;
    const run = (n, step) => { for (let i = 0; i < n; i++) __frame(t += step); return renderer.getPixelRatio(); };
    t += 5000; // past the post-load warm-up window
    const start = run(60, 16.7);
    const afterSwitch = (t += 30000, run(1, 0), run(80, 16.7)); // one 30 s gap: returning to the tab
    const paced = (run(300, 33.4), __portrait.cadence); // GPU only manages every 2nd refresh: even 30 fps, same resolution
    const pacedRatio = renderer.getPixelRatio();
    const loaded = run(200, 50); // too slow even for 30 fps: small resolution steps
    const settled = []; for (let i = 0; i < 12; i++) settled.push(run(60, 33.4)); // fits 30 fps at the reached level
    const recovered = run(2000, 33.4); // upgrade attempts never exceed the level that failed
    return { start, afterSwitch, paced, pacedRatio, loaded, settled, recovered, cadence: __portrait.cadence };
  });
  assert.equal(ratios.afterSwitch, ratios.start, 'a tab switch must not lower resolution');
  assert.ok(ratios.paced === 2 && ratios.pacedRatio === ratios.start, 'moderate load paces at an even 30 fps without lowering resolution');
  assert.ok(ratios.loaded < ratios.start && ratios.loaded >= .8, 'heavy load lowers resolution in small steps');
  assert.equal(new Set(ratios.settled).size, 1, 'no oscillation once a sustainable level is found');
  assert.ok(ratios.recovered <= ratios.loaded / .88 + .001, 'a level that failed is not retried');
  console.log('PASS adaptive resolution', ratios);
} finally { await browser.close(); }
