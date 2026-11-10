// where the main thread goes during one scroll of the story: node.exe scroll-prof.mjs <url> <stop index>
import { open, sleep } from './cdp.mjs';
const [url, stop = '1'] = process.argv.slice(2);
const b = await open(url);
try {
  for (let i = 0; i < 1500; i++) { await sleep(200); if (await b.ev(`!!window.__portrait?.ready`).catch(() => false)) break; }
  await sleep(5000);
  await b.send('Profiler.enable'); await b.send('Profiler.setSamplingInterval', { interval: 1000 }); await b.send('Profiler.start');
  const n = stop === 'all' ? await b.ev(`document.querySelectorAll('#portfolio section.pf-sec').length`) : 0;
  for (const i of n ? Array.from({ length: n - 1 }, (_, k) => k + 1) : [+stop]) { await b.ev(`(() => { const p = __portrait.portfolio; p.lenis.scrollTo(p.scrollFor(${i}), { duration: 2.4, force: true }); return 1; })()`); await sleep(3300); }
  const p = (await b.send('Profiler.stop')).result.profile;
  const byId = new Map(p.nodes.map(n => [n.id, n])), parent = new Map(); for (const n of p.nodes) for (const c of n.children || []) parent.set(c, n.id);
  const key = n => `${n.callFrame.functionName || '(anon)'} ${n.callFrame.url.split('/').pop().slice(0, 14)}:${n.callFrame.lineNumber}`, self = new Map(), incl = new Map(); const gaps = [];
  for (let i = 0; i < p.samples.length; i++) { const ms = (p.timeDeltas[i + 1] || 0) / 1000, top = byId.get(p.samples[i]), seen = new Set(); self.set(key(top), (self.get(key(top)) || 0) + ms);
    if (ms > 90) { const chain = []; for (let id = p.samples[i]; id !== undefined && chain.length < 6; id = parent.get(id)) chain.push(key(byId.get(id))); gaps.push([Math.round(ms), chain.join(' < ')]); }
    for (let id = p.samples[i]; id !== undefined; id = parent.get(id)) { const k = key(byId.get(id)); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) || 0) + ms); } } }
  const show = (m, n, f = () => true) => [...m].filter(([k]) => f(k)).sort((a, c) => c[1] - a[1]).slice(0, n).map(([k, ms]) => `${Math.round(ms)} ${k}`).join(' | ');
  console.log('self:', show(self, 12, k => !/idle|program/.test(k))); console.log('incl:', show(incl, 16, k => /main-/.test(k))); console.log('gaps over 90 ms:'); for (const g of gaps.sort((a, c) => c[0] - a[0]).slice(0, 8)) console.log(' ', g.join(' ms: '));
} finally { b.close(); }
