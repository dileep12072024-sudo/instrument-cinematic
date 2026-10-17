// Put the full-detail tree trunks and branches back into the packed environment. The earlier meshopt pass
// (simplify-environment.mjs, removed) cut the branch tubes to 30 %: thin twigs collapsed into flat dark shards that hung
// in the crowns, detached from the wood. Copies only the trunk/branch primitives from the last unsimplified export
// (git 922b5b7); everything else, including the recompressed textures, is kept. Distance detail now happens at run
// time (blender-environment.js woodLod). Usage: node scripts/restore-branch-detail.mjs <unsimplified.glb> [glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import draco3d from 'draco3dgltf';

const [source, target = 'public/media/campus-environment.glb'] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
});
const [from, doc] = await Promise.all([io.read(source), io.read(target)]);
const primitives = d => new Map(d.getRoot().listMeshes().flatMap(m => m.listPrimitives().map((p, i) => [`${m.getName()}#${i}`, p])));
const old = primitives(from), buffer = doc.getRoot().listBuffers()[0];
const copy = a => doc.createAccessor().setType(a.getType()).setArray(a.getArray().slice()).setNormalized(a.getNormalized()).setBuffer(buffer);
for (const [key, prim] of primitives(doc)) {
  const name = prim.getMaterial()?.getName() || '';
  if (!/branches|trunk/i.test(name)) continue;
  const was = old.get(key); if (!was) throw new Error(`No unsimplified primitive for ${key}`);
  const before = prim.getIndices().getCount() / 3;
  for (const semantic of prim.listSemantics()) prim.setAttribute(semantic, copy(was.getAttribute(semantic)));
  prim.setIndices(copy(was.getIndices()));
  console.log(name.padEnd(36), before, '->', prim.getIndices().getCount() / 3, 'triangles');
}
for (const a of doc.getRoot().listAccessors()) if (!a.listParents().some(p => p.propertyType !== 'Root')) a.dispose(); // replaced data
doc.getRoot().listExtensionsUsed().find(e => e.extensionName === 'KHR_draco_mesh_compression')?.setRequired(true)
  .setEncoderOptions({ method: 1, encodeSpeed: 5, decodeSpeed: 5, quantizationBits: { POSITION: 14, NORMAL: 10, TEX_COORD: 12, COLOR: 10, GENERIC: 12 } });
await io.write(target, doc);
