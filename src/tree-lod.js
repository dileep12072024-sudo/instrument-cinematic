// The trees' geometry work, pure arithmetic with no page or GPU (blender-environment.js; run in tree-worker.js while the
// main thread builds the rest of the campus, or here on the main thread if a worker cannot start): a part placed and
// bent, thinned for the season, and its detail levels.
import * as T from 'three';
import { thinFoliage } from './seasons.js';

export const modelWindReach = height => 1.5 * Math.max(.035, (height / 12) ** 2) + .053;

// Distance detail for leaves: keep a stable share of whole leaf cards (connected triangles) and grow each kept card
// about its own centre, so a far crown keeps its density and outline with a fraction of the triangles. Unused vertices
// are dropped. Returns a new geometry.
export function leafCards(source) { // each leaf card (connected triangles): its root vertex, centre and stable hash
  const index = source.index.array, p = source.attributes.position.array, n = p.length / 3, parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for (let t = 0; t < index.length; t += 3) { const r = find(index[t]); parent[find(index[t + 1])] = r; parent[find(index[t + 2])] = r; }
  const root = new Int32Array(n), centre = new Float64Array(n * 4), hash = new Float32Array(n);
  for (let v = 0; v < n; v++) { const r = root[v] = find(v); centre[r * 4] += p[v * 3]; centre[r * 4 + 1] += p[v * 3 + 1]; centre[r * 4 + 2] += p[v * 3 + 2]; centre[r * 4 + 3]++; }
  for (let v = 0; v < n; v++) if (root[v] === v) { const s = Math.sin(v * 91.3458 + 47.853) * 43758.5453; hash[v] = s - Math.floor(s); } // independent of the seasonal hash
  return { root, centre, hash };
}
export function leafLod(source, keep, grow, cards = leafCards(source)) {
  const index = source.index.array, n = source.attributes.position.count, { root, centre, hash } = cards;
  const remap = new Int32Array(n).fill(-1), used = new Int32Array(n), kept = []; let count = 0;
  for (let t = 0; t < index.length; t += 3) {
    if (hash[root[index[t]]] >= keep) continue;
    for (let k = 0; k < 3; k++) { const v = index[t + k]; if (remap[v] < 0) { remap[v] = count; used[count++] = v; } kept.push(remap[v]); }
  }
  const out = new T.BufferGeometry();
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const size = attribute.itemSize, from = attribute.array, array = new Float32Array(count * size);
    for (let k = 0; k < count; k++) for (let c = 0, v = used[k]; c < size; c++) array[k * size + c] = from[v * size + c];
    out.setAttribute(name, new T.BufferAttribute(array, size));
  }
  const q = out.attributes.position.array;
  for (let k = 0; k < count; k++) { const r = root[used[k]] * 4, w = centre[r + 3]; for (let c = 0; c < 3; c++) { const m = centre[r + c] / w; q[k * 3 + c] = m + (q[k * 3 + c] - m) * grow; } }
  out.setIndex(kept);
  return out;
}

// Distance detail for wood: the bark is modelled with 1-3 cm triangles, far finer than a distant tree shows. Merge
// vertices on a grid of the given cell size (averaging their attributes) and drop the triangles that collapse.
export function woodLod(source, cell) {
  const p = source.attributes.position.array, n = p.length / 3, cells = new Map(), remap = new Int32Array(n), weight = [];
  for (let v = 0; v < n; v++) {
    const key = ((Math.floor(p[v * 3] / cell) + 8192) * 16384 + Math.floor(p[v * 3 + 1] / cell) + 8192) * 16384 + Math.floor(p[v * 3 + 2] / cell) + 8192;
    let id = cells.get(key); if (id === undefined) { id = weight.length; cells.set(key, id); weight.push(0); }
    remap[v] = id; weight[id]++;
  }
  const out = new T.BufferGeometry(), m = weight.length;
  for (const [name, attribute] of Object.entries(source.attributes)) {
    const size = attribute.itemSize, from = attribute.array, array = new Float32Array(m * size);
    for (let v = 0; v < n; v++) { const k = remap[v] * size, w = 1 / weight[remap[v]]; for (let c = 0; c < size; c++) array[k + c] += from[v * size + c] * w; }
    if (name === 'normal') for (let k = 0; k < m * 3; k += 3) { const l = Math.hypot(array[k], array[k + 1], array[k + 2]) || 1; array[k] /= l; array[k + 1] /= l; array[k + 2] /= l; }
    out.setAttribute(name, new T.BufferAttribute(array, size));
  }
  const index = source.index.array, kept = [];
  for (let t = 0; t < index.length; t += 3) { const a = remap[index[t]], b = remap[index[t + 1]], c = remap[index[t + 2]]; if (a !== b && b !== c && a !== c) kept.push(a, b, c); }
  out.setIndex(kept);
  return out;
}

// Trees: one batched draw per material (the per-draw CPU cost on ANGLE/D3D11 limited the frame rate with ~94 separate
// tree meshes), with each tree an instance of it, so trees outside the view are skipped and far trees draw fewer leaves.
// The merged-forest version drew all 3.5 million tree triangles every frame: ~28 ms of 45 on the owner's laptop.
// Each tree's bend scale is baked into its _wind.x weights so one shared material (bend 1) moves every vertex as before.
export const LOD_LEAVES = [[1, 1], [.42, 1.42], [.2, 1.95], [.08, 2.9]]; // [share of leaf cards kept, card growth] by detail level
export const LOD_WOOD = [.06, .16, .3]; // vertex grid (m) for wood at each level beyond the first

// job: { foliage, shed, matrix (16, or null: as it is), bend (or 0: not baked), attributes: { name: [array, itemSize] }, index }
// -> { lods: [{ attributes, index }], sphere: [x, y, z, r], shedCards }
export function buildLods(job) {
  const g = new T.BufferGeometry();
  for (const [name, [array, size]] of Object.entries(job.attributes)) g.setAttribute(name, new T.BufferAttribute(array, size));
  g.setIndex(new T.BufferAttribute(job.index ?? Uint32Array.from({ length: g.attributes.position.count }, (_, i) => i), 1));
  if (job.matrix) g.applyMatrix4(new T.Matrix4().fromArray(job.matrix));
  if (job.bend) { const wind = g.getAttribute('_wind'); for (let i = 0; i < wind.count; i++) wind.setX(i, wind.getX(i) * job.bend); }
  const shedCards = job.foliage && job.shed > 0 ? thinFoliage(g, job.shed) : 0; // seasonal canopy
  g.computeBoundingSphere(); const sphere = [...g.boundingSphere.center.toArray(), g.boundingSphere.radius + modelWindReach(12 * 1.3)];
  const cards = job.foliage && leafCards(g);
  const lods = job.foliage ? LOD_LEAVES.map(([keep, grow]) => keep === 1 ? g : leafLod(g, keep, grow, cards)) : [g, ...LOD_WOOD.map(cell => woodLod(g, cell))];
  return { sphere, shedCards, lods: lods.map(l => ({ index: l.index.array, attributes: Object.fromEntries(Object.entries(l.attributes).map(([n, a]) => [n, [a.array, a.itemSize]])) })) };
}
