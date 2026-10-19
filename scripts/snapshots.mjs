// Shoots the portfolio's frames from the real scene on the real GPU (Windows Chrome over the DevTools protocol):
//   node.exe scripts/snapshots.mjs <campus url, e.g. http://localhost:5192/campus/?live> <set: day|night> <shape: land|port> [first..last]
// Writes public/frames/<set>-<shape>/<key>.webp (+ .d.webp depth) and manifest.json; the flight's frames are then
// encoded to flight.mp4 by scripts/snapshots-video.sh. The site must be a production build (vite preview).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';

const [url, set, shape, range = ''] = process.argv.slice(2);
const sets = {
  // a clear afternoon, and the full moon of 26 October 2026 at night
  day: { date: '2026-10-21T06:00:00Z', hour: 16.0 },
  night: { date: '2026-10-26T15:00:00Z', hour: 20.5, moon: { dir: [-0.17, 0.208, -0.963], scale: 2.4 } },
};
const shapes = { land: [1280, 720], port: [720, 1280] };
const look = sets[set], [w, h] = shapes[shape], out = join(process.cwd(), 'public', 'frames', `${set}-${shape}`);
mkdirSync(out, { recursive: true });

const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9500 + Math.floor(Math.random() * 40);
const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${process.env.TEMP}\\ic-gpu\\snap-${Date.now()}`,
  '--incognito', '--enable-automation', '--window-position=-3000,0', '--window-size=1500,1400', '--no-first-run', '--no-default-browser-check', '--use-angle=d3d11',
  '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', '--disable-background-timer-throttling', 'about:blank'], { stdio: 'ignore' });
let target; for (let i = 0; i < 100 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const waiting = new Map(), errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && waiting.has(m.id)) { waiting.get(m.id)(m); waiting.delete(m.id); }
  if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description?.slice(0, 300)); };
const send = (method, params = {}) => new Promise(r => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
const ev = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 500)); return r.result?.result?.value; };
const save = (key, ext, data) => { const f = join(out, `${key}${ext}`); mkdirSync(dirname(f), { recursive: true }); writeFileSync(f, Buffer.from(data.split(',')[1], 'base64')); };

try {
  await send('Page.enable'); await send('Runtime.enable');
  // a fixed moment: the clock starts at the set's date and runs on, so fans and water keep their motion
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `(() => { const Real = Date, offset = ${Date.parse(look.date)} - Real.now();
    class Fixed extends Real { constructor(...a) { a.length ? super(...a) : super(Real.now() + offset); } static now() { return Real.now() + offset; } }
    window.Date = Fixed; window.__story = true; window.__noRise = true; })();` });
  await send('Page.navigate', { url });
  for (let i = 0; i < 2400; i++) { await sleep(250); if (await ev('!!(window.__portrait?.ready)')) break; }
  await sleep(1500);
  console.log('setup', await ev(`(() => { const p = __portrait;
    const c = document.querySelector('#live-clock'); if (c) { c.checked = false; c.dispatchEvent(new Event('change')); }
    const hr = document.querySelector('#hour'); hr.value = ${look.hour}; hr.dispatchEvent(new Event('input'));
    p.weather.rainFactor = 0; p.weather.rainRate = 0; p.weather.storm = false; p.weather.cloudCover = 12; p.refreshWeather = () => {};
    return JSON.stringify({ moon: p.moon.label }); })()`));
  await sleep(5000); // the hour eases in, the wet ground dries
  const info = await ev(`JSON.stringify(__portrait.snapshot.setup({ w: ${w}, h: ${h} }))`);
  const { aspect, riseLength } = JSON.parse(info);
  const plan = JSON.parse(await ev(`JSON.stringify(__portrait.snapshot.plan({ aspect: ${aspect}, spacing: .32, flightSeconds: ${riseLength + .6}, fps: 30 }))`));
  writeFileSync(join(out, 'manifest.json'), JSON.stringify({ set, shape, w, h, aspect, fps: 30, flight: plan.flight, segments: plan.segments }));
  const [a, b] = range ? range.split('..').map(Number) : [0, plan.frames.length - 1];
  console.log(`${plan.frames.length} frames (flight ${plan.flight}); shooting ${a}..${b}`);
  const t0 = Date.now();
  for (let i = a; i <= Math.min(b, plan.frames.length - 1); i++) {
    const item = plan.frames[i];
    if (existsSync(join(out, `${item.key}.webp`)) && (!item.hold || existsSync(join(out, `${item.key}.d.webp`)))) continue;
    const prev = plan.frames[i - 1], shadows = !prev || prev.fly < 1 || prev.first !== item.first;
    const [colour, depth] = JSON.parse(await ev(`JSON.stringify(__portrait.snapshot.shoot(${JSON.stringify(item)}, { quality: .74, shadows: ${shadows}, depth: ${!!item.hold}, moon: ${JSON.stringify(look.moon ?? null)} }))`));
    save(item.key, '.webp', colour);
    if (depth) save(item.key, '.d.webp', depth); // holds only: walking is its own 3D
    if (i % 50 === 0) console.log(`${i} ${item.key} ${((Date.now() - t0) / 1000).toFixed(0)} s`);
  }
  console.log('done in', ((Date.now() - t0) / 1000).toFixed(0), 's; errors', JSON.stringify(errors));
} finally { ws.close(); chrome.kill(); }
