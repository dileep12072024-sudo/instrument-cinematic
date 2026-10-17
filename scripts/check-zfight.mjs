import * as T from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { resolveCoplanar } from '../src/batching.js';

// Flicker guard: two front faces on the same plane (within a few mm) that overlap and differ in material make the GPU
// alternate between them ("z-fighting"). Scans every axis-aligned face of the building. Node-only, no browser.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = { createElement: () => ({ getContext: () => context }), createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }) };
const scene = new T.Scene(); const { group } = buildArchitecture(scene); scene.updateMatrixWorld(true);
if (!process.argv.includes('--raw')) resolveCoplanar(group); // as the site does
const TOL = .006, groups = new Map(), a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3(), n = new T.Vector3();
group.traverse(o => {
  if (!o.isMesh || !o.visible || o.isInstancedMesh || o.material.transparent && o.material.opacity < .5) return;
  const pos = o.geometry.attributes.position, idx = o.geometry.index, count = idx ? idx.count : pos.count;
  for (let i = 0; i < count; i += 3) {
    const v = k => idx ? idx.getX(i + k) : i + k;
    a.fromBufferAttribute(pos, v(0)).applyMatrix4(o.matrixWorld); b.fromBufferAttribute(pos, v(1)).applyMatrix4(o.matrixWorld); c.fromBufferAttribute(pos, v(2)).applyMatrix4(o.matrixWorld);
    n.subVectors(b, a).cross(c.clone().sub(a)); const area = n.length() / 2; if (area < 1e-5) continue; n.normalize();
    const axis = [0, 1, 2].find(k => Math.abs(n.getComponent(k)) > .9995); if (axis === undefined) continue;
    const d = a.getComponent(axis), u = (axis + 1) % 3, w = (axis + 2) % 3;
    const box = [Math.min(a.getComponent(u), b.getComponent(u), c.getComponent(u)), Math.max(a.getComponent(u), b.getComponent(u), c.getComponent(u)), Math.min(a.getComponent(w), b.getComponent(w), c.getComponent(w)), Math.max(a.getComponent(w), b.getComponent(w), c.getComponent(w))];
    const key = `${axis}${Math.sign(n.getComponent(axis))}:${Math.round(d / TOL)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ d, box, area, tri: [a.clone(), b.clone(), c.clone()], u, w, offset: o.material.polygonOffset ? o.material.polygonOffsetUnits : 0, mat: o.material.name || `#${o.material.color?.getHexString()}`, colour: o.material.color?.getHexString(), sign: Math.sign(n.getComponent(axis)) });
  }
});
const findings = new Map(), solid = []; group.traverse(o => { if (o.isMesh && o.visible) solid.push(o); });
const ray = new T.Raycaster(), inside = (t, u, w, pu, pw) => { // 2D point-in-triangle on the plane's axes
  const [p0, p1, p2] = t.map(v => [v.getComponent(u), v.getComponent(w)]);
  const s1 = (p1[0] - p0[0]) * (pw - p0[1]) - (p1[1] - p0[1]) * (pu - p0[0]), s2 = (p2[0] - p1[0]) * (pw - p1[1]) - (p2[1] - p1[1]) * (pu - p1[0]), s3 = (p0[0] - p2[0]) * (pw - p2[1]) - (p0[1] - p2[1]) * (pu - p2[0]);
  return (s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0);
};
const STEP = .05;
for (const key of groups.keys()) {
  const [head, bucket] = key.split(':'), list = [...groups.get(key), ...(groups.get(`${head}:${+bucket + 1}`) || [])];
  if (list.length < 2) continue;
  const axis = +head[0], sign = head.slice(1) === '-1' ? -1 : 1;
  list.sort((p, q) => p.box[0] - q.box[0]);
  for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length && list[j].box[0] < list[i].box[1]; j++) {
    const p = list[i], q = list[j];
    if (Math.abs(p.d - q.d) > TOL || p.colour === q.colour && p.mat === q.mat || p.offset !== q.offset) continue; // distinct priorities resolve it
    const u0 = Math.max(p.box[0], q.box[0]), u1 = Math.min(p.box[1], q.box[1]), w0 = Math.max(p.box[2], q.box[2]), w1 = Math.min(p.box[3], q.box[3]);
    if (u1 - u0 <= .02 || w1 - w0 <= .02) continue;
    const id = `${['x', 'y', 'z'][axis]}${sign > 0 ? '+' : '-'}  ${[p.mat, q.mat].sort().join('  /  ')}`;
    const f = findings.get(id) || { cells: new Set(), exposed: new Set(), at: null };
    for (let pu = Math.ceil(u0 / STEP) * STEP; pu < u1; pu += STEP) for (let pw = Math.ceil(w0 / STEP) * STEP; pw < w1; pw += STEP) {
      if (!inside(p.tri, p.u, p.w, pu, pw) || !inside(q.tri, q.u, q.w, pu, pw)) continue;
      const cell = `${p.d.toFixed(2)}|${pu.toFixed(2)}|${pw.toFixed(2)}`; if (f.cells.has(cell)) continue; f.cells.add(cell);
      if (f.exposed.size > 400) continue;
      const origin = new T.Vector3(); origin.setComponent(axis, p.d + sign * .02); origin.setComponent(p.u, pu); origin.setComponent(p.w, pw);
      const dir = new T.Vector3(); dir.setComponent(axis, sign); ray.set(origin, dir); ray.far = .6;
      if (!ray.intersectObjects(solid, false).length) { f.exposed.add(cell); f.at ||= `${['x', 'y', 'z'][axis]}=${p.d.toFixed(3)} ${['x', 'y', 'z'][p.u]}=${pu.toFixed(2)} ${['x', 'y', 'z'][p.w]}=${pw.toFixed(2)}`; }
    }
    findings.set(id, f);
  }
}
for (const [id, f] of findings) { f.area = f.exposed.size * STEP * STEP; if (!f.area) findings.delete(id); }
const list = [...findings].sort((p, q) => q[1].area - p[1].area);
for (const [id, f] of list) console.log(`${f.area.toFixed(2).padStart(7)} m² exposed (of ${(f.cells.size * STEP * STEP).toFixed(2)})  ${id}\n          e.g. ${f.at}`);
if (process.argv.includes('--strict') && list.length) { console.error(`FAIL ${list.length} coplanar overlaps`); process.exit(1); }
console.log(list.length ? `${list.length} exposed coplanar overlaps` : 'PASS no exposed coplanar overlapping faces between different materials');
