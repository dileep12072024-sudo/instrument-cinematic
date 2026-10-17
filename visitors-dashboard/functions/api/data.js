import { authorised, json } from './_auth.js';
// All devices and their visits from the last 120 days.
export async function onRequestGet({ request, env }) {
  if (!(await authorised(request, env))) return json({ error: 'unauthorised' }, 401);
  const since = Date.now() - 120 * 864e5;
  const [devices, visits] = await Promise.all([
    env.VISITS.prepare('SELECT * FROM devices ORDER BY last_seen DESC LIMIT 1000').all(),
    env.VISITS.prepare('SELECT id, device_id, started, last_active, host, path, referrer, city, country FROM visits WHERE started > ? ORDER BY started DESC LIMIT 10000').bind(since).all(),
  ]);
  return json({ now: Date.now(), devices: devices.results, visits: visits.results });
}
