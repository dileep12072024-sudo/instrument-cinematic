// Shrink the environment GLB's textures with no visible change; geometry bytes are copied untouched.
// - PNG textures are recompressed at maximum zlib effort; each is decoded and compared pixel for pixel. (Lossless
//   WebP was rejected: this libwebp build zeroes the colour under transparent pixels, darkening leaf edges.)
// - Roughness maps on foliage are dropped: blender-environment.js removes them at runtime (matte leaves).
// Usage: node scripts/compress-environment-textures.mjs [in.glb] [out.glb]
import { readFileSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import sharp from 'sharp';

const [input = 'public/media/campus-environment.glb', output = input] = process.argv.slice(2);
const glb = readFileSync(input), jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
const binStart = 20 + jsonLength + 8, bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLength));
const view = i => { const v = json.bufferViews[i]; return bin.subarray(v.byteOffset || 0, (v.byteOffset || 0) + v.byteLength); };

let dropped = 0;
for (const material of json.materials) {
  const pbr = material.pbrMetallicRoughness;
  if (material.extras?.foliage && pbr?.metallicRoughnessTexture) { delete pbr.metallicRoughnessTexture; dropped++; }
}

// Keep only textures/images still referenced, then rebuild the binary chunk from the views still in use.
const usedTextures = new Set();
JSON.stringify(json.materials, (key, value) => { if (value && typeof value === 'object' && Number.isInteger(value.index) && 'index' in value && key.endsWith('Texture')) usedTextures.add(value.index); return value; });
const textureMap = new Map(), textures = [];
json.textures.forEach((t, i) => { if (usedTextures.has(i)) { textureMap.set(i, textures.length); textures.push(t); } });
JSON.stringify(json.materials, (key, value) => { if (value && typeof value === 'object' && key.endsWith('Texture') && textureMap.has(value.index)) value.index = textureMap.get(value.index); return value; });
const imageMap = new Map(), images = [];
for (const t of textures) { if (!imageMap.has(t.source)) { imageMap.set(t.source, images.length); images.push(json.images[t.source]); } t.source = imageMap.get(t.source); }

const payload = new Map(); // bufferView index -> bytes
let before = 0, after = 0;
for (const image of images) {
  const bytes = view(image.bufferView);
  if (image.mimeType !== 'image/png') { payload.set(image.bufferView, bytes); continue; }
  const smaller = await sharp(bytes).png({ compressionLevel: 9, adaptiveFiltering: true, palette: false }).toBuffer();
  const [a, b] = await Promise.all([sharp(bytes).ensureAlpha().raw().toBuffer(), sharp(smaller).ensureAlpha().raw().toBuffer()]);
  assert.ok(a.equals(b), `${image.name}: recompressed PNG must decode to identical pixels`);
  if (smaller.length >= bytes.length) { payload.set(image.bufferView, bytes); continue; }
  before += bytes.length; after += smaller.length; payload.set(image.bufferView, smaller);
}
json.textures = textures; json.images = images;

const referenced = new Set([...json.accessors.map(a => a.bufferView), ...images.map(i => i.bufferView)].filter(Number.isInteger));
JSON.stringify(json.meshes, (key, value) => { if (key === 'bufferView' && Number.isInteger(value)) referenced.add(value); return value; });
const viewMap = new Map(), views = [], chunks = []; let offset = 0;
json.bufferViews.forEach((v, i) => {
  if (!referenced.has(i)) return;
  const bytes = payload.get(i) ?? view(i), pad = (4 - offset % 4) % 4;
  if (pad) { chunks.push(Buffer.alloc(pad)); offset += pad; }
  viewMap.set(i, views.length); views.push({ ...v, byteOffset: offset, byteLength: bytes.length });
  chunks.push(bytes); offset += bytes.length;
});
const remap = i => viewMap.get(i);
json.accessors.forEach(a => { if (Number.isInteger(a.bufferView)) a.bufferView = remap(a.bufferView); });
images.forEach(i => { i.bufferView = remap(i.bufferView); });
JSON.stringify(json.meshes, (key, value) => { if (value?.KHR_draco_mesh_compression) value.KHR_draco_mesh_compression.bufferView = remap(value.KHR_draco_mesh_compression.bufferView); return value; });
json.bufferViews = views; json.buffers = [{ byteLength: offset }];

const pad4 = (b, fill) => Buffer.concat([b, Buffer.alloc((4 - b.length % 4) % 4, fill)]);
const jsonChunk = pad4(Buffer.from(JSON.stringify(json)), 0x20), binChunk = pad4(Buffer.concat(chunks), 0);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + jsonChunk.length + 8 + binChunk.length, 8);
const chunkHeader = (length, type) => { const h = Buffer.alloc(8); h.writeUInt32LE(length, 0); h.writeUInt32LE(type, 4); return h; };
writeFileSync(output, Buffer.concat([header, chunkHeader(jsonChunk.length, 0x4e4f534a), jsonChunk, chunkHeader(binChunk.length, 0x004e4942), binChunk]));
console.log(`foliage roughness maps dropped: ${dropped}; PNG recompressed: ${(before / 1048576).toFixed(2)} MB -> ${(after / 1048576).toFixed(2)} MB`);
console.log(`${input} ${(glb.length / 1048576).toFixed(2)} MB -> ${output} ${((12 + 16 + jsonChunk.length + binChunk.length) / 1048576).toFixed(2)} MB`);
