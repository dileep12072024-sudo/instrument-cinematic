import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stairs, stairFlights } from './stair-layout.js';

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
    const g = new T.ExtrudeGeometry(shape, { depth: .16, bevelEnabled: false }); g.rotateY(-Math.PI / 2); g.translate(x + .08, 0, 0); add(g, m.wall);
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
  box(2.67, stairs.second + .48, -.72, 2.06, .96, .16, m.wall);
  // Recess gates have a real under-landing cavity extending to both outer walls.
  const gates = new T.Group(); gates.name = 'Closed under-stair corner gates'; group.add(gates);
  for (const side of [-1, 1]) {
    const gate = new T.Group(); gate.name = side < 0 ? 'Left under-stair gate' : 'Right under-stair gate';
    gate.position.set(side * 1.52, stairs.ground, -5.05); gate.userData.clearDepth = 2.1; gates.add(gate);
    const bar = (y, z, h, d, thickness = .026) => { const mesh = new T.Mesh(new T.BoxGeometry(thickness, h, d), m.metal); mesh.position.set(0, y, z); gate.add(mesh); };
    for (const z of [-.49, .49]) bar(1.05, z, 2.1, .045, .045);
    for (const y of [.025, 1.02, 2.08]) bar(y, 0, .045, 1.02);
    for (let j = -4; j <= 4; j++) bar(1.05, j * .105, 2.05, .015);
    bar(.98, 0, .055, .25, .045);
    box(side * 1.52, 2.35, -5.05, .18, .18, 1.16, m.wall);
    for (const z of [-5.66, -4.44]) box(side * 1.52, 1.23, z, .18, 2.14, .14, m.wall);
    box(side * 2.65, stairs.ground + .006, -5.05, 2.08, .012, 1.32, m.tread);
  }
  // Rear windows are openings through the shell, including the three top-landing windows.
  const glass = new T.MeshStandardMaterial({ color: '#dce8e3', transparent: true, opacity: .18, roughness: .12, depthWrite: false });
  const aluminium = new T.MeshStandardMaterial({ color: '#d4d7d0', metalness: .65, roughness: .33 });
  let bottom = 0;
  for (const [sill, height, centres, width] of [[2.9, 1.45, [-2.65, 0, 2.65], 1.35], [6.8, 1.5, [-2.65, 0, 2.65], 1.35], [10.95, 1.65, [-2.65, 0, 2.65], 1.5]]) {
    box(0, (bottom + sill) / 2, -6.9, 8, sill - bottom, .2, m.wall);
    let left = -4;
    for (const x of centres) {
      const a = x - width / 2, b = x + width / 2;
      box((left + a) / 2, sill + height / 2, -6.9, a - left, height, .2, m.wall);
      box(x, sill + height / 2, -6.89, width, height, .018, glass);
      for (const dx of [-width / 2, 0, width / 2]) box(x + dx, sill + height / 2, -6.77, .045, height, .065, aluminium);
      for (const y of [sill, sill + height]) box(x, y, -6.77, width, .045, .065, aluminium);
      left = b;
    }
    box((left + 4) / 2, sill + height / 2, -6.9, 4 - left, height, .2, m.wall);
    bottom = sill + height;
  }
  box(0, (bottom + 15.5) / 2, -6.9, 8, 15.5 - bottom, .2, m.wall);
  for (const [material, gs] of batches) {
    const mesh = new T.Mesh(mergeGeometries(gs), material); mesh.castShadow = !material.transparent; mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh); gs.forEach(g => g.dispose());
  }
  group.userData.flights = stairFlights;
  return group;
}
