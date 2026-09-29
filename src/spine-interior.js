import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint, groundSpine as layout } from './footprint.js';

// Facades only: photographs do not establish the rooms' internal partitions or contents.
export function buildSpineInterior(parent, m) {
  const group = new T.Group(); group.name = 'Ground-floor spine'; group.userData = { ...layout }; parent.add(group);
  const batches = new Map();
  function add(g, material) {
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(g.index ? g.toNonIndexed() : g);
  }
  function box(x, y, z, w, h, d, material) {
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material);
  }
  function tube(points, radius, material) {
    const vertices = points.map(p => new T.Vector3(...p));
    const curve = points.length === 2 ? new T.LineCurve3(...vertices) : new T.CatmullRomCurve3(vertices);
    add(new T.TubeGeometry(curve, points.length === 2 ? 1 : 20, radius, 6, false), material);
  }
  const blue = m.frame.clone(); blue.color.set('#708b95'); blue.roughness = .72;
  const inset = blue.clone(); inset.color.set('#526d76');
  const wire = new T.MeshStandardMaterial({ color: '#716e61', roughness: .95 });
  const glass = new T.MeshStandardMaterial({ color: '#bbc5b9', roughness: .29, metalness: .18 });
  const floorMap = m.floor.map.clone(); floorMap.repeat.set(23, 3); floorMap.needsUpdate = true;
  const floorMat = m.floor.clone(); floorMat.map = floorMap; floorMat.color.set('#bbc4b9'); floorMat.roughness = .28; floorMat.envMapIntensity = .4;
  const grout = new T.MeshStandardMaterial({ color: '#7a887e', roughness: .72 });
  for (const part of footprint.filter(p => p.type.includes('corridor'))) {
    const y = part.x > 0 ? layout.rightFloor : layout.hallFloor;
    const stepInset = part.x > 0 ? .7 : 0;
    const floor = new T.Mesh(new T.PlaneGeometry(part.width - stepInset, layout.corridorDepth), floorMat);
    floor.rotation.x = -Math.PI / 2; floor.position.set(part.x + stepInset / 2, y, layout.corridorCenter); floor.receiveShadow = true; group.add(floor);
    for (let x = part.x - part.width / 2 + stepInset; x < part.x + part.width / 2; x += .72) box(x, y + .002, layout.corridorCenter, .007, .002, layout.corridorDepth, grout);
    for (let z = layout.roomFront + .72; z < layout.front; z += .72) box(part.x + stepInset / 2, y + .002, z, part.width - stepInset, .002, .007, grout);
    const wallEnd = part.x > 0 ? 20.35 : part.x + part.width / 2;
    const wallStart = part.x - part.width / 2;
    box((wallStart + wallEnd) / 2, (y + 3.8) / 2, layout.roomFront, wallEnd - wallStart, 3.8 - y, .16, m.wall);
    box((wallStart + wallEnd) / 2, y + .12, layout.roomFront + .1, wallEnd - wallStart, .24, .045, m.tread);
    box(part.x, 3.86, layout.corridorCenter, part.width, .16, layout.corridorDepth, m.wall);
    box(part.x, .10, (layout.rear + layout.roomFront) / 2, part.width, .12, layout.roomDepth, m.tread);
  }
  // Three short rises into the right wing are visible at 10s in 095714.mp4.
  for (let i = 0; i < 3; i++) {
    const top = layout.hallFloor + (i + 1) * (layout.rightFloor - layout.hallFloor) / 3;
    box(3.95 + i * .30, (top + layout.hallFloor) / 2, layout.corridorCenter, .30, top - layout.hallFloor, layout.corridorDepth - .16, m.tread);
  }
  const front = layout.roomFront + .105, base = layout.rightFloor;
  const doorCenters = [5.45, 8.7, 11.05, 15.15, 17.6, 19.45];
  for (const [i, x] of doorCenters.entries()) {
    const timber = i === 0, width = timber ? 1.08 : 1.18, height = 2.14;
    box(x, base + height / 2, front, width + .15, height + .12, .07, timber ? m.entranceWood : inset);
    box(x, base + height / 2, front + .045, width, height, .045, timber ? m.doorPanel : blue);
    if (!timber) {
      box(x, base + height / 2, front + .077, .016, height, .014, inset);
      for (const side of [-1, 1]) for (let j = 0; j < 7; j++) {
        const px = x + side * width / 4, py = base + .18 + j * .285;
        box(px, py, front + .075, width / 2 - .09, .21, .02, inset);
        box(px, py, front + .088, width / 2 - .125, .175, .013, blue);
      }
    } else {
      box(x, base + 1.65, front + .076, .38, .30, .045, m.entranceWood);
      box(x, base + 1.65, front + .105, .32, .24, .016, glass);
    }
    tube([[x - .25, base + .93, front + .13], [x + .25, base + .93, front + .13]], .018, m.metal);
    box(x + .03, base + .84, front + .14, .08, .11, .045, m.metal);
    box(x, base + .012, front + .025, width + .12, .024, .26, m.paving);
  }
  for (const [x, width, columns] of [[7.02, 1.28, 3], [13.1, 1.22, 2]]) {
    box(x, base + 1.26, front + .006, width + .10, 1.36, .075, inset);
    box(x, base + 1.26, front + .05, width, 1.25, .025, glass);
    for (let col = 0; col <= columns; col++) box(x - width / 2 + col * width / columns, base + 1.26, front + .09, .038, 1.33, .055, blue);
    for (let row = 0; row <= 3; row++) box(x, base + .60 + row * .44, front + .09, width, .038, .06, blue);
    for (let row = 0; row < 12; row++) box(x, base + .65 + row * .11, front + .13, width, .015, .016, m.metal);
  }
  for (const x of [5.45, 7.02, 8.7, 11.05, 13.1, 15.15, 17.6, 20.1]) {
    box(x, 3.49, front + .005, .96, .36, .02, m.dark);
    box(x, 3.60, front + .08, .96, .18, .055, blue);
    for (let j = 0; j < 4; j++) box(x - .35 + j * .235, 3.60, front + .115, .19, .12, .01, inset);
  }
  for (const y of [3.04, 3.10, 3.19, 3.24]) tube([[4.12, y, front + .12], [12.7, y, front + .12], [21.75, y, front + .12]], .009, wire);
  tube([[8.5, 3.03, front + .14], [12.5, 2.94, front + .14], [16.5, 3.03, front + .14], [20.5, 2.96, front + .14]], .006, m.dark);
  for (const x of [8.05, 16.5]) {
    box(x, 2.45, front + .10, .25, .18, .075, m.paving);
    tube([[x, 2.55, front + .14], [x, 3.15, front + .14]], .012, wire);
  }
  // Room labels visible in the supplied images/footage; no invented room names.
  function sign(text, x, y, z, rotation, width) {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
    const c = canvas.getContext('2d'); c.fillStyle = '#e0dfd2'; c.fillRect(0, 0, 512, 96);
    c.fillStyle = '#18201e'; c.font = 'bold 46px Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 256, 48, 480);
    const map = new T.CanvasTexture(canvas); map.colorSpace = T.SRGBColorSpace;
    const mesh = new T.Mesh(new T.PlaneGeometry(width, width * 96 / 512), new T.MeshStandardMaterial({ map, roughness: .9 }));
    mesh.position.set(x, y, z); mesh.rotation.y = rotation; group.add(mesh);
  }
  sign('SIMULATION LAB', 5.45, base + 1.98, front + .085, 0, .98);
  box(21.88, base + 1.55, layout.corridorCenter, .12, 3.1, layout.corridorDepth, m.wall);
  box(21.80, base + 1.08, layout.corridorCenter, .065, 2.16, .92, m.entranceWood);
  sign('SEMINAR HALL', 21.71, base + 2.4, layout.corridorCenter, -Math.PI / 2, 1.05);
  // The photographed cross-passage beside the final room. Length fits the existing
  // interpreted shell; the footage establishes details, not surveyed dimensions.
  const passageX = 21.08, passageWidth = 1.46;
  const passageEnd = layout.rear + .2, passageLength = layout.roomFront - passageEnd;
  const passageZ = (layout.roomFront + passageEnd) / 2;
  group.userData.sidePassage = { x: passageX, end: passageEnd, width: passageWidth };
  const passageMap = floorMap.clone(); passageMap.repeat.set(2, 6); passageMap.needsUpdate = true;
  const passageMaterial = floorMat.clone(); passageMaterial.map = passageMap;
  const passageFloor = new T.Mesh(new T.PlaneGeometry(passageWidth, passageLength), passageMaterial);
  passageFloor.rotation.x = -Math.PI / 2; passageFloor.position.set(passageX, base, passageZ); passageFloor.receiveShadow = true; group.add(passageFloor);
  for (let z = passageEnd; z < layout.roomFront; z += .72) box(passageX, base + .002, z, passageWidth, .002, .007, grout);
  box(passageX, base + .002, passageZ, .007, .002, passageLength, grout);
  for (const side of [-1, 1]) {
    const x = passageX + side * passageWidth / 2;
    box(x, base + 1.55, passageZ, .12, 3.1, passageLength, m.wall);
    box(x - side * .07, base + .12, passageZ, .035, .24, passageLength, m.tread);
    tube([[x - side * .08, 3.25, layout.roomFront], [x - side * .08, 3.25, passageEnd]], .013, wire);
  }
  box(passageX, 3.86, passageZ, passageWidth, .16, passageLength, m.wall);
  box(passageX, base + 1.55, passageEnd, passageWidth, 3.1, .12, m.wall);
  box(passageX, base + 1.03, passageEnd + .075, .93, 2.06, .06, blue);
  for (const side of [-1, 1]) for (let row = 0; row < 6; row++) {
    box(passageX + side * .23, base + .2 + row * .33, passageEnd + .115, .37, .25, .025, inset);
  }
  tube([[passageX - .22, base + 1, passageEnd + .15], [passageX + .22, base + 1, passageEnd + .15]], .018, m.metal);
  box(passageX, base + .90, passageEnd + .16, .075, .10, .04, m.metal);
  sign('STRONG ROOM', passageX, base + 2.26, passageEnd + .08, 0, 1.02);
  // Upper hexagonal grille and the hinged leaf folded against the right wall.
  const gateZ = layout.roomFront + .035;
  box(passageX, base + 2.13, gateZ, passageWidth, .06, .06, blue);
  box(passageX, 3.73, gateZ, passageWidth, .045, .05, blue);
  for (const side of [-1, 1]) box(passageX + side * .70, 3.25, gateZ, .04, .99, .05, blue);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) {
    const x = passageX - .57 + col * .285, y = 2.98 + row * .25;
    const hex = [[x - .12, y, gateZ], [x - .06, y + .075, gateZ], [x + .06, y + .075, gateZ], [x + .12, y, gateZ], [x + .06, y - .075, gateZ], [x - .06, y - .075, gateZ], [x - .12, y, gateZ]];
    for (let edge = 1; edge < hex.length; edge++) tube([hex[edge - 1], hex[edge]], .008, blue);
    box(x, y + .125, gateZ, .015, .10, .02, blue);
  }
  const hingeX = passageX + .64, leafZ = gateZ - .52;
  for (const z of [gateZ, gateZ - 1.04]) box(hingeX, base + 1.02, z, .035, 2.04, .04, blue);
  for (const y of [base + .04, base + 1.2, base + 2.04]) box(hingeX, y, leafZ, .035, .04, 1.04, blue);
  for (let i = 1; i < 7; i++) box(hingeX, base + .62, gateZ - i * .148, .025, 1.2, .02, blue);
  for (const radius of [.16, .31, .47]) {
    const points = Array.from({ length: 17 }, (_, i) => { const a = i * Math.PI / 16; return [hingeX, base + 1.2 + Math.sin(a) * radius, leafZ + Math.cos(a) * radius]; });
    tube(points, .012, blue);
  }
  // Slim work tables seen along the left wall, leaving the walking line clear.
  for (const z of [-.15, -1.65]) {
    const x = passageX - .45;
    box(x, base + .76, z, .43, .055, 1.13, m.doorPanel);
    for (const dx of [-.16, .16]) for (const dz of [-.47, .47]) box(x + dx, base + .37, z + dz, .045, .74, .045, m.entranceWood);
    box(x, base + .24, z, .035, .045, 1.0, m.entranceWood);
  }
  const purple = new T.MeshStandardMaterial({ color: '#756075', roughness: .85 });
  for (const [z, material] of [[-.25, purple], [-1.9, m.paving]]) {
    box(passageX + .65, base + 1.05, z, .055, 2.1, .79, material);
    box(passageX + .61, base + 1.05, z, .018, 2.1, .018, blue);
    box(passageX + .60, base + .93, z, .04, .035, .30, m.metal);
  }
  for (const z of [-.35, -1.85]) {
    box(passageX - .65, base + 1.48, z, .04, 1.16, .97, inset);
    box(passageX - .62, base + 1.48, z, .025, 1.08, .89, glass);
    for (const dz of [-.46, 0, .46]) box(passageX - .59, base + 1.48, z + dz, .04, 1.16, .035, blue);
    for (let row = 0; row < 9; row++) box(passageX - .57, base + .96 + row * .13, z, .025, .013, .91, m.metal);
  }
  for (const z of [.20, -1.7]) {
    box(passageX, 3.55, z, .025, .4, .025, m.dark);
    box(passageX, 3.34, z, .14, .07, .14, m.dark);
    for (let blade = 0; blade < 3; blade++) {
      const g = new T.BoxGeometry(.10, .018, .36);
      g.translate(0, 0, .19); g.rotateY(blade * Math.PI * 2 / 3); g.translate(passageX, 3.30, z); add(g, m.dark);
    }
  }
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  return group;
}
