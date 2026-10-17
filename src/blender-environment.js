import * as T from 'three';
import { groundContinuation } from './regrade.js';
import { campusMonth, shedFraction, thinFoliage } from './seasons.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint } from './footprint.js';
import { terraceCovers, terraceLevels } from './stair-layout.js';

export function environmentObstacles(scene) {
  const tops = { west: terraceLevels.leftWing + 1.6, 'low-corridor': terraceLevels.leftStrip + 1.6, corridor: terraceLevels.rightStrip + 1.6, room: terraceLevels.rightWing + 1.6, tower: 14 };
  const boxes = footprint.map(p => new T.Box3(new T.Vector3(p.x - p.width / 2 - .2, -.3, p.z - p.depth / 2 - .2), new T.Vector3(p.x + p.width / 2 + .2, tops[p.type], p.z + p.depth / 2 + .2)));
  for (const p of terraceCovers) boxes.push(new T.Box3(new T.Vector3(p.x - p.width / 2, terraceLevels.leftStrip, p.z - p.depth / 2), new T.Vector3(p.x + p.width / 2, p.top, p.z + p.depth / 2)));
  for (const t of scene.getObjectByName('Reference terraces and roof stair enclosure')?.userData.tanks || []) boxes.push(new T.Box3(new T.Vector3(t.x - t.radius, t.y, t.z - t.radius), new T.Vector3(t.x + t.radius, t.top, t.z + t.radius)));
  return boxes;
}

export const modelWindReach = height => 1.5 * Math.max(.035, (height / 12) ** 2) + .053;

export function clearModelVegetation(mesh, obstacles, height) {
  const reach = modelWindReach(height);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).expandByVector(new T.Vector3(reach, .03, reach));
  const nearby = obstacles.filter(box => box.intersectsBox(bounds));
  if (!nearby.length) return 0;
  const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
  const world = new Float32Array(position.count * 3), point = new T.Vector3();
  for (let i = 0; i < position.count; i++) point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(world, i * 3);
  const kept = [], count = index ? index.count : position.count;
  const triangle = new T.Box3(), margin = new T.Vector3();
  // Clearance per vertex from its own wind weights (the shader's maximum bend + flutter at full strength),
  // so a trunk that barely moves is never cut because the crown tip of the same tree sways 1.7 m.
  const wind = geometry.getAttribute('_wind'), bend = Math.max(.035, (height / 12) ** 2);
  const vertexReach = v => wind ? 1.5 * (bend * Math.max(0, wind.getX(v)) + .035 * Math.max(0, wind.getY(v))) + .053 : reach;
  for (let i = 0; i < count; i += 3) {
    triangle.makeEmpty();
    let r = 0;
    for (let k = 0; k < 3; k++) { const v = index ? index.getX(i + k) : i + k; triangle.expandByPoint(point.fromArray(world, v * 3)); r = Math.max(r, vertexReach(v)); }
    triangle.expandByVector(margin.set(r, .03, r));
    if (!nearby.some(box => box.intersectsBox(triangle))) for (let k = 0; k < 3; k++) kept.push(index ? index.getX(i + k) : i + k);
  }
  if (kept.length === count) return 0;
  mesh.userData.untrimmedIndex = index ? index.array : Uint32Array.from({ length: count }, (_, i) => i);
  mesh.geometry = geometry.clone();
  mesh.geometry.setIndex(kept);
  mesh.visible = kept.length > 0;
  mesh.userData.trimmedTriangles = (count - kept.length) / 3;
  return mesh.userData.trimmedTriangles;
}

// Trimming at the building cuts branches triangle by triangle, which left cut-off wood and leaves floating. A piece of
// wood (the model builds each branch as its own mesh piece, its base pushed into its parent) stays only if it still
// reaches the trunk through surviving wood as closely as it did before trimming; a leaf card stays only if surviving
// wood is still about as near to it as the nearest wood was before (jacaranda fronds sit up to 0.75 m from a twig).
const near = (cell) => { // spatial hash of points for nearest-neighbour queries within a radius
  const grid = new Map(), key = (a, b, c) => ((a + 8192) * 16384 + b + 8192) * 16384 + c + 8192;
  return {
    add(i, x, y, z) { const k = key(Math.floor(x / cell), Math.floor(y / cell), Math.floor(z / cell)); const l = grid.get(k); if (l) l.push(i); else grid.set(k, [i]); },
    // nearest point within r (by index into pos), or -1; skip(i) excludes points
    find(pos, x, y, z, r, skip) {
      const gx = Math.floor(x / cell), gy = Math.floor(y / cell), gz = Math.floor(z / cell), rings = Math.ceil(r / cell);
      let best = -1, bd = r * r;
      for (let ring = 0; ring <= rings; ring++) {
        if (best >= 0 && (ring - 1) * cell > Math.sqrt(bd)) break; // nothing nearer can lie further out
        for (let a = -ring; a <= ring; a++) for (let b = -ring; b <= ring; b++) for (let c = -ring; c <= ring; c++) {
          if (Math.max(Math.abs(a), Math.abs(b), Math.abs(c)) !== ring) continue;
          const l = grid.get(key(gx + a, gy + b, gz + c)); if (!l) continue;
          for (const i of l) { if (skip?.(i)) continue; const d = (pos[i * 3] - x) ** 2 + (pos[i * 3 + 1] - y) ** 2 + (pos[i * 3 + 2] - z) ** 2; if (d < bd) { bd = d; best = i; } }
        }
      }
      return best;
    },
  };
};
export function pruneDetached(tree) {
  const meshes = []; tree.traverse(o => { if (o.isMesh && o.userData.windHeight !== undefined) meshes.push(o); });
  if (!meshes.some(m => m.userData.untrimmedIndex)) return 0;
  const wood = meshes.filter(m => !m.material.userData.foliage), leaves = meshes.filter(m => m.material.userData.foliage);
  const p = new T.Vector3(), weld = new Map(), ids = [], pos = [];
  const triangles = m => m.userData.untrimmedIndex || m.geometry.index?.array || Uint32Array.from({ length: m.geometry.attributes.position.count }, (_, i) => i);
  for (const m of wood) { // weld coincident vertices across trunk and branch meshes
    const a = m.geometry.attributes.position, local = new Int32Array(a.count);
    for (let i = 0; i < a.count; i++) {
      p.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld);
      const key = ((Math.round(p.x * 400) + 50000) * 100000 + Math.round(p.y * 400) + 50000) * 100000 + Math.round(p.z * 400) + 50000; // 2.5 mm weld
      let id = weld.get(key); if (id === undefined) { id = pos.length / 3; weld.set(key, id); pos.push(p.x, p.y, p.z); }
      local[i] = id;
    }
    ids.push(local);
  }
  const n = pos.length / 3, unionFind = () => { const parent = Int32Array.from({ length: n }, (_, i) => i); const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }; return { find, join: (a, b) => { parent[find(a)] = find(b); } }; };
  const before = unionFind(), after = unionFind(), alive = new Uint8Array(n);
  wood.forEach((m, k) => {
    const t = triangles(m), now = m.geometry.index.array, id = ids[k];
    for (let i = 0; i < t.length; i += 3) { before.join(id[t[i]], id[t[i + 1]]); before.join(id[t[i]], id[t[i + 2]]); }
    for (let i = 0; i < now.length; i += 3) { after.join(id[now[i]], id[now[i + 1]]); after.join(id[now[i]], id[now[i + 2]]); alive[id[now[i]]] = alive[id[now[i + 1]]] = alive[id[now[i + 2]]] = 1; }
  });
  // Each original piece is rooted at its vertex nearest the trunk's axis (the lowest wood point).
  let low = 0; for (let i = 1; i < n; i++) if (pos[i * 3 + 1] < pos[low * 3 + 1]) low = i;
  const ax = pos[low * 3], az = pos[low * 3 + 2], rootOf = new Map(), comp = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    const c = comp[i] = before.find(i), d = (pos[i * 3] - ax) ** 2 + (pos[i * 3 + 2] - az) ** 2 + .01 * pos[i * 3 + 1] ** 2;
    if (!rootOf.has(c) || d < rootOf.get(c)[1]) rootOf.set(c, [i, d]);
  }
  const all = near(.1); for (let i = 0; i < n; i++) all.add(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  // How closely each piece's root met other wood before trimming (the model's pieces meet within 0.25 m): that gap
  // is allowed after trimming, with slack.
  const trunk = comp[low], gap = new Map();
  for (const [c, [r]] of rootOf) if (c !== trunk) { const b = all.find(pos, pos[r * 3], pos[r * 3 + 1], pos[r * 3 + 2], .3, i => comp[i] === c); gap.set(c, b < 0 ? Infinity : Math.hypot(pos[b * 3] - pos[r * 3], pos[b * 3 + 1] - pos[r * 3 + 1], pos[b * 3 + 2] - pos[r * 3 + 2])); }
  // Grow from the trunk: a piece joins once its root is within its allowed gap of joined wood. piece(i) names what a
  // vertex belongs to; usable(i) says whether it is there in this pass.
  const reach = (piece, usable) => {
    const joined = new Set([piece(rootOf.get(trunk)[0])]), grid = near(.1), members = new Map();
    for (let i = 0; i < n; i++) if (usable(i)) { const k = piece(i); if (!members.has(k)) members.set(k, []); members.get(k).push(i); }
    const join = k => { joined.add(k); for (const i of members.get(k) || []) grid.add(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]); };
    join(piece(rootOf.get(trunk)[0]));
    for (let grew = true; grew;) {
      grew = false;
      for (const [c, [r]] of rootOf) {
        if (!usable(r) || joined.has(piece(r)) || !Number.isFinite(gap.get(c))) continue;
        const g = gap.get(c), allow = Math.min(.35, Math.max(g * 1.5, g + .05));
        if (grid.find(pos, pos[r * 3], pos[r * 3 + 1], pos[r * 3 + 2], allow) >= 0) { join(piece(r)); grew = true; }
      }
    }
    return joined;
  };
  if (!alive[rootOf.get(trunk)[0]]) return 0; // the trunk itself was cut: leave the tree as trimmed
  const original = reach(i => comp[i], () => true), now = reach(i => after.find(i), i => alive[i]);
  // Keep a surviving piece if it reaches the trunk now, or if it never did by this test (embedded deeper in the model).
  const keep = new Set();
  for (const [c, [r]] of rootOf) if (alive[r] && (now.has(after.find(r)) || !original.has(c))) keep.add(after.find(r));
  const survives = new Uint8Array(n); let dropped = 0;
  wood.forEach((m, k) => {
    const idx = m.geometry.index.array, id = ids[k], kept = [];
    for (let i = 0; i < idx.length; i += 3) if (keep.has(after.find(id[idx[i]]))) { kept.push(idx[i], idx[i + 1], idx[i + 2]); survives[id[idx[i]]] = survives[id[idx[i + 1]]] = survives[id[idx[i + 2]]] = 1; }
    dropped += (idx.length - kept.length) / 3; m.geometry.setIndex(kept); m.visible = kept.length > 0;
  });
  const kept = near(.1); for (let i = 0; i < n; i++) if (survives[i]) kept.add(i, pos[i * 3], pos[i * 3 + 1], pos[i * 3 + 2]);
  // Only a leaf with removed wood within reach can have lost its support: mark 0.5 m cells holding removed wood.
  const lost = new Set(), risky = new Set(), cell = k => Math.floor(k / .5) + 4096, key = (a, b, c) => (a * 8192 + b) * 8192 + c;
  for (let i = 0; i < n; i++) if (!survives[i]) lost.add(key(cell(pos[i * 3]), cell(pos[i * 3 + 1]), cell(pos[i * 3 + 2])));
  for (const k of lost) { const a = Math.floor(k / 8192 / 8192), b = Math.floor(k / 8192) % 8192, c = k % 8192; for (let i = -3; i <= 3; i++) for (let j = -3; j <= 3; j++) for (let l = -3; l <= 3; l++) risky.add(key(a + i, b + j, c + l)); }
  const nearLost = (x, y, z) => risky.has(key(cell(x), cell(y), cell(z)));
  for (const m of leaves) {
    const a = m.geometry.attributes.position, idx = m.geometry.index ? m.geometry.index.array : Uint32Array.from({ length: a.count }, (_, i) => i);
    const world = new Float32Array(a.count * 3); for (let i = 0; i < a.count; i++) p.fromBufferAttribute(a, i).applyMatrix4(m.matrixWorld).toArray(world, i * 3);
    const card = Int32Array.from({ length: a.count }, (_, i) => i), find = i => { while (card[i] !== i) i = card[i] = card[card[i]]; return i; };
    for (let t = 0; t < idx.length; t += 3) { const r = find(idx[t]); card[find(idx[t + 1])] = r; card[find(idx[t + 2])] = r; }
    const centre = new Map(); for (let t = 0; t < idx.length; t++) { const r = find(idx[t]), e = centre.get(r) || centre.set(r, [0, 0, 0, 0]).get(r); e[0] += world[idx[t] * 3]; e[1] += world[idx[t] * 3 + 1]; e[2] += world[idx[t] * 3 + 2]; e[3]++; }
    const ok = new Map();
    for (const [r, [x, y, z, c]] of centre) {
      const cx = x / c, cy = y / c, cz = z / c;
      if (!nearLost(cx, cy, cz)) { ok.set(r, true); continue; }
      const b0 = all.find(pos, cx, cy, cz, 1.2);
      if (b0 < 0 || survives[b0]) { ok.set(r, true); continue; } // nearest wood still there (or none nearby to begin with)
      const d0 = Math.hypot(pos[b0 * 3] - cx, pos[b0 * 3 + 1] - cy, pos[b0 * 3 + 2] - cz);
      ok.set(r, kept.find(pos, cx, cy, cz, Math.max(d0 * 1.5, d0 + .12)) >= 0);
    }
    const out = []; for (let t = 0; t < idx.length; t += 3) if (ok.get(find(idx[t]))) out.push(idx[t], idx[t + 1], idx[t + 2]);
    if (out.length === idx.length) continue;
    if (!m.userData.untrimmedIndex) m.geometry = m.geometry.clone(); // clones of a tree share geometry
    dropped += (idx.length - out.length) / 3; m.geometry.setIndex(out); m.visible = out.length > 0;
  }
  return dropped;
}

export function applyModelWind(material, state, height) {
  material.customProgramCacheKey = () => 'blender-vegetation-wind-1';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uWind: state.wind, uWindStrength: state.windStrength, uWindDirection: state.windDirection, uBendScale: { value: Math.max(.035, (height / 12) ** 2) } });
    shader.vertexShader = 'attribute vec3 _wind; uniform float uWind; uniform float uWindStrength; uniform vec2 uWindDirection; uniform float uBendScale;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 windWorld = modelMatrix * vec4(transformed, 1.0);
      float phase = windWorld.x * .12 + windWorld.z * .09;
      float wave = .60 + .28 * sin(uWind * .72 + phase) + .12 * sin(uWind * 1.63 + phase * 2.3 + windWorld.y * .14);
      float flutter = (.65 * sin(uWind * 5.1 + _wind.z * 6.283 + phase) + .35 * sin(uWind * 8.3 + _wind.z * 10.68)) * _wind.y * .035 * uWindStrength;
      windWorld.xz += uWindDirection * (uWindStrength * uBendScale * _wind.x * wave + flutter);
      windWorld.y += flutter * .4;
      vec4 mvPosition = viewMatrix * windWorld;
      gl_Position = projectionMatrix * mvPosition;
    `);
  };
}

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
const LOD_LEAVES = [[1, 1], [.42, 1.42], [.2, 1.95], [.08, 2.9]]; // [share of leaf cards kept, card growth] by detail level
const LOD_WOOD = [.06, .16, .3]; // vertex grid (m) for wood at each level beyond the first
const LOD_STEPS = [15, 32, 60], LOD_SLACK = 3; // metres from the camera where each level starts; slack stops a tree flipping at a boundary
export function batchTrees(state) {
  const batches = new Map(), matrix = new T.Matrix4();
  for (const node of state.vegetation) {
    let owner = node; while (owner && !owner.userData.tree) owner = owner.parent;
    if (!owner || !node.visible) continue;
    const key = node.material.userData.source_material || node.material.name;
    if (!batches.has(key)) batches.set(key, { trees: new Map(), material: node.material, count: 0 });
    const batch = batches.get(key); batch.count++;
    if (!batch.trees.has(owner)) batch.trees.set(owner, []);
    batch.trees.get(owner).push(node);
  }
  const batched = [], instances = new Map(); // tree -> { centre, lod, slots: [[mesh, instanceId, geometryIds]] }
  for (const [key, { trees, material, count }] of batches) {
    // Leaves and bark are matte (roughness ~0.9): diffuse (Lambert) shading looks the same as the PBR clone and costs
    // ~7 ms (leaves) and ~4 ms (wood) less per frame on the owner's integrated GPU.
    const shared = new T.MeshLambertMaterial({ name: material.name, map: material.map, normalMap: material.normalMap, normalScale: material.normalScale, alphaTest: material.alphaTest, side: material.side, color: material.color });
    shared.userData = { ...material.userData };
    applyModelWind(shared, state, 12); // bend scale 1: baked per vertex below
    const depth = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: shared.map, alphaTest: shared.alphaTest, side: shared.side });
    applyModelWind(depth, state, 12);
    const shed = shedFraction(key, state.month ?? campusMonth()), perTree = [];
    for (const [tree, nodes] of trees) {
      const parts = nodes.map(node => {
        const g = node.geometry.clone();
        g.applyMatrix4(matrix.copy(node.matrixWorld));
        const wind = g.getAttribute('_wind'), bend = Math.max(.035, (node.userData.windHeight / 12) ** 2);
        for (let i = 0; i < wind.count; i++) wind.setX(i, wind.getX(i) * bend);
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv', '_wind'].includes(name)) g.deleteAttribute(name);
        if (!g.index) g.setIndex([...Array(g.attributes.position.count).keys()]);
        return g;
      });
      const full = parts.length > 1 ? mergeGeometries(parts, false) : parts[0];
      if (material.userData.foliage && shed > 0) state.shedCards = (state.shedCards || 0) + thinFoliage(full, shed); // seasonal canopy
      full.computeBoundingSphere(); full.boundingSphere.radius += modelWindReach(12 * 1.3);
      const cards = material.userData.foliage && leafCards(full);
      const lods = material.userData.foliage ? LOD_LEAVES.map(([keep, grow]) => keep === 1 ? full : leafLod(full, keep, grow, cards)) : [full, ...LOD_WOOD.map(cell => woodLod(full, cell))];
      for (const g of lods) g.boundingSphere = full.boundingSphere.clone(); // the same culling sphere at every level
      perTree.push([tree, lods]);
      for (const node of nodes) { node.removeFromParent(); node.geometry.dispose(); }
    }
    const all = perTree.flatMap(([, lods]) => lods);
    const mesh = new T.BatchedMesh(perTree.length, all.reduce((n, g) => n + g.attributes.position.count, 0), all.reduce((n, g) => n + g.index.count, 0), shared);
    for (const [tree, lods] of perTree) {
      const ids = lods.map(g => mesh.addGeometry(g)), id = mesh.addInstance(ids[0]);
      if (!instances.has(tree)) { const c = new T.Vector3(); new T.Box3().setFromObject(tree).getCenter(c); instances.set(tree, { centre: c, lod: 0, slots: [] }); }
      instances.get(tree).slots.push([mesh, id, ids]);
    }
    all.forEach(g => g.dispose());
    if (material.userData.foliage && shed > 0) shared.color.lerp(new T.Color('#c8b26a'), Math.min(.45, shed * .7)); // a little yellower while shedding
    Object.assign(mesh, { name: `Batched trees: ${key}`, castShadow: true, receiveShadow: true, customDepthMaterial: depth });
    mesh.userData = { batchedTrees: count, windHeight: 12, sourceObject: key };
    mesh.computeBoundingSphere();
    state.group.add(mesh); batched.push(mesh);
  }
  const trees = [...instances.values()], last = new T.Vector3(Infinity, 0, 0);
  state.treeDetail = trees; // per tree: centre, detail level, [batched mesh, instance, geometry per level]
  // Called before each render: pick each tree's detail level from its distance to the camera (cheap: a few dozen trees).
  state.updateTreeDetail = camera => {
    if (camera.position.distanceToSquared(last) < .25) return false;
    last.copy(camera.position); let changed = false;
    for (const tree of trees) {
      const d = tree.centre.distanceTo(camera.position), lod = tree.lod;
      let next = 0; LOD_STEPS.forEach((start, k) => { if (d > start + (lod > k ? -LOD_SLACK : LOD_SLACK)) next = k + 1; });
      if (next === lod) continue;
      tree.lod = next; changed = true;
      for (const [mesh, id, ids] of tree.slots) mesh.setGeometryIdAt(id, ids[Math.min(next, ids.length - 1)]);
    }
    return changed;
  };
  state.vegetation = state.vegetation.filter(node => node.parent).concat(batched);
  state.materials.push(...batched.map(m => m.material));
  return batched.length;
}

// Begins downloading the ~20 MB environment as soon as the page script runs, reporting 0..1 progress.
export function prefetchEnvironment(onProgress) {
  return fetch('/media/campus-environment.glb').then(async response => {
    if (!response.ok || !response.body) throw new Error(`Environment download failed: ${response.status}`);
    const total = +response.headers.get('content-length') || 0, reader = response.body.getReader(), parts = [];
    let loaded = 0;
    for (;;) { const { done, value } = await reader.read(); if (done) break; parts.push(value); loaded += value.length; if (total) onProgress?.(loaded / total); }
    const bytes = new Uint8Array(loaded); let offset = 0;
    for (const part of parts) { bytes.set(part, offset); offset += part.length; }
    return bytes.buffer;
  });
}

export async function loadBlenderEnvironment(scene, adjust, download = prefetchEnvironment()) {
  const draco = new DRACOLoader().setDecoderPath('/media/draco/').setWorkerLimit(2);
  let gltf;
  const bytes = await download; performance.mark('env-downloaded');
  try { gltf = await new GLTFLoader().setDRACOLoader(draco).parseAsync(bytes, '/media/'); }
  finally { draco.dispose(); }
  const group = gltf.scene;
  group.name = 'Blender campus environment';
  const state = { group, wind: { value: 0 }, windStrength: { value: 0 }, windDirection: { value: new T.Vector2(0, 1) }, vegetation: [], trees: [], materials: [], trimmedTriangles: 0 };
  performance.mark('env-parsed');
  adjust?.(group);
  performance.mark('env-trees-placed');
  group.updateMatrixWorld(true);
  const obstacles = environmentObstacles(scene);
  group.traverse(node => {
    if (node.userData.tree) state.trees.push(node);
    if (!node.isMesh) return;
    let owner = node;
    while (!owner.userData.source_object && owner.parent) owner = owner.parent;
    node.userData.sourceObject = owner.userData.source_object;
    node.material = node.material.clone();
    const material = node.material;
    material.vertexColors = false;
    for (const texture of [material.map, material.normalMap, material.roughnessMap]) if (texture) texture.anisotropy = 4;
    node.receiveShadow = true;
    const name = material.userData.source_material || material.name;
    if (/Exposed red earth/.test(name)) state.soilMaterial = material;
    if (/Planted verge ground/.test(name)) { state.groundMaterial = material; material.color.set('#a4ad83'); }
    if (/Weathered concrete apron/.test(name)) state.pavingMaterial = material;
    state.materials.push(material);
    if (!owner.userData.vegetation) return;
    if (!node.geometry.getAttribute('_wind')) throw new Error(`Missing Blender wind weights: ${node.name}`);
    const height = owner.userData.wind_height;
    node.userData.windHeight = height;
    state.trimmedTriangles += clearModelVegetation(node, obstacles, height);
    if (material.userData.foliage) {
      material.transparent = false; material.alphaTest = .45; material.depthWrite = true; // alpha-to-coverage dithers into noise on ANGLE/D3D11
      material.side = T.DoubleSide;
      // Specular sparkle: tiny leaves with a roughness map and full-strength normal map alias into crawling
      // white glints at a distance. Leaves are matte; keep a gentle normal for close-up relief.
      material.roughnessMap = null; material.roughness = .92;
      if (material.normalMap) material.normalScale.setScalar(.45);
      material.envMapIntensity = .75;
    }
    applyModelWind(material, state, height);
    node.castShadow = true;
    node.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: material.map, alphaTest: material.alphaTest, side: material.side });
    applyModelWind(node.customDepthMaterial, state, height);
    node.geometry.computeBoundingSphere();
    node.geometry.boundingSphere.radius += modelWindReach(height) / Math.max(.01, node.getWorldScale(new T.Vector3()).length() / Math.sqrt(3));
    state.vegetation.push(node);
  });
  for (const tree of state.trees) state.trimmedTriangles += pruneDetached(tree);
  performance.mark('env-trimmed');
  state.batchTrees = () => batchTrees(state); // called by main.js once the impostor belt has been captured
  if (state.trees.length < 23 || !state.groundMaterial || !state.soilMaterial || !state.pavingMaterial) throw new Error('Incomplete Blender environment export');
  // Distant continuation sits below the authored terrain, never over the roads; vegetated, as in the site videos.
  const horizon = new T.Mesh(new T.PlaneGeometry(2000, 2000), state.groundMaterial.clone());
  for (const slot of ['map', 'normalMap', 'roughnessMap']) if (horizon.material[slot]) {
    horizon.material[slot] = horizon.material[slot].clone();
    horizon.material[slot].wrapS = horizon.material[slot].wrapT = T.RepeatWrapping;
    horizon.material[slot].repeat.set(800, 800);
  }
  // Far ground is fogged and seen edge-on: its normal and roughness maps showed nothing and cost ~2 ms a frame.
  horizon.material.normalMap = horizon.material.roughnessMap = null;
  horizon.rotation.x = -Math.PI / 2; horizon.position.y = -2.2; horizon.name = 'Distant ground continuation';
  horizon.userData.sourceObject = 'Distant ground continuation';
  // Near the campus the far plane is replaced by ground that starts flush with the modelled edge (regrade.js).
  group.add(horizon, groundContinuation(group, horizon.material));
  scene.add(group);
  return state;
}
