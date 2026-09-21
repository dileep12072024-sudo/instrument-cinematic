import { chromium } from 'playwright';
const browser = await chromium.launch({ headless: true, executablePath: '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  page.on('pageerror', e => console.log('PAGE ERROR', e.message));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log(m.type(), m.text()); });
  await page.goto(process.argv[2] || 'http://127.0.0.1:5176', { waitUntil: 'networkidle', timeout: 90000 });
  await page.waitForFunction(() => window.__portrait?.ready, { timeout: 90000 });
  await page.waitForTimeout(1800);
  await page.screenshot({ path: 'artifacts/first-desktop.png' });
  console.log(await page.evaluate(() => ({ calls: __portrait.renderer.info.render.calls, triangles: __portrait.renderer.info.render.triangles, camera: __portrait.camera.position.toArray(), geometries: __portrait.renderer.info.memory.geometries })));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: 'artifacts/first-mobile.png' });
} finally { await browser.close(); }
