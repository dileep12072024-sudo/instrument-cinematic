import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stairs, terraceCovers } from './stair-layout.js';

export function buildTerraces(parent, m) {
  const group = new T.Group(); group.name = 'Reference terraces and roof stair enclosure'; parent.add(group);
  const batches = new Map();
  const add = (g, material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(g.index ? g.toNonIndexed() : g); };
  const box = (x, y, z, w, h, d, material = wall) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material); };
  const cylinder = (x, y, z, r, h, material) => { const g = new T.CylinderGeometry(r, r, h, 32); g.translate(x, y, z); add(g, material); };
  function tube(points, radius, material) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    add(new T.TubeGeometry(curve, points.length * 8, radius, 6, false), material);
  }
  let seed = 104806;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
  ctx.fillStyle = '#a7a698'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7500; i++) {
    ctx.fillStyle = i % 3 ? '#303b3333' : '#d9d1b744';
    ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 1 + random() ** 3 * 25, 1 + random() ** 3 * 18, random() * 6, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = 4;
  const roof = new T.MeshStandardMaterial({ name: 'Mottled terrace concrete', color: '#c7c5b6', map: texture, bumpMap: texture, bumpScale: .012, roughness: .92 });
  const wall = m.wall.clone(); wall.name = 'Weathered terrace plaster'; wall.color.set('#f0efdf'); wall.bumpScale = .008;
  const steel = new T.MeshStandardMaterial({ color: '#373d38', metalness: .55, roughness: .62 });
  const sheet = new T.MeshStandardMaterial({ color: '#c9d4d0', metalness: .3, roughness: .61, side: T.DoubleSide });
  const white = new T.MeshStandardMaterial({ color: '#e3e4dc', roughness: .64 });
  const black = new T.MeshStandardMaterial({ color: '#252b2b', roughness: .74 });
  const tile = new T.MeshStandardMaterial({ color: '#e1e1d8', roughness: .3, metalness: .03 });
  function floor(x, y, z, w, d, material = roof) {
    const g = new T.BoxGeometry(w, .12, d); g.translate(x, y - .06, z);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5);
    add(g, material);
  }
  function canopy(x, y, z, width, depth) {
    // Continuous sheet beneath the raised ribs keeps the roof weather-tight.
    box(x, y, z, width, .045, depth, sheet);
    for (let dx = -width / 2; dx <= width / 2; dx += .22) box(x + dx, y + .025, z, .038, .04, depth, sheet);
    for (const dz of [-depth / 2 + .12, 0, depth / 2 - .12]) box(x, y - .11, z + dz, width, .16, .075, steel);
  }
  function grille(x, y, z, width, height, rotation = 0, open = true) {
    const gate = new T.Group(); gate.name = 'Terrace double grille gate'; gate.position.set(x, y, z); gate.rotation.y = rotation; group.add(gate);
    for (const side of [-1, 1]) {
      const leaf = new T.Group(); leaf.position.x = side * width / 2; leaf.rotation.y = open ? -side * Math.PI / 2 : 0; gate.add(leaf);
      const part = (x, y, w, h) => { const mesh = new T.Mesh(new T.BoxGeometry(w, h, .028), steel); mesh.position.set(x, y, 0); leaf.add(mesh); };
      const centre = -side * width / 4;
      for (const dx of [0, -side * width / 2]) part(dx, height / 2, .036, height);
      for (const yy of [0, height / 2, height]) part(centre, yy, width / 2, .035);
      for (let dx = .14; dx < width / 2; dx += .14) part(-side * dx, height / 2, .014, height);
      for (let yy = .18; yy < height; yy += .22) part(centre, yy, width / 2, .012);
      part(-side * (width / 2 - .1), 1.1, .12, .045);
    }
  }
  function tank(x, y, z, radius, height, material, plinth = true) {
    if (plinth) cylinder(x, y + .25, z, radius + .28, .5, wall);
    const base = y + (plinth ? .5 : .04);
    cylinder(x, base + height / 2, z, radius, height, material);
    for (let yy = .16; yy < height; yy += .21) {
      const ring = new T.TorusGeometry(radius + .008, .018, 6, 40); ring.rotateX(Math.PI / 2); ring.translate(x, base + yy, z); add(ring, material);
    }
    const lid = new T.SphereGeometry(radius, 24, 12); lid.scale(1, .22, 1); lid.translate(x, base + height, z); add(lid, material);
    cylinder(x, base + height + .18, z, radius * .33, .1, material);
    tube([[x + radius, base + .15, z], [x + radius + .23, base + .15, z], [x + radius + .23, y + .08, z], [x + radius + .23, y + .08, z - 1.2]], .032, white);
  }
  function ac(x, y, z, rotation = 0) {
    const acGroup = new T.Group(); acGroup.name = 'Terrace condenser'; acGroup.position.set(x, y, z); acGroup.rotation.y = rotation; group.add(acGroup);
    const casing = new T.Mesh(new T.BoxGeometry(.98, .78, .4), white); casing.position.y = .49; acGroup.add(casing);
    const fan = new T.Mesh(new T.CircleGeometry(.29, 28), steel); fan.position.set(-.1, .49, .206); acGroup.add(fan);
    for (let i = -6; i <= 6; i++) {
      const bar = new T.Mesh(new T.BoxGeometry(.66, .012, .012), m.metal); bar.position.set(-.1, .49 + i * .045, .22); acGroup.add(bar);
    }
    for (const dx of [-.34, .34]) { const support = new T.Mesh(new T.BoxGeometry(.06, .12, .55), steel); support.position.set(dx, .06, 0); acGroup.add(support); }
  }
  // Front landings leave all three stair openings clear.
  for (const y of [stairs.first, stairs.second, stairs.top]) floor(0, y, 2.05, 7.6, 5.5, tile);
  // Library partition on the FRONT middle block, with the door near the west entrance.
  for (const [left, right] of [[-3.78, -3.12], [-1.98, 3.78]]) box((left + right) / 2, 5.95, 3.55, right - left, 3.81, .16, m.wall);
  box(-2.55, 7.24, 3.55, 1.14, 1.24, .16, m.wall);

  // The west/classroom roof is the lower open terrace.
  floor(-12.525, stairs.second, 0, 17.05, 6.5);
  floor(-21.525, stairs.second, -1.2125, .95, 4.075);
  floor(-21.525, stairs.second, 3.1125, .95, .275);
  floor(-28, 8.11, 0, 12, 30);
  for (let i = 0; i < 3; i++) floor(-21.225 - i * .35, stairs.second - (i + 1) * .1113, 1.9, .35, 2.15);
  grille(-3.92, stairs.second, 2.166667, 2.08, 2.55, -Math.PI / 2);
  const cover = terraceCovers[1]; canopy(cover.x, cover.top - .04, cover.z, cover.width, cover.depth);
  for (const z of [-.53, 3.33]) box(-6.17, 9.90, z, .06, 2.92, .06, steel);
  // Small terrace-side utility enclosure and its aluminium door.
  box(-5.35, 9.91, -.9, 2.5, 2.93, .16);
  box(-6.52, 9.91, -.04, .16, 2.93, 1.7);
  for (const x of [-6.1, -4.58]) box(x, 9.91, .80, .50, 2.93, .16);
  box(-5.34, 11.10, .80, 1.02, .55, .16);
  box(-5.34, 9.55, .83, .90, 2.15, .07, sheet);
  for (const dx of [-.48, .48]) box(-5.34 + dx, 9.55, .89, .045, 2.22, .05, white);
  box(-4.99, 9.50, .92, .035, .20, .04, steel);
  for (let i = 0; i < 33; i++) {
    const g = new T.BoxGeometry(.22, .095, .11); g.rotateY((random() - .5) * .18); g.translate(-7.5 + (i % 5) * .23, stairs.second + .05 + Math.floor(i / 5) * .10, 2.8 + (i % 2) * .13); add(g, m.brick);
  }
  for (const x of [-9, -12.5, -16, -19.5]) box(x, stairs.second + .68, -.9, .42, 1.36, .48);
  for (const z of [-10, -5, 0, 5, 10]) box(-25, 8.79, z, .42, 1.36, .48);
  tank(-17.1, stairs.second, -1.85, .74, 1.85, black, false);
  tank(-19.2, stairs.second, -1.85, .74, 1.85, black, false);
  tank(-23.45, 8.11, 3.9, .49, 1.12, white, false);
  for (const z of [-8, -4]) ac(-33.30, 8.25, z, Math.PI / 2);
  for (const x of [-29.7, -26.2]) ac(x, 8.25, -14.35, 0);
  tube([[-4.3, 8.62, 3.1], [-13, 8.62, 3.1], [-21.7, 8.62, 3.1], [-22.3, 8.3, 3.1], [-22.3, 8.3, 14]], .027, white);

  // Opposite corridor on the second floor: blue doors, open balustrade bays, three steps.
  const y = 8.704;
  floor(13.415, y, 2.166667, 17.17, 2.17, tile);
  for (let i = 0; i < 3; i++) box(4.13 + i * .28, stairs.second + (i + 1) * .0867 / 2, 2.166667, .28, (i + 1) * .0867, 2.16, tile);
  box(13, 11.79, 2.166667, 18, .14, 2.25, m.wall);
  box(13, 10.21, 1.02, 18, 3.01, .15, m.wall);
  for (const x of [6.4, 10.6, 14.8, 19]) {
    box(x, y + 1.14, 1.115, 1.03, 2.28, .07, m.blue);
    for (const dx of [-.54, .54]) box(x + dx, y + 1.15, 1.15, .045, 2.35, .06, steel);
    box(x - .38, y + 1.02, 1.18, .03, .20, .05, m.metal);
    box(x, y + 2.78, 1.12, .63, .29, .06, m.brick);
    for (let j = -2; j <= 2; j++) box(x + j * .11, y + 2.78, 1.16, .065, .14, .015, steel);
    box(x, 11.62, 2.17, 1.08, .03, .07, white);
  }
  box(13, 9.09, 3.25, 18, .78, .20, m.wall);
  box(13, 11.55, 3.25, 18, .58, .22, m.wall);
  for (let x = 4.2; x <= 22; x += 2.96) box(x, 10.25, 3.25, .34, 2.02, .24, m.wall);
  tube([[4.2, 9.72, 3.22], [21.8, 9.72, 3.22]], .034, m.metal);
  for (let x = 4.6; x < 22; x += .74) tube([[x, 9.49, 3.22], [x, 9.72, 3.22]], .019, m.metal);

  // Single upper stair and three-window landing sit under the metal-sheet headhouse.
  for (const side of [-1, 1]) box(side * 3.96, 14.07, -3.4, .16, 2.94, 7.0, m.wall);
  for (const x of [-2.31, 2.31]) box(x, 14.12, .20, 3.38, 2.88, .18, m.wall);
  box(0, 15.36, .20, 1.24, .42, .18, m.wall);
  const topCover = terraceCovers[0]; canopy(topCover.x, topCover.top - .04, topCover.z, topCover.width, topCover.depth);
  const blueDoor = new T.Group(); blueDoor.name = 'Open blue roof-access door'; blueDoor.position.set(-.61, stairs.top, .2); blueDoor.rotation.y = Math.PI * .52; group.add(blueDoor);
  const panel = new T.Mesh(new T.BoxGeometry(1.18, 2.45, .06), m.blue); panel.position.set(.59, 1.225, 0); blueDoor.add(panel);
  const handle = new T.Mesh(new T.BoxGeometry(.03, .2, .06), m.metal); handle.position.set(1.04, 1.13, -.06); blueDoor.add(handle);
  // Roof route steps down from the tower to the upper right-hand terrace.
  floor(3, stairs.top, 2.166667, 2, 2.17);
  for (let i = 0; i < 4; i++) floor(4.14 + i * .3, stairs.top - (i + 1) * .1425, 2.166667, .3, 2.17);
  floor(13, 12.11, 0, 18, 6.5); floor(26.5, 12.11, 0, 9, 33);
  tank(11, 12.11, -1.35, .82, 2.15, white);
  tank(15, 12.11, -1.35, .82, 2.15, white);
  const emptyBase = new T.Mesh(new T.TorusGeometry(.96, .13, 4, 40), wall); emptyBase.rotation.x = -Math.PI / 2; emptyBase.position.set(18.5, 12.38, -1.35); emptyBase.scale.z = 2.2; group.add(emptyBase);
  tank(27.5, 12.11, -9.8, .8, 1.65, black);
  const fallen = new T.Mesh(new T.CylinderGeometry(.83, .83, 1.5, 32), black); fallen.name = 'Disused tank on its side'; fallen.rotation.z = Math.PI / 2; fallen.position.set(29.2, 12.95, 11.3); group.add(fallen);
  for (const z of [-2.9, -2.75, -2.6]) tube([[4.4, 12.24, z], [20.8, 12.24, z], [23, 12.24, z], [23, 12.24, -15.9], [30, 12.24, -15.9]], .028, white);
  tube([[23.6, 12.18, -10], [27, 12.18, -3], [25, 12.18, 4], [29, 12.18, 8], [27, 12.18, 12]], .034, m.blue);
  const water = new T.MeshPhysicalMaterial({ color: '#53635c', transparent: true, opacity: .32, roughness: .14, metalness: .22, depthWrite: false });
  for (const [x, z, rx, rz] of [[27, -6, 2.7, 4], [26, 8, 2.4, 3.8], [-29, 6, 2.8, 3.1]]) {
    const puddle = new T.Mesh(new T.CircleGeometry(1, 32), water); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(rx, rz, 1); puddle.position.set(x, x < 0 ? 8.12 : 12.12, z); group.add(puddle);
  }
  for (const [material, gs] of batches) {
    const mesh = new T.Mesh(mergeGeometries(gs), material); mesh.castShadow = mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh); gs.forEach(g => g.dispose());
  }
  return group;
}
