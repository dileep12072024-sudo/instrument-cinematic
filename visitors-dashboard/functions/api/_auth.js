// Shared key check: the dashboard sends the key in the Authorization header (never in the URL).
export async function authorised(request, env) {
  const given = (request.headers.get('authorization') || '').replace(/^Bearer /, '');
  if (!env.VISITOR_KEY || !given) return false;
  const enc = new TextEncoder(), [a, b] = await Promise.all([given, env.VISITOR_KEY].map(s => crypto.subtle.digest('SHA-256', enc.encode(s))));
  const x = new Uint8Array(a), y = new Uint8Array(b); let diff = 0; for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}
export const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
