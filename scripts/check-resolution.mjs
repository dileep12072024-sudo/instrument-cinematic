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
    const start = run(40, 16.7);
    const afterSwitch = (t += 30000, run(1, 0), run(60, 16.7)); // one 30 s gap: returning to the tab
    const loaded = run(80, 40);
    const recovered = run(400, 16.7);
    return { start, afterSwitch, loaded, recovered };
  });
  assert.equal(ratios.afterSwitch, ratios.start, 'a tab switch must not lower resolution');
  assert.ok(ratios.loaded < ratios.start, 'sustained slow frames lower resolution');
  assert.equal(ratios.recovered, ratios.start, 'fast frames restore full resolution');
  console.log('PASS adaptive resolution', ratios);
} finally { await browser.close(); }
