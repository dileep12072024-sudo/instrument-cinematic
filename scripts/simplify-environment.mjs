// Simplify tree branch and trunk geometry in the packed environment (leaves, textures and wind weights untouched).
// Branches were ~1.2M triangles of finely rounded tubes, the main GPU cost on integrated graphics.
// Usage: node scripts/simplify-environment.mjs [in.glb] [out.glb]
import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { weld, simplifyPrimitive } from '@gltf-transform/functions';
import { MeshoptSimplifier } from 'meshoptimizer';
import draco3d from 'draco3dgltf';

const [input = 'public/media/campus-environment.glb', output = input] = process.argv.slice(2);
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
  'draco3d.decoder': await draco3d.createDecoderModule(), 'draco3d.encoder': await draco3d.createEncoderModule(),
});
await MeshoptSimplifier.ready;
const doc = await io.read(input);
const triangles = prim => (prim.getIndices()?.getCount() ?? prim.getAttribute('POSITION').getCount()) / 3;
const report = {};
for (const mesh of doc.getRoot().listMeshes()) for (const prim of mesh.listPrimitives()) {
  const name = prim.getMaterial()?.getName() || '';
  if (!/branches|trunk/i.test(name)) continue;
  const before = triangles(prim);
  // Error is relative to the mesh extent (~15 m crowns): 0.0008 keeps deviations near 1 cm.
  simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: .3, error: .0008 });
  const key = name.replace(/\.\d+$/, ''); report[key] ||= [0, 0]; report[key][0] += before; report[key][1] += triangles(prim);
}
await doc.transform(weld({ tolerance: 0 })); // drop vertices the simplifier no longer references
const draco = doc.getRoot().listExtensionsUsed().find(e => e.extensionName === 'KHR_draco_mesh_compression');
draco?.setRequired(true).setEncoderOptions({ method: 1, encodeSpeed: 5, decodeSpeed: 5, quantizationBits: { POSITION: 14, NORMAL: 10, TEX_COORD: 12, COLOR: 10, GENERIC: 12 } });
await io.write(output, doc);
for (const [k, [a, b]] of Object.entries(report)) console.log(k.padEnd(34), Math.round(a / 1000) + 'k ->', Math.round(b / 1000) + 'k');
