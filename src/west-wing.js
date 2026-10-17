import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { groundSpine } from './footprint.js';
import { concreteScreenParts } from './architecture.js';

// West wing, ground floor (owner's walkthrough 20261014_110415.mp4 and nine photos, 2026-10-15). Layout read from the video:
// the corridor from the hall drops three steps into a north-south passage under the upstairs classroom passage. Straight
// ahead is the Process Control lab's double door; to the front (south) the passage runs past a garlanded door to the water
// cooler and the folding gate; to the rear (north) a dim corridor runs between lab doors (west) and pierced concrete
// screens cast with the university's AU monogram (east) to a screened washing bay. Order and adjacency are observed;
// lengths and sizes are estimates fitted to the existing shell (docs/west-wing.md).
const flightRise = groundSpine.rightFloor - groundSpine.hallFloor;
export const westWing = {
  // Owner, 2026-10-16: the west corridor is three steps below the hall (at the hall gate) and the wing three more below
  // that (at the office junction). Each flight: three risers of .18, as on the east side and upstairs.
  corridor: groundSpine.hallFloor - flightRise,
  floor: groundSpine.hallFloor - 2 * flightRise,
  west: -24.5, east: -22, north: -15, south: 15,
  ground: groundSpine.hallFloor - 2 * flightRise - .16, // earth outside: just below the wing floor; a ramp runs down from the gate (owner)
  stepsTop: -21.56, // corridor floor ends here; three risers of .18 descend westward, the last flush with the screened wall (owner)
  classroomSlab: -8.85, // upstairs passage floor covers the junction and the first stretch north (ceiling 2.764)
  endBay: -13.5, // the washing bay's ceiling is a storey higher behind a beam
};
const { floor: F } = westWing, at = h => F + h;

export function buildWestWing(parent, m, southCeiling = 3.83) {
  const group = new T.Group(); group.name = 'West wing ground floor (video-built)'; parent.add(group);
  // Furniture, fittings, signs and the lab glimpse: drawn only when the camera is near (main.js), ~80 draw calls saved
  // from every distant view. The structure (walls, screens, floors, doors, grilles) always draws: it is the facade.
  const fittings = new T.Group(); fittings.name = 'West wing fittings'; group.add(fittings);
  const batches = new Map();
  const add = (g, material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(g.index ? g.toNonIndexed() : g); };
  const box = (x, y, z, w, h, d, material) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material); return g; };
  const cyl = (x, y, z, r0, r1, h, material, sides = 14) => { const g = new T.CylinderGeometry(r0, r1, h, sides); g.translate(x, y, z); add(g, material); };
  const rodGeometry = (a, b, r, sides = 6) => {
    const s = new T.Vector3(...a), e = new T.Vector3(...b), g = new T.CylinderGeometry(r, r, s.distanceTo(e), sides);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), e.clone().sub(s).normalize()));
    g.translate(...s.lerp(e, .5).toArray()); return g;
  };
  const rod = (a, b, r, material, sides = 6) => add(rodGeometry(a, b, r, sides), material);
  // Run fn, then move everything it added by matrix (local builders: x along the wall, y up, z out of the wall).
  const placed = (matrix, fn) => {
    const before = new Map([...batches].map(([k, v]) => [k, v.length])); fn();
    for (const [material, list] of batches) for (let i = before.get(material) ?? 0; i < list.length; i++) list[i].applyMatrix4(matrix);
  };
  const canvasMap = (w, h, paint, repeat) => {
    const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = T.RepeatWrapping; t.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping; t.anisotropy = 8; return t;
  };
  let seed = 110415; const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);

  // Off-white lime plaster: damp grime and green-brown staining rising from the floor, grey streaks, scattered chips.
  const grime = canvasMap(512, 1024, (g, w, h) => {
    g.fillStyle = '#e4e1d8'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { g.fillStyle = `rgba(110,104,90,${.03 + rand() * .06})`; g.fillRect(rand() * w, rand() * h, 2 + rand() * 6, 20 + rand() * 160); }
    const damp = g.createLinearGradient(0, h, 0, h * .62); damp.addColorStop(0, 'rgba(92,86,52,.85)'); damp.addColorStop(.35, 'rgba(120,110,70,.45)'); damp.addColorStop(1, 'rgba(150,140,110,0)');
    g.fillStyle = damp; g.fillRect(0, h * .62, w, h * .38);
    for (let i = 0; i < 90; i++) { const x = rand() * w, y = h * (.66 + rand() * .3); g.fillStyle = `rgba(${70 + rand() * 40},${80 + rand() * 30},${50 + rand() * 20},${.12 + rand() * .2})`; g.beginPath(); g.ellipse(x, y, 4 + rand() * 18, 10 + rand() * 40, 0, 0, Math.PI * 2); g.fill(); }
    for (let i = 0; i < 140; i++) { g.fillStyle = rand() > .5 ? 'rgba(255,255,250,.35)' : 'rgba(150,140,120,.3)'; g.fillRect(rand() * w, rand() * h * .8, 2 + rand() * 9, 2 + rand() * 7); }
  }, false);
  const plaster = new T.MeshStandardMaterial({ name: 'West wing aged lime plaster', map: grime, bumpMap: grime, bumpScale: .004, roughness: .93 });
  // Glossy black tiles, about 0.45 m, pale grout, as in the whole video.
  const tileMap = canvasMap(256, 256, (g, w, h) => {
    g.fillStyle = '#16191b'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${90 + rand() * 60},${90 + rand() * 60},${95 + rand() * 60},${rand() * .08})`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 3, 1 + rand() * 3); }
    g.strokeStyle = '#8d918c'; g.lineWidth = 4; g.strokeRect(0, 0, w, h);
  }, true);
  const tiles = new T.MeshStandardMaterial({ name: 'Black glazed corridor tiles', map: tileMap, roughness: .16, metalness: .05, envMapIntensity: .55 });
  const stepStone = new T.MeshStandardMaterial({ name: 'Dark polished step stone', color: '#1d2224', roughness: .22, metalness: .05 });
  const grille = new T.MeshStandardMaterial({ name: 'Dark green painted grille iron', color: '#26403a', roughness: .55, metalness: .45 });
  const doorWood = new T.MeshStandardMaterial({ name: 'Blue-green painted lab doors', color: '#3a5a58', roughness: .6 });
  const greyDoor = new T.MeshStandardMaterial({ name: 'Grey-blue painted double door', color: '#5f7880', roughness: .62 });
  const dark = new T.MeshBasicMaterial({ name: 'Unlit room beyond', color: '#0b0c0c' });
  const glassDark = new T.MeshStandardMaterial({ name: 'Dusty high window glass', color: '#7d8a86', roughness: .35, metalness: .15 });
  const tube = new T.MeshStandardMaterial({ name: 'Wing tube lights', color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.4 });
  const steel = new T.MeshStandardMaterial({ name: 'Brushed steel fittings', color: '#b9bec0', metalness: .85, roughness: .32 });
  const metalBox = new T.MeshStandardMaterial({ name: 'Cream electrical boxes', color: '#d8d2bf', roughness: .6, metalness: .25 });
  const pvc = new T.MeshStandardMaterial({ name: 'White PVC pipes and conduits', color: '#e9e7df', roughness: .5 });
  const red = new T.MeshStandardMaterial({ name: 'Red fittings', color: '#b3241e', roughness: .5 });
  const black = new T.MeshStandardMaterial({ name: 'Black rubber and hands', color: '#16181a', roughness: .7 });
  const navy = new T.MeshStandardMaterial({ name: 'Navy clock face', color: '#1f2748', roughness: .45 });
  const cloth = new T.MeshStandardMaterial({ name: 'Maroon table cloth', color: '#7e1820', roughness: .95 });
  const table = new T.MeshStandardMaterial({ name: 'Dark stained table wood', color: '#3b2a1f', roughness: .7 });
  const rawWood = new T.MeshStandardMaterial({ name: 'Unpolished table frame wood', color: '#9a7a55', roughness: .85 });
  const plastic = new T.MeshStandardMaterial({ name: 'White plastic chairs', color: '#e7e3d6', roughness: .55 });
  const concrete = new T.MeshStandardMaterial({ name: 'Plain cast concrete', color: '#a9a49a', roughness: .95 });
  const marigold = new T.MeshStandardMaterial({ name: 'Marigold garlands', color: '#f0a020', roughness: .8 });
  const marigoldRed = new T.MeshStandardMaterial({ name: 'Orange-red marigolds', color: '#e2561c', roughness: .8 });
  const leaf = new T.MeshStandardMaterial({ name: 'Mango-leaf toran', color: '#3f7a2a', roughness: .8, side: T.DoubleSide });

  // Walls along the passage: an extruded slab with rectangular openings, world-scale UVs so grime sits at the floor.
  const walls = [];
  function wall(axis, at0, from, to, bottom, top, holes = [], thickness = .2, material = null) {
    const s = new T.Shape(); s.moveTo(from, bottom); s.lineTo(to, bottom); s.lineTo(to, top); s.lineTo(from, top); s.closePath();
    for (const o of holes) { const p = new T.Path(); p.moveTo(o.u0, o.v0); p.lineTo(o.u1, o.v0); p.lineTo(o.u1, o.v1); p.lineTo(o.u0, o.v1); p.closePath(); s.holes.push(p); }
    const g = new T.ExtrudeGeometry(s, { depth: thickness, bevelEnabled: false, curveSegments: 1 });
    g.translate(0, 0, -thickness / 2);
    if (axis === 'x') g.rotateY(-Math.PI / 2), g.translate(at0, 0, 0); // shape u runs along world z
    else g.translate(0, 0, at0); // shape u runs along world x
    if (material) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 3, p.getY(i) / 3); add(g, material); }
    else walls.push(g);
  }
  // Pierced screen: rows of small chipped rectangular openings, visible from both sides. Wide panels carry the AU
  // monogram in a wider slot: solid U and A, read "UA" from inside and "AU" from outside (frames 59, 139, 163).
  function jali(axis, at0, u, v, w, h) { // the facade's own block screen, as many blocks as fit (axis 'x': east wall)
    const parts = concreteScreenParts(w, h, Math.max(1, Math.round(w / .18)), Math.max(1, Math.round(h / .195)));
    const place = new T.Matrix4().makeRotationY(Math.PI / 2).setPosition(at0, v, u); // +z (the outside face) toward +x
    for (const g of [parts.screen, parts.sill]) if (g.attributes.position) add(g.applyMatrix4(place), m.screen);
    for (const g of parts.letters) add(g.applyMatrix4(place), m.blue);
  }
  // Leaf of a panelled door, built about its hinge: x runs from the hinge toward the opening's centre (dir = -side).
  function doorLeaf(side, lw, h, panels, material) {
    box(-side * lw / 2, h / 2, 0, lw, h, .045, material);
    const ph = (h - .2 - (panels - 1) * .06) / panels;
    for (let r = 0; r < panels; r++) for (const z of [-.028, .028]) box(-side * lw / 2, .1 + ph / 2 + r * (ph + .06), z, lw * .72, ph, .012, material);
    box(-side * (lw - .06), h * .47, .05, .025, .14, .03, steel); // latch
  }
  // Iron grille leaf about its hinge: stiles, rails and verticals; an arched head with a fan of arcs, or a plain grid.
  function grilleLeaf(side, lw, h, arched) {
    const x = t => -side * lw * t;
    for (const t of [0, 1]) rod([x(t), .02, 0], [x(t), h, 0], .016, grille);
    for (const y of [.05, h]) rod([x(0), y, 0], [x(1), y, 0], .015, grille);
    if (arched) {
      for (let k = 1; k < 5; k++) rod([x(k / 5), .05, 0], [x(k / 5), h * .68, 0], .007, grille);
      for (const y of [.55, 1.05]) rod([x(0), y, 0], [x(1), y, 0], .009, grille);
      rod([x(0), h * .68, 0], [x(1), h * .68, 0], .009, grille);
      for (const r of [.3, .55, .8]) { // concentric half-arcs over the leaf's centre, as filmed (frames 109-118)
        const cx = x(.5), pts = Array.from({ length: 13 }, (_, i) => { const a = i * Math.PI / 12; return [cx + Math.cos(a) * r * lw * .5, h * .68 + Math.sin(a) * r * (h * .3), 0]; });
        for (let i = 1; i < pts.length; i++) rod(pts[i - 1], pts[i], .007, grille, 4);
      }
      for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) rod([x(.5), h * .68, 0], [x(.5) + Math.cos(a) * lw * .4, h * .68 + Math.sin(a) * h * .24, 0], .006, grille, 4);
    } else {
      for (let k = 1; k < 7; k++) rod([x(k / 7), .05, 0], [x(k / 7), h, 0], .007, grille, 4);
      for (let y = .2; y < h - .05; y += .16) rod([x(0), y, 0], [x(1), y, 0], .007, grille, 4);
    }
  }
  // Wooden double door (panelled) closing an opening at u, optionally behind an iron grille gate. A leaf or gate that is
  // open is folded back flat against the passage wall beside the opening (outward, as the junction lab door is filmed).
  function labDoor(u, w, h, { grilleGate = true, arched = true, gateOpen = false, gateLeaves = 2, open = false, garland = false, panels = 4, material = doorWood } = {}) {
    for (const side of [-1, 1]) {
      const hinge = new T.Matrix4().makeRotationY(open ? side * (Math.PI - .1) : 0).setPosition(u + side * w / 2, F, open ? .07 : -.06);
      placed(hinge, () => doorLeaf(side, w / 2 - .01, h, panels, material));
    }
    for (const s of [-1, 1]) box(u + s * (w / 2 + .03), at(h / 2), .0, .06, h + .06, .1, material);
    box(u, at(h + .03), 0, w + .12, .06, .1, material);
    if (grilleGate) for (const side of gateLeaves === 2 ? [-1, 1] : [1]) {
      const lw = gateLeaves === 2 ? w / 2 : w;
      const hinge = new T.Matrix4().makeRotationY(gateOpen ? side * (Math.PI - .06) : 0).setPosition(u + side * w / 2, F, gateOpen ? .1 : .075);
      placed(hinge, () => grilleLeaf(side, lw, h, arched));
    }
    if (garland) for (let i = 0; i <= 16; i++) { const t = i / 16, g = new T.SphereGeometry(open ? .03 : .042, 6, 4); g.translate(u - w / 2 + t * w, at(h + .02 - Math.sin(t * Math.PI) * .16), open ? -.12 : .1); add(g, i % 2 ? marigold : marigoldRed); }
  }
  // Working water dispensers: tap or click a machine and water runs from its tap into the glass below (main.js), with
  // the pour sound. Stream: a thin tube with a scrolling streaked texture; the glass fills while it runs and is drunk
  // a few seconds later. Each machine also hums when the camera is near.
  const dispensers = [];
  const streamMap = canvasMap(32, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h);
    const core = g.createLinearGradient(0, 0, w, 0); core.addColorStop(0, 'rgba(220,238,255,.25)'); core.addColorStop(.5, 'rgba(235,246,255,.75)'); core.addColorStop(1, 'rgba(220,238,255,.25)');
    g.fillStyle = core; g.fillRect(0, 0, w, h); // an unbroken stream with brighter streaks running down it
    for (let i = 0; i < 40; i++) { const x = rand() * w, a = .25 + rand() * .6; g.fillStyle = `rgba(235,246,255,${a})`; g.fillRect(x, rand() * h, 1 + rand() * 3, 20 + rand() * 90); }
  }, true);
  const glassMat = new T.MeshStandardMaterial({ name: 'Drinking glass', color: '#dfeef5', roughness: .05, metalness: .1, transparent: true, opacity: .35, depthWrite: false });
  const waterMat = new T.MeshStandardMaterial({ name: 'Water in glass', color: '#9cc9dc', roughness: .02, transparent: true, opacity: .6, depthWrite: false });
  function dispenser({ name, hit, taps, glasses, display }) { // taps: [x, yTop, yBottom, z]; glasses: [x, yBase, z, radius, height]
    const streamMat = new T.MeshStandardMaterial({ name: `${name} water stream`, map: streamMap.clone(), alphaMap: null, color: '#e8f6ff', roughness: .05, transparent: true, opacity: .8, depthWrite: false, side: T.DoubleSide });
    streamMat.map.needsUpdate = true; streamMat.map.repeat.set(1, 2);
    const streams = taps.map(([x, y0, y1, z]) => { const m = new T.Mesh(new T.CylinderGeometry(.0045, .0035, y0 - y1, 8, 1, true), streamMat); m.position.set(x, (y0 + y1) / 2, z); m.visible = false; fittings.add(m); return m; });
    const fills = glasses.map(([x, y, z, r, h]) => {
      const glassG = new T.CylinderGeometry(r, r * .85, h, 20, 1, true); glassG.translate(x, y + h / 2, z); add(glassG, glassMat);
      const base = new T.CircleGeometry(r * .85, 20); base.rotateX(-Math.PI / 2); base.translate(x, y + .003, z); add(base, glassMat);
      const water = new T.Mesh(new T.CylinderGeometry(r * .96, r * .84, 1, 20), waterMat); water.position.set(x, y, z); water.scale.y = .001; water.visible = false; fittings.add(water);
      return { water, y, h }; });
    const box = new T.Box3().setFromObject(hit), centre = box.getCenter(new T.Vector3()); hit.material.visible = false; fittings.add(hit);
    let until = 0, level = 0;
    const unit = { name, hit, centre, get pouring() { return performance.now() < until; },
      start(sound) { if (unit.pouring) return false; until = performance.now() + 3200; sound?.pour(3.2); display?.(true); return true; },
      update(now, dt) {
        const on = now < until;
        for (const st of streams) { st.visible = on; if (on) st.material.map.offset.y = (st.material.map.offset.y + dt * 3.5) % 1; }
        level = on ? Math.min(1, level + dt / 3) : now > until + 4000 ? 0 : level; // full when it stops; drunk 4 s later
        for (const f of fills) { f.water.visible = level > .01; f.water.scale.y = Math.max(.001, level * f.h * .82); f.water.position.y = f.y + .004 + f.water.scale.y / 2; }
        if (!on && display && now > until && now < until + 100) display(false);
      } };
    dispensers.push(unit); return unit;
  }
  // RO water purifier (photo 33: white upright unit, blue lit window near the top), modelled as a working machine: rounded
  // cabinet, grey cap, dark glass fascia with a lit display, dispensing module with nozzle, lever and slotted drip tray,
  // side vents, feet, inlet hose to the wall tap, drain pipe and power cord. Its "purifying" lamp blinks. Faces -x.
  function purifier(x, z) {
    const body = new T.MeshStandardMaterial({ name: 'Purifier ABS body', color: '#eef0ec', roughness: .32 });
    const capMat = new T.MeshStandardMaterial({ name: 'Purifier grey cap', color: '#8f989e', roughness: .4 });
    const glass = new T.MeshStandardMaterial({ name: 'Purifier dark glass', color: '#0c1720', roughness: .08, metalness: .3 });
    const screen = canvasMap(256, 256, (g, w, h) => {
      g.fillStyle = '#031019'; g.fillRect(0, 0, w, h);
      g.fillStyle = '#3fb6ff'; g.font = 'bold 26px Arial'; g.textAlign = 'center'; g.fillText('RO + UV + UF', w / 2, 36);
      g.fillStyle = '#7fe0ff'; g.font = '16px Arial'; g.fillText('TDS  ppm', w / 2, 70);
      g.fillStyle = '#9ff2ff'; g.font = 'bold 64px Courier New'; g.fillText('042', w / 2, 132);
      const icon = (cx, label, col) => { g.fillStyle = col; g.beginPath(); g.arc(cx, 176, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#bfe9ff'; g.font = '12px Arial'; g.fillText(label, cx, 210); };
      icon(42, 'POWER', '#36e36a'); icon(102, 'PURIFY', '#2f8cff'); icon(162, 'FULL', '#1d3d55'); icon(220, 'FILTER', '#1d3d55');
      g.strokeStyle = '#1e5a7a'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
    }, false);
    const display = new T.MeshStandardMaterial({ name: 'Purifier display', map: screen, emissiveMap: screen, emissive: '#ffffff', emissiveIntensity: .9, roughness: .15 });
    // Live display: TDS wanders a little as it would, and it shows DISPENSING while water runs.
    let dispensing = false, lastDraw = 0;
    const draw = () => { const g = screen.image.getContext('2d'), w = 256, h = 256;
      g.fillStyle = '#031019'; g.fillRect(0, 0, w, h); g.strokeStyle = '#1e5a7a'; g.lineWidth = 3; g.strokeRect(6, 6, w - 12, h - 12);
      g.textAlign = 'center'; g.fillStyle = '#3fb6ff'; g.font = 'bold 26px Arial'; g.fillText('RO + UV + UF', w / 2, 36);
      if (dispensing) { g.fillStyle = '#9ff2ff'; g.font = 'bold 34px Arial'; g.fillText('DISPENSING', w / 2, 120); g.font = '20px Arial'; g.fillText('NORMAL  25 °C', w / 2, 152); }
      else { g.fillStyle = '#7fe0ff'; g.font = '16px Arial'; g.fillText('TDS  ppm', w / 2, 70); g.fillStyle = '#9ff2ff'; g.font = 'bold 64px Courier New'; g.fillText(String(38 + Math.round(Math.random() * 8)).padStart(3, '0'), w / 2, 132); }
      const blink = (performance.now() / 600 | 0) % 2;
      const icon = (cx, label, on, col) => { g.fillStyle = on ? col : '#1d3d55'; g.beginPath(); g.arc(cx, 176, 13, 0, Math.PI * 2); g.fill(); g.fillStyle = '#bfe9ff'; g.font = '12px Arial'; g.fillText(label, cx, 210); };
      icon(42, 'POWER', true, '#36e36a'); icon(102, 'PURIFY', !dispensing && blink, '#2f8cff'); icon(162, 'FULL', !dispensing, '#36e36a'); icon(220, 'TAP', dispensing, '#ffb02e');
      screen.needsUpdate = true; };
    const refresh = { onBeforeRender: () => { const now = performance.now(); if (now - lastDraw > 1500) { lastDraw = now; draw(); } } };
    const plate = canvasMap(256, 64, (g, w, h) => { g.fillStyle = '#eef0ec'; g.fillRect(0, 0, w, h); g.fillStyle = '#1a6fb8'; g.font = 'italic bold 34px Arial'; g.textAlign = 'center'; g.fillText('AquaPure', w / 2 - 20, 42); g.fillStyle = '#e03a3a'; g.font = 'bold 20px Arial'; g.fillText('RO', w / 2 + 84, 40); }, false);
    const plateMat = new T.MeshStandardMaterial({ name: 'Purifier brand plate', map: plate, roughness: .35 });
    let displayMesh; const turn = new T.Matrix4().makeRotationY(-Math.PI / 2).setPosition(x, F, z);
    placed(turn, () => {
      const rounded = (w, h, d, r, y, material) => { const g = new RoundedBoxGeometry(w, h, d, 3, r); g.translate(0, y, 0); add(g, material); };
      rounded(.36, 1.04, .34, .03, .55, body); rounded(.37, .05, .35, .018, 1.085, capMat);
      for (const sx of [-.14, .14]) for (const sz of [-.12, .12]) cyl(sx, .016, sz, .022, .025, .032, black, 10); // feet
      box(0, .84, .171, .28, .34, .01, glass); // fascia
      { const m = new T.Mesh(new T.PlaneGeometry(.22, .22), display); m.position.set(0, .86, .177); m.onBeforeRender = refresh.onBeforeRender; m.name = 'Purifier live display'; displayMesh = m; }
      { const g = new T.PlaneGeometry(.2, .05); g.translate(0, .64, .1715); add(g, plateMat); }
      // Dispensing module: hood, nozzle, push lever, side cheeks, slotted drip tray.
      box(0, .56, .2, .2, .035, .08, capMat);
      cyl(0, .525, .215, .012, .009, .04, steel, 12); box(0, .515, .245, .03, .045, .018, capMat);
      for (const s of [-1, 1]) box(s * .1, .44, .2, .012, .26, .08, capMat);
      box(0, .32, .205, .21, .02, .1, capMat);
      for (let k = -3; k <= 3; k++) box(k * .026, .331, .205, .012, .003, .085, black);
      for (const s of [-1, 1]) for (let k = 0; k < 7; k++) box(s * .181, .2 + k * .03, 0, .002, .008, .2, black); // side vents
    });
    // Blinking "purifying" lamp: its own small mesh, so the blink costs nothing elsewhere (onBeforeRender, drawn when seen).
    const lampMat = new T.MeshStandardMaterial({ name: 'Purifier lamp', color: '#103050', emissive: '#3aa0ff', emissiveIntensity: 1 });
    const lamp = new T.Mesh(new T.CircleGeometry(.008, 12), lampMat); lamp.rotation.y = -Math.PI / 2; lamp.position.set(x - .179, F + 1.0, z + .1);
    lamp.onBeforeRender = () => { lampMat.emissiveIntensity = (performance.now() / 600 | 0) % 2 ? .15 : 1.6; };
    fittings.add(lamp);
    displayMesh.applyMatrix4(turn); fittings.add(displayMesh);
    // Glass on the drip tray under the nozzle (nozzle at local (0, .505, .215) -> world (x - .215, F + .505, z)).
    dispenser({ name: 'Water purifier', hit: new T.Mesh(new T.BoxGeometry(.38, 1.1, .4), new T.MeshBasicMaterial()).translateX(x).translateY(F + .55).translateZ(z),
      taps: [[x - .215, F + .505, F + .37, z]], glasses: [[x - .215, F + .341, z, .03, .1]],
      display: on => { dispensing = on; lastDraw = 0; draw(); } });
    // Inlet hose up the wall to the tap, drain pipe to the floor, power cord to a wall socket.
    rod([x + .14, F + .9, z - .1], [inE - .04, F + .9, z - .1], .007, pvc, 6); rod([inE - .04, F + .9, z - .1], [inE - .04, F + 1.35, z - .1], .007, pvc, 6);
    box(inE - .04, F + 1.37, z - .1, .05, .05, .06, steel); rod([inE - .04, F + 1.4, z - .1], [inE - .04, F + 2.4, z - .1], .014, pvc, 6);
    rod([x + .14, F + .1, z + .08], [x + .14, F + .01, z + .3], .009, pvc, 6);
    rod([x + .14, F + .3, z + .13], [inE - .03, F + 1.2, z + .3], .004, black, 4); box(inE - .04, F + 1.22, z + .3, .03, .09, .07, metalBox);
  }
  function darkRoom(u, w, h, v0 = 0) { box(u, at(v0 + h / 2), -.55, w + .1, h + .1, .02, dark); }
  // Small dark high window under the ceiling (clerestory), framed, with two mullions.
  function highWindow(w, h, v0) {
    box(0, at(v0 + h / 2), -.06, w, h, .02, glassDark);
    for (const s of [-1, 1]) box(s * (w / 2 - .02), at(v0 + h / 2), -.04, .04, h, .06, grille);
    for (const y of [v0, v0 + h]) box(0, at(y), -.04, w, .04, .06, grille);
    for (const t of [-1 / 6, 1 / 6]) box(t * w, at(v0 + h / 2), -.045, .025, h, .03, grille);
  }
  function sign(text, u, h, width = .58, color = '#222') {
    const c = document.createElement('canvas'); c.width = 512; c.height = 128; const g = c.getContext('2d');
    g.fillStyle = '#efece4'; g.fillRect(0, 0, 512, 128); g.strokeStyle = '#555'; g.lineWidth = 6; g.strokeRect(3, 3, 506, 122);
    g.fillStyle = color; g.font = 'bold 44px Georgia'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = text.split(' '), lines = text.length > 18 ? [words.slice(0, Math.ceil(words.length / 2)).join(' '), words.slice(Math.ceil(words.length / 2)).join(' ')] : [text];
    lines.forEach((l, i) => g.fillText(l, 256, 64 + (i - (lines.length - 1) / 2) * 46, 490));
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    return { map, u, h, width };
  }
  const signs = [];
  function tubeLight(u, h) { box(u, at(h), .05, 1.2, .045, .045, tube); box(u, at(h + .03), .02, 1.26, .035, .05, steel); }
  function fuseBoxes(u, h, pipe = true) {
    for (const [du, dh, w, hh] of [[0, 0, .5, .46], [.52, .1, .36, .38], [-.02, -.55, .44, .3], [.46, -.46, .26, .34], [.2, .45, .3, .22]]) box(u + du, at(h + dh), .08, w, hh, .16, metalBox);
    for (const du of [-.18, .05, .3]) rod([u + du, at(h + .25), .03], [u + du, at(3.0), .03], .018, pvc, 5);
    if (pipe) rod([u - .3, at(.05), .04], [u - .3, at(h - .7), .04], .022, pvc, 6); // service pipe down to the floor (photo 38)
  }
  function extinguisher(u, h) { cyl(u, at(h), .1, .075, .075, .46, red); cyl(u, at(h + .27), .1, .025, .03, .07, black, 8); rod([u + .03, at(h + .27), .14], [u + .07, at(h - .12), .16], .012, black, 5); }

  const { west: XW, east: XE, north: ZN, south: ZS, classroomSlab: ZC, endBay: ZB } = westWing;
  const inW = XW + .1, inE = XE - .16, inN = ZN + .16, inS = ZS - .16, corridorNorth = groundSpine.roomFront, corridorSouth = 3.25;
  const ceilingLow = 2.764 - F, ceilingHigh = 3.83 - F; // under the upstairs passage slab / under the wing floor slab

  // Floor through the whole passage and the landing at the foot of the steps.
  const floor = new T.PlaneGeometry(inE - inW, inS - inN); floor.rotateX(-Math.PI / 2); floor.translate((inW + inE) / 2, F + .002, (inN + inS) / 2);
  const landing = new T.PlaneGeometry(westWing.stepsTop - .6 - inE, corridorSouth - corridorNorth); landing.rotateX(-Math.PI / 2); landing.translate((inE + westWing.stepsTop - .6) / 2, F + .002, (corridorNorth + corridorSouth) / 2);
  for (const g of [floor, landing]) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .45, p.getZ(i) / .45); add(g, tiles); }
  // Three risers from the corridor (hall level) down to the wing floor: dark polished treads, no light nosing (photo 37).
  for (let i = 0; i < 2; i++) {
    const top = westWing.corridor - (i + 1) * flightRise / 3, x0 = westWing.stepsTop - i * .3;
    const g = new T.BoxGeometry(.3, top - F + .02, corridorSouth - corridorNorth); g.translate(x0 - .15, (top + F - .02) / 2, (corridorNorth + corridorSouth) / 2);
    add(g, stepStone);
  }
  // Riser under the corridor's last tile edge.
  box(westWing.stepsTop + .02, (westWing.corridor + westWing.corridor - flightRise / 3) / 2, (corridorNorth + corridorSouth) / 2, .04, flightRise / 3, corridorSouth - corridorNorth, stepStone);

  // Close the strip under the corridor's side walls between the wing and the top step (their walls start at hall level).
  box((XE + westWing.stepsTop) / 2, (F + westWing.corridor) / 2, corridorNorth - .09, westWing.stepsTop - XE + .02, westWing.corridor - F, .18, plaster);
  // South: the facade wall starts at y = 0 with its inner face at 3.09; close flush with that face, up to its base.
  box((XE + westWing.stepsTop) / 2, F / 2, corridorSouth - .07, westWing.stepsTop - XE + .02, -F, .18, plaster);
  // East wall (exterior): plain behind the office block, then, from the pilaster, recessed screen panels with a grilled
  // door between a narrow panel (south) and a one-block strip (north), as in photos 33-36 and frames 140-163.
  const sill = .5, head = 2.6, eastDoor = { u: -8.8, w: 1.0 }; // tall panels, earth visible through the lowest openings (photos 33, 35)
  const eastHoles = [
    { u0: -5.25, u1: -3.8, v0: at(sill), v1: at(head) }, { u0: -7.0, u1: -5.55, v0: at(sill), v1: at(head) },
    { u0: -8.05, u1: -7.3, v0: at(sill), v1: at(head) },
    { u0: eastDoor.u - eastDoor.w / 2, u1: eastDoor.u + eastDoor.w / 2, v0: F, v1: at(2.12) },
    { u0: -9.85, u1: -9.55, v0: at(sill - .1), v1: at(head + .05) },
    { u0: -11.6, u1: -10.15, v0: at(sill), v1: at(head) }, { u0: -13.35, u1: -11.9, v0: at(sill), v1: at(head) },
    { u0: -14.7, u1: -13.65, v0: at(sill), v1: at(head) },
  ];
  wall('x', XE, ZN, corridorNorth, F - .02, 4, eastHoles, .32);
  for (const o of eastHoles.filter(o => o.v0 > F)) {
    jali('x', XE, (o.u0 + o.u1) / 2, (o.v0 + o.v1) / 2, o.u1 - o.u0, o.v1 - o.v0);
    // Raised plaster surround of each recessed panel, inside face.
    for (const [z, d] of [[o.u0 - .04, .08], [o.u1 + .04, .08]]) box(inE - .015, (o.v0 + o.v1) / 2, z, .03, o.v1 - o.v0 + .16, d, plaster);
    for (const y of [o.v0 - .04, o.v1 + .04]) box(inE - .015, y, (o.u0 + o.u1) / 2, .03, .08, o.u1 - o.u0 + .16, plaster);
  }
  // Outside (the low-lying rear courtyard, earth at about the wing floor): the facade's plaster, blue pilasters between
  // the panel groups, the storey trim and band that the upper floor sits on, and a concrete threshold at the door.
  const outside = -15, rear = -3.26; // the face is exterior north of the corridor block
  wall('x', XE + .17, outside, rear, F - .1, 3.8, eastHoles.filter(o => o.u1 <= rear), .02, m.wall);
  for (const z of [rear - .15, -5.4, -9.42, -13.5]) box(XE + .27, (F - .1 + 3.8) / 2, z, .2, 3.9 - F, .3, m.blue);
  box(XE + .2, 3.9, (outside + rear) / 2, .4, .19, rear - outside + .24, m.trim);
  box(XE + .2, 4.45, (outside + rear) / 2, .075, .35, rear - outside, m.blue);
  box(XE + .16 + .3, F - .01, eastDoor.u, .6, .06, eastDoor.w + .3, concrete); // threshold onto the courtyard earth
  // Pier at the junction corner (photo 37), the office block's end pilaster, and the deep beam along the east wall top.
  box(XE - .3, at(1.6), corridorNorth - .32, .3, 3.2, .62, plaster);
  box(inE - .16, at(ceilingLow / 2), -3.48, .32, ceilingLow, .36, plaster);
  box(inE - .14, at(ceilingLow - .19), (ZB + corridorNorth) / 2, .28, .38, corridorNorth - ZB, plaster);
  // West wall: lab doors, windows and high windows; front passage door; the Process Control lab straight ahead of the steps.
  const doors = { labA: -.95, instruments: -2.75, control: -8.0, endBay: -13.97 };
  const westHoles = [
    { u0: 1.55, u1: 2.85, v0: F, v1: at(2.15) },                 // Process Control lab double door, end of the main corridor
    { u0: 1.6, u1: 2.8, v0: at(2.6), v1: at(2.98) },             // its ventilator above the tube light and clock
    { u0: doors.labA - .55, u1: doors.labA + .55, v0: F, v1: at(2.12) },
    { u0: doors.instruments - .55, u1: doors.instruments + .55, v0: F, v1: at(2.12) },
    { u0: -4.55, u1: -4.05, v0: at(1.0), v1: at(2.0) },         // narrow barred window (frame 99)
    { u0: -6.3, u1: -5.0, v0: at(.85), v1: at(2.15) },          // two-leaf barred window (frames 102-104)
    { u0: doors.control - .55, u1: doors.control + .55, v0: F, v1: at(2.12) },
    { u0: doors.endBay - .52, u1: doors.endBay + .52, v0: F, v1: at(2.12) },
    { u0: 3.65, u1: 4.65, v0: F, v1: at(2.1) },                  // toran door, front passage (frames 54-55)
    { u0: 13.7, u1: 14.66, v0: F, v1: at(2.12) },                // D C S LAB door at the gate corner (frame 57)
  ];
  const highWindows = [-.95, -2.75, -5.6, -8.0, -10.6, -12.3];
  for (const u of highWindows) westHoles.push({ u0: u - .36, u1: u + .36, v0: at(2.5), v1: at(2.9), high: true });
  wall('x', XW, ZN, ZC, F - .02, F + ceilingHigh, westHoles.filter(o => o.u1 <= ZC + .01));
  wall('x', XW, ZC, corridorSouth, F - .02, F + ceilingLow, westHoles.filter(o => o.u0 >= ZC && o.u1 <= corridorSouth));
  wall('x', XW, corridorSouth, ZS, F - .02, southCeiling, westHoles.filter(o => o.u0 >= corridorSouth));
  // Ceilings: one flat whitewashed soffit from the steps to the washing bay (photos 33, 38), a storey higher over the
  // washing bay behind a beam, and over the front passage behind the beam at the corridor's south edge.
  box((XW + XE) / 2, F + (ceilingLow + ceilingHigh) / 2 - .12, ZB - .1, XE - XW, ceilingHigh - ceilingLow + .24, .2, plaster);
  box((XW + XE) / 2, F + ceilingLow - .12, corridorSouth + .1, XE - XW, .24, .2, plaster);

  // Doors, signs and fittings on the west wall (built facing +x, into the passage).
  const westFit = [];
  const W = (u, fn) => westFit.push([u, fn]);
  // Process Control lab: grey-blue five-panel leaves folded back against the wall, tube light, clock, ventilator, plaque.
  W(2.2, () => {
    labDoor(0, 1.3, 2.15, { grilleGate: false, open: true, material: greyDoor, garland: true, panels: 5 });
    tubeLight(-.05, 2.36);
    for (const [r, d, z, material] of [[.155, .02, .025, steel], [.145, .02, .035, navy]]) { const g = new T.CylinderGeometry(r, r, d, 28); g.rotateX(Math.PI / 2); g.translate(.78, at(2.42), z); add(g, material); }
    for (const y of [2.6, 2.98]) box(0, at(y), .02, 1.24, .05, .06, grille);
    for (const s of [-1, 1]) box(s * .6, at(2.79), .02, .05, .38, .06, grille);
    for (const t of [-.2, .2]) box(t, at(2.79), .0, .03, .38, .04, grille);
    box(0, at(2.79), -.08, 1.2, .38, .02, glassDark);
    box(-.84, at(1.95), .04, .1, .14, .04, metalBox); // switch box
    for (const y of [3.0, 3.06]) rod([-1.2, at(y), .03], [1.2, at(y), .03], .014, pvc, 5);
    extinguisher(.92, 1.15);
  });
  // The lab clock keeps real Indian time (owner, 2026-10-16): white hands over the navy face (frame 48), set as it is drawn.
  { const handMat = new T.MeshStandardMaterial({ name: 'Clock hands', color: '#f4f4f0', roughness: .4 }), hands = [];
    const clock = new T.Group(); clock.name = 'Lab wall clock'; clock.position.set(inW + .05, at(2.42), 2.2 - .78); fittings.add(clock);
    for (const [len, width, z] of [[.075, .014, .002], [.11, .01, .004], [.12, .004, .006]]) { // hour, minute, second
      const pivot = new T.Group(), g = new T.BoxGeometry(.003, len + .025, width); g.translate(0, len / 2 - .0125, 0);
      const hand = new T.Mesh(g, z === .006 ? red : handMat); pivot.position.x = z; pivot.add(hand); clock.add(pivot); hands.push(pivot); }
    const cap = new T.Mesh(new T.CylinderGeometry(.008, .008, .01, 12), handMat); cap.rotation.z = Math.PI / 2; cap.position.x = .008; clock.add(cap);
    // Facing +x: clockwise as seen from the passage is a negative turn about x.
    cap.onBeforeRender = () => { const t = (Date.now() / 1000 + 5.5 * 3600) % 43200, turn = Math.PI * 2;
      hands[0].rotation.x = -turn * t / 43200; hands[1].rotation.x = -turn * (t % 3600) / 3600; hands[2].rotation.x = -turn * Math.floor(t % 60) / 60; }; }
  W(doors.labA, () => { labDoor(0, 1.1, 2.12, { arched: true }); darkRoom(0, 1.1, 2.12); });
  W(doors.instruments, () => { labDoor(0, 1.1, 2.12, { arched: true, garland: true }); darkRoom(0, 1.1, 2.12); });
  W(-4.3, () => { for (let k = 0; k <= 4; k++) rod([-.25 + k * .125, at(1.0), .02], [-.25 + k * .125, at(2.0), .02], .01, grille); for (const y of [1.0, 1.5, 2.0]) rod([-.25, at(y), .02], [.25, at(y), .02], .012, grille); darkRoom(0, .5, 1.0, 1.0); });
  W(-5.65, () => { // two-leaf window: green frame, horizontal bars (frames 102-104)
    for (const x of [-.65, 0, .65]) box(x, at(1.5), .0, .06, 1.3, .08, grille);
    for (const y of [.85, 2.15]) box(0, at(y), 0, 1.36, .06, .08, grille);
    for (let k = 1; k < 7; k++) rod([-.65, at(.85 + k * 1.3 / 7), .03], [.65, at(.85 + k * 1.3 / 7), .03], .01, grille);
    for (const x of [-.32, .32]) rod([x, at(.85), .03], [x, at(2.15), .03], .01, grille);
    darkRoom(0, 1.3, 1.3, .85);
  });
  W(doors.control, () => { labDoor(0, 1.1, 2.12, { arched: true, gateOpen: true, garland: true, panels: 5 }); darkRoom(0, 1.1, 2.12); fuseBoxes(-1.5, 2.1, false); });
  W(doors.endBay, () => { labDoor(0, 1.05, 2.12, { arched: true }); darkRoom(0, 1.05, 2.12); });
  W(4.15, () => { // toran door: dark doorway, mango leaves and a marigold string across its head
    box(0, at(1.05), -.5, 1.0, 2.1, .02, dark);
    for (let i = 0; i < 34; i++) { const len = .22 + (i % 4) * .07 + (i < 12 ? .18 : 0), g = new T.PlaneGeometry(.07, len); g.rotateZ((i % 5 - 2) * .12); g.translate(-.55 + i * .033, at(2.12) - len / 2, .12 + (i % 2) * .02); add(g, leaf); } // bushier on the hinge side (frame 55)
    for (let i = 0; i <= 14; i++) { const g = new T.SphereGeometry(.035, 6, 4); g.translate(-.5 + i / 14, at(2.17), .13); add(g, i % 2 ? marigold : marigoldRed); }
  });
  W(.45, () => { fuseBoxes(0, 1.9); extinguisher(.5, 1.25); }); // meter and fuse boxes at the junction (photo 38)
  W(14.18, () => { labDoor(0, .96, 2.12, { grilleGate: false, panels: 5, material: greyDoor }); darkRoom(0, .96, 2.12); }); // DCS lab
  W(11.6, () => { const c = canvasMap(128, 256, (g, w, h) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b22a2a'; g.fillRect(8, 8, w - 16, 70); g.fillStyle = '#333'; for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) g.fillRect(12 + k * 15, 96 + r * 24, 10, 14); }, false);
    const g = new T.PlaneGeometry(.32, .6); g.translate(0, at(1.55), .012); add(g, new T.MeshStandardMaterial({ name: 'Wall calendar', map: c, roughness: .9 })); }); // calendar (frame 57)
  for (const u of highWindows) W(u, () => highWindow(.72, .4, 2.5));
  for (const [u, fn] of westFit) placed(new T.Matrix4().set(0, 0, 1, inW, 0, 1, 0, 0, -1, 0, 0, u, 0, 0, 0, 1), fn); // local (x along wall, y, z into passage) -> world
  signs.push({ ...sign('INDUSTRIAL INSTRUMENTS LAB', doors.instruments + .7, 2.32), wall: 'w' }, { ...sign('CONTROL SYSTEMS LABORATORY', doors.control + .7, 2.32), wall: 'w' }, { ...sign('PROCESS CONTROL LAB', 3.02, 2.45, .5), wall: 'w' }, { ...sign('D C S LAB', 14.55, 2.3, .5), wall: 'w' });

  // East wall: the grilled courtyard door (one-leaf grid gate over a six-panel door, photo 34).
  placed(new T.Matrix4().set(0, 0, -1, inE, 0, 1, 0, 0, 1, 0, 0, eastDoor.u, 0, 0, 0, 1), () => labDoor(0, eastDoor.w, 2.12, { arched: false, gateLeaves: 1, panels: 6, material: greyDoor }));
  // Near the junction: ladder, cardboard box and bucket, table with steel vessels, pink bucket and water can, a leaning
  // plank before the pilaster (photos 36-38).
  box(inE - .3, at(.78), -2.4, .55, .04, 1.05, table);
  for (const dx of [-.24, .24]) for (const dz of [-.48, .48]) box(inE - .3 + dx, at(.38), -2.4 + dz, .04, .76, .04, table);
  box(inE - .3, at(.3), -2.4, .5, .02, .98, table);
  for (const [dz, r, h] of [[-.3, .09, .12], [-.05, .07, .2], [.2, .1, .08], [.38, .06, .15]]) cyl(inE - .3, at(.8 + h / 2), -2.4 + dz, r, r * .9, h, steel);
  box(inE - .3, at(.86), -2.75, .3, .12, .22, new T.MeshStandardMaterial({ name: 'Blue lidded box', color: '#2f62c4', roughness: .5 }));
  cyl(inE - .3, at(.15), -2.2, .16, .13, .3, new T.MeshStandardMaterial({ name: 'Pink bucket', color: '#e59aa8', roughness: .6 }));
  cyl(inE - .3, at(.21), -2.6, .13, .13, .42, new T.MeshStandardMaterial({ name: 'Water can', color: '#cfe3ea', roughness: .1, transparent: true, opacity: .45, depthWrite: false })); // plain alpha: transmission re-renders the whole scene (~48 ms on the owner's GPU)
  for (const s of [-1, 1]) rod([inE - .45, F, -.95 + s * .2], [inE - .05, at(2.05), -.95 + s * .2], .02, steel, 4);
  for (let k = 1; k < 8; k++) { const t = k / 8; rod([inE - .45 + .4 * t, at(2.05 * t), -1.15], [inE - .45 + .4 * t, at(2.05 * t), -.75], .012, steel, 4); }
  box(inE - .3, at(.22), -.45, .5, .44, .4, new T.MeshStandardMaterial({ name: 'Cardboard box', color: '#b08a5c', roughness: .9 }));
  cyl(inE - .2, at(.15), -.05, .14, .12, .3, new T.MeshStandardMaterial({ name: 'Green bucket', color: '#2d6b5a', roughness: .6 }));
  { const g = new T.BoxGeometry(.03, 1.3, .3); g.rotateZ(-.12); g.translate(inE - .1, at(.66), -3.05); add(g, rawWood); }
  // Washing bay: concrete counter under the corner screens (north wall and east wall), a steel trough with two bowls,
  // a tap stand on the screen, buckets beneath; a water purifier and a raw wooden table frame (photo 33, frames 122-140).
  box((inW + inE) / 2 + .35, at(.8), inN + .28, inE - inW - .7, .07, .56, concrete);
  box(inE - .28, at(.8), (inN + .56 + ZB + .2) / 2, .56, .07, ZB + .2 - inN - .56, concrete);
  for (const x of [inW + .75, (inW + inE) / 2 + .2]) box(x, at(.38), inN + .28, .1, .76, .5, concrete);
  box(inE - .28, at(.38), ZB, .5, .76, .1, concrete);
  box(inE - .75, at(.74), inN + .3, .62, .1, .42, steel);
  for (const dx of [-.14, .14]) cyl(inE - .75 + dx, at(.83), inN + .3, .09, .07, .08, steel, 18);
  rod([inE - .75, at(.8), inN + .06], [inE - .75, at(1.55), inN + .06], .014, steel, 6);
  rod([inE - .75, at(1.55), inN + .06], [inE - .75, at(1.48), inN + .2], .012, steel, 6);
  cyl(inE - .6, at(.16), inN + .35, .17, .14, .32, red); cyl(inE - .6, at(.32), inN + .35, .175, .175, .02, new T.MeshStandardMaterial({ name: 'Blue bucket rim', color: '#2c6fb8', roughness: .5 }));
  cyl(inW + 1.2, at(.2), inN + .3, .15, .15, .4, plastic);
  cyl(inE - .3, at(.92), -13.9, .12, .12, .22, new T.MeshStandardMaterial({ name: 'Beige can', color: '#d9c79a', roughness: .5 }));
  purifier(inE - .2, ZB + .55);
  { const x = inW + .35, z = -13.9; box(x, at(.95), z, .6, .04, 1.1, rawWood); box(x, at(.25), z, .55, .03, 1.0, rawWood); for (const dx of [-.27, .27]) for (const dz of [-.52, .52]) box(x + dx, at(.47), z + dz, .05, .95, .05, rawWood); }
  // Tables draped in maroon cloth with a white patterned top cloth along the west wall before the bay (frames 118-127).
  const motif = canvasMap(256, 256, (g, w, h) => {
    g.fillStyle = '#efe9dd'; g.fillRect(0, 0, w, h); g.fillStyle = '#8f1d24';
    for (let y = 32; y < h; y += 64) for (let x = 32; x < w; x += 64) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-12, -12, 24, 24); g.restore(); g.fillRect(x - 3, y - 22, 6, 44); g.fillRect(x - 22, y - 3, 44, 6); }
  }, true);
  const topCloth = new T.MeshStandardMaterial({ name: 'Patterned top cloth', map: motif, roughness: .95 });
  for (const z of [-10.9, -12.1]) { box(inW + .35, at(.55), z, .62, 1.1, 1.0, cloth); const g = new T.BoxGeometry(.66, .03, 1.04); g.translate(inW + .35, at(1.115), z); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2); add(g, topCloth); }
  // Front passage: stacked white chairs and a wooden chair against the west wall after the toran door, one chair by the
  // screens opposite, a paper lantern overhead (frame 57).
  const chair = (z, n, material, side, back = .5) => { for (let k = 0; k < n; k++) { // side -1: west wall, 1: east (screens)
    const y = k * .045, wallX = side < 0 ? inW : inE, seat = wallX - side * (.35 + k * .02), rest = wallX - side * (.14 + k * .02);
    box(seat, at(.44 + y), z, .44, .035, .44, material); box(rest, at(.44 + back / 2 + y), z, .04, back, .44, material);
    for (const dx of [-.18, .18]) for (const dz of [-.18, .18]) box(seat + dx, at(.22 + y), z + dz, .03, .44, .03, material);
  } };
  chair(5.3, 4, plastic, -1); chair(6.15, 3, plastic, -1); chair(6.9, 1, table, -1, .55); chair(9.4, 1, plastic, 1);
  cyl((inW + inE) / 2, southCeiling - .55, 6.6, .16, .16, .32, new T.MeshStandardMaterial({ name: 'Pink paper lantern', color: '#f0418a', emissive: '#5a0d2a', roughness: .8 }), 12);
  rod([(inW + inE) / 2, southCeiling - .38, 6.6], [(inW + inE) / 2, southCeiling, 6.6], .004, steel, 3);

  // Water cooler in the front corner (photos 39-41), modelled: a stainless cabinet on castors standing on a concrete
  // plinth, blue printed panels above and below a recessed tap bay with two push taps and two steel tumblers.
  // The panel artwork is generated, not photographed.
  const printPanel = (kind) => canvasMap(256, kind === 'side' ? 640 : 256, (g, w, h) => {
    const bg = g.createLinearGradient(0, 0, w, h); bg.addColorStop(0, '#2f86de'); bg.addColorStop(1, '#1c5fb8'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
    const logo = (x, y, s) => { g.fillStyle = '#fff'; g.strokeStyle = '#c4161c'; g.lineWidth = 4 * s; g.beginPath(); g.ellipse(x, y, 46 * s, 22 * s, 0, 0, Math.PI * 2); g.fill(); g.stroke(); g.fillStyle = '#c4161c'; g.font = `italic bold ${24 * s}px Georgia`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('Divis', x, y + 1); };
    const drop = (x, y, s) => { const d = g.createLinearGradient(x - 20 * s, y - 40 * s, x + 20 * s, y + 30 * s); d.addColorStop(0, '#d6f0ff'); d.addColorStop(1, '#3d9be8'); g.fillStyle = d; g.beginPath(); g.moveTo(x, y - 46 * s); g.bezierCurveTo(x + 8 * s, y - 20 * s, x + 26 * s, y, x + 24 * s, y + 14 * s); g.arc(x, y + 14 * s, 24 * s, 0, Math.PI); g.bezierCurveTo(x - 26 * s, y, x - 8 * s, y - 20 * s, x, y - 46 * s); g.fill(); };
    const words = (x, y, s) => { g.fillStyle = '#fff'; g.textAlign = 'left'; g.font = `${14 * s}px Arial`; g.fillText('Safe', x, y - 26 * s); g.font = `bold ${38 * s}px Arial`; g.fillText('Water', x, y + 8 * s); g.font = `${13 * s}px Arial`; g.fillText('Healthy Life', x + 4 * s, y + 30 * s); };
    if (kind === 'top') { logo(62, 40, 1); g.fillStyle = '#c4161c'; g.font = 'bold 15px Arial'; g.textAlign = 'left'; g.fillText('Divis Laboratories Ltd.', 112, 46); words(118, 130, 1); drop(205, 190, .9); g.fillStyle = 'rgba(255,255,255,.18)'; g.beginPath(); g.ellipse(58, 175, 42, 70, 0, 0, Math.PI * 2); g.fill(); }
    if (kind === 'bottom') { g.fillStyle = '#3b2a8c'; g.beginPath(); g.moveTo(0, h); g.lineTo(w, h * .45); g.lineTo(w, h); g.fill(); logo(70, 42, .9); words(26, 140, .95); drop(200, 165, .8); }
    if (kind === 'side') {
      logo(60, 40, .8); g.fillStyle = '#fff'; g.fillRect(0, 70, w, 52); g.fillStyle = '#c4161c'; g.font = 'bold 21px Arial'; g.textAlign = 'center'; g.fillText('Divis Laboratories Ltd.', w / 2, 98);
      g.fillStyle = '#9fb6c8'; g.fillRect(14, 140, w - 28, 150); g.fillStyle = '#6a7f8f'; for (let k = 0; k < 6; k++) g.fillRect(30 + k * 36, 170, 22, 110); g.fillStyle = '#5b8f3e'; g.fillRect(14, 262, w - 28, 28);
      words(30, 360, 1); drop(205, 400, .8); g.fillStyle = '#3b2a8c'; g.fillRect(0, 450, w, 40); g.fillStyle = '#e8e0c8'; g.fillRect(14, 498, w - 28, 80);
      g.fillStyle = '#1c5fb8'; g.fillRect(0, 588, w, 52); g.fillStyle = '#fff'; g.font = 'bold 20px Arial'; g.fillText('SAFE DRINKING WATER', w / 2, 621);
    }
  });
  {
    const cx = inE - .42, cz = inS - .42, cw = .62, cd = .5, base = at(.25 + .07), ch = 1.45;
    box(cx + .03, at(.125), cz + .02, .8, .25, .72, concrete); // plinth
    for (const dx of [-.26, .26]) for (const dz of [-.2, .2]) { cyl(cx + dx, at(.29), cz + dz, .03, .03, .05, black, 10); box(cx + dx, at(.31), cz + dz, .05, .02, .05, steel); }
    box(cx, base + ch / 2, cz + .07, cw, ch, .36, steel); // cabinet carcass, its face 0.14 behind the front: the tap bay is a recess
    const front = cz - cd / 2, panel = (kind, w, h, x, y, z, ry) => { const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ name: `Cooler ${kind} print`, map: printPanel(kind), roughness: .45 })); mesh.rotation.y = ry; mesh.position.set(x, y, z); fittings.add(mesh); };
    const bottomH = .5, bayH = .4, topH = ch - bottomH - bayH;
    box(cx, base + bottomH / 2, front + .03, cw, bottomH, .06, steel); box(cx, base + bottomH + bayH + topH / 2, front + .03, cw, topH, .06, steel);
    panel('bottom', cw - .05, bottomH - .04, cx, base + bottomH / 2, front - .002, Math.PI);
    panel('top', cw - .05, topH - .04, cx, base + bottomH + bayH + topH / 2, front - .002, Math.PI);
    panel('side', cd - .06, ch - .06, cx - cw / 2 - .002, base + ch / 2, cz + .02, -Math.PI / 2);
    for (const s of [-1, 1]) box(cx + s * (cw / 2 - .02), base + bottomH + bayH / 2, front + .03, .04, bayH, .06, steel); // tap bay cheeks
    box(cx, base + bottomH + .02, front + .07, cw - .08, .015, .1, steel); // drip grate
    for (const dx of [-.14, .14]) {
      cyl(cx + dx, base + bottomH + bayH - .1, front + .1, .016, .016, .05, steel, 8); box(cx + dx, base + bottomH + bayH - .13, front + .08, .02, .03, .06, black);
      cyl(cx + dx, base + bottomH + .085, front + .08, .04, .035, .11, steel, 16); // tumbler
    }
    // Working: the right-hand tap runs into its tumbler.
    { const hit = new T.Mesh(new T.BoxGeometry(cw, ch, cd), new T.MeshBasicMaterial()); hit.position.set(cx, base + ch / 2, cz);
      dispenser({ name: 'Water cooler', hit, taps: [[cx + .14, base + bottomH + bayH - .145, base + bottomH + .13, front + .08]], glasses: [] }); }
    rod([cx + .18, base + .3, cz + .27], [cx + .38, at(.06), cz + .3], .012, pvc, 6); rod([cx + .38, at(.06), cz + .3], [cx + .38, at(1.0), inS - .04], .012, pvc, 6); // supply hoses
    rod([inE - .05, at(1.0), inS - .05], [inE - .05, at(2.6), inS - .05], .016, pvc, 6); box(inE - .05, at(1.0), inS - .1, .05, .05, .08, pvc); // pipe and tap on the pier
  }
  // Plywood: a tall peeling "Marine" board on the pier behind the cooler (photos 40-41).
  const ply = canvasMap(256, 512, (g, w, h) => {
    g.fillStyle = '#6e5440'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { g.fillStyle = `rgba(${200 + rand() * 40},${185 + rand() * 40},${160 + rand() * 30},${.45 + rand() * .4})`; g.beginPath(); const x = rand() * w, y = rand() * h; g.moveTo(x, y); for (let k = 0; k < 7; k++) g.lineTo(x + (rand() - .5) * 40, y + (rand() - .3) * 70); g.closePath(); g.fill(); } // peeled veneer
    g.save(); g.translate(w * .42, h * .62); g.rotate(-Math.PI / 2); g.fillStyle = 'rgba(40,28,20,.8)'; g.font = 'italic bold 44px Georgia'; g.fillText('Marine', 0, 0); g.font = 'italic 22px Georgia'; g.fillText('gold', 150, 0); g.restore();
  }, false);
  const plyMat = new T.MeshStandardMaterial({ name: 'Weathered plywood boards', map: ply, roughness: .9 });
  { const g = new T.BoxGeometry(.9, 1.7, .025); g.rotateX(-.04); g.translate(inE - .5, at(.85), inS - .06); add(g, plyMat); } // leaning on the gate
  // Below the outside walls (which start at the old floor datum, y = 0) the passage ends need their own plaster down to
  // the lowered floor: the north end under the washing-bay screen.
  box((inW + inE) / 2, F / 2 + .41, inN - .08, inE - inW, -F + .82, .16, plaster);
  // The front passage's east wall (the building's screened face) starts at the old floor datum: close the strip below it.
  box(XE, F / 2 - .01, (corridorSouth + .2 + inS) / 2, .34, -F + .02, inS - corridorSouth - .2, plaster);
  // The folding gate reaches the floor (architecture.js): no wall under it (owner, 2026-10-16). Outside it a concrete
  // ramp slopes from the threshold down to the earth, the full width of the gate bay.
  { const x0 = -24.7, x1 = -22.3, z0 = ZS + .16, z1 = z0 + 1.2, top = F + .005, bot = westWing.ground - .02;
    const v = [[x0, top, z0], [x1, top, z0], [x0, bot, z1], [x1, bot, z1], [x0, bot, z0], [x1, bot, z0]];
    const tri = [[0, 2, 1], [1, 2, 3], [0, 4, 2], [1, 3, 5], [0, 1, 4], [1, 5, 4], [2, 4, 3], [3, 4, 5]], pos = [];
    for (const t of tri) for (const k of t) pos.push(...v[k]);
    const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.computeVertexNormals();
    const p = g.attributes.position, uv = new Float32Array(p.count * 2); for (let i = 0; i < p.count; i++) { uv[i * 2] = p.getX(i) / 1.5; uv[i * 2 + 1] = p.getZ(i) / 1.5; }
    g.setAttribute('uv', new T.BufferAttribute(uv, 2)); add(g, m.paving ?? concrete); }
  // Across the gate's lower part a
  // white sheet stands propped against the inside (photo 40, frame 57), grimy and splashed, a little bowed and leaning.
  { const sheetMap = canvasMap(512, 128, (g, w, h) => {
      g.fillStyle = '#d9d6cc'; g.fillRect(0, 0, w, h);
      const low = g.createLinearGradient(0, h, 0, h * .35); low.addColorStop(0, 'rgba(70,64,52,.75)'); low.addColorStop(1, 'rgba(110,100,85,0)'); g.fillStyle = low; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 70; i++) { g.fillStyle = `rgba(${60 + rand() * 40},${55 + rand() * 35},${45 + rand() * 30},${.08 + rand() * .2})`; g.beginPath(); g.ellipse(rand() * w, h * (.4 + rand() * .6), 3 + rand() * 18, 2 + rand() * 8, 0, 0, Math.PI * 2); g.fill(); }
      for (let i = 0; i < 25; i++) { g.fillStyle = 'rgba(80,72,60,.15)'; g.fillRect(rand() * w, rand() * h * .5, 1 + rand() * 2, 10 + rand() * 40); } // drip streaks
    }, false);
    const sheet = new T.PlaneGeometry(inE - inW - .06, .76, 12, 1), p = sheet.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / (inE - inW) + .5) * Math.PI) * .025); // bowed
    sheet.rotateY(Math.PI); sheet.rotateX(-.06); sheet.translate((inW + inE) / 2, at(.38), inS + .07);
    add(sheet, new T.MeshStandardMaterial({ name: 'White sheet against the gate', map: sheetMap, roughness: .75, side: T.DoubleSide })); }

  // Kolam drawn in white rice powder on the tiles in front of the garlanded doors (photos 33, 37).
  const kolam = canvasMap(256, 256, (g, w, h) => {
    g.clearRect(0, 0, w, h); g.strokeStyle = 'rgba(250,250,245,.95)'; g.lineWidth = 5; g.lineCap = 'round';
    for (let i = 0; i < 4; i++) { g.save(); g.translate(w / 2, h / 2); g.rotate(i * Math.PI / 2); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(40, -70, 100, -30, 60, 20); g.bezierCurveTo(30, 60, -20, 30, 0, 0); g.stroke(); g.restore(); }
    g.fillStyle = 'rgba(250,250,245,.95)'; for (let y = 48; y < h; y += 40) for (let x = 48; x < w; x += 40) if (Math.hypot(x - w / 2, y - h / 2) < 100) { g.beginPath(); g.arc(x, y, 4, 0, Math.PI * 2); g.fill(); }
  }, false);
  const kolamMat = new T.MeshStandardMaterial({ name: 'Rice-powder kolam', map: kolam, transparent: true, depthWrite: false, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const [x, z, s] of [[inW + .55, doors.instruments, .6], [inW + .6, doors.control, .55], [inE - .7, eastDoor.u - .3, .45]]) { const g = new T.PlaneGeometry(s, s); g.rotateX(-Math.PI / 2); g.translate(x, F + .006, z); add(g, kolamMat); }

  // Tube lights on the west wall: junction, along the dim corridor, the washing bay.
  for (const [u, h] of [[-1.85, 2.42], [-4.9, 2.42], [-9.4, 2.42], [-12.9, 2.42]]) placed(new T.Matrix4().set(0, 0, 1, inW, 0, 1, 0, 0, -1, 0, 0, u, 0, 0, 0, 1), () => tubeLight(0, h));
  // Whitewashed ceilings (the video shows them pale even in the dim corridor).
  const ceilingMat = new T.MeshStandardMaterial({ name: 'Whitewashed wing ceiling', color: '#ecebe4', roughness: .95, emissive: '#55544e', side: T.DoubleSide });
  for (const [z0, z1, h] of [[ZB, corridorSouth, ceilingLow], [inN, ZB, ceilingHigh], [corridorSouth, inS, southCeiling - F]]) {
    const g = new T.PlaneGeometry(inE - inW, z1 - z0); g.rotateX(Math.PI / 2); g.translate((inW + inE) / 2, F + h - .005, (z0 + z1) / 2); add(g, ceilingMat);
  }
  // Conduit bundle along the top of the west wall (photo 38) and a single run on the east wall.
  for (const dy of [0, .07, .14]) rod([inW + .04, F + ceilingLow - .28 + dy, ZB], [inW + .04, F + ceilingLow - .28 + dy, corridorNorth], .013, pvc, 5);
  rod([inE - .3, F + ceilingLow - .45, ZB], [inE - .3, F + ceilingLow - .45, -3.7], .012, pvc, 5);

  // The Process Control lab beyond the open double door: light-blue walls, pale tiles, a cream panel cabinet on castors
  // with a blue pump beneath, benches with stools, ceiling fans and a barred window (frames 45-53).
  {
    const lab = new T.Group(); lab.name = 'Lab glimpse beyond the junction door';
    const labH = ceilingLow - .05, cx = XW - .12 - 2.8;
    const labTiles = canvasMap(128, 128, (g, w, h) => { g.fillStyle = '#e9e9e2'; g.fillRect(0, 0, w, h); g.strokeStyle = '#b9bbb4'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }, true);
    labTiles.repeat.set(5.58 / .3, 4.18 / .3);
    const room = new T.Mesh(new T.BoxGeometry(5.6, labH, 4.2), new T.MeshStandardMaterial({ color: '#bcd6dc', roughness: .9, side: T.BackSide })); room.position.set(cx, F + labH / 2, 2.2);
    const labFloor = new T.Mesh(new T.PlaneGeometry(5.58, 4.18), new T.MeshStandardMaterial({ map: labTiles, roughness: .35 })); labFloor.rotation.x = -Math.PI / 2; labFloor.position.set(cx, F + .004, 2.2);
    const cream = new T.MeshStandardMaterial({ color: '#d9d4c2', roughness: .6 }), frameMat = new T.MeshStandardMaterial({ color: '#c9c9c4', roughness: .5, metalness: .3 });
    const cabinet = new T.Mesh(new T.BoxGeometry(.75, .85, .55), cream); cabinet.position.set(XW - 1.0, F + 1.2, 2.6); // panel board on a wheeled frame
    lab.add(room, labFloor, cabinet);
    for (const dx of [-.34, .34]) for (const dz of [-.24, .24]) { const leg = new T.Mesh(new T.BoxGeometry(.035, .78, .035), frameMat); leg.position.set(XW - 1.0 + dx, F + .41, 2.6 + dz); lab.add(leg); }
    const shelf = new T.Mesh(new T.BoxGeometry(.72, .03, .52), frameMat); shelf.position.set(XW - 1.0, F + .2, 2.6); lab.add(shelf);
    const pump = new T.Mesh(new T.SphereGeometry(.15, 16, 12), new T.MeshStandardMaterial({ color: '#2a52b8', roughness: .4 })); pump.position.set(XW - 1.0, F + .45, 2.6); lab.add(pump);
    const mat = new T.Mesh(new T.BoxGeometry(.4, .012, .62), black); mat.position.set(XW - .45, F + .01, 2.15); lab.add(mat);
    const legs = new T.MeshStandardMaterial({ color: '#6b4a2f', roughness: .7 });
    for (const [x, z] of [[XW - 2.6, 1.3], [XW - 2.6, 3.1], [XW - 4.4, 1.3]]) {
      const top = new T.Mesh(new T.BoxGeometry(1.8, .05, .7), table); top.position.set(x, F + .85, z); lab.add(top);
      for (const dx of [-.85, .85]) for (const dz of [-.3, .3]) { const l = new T.Mesh(new T.BoxGeometry(.05, .83, .05), legs); l.position.set(x + dx, F + .42, z + dz); lab.add(l); }
      for (const dx of [-.5, .1, .6]) { const s = new T.Mesh(new T.CylinderGeometry(.14, .14, .04, 10), legs); s.position.set(x + dx, F + .55, z + .55); lab.add(s); const sl = new T.Mesh(new T.BoxGeometry(.2, .53, .2), legs); sl.position.set(x + dx, F + .27, z + .55); lab.add(sl); }
    }
    for (const x of [XW - 2.7, XW - 4.7]) {
      const fan = new T.Group(); fan.position.set(x, F + labH - .35, 2.2);
      const hub = new T.Mesh(new T.CylinderGeometry(.09, .09, .12, 12), black); fan.add(hub); const down = new T.Mesh(new T.CylinderGeometry(.015, .015, .4, 6), black); down.position.y = .25; fan.add(down);
      for (let k = 0; k < 3; k++) { const blade = new T.Mesh(new T.BoxGeometry(.6, .01, .1), black); blade.position.set(Math.cos(k * 2.094) * .35, 0, Math.sin(k * 2.094) * .35); blade.rotation.y = -k * 2.094; fan.add(blade); }
      lab.add(fan);
    }
    const win = new T.Mesh(new T.PlaneGeometry(1.4, 1.0), new T.MeshBasicMaterial({ color: '#f2f7f4' })); win.rotation.y = Math.PI / 2; win.position.set(cx - 2.78, F + 1.6, 2.2); lab.add(win);
    for (let k = 0; k <= 6; k++) { const bar = new T.Mesh(new T.BoxGeometry(.03, 1.0, .03), grille); bar.position.set(cx - 2.76, F + 1.6, 1.5 + k * 1.4 / 6); lab.add(bar); }
    const light = new T.Mesh(new T.BoxGeometry(1.2, .05, .05), tube); light.position.set(XW - 3, F + labH - .25, 2.2);
    lab.add(light); fittings.add(lab);
  }

  // Signs (canvas text) projecting from the west wall beside their doors.
  for (const s of signs) for (const turn of [0, Math.PI]) { // projecting blade sign, readable from both directions along the corridor
    const mesh = new T.Mesh(new T.PlaneGeometry(s.width, s.width / 4), new T.MeshStandardMaterial({ map: s.map, roughness: .85 }));
    mesh.rotation.y = turn; mesh.position.set(inW + .06 + s.width / 2, at(s.h), s.u + (turn ? -.004 : .004)); fittings.add(mesh);
  }
  for (const s of signs) box(inW + .03, at(s.h + .14), s.u, .06, .03, .03, steel); // bracket

  const structure = new Set([plaster, tiles, stepStone, m.screen, m.blue, m.wall, m.trim, m.paving, concrete, ceilingMat, grille, doorWood, greyDoor, dark, glassDark]);
  // Bake walls and screens with world-scale UVs (grime band at the floor), then merge everything by material.
  for (const g of walls) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.2, (p.getY(i) - F) / 3.3); add(g, plaster); }
  for (const [material, list] of batches) {
    const mesh = new T.Mesh(mergeGeometries(list.map(g => { const c = g.clone(); for (const name of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(name)) c.deleteAttribute(name); if (!c.attributes.uv) c.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); return c; })), material);
    mesh.name = material.name || 'West wing part'; mesh.castShadow = !material.transparent && material !== dark && material !== tube; mesh.receiveShadow = true;
    (structure.has(material) ? group : fittings).add(mesh);
  }
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  group.userData = { ...westWing, fittings, dispensers };
  return group;
}
