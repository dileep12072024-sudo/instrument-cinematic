import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import * as P from './props.js';
import { createRoomLights, makeSwitchboard } from './roomlights.js';
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
  const grille = new T.MeshStandardMaterial({ name: 'Dark green painted grille iron', map: P.paintTexture('#2a4640', { rust: .7, chips: .6, primer: '#7a6e5a' }), roughness: .55, metalness: .35 });
  const doorWood = new T.MeshStandardMaterial({ name: 'Blue-green painted lab doors', map: P.paintTexture('#3e605e', { rust: 0, chips: .7, primer: '#a08a68' }), roughness: .55 });
  const greyDoor = new T.MeshStandardMaterial({ name: 'Grey-blue painted double door', map: P.paintTexture('#617a82', { rust: 0, chips: .5, primer: '#b0a088' }), roughness: .58 });
  const dark = new T.MeshBasicMaterial({ name: 'Unlit room beyond', color: '#0b0c0c' });
  const glassDark = new T.MeshStandardMaterial({ name: 'Dusty high window glass', color: '#7d8a86', roughness: .35, metalness: .15 });
  const tube = new T.MeshStandardMaterial({ name: 'Wing tube lights', color: '#ffffff', emissive: '#f4f8ff', emissiveIntensity: 1.4 });
  // Two circuits for the passage tubes, each on its own switch: the junction (with the lab-door tube), the dim corridor.
  const tubeJunction = tube.clone(), tubeCorridor = tube.clone(); tubeJunction.name = 'Junction tube lights'; tubeCorridor.name = 'Dim corridor tube lights';
  const steel = new T.MeshStandardMaterial({ name: 'Brushed steel fittings', color: '#b9bec0', metalness: .85, roughness: .32 });
  const metalBox = new T.MeshStandardMaterial({ name: 'Cream electrical boxes', color: '#d8d2bf', roughness: .6, metalness: .25 });
  const pvc = new T.MeshStandardMaterial({ name: 'White PVC pipes and conduits', color: '#e9e7df', roughness: .5 });
  const red = new T.MeshStandardMaterial({ name: 'Red fittings', color: '#b3241e', roughness: .5 });
  const black = new T.MeshStandardMaterial({ name: 'Black rubber and hands', color: '#16181a', roughness: .7 });
  const navy = new T.MeshStandardMaterial({ name: 'Navy clock face', color: '#1f2748', roughness: .45 });
  const cloth = new T.MeshStandardMaterial({ name: 'Maroon table cloth', map: P.clothTexture('#7e1820'), roughness: .95, side: T.DoubleSide });
  const table = new T.MeshStandardMaterial({ name: 'Dark stained table wood', map: P.woodTexture('#4a3322', { worn: 1 }), roughness: .55 });
  const rawWood = new T.MeshStandardMaterial({ name: 'Unpolished table frame wood', map: P.woodTexture('#a3825c', { worn: 2 }), roughness: .85 });
  const plastic = new T.MeshStandardMaterial({ name: 'White plastic chairs', map: P.plasticTexture('#ebe9e0'), roughness: .42 });
  const put = (g, material, x = 0, y = 0, z = 0, ry = 0) => { if (ry) g.rotateY(ry); g.translate(x, y, z); add(g, material); };
  const kraft = new T.MeshStandardMaterial({ name: 'Cardboard', map: P.kraftTexture(), roughness: .9 }), tape = new T.MeshStandardMaterial({ name: 'Packing tape', color: '#c8a46a', roughness: .3 });
  const canMat = new T.MeshStandardMaterial({ name: 'Water can', color: '#cfe3ea', roughness: .1, transparent: true, opacity: .45, depthWrite: false }); // plain alpha: transmission re-renders the whole scene
  const waterCan = () => new T.LatheGeometry([[0, 0], [.12, 0], [.13, .02], [.13, .34], [.1, .39], [.035, .41], [.035, .45], [0, .45]].map(([r, y]) => new T.Vector2(r, y)), 24);
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
  // Leaf of a panelled door, built about its hinge (props.js): stiles, rails, raised panels, hinges, pull and bolt.
  function doorLeaf(side, lw, h, panels, material) { const { paint, metal } = P.panelLeaf(lw, h, panels, -side); add(paint, material); add(metal, P.hardware().brass); }
  // Welded iron grille leaf about its hinge (props.js): flat-bar frame, round bars, arched head or grid, padlock.
  function grilleLeaf(side, lw, h, arched) { const { iron, lock } = P.grilleLeaf(lw, h, -side, arched); add(iron, grille); add(lock, P.hardware().steel); }
  // Wooden double door (panelled) closing an opening at u, optionally behind an iron grille gate. A leaf or gate that is
  // open is folded back flat against the passage wall beside the opening (outward, as the junction lab door is filmed).
  function labDoor(u, w, h, { grilleGate = true, arched = true, gateOpen = false, gateLeaves = 2, open = false, garland = false, panels = 4, material = doorWood } = {}) {
    for (const side of [-1, 1]) {
      const hinge = new T.Matrix4().makeRotationY(open ? side * (Math.PI - .1) : 0).setPosition(u + side * w / 2, F, open ? .07 : -.06);
      placed(hinge, () => doorLeaf(side, w / 2 - .01, h, panels, material));
    }
    put(P.doorFrame(w, h, .1), material, u, F, 0);
    if (!open) { const a = P.aldrop(.36); for (const [g, mat] of [[a.brass, P.hardware().brass], [a.steel, P.hardware().steel]]) put(g, mat, u - .18, at(1.0), -.035); } // aldrop and padlock across the meeting stiles (references 75, 76)
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
  // Dim room behind an opening, seen from the passage only (one-sided): from inside the room it is not there.
  function darkRoom(u, w, h, v0 = 0) { const g = new T.PlaneGeometry(w + .1, h + .1); g.translate(u, at(v0 + h / 2), -.55); add(g, dark); }
  // Small dark high window under the ceiling (clerestory), framed, with two mullions.
  function highWindow(w, h, v0) {
    for (const side of [-1, 1]) placed(new T.Matrix4().makeTranslation(side * w / 2, at(v0), -.06), () => doorLeaf(side, w / 2 - .005, h, 1, doorWood)); // shut timber leaves (owner, 2026-10-18: no glass)
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
  function tubeLight(u, h, material = tube) { const b = P.tubeBatten(); put(b.body, metalBox, u, at(h) + .03, .045); put(b.tube, material, u, at(h) + .03, .045); }
  function fuseBoxes(u, h, pipe = true) {
    for (const [du, dh, w, hh] of [[0, 0, .5, .46], [.52, .1, .36, .38], [-.02, -.55, .44, .3], [.46, -.46, .26, .34], [.2, .45, .3, .22]]) { const f = P.fuseBox(w, hh, .16); put(f.body, metalBox, u + du, at(h + dh), .08); put(f.metal, steel, u + du, at(h + dh), .08); }
    for (const du of [-.18, .05, .3]) rod([u + du, at(h + .25), .03], [u + du, at(3.0), .03], .018, pvc, 5);
    if (pipe) rod([u - .3, at(.05), .04], [u - .3, at(h - .7), .04], .022, pvc, 6); // service pipe down to the floor (photo 38)
  }
  function extinguisher(u, h) { const e = P.extinguisher(); put(e.shell, red, u, at(h) - .23, .1); put(e.black, black, u, at(h) - .23, .1); put(e.bracket, steel, u, at(h) - .23, .1); }

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
  const sill = .5, head = 2.95, eastDoor = { u: -8.8, w: 1.0 }; // tall panels, earth visible through the lowest openings (photos 33, 35)
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
    labDoor(0, 1.3, 2.15, { grilleGate: false, material: greyDoor, garland: true, panels: 5 }); // closed (owner, 2026-10-18)
    tubeLight(-.05, 2.36, tubeJunction);
    for (const [r, d, z, material] of [[.155, .02, .025, steel], [.145, .02, .035, navy]]) { const g = new T.CylinderGeometry(r, r, d, 28); g.rotateX(Math.PI / 2); g.translate(.78, at(2.42), z); add(g, material); }
    for (const y of [2.6, 2.98]) box(0, at(y), .02, 1.24, .05, .06, grille);
    for (const s of [-1, 1]) box(s * .6, at(2.79), .02, .05, .38, .06, grille);
    for (const t of [-.2, .2]) box(t, at(2.79), .0, .03, .38, .04, grille);
    for (const side of [-1, 1]) placed(new T.Matrix4().makeTranslation(side * .6, at(2.6), -.08), () => doorLeaf(side, .595, .38, 1, greyDoor)); // ventilator shutters, shut
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
  W(-4.3, () => { for (let k = 0; k <= 4; k++) rod([-.25 + k * .125, at(1.0), .02], [-.25 + k * .125, at(2.0), .02], .01, grille); for (const y of [1.0, 1.5, 2.0]) rod([-.25, at(y), .02], [.25, at(y), .02], .012, grille);
    placed(new T.Matrix4().makeTranslation(.25, at(1.0), -.05), () => doorLeaf(1, .5, 1.0, 2, doorWood)); }); // its timber shutter, shut
  W(-5.65, () => { // two-leaf window: green frame, horizontal bars (frames 102-104)
    for (const x of [-.65, 0, .65]) box(x, at(1.5), .0, .06, 1.3, .08, grille);
    for (const y of [.85, 2.15]) box(0, at(y), 0, 1.36, .06, .08, grille);
    for (let k = 1; k < 7; k++) rod([-.65, at(.85 + k * 1.3 / 7), .03], [.65, at(.85 + k * 1.3 / 7), .03], .01, grille);
    for (const x of [-.32, .32]) rod([x, at(.85), .03], [x, at(2.15), .03], .01, grille);
    for (const side of [-1, 1]) placed(new T.Matrix4().makeTranslation(side * .62, at(.88), -.05), () => doorLeaf(side, .615, 1.24, 2, doorWood)); // two timber leaves, shut (lab doors' wood)
  });
  W(doors.control, () => { labDoor(0, 1.1, 2.12, { arched: true, garland: true, panels: 5 }); darkRoom(0, 1.1, 2.12); // gate and door closed (owner, 2026-10-18)
    // Meter boxes high between the window and the door (frames 109-112), each clear of the others, the window and the sign.
    for (const [x, h, w, hh] of [[-1.35, 2.95, .5, .44], [-.8, 3.08, .34, .34], [-1.37, 2.4, .42, .28]]) { const f = P.fuseBox(w, hh, .16); put(f.body, metalBox, x, at(h), .08); put(f.metal, steel, x, at(h), .08); }
    for (const x of [-1.5, -1.2, -.8]) rod([x, at(3.2), .03], [x, at(3.6), .03], .018, pvc, 5); });
  W(doors.endBay, () => { labDoor(0, 1.05, 2.12, { arched: true }); darkRoom(0, 1.05, 2.12); });
  W(4.15, () => { // toran door: shut panelled leaves (owner, 2026-10-18: every door closed), mango leaves and a marigold string across its head
    for (const side of [-1, 1]) placed(new T.Matrix4().makeTranslation(side * .5, F, -.06), () => doorLeaf(side, .495, 2.1, 4, doorWood));
    put(P.doorFrame(1.0, 2.1, .1), doorWood, 0, F, 0);
    for (let i = 0; i < 34; i++) { const len = .22 + (i % 4) * .07 + (i < 12 ? .18 : 0), g = new T.PlaneGeometry(.07, len); g.rotateZ((i % 5 - 2) * .12); g.translate(-.55 + i * .033, at(2.12) - len / 2, .12 + (i % 2) * .02); add(g, leaf); } // bushier on the hinge side (frame 55)
    for (let i = 0; i <= 14; i++) { const g = new T.SphereGeometry(.035, 6, 4); g.translate(-.5 + i / 14, at(2.17), .13); add(g, i % 2 ? marigold : marigoldRed); }
  });
  W(.45, () => { fuseBoxes(0, 1.9); extinguisher(.5, 1.25); }); // meter and fuse boxes at the junction (photo 38)
  W(14.18, () => { labDoor(0, .96, 2.12, { grilleGate: false, panels: 5, material: greyDoor }); }); // DCS lab (closed: the leaves show from both sides)
  W(11.6, () => { const c = canvasMap(128, 256, (g, w, h) => { g.fillStyle = '#f3efe4'; g.fillRect(0, 0, w, h); g.fillStyle = '#b22a2a'; g.fillRect(8, 8, w - 16, 70); g.fillStyle = '#333'; for (let r = 0; r < 6; r++) for (let k = 0; k < 7; k++) g.fillRect(12 + k * 15, 96 + r * 24, 10, 14); }, false);
    const g = new T.PlaneGeometry(.32, .6); g.translate(0, at(1.55), .012); add(g, new T.MeshStandardMaterial({ name: 'Wall calendar', map: c, roughness: .9 })); }); // calendar (frame 57)
  for (const u of highWindows) W(u, () => highWindow(.72, .4, 2.5));
  for (const [u, fn] of westFit) placed(new T.Matrix4().set(0, 0, 1, inW, 0, 1, 0, 0, -1, 0, 0, u, 0, 0, 0, 1), fn); // local (x along wall, y, z into passage) -> world
  signs.push({ ...sign('INDUSTRIAL INSTRUMENTS LAB', doors.instruments + .7, 2.32), wall: 'w' }, { ...sign('CONTROL SYSTEMS LABORATORY', doors.control + .7, 2.32), wall: 'w' }, { ...sign('PROCESS CONTROL LAB', 3.02, 2.45, .5), wall: 'w' }, { ...sign('D C S LAB', 14.55, 2.3, .5), wall: 'w' });

  // East wall: the grilled courtyard door (one-leaf grid gate over a six-panel door, photo 34).
  placed(new T.Matrix4().set(0, 0, -1, inE, 0, 1, 0, 0, 1, 0, 0, eastDoor.u, 0, 0, 0, 1), () => labDoor(0, eastDoor.w, 2.12, { arched: false, gateLeaves: 1, panels: 6, material: greyDoor }));
  // Near the junction: ladder, cardboard box and bucket, table with steel vessels, pink bucket and water can, a leaning
  // plank before the pilaster (photos 36-38).
  put(P.woodTable(.55, 1.05, .8), table, inE - .3, F, -2.4);
  put(P.steelPot(.09, .18), steel, inE - .3, at(.8), -2.7); put(P.steelBowl(.08, .05), steel, inE - .32, at(.8), -2.45);
  put(P.steelPlate(.13), steel, inE - .28, at(.8), -2.2); put(P.steelTumbler(), steel, inE - .25, at(.8), -2.02); put(P.steelBowl(.06, .04), steel, inE - .25, at(.803), -2.2);
  put(P.rbox(.3, .1, .22, .02, 0, .05, 0), new T.MeshStandardMaterial({ name: 'Blue lidded box', color: '#2f62c4', roughness: .35 }), inE - .32, at(.8), -2.85);
  { const b = P.bucket(.16, .13, .3); put(b.body, new T.MeshStandardMaterial({ name: 'Pink bucket', color: '#e59aa8', roughness: .45 }), inE - .3, F, -2.2); put(b.handle, black, inE - .3, F, -2.2); }
  put(waterCan(), canMat, inE - .3, F, -2.6);
  put(P.stepLadder(2.05), steel, inE - .36, F, -.95, -Math.PI / 2);
  { const c = P.carton(.5, .44, .4); put(c.box, kraft, inE - .3, F, -.45); put(c.tape, tape, inE - .3, F, -.45); }
  { const b = P.bucket(.14, .12, .3); put(b.body, new T.MeshStandardMaterial({ name: 'Green bucket', color: '#2d6b5a', roughness: .45 }), inE - .2, F, -.05); put(b.handle, black, inE - .2, F, -.05); }
  { const g = P.board(.3, 1.3, .03); g.rotateY(Math.PI / 2); g.rotateZ(-.12); g.translate(inE - .1, at(.66), -3.05); add(g, new T.MeshStandardMaterial({ name: 'Leaning plank', map: P.woodTexture('#a3825c', { vertical: true, worn: 2 }), roughness: .85 })); }
  // Washing bay: concrete counter under the corner screens (north wall and east wall), a steel trough with two bowls,
  // a tap stand on the screen, buckets beneath; a water purifier and a raw wooden table frame (photo 33, frames 122-140).
  box((inW + inE) / 2 + .35, at(.8), inN + .28, inE - inW - .7, .07, .56, concrete);
  box(inE - .28, at(.8), (inN + .56 + ZB + .2) / 2, .56, .07, ZB + .2 - inN - .56, concrete);
  for (const x of [inW + .75, (inW + inE) / 2 + .2]) box(x, at(.38), inN + .28, .1, .76, .5, concrete);
  box(inE - .28, at(.38), ZB, .5, .76, .1, concrete);
  { const x = inE - .75, z = inN + .3, y = at(.7); put(P.rbox(.62, .012, .42, .004), steel, x, y, z); for (const s of [-1, 1]) { put(P.rbox(.012, .14, .42, .003), steel, x + s * .31, y + .07, z); put(P.rbox(.62, .14, .012, .003), steel, x, y + .07, z + s * .21); } put(P.rbox(.012, .12, .4, .003), steel, x, y + .06, z); } // two-bowl steel trough
  rod([inE - .75, at(.8), inN + .06], [inE - .75, at(1.55), inN + .06], .014, steel, 6);
  rod([inE - .75, at(1.55), inN + .06], [inE - .75, at(1.48), inN + .2], .012, steel, 6);
  { const b = P.bucket(.17, .14, .32); put(b.body, red, inE - .6, F, inN + .38); put(b.handle, black, inE - .6, F, inN + .38); }
  { const b = P.bucket(.15, .13, .38); put(b.body, plastic, inW + 1.2, F, inN + .32); put(b.handle, black, inW + 1.2, F, inN + .32); }
  put(waterCan(), new T.MeshStandardMaterial({ name: 'Beige can', color: '#d9c79a', roughness: .4 }), inE - .3, at(.84), -13.9);
  purifier(inE - .2, ZB + .55);
  put(P.woodTable(.6, .76, .97), rawWood, inW + .4, F, -13.0); // between the draped tables and the end-bay door, touching neither
  // Tables draped in maroon cloth with a white patterned top cloth along the west wall before the bay (frames 118-127).
  const motif = canvasMap(256, 256, (g, w, h) => {
    g.fillStyle = '#efe9dd'; g.fillRect(0, 0, w, h); g.fillStyle = '#8f1d24';
    for (let y = 32; y < h; y += 64) for (let x = 32; x < w; x += 64) { g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillRect(-12, -12, 24, 24); g.restore(); g.fillRect(x - 3, y - 22, 6, 44); g.fillRect(x - 22, y - 3, 44, 6); }
  }, true);
  const topCloth = new T.MeshStandardMaterial({ name: 'Patterned top cloth', map: motif, roughness: .95 });
  for (const z of [-10.9, -12.1]) { put(P.woodTable(.6, .98, 1.08, { shelf: false }), table, inW + .35, F, z); put(P.drapedCloth(.62, 1.0, 1.1, 1.06), cloth, inW + .35, F, z); const g = P.drapedCloth(.64, 1.02, 1.115, .18); const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 2, uv.getY(i) * 2); put(g, topCloth, inW + .35, F, z); }
  // Front passage: stacked white chairs and a wooden chair against the west wall after the toran door, one chair by the
  // screens opposite, a paper lantern overhead (frame 57).
  const chair = (z, n, material, side) => { for (let k = 0; k < n; k++) { // side -1: west wall, 1: east (screens); stacks nest
    const x = (side < 0 ? inW : inE) - side * (.34 + k * .015), ry = side < 0 ? Math.PI / 2 : -Math.PI / 2;
    put(material === plastic ? P.monoblocChair() : P.woodenChair(), material, x, F + k * .05, z, ry);
  } };
  chair(5.3, 4, plastic, -1); chair(6.15, 3, plastic, -1); chair(6.9, 1, table, -1); chair(9.4, 1, plastic, 1);
  cyl((inW + inE) / 2, southCeiling - .55, 6.6, .16, .16, .32, new T.MeshStandardMaterial({ name: 'Pink paper lantern', color: '#f0418a', emissive: '#5a0d2a', roughness: .8 }), 12);
  rod([(inW + inE) / 2, southCeiling - .38, 6.6], [(inW + inE) / 2, southCeiling, 6.6], .004, steel, 3);

  // Water cooler in the front corner (photos 39-41), modelled: a stainless cabinet on castors standing on a concrete
  // plinth, blue printed panels above and below a recessed tap bay with two push taps and two steel tumblers.
  // The panels' lettering, logos and Telugu text are drawn as printed (water-cooler-front.png, rectified); only the
  // printed photographs on them (two people drinking, the university building, the Sujalam kiosk) come from that photo.
  const coolerPictures = { woman: [0, 0, 430, 540], manFront: [430, 0, 480, 500], building: [910, 0, 560, 580], manSide: [1470, 0, 340, 440], kiosk: [1810, 0, 580, 640] };
  const picturesImage = typeof Image !== 'undefined' ? new Image() : null, panelRepaints = [];
  if (picturesImage) { picturesImage.onload = () => panelRepaints.forEach(f => f()); picturesImage.src = '/media/west-wing/cooler-pictures.webp'; }
  const printPanel = (kind, pw, ph) => {
    const W = kind === 'side' ? 340 : 512, H = Math.round(W * ph / pw);
    const paint = (g, w, h) => {
      const bg = g.createLinearGradient(0, 0, w * .3, h); bg.addColorStop(0, '#3d93e3'); bg.addColorStop(1, '#2672cc'); g.fillStyle = bg; g.fillRect(0, 0, w, h);
      const say = (s, x, y, size, { font = 'Arial, sans-serif', weight = 'bold', color = '#fff', align = 'center', width, stroke } = {}) => {
        g.font = `${weight} ${size}px ${font}`; g.textAlign = align; g.textBaseline = 'middle';
        const m = g.measureText(s)?.width, sx = width && m ? width / m : 1; g.save(); g.translate(x, y); g.scale(sx, 1);
        if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * .18 / sx; g.lineJoin = 'round'; g.strokeText(s, 0, 0); } g.fillStyle = color; g.fillText(s, 0, 0); g.restore(); };
      const logo = (x, y, rx) => { g.fillStyle = '#fff'; g.strokeStyle = '#c4161c'; g.lineWidth = rx * .09; g.beginPath(); g.ellipse(x, y, rx, rx * .62, 0, 0, Math.PI * 2); g.fill(); g.stroke();
        say("Divi's", x, y + rx * .04, rx * .62, { font: '"Brush Script MT", "Segoe Script", Georgia, serif', weight: 'italic bold', color: '#c4161c', width: rx * 1.35 }); };
      const drop = (x, y, s) => { const d = g.createLinearGradient(x - 20 * s, y - 40 * s, x + 20 * s, y + 30 * s); d.addColorStop(0, '#e2f5ff'); d.addColorStop(1, '#2f8ee6'); g.fillStyle = d; g.beginPath(); g.moveTo(x, y - 46 * s); g.bezierCurveTo(x + 8 * s, y - 20 * s, x + 26 * s, y, x + 24 * s, y + 14 * s); g.arc(x, y + 14 * s, 24 * s, 0, Math.PI); g.bezierCurveTo(x - 26 * s, y, x - 8 * s, y - 20 * s, x, y - 46 * s); g.fill(); g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.ellipse(x - 9 * s, y + 6 * s, 4 * s, 10 * s, .3, 0, Math.PI * 2); g.fill(); };
      const picture = (name, x, y, pw2, ph2) => { // printed photograph, its edges feathered into the panel's blue
        if (!picturesImage?.complete || !picturesImage.naturalWidth) return; const [sx, sy, sw, sh] = coolerPictures[name];
        const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(pw2)); c.height = Math.max(1, Math.round(ph2)); const p = c.getContext('2d');
        p.drawImage(picturesImage, sx, sy, sw, sh, 0, 0, c.width, c.height); p.globalCompositeOperation = 'destination-in';
        for (const [x0, y0, x1, y1] of [[0, 0, c.width, 0], [0, 0, 0, c.height]]) { const f = p.createLinearGradient(x0, y0, x1, y1); f.addColorStop(0, 'rgba(0,0,0,0)'); f.addColorStop(.07, '#000'); f.addColorStop(.93, '#000'); f.addColorStop(1, 'rgba(0,0,0,0)'); p.fillStyle = f; p.fillRect(0, 0, c.width, c.height); }
        g.drawImage(c, x, y); };
      const ink = (s, x, y, size) => say(s, x, y, size, { font: '"Segoe Print", "Comic Sans MS", cursive', weight: '', color: 'rgba(70,80,120,.75)' }); // marker on the print
      const water = (x, y, s, align = 'left') => { say('Safe', x + s * .05, y - s * .62, s * .26, { align, color: '#fff' }); say('Water', x, y, s * .62, { align, color: '#fff' }); say('Healthy Life', x + s * .08, y + s * .5, s * .22, { align, color: '#1d3f8f' }); };
      if (kind === 'top') {
        picture('woman', 0, h * .45, w * .54, h * .54); logo(w * .2, h * .135, w * .135);
        ink('88979 28802', w * .58, h * .03, h * .05);
        g.fillStyle = '#111'; g.fillRect(w * .8, h * .055, w * .13, h * .06); say('POWER ON', w * .845, h * .072, h * .016, { color: '#ddd', width: w * .07 }); say('RO ON', w * .845, h * .1, h * .016, { color: '#ddd', width: w * .05 });
        g.fillStyle = '#ff5a2a'; g.beginPath(); g.arc(w * .91, h * .085, h * .015, 0, Math.PI * 2); g.fill();
        say('Donated by', w * .6, h * .13, h * .03, { color: '#1d2f6f', width: w * .16 }); g.fillStyle = '#1d2f6f'; g.fillRect(w * .52, h * .15, w * .16, 1.5);
        say('Divis Laboratories Ltd.', w * .63, h * .195, h * .05, { color: '#d0202a', stroke: '#fff', width: w * .58 });
        water(w * .36, h * .45, h * .2); drop(w * .79, h * .72, h * .0043);
      }
      if (kind === 'bottom') {
        g.fillStyle = '#5aa7ee'; g.beginPath(); g.moveTo(0, h * .38); g.lineTo(w, h * .5); g.lineTo(w, h * .62); g.lineTo(0, h * .5); g.fill();
        g.fillStyle = '#3b2a8c'; g.beginPath(); g.moveTo(w * .45, h); g.lineTo(w, h * .55); g.lineTo(w, h); g.fill();
        picture('manFront', w * .4, h * .12, w * .6, h * .5); logo(w * .24, h * .17, w * .17);
        water(w * .1, h * .58, h * .26); drop(w * .67, h * .78, h * .0044);
      }
      if (kind === 'side') {
        logo(w * .2, h * .05, w * .09); logo(w * .9, h * .055, w * .06);
        say('రక్షిత మంచి నీరు', w * .55, h * .052, h * .022, { font: '"Nirmala UI", Gautami, "Noto Sans Telugu", sans-serif', color: '#1d2f6f', width: w * .5 });
        say('దివీస్ లాబొరేటరీస్ లిమిటెడ్', w * .5, h * .105, h * .024, { font: '"Nirmala UI", Gautami, "Noto Sans Telugu", sans-serif', color: '#d0202a', stroke: '#fff', width: w * .86 });
        ink('8897928802', w * .55, h * .14, h * .022);
        picture('building', 0, h * .165, w, h * .22);
        g.fillStyle = '#3b2a8c'; g.beginPath(); g.moveTo(w * .4, h * .64); g.lineTo(w, h * .52); g.lineTo(w, h * .64); g.fill();
        picture('manSide', w * .45, h * .36, w * .55, h * .17); water(w * .06, h * .45, h * .07); drop(w * .27, h * .565, h * .0013);
        picture('kiosk', 0, h * .6, w, h * .26);
        g.save(); g.translate(w * .5, h * .915); g.rotate(-.24); say('SAFE DRINKING WATER', 0, 0, h * .026, { width: w * .9 }); g.restore();
      }
    };
    const texture = canvasMap(W, H, paint);
    panelRepaints.push(() => { const c = texture.image, g = c.getContext('2d'); paint(g, c.width, c.height); texture.needsUpdate = true; });
    return texture;
  };
  {
    const cx = inE - .42, cz = inS - .42, cw = .62, cd = .5, base = at(.25 + .07), ch = 1.45;
    box(cx + .03, at(.125), cz + .02, .8, .25, .72, concrete); // plinth
    for (const dx of [-.26, .26]) for (const dz of [-.2, .2]) { cyl(cx + dx, at(.29), cz + dz, .03, .03, .05, black, 10); box(cx + dx, at(.31), cz + dz, .05, .02, .05, steel); }
    box(cx, base + ch / 2, cz + .07, cw, ch, .36, steel); // cabinet carcass, its face 0.14 behind the front: the tap bay is a recess
    const front = cz - cd / 2, panel = (kind, w, h, x, y, z, ry) => { const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ name: `Cooler ${kind} print`, map: printPanel(kind, w, h), roughness: .45 })); mesh.rotation.y = ry; mesh.position.set(x, y, z); fittings.add(mesh); };
    const bottomH = .5, bayH = .4, topH = ch - bottomH - bayH;
    box(cx, base + bottomH / 2, front + .03, cw, bottomH, .06, steel); box(cx, base + bottomH + bayH + topH / 2, front + .03, cw, topH, .06, steel);
    panel('bottom', cw - .05, bottomH - .04, cx, base + bottomH / 2, front - .002, Math.PI);
    panel('top', cw - .05, topH - .04, cx, base + bottomH + bayH + topH / 2, front - .002, Math.PI);
    panel('side', cd - .06, ch - .06, cx - cw / 2 - .002, base + ch / 2, cz + .02, -Math.PI / 2);
    for (const s of [-1, 1]) box(cx + s * (cw / 2 - .02), base + bottomH + bayH / 2, front + .03, .04, bayH, .06, steel); // tap bay cheeks
    box(cx, base + bottomH + .02, front + .07, cw - .08, .015, .1, steel); // drip grate
    for (const dx of [-.14, .14]) {
      cyl(cx + dx, base + bottomH + bayH - .1, front + .1, .016, .016, .05, steel, 8); box(cx + dx, base + bottomH + bayH - .13, front + .08, .02, .03, .06, black);
      put(P.steelTumbler(.04, .1), steel, cx + dx, base + bottomH + .03, front + .08); // steel tumbler on the grate
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
  { const g = P.board(.9, 1.7, .018); g.rotateX(-.04); g.translate(inE - .5, at(.85), inS - .06); add(g, plyMat); } // leaning on the gate
  // Below the outside walls (which start at the old floor datum, y = 0) the passage ends need their own plaster down to
  // the lowered floor: the north end under the washing-bay screen.
  // (The north end's filler is gone: the facade there is sunk with the floor, and the filler hid the screen's lower half.)
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
  const passageTubes = [[-1.85, 2.42, tubeJunction], [-4.9, 2.42, tubeCorridor], [-9.4, 2.42, tubeCorridor], [-12.9, 2.42, tubeCorridor]];
  for (const [u, h, mat] of passageTubes) placed(new T.Matrix4().set(0, 0, 1, inW, 0, 1, 0, 0, -1, 0, 0, u, 0, 0, 0, 1), () => tubeLight(0, h, mat));
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
    labTiles.repeat.set(5.58 / .3, 3.33 / .3);
    const room = new T.Mesh(new T.BoxGeometry(5.6, labH, 3.35), new T.MeshStandardMaterial({ color: '#bcd6dc', roughness: .9, side: T.BackSide })); room.position.set(cx, F + labH / 2, 1.775); // fits its room (0.1-3.45)
    const labFloor = new T.Mesh(new T.PlaneGeometry(5.58, 3.33), new T.MeshStandardMaterial({ map: labTiles, roughness: .35 })); labFloor.rotation.x = -Math.PI / 2; labFloor.position.set(cx, F + .004, 1.775);
    const cream = new T.MeshStandardMaterial({ color: '#d9d4c2', roughness: .6 }), frameMat = new T.MeshStandardMaterial({ color: '#c9c9c4', roughness: .5, metalness: .3 });
    const cabinet = new T.Mesh(P.rbox(.75, .85, .55, .02), cream); cabinet.position.set(XW - 1.0, F + 1.2, 2.6); // panel board on a wheeled frame
    lab.add(room, labFloor, cabinet);
    for (const dx of [-.34, .34]) for (const dz of [-.24, .24]) { const leg = new T.Mesh(new T.BoxGeometry(.035, .78, .035), frameMat); leg.position.set(XW - 1.0 + dx, F + .41, 2.6 + dz); lab.add(leg); }
    const shelf = new T.Mesh(new T.BoxGeometry(.72, .03, .52), frameMat); shelf.position.set(XW - 1.0, F + .2, 2.6); lab.add(shelf);
    const pump = new T.Mesh(new T.SphereGeometry(.15, 16, 12), new T.MeshStandardMaterial({ color: '#2a52b8', roughness: .4 })); pump.position.set(XW - 1.0, F + .45, 2.6); lab.add(pump);
    const mat = new T.Mesh(new T.BoxGeometry(.4, .012, .62), black); mat.position.set(XW - .45, F + .01, 2.15); lab.add(mat);
    const legs = new T.MeshStandardMaterial({ name: 'Lab stool wood', map: P.woodTexture('#6b4a2f'), roughness: .6 });
    for (const [x, z] of [[XW - 2.6, 1.3], [XW - 2.6, 3.1], [XW - 4.4, 1.3]]) {
      const bench = new T.Mesh(P.woodTable(1.8, .7, .85), table); bench.position.set(x, F, z); lab.add(bench);
      for (const dx of [-.5, .1, .6]) { const st = new T.Mesh(P.stool(.52), legs); st.position.set(x + dx, F, z + .55); lab.add(st); }
    }
    for (const x of [XW - 2.7, XW - 4.7]) {
      const fan = new T.Group(); fan.position.set(x, F + labH - .35, 2.2);
      const hub = new T.Mesh(new T.CylinderGeometry(.09, .09, .12, 12), black); fan.add(hub); const down = new T.Mesh(new T.CylinderGeometry(.015, .015, .4, 6), black); down.position.y = .25; fan.add(down);
      for (let k = 0; k < 3; k++) { const blade = new T.Mesh(P.rbox(.6, .012, .11, .005), black); blade.position.set(Math.cos(k * 2.094) * .35, 0, Math.sin(k * 2.094) * .35); blade.rotation.y = -k * 2.094; fan.add(blade); }
      lab.add(fan);
    }
    const win = new T.Mesh(new T.PlaneGeometry(1.4, 1.0), new T.MeshBasicMaterial({ color: '#f2f7f4' })); win.rotation.y = Math.PI / 2; win.position.set(cx - 2.78, F + 1.6, 1.775); lab.add(win);
    for (let k = 0; k <= 6; k++) { const bar = new T.Mesh(new T.CylinderGeometry(.012, .012, 1.0, 8), grille); bar.position.set(cx - 2.76, F + 1.6, 1.075 + k * 1.4 / 6); lab.add(bar); }
    const tb = P.tubeBatten(), light = new T.Mesh(tb.tube, tube), batten = new T.Mesh(tb.body, metalBox); light.position.set(XW - 3, F + labH - .25, 2.2); batten.position.copy(light.position); lab.add(light, batten); fittings.add(lab);
  }

  // Signs (canvas text) projecting from the west wall beside their doors.
  for (const s of signs) for (const turn of [0, Math.PI]) { // projecting blade sign, readable from both directions along the corridor
    const mesh = new T.Mesh(new T.PlaneGeometry(s.width, s.width / 4), new T.MeshStandardMaterial({ map: s.map, roughness: .85 }));
    mesh.rotation.y = turn; mesh.position.set(inW + .06 + s.width / 2, at(s.h), s.u + (turn ? -.004 : .004)); fittings.add(mesh);
  }
  for (const s of signs) box(inW + .03, at(s.h + .14), s.u, .06, .03, .03, steel); // bracket

  const structure = new Set([plaster, tiles, stepStone, m.screen, m.blue, m.wall, m.trim, m.paving, concrete, ceilingMat, grille, doorWood, greyDoor, dark, glassDark]);
  // Rooms behind the doors (owner, 2026-10-17): the block is divided between the doors that open off the passage, each
  // room with whitewashed partitions, a pale tiled floor and a ceiling. Their contents were not filmed, so they are left
  // empty (the Process Control lab glimpse is the one furnished room). Partitions sit between neighbouring doors.
  { const x0 = -33.84, x1 = XW - .1, top = southCeiling, roomWall = new T.MeshStandardMaterial({ name: 'Room whitewash', color: '#e8e6dd', roughness: .92 }); // top: under the upstairs Class II/III floors
    for (const z of [9.6, 3.52, 0.03, -1.85, -6.9, -11.3]) box((x0 + x1) / 2, (F + top) / 2, z, x1 - x0, top - F, .12, roomWall);
    const roomTiles = canvasMap(128, 128, (g, w, h) => { g.fillStyle = '#d8d6cc'; g.fillRect(0, 0, w, h); g.strokeStyle = '#a9a79e'; g.lineWidth = 3; g.strokeRect(0, 0, w, h); }, true);
    const floorMat = new T.MeshStandardMaterial({ name: 'Room floor tiles', map: roomTiles, roughness: .4 });
    const strip = (xa, xb, za, zb) => { const g = new T.PlaneGeometry(xb - xa, zb - za); g.rotateX(-Math.PI / 2); g.translate((xa + xb) / 2, F + .002, (za + zb) / 2); const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .4, p.getZ(i) / .4); add(g, floorMat); };
    strip(x0, x1, ZN + .16, .09); strip(x0, x1, 3.46, ZS - .16); strip(x0, -30.24, .09, 3.46); // the lab glimpse has its own floor
    const ceil = new T.PlaneGeometry(x1 - x0, ZS - ZN - .32); ceil.rotateX(Math.PI / 2); ceil.translate((x0 + x1) / 2, top - .006, 0); add(ceil, ceilingMat);
    wall('x', XW - .105, ZN + .16, ZS - .16, F, top, westHoles, .01, roomWall); } // the passage wall's room side, whitewashed
  // Bake walls and screens with world-scale UVs (grime band at the floor), then merge everything by material.
  for (const g of walls) { const p = g.attributes.position, uv = g.attributes.uv; for (let i = 0; i < p.count; i++) uv.setXY(i, (p.getX(i) + p.getZ(i)) / 2.2, (p.getY(i) - F) / 3.3); add(g, plaster); }
  for (const [material, list] of batches) {
    const mesh = new T.Mesh(mergeGeometries(list.map(g => { const c = g.clone(); for (const name of Object.keys(c.attributes)) if (!['position', 'normal', 'uv', 'aPiece'].includes(name)) c.deleteAttribute(name); if (!c.attributes.uv) c.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); return c; })), material);
    mesh.name = material.name || 'West wing part'; mesh.castShadow = !material.transparent && material !== dark && material !== tube; mesh.receiveShadow = true;
    (structure.has(material) ? group : fittings).add(mesh);
  }
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  // Working tube lights (roomlights.js): each tube lights the passage, limited to it, on two switched circuits. The
  // switch plate sits beside the distribution boxes at the junction (photo 38 shows the electrics there; a separate
  // plate is not visible, so its exact place is estimated).
  {
    const bounds = new T.Box3(new T.Vector3(XW - .1, F - .2, ZN - .1), new T.Vector3(westWing.stepsTop + .2, F + ceilingHigh + .2, ZS + .1));
    const lights = createRoomLights('West wing passage', bounds), circuits = [{ material: tubeJunction, fittings: [] }, { material: tubeCorridor, fittings: [] }];
    const glow = tube.emissiveIntensity;
    const add = (circuit, x, y, z) => circuit.fittings.push(lights.add(new T.Vector3(x, y, z), 5, level => { circuit.material.emissiveIntensity = glow * Math.max(level, .03); }));
    add(circuits[0], inW + .08, at(2.36) + .03, 2.25);
    for (const [u, h, mat] of passageTubes) add(mat === tubeJunction ? circuits[0] : circuits[1], inW + .08, at(h) + .03, u);
    const { clickables } = makeSwitchboard(group, { name: 'West wing passage', position: [inW + .012, at(1.35), -.35], turn: Math.PI / 2,
      toggles: circuits.map(c => ({ get: () => c.fittings[0].on, set: on => c.fittings.forEach(f => lights.set(f, on)) })) });
    group.traverse(o => { if (o.isMesh) for (const mat of [o.material].flat()) lights.patch(mat); });
    group.userData.clickables = clickables;
    group.userData.update = dt => lights.update(dt);
  }
  group.userData = { ...group.userData, ...westWing, fittings, dispensers };
  return group;
}
