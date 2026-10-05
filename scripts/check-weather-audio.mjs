import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || '/home/dragon/.cache/ms-playwright/chromium-1223/chrome-linux64/chrome', args: ['--no-sandbox'] });
const page = await browser.newPage();
try {
  await page.route('**/weather-audio-check', route => route.fulfill({ contentType: 'text/html', body: '<button id="start">Start sound</button>' }));
  await page.route('**/media/birds.mp3', route => route.fulfill({ status: 503, body: 'Unavailable' }));
  await page.goto(new URL('/weather-audio-check', process.argv[2] || 'http://127.0.0.1:5190').href);
  await page.evaluate(async () => {
    const { createAmbience } = await import('/src/ambience.js');
    window.sound = createAmbience();
    document.querySelector('#start').onclick = () => {
      sound.setWeather({ rainFactor: 1, windSpeed: 40 }, false);
      window.started = sound.setEnabled(true);
    };
  });
  await page.click('#start');
  await page.evaluate(() => window.started);
  assert.ok(await page.evaluate(() => sound.enabled && sound.context.state === 'running' && !sound.birdsReady));
  await page.waitForFunction(() => sound.weatherMix.rain > .6);
  const outside = await page.evaluate(() => sound.weatherMix);
  await page.evaluate(() => sound.setWeather({ rainFactor: 1, windSpeed: 40 }, true));
  await page.waitForFunction(() => sound.weatherMix.rain < .22 && sound.weatherMix.rainCutoff < 1200);
  const inside = await page.evaluate(() => sound.weatherMix);
  assert.ok(inside.rain < outside.rain * .4 && inside.wind < outside.wind * .4);
  await page.evaluate(() => sound.setWeather({ rainFactor: 0, windSpeed: 0 }, false));
  await page.waitForFunction(() => sound.weatherMix.rain < .01 && sound.weatherMix.wind < .03);
  await page.evaluate(() => sound.setMuted(true));
  assert.equal(await page.evaluate(() => sound.context.state), 'suspended');
  await page.evaluate(() => sound.setMuted(false));
  assert.equal(await page.evaluate(() => sound.context.state), 'running');
  await page.unroute('**/media/birds.mp3');
  await page.evaluate(() => sound.setEnabled(true));
  assert.ok(await page.evaluate(() => sound.birdsReady));
  await page.evaluate(() => sound.setEnabled(false));
  assert.equal(await page.evaluate(() => sound.context.state), 'suspended');
  console.log('PASS rain/wind audio, indoor attenuation, dry/calm recovery, mute, recording failure and recovery', { outside, inside });
} finally { await browser.close(); }
