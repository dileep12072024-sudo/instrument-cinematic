import * as T from 'three';
import { rasterize } from './puddles.js';
import { footprint, groundSpine } from './footprint.js';
import { westWing } from './west-wing.js';

// Ground regrade (owner's photos, 2026-10-15): the road, the concrete pavings and the building all meet the earth
// flush; there is no swale beside the drive and no step at the road edge. Hard surfaces keep their exported levels;
// the earth between them becomes the smoothest surface that meets every edge (a Laplace solve), so wherever two hard
// edges differ in height the earth slopes gently between them instead of stepping. The far ground at the grid's
// border keeps its exported level. Vegetation and tree beds move with the ground under them.
const GRID = { x0: -46, z0: -16, w: 184, h: 120, cell: .5 }; // x -46..46, z -16..44: building, drive, gate
const GROUND = /^Editable verges and lower courtyard grading/;
const HARD = /^(Entrance concrete apron|Lower side courtyard paving|Entrance driveway with flared junction|Principal Office Road)/;
const FOLLOWERS = /tree|shrub|stems|bloom|understory|grass|edging|canopy|screen|crown/i; // things standing on the earth
const BUILDING_GROUND = -.02; // just below the floor datum: the plinth meets the earth

export function solveGround(ground, hard, inBuilding, { w, h } = GRID, iterations = 600) {
  const n = w * h, H = Float32Array.from(ground), fixed = new Uint8Array(n);
  for (let i = 0; i < n; i++) {
    const x = i % w, y = (i / w) | 0;
    if (!Number.isNaN(hard[i])) { H[i] = hard[i] - .01; fixed[i] = 1; } // earth just under the hard edge: flush
    else if (inBuilding(i)) { const b = inBuilding(i); H[i] = b === 'low' ? westWing.floor - .08 : typeof b === 'number' ? b : BUILDING_GROUND; fixed[i] = 1; } // the west wing floor is three steps lower
    else if (Number.isNaN(H[i]) || !x || !y || x === w - 1 || y === h - 1) fixed[i] = 1; // border and holes keep their level
  }
  // Successive over-relaxation of Laplace's equation over the free (earth) cells.
  const omega = 1.92;
  for (let k = 0; k < iterations; k++) for (let i = 0; i < n; i++) {
    if (fixed[i]) continue;
    let sum = 0, count = 0;
    for (const j of [i - 1, i + 1, i - w, i + w]) if (!Number.isNaN(H[j])) { sum += H[j]; count++; }
    if (count) H[i] += omega * (sum / count - H[i]);
  }
  return H;
}

export function regradeGround(group) {
  group.updateMatrixWorld(true);
  const owner = o => { while (o && !o.userData.source_object) o = o.parent; return o?.userData.source_object || ''; };
  const groundMeshes = [], hardMeshes = [];
  group.traverse(o => { if (!o.isMesh) return; const s = owner(o); if (GROUND.test(s)) groundMeshes.push(o); else if (HARD.test(s)) hardMeshes.push(o); });
  if (!groundMeshes.length) return null;
  const { x0, z0, w, h, cell } = GRID;
  const ground = rasterize(groundMeshes, GRID).heights, hard = rasterize(hardMeshes, GRID).heights;
  // Owner's photos 54-56 (left terrain): from the main road the earth drops fairly steeply for ~2.5 m, then lies as a
  // flat plain about 0.1 below the left slab; in front of the west gate it slopes down to the gate at ground level.
  const roads = rasterize(hardMeshes.filter(m => /^(Entrance driveway|Principal Office Road)/.test(owner(m))), GRID).heights;
  const roadDist = new Float32Array(w * h).fill(Infinity), queue = [];
  for (let i = 0; i < w * h; i++) if (!Number.isNaN(roads[i])) { roadDist[i] = 0; queue.push(i); }
  for (let q = 0; q < queue.length; q++) { const i = queue[q]; for (const j of [i - 1, i + 1, i - w, i + w]) if (j >= 0 && j < w * h && roadDist[j] === Infinity) { roadDist[j] = roadDist[i] + cell; queue.push(j); } }
  const PLAIN = SLABS[1].top - .1;
  const inBuilding = i => {
    const x = x0 + (i % w + .5) * cell, z = z0 + ((i / w | 0) + .5) * cell;
    const part = footprint.find(p => Math.abs(x - p.x) <= p.width / 2 + .05 && Math.abs(z - p.z) <= p.depth / 2 + .05);
    if (!part && Math.abs(x) < 5.2 && z > 6.9 && z < 10.9) return .1; // under the porch: the earth banks down from its edge
    if (!part) { // owner, 2026-10-16: the low-lying left: the earth around the west wing is level with its floor (the gate is
      // at ground level); beyond this ring it rises smoothly to the surrounding ground, no steps or walls
      const west = footprint.find(p => p.type === 'west');
      const out = Math.max(Math.abs(x - west.x) - west.width / 2, Math.abs(z - west.z) - west.depth / 2); // distance outside its walls
      const left = x < -6 && x > -42 && z < 42 && (z > groundSpine.front + .4 || x < west.x - west.width / 2 - .4);
      if (out > 4 && left && roadDist[i] > 2.5) return PLAIN; // the flat left plain; free cells between form the banks and slopes
      if (out <= .4 || out > 1.3) return false; // nearer cells would lift the earth through the low floor just inside
      if (x > west.x + west.width / 2 && z > groundSpine.roomFront) return false; // beside the left slab: free, it slopes from the slab's edge
      return westWing.ground;
    }
    // Under the west wing and the landing at the foot of its steps the earth sits below the lowered floor.
    if (part.type === 'west' || part.type === 'low-corridor' && x < westWing.stepsTop + .3) return 'low';
    // Under the lowered west corridor, away from its walls (the earth outside must not sag toward it).
    return part.type === 'low-corridor' && x < -4.6 && z > groundSpine.roomFront + .4 && z < part.z + part.depth / 2 - .7 ? 'low' : true;
  };
  const solved = solveGround(ground, hard, inBuilding);
  const delta = new Float32Array(w * h);
  for (let i = 0; i < w * h; i++) delta[i] = Number.isNaN(ground[i]) ? 0 : solved[i] - ground[i];
  const at = (x, z) => { // bilinear, zero outside the grid so the far ground is untouched
    const u = (x - x0) / cell - .5, v = (z - z0) / cell - .5, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j;
    const d = (a, b) => a < 0 || b < 0 || a >= w || b >= h ? 0 : delta[b * w + a];
    return (d(i, j) * (1 - fu) + d(i + 1, j) * fu) * (1 - fv) + (d(i, j + 1) * (1 - fu) + d(i + 1, j + 1) * fu) * fv;
  };
  // Move the earth's vertices (keeps the earth/verge layering and sub-cell detail), then whatever stands on it.
  // Under a road or paving the earth stays below the lowest point of its top surface: raised earth showed through as
  // bumps. Top faces only: a slab's underside (0.5 m down) had dug a trench round every slab, kerb and road edge.
  const hardLow = rasterize(hardMeshes, { ...GRID, lowest: true, top: true }).heights;
  const under = (x, z) => { const i = Math.floor((x - x0) / cell), j = Math.floor((z - z0) / cell); let low = Infinity;
    for (let b = j - 1; b <= j + 1; b++) for (let a = i - 1; a <= i + 1; a++) if (a >= 0 && b >= 0 && a < w && b < h && hardLow[b * w + a] < low) low = hardLow[b * w + a];
    return low; };
  const wing = footprint.find(q => q.type === 'west'); // earth inside the lowered west wing, to its walls' outer face, stays under its floor
  const belowWing = (x, z) => Math.abs(x - wing.x) < wing.width / 2 + .17 && Math.abs(z - wing.z) < wing.depth / 2 + .17 || x < westWing.stepsTop + .3 && x > wing.x && Math.abs(z - 2.17) < 1.1 ? westWing.floor - .06
    : x < -3.9 && x > wing.x && z > groundSpine.roomFront - .1 && z < 3.42 ? westWing.corridor - .06 : Infinity; // and under the corridor
  const p = new T.Vector3(), inverse = new T.Matrix4();
  for (const mesh of groundMeshes) {
    const pos = mesh.geometry.attributes.position; inverse.copy(mesh.matrixWorld).invert();
    for (let i = 0; i < pos.count; i++) {
      p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); p.y = Math.min(p.y + at(p.x, p.z), under(p.x, p.z) - .03, belowWing(p.x, p.z)); p.applyMatrix4(inverse); pos.setXYZ(i, p.x, p.y, p.z);
    }
    pos.needsUpdate = true; mesh.geometry.computeVertexNormals(); mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere();
  }
  let moved = 0; const box = new T.Box3(), c = new T.Vector3(), size = new T.Vector3();
  // The earth's own shift at (x, z): what its vertices just received, so anything lying on it can follow exactly.
  const groundAt = (x, z) => { const i = Math.floor((x - x0) / cell), j = Math.floor((z - z0) / cell); return i < 0 || j < 0 || i >= w || j >= h ? NaN : ground[j * w + i]; };
  const shiftAt = (x, z) => { const g = groundAt(x, z); if (Number.isNaN(g)) return at(x, z); return Math.min(g + at(x, z), under(x, z) - .03, belowWing(x, z)) - g; };
  for (const o of group.children) {
    if (!FOLLOWERS.test(o.userData.source_object || '') && !o.userData.tree) continue;
    box.setFromObject(o); box.getCenter(c); box.getSize(size);
    if (!o.userData.tree && Math.max(size.x, size.z) > 3) { // a ground cover spread over the earth (grass): it drapes, vertex by vertex
      // (moved as one piece by its centre's change, the grass floated up to a metre over the lowered left plain: owner, 2026-10-18)
      o.updateMatrixWorld(true);
      o.traverse(mesh => { if (!mesh.isMesh) return; const pos = mesh.geometry.attributes.position; inverse.copy(mesh.matrixWorld).invert();
        for (let i = 0; i < pos.count; i++) { p.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld); p.y += shiftAt(p.x, p.z); p.applyMatrix4(inverse); pos.setXYZ(i, p.x, p.y, p.z); }
        pos.needsUpdate = true; mesh.geometry.computeBoundingBox(); mesh.geometry.computeBoundingSphere(); });
      moved++; continue;
    }
    const d = at(c.x, c.z); if (Math.abs(d) < .002) continue;
    o.position.y += d; o.updateMatrix(); moved++;
  }
  group.updateMatrixWorld(true);
  let max = 0; for (const d of delta) max = Math.max(max, Math.abs(d));
  return group.userData.regrade = { moved, maxChange: +max.toFixed(3) };
}

// Distant ground: starts flush with the modelled ground's edge all round (roads included) and eases down over a few
// hundred metres to the flat far plane, instead of a 2 m drop where the exported terrain ends.
export function groundContinuation(group, material, far = -2.4) {
  const owner = o => { while (o && !o.userData.source_object) o = o.parent; return o?.userData.source_object || ''; };
  const surface = []; group.traverse(o => { if (o.isMesh && (GROUND.test(owner(o)) || HARD.test(owner(o)))) surface.push(o); });
  const cell = 4, w = 150, h = 150, x0 = -w * cell / 2, z0 = -h * cell / 2, n = w * h;
  const top = rasterize(surface, { x0, z0, w, h, cell }).heights;
  const height = new Float32Array(n).fill(NaN), dist = new Float32Array(n).fill(Infinity), queue = new Int32Array(n);
  const around = i => { const x = i % w; return [x ? i - 1 : -1, x < w - 1 ? i + 1 : -1, i - w, i + w].filter(j => j >= 0 && j < n); };
  let head = 0, tail = 0;
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(top[i])) continue;
    if (around(i).some(j => Number.isNaN(top[j]))) { height[i] = top[i] - .06; dist[i] = 0; queue[tail++] = i; } // edge: just under it
    else height[i] = -3.5; // well under the modelled ground, never through it
  }
  while (head < tail) { // nearest edge level and distance for everything outside
    const i = queue[head++];
    for (const j of around(i)) if (Number.isNaN(top[j]) && dist[j] === Infinity) { dist[j] = dist[i] + cell; height[j] = height[i]; queue[tail++] = j; }
  }
  const positions = [], uvs = [], index = [];
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const k = j * w + i, x = x0 + (i + .5) * cell, z = z0 + (j + .5) * cell;
    const y = Number.isNaN(top[k]) ? T.MathUtils.lerp(height[k], far, T.MathUtils.smoothstep(dist[k], 30, 260)) : height[k];
    positions.push(x, Number.isFinite(y) ? y : far, z); uvs.push((x + 1000) / 2000, (1000 - z) / 2000); // same tiling as the far plane
    if (i < w - 1 && j < h - 1) index.push(k, k + w, k + 1, k + 1, k + w, k + w + 1);
  }
  const geometry = new T.BufferGeometry();
  geometry.setAttribute('position', new T.Float32BufferAttribute(positions, 3)); geometry.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(index); geometry.computeVertexNormals();
  const mesh = new T.Mesh(geometry, material); mesh.name = 'Distant ground continuation (near)'; mesh.receiveShadow = true;
  mesh.userData.sourceObject = 'Distant ground continuation';
  return mesh;
}

// Concrete slabs either side of the porch (owner, 2026-10-15): plain rectangles, not L-shapes, from the foot of the screen
// wall (z = 3.25) out to the front edge of the pink entrance tiles (z = 10.73), across to the inner wall of each wing.
// The right slab is level with the pink-tiled porch floor and meets it; the left ground lies lower, so the left slab sits
// lower and stops short of the porch, leaving a strip of earth. The drop on the left is an estimate.
const SLABS = [
  { side: 1, inner: 4, outer: 22, top: .155, depth: .5 }, // 5 mm under the pink tiles it runs beneath: equal heights flickered
  { side: -1, inner: 5.6, outer: 22, top: westWing.ground + .1, depth: .4 }, // on the low-lying left plain, 0.1 above it (photos 54-55)
];
const SLAB_BACK = 3.25, SLAB_FRONT = 10.73;
export function rectangularAprons(group) {
  group.updateMatrixWorld(true);
  const owner = o => { while (o && !o.userData.source_object) o = o.parent; return o?.userData.source_object || ''; };
  const old = []; group.traverse(o => { if (o.isMesh && /^(Entrance concrete apron|Lower side courtyard paving)/.test(owner(o))) old.push(o); });
  if (!old.length) return null;
  // Keep the exported texture scale: metres per texture repeat, from the old apron's UVs.
  const ref = old[0], a = ref.geometry.attributes.position, uv = ref.geometry.attributes.uv, w = new T.Vector3();
  let k = .25;
  if (uv) {
    const xs = [], us = []; for (let i = 0; i < a.count; i += Math.max(1, a.count >> 6)) { w.fromBufferAttribute(a, i).applyMatrix4(ref.matrixWorld); xs.push(w.x); us.push(uv.getX(i)); }
    const span = (v) => Math.max(...v) - Math.min(...v); if (span(xs) > 1 && span(us) > 0) k = span(us) / span(xs);
  }
  const material = ref.material, slabs = new T.Group(); slabs.name = 'Entrance concrete aprons (rectangles)';
  slabs.userData.source_object = 'Entrance concrete apron';
  for (const { side, inner, outer, top, depth } of SLABS) {
    const back = SLAB_BACK, front = SLAB_FRONT, width = outer - inner, length = front - back;
    const g = new T.BoxGeometry(width, depth, length); g.translate(side * (inner + outer) / 2, top - depth / 2, (back + front) / 2);
    const pos = g.attributes.position, uvs = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) uvs.setXY(i, pos.getX(i) * k, (Math.abs(pos.getY(i) - top) < 1e-4 ? pos.getZ(i) : pos.getY(i)) * k);
    const mesh = new T.Mesh(g, material); mesh.name = `${side < 0 ? 'West' : 'East'} concrete apron`; mesh.receiveShadow = true;
    slabs.add(mesh);
  }
  for (const o of old) o.parent.remove(o);
  const root = group.children.find(c => /^(Entrance concrete apron|Lower side courtyard paving)/.test(c.userData.source_object || ''));
  group.add(slabs); group.updateMatrixWorld(true);
  return { removed: old.length, uvScale: +k.toFixed(3), root: !!root };
}
