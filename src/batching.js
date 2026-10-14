import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Static detail groups (window sashes, grille leaves, condensers) were built from dozens of tiny meshes: ~400 draw
// calls a frame, the main CPU cost on weak laptops. Merge each group's meshes per material, in place, so the group
// node, its name, transform and bounds stay exactly as before; only the draw calls disappear.
export function mergeStatic(root) {
  root.updateMatrixWorld(true);
  const toRoot = root.matrixWorld.clone().invert(), batches = new Map(), parts = [];
  root.traverse(o => {
    if (o === root || !o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material)) return;
    const g = (o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone()).applyMatrix4(toRoot.clone().multiply(o.matrixWorld));
    for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
    if (!g.attributes.uv) g.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    const b = batches.get(o.material) || { geometries: [], cast: false, receive: false, layers: o.layers.mask };
    b.geometries.push(g); b.cast ||= o.castShadow; b.receive ||= o.receiveShadow; batches.set(o.material, b);
    parts.push(o);
  });
  if (parts.length < 2) return 0;
  for (const o of parts) o.removeFromParent();
  for (const [material, b] of batches) {
    const mesh = new T.Mesh(mergeGeometries(b.geometries), material);
    mesh.castShadow = b.cast; mesh.receiveShadow = b.receive; mesh.layers.mask = b.layers; mesh.name = `${root.name} (merged)`;
    root.add(mesh); b.geometries.forEach(g => g.dispose());
  }
  return parts.length - batches.size;
}

export const staticDetailGroups = ['Rear window with casement shutters and grille', 'Left under-stair gate', 'Right under-stair gate', 'Terrace-facing open grille leaf', 'Terrace condenser', 'Open classroom entrance leaf'];

export function mergeStaticDetail(scene) {
  const roots = []; scene.traverse(o => { if (staticDetailGroups.includes(o.name)) roots.push(o); });
  return roots.reduce((saved, root) => saved + mergeStatic(root), 0);
}

// The Blender gate leaves arrive as ~50 separate pickets, rails and hinges: gather them under one node and merge.
export function mergeGateParts(group) {
  const parts = group.children.filter(o => /^(West|East) (open gate|gate) (upright|rail|picket|brace|hinge strap|pier coping)/.test(o.userData.source_object || o.name));
  if (!parts.length) return 0;
  const gates = new T.Group(); gates.name = 'Entrance gate leaves (merged)'; group.add(gates);
  for (const p of parts) gates.attach(p);
  return mergeStatic(gates);
}
