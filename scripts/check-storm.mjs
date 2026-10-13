// Thunderstorm weather flashes lightning with delayed thunder; reduced-motion users get no flashes.
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
async function run(reducedMotion) {
  const page = await browser.newPage({ viewport: { width: 640, height: 400 }, deviceScaleFactor: .5, reducedMotion });
  page.setDefaultTimeout(400000);
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 26, weather_code: 95, rain: 8, precipitation: 8, cloud_cover: 100, wind_speed_10m: 30, wind_gusts_10m: 50, wind_direction_10m: 200 } } }));
  await page.addInitScript(() => { const raf = requestAnimationFrame.bind(window); window.requestAnimationFrame = cb => cb.name === 'animate' ? (window.__frame = cb, 0) : raf(cb); });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready && __portrait.weather.storm && window.__frame);
  const result = await page.evaluate(() => {
    const { renderer, sound } = __portrait; renderer.render = () => {}; // timing only
    const thunder = []; sound.thunder = delay => thunder.push(delay);
    let t = performance.now() + 1000, peak = 0, sky = 0;
    for (let i = 0; i < 1400; i++) { __frame(t += 33); peak = Math.max(peak, __portrait.lightning.light.intensity); sky = Math.max(sky, __portrait.scene.backgroundIntensity); }
    return { peak, sky, thunder: thunder.length, minDelay: Math.min(...thunder) };
  });
  await page.close();
  return result;
}
try {
  const storm = await run('no-preference');
  assert.ok(storm.peak > 1, 'lightning lights the scene');
  assert.ok(storm.thunder >= 1 && storm.minDelay > .5, 'thunder follows each flash after a delay');
  const calm = await run('reduce');
  assert.equal(calm.peak, 0, 'no flashes for reduced motion');
  console.log('PASS thunderstorm lightning and thunder', { storm, calm });
} finally { await browser.close(); }
