// The story's frames off the main thread (story.js): fetched and kept here as compressed bytes, and decoded here to raw
// pixels, so the main thread only copies pixels to the GPU. (Uploading a decoded ImageBitmap cost ~10 ms a frame on
// integrated graphics, the browser finishing the decode inside the upload; and hundreds of fetches a scroll had their
// own cost on the main thread.)
//   { fetch: key, depth }  bytes of the frame's colour image, and its depth image if asked (the stops' frames only);
//                          answers { fetched: key } or { failed: key }
//   { decode: key }        pixels; answers { key, c, w, h, d, dw, dh } (colour RGBA; depth one channel, or none)
let base = '';
const bytes = new Map(), fetching = new Map(); // key -> [colour blob, depth blob or null]
const canvas = new OffscreenCanvas(1, 1), g = canvas.getContext('2d', { willReadFrequently: true });
function pixels(bitmap) {
  if (canvas.width !== bitmap.width || canvas.height !== bitmap.height) { canvas.width = bitmap.width; canvas.height = bitmap.height; }
  g.drawImage(bitmap, 0, 0); bitmap.close();
  return g.getImageData(0, 0, canvas.width, canvas.height).data;
}
const get = async url => { const r = await fetch(url); if (!r.ok) throw new Error(`${url}: ${r.status}`); return r.blob(); };
function load(key, depth) {
  if (bytes.has(key)) return Promise.resolve(bytes.get(key));
  if (!fetching.has(key)) fetching.set(key, Promise.all([get(`${base}${key}.webp`), depth ? get(`${base}${key}.d.webp`) : null])
    .then(b => { bytes.set(key, b); return b; }).finally(() => fetching.delete(key)));
  return fetching.get(key);
}
onmessage = async ({ data }) => {
  if (data.base) { base = data.base; return; }
  if (data.forget) { for (const k of data.forget) bytes.delete(k); return; }
  if (data.fetch) { try { await load(data.fetch, data.depth); postMessage({ fetched: data.fetch }); } catch { postMessage({ failed: data.fetch }); } return; }
  const key = data.decode;
  try {
    const [colour, depth] = await load(key, data.depth);
    const c = pixels(await createImageBitmap(colour)), w = canvas.width, h = canvas.height;
    if (!depth) { postMessage({ key, c: c.buffer, w, h, d: null }, [c.buffer]); return; }
    const rgba = pixels(await createImageBitmap(depth)), dw = canvas.width, dh = canvas.height;
    const d = new Uint8Array(dw * dh); for (let i = 0; i < d.length; i++) d[i] = rgba[i * 4]; // grey: one channel is enough
    postMessage({ key, c: c.buffer, w, h, d: d.buffer, dw, dh }, [c.buffer, d.buffer]);
  } catch (e) { postMessage({ key, error: String(e) }); }
};
