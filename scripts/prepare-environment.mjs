import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
import sharp from 'sharp';
import { createHash } from 'node:crypto';

const path = 'public/media/campus-environment.glb';
const input = await readFile(path), jsonLength = input.readUInt32LE(12);
assert.equal(input.readUInt32LE(0), 0x46546c67);
const gltf = JSON.parse(input.subarray(20, 20 + jsonLength));
const binary = input.subarray(28 + jsonLength);
const replacements = new Map();
const maskedImages = new Map();
// These two libraries supply separate JPEG color and PNG masks, unlike the tree RGBA maps.
for (const asset of ['grass_bermuda_01', 'shrub_03']) {
  const material = gltf.materials.find(m => m.extras?.source_material.startsWith(asset));
  const index = gltf.textures[material.pbrMetallicRoughness.baseColorTexture.index].source;
  const base = `blender/sources/${asset}/textures/${asset}`;
  const alpha = await sharp(`${base}_alpha_1k.png`).resize(1024, 1024).extractChannel(0).toBuffer();
  const rgba = await sharp(`${base}_diff_1k.jpg`).resize(1024, 1024).joinChannel(alpha).png().toBuffer();
  assert.equal((await sharp(rgba).stats()).isOpaque, false, `${asset} must retain its leaf mask`);
  maskedImages.set(index, rgba);
  material.alphaMode = 'MASK'; material.alphaCutoff = .45;
}
for (const [index, image] of gltf.images.entries()) {
  const view = gltf.bufferViews[image.bufferView];
  const original = maskedImages.get(index) || binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const resized = await sharp(original).resize({ width: 1024, height: 1024, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  const opaque = (await sharp(resized).stats()).isOpaque;
  const packed = opaque ? await sharp(resized).removeAlpha().jpeg({ quality: 88 }).toBuffer() : await sharp(resized).png({ compressionLevel: 9 }).toBuffer();
  image.mimeType = opaque ? 'image/jpeg' : 'image/png';
  replacements.set(image.bufferView, packed);
}
const chunks = []; let offset = 0;
for (const [index, view] of gltf.bufferViews.entries()) {
  const bytes = replacements.get(index) || binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const padded = Buffer.alloc(Math.ceil(bytes.length / 4) * 4); bytes.copy(padded);
  view.byteOffset = offset; view.byteLength = bytes.length;
  offset += padded.length; chunks.push(padded);
}
gltf.buffers[0].byteLength = offset;
const json = Buffer.from(JSON.stringify(gltf)), paddedJson = Buffer.alloc(Math.ceil(json.length / 4) * 4, 0x20);
json.copy(paddedJson);
const header = Buffer.alloc(20), binHeader = Buffer.alloc(8);
header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(28 + paddedJson.length + offset, 8);
header.writeUInt32LE(paddedJson.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
binHeader.writeUInt32LE(offset, 0); binHeader.writeUInt32LE(0x004e4942, 4);
const output = Buffer.concat([header, paddedJson, binHeader, ...chunks]);
assert.ok(output.length < 25 * 1024 * 1024, 'Environment must fit the Pages asset limit');
await writeFile(path, output);
const reportPath = 'blender/gis/runtime-checks.json';
const report = JSON.parse(await readFile(reportPath, 'utf8'));
report.source = 'blender/campus-terrain-working.blend';
report.rawBytes = input.length;
report.bytes = output.length;
report.sha256 = createHash('sha256').update(output).digest('hex');
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n');
await mkdir('public/media/draco', { recursive: true });
for (const file of ['draco_decoder.wasm', 'draco_wasm_wrapper.js']) {
  await copyFile(`node_modules/three/examples/jsm/libs/draco/gltf/${file}`, `public/media/draco/${file}`);
}
console.log('Prepared Blender environment', { before: input.length, after: output.length, trees: gltf.scenes[0].extras.tree_count });
