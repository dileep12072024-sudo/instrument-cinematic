import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint, groundSpine as layout, seminarPassage as passage } from './footprint.js';

// Visible circulation and closed room fronts only. Dimensions remain interpreted.
export function buildSpineInterior(parent, m) {
  const group = new T.Group(); group.name = 'Ground-floor spine'; group.userData = { ...layout, sidePassage: { ...passage } }; parent.add(group);
  const batches = new Map();
  let transform = new T.Matrix4();
  function add(g, material) {
    g.applyMatrix4(transform);
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g.index ? g.toNonIndexed() : g);
  }
  function box(x, y, z, w, h, d, material) {
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material);
  }
  function tube(points, radius, material) {
    const vertices = points.map(p => new T.Vector3(...p));
    const curve = points.length === 2 ? new T.LineCurve3(...vertices) : new T.CatmullRomCurve3(vertices);
    add(new T.TubeGeometry(curve, points.length === 2 ? 1 : 24, radius, 8, false), material);
  }
  function rectangle(w, h, x = 0, y = 0) {
    const s = new T.Shape(); s.moveTo(x - w / 2, y - h / 2); s.lineTo(x + w / 2, y - h / 2);
    s.lineTo(x + w / 2, y + h / 2); s.lineTo(x - w / 2, y + h / 2); s.closePath(); return s;
  }
  function extrude(shape, x, y, z, depth, material, bevel = .003) {
    const g = new T.ExtrudeGeometry(shape, { depth, steps: 1, bevelEnabled: bevel > 0, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 2, curveSegments: 1 });
    g.translate(x, y, z - depth); add(g, material);
  }
  function frame(x, y, z, w, h, border, depth, material) {
    const s = rectangle(w, h); s.holes.push(rectangle(w - border * 2, h - border * 2));
    extrude(s, x, y, z, depth, material);
  }
  function onWall(x, z, angle, build) {
    const previous = transform;
    transform = new T.Matrix4().makeRotationY(angle); transform.setPosition(x, 0, z); build(); transform = previous;
  }
  // Shared fine-scale paint wear, rather than stretching plaster across the joinery.
  let seed = 101625;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d'); ctx.fillStyle = '#e1e1e1'; ctx.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 2200; i++) {
    ctx.fillStyle = `rgba(50,50,50,${random() * .10})`; ctx.fillRect(random() * 256, random() * 512, .5 + random(), 1 + random() * 35);
  }
  for (let i = 0; i < 130; i++) {
    ctx.fillStyle = '#adadad55'; ctx.fillRect(random() * 256, random() * 512, 1 + random() * 3, 1 + random() * 5);
  }
  const paint = new T.CanvasTexture(canvas); paint.colorSpace = T.SRGBColorSpace; paint.wrapS = paint.wrapT = T.RepeatWrapping; paint.anisotropy = 4;
  const blue = new T.MeshStandardMaterial({ name: 'Worn blue-grey painted timber', color: '#93a7ac', map: paint, bumpMap: paint, bumpScale: .0015, roughness: .48 });
  const inset = blue.clone(); inset.color.set('#81969b');
  const darkWood = m.entranceWood.clone(); darkWood.color.set('#4c4435');
  const wire = new T.MeshStandardMaterial({ color: '#99958a', roughness: .85 });
  const glass = new T.MeshPhysicalMaterial({ color: '#a2b5ad', roughness: .16, metalness: .05, clearcoat: .8, envMapIntensity: 1.2 });
  const daylightGlass = glass.clone(); daylightGlass.transparent = true; daylightGlass.opacity = .23; daylightGlass.depthWrite = false;
  const tile = document.createElement('canvas'); tile.width = tile.height = 512;
  const tileContext = tile.getContext('2d'); tileContext.drawImage(m.floor.map.image, 0, 0, 512, 512);
  tileContext.strokeStyle = '#7b8278'; tileContext.lineWidth = 3.5; tileContext.strokeRect(0, 0, 512, 512);
  const floorMap = m.floor.map.clone(); floorMap.image = tile; floorMap.repeat.set(1, 1); floorMap.needsUpdate = true;
  const floorMat = m.floor.clone(); floorMat.map = floorMap; floorMat.color.set('#bdc5b9'); floorMat.roughness = .29; floorMat.envMapIntensity = .18;
  const skirting = floorMat.clone(); skirting.color.set('#767c73'); skirting.roughness = .34;
  const base = layout.rightFloor, front = layout.roomFront;
  const doorCenters = [5.45, 8.7, 11.05, 15.15, 17.6, 20.1];
  const windows = [[7.02, 1.28, 3], [13.1, 1.22, 2]];
  const vents = [...doorCenters, ...windows.map(w => w[0])];

  function floor(x, z, width, depth, y) {
    const g = new T.PlaneGeometry(width, depth); g.rotateX(-Math.PI / 2); g.translate(x, y, z);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .72, p.getZ(i) / .72);
    add(g, floorMat);
  }
  function wall(x, z, angle, width, bottom, top, openings = [], material = m.wall, depth = .18) {
    onWall(x, z, angle, () => {
      const shape = rectangle(width, top - bottom, 0, (bottom + top) / 2);
      for (const o of openings) shape.holes.push(rectangle(o.w, o.h, o.x, o.y));
      extrude(shape, 0, 0, 0, depth, material, 0);
    });
  }
  function latch(x, y, z, width = .40) {
    tube([[x - width / 2, y, z], [x + width / 2, y, z]], .012, m.metal);
    for (const dx of [-width * .38, .05, width * .38]) {
      box(x + dx, y, z - .014, .028, .085, .014, m.metal);
      tube([[x + dx, y - .02, z], [x + dx, y + .02, z]], .017, m.metal);
    }
    tube([[x + .05, y - .055, z], [x + .04, y - .024, z], [x + .075, y - .024, z], [x + .09, y - .055, z]], .006, m.metal);
    const lock = new T.CylinderGeometry(.029, .029, .023, 16); lock.rotateX(Math.PI / 2); lock.translate(x + .065, y - .078, z); add(lock, m.metal);
  }
  function panelDoor(x, bottom, z, width, height, rows = 7) {
    frame(x, bottom + height / 2, z + .012, width + .12, height + .08, .062, .10, blue);
    for (const side of [-1, 1]) {
      const w = width / 2 - .006, cx = x + side * width / 4;
      const leaf = rectangle(w, height - .022);
      const weights = rows === 5 ? [.40, .15, .15, .15, .15] : Array(rows).fill(1 / rows);
      let offset = .06;
      const panels = weights.map(weight => { const spacing = (height - .12) * weight, panel = { y: offset + spacing / 2, h: spacing - .065 }; offset += spacing; return panel; });
      const panelW = w - .11;
      for (const panel of panels) leaf.holes.push(rectangle(panelW, panel.h, 0, -height / 2 + panel.y));
      extrude(leaf, cx, bottom + height / 2, z, .038, blue);
      for (const panel of panels) {
        extrude(rectangle(panelW - .008, panel.h - .008), cx, bottom + panel.y, z - .012, .018, inset, .005);
      }
      for (const y of [bottom + .30, bottom + height - .30]) {
        box(cx + side * (w / 2 - .01), y, z + .012, .025, .095, .014, m.metal);
        tube([[cx + side * w / 2, y - .05, z + .021], [cx + side * w / 2, y + .05, z + .021]], .009, m.metal);
      }
    }
    latch(x, bottom + .97, z + .043);
  }
  function windowFrame(x, y, z, width, height, columns, transparent = false) {
    frame(x, y, z + .02, width + .09, height + .09, .045, .085, blue);
    for (let col = 0; col < columns; col++) for (let row = 0; row < 3; row++) {
      const cx = x - width / 2 + (col + .5) * width / columns, cy = y - height / 2 + (row + .5) * height / 3;
      frame(cx, cy, z, width / columns - .008, height / 3 - .008, .028, .038, blue);
      box(cx, cy, z - .024, width / columns - .065, height / 3 - .063, .004, transparent ? daylightGlass : glass);
    }
    for (let row = 0; row < 12; row++) tube([[x - width / 2, y - height / 2 + .055 + row * (height - .11) / 11, z + .037], [x + width / 2, y - height / 2 + .055 + row * (height - .11) / 11, z + .037]], .007, m.metal);
    box(x, y - height / 2 - .065, z + .015, width + .16, .055, .20, m.wall);
  }
  function ventilator(x, y, z) {
    // Shallow timber frame, four glazed lights and a tilted dark wooden lower flap.
    frame(x, y, z, .96, .39, .032, .045, darkWood);
    for (let col = 0; col < 4; col++) {
      const cx = x - .345 + col * .23;
      frame(cx, y + .065, z + .002, .223, .20, .021, .031, blue);
      box(cx, y + .065, z - .018, .18, .15, .005, glass);
    }
    const flap = new T.BoxGeometry(.90, .12, .018); flap.rotateX(-.48); flap.translate(x, y - .11, z + .022); add(flap, darkWood);
  }
  function seminarDoor() {
    frame(0, base + 1.08, .02, 1.07, 2.24, .055, .08, m.entranceWood);
    box(0, base + 1.08, -.015, .95, 2.14, .038, m.doorPanel);
    latch(-.29, base + 1, .02, .22); ventilator(0, 3.47, 0);
  }
  function sign(text, x, y, z, rotation, width, color = '#18201e') {
    const c = document.createElement('canvas'); c.width = 768; c.height = 128;
    const p = c.getContext('2d'); p.fillStyle = '#e5e1d6'; p.fillRect(0, 0, c.width, c.height);
    p.fillStyle = color; p.font = 'bold 60px Arial'; p.textAlign = 'center'; p.textBaseline = 'middle'; p.fillText(text, 384, 64, 730);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(new T.PlaneGeometry(width, width / 6), new T.MeshStandardMaterial({ map, roughness: .85 })); mesh.position.set(x, y, z); mesh.rotation.y = rotation; group.add(mesh);
  }

  for (const part of footprint.filter(p => p.type.includes('corridor'))) {
    const right = part.x > 0, y = right ? base : layout.hallFloor;
    const start = part.x - part.width / 2 + (right ? .7 : 0), end = right ? passage.terminalX : part.x + part.width / 2;
    floor((start + end) / 2, layout.corridorCenter, end - start, layout.corridorDepth, y);
    const wallStart = part.x - part.width / 2, wallEnd = right ? passage.x - passage.width / 2 : end, cx = (wallStart + wallEnd) / 2;
    const openings = right ? [
      ...doorCenters.map((x, i) => ({ x: x - cx, y: base + 1.08, w: i ? 1.18 : 1.08, h: 2.16 })),
      ...windows.map(([x, w]) => ({ x: x - cx, y: base + 1.28, w, h: 1.36 })),
      ...vents.map(x => ({ x: x - cx, y: 3.47, w: .96, h: .39 })),
    ] : [];
    wall(cx, front, 0, wallEnd - wallStart, y, 3.8, openings);
    let from = wallStart;
    for (const x of right ? doorCenters : []) { box((from + x - .67) / 2, y + .09, front + .019, x - .67 - from, .18, .036, skirting); from = x + .67; }
    box((from + wallEnd) / 2, y + .09, front + .019, wallEnd - from, .18, .036, skirting);
    box((start + end) / 2, 3.86, layout.corridorCenter, end - start, .16, layout.corridorDepth, m.wall);
  }
  box(13, base + .10, layout.front - .17, 18, .20, .035, skirting);
  box(13, layout.screenBottom - .025, layout.front - .06, 18, .05, .35, skirting);
  group.userData.screenSillAboveFloor = layout.screenBottom - base;
  for (let i = 0; i < 3; i++) {
    const top = layout.hallFloor + (i + 1) * (base - layout.hallFloor) / 3;
    box(3.95 + i * .30, (top + layout.hallFloor) / 2, layout.corridorCenter, .30, top - layout.hallFloor, layout.corridorDepth - .16, m.tread);
  }
  for (const [i, x] of doorCenters.entries()) {
    if (i) onWall(x, front + .005, 0, () => panelDoor(0, base + .012, 0, 1.17, 2.14));
    else {
      frame(x, base + 1.08, front + .02, 1.19, 2.24, .06, .09, m.entranceWood);
      box(x, base + 1.08, front - .018, 1.06, 2.14, .042, m.doorPanel);
      frame(x, base + 1.65, front + .012, .39, .29, .028, .036, m.entranceWood);
      box(x, base + 1.65, front + .002, .33, .23, .005, glass); latch(x - .30, base + .94, front + .05, .25);
    }
    box(x, base + .006, front, 1.27, .012, .24, m.paving);
  }
  for (const [x, w, columns] of windows) windowFrame(x, base + 1.28, front, w, 1.36, columns);
  for (const x of vents) ventilator(x, 3.47, front);
  for (const y of [3.03, 3.09, 3.18, 3.23]) tube([[4.1, y, front + .08], [13, y, front + .08], [22.1, y, front + .08]], .008, wire);
  tube([[8.5, 3.02, front + .10], [12.5, 2.91, front + .10], [16.5, 3.02, front + .10], [21.5, 2.92, front + .10]], .005, m.dark);
  for (let x = 4.3; x < 22; x += .8) box(x, 3.13, front + .07, .018, .24, .024, wire);
  for (const x of [8.05, 16.5]) { box(x, 2.46, front + .035, .19, .17, .04, m.paving); tube([[x, 2.55, front + .06], [x, 3.18, front + .06]], .01, wire); }
  sign('SIMULATION LAB', 5.45, base + 1.99, front + .025, 0, .95);

  const terminal = passage.terminalX;
  wall(terminal, layout.corridorCenter, -Math.PI / 2, layout.corridorDepth, base, 3.8, [{ x: 0, y: base + 1.08, w: .96, h: 2.16 }, { x: 0, y: 3.47, w: .96, h: .39 }]);
  onWall(terminal - .015, layout.corridorCenter, -Math.PI / 2, seminarDoor);
  sign('SEMINAR HALL', terminal - .03, base + 2.41, layout.corridorCenter, -Math.PI / 2, 1.1);
  group.userData.seminarHallMainEntrance = { x: terminal, z: layout.corridorCenter };

  const { x: px, width: pw, end, pierZ } = passage, length = front - end, middle = (front + end) / 2;
  const left = px - pw / 2, right = px + pw / 2, { windowZ, windowWidth } = passage;
  floor(px, middle, pw, length, base);
  const passageWindows = windowZ.map(z => ({ x: middle - z, y: base + 1.48, w: windowWidth, h: 1.72 }));
  wall(left, middle, Math.PI / 2, length, base, 3.8, passageWindows);
  // Exterior finish stays separate from the photographed interior plaster, with the same openings.
  wall(left - .185, middle, Math.PI / 2, length, base, 3.8, passageWindows, m.exteriorWall, .01);
  const fadedPanel = new T.MeshStandardMaterial({ color: '#9b8091', map: paint, roughness: .94 });
  box(left + .008, base + 1.55, -1.65, .015, 3.04, 2.85, fadedPanel);
  wall(right, middle, -Math.PI / 2, length, base, 3.8, [
    { x: -6.4 - middle, y: base + 1.48, w: .90, h: 1.40 },
    { x: passage.hallDoorZ - middle, y: base + 1.08, w: .96, h: 2.16 },
    { x: passage.hallDoorZ - middle, y: 3.47, w: .96, h: .39 },
  ]);
  box(px, 3.86, middle, pw, .16, length, m.wall);
  // Continue to Electronics Lab opposite the Strong Room, alongside the exterior folding gate.
  const labLength = passage.labEnd - layout.front, labMiddle = (passage.labEnd + layout.front) / 2;
  floor(px, labMiddle, pw, labLength, base);
  wall(right, labMiddle, -Math.PI / 2, labLength, base, 3.8);
  box(px, 3.86, labMiddle, pw, .16, labLength, m.wall);
  box(right - .025, base + .09, labMiddle, .05, .18, labLength, skirting);
  wall(px, passage.labEnd, Math.PI, pw, base, 3.8, [
    { x: 0, y: base + 1.08, w: .96, h: 2.16 }, { x: 0, y: 3.47, w: .96, h: .39 },
  ]);
  onWall(px, passage.labEnd - .015, Math.PI, () => {
    panelDoor(0, base + .012, 0, .95, 2.14); ventilator(0, 3.47, 0);
  });
  sign('ELECTRONICS LAB II', px, base + 2.41, passage.labEnd - .03, Math.PI, 1.1);
  group.userData.electronicsLabEntrance = { x: px, z: passage.labEnd };
  for (const side of [-1, 1]) {
    const runs = side < 0 ? [[end, front]] : [[end, passage.hallDoorZ - .54], [passage.hallDoorZ + .54, front]];
    for (const [a, b] of runs) box(px + side * (pw / 2 - .025), base + .09, (a + b) / 2, .05, .18, b - a, skirting);
    for (const y of [3.02, 3.09]) tube([[px + side * (pw / 2 - .025), y, front], [px + side * (pw / 2 - .025), y, end]], .009, wire);
  }
  for (const z of windowZ) onWall(left + .009, z, Math.PI / 2, () => {
    windowFrame(0, base + 1.48, 0, windowWidth, 1.72, 2, true);
    const original = transform.clone(); transform.multiply(new T.Matrix4().makeTranslation(.73, 0, .06)); transform.multiply(new T.Matrix4().makeRotationY(-.92));
    frame(-.35, base + 1.48, 0, .69, 1.67, .027, .032, blue);
    for (const dy of [-.28, .28]) box(-.35, base + 1.48 + dy, -.01, .64, .028, .03, blue);
    box(-.35, base + 1.48, -.015, .63, 1.61, .004, daylightGlass); transform = original;
  });
  onWall(right - .015, passage.hallDoorZ, -Math.PI / 2, seminarDoor);
  sign('SEMINAR HALL', right - .03, base + 2.41, passage.hallDoorZ, -Math.PI / 2, 1.1);
  group.userData.seminarHallEntrance = { x: right, z: passage.hallDoorZ };
  const cream = new T.MeshStandardMaterial({ color: '#b9b18a', roughness: .62, metalness: .15 });
  onWall(right - .015, -6.4, -Math.PI / 2, () => {
    frame(0, base + 1.48, .025, 1, 1.50, .045, .07, cream);
    box(0, base + 1.48, -.045, .90, 1.40, .008, glass);
    for (const x of [-.36, -.18, 0, .18, .36]) tube([[x, base + .79, .045], [x, base + 2.17, .045]], .007, cream);
    for (const y of [base + .92, base + 1.45, base + 2.04]) tube([[-.44, y, .045], [.44, y, .045]], .007, cream);
  });
  // Right-hand pier and low lintel create the recessed Strong Room bay.
  box(right - .17, base + 1.55, pierZ, .34, 3.1, .36, m.wall);
  box(right - .18, base + .10, pierZ, .36, .20, .38, skirting);
  wall(px, pierZ + .18, 0, pw, base + 2.25, 3.8, [{ x: 0, y: 3.47, w: .96, h: .39 }], m.wall, .36);
  group.userData.strongRoomPier = { x: right - .17, z: pierZ };
  group.userData.strongRoomDownstand = { bottom: base + 2.25, top: 3.8, depth: .36 };
  wall(px, end, 0, pw, base, 3.8, [{ x: .12, y: base + 1.09, w: 1.08, h: 2.18 }]);
  panelDoor(px + .12, base + .012, end + .015, 1.07, 2.16, 7); latch(px + .12, base + .61, end + .06);
  sign('STRONG ROOM APLA', px + .12, base + 2.36, end + .026, 0, 1.15, '#7b2027');
  onWall(px, pierZ + .185, 0, () => ventilator(0, 3.47, 0));

  const gateZ = front + .02, gateMetal = blue.clone(); gateMetal.color.set('#85918c'); gateMetal.metalness = .4;
  box(px, base + 2.13, gateZ, pw, .045, .045, gateMetal);
  for (const side of [-1, 1]) box(px + side * (pw / 2 - .02), 3.30, gateZ, .035, .96, .04, gateMetal);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
    const x = px - pw / 2 + .17 + col * (pw - .34) / 6, y = 2.95 + row * .22;
    const pts = [[-.12, 0], [-.06, .065], [.06, .065], [.12, 0], [.06, -.065], [-.06, -.065], [-.12, 0]];
    for (let i = 1; i < pts.length; i++) tube([[x + pts[i - 1][0], y + pts[i - 1][1], gateZ], [x + pts[i][0], y + pts[i][1], gateZ]], .006, gateMetal);
    box(x, y + .105, gateZ, .012, .08, .017, gateMetal); box(x, y + .105, gateZ, .095, .012, .017, gateMetal);
  }
  for (const side of [-1, 1]) {
    const hx = px + side * (pw / 2 - .10), leafZ = gateZ - .49;
    for (const z of [gateZ, gateZ - .98]) tube([[hx, base + .03, z], [hx, base + 2.10, z]], .016, gateMetal);
    for (const y of [base + .03, base + 1.19, base + 2.10]) tube([[hx, y, gateZ], [hx, y, gateZ - .98]], .015, gateMetal);
    for (let i = 1; i < 7; i++) tube([[hx, base + .05, gateZ - i * .14], [hx, base + 1.19, gateZ - i * .14]], .007, gateMetal);
    for (const r of [.15, .30, .45]) tube(Array.from({ length: 20 }, (_, i) => { const a = i * Math.PI / 19; return [hx, base + 1.19 + Math.sin(a) * r, leafZ + Math.cos(a) * r]; }), .010, gateMetal);
  }
  // Keep the deepest table clear of the projecting Strong Room pier at pierZ.
  for (const [z, width, depth] of [[-3.3, .72, 1.6], [-6.1, .60, 2.0], [-8.2, .62, 1.4]]) {
    const x = left + width / 2 + .10;
    const top = new T.ExtrudeGeometry(rectangle(width, depth), { depth: .028, bevelEnabled: true, bevelSize: .003, bevelThickness: .003, bevelSegments: 1, steps: 1 });
    top.rotateX(-Math.PI / 2); top.translate(x, base + .79, z); add(top, m.doorPanel);
    for (const dx of [-width * .40, width * .40]) for (const dz of [-depth * .42, depth * .42]) {
      const leg = new T.CylinderGeometry(.025, .019, .78, 4); leg.rotateY(Math.PI / 4); leg.translate(x + dx, base + .39, z + dz); add(leg, m.entranceWood);
    }
    for (const dx of [-width * .40, width * .40]) box(x + dx, base + .71, z, .032, .10, depth * .86, m.entranceWood);
    box(x, base + .22, z, width * .83, .028, .03, m.entranceWood);
  }
  for (const z of [-2.2, -6.8]) {
    tube([[left + .02, 3.63, z], [right - .02, 3.63, z]], .019, wire);
    tube([[px, 3.76, z], [px, 3.32, z]], .012, m.dark);
    const hub = new T.SphereGeometry(.13, 24, 12); hub.scale(1, .55, 1); hub.translate(px, 3.31, z); add(hub, m.dark);
    const cup = new T.CylinderGeometry(.09, .035, .10, 20); cup.translate(px, 3.70, z); add(cup, m.dark);
    for (let blade = 0; blade < 3; blade++) {
      const shape = new T.Shape(); shape.moveTo(-.025, .08); shape.lineTo(-.07, .49); shape.quadraticCurveTo(0, .60, .085, .49); shape.lineTo(.03, .08); shape.closePath();
      const g = new T.ExtrudeGeometry(shape, { depth: .006, bevelEnabled: false, curveSegments: 5 }); g.rotateX(Math.PI / 2); g.rotateY(blade * Math.PI * 2 / 3); g.translate(px, 3.30, z); add(g, m.dark);
    }
  }
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = !material.transparent; group.add(mesh); geometries.forEach(g => g.dispose());
  }
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  return group;
}
