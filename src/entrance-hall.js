import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundSpine } from './footprint.js';
import { buildSpineInterior } from './spine-interior.js';
import { buildStairways } from './stairways.js';

// Evidence and approximate dimensions: docs/entrance-video.md.
export function buildEntranceHall(parent, exterior) {
  const group = new T.Group(); group.name = 'Entrance hall from September walkthrough'; parent.add(group);
  const batches = new Map();
  function add(geometry, material) {
    if (!batches.has(material)) batches.set(material, []);
    batches.get(material).push(geometry.index ? geometry.toNonIndexed() : geometry);
  }
  function box(x, y, z, w, h, d, material) {
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material);
  }
  function rod(a, b, radius, material) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b);
    const g = new T.CylinderGeometry(radius, radius, start.distanceTo(end), 6);
    g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), end.clone().sub(start).normalize()));
    g.translate(...start.lerp(end, .5).toArray()); add(g, material);
  }
  let seed = 928;
  const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  function map(paint, width = 512, height = width) {
    const canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    paint(canvas.getContext('2d'), width, height);
    const texture = new T.CanvasTexture(canvas); texture.colorSpace = T.SRGBColorSpace;
    texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = 4; return texture;
  }
  const stone = map((c, w, h) => {
    c.fillStyle = '#293e39'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 17000; i++) {
      c.fillStyle = rand() > .5 ? '#d1d3b00b' : '#03191119';
      c.fillRect(rand() * w, rand() * h, 1 + rand() * 9, 1 + rand() * 4);
    }
    c.lineWidth = .7;
    for (let i = 0; i < 45; i++) {
      c.strokeStyle = i % 3 ? '#a0aa8b17' : '#bec6b623';
      let x = rand() * w, y = rand() * h; c.beginPath(); c.moveTo(x, y);
      for (let k = 0; k < 8; k++) { x += rand() * 16; y += (rand() - .45) * 14; c.lineTo(x, y); } c.stroke();
    }
    c.strokeStyle = '#afb5a477'; c.lineWidth = 1.4; c.strokeRect(0, 0, w, h);
  });
  const floorMap = stone.clone(); floorMap.repeat.set(10, 17); floorMap.needsUpdate = true;
  const floorMaterial = new T.MeshStandardMaterial({ name: 'Dark green stone entrance floor', color: '#69776b', map: floorMap, roughness: .36, metalness: 0, envMapIntensity: .08 });
  const tread = new T.MeshStandardMaterial({ name: 'Worn dark stone stair treads', color: '#adb7a6', map: stone, roughness: .46, envMapIntensity: .12 });
  const loader = new T.TextureLoader();
  const plaster = loader.load('/media/entrance-hall/plaster.webp'); plaster.colorSpace = T.SRGBColorSpace;
  plaster.wrapS = plaster.wrapT = T.RepeatWrapping; plaster.anisotropy = 4;
  // The video crop contains baked-in shade; use it only for fine surface relief, not paint colour.
  const wall = exterior.wall.clone(); wall.name = 'Aged entrance hall plaster'; wall.color.set('#fffdf5'); wall.bumpMap = plaster; wall.bumpScale = .002; wall.roughness = .94;
  const trim = new T.MeshStandardMaterial({ color: '#273a33', roughness: .58, metalness: .15 });
  const recess = new T.MeshStandardMaterial({ color: '#607e9b', roughness: .96, map: exterior.wall.map });
  const floor = new T.Mesh(new T.PlaneGeometry(7.64, 13.6), floorMaterial);
  floor.name = 'Continuous tiled entrance floor'; floor.rotation.x = -Math.PI / 2; floor.position.set(0, .164, 0);
  floor.receiveShadow = true; group.add(floor);
  // Side doors open onto the cross-corridor; upper grilles remain fixed.
  for (const side of [-1, 1]) {
    const x = side * 3.79;
    const { roomFront, front, corridorCenter, corridorDepth } = groundSpine;
    box(x, 2.03, (roomFront - 6.8) / 2, .12, 3.72, roomFront + 6.8, wall);
    box(x, 5.85, -3.74, .12, 4.2, 6.12, wall);
    // The window bay begins at 3.03; the passage now reaches the spine's front edge.
    box(x, 2.03, 6.055, .12, 3.72, 1.29, wall);
    box(x, .955, 4.37, .12, 1.58, 2.08, wall);
    box(x, 3.3925, 4.37, .12, .995, 2.08, wall);
    box(x, 3.79, corridorCenter, .12, .26, corridorDepth, wall);
    box(x - side * .07, .26, 4.55, .07, .2, 4.3, tread);
    box(x - side * .07, .26, -3.74, .07, .2, 6.12, tread);
    // The camera shows the passage mouth, not the rooms beyond it.
    box(side * 4.7, .125, corridorCenter, 1.75, .07, corridorDepth, tread);
    for (const z of [roomFront + .04, front - .04]) box(x, 1.55, z, .16, 2.78, .07, trim);
    box(x, 2.94, corridorCenter, .16, .08, corridorDepth, trim);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) {
      const cy = 3.08 + row * .24, cell = (corridorDepth - .12) / 8, cz = roomFront + .06 + (col + .5) * cell;
      const pts = [[-.4 * cell, 0], [-.2 * cell, .09], [.2 * cell, .09], [.4 * cell, 0], [.2 * cell, -.09], [-.2 * cell, -.09], [-.4 * cell, 0]];
      for (let i = 1; i < pts.length; i++) rod([x, cy + pts[i - 1][1], cz + pts[i - 1][0]], [x, cy + pts[i][1], cz + pts[i][0]], .014, trim);
      if (col < 7) rod([x, cy, cz + .4 * cell], [x, cy, cz + .6 * cell], .012, trim);
    }
    for (const z of [roomFront + .08, front - .23]) for (let j = 0; j < 6; j++) {
      box(x + side * (.02 + j * .018), 1.54, z + j * .025, .024, 2.7, .018, trim);
    }
  }
  box(0, 3.80, 4.25, 7.62, .08, 5.15, wall);
  group.userData.stairStartZ = groundSpine.roomFront;
  const stairways = buildStairways(group, { ...exterior, wall, tread });
  box(0, 1.23, -5.72, 2.96, 2.13, .13, recess);
  box(0, 2.32, -5.65, 3.04, .12, .18, wall);

  // At 48s the camera looks outward: both three-seat benches are on the entrance's right.
  const seating = new T.Group(); seating.name = 'Right-side waiting benches'; group.add(seating);
  seating.userData = { side: 'right on entering', benches: 2, seats: 6 };
  const perforations = map((c, w, h) => {
    c.fillStyle = '#c5c8c5'; c.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y++) {
      c.fillStyle = y % 3 ? '#ffffff08' : '#262e3212'; c.fillRect(0, y, w, 1);
    }
    c.globalCompositeOperation = 'destination-out';
    c.fillStyle = '#000000';
    for (let row = 0; row < 112; row++) for (let col = 0; col < 44; col++) {
      const x = 22 + col * 10.7 + (row % 2) * 5.35, y = 44 + row * 8.35;
      c.beginPath(); c.arc(x, y, 1.85, 0, Math.PI * 2); c.fill();
    }
  }, 512, 1024);
  const shellMetal = new T.MeshStandardMaterial({ name: 'Perforated brushed steel seating', map: perforations, color: '#c3c7c6', metalness: .72, roughness: .32, alphaTest: .5, side: T.DoubleSide });
  const edgeMetal = new T.MeshStandardMaterial({ name: 'Polished seat edging', color: '#b7bfc0', metalness: .9, roughness: .19 });
  const frameMetal = new T.MeshStandardMaterial({ name: 'Dark bench frame and armrests', color: '#222b2a', metalness: .65, roughness: .31 });
  const seatBatches = new Map();
  function seatPart(g, material) {
    if (!seatBatches.has(material)) seatBatches.set(material, []);
    seatBatches.get(material).push(g.index ? g.toNonIndexed() : g);
  }
  function seatTube(points, radius, material) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    seatPart(new T.TubeGeometry(curve, 32, radius, 8, false), material);
  }
  const profile = new T.CatmullRomCurve3([
    [2.84, .61, 0], [2.88, .65, 0], [3.12, .62, 0], [3.29, .65, 0],
    [3.36, .76, 0], [3.40, .94, 0], [3.46, 1.20, 0], [3.50, 1.31, 0],
  ].map(p => new T.Vector3(...p)));
  const rings = 48, columns = 12;
  for (let bench = 0; bench < 2; bench++) {
    const first = 3.58 + bench * 1.72, last = first + 1.08;
    const beam = new T.BoxGeometry(.085, .10, 1.65); beam.translate(3.19, .51, (first + last) / 2); seatPart(beam, frameMetal);
    for (let i = 0; i < 3; i++) {
      const z = first + i * .54, positions = [], uvs = [], indices = [];
      for (let row = 0; row <= rings; row++) {
        const t = row / rings, p = profile.getPoint(t), tangent = profile.getTangent(t);
        for (let col = 0; col <= columns; col++) {
          const u = col / columns, cup = .018 * (2 * u - 1) ** 2;
          positions.push(p.x - tangent.y * cup, p.y + tangent.x * cup, z + (u - .5) * .50);
          uvs.push(u, t);
          if (row < rings && col < columns) {
            const a = row * (columns + 1) + col, b = a + columns + 1;
            indices.push(a, b, a + 1, b, b + 1, a + 1);
          }
        }
      }
      const shell = new T.BufferGeometry(); shell.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
      shell.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); shell.setIndex(indices); shell.computeVertexNormals(); seatPart(shell, shellMetal);
      for (const edge of [-1, 1]) {
        const points = Array.from({ length: 25 }, (_, j) => {
          const p = profile.getPoint(j / 24), t = profile.getTangent(j / 24);
          return [p.x - t.y * .018, p.y + t.x * .018, z + edge * .251];
        });
        seatTube(points, .012, edgeMetal);
      }
      for (const t of [0, 1]) {
        const p = profile.getPoint(t);
        seatTube([[p.x, p.y, z - .25], [p.x, p.y, z], [p.x, p.y, z + .25]], .012, edgeMetal);
      }
    }
    for (const z of [first - .28, last + .28]) {
      seatTube([[3.27, .51, z], [3.16, .59, z], [2.88, .66, z], [2.87, .84, z], [3.05, .90, z], [3.36, .90, z]], .028, frameMetal);
    }
    for (const z of [first - .12, last + .12]) {
      seatTube([[3.19, .53, z], [3.20, .41, z], [3.18, .31, z]], .047, frameMetal);
      seatTube([[2.80, .20, z], [2.95, .28, z], [3.18, .33, z], [3.40, .28, z], [3.55, .20, z]], .034, frameMetal);
      for (const x of [2.80, 3.55]) {
        const foot = new T.SphereGeometry(.042, 12, 6); foot.scale(1.3, .30, 1); foot.translate(x, .184, z); seatPart(foot, frameMetal);
      }
    }
  }
  for (const [material, geometries] of seatBatches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material);
    mesh.name = material.name; mesh.castShadow = mesh.receiveShadow = true; seating.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  for (const side of [-1, 1]) {
    // Timber-framed interior notice/window bays; unreadable notices are left unlettered.
    for (let i = 0; i < 3; i++) {
      const z = 3.68 + i * .69;
      for (const edge of [-1, 1]) {
        box(side * 3.78, 2.32, z + edge * .31, .24, 1.15, .065, exterior.entranceWood);
        box(side * 3.78, 2.32 + edge * .55, z, .24, .05, .66, exterior.entranceWood);
      }
      box(side * 3.78, 2.32, z, .018, 1.04, .55, exterior.entranceGlazing);
      for (const offset of [-.15, .15]) box(side * 3.63, 2.32, z + offset, .035, 1.04, .015, trim);
    }
    box(side * 3.68, 3.26, 4.36, .06, .62, 1.5, exterior.entranceWood);
    for (let i = 0; i < 8; i++) box(side * 3.63, 3.03 + i * .067, 4.36, .03, .02, 1.39, exterior.doorPanel);
    box(side * 3.65, 2.8, 1.96, .08, .19, .24, exterior.paving);
    rod([side * 3.66, 2.88, 1.99], [side * 3.66, 3.64, 1.99], .012, wall);
  }
  // Thin security bars behind the fixed entrance sidelights, visible on looking back.
  for (const x of [-2.75, 2.75]) {
    for (let col = -2; col <= 2; col++) box(x + col * .36, 2.2, 6.92, .014, 1.98, .014, trim);
    for (let row = -3; row <= 3; row++) box(x, 2.2 + row * .28, 6.92, 1.88, .014, .014, trim);
  }
  const tubeMat = new T.MeshStandardMaterial({ color: '#fffceb', emissive: '#fffceb', emissiveIntensity: 1.7 });
  const lights = [];
  for (const side of [-1, 1]) {
    box(side * 3.60, 2.88, 4.65, .08, .06, 1.3, tubeMat);
    const light = new T.SpotLight('#fff4da', 7, 6, 1.25, .65, 2); light.position.set(side * 3.32, 2.86, 4.65);
    light.target.position.set(0, .2, 4.65); group.add(light, light.target); lights.push(light);
  }
  const fill = new T.PointLight('#e2e9db', 10, 11, 2); fill.position.set(0, 3.25, .7); group.add(fill); lights.push(fill);
  for (const light of lights) {
    light.castShadow = true; light.shadow.mapSize.set(256, 256); light.shadow.bias = -.0001; light.shadow.normalBias = .015;
    light.shadow.camera.near = .08; light.shadow.camera.far = light.distance;
    light.shadow.autoUpdate = false; light.shadow.needsUpdate = true;
    light.shadow.camera.layers.set(1);
  }
  // Use the actual photographed signs; do not fabricate their text or illustrations.
  for (const [side, file, width, height, z] of [[1, 'environment-notice', .86, 1.42, -1.1], [-1, 'department-notice', .65, 1.9, -.93]]) {
    const tex = loader.load(`/media/entrance-hall/${file}.webp`); tex.colorSpace = T.SRGBColorSpace;
    const notice = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map: tex, roughness: .9 }));
    notice.name = 'Notice photographed in entrance video'; notice.rotation.y = -side * Math.PI / 2;
    notice.position.set(side * 3.715, 2.25, z); group.add(notice);
  }
  const fan = new T.Group(); fan.name = 'Entrance ceiling fan'; fan.position.set(0, 3.35, 3.9); group.add(fan);
  const hub = new T.Mesh(new T.CylinderGeometry(.15, .13, .13, 16), trim); fan.add(hub);
  rod([0, 3.40, 3.9], [0, 3.76, 3.9], .022, trim);
  for (let i = 0; i < 3; i++) {
    const blade = new T.Mesh(new T.BoxGeometry(.60, .022, .13), trim); const angle = i * Math.PI * 2 / 3;
    blade.position.set(Math.cos(angle) * .37, 0, Math.sin(angle) * .37); blade.rotation.y = -angle; fan.add(blade);
  }
  const colors = ['#7a987d', '#b877a0', '#cdb773', '#71a1bb', '#dddccf'];
  const decorations = colors.map(color => new T.MeshStandardMaterial({ color, roughness: .8, side: T.DoubleSide }));
  for (let row = 0; row < 7; row++) {
    const z = 1.4 + row * .72;
    for (let j = 0; j < 18; j++) {
      const x = -3.55 + j * .40, y = 3.18 + .2 * (x / 3.6) ** 2;
      rod([x, y, z], [x + .4, 3.18 + .2 * ((x + .4) / 3.6) ** 2, z], .009, decorations[row % 5]);
    }
    for (let j = 0; j < 4; j++) {
      const x = -2.9 + j * 1.75 + (rand() - .5) * .35, y = 2.92 + rand() * .13;
      rod([x, y, z], [x, 3.2, z], .004, decorations[4]);
      for (let leaf = 0; leaf < 5; leaf++) {
        const g = new T.SphereGeometry(.075, 6, 4); g.scale(1, 1.4, .2); g.rotateY(leaf * Math.PI / 5); g.translate(x, y - .08, z); add(g, decorations[(row + j) % 5]);
      }
    }
  }
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  group.traverse(object => { if (object.isMesh) object.layers.enable(1); });
  buildSpineInterior(group, { ...exterior, exteriorWall: exterior.wall, wall, tread, floor: floorMaterial });
  return { group, fan, floor, lights, stepsPerFlight: stairways.userData.flights[0].sideSteps };
}
