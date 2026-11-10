// The site on the real GPU: load time and marks, shader programs, page errors, then every story stop scrolled to with
// its frames timed. node.exe check.mjs <url> [shots dir]
import { open, sleep } from './cdp.mjs';
import { mkdirSync } from 'node:fs';
const [url, shots] = process.argv.slice(2); if (shots) mkdirSync(shots, { recursive: true });
const init = `window.__f = []; window.__errs = []; (() => { let last = performance.now(); const t = now => { __f.push(now - last); last = now; requestAnimationFrame(t); }; requestAnimationFrame(t); })();
  addEventListener('error', e => __errs.push(String(e.message))); addEventListener('unhandledrejection', e => __errs.push('rejection: ' + String(e.reason)));`;
const b = await open('', { init }), t0 = Date.now();
const frames = async () => JSON.parse(await b.ev(`(() => { const f = __f.splice(0).slice(1).sort((a, b) => a - b); return JSON.stringify(f.length ? { med: +f[f.length >> 1].toFixed(1), max: Math.round(f[f.length - 1]), over100: f.filter(x => x > 100).length } : {}); })()`));
try {
  await b.send('Page.navigate', { url }); let ready = 0;
  for (let i = 0; i < 1500 && !ready; i++) { await sleep(200); if (await b.ev(`!!window.__portrait?.ready`).catch(() => false)) ready = Date.now() - t0; }
  const marks = JSON.parse(await b.ev(`JSON.stringify(performance.getEntriesByType('mark').map(m => [m.name, +(m.startTime / 1000).toFixed(1)]))`));
  console.log(JSON.stringify({ readyS: +(ready / 1000).toFixed(1), programs: await b.ev(`__portrait.renderer.info.programs.length`), heapMB: await b.ev(`Math.round(performance.memory.usedJSHeapSize / 1048576)`) }));
  console.log('marks', marks.map(m => m.join(' ')).join(' | '));
  await sleep(4000); if (shots) await b.shot(`${shots}/00-hero.jpg`);
  const p0 = await b.ev(`__portrait.renderer.info.programs.length`), ids = JSON.parse(await b.ev(`JSON.stringify([...document.querySelectorAll('#portfolio section.pf-sec')].map(s => s.id))`)), stops = [];
  for (let i = 1; i < ids.length; i++) { await frames(); await b.ev(`(() => { const p = __portrait.portfolio; p.lenis.scrollTo(p.scrollFor(${i}), { duration: 2.4, force: true }); return 1; })()`); await sleep(3300); stops.push({ id: ids[i], ...await frames() }); }
  const worst = stops.reduce((a, s) => (s.max > (a.max || 0) ? s : a), {}), meds = stops.map(s => s.med).sort((a, b) => a - b);
  console.log(JSON.stringify({ stops: stops.length, medianFrame: meds[meds.length >> 1], worstFrame: `${worst.id} ${worst.max} ms`, stopsWithFreeze: stops.filter(s => s.over100).map(s => `${s.id}:${s.max}`), programsAfter: `${p0} -> ${await b.ev(`__portrait.renderer.info.programs.length`)}`, errors: JSON.parse(await b.ev(`JSON.stringify(__errs)`)).slice(0, 4) }));
} finally { b.close(); }
