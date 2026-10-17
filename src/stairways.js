import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stairs, stairFlights } from './stair-layout.js';
import { casementCluster } from './openable.js';
import { patternedGlass } from './props.js';

export function buildStairways(parent, m) {
  const group = new T.Group(); group.name = 'Connected stairways: ground to roof'; parent.add(group);
  const batches = new Map();
  const add = (g, material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(g.index ? g.toNonIndexed() : g); };
  const box = (x, y, z, w, h, d, material) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material); };
  function flight(x, width, start, end, bottom, top, count, material) {
    const run = (end - start) / count, rise = (top - bottom) / count;
    // A stepped slab, not blocks down to ground: there is usable space below it.
    const shape = new T.Shape(); shape.moveTo(start, bottom - .18);
    shape.lineTo(start, bottom);
    for (let i = 0; i < count; i++) {
      shape.lineTo(start + i * run, bottom + (i + 1) * rise);
      shape.lineTo(start + (i + 1) * run, bottom + (i + 1) * rise);
      box(x, bottom + (i + 1) * rise + .007, start + i * run + Math.sign(run) * .018, width, .014, .036, m.trim);
    }
    shape.lineTo(end, top - .2); shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: width, bevelEnabled: false });
    g.rotateY(-Math.PI / 2); g.translate(x + width / 2, 0, 0); add(g, material);
    const soffit = new T.BoxGeometry(width, .04, Math.hypot(end - start, top - bottom - .02));
    soffit.rotateX(-Math.atan((top - bottom - .02) / (end - start)));
    soffit.translate(x, (bottom + top) / 2 - .21, (start + end) / 2); add(soffit, m.wall);
  }
  function parapet(x, start, end, bottom, top, solid = false) {
    const shape = new T.Shape(); shape.moveTo(start, bottom - .14); shape.lineTo(start, bottom + .93);
    shape.lineTo(end, top + .93); shape.lineTo(end, solid ? bottom - .14 : top - .14); shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: .24, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x + .12, 0, 0); add(g, m.wall);
  }
  stairFlights.forEach((f, level) => {
    const material = level === 2 ? m.roof : m.tread;
    for (const side of f.sides) {
      flight(side * 2.67, 2.02, f.start ?? stairs.front, stairs.rear, f.base, f.half, f.sideSteps, material);
      parapet(side * 1.55, f.start ?? stairs.front, stairs.rear, f.base, f.half, level === 0);
    }
    box(0, f.half - .1, stairs.landingZ, 7.55, .2, 2.1, material);
    box(0, f.half - .22, stairs.landingZ, 7.55, .04, 2.1, m.wall);
    flight(0, 2.9, stairs.rear, stairs.returnEnd, f.half, f.top, f.returnSteps, material);
    for (const side of [-1, 1]) parapet(side * 1.53, stairs.rear, stairs.returnEnd, f.half, f.top);
  });
  // The twin flights stop here; only the gate-side flight continues upward.
  box(2.60, stairs.second + .48, -.72, 2.38, .96, .16, m.wall);
  // Recess gates have a real under-landing cavity extending to both outer walls.
  const gates = new T.Group(); gates.name = 'Closed under-stair corner gates'; group.add(gates);
  const gatePaint = new T.MeshStandardMaterial({ name: 'Blue painted recess ironwork', color: '#426d91', metalness: .38, roughness: .58 });
  for (const side of [-1, 1]) {
    const gate = new T.Group(); gate.name = side < 0 ? 'Left under-stair gate' : 'Right under-stair gate';
    gate.position.set(side * 1.52, stairs.ground, -5.05); gate.userData.clearDepth = 2.1; gates.add(gate);
    const bar = (y, z, h, d, thickness = .026) => { const mesh = new T.Mesh(new T.BoxGeometry(thickness, h, d), gatePaint); mesh.position.set(0, y, z); gate.add(mesh); };
    for (const z of [-.49, .49]) bar(1.05, z, 2.1, .045, .045);
    for (const y of [.025, 1.02, 2.08]) bar(y, 0, .045, 1.02);
    for (let j = -4; j <= 4; j++) bar(1.05, j * .105, 2.05, .015);
    bar(.98, 0, .055, .25, .045);
    for (const z of [-.535, .535]) bar(1.06, z, 2.18, .055, .09);
    bar(2.145, 0, .06, 1.12, .09);
    box(side * 1.55, 2.364, -5.05, .20, .24, 2.1, m.wall);
    for (const z of [-5.87, -4.23]) box(side * 1.55, 1.204, z, .20, 2.08, .46, m.wall);
    for (const y of [.48, 1.87]) {
      const hinge = new T.Mesh(new T.CylinderGeometry(.025, .025, .12, 12), gatePaint); hinge.position.set(0, y, -.49); gate.add(hinge);
    }
    box(side * 2.65, stairs.ground + .006, -5.05, 2.08, .012, 1.32, m.tread);
  }
  // Rear windows are openings through the shell, including the three top-landing windows.
  const glass = new T.MeshStandardMaterial({ name: 'Stair window patterned glass', map: patternedGlass('#c5d3cf'), transparent: true, opacity: .82, roughness: .45, depthWrite: false, side: T.DoubleSide }); // never clear (owner)
  const aluminium = new T.MeshStandardMaterial({ color: '#d4d7d0', metalness: .65, roughness: .33 });
  const casements = casementCluster('Rear stair windows', aluminium, glass, { near: 25 });
  const rows = [];
  let bottom = 0;
  for (const [sill, height, centres, width] of [[3.95, 1.45, [-2.65, 0, 2.65], 1.35], [6.8, 1.5, [-2.65, 0, 2.65], 1.35], [10.95, 1.65, [-2.65, 0, 2.65], 1.5]]) {
    box(0, (bottom + sill) / 2, -6.9, 8, sill - bottom, .2, m.wall);
    let left = -4;
    for (const x of centres) {
      const a = x - width / 2, b = x + width / 2;
      box((left + a) / 2, sill + height / 2, -6.9, a - left, height, .2, m.wall);
      // Glazed casements at the outer face, opening outward (owner, 2026-10-17); the grille sits inside them.
      casements.add(new T.Matrix4().makeRotationY(Math.PI).setPosition(x, sill, -7.0), width, height, { rows: 3, cols: 1 });
      for (let dx = -width / 2 + .14; dx < width / 2; dx += .14) box(x + dx, sill + height / 2, -6.84, .014, height, .018, gatePaint);
      for (let yy = sill + .30; yy < sill + height; yy += .30) box(x, yy, -6.84, width, .014, .018, gatePaint);
      for (const dx of [-width / 2, 0, width / 2]) if (dx !== 0) box(x + dx, sill + height / 2, -6.98, .045, height, .065, aluminium);
      for (const y of [sill, sill + height]) box(x, y, -6.98, width, .045, .065, aluminium);
      left = b;
    }
    box((left + 4) / 2, sill + height / 2, -6.9, 4 - left, height, .2, m.wall);
    rows.push(sill); bottom = sill + height;
  }
  box(0, (bottom + 15.5) / 2, -6.9, 8, 15.5 - bottom, .2, m.wall);
  casements.finish(); group.add(casements.group); group.userData.casements = casements;
  // Blue corner pilasters and a blue band under each row of windows, as on the tower's front (photo RUIDd8c4...).
  if (m.blue) {
    for (const x of [-3.9, 3.9]) box(x, 7.75, -7.06, .3, 15.5, .12, m.blue);
    for (const sill of rows) box(0, sill - .22, -7.05, 7.5, .28, .1, m.blue);
    box(0, 15.25, -7.06, 7.5, .3, .12, m.blue);
  }
  for (const [material, gs] of batches) {
    const mesh = new T.Mesh(mergeGeometries(gs), material); mesh.castShadow = !material.transparent; mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh); gs.forEach(g => g.dispose());
  }
  group.userData.flights = stairFlights;
  return group;
}
