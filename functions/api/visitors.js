// Private visitor list: /api/visitors?key=<VISITOR_KEY>. One card per device, newest first, with its recent visits.
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = t => new Date(t).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const span = ms => ms < 60000 ? `${Math.max(1, Math.round(ms / 1000))} s` : ms < 3600000 ? `${Math.round(ms / 60000)} min` : `${(ms / 3600000).toFixed(1)} h`;

async function same(a, b) { // constant-time comparison of the key
  const enc = new TextEncoder(), [x, y] = await Promise.all([a, b].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const p = new Uint8Array(x), q = new Uint8Array(y); let diff = 0; for (let i = 0; i < p.length; i++) diff |= p[i] ^ q[i]; return diff === 0;
}

export async function onRequestGet({ request, env }) {
  const key = new URL(request.url).searchParams.get('key') || '';
  if (!env.VISITOR_KEY || !(await same(key, env.VISITOR_KEY))) return new Response('Not found', { status: 404 });
  const devices = (await env.VISITS.prepare('SELECT * FROM devices ORDER BY last_seen DESC LIMIT 300').all()).results;
  const visits = (await env.VISITS.prepare('SELECT * FROM visits WHERE started > ? ORDER BY started DESC LIMIT 3000').bind(Date.now() - 90 * 864e5).all()).results;
  const byDevice = new Map(); for (const v of visits) { if (!byDevice.has(v.device_id)) byDevice.set(v.device_id, []); byDevice.get(v.device_id).push(v); }
  const total = devices.reduce((n, d) => n + d.visits, 0), today = devices.filter(d => Date.now() - d.last_seen < 864e5).length;
  const cards = devices.map(d => {
    const list = (byDevice.get(d.id) || []).slice(0, 12).map(v => `<li>${esc(when(v.started))} · ${esc(span(v.last_active - v.started))} · ${esc(v.host)}${esc(v.path || '')}${v.referrer ? ` · from ${esc(v.referrer)}` : ''}</li>`).join('');
    const place = [d.city, d.region, d.country].filter(Boolean).join(', ');
    return `<article data-id="${esc(d.id)}"><header><strong>${esc(d.device)}</strong> · ${esc(d.os)} · ${esc(d.browser)}<span class="you">this device</span></header>
      <p>${esc(place || 'Location unknown')} · screen ${esc(d.screen)} · ${esc(d.language)} · ${esc(d.timezone)}</p>
      <p><b>${d.visits}</b> visit${d.visits === 1 ? '' : 's'} · first ${esc(when(d.first_seen))} · last ${esc(when(d.last_seen))}</p><ul>${list}</ul></article>`;
  }).join('');
  const html = `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="robots" content="noindex">
<title>Visitors</title><style>
:root{color-scheme:light dark;--bg:#f6f5f1;--card:#fff;--ink:#1d2321;--muted:#66706c;--line:#e2e0d8;--accent:#3d6b5a}
@media(prefers-color-scheme:dark){:root{--bg:#121514;--card:#1b1f1e;--ink:#e8ece9;--muted:#9aa49f;--line:#2b3130;--accent:#8fc4ad}}
body{margin:0;background:var(--bg);color:var(--ink);font:14px/1.5 system-ui,sans-serif}main{max-width:860px;margin:0 auto;padding:24px 16px}
h1{font-size:20px;margin:0 0 4px}.sum{color:var(--muted);margin:0 0 18px}article{background:var(--card);border:1px solid var(--line);border-radius:8px;padding:12px 14px;margin:0 0 10px}
article p{margin:4px 0;color:var(--muted)}ul{margin:6px 0 0;padding-left:18px;color:var(--muted);font-size:13px}.you{display:none;margin-left:8px;font-size:12px;color:var(--accent);border:1px solid var(--accent);border-radius:10px;padding:0 6px}
article.mine .you{display:inline}</style><main><h1>Visitors</h1>
<p class="sum">${devices.length} device${devices.length === 1 ? '' : 's'} · ${total} visits · ${today} active in the last 24 h · times in IST · recording since this list was added</p>${cards || '<p>No visits recorded yet.</p>'}</main>
<script>try{const id=localStorage.getItem('visitor-id');for(const a of document.querySelectorAll('article'))if(a.dataset.id===id)a.classList.add('mine')}catch{}</script>`;
  return new Response(html, { headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store', 'x-robots-tag': 'noindex' } });
}
