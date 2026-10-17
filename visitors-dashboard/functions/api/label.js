import { authorised, json } from './_auth.js';
// Give a device a friendly name ("Ravi's phone"), or hide it ("me") — stored on the device row.
export async function onRequestPost({ request, env }) {
  if (!(await authorised(request, env))) return json({ error: 'unauthorised' }, 401);
  let body; try { body = await request.json(); } catch { return json({ error: 'bad request' }, 400); }
  const id = String(body.id || ''), label = String(body.label ?? '').trim().slice(0, 60);
  if (!/^[a-z0-9-]{8,40}$/.test(id)) return json({ error: 'bad id' }, 400);
  await env.VISITS.prepare('UPDATE devices SET label = ? WHERE id = ?').bind(label || null, id).run();
  return json({ ok: true });
}
