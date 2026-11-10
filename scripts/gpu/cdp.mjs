// A real Chrome window on this machine's GPU, off screen, driven over the DevTools protocol (run with Windows node.exe).
import { spawn } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function open(url, { w = 1600, h = 900, init = '' } = {}) {
  const port = 9300 + Math.floor(Math.random() * 500), dir = mkdtempSync(join(tmpdir(), 'ic-gpu-'));
  const chrome = spawn('C:/Program Files/Google/Chrome/Application/chrome.exe', [`--remote-debugging-port=${port}`, `--user-data-dir=${dir}`, '--window-position=-3000,0', `--window-size=${w},${h}`,
    '--no-first-run', '--no-default-browser-check', '--use-angle=d3d11', '--disable-features=CalculateNativeWinOcclusion', '--disable-backgrounding-occluded-windows', '--disable-renderer-backgrounding', 'about:blank'], { stdio: 'ignore' });
  let target; for (let i = 0; i < 80 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise((r, no) => { ws.onopen = r; ws.onerror = no; });
  let id = 0; const waiting = new Map(), listeners = [];
  ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) { waiting.get(m.id)?.(m); waiting.delete(m.id); } else for (const l of listeners) l(m); };
  const send = (method, params = {}) => new Promise(r => { const n = ++id; waiting.set(n, r); ws.send(JSON.stringify({ id: n, method, params })); });
  const ev = async expression => { const r = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }); if (r.result?.exceptionDetails) throw new Error(JSON.stringify(r.result.exceptionDetails).slice(0, 300)); return r.result?.result?.value; };
  await send('Page.enable'); await send('Runtime.enable'); if (init) await send('Page.addScriptToEvaluateOnNewDocument', { source: init });
  if (url) await send('Page.navigate', { url });
  return { send, ev, listen: l => listeners.push(l), shot: async (file, quality = 78) => writeFileSync(file, Buffer.from((await send('Page.captureScreenshot', { format: 'jpeg', quality })).result.data, 'base64')),
    close() { try { ws.close(); } catch {} chrome.kill(); setTimeout(() => { try { rmSync(dir, { recursive: true, force: true }); } catch {} }, 2500); } };
}
