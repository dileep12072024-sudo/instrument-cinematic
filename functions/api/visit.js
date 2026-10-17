// Records an anonymous visit: one device row (browser ID from the visitor's localStorage) and one row per visit (tab
// session), refreshed by a 30 s heartbeat so visit length is known. No IP address or name is stored.
const ID = /^[a-z0-9-]{8,40}$/;
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|facebookexternalhit|whatsapp|telegram|discord|slack/i;

function describe(ua) {
  const os = /Android ([\d.]+)/.exec(ua)?.[0] || (/iPhone|iPad|iPod/.test(ua) ? `iOS ${(/OS (\d+[_\d]*)/.exec(ua)?.[1] || '').replace(/_/g, '.')}`.trim() : null)
    || (/Windows NT 10/.test(ua) ? 'Windows 10/11' : /Windows/.test(ua) ? 'Windows' : /Mac OS X/.test(ua) ? 'macOS' : /CrOS/.test(ua) ? 'ChromeOS' : /Linux/.test(ua) ? 'Linux' : 'Unknown');
  const browser = [[/Edg\/(\d+)/, 'Edge'], [/OPR\/(\d+)/, 'Opera'], [/SamsungBrowser\/(\d+)/, 'Samsung Internet'], [/Firefox\/(\d+)/, 'Firefox'],
    [/(?:CriOS|Chrome)\/(\d+)/, 'Chrome'], [/Version\/(\d+).*Safari/, 'Safari']].map(([re, name]) => { const m = re.exec(ua); return m && `${name} ${m[1]}`; }).find(Boolean) || 'Other';
  const device = /iPad|Tablet/.test(ua) || /Android/.test(ua) && !/Mobile/.test(ua) ? 'Tablet' : /Mobi|iPhone|Android/.test(ua) ? 'Phone' : 'Computer';
  const model = /Android [\d.]+; ([^;)]+)/.exec(ua)?.[1]?.replace(/ Build.*/, '');
  return { device: model && model !== 'K' ? `${device} (${model})` : device, os, browser };
}

export async function onRequestPost({ request, env }) {
  const ua = request.headers.get('user-agent') || '';
  if (BOT.test(ua) || Number(request.headers.get('content-length') || 0) > 2048) return new Response(null, { status: 204 });
  let body; try { body = await request.json(); } catch { return new Response(null, { status: 400 }); }
  const { d, v } = body || {};
  if (!ID.test(d || '') || !ID.test(v || '')) return new Response(null, { status: 400 });
  const now = Date.now(), cf = request.cf || {}, info = describe(ua), clip = (s, n) => String(s ?? '').slice(0, n);
  const page = new URL(request.url), host = clip(page.host, 80);
  const fresh = await env.VISITS.prepare('INSERT OR IGNORE INTO visits (id, device_id, started, last_active, host, path, referrer, city, country) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(v, d, now, now, host, clip(body.p, 120), clip(body.r, 200), clip(cf.city, 60), clip(cf.country, 4)).run();
  const isNew = fresh.meta.changes > 0;
  await env.VISITS.batch([
    env.VISITS.prepare('UPDATE visits SET last_active = ? WHERE id = ? AND device_id = ?').bind(now, v, d),
    env.VISITS.prepare(`INSERT INTO devices (id, first_seen, last_seen, visits, device, os, browser, screen, language, timezone, city, region, country)
      VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_seen = excluded.last_seen, visits = visits + ?, device = excluded.device, os = excluded.os, browser = excluded.browser,
        screen = excluded.screen, language = excluded.language, timezone = excluded.timezone, city = excluded.city, region = excluded.region, country = excluded.country`)
      .bind(d, now, now, info.device, info.os, info.browser, clip(body.s, 20), clip(body.l, 20), clip(body.tz, 40), clip(cf.city, 60), clip(cf.region, 60), clip(cf.country, 4), isNew ? 1 : 0),
  ]);
  return new Response(null, { status: 204 });
}
