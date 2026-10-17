import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import * as P from './props.js';
import { roomControls } from './roomlights.js';

// Local classroom-wing coordinates. Dimensions are fitted to the shell, not surveyed.
export const classThree = { minX: -1.085, maxX: 7.3, frontZ: -20.43, backZ: -29.82, ceiling: 6.25, platform: .16 };

export function classroomBuilder(parent, m, floorY, name) {
  const group = new T.Group(); group.name = `Class Room ${name} interior`; parent.add(group);
  const batches = new Map();
  function add(g, material) { const list = batches.get(material) || []; list.push(g.index ? g.toNonIndexed() : g); batches.set(material, list); }
  function box(x, y, z, w, h, d, material) {
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material);
  }
  function rod(a, b, radius, material) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b), delta = end.clone().sub(start);
    const g = new T.CylinderGeometry(radius, radius, delta.length(), 8);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize()));
    g.translate(...start.add(end).multiplyScalar(.5).toArray()); add(g, material);
  }
  let seed = 112017;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function texture(paint, w = 512, h = 512) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  // Glossy cream vitrified tiles with brown marble veining, 0.6 m (Class II photos 20261014_1225-1227 and video).
  const tileMap = texture((c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#e6dccb'); g.addColorStop(1, '#d9cbb4'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 26; i++) { // soft beige clouds
      c.fillStyle = `rgba(${190 + random() * 30},${170 + random() * 25},${140 + random() * 25},${.16 + random() * .2})`;
      c.beginPath(); c.ellipse(random() * w, random() * h, 20 + random() * 90, 6 + random() * 30, random() * 3, 0, Math.PI * 2); c.fill();
    }
    for (let i = 0; i < 22; i++) { // long brown veins with thinner branches
      let x = random() * w, y = random() * h; const a = -.6 + random() * .5, len = 20 + random() * 30;
      c.strokeStyle = `rgba(${120 + random() * 40},${85 + random() * 30},${55 + random() * 20},${.45 + random() * .35})`; c.lineWidth = 1 + random() * 3.5;
      c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < len; k++) { x += Math.cos(a) * 9 + (random() - .5) * 8; y += Math.sin(a) * 9 + (random() - .5) * 8; c.lineTo(x, y); }
      c.stroke();
    }
    c.strokeStyle = 'rgba(150,140,125,.7)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); // grout
  });
  const tiles = new T.MeshStandardMaterial({ name: `Class ${name} marble-pattern tiles`, map: tileMap, roughness: .14, envMapIntensity: .8 }); // glossy: the lights reflect in it
  const oak = new T.MeshStandardMaterial({ name: 'Class III light timber benches', map: P.woodTexture('#c9a473', { worn: 1 }), roughness: .45 });
  const steel = new T.MeshStandardMaterial({ name: 'Class III black steel frames', color: '#252a25', metalness: .55, roughness: .48 });
  const cream = new T.MeshStandardMaterial({ color: '#e9e7de', roughness: .85 });
  const ceilingMat = new T.MeshStandardMaterial({ name: 'Class III acoustic ceiling', color: '#f4f4f0', roughness: .9, emissive: '#c8c8c0', emissiveIntensity: .35 }); // bright white panels, as photographed
  const seam = new T.MeshStandardMaterial({ color: '#a6aaa4', metalness: .35, roughness: .65 });
  const lightMat = new T.MeshStandardMaterial({ color: '#f5f7ed', emissive: '#eef5ea', emissiveIntensity: 1.7 });
  const fanMat = new T.MeshStandardMaterial({ color: '#553837', metalness: .35, roughness: .46 });
  const curtainMap = texture((c, w, h) => {
    c.fillStyle = '#632337'; c.fillRect(0, 0, w, h);
    c.fillStyle = '#d3c8b2'; c.fillRect(0, h * .13, w, h * .24);
    c.fillRect(0, h * .41, w, h * .025);
    c.fillStyle = '#752c43';
    for (let x = 25; x < w; x += 65) for (let y = h * .17; y < h * .34; y += 50) {
      for (let k = 0; k < 4; k++) { c.beginPath(); c.ellipse(x + Math.cos(k * Math.PI / 2) * 10, y + Math.sin(k * Math.PI / 2) * 10, 6, 12, k * Math.PI / 2, 0, Math.PI * 2); c.fill(); }
    }
  });
  const fabric = new T.MeshStandardMaterial({ name: 'Class III patterned maroon curtains', map: curtainMap, roughness: .95, side: T.DoubleSide });
  function tileSlab(x, z, w, d, top, height) {
    const g = new T.BoxGeometry(w, height, d); g.translate(x, top - height / 2, z);
    const { position: p, normal: n, uv } = g.attributes;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .6, (Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i)) / .6);
    add(g, tiles);
  }
  function transformed(matrix, draw) {
    const start = new Map([...batches].map(([mat, gs]) => [mat, gs.length]));
    draw();
    for (const [mat, gs] of batches) for (let i = start.get(mat) || 0; i < gs.length; i++) gs[i].applyMatrix4(matrix);
  }
  function bench(x, z, width, angle = 0) {
    const matrix = new T.Matrix4().makeRotationY(angle); matrix.setPosition(x, 0, z);
    transformed(matrix, () => {
      for (const [x, y, w, h] of [[-.18, .76, .40, .035], [.26, .45, .27, .035], [.43, .79, .035, .34]]) add(P.rbox(w, h, width, .008, x, floorY + y, 0), oak); // rounded timber edges
      for (const dz of [-width / 2 + .09, width / 2 - .09]) {
        for (const dx of [-.32, .38]) box(dx, floorY + .37, dz, .028, .74, .028, steel);
        box(.03, floorY + .035, dz, .78, .028, .028, steel);
        box(.04, floorY + .39, dz, .74, .028, .028, steel);
      }
      for (let z = -width / 2 + .06; z < width / 2 - .04; z += .035) box(-.18, floorY + .55, z, .35, .005, .005, steel);
      for (const dx of [-.35, -.18, 0]) box(dx, floorY + .55, 0, .006, .006, width - .10, steel);
    });
  }
  function finish() {
    for (const [material, geometries] of batches) {
      const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = true;
      group.add(mesh); geometries.forEach(g => g.dispose());
    }
    return group;
  }
  return { group, box, rod, add, texture, random, tileSlab, transformed, bench, finish, tiles, oak, steel, cream, ceilingMat, seam, lightMat, fanMat, fabric };
}

export function buildClassThree(parent, m, floorY) {
  const { group, box, rod, add, random, tileSlab, bench, finish, steel, cream, ceilingMat, seam, lightMat, fanMat, fabric } = classroomBuilder(parent, m, floorY, 'III');
  const { minX, maxX, frontZ, backZ, ceiling, platform } = classThree;
  const cx = (minX + maxX) / 2, cz = (backZ + frontZ) / 2, width = maxX - minX, depth = frontZ - backZ;
  tileSlab(cx, cz, width, depth, floorY, .16);
  tileSlab(-.16, -26.025, 1.5, 7.25, floorY + platform, platform);
  box(minX - .05, (floorY + ceiling) / 2, cz, .1, ceiling - floorY, depth, m.plaster);
  box(maxX + .05, (floorY + ceiling) / 2, cz, .1, ceiling - floorY, depth, m.plaster);
  for (let i = 0, x = minX; x < maxX; i++, x += .6) for (let j = 0, z = backZ; z < frontZ; j++, z += .6) {
    const w = Math.min(.6, maxX - x), d = Math.min(.6, frontZ - z);
    if (i === 10 && j === 12) {
      box(x + w / 2, ceiling + .16, z + d / 2, w, .02, d, steel);
    } else box(x + w / 2, ceiling + .045, z + d / 2, w, .09, d, ceilingMat);
  }
  for (let x = minX; x < maxX; x += .6) box(x, ceiling - .004, cz, .014, .014, depth, seam);
  for (let z = backZ; z < frontZ; z += .6) box(cx, ceiling - .004, z, width, .014, .014, seam);
  // Two corridor windows; the remaining wall and both doors belong to classroom-wing.js.
  function timberWindow(x, z, w, direction) {
    const h = 1.42, y = floorY + 1.66;
    if (direction > 0) box(x, y, z, w, h, .012, m.glass);
    for (let i = 0; i <= 3; i++) box(x - w / 2 + i * w / 3, y, z + direction * .025, .055, h + .06, .055, m.wood);
    for (let i = 0; i <= 3; i++) box(x, y - h / 2 + i * h / 3, z + direction * .025, w + .055, .045, .055, m.wood);
    const tiltedRod = direction < 0 && x === 2.5;
    rod([x - w * .65, y + h / 2 + .14, z + direction * .11], [x + w * .65, y + h / 2 + (tiltedRod ? -.22 : .14), z + direction * .11], .012, steel);
    for (const side of [-1, 1]) {
      const cw = w * (side < 0 ? .25 : .37), centre = x + side * (w / 2 - cw / 2);
      const g = new T.PlaneGeometry(cw, 1.55, 24, 6), p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setZ(i, Math.sin((p.getX(i) / cw + .5) * Math.PI * 12) * .035);
      if (tiltedRod) for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - .36 * ((p.getX(i) + centre - x) / (w * 1.3) + .5));
      g.computeVertexNormals(); g.translate(centre, y - .035, z + direction * .14); add(g, fabric);
    }
  }
  for (const x of [2.5, 4.6]) timberWindow(x, frontZ - .06, 1.5, -1);
  for (const x of [1.2, 3.55, 5.65]) box(x, (floorY + ceiling) / 2, frontZ - .12, .22, ceiling - floorY, .2, m.plaster);
  const exteriorWindows = [.15, 2.2, 4.25, 6.3], exteriorWidth = 1.48;
  const sill = floorY + .95, head = floorY + 2.37, wallTop = 7.46;
  box(cx, (floorY + sill) / 2, backZ - .08, width + .2, sill - floorY, .32, m.plaster);
  box(cx, (head + wallTop) / 2, backZ - .08, width + .2, wallTop - head, .32, m.plaster);
  let edge = minX - .1;
  for (const x of exteriorWindows) {
    const left = x - exteriorWidth / 2;
    box((edge + left) / 2, (sill + head) / 2, backZ - .08, left - edge, head - sill, .32, m.plaster);
    timberWindow(x, backZ + .09, exteriorWidth, 1);
    for (let u = -.65; u <= .65; u += .13) box(x + u, (sill + head) / 2, backZ + .015, .012, head - sill, .012, m.aluminium);
    for (let y = sill + .1; y < head; y += .16) box(x, y, backZ + .015, exteriorWidth, .012, .012, m.aluminium);
    edge = x + exteriorWidth / 2;
  }
  box((edge + maxX + .1) / 2, (sill + head) / 2, backZ - .08, maxX + .1 - edge, head - sill, .32, m.plaster);
  // Four outer windows and a front teaching platform, as seen from both ends of the room.
  const board = new T.MeshStandardMaterial({ color: '#244338', roughness: .75 });
  const display = new T.MeshStandardMaterial({ name: 'Class III teaching display', color: '#101b1b', roughness: .38, metalness: .05 });
  box(minX + .055, floorY + 1.85, -26.1, .10, 1.5, 4.4, steel);
  box(minX + .115, floorY + 1.85, -26.1, .025, 1.37, 4.25, board);
  box(minX + .14, floorY + 1.85, -25.55, .04, 1.25, 2.9, display);
  box(minX + .2, floorY + 1.08, -26.1, .22, .035, 4.4, m.aluminium);
  // Repeated benches share batched geometry, keeping the room inexpensive to draw.
  let deskCount = 0;
  const benchLines = [-21.68, -23.93, -26.33, -28.58], benchWidth = 1.55;
  for (let row = 0; row < 6; row++) for (const z of benchLines) {
    bench(1.65 + row * .86, z, benchWidth);
    deskCount++;
  }
  group.userData.deskCount = deskCount;
  group.userData.benchLines = benchLines;
  group.userData.benchWidth = benchWidth;
  const platformY = floorY + platform;
  box(-.02, platformY + .02, -25.35, .5, .04, .65, steel);
  box(-.02, platformY + .57, -25.35, .15, 1.1, .25, steel);
  box(-.02, platformY + 1.14, -25.35, .48, .045, .72, steel);
  rod([-.02, platformY + 1.15, -25.15], [-.13, platformY + 1.42, -25.10], .009, steel);
  box(-.02, platformY + .75, -28.15, .75, .06, 1.0, m.wood);
  for (const dx of [-.31, .31]) for (const dz of [-.43, .43]) box(-.02 + dx, platformY + .36, -28.15 + dz, .055, .72, .055, m.wood);
  box(-.45, platformY + .46, -29.1, .40, .07, .44, steel);
  box(-.69, platformY + .79, -29.1, .06, .58, .44, steel);
  for (const dz of [-.21, .21]) {
    rod([-.62, platformY + .43, -29.1 + dz], [-.27, platformY + .04, -29.1 + dz], .015, m.aluminium);
    rod([-.27, platformY + .04, -29.1 + dz], [-.7, platformY + .04, -29.1 + dz], .015, m.aluminium);
    box(-.47, platformY + .65, -29.1 + dz, .36, .035, .035, steel);
  }
  // Wall-mounted fans, their surface wiring, and switches visible in the room video.
  const wallRotors = [];
  for (const [x, z, direction] of [[.45, frontZ - .23, -1], [5.7, frontZ - .23, -1], [4.25, backZ + .28, 1]]) {
    const y = ceiling - .64;
    box(x, y - .12, z - direction * .11, .10, .28, .08, cream);
    for (const radius of [.09, .16, .23]) {
      const ring = new T.TorusGeometry(radius, .003, 4, 36); ring.translate(x, y, z); add(ring, seam);
    }
    for (let i = 0; i < 12; i++) {
      const a = i * Math.PI / 6;
      rod([x, y, z + direction * .035], [x + Math.cos(a) * .23, y + Math.sin(a) * .23, z], .002, seam);
    }
    // The blades turn: a rotor inside the guard, switched from the board by the door.
    const rotor = new T.Group(); rotor.position.set(x, y, z - direction * .025); rotor.userData.axis = 'z'; group.add(rotor); wallRotors.push(rotor);
    for (let i = 0; i < 3; i++) {
      const blade = new T.SphereGeometry(1, 10, 6), a = i * Math.PI * 2 / 3;
      blade.scale(.10, .045, .008); blade.rotateZ(a); blade.translate(Math.cos(a) * .1, Math.sin(a) * .1, 0); rotor.add(new T.Mesh(blade, steel));
    }
    box(x + .12, floorY + 1.6, z - direction * .1, .18, .1, .03, cream);
    rod([x + .12, floorY + 1.65, z - direction * .11], [x + .12, y - .2, z - direction * .11], .008, seam);
  }
  box(-.83, floorY + .42, -21.4, .4, .84, .55, steel);
  box(-.83, floorY + .89, -21.4, .3, .10, .35, cream);
  for (const [x, z, direction] of [[.15, backZ + .22, 1], [6.3, backZ + .22, 1], [2.5, frontZ - .22, -1]]) {
    box(x, ceiling - .65, z, 1.12, .32, .20, cream);
    box(x, ceiling - .77, z + direction * .105, .98, .035, .025, steel);
    for (let k = 0; k < 3; k++) box(x, ceiling - .70 - k * .024, z + direction * .115, .96, .008, .02, seam);
    box(x + .8, ceiling - .65, z - direction * .08, .16, .14, .06, cream);
    const cable = new T.CatmullRomCurve3([new T.Vector3(x + .4, ceiling - .78, z), new T.Vector3(x + .63, ceiling - .92, z), new T.Vector3(x + .8, ceiling - .7, z)]);
    add(new T.TubeGeometry(cable, 12, .007, 5, false), steel);
  }
  const fanRows = [[], [], []];
  for (const x of [.8, 3.35, 5.9]) for (const [row, z] of [-22.5, -25.4, -28.3].entries()) {
    rod([x, ceiling - .05, z], [x, ceiling - .48, z], .018, fanMat);
    const cup = new T.CylinderGeometry(.11, .045, .13, 16); cup.translate(x, ceiling - .09, z); add(cup, fanMat);
    const fan = m.fan.clone(true); fan.name = 'Class III ceiling fan rotor'; fan.position.set(x, ceiling - .5, z);
    fan.rotation.y = random() * Math.PI * 2; fan.traverse(o => { if (o.isMesh) o.material = fanMat; }); group.add(fan); fanRows[row].push(fan);
  }
  const panelRows = [-22.32, -25.32, -28.32].map(z => ({ material: lightMat.clone(), positions: [1.615, 4.615].map(x => [x, ceiling - .06, z]) }));
  for (const r of panelRows) for (const [x, , z] of r.positions) {
    box(x, ceiling - .018, z, .61, .025, .61, seam);
    box(x, ceiling - .035, z, .57, .015, .57, r.material);
  }
  const paperColors = ['#b43a87', '#c8af58', '#277ca5', '#389478'];
  const papers = paperColors.map(color => new T.MeshStandardMaterial({ color, roughness: .9, side: T.DoubleSide }));
  for (let i = 0; i < 18; i++) {
    const x = .4 + (i % 6) * 1.1, z = -23.4 - Math.floor(i / 6) * 2.25, drop = .22 + random() * .16;
    rod([x, ceiling, z], [x, ceiling - drop, z], .0015, seam);
    // Folded paper ornaments in the references, not solid coloured balls.
    for (let fold = 0; fold < 6; fold++) {
      const g = new T.CircleGeometry(.07, 12); g.scale(.85, 1.15, 1); g.rotateY(fold * Math.PI / 6);
      g.translate(x, ceiling - drop - .07, z); add(g, papers[i % papers.length]);
    }
  }
  rod([1.6, ceiling, -26.8], [1.6, ceiling - .85, -26.8], .025, m.aluminium);
  box(1.6, ceiling - .85, -26.8, .3, .025, .26, m.aluminium);
  const hangingCable = new T.CatmullRomCurve3([[1.63, ceiling, -26.8], [1.73, ceiling - .82, -26.82], [1.72, ceiling - 1.02, -26.8], [1.53, ceiling - .9, -26.8]].map(p => new T.Vector3(...p)));
  add(new T.TubeGeometry(hangingCable, 20, .007, 5, false), steel);
  const room = finish();
  fanRows.push(wallRotors); // the wall fans (above) on their own switch
  // Each panel lights the room, switchboard beside the entrance door, fans spin (roomlights.js).
  roomControls(room, { name: 'Class III', box: [minX, maxX, floorY, ceiling, backZ, frontZ], panelRows, fanRows,
    board: { position: [.5, floorY + 1.35, frontZ - .2], turn: Math.PI } });
  return room;
}
