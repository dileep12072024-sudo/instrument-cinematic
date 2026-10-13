// Phone check with real touch input: the scene loads, the loader clears, and panorama turns with a finger drag.
import assert from 'node:assert/strict';
import { chromium, devices } from 'playwright';
import { mkdir } from 'node:fs/promises';

const browser = await chromium.launch({ executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome',
  args: ['--no-sandbox', '--use-angle=swiftshader', '--use-gl=angle', '--enable-unsafe-swiftshader'] });
try {
  const context = await browser.newContext({ ...devices['Pixel 7'] });
  const page = await context.newPage();
  page.setDefaultTimeout(400000);
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.route('https://api.open-meteo.com/**', route => route.fulfill({ json: { current: { time: Date.now() / 1000, temperature_2m: 27, weather_code: 0, cloud_cover: 10, wind_speed_10m: 5 } } }));
  const started = Date.now();
  await page.goto(process.argv[2] || 'http://127.0.0.1:5190', { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => window.__portrait?.ready); console.log('ready', (Date.now() - started) / 1000);
  await page.locator('#loader').waitFor({ state: 'hidden' });
  const loadSeconds = (Date.now() - started) / 1000;
  const cdp = await context.newCDPSession(page);
  const box = await page.locator('#viewport canvas').boundingBox();
  const touch = async (type, x, y) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] });
  async function swipe(dx, dy) {
    const x = box.x + box.width / 2, y = box.y + box.height * .45;
    await touch('touchStart', x, y);
    for (let i = 1; i <= 12; i++) { await touch('touchMove', x + dx * i / 12, y + dy * i / 12); await page.waitForTimeout(30); }
    await touch('touchEnd');
    await page.waitForTimeout(1500); // let the eased look settle on the real animation loop
  }
  const look = () => page.evaluate(() => {
    const c = __portrait.camera, e = new c.rotation.constructor().setFromQuaternion(c.quaternion, 'YXZ');
    return { yaw: e.y, pitch: e.x, roll: e.z, pos: c.position.toArray(), pressed: document.querySelector('#panorama').getAttribute('aria-pressed') };
  });
  await page.locator('#panorama').tap(); console.log('tapped panorama');
  const before = await look();
  assert.equal(before.pressed, 'true', 'panorama button toggles on with a tap');
  await swipe(-140, 0);
  const turned = await look(); console.log('after swipe', turned);
  await swipe(0, 90);
  const tilted = await look();
  await mkdir('artifacts/mobile', { recursive: true });
  await page.screenshot({ path: 'artifacts/mobile/panorama.png' });
  assert.ok(Math.abs(turned.yaw - before.yaw) > .15, `horizontal swipe turns the view (${before.yaw} -> ${turned.yaw})`);
  assert.ok(Math.abs(tilted.pitch - turned.pitch) > .08, 'vertical swipe tilts the view');
  assert.ok(Math.abs(tilted.roll) < .02, 'no roll');
  assert.deepEqual(errors, []);
  console.log('PASS mobile load and touch panorama', { loadSeconds, yaw: [before.yaw, turned.yaw].map(v => +v.toFixed(3)), pitch: +tilted.pitch.toFixed(3) });
} finally { await browser.close(); }
