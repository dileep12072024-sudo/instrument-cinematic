import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

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
  const wall = exterior.wall.clone(); wall.name = 'Aged entrance hall plaster'; wall.color.set('#ffffff'); wall.map = plaster; wall.bumpMap = plaster; wall.bumpScale = .008; wall.roughness = .98;
  const trim = new T.MeshStandardMaterial({ color: '#273a33', roughness: .58, metalness: .15 });
  const metal = new T.MeshStandardMaterial({ color: '#a5aaa0', metalness: .65, roughness: .38 });
  const recess = new T.MeshStandardMaterial({ color: '#607e9b', roughness: .96, map: exterior.wall.map });
  const floor = new T.Mesh(new T.PlaneGeometry(7.64, 13.6), floorMaterial);
  floor.name = 'Continuous tiled entrance floor'; floor.rotation.x = -Math.PI / 2; floor.position.set(0, .164, 0);
  floor.receiveShadow = true; group.add(floor);
  // Side doors open onto the cross-corridor; upper grilles remain fixed.
  for (const side of [-1, 1]) {
    const x = side * 3.79;
    box(x, 2.03, -3.74, .12, 3.72, 6.12, wall);
    box(x, 5.85, -3.74, .12, 4.2, 6.12, wall);
    box(x, 2.03, 2.715, .12, 3.72, .63, wall);
    box(x, 2.03, 6.055, .12, 3.72, 1.29, wall);
    box(x, .955, 4.22, .12, 1.58, 2.38, wall);
    box(x, 3.3925, 4.22, .12, .995, 2.38, wall);
    box(x, 3.79, .85, .12, .26, 3.1, wall);
    box(x - side * .07, .26, 4.55, .07, .2, 4.3, tread);
    box(x - side * .07, .26, -3.74, .07, .2, 6.12, tread);
    // The camera shows the passage mouth, not the rooms beyond it.
    box(side * 4.7, .125, .85, 1.75, .07, 3.1, tread);
    for (const z of [-.67, 2.37]) box(x, 1.55, z, .16, 2.78, .07, trim);
    box(x, 2.94, .85, .16, .08, 3.1, trim);
    for (let row = 0; row < 3; row++) for (let col = 0; col < 8; col++) {
      const cy = 3.08 + row * .24, cz = -.48 + col * .38;
      const pts = [[-.15, 0], [-.08, .09], [.08, .09], [.15, 0], [.08, -.09], [-.08, -.09], [-.15, 0]];
      for (let i = 1; i < pts.length; i++) rod([x, cy + pts[i - 1][1], cz + pts[i - 1][0]], [x, cy + pts[i][1], cz + pts[i][0]], .014, trim);
      rod([x, cy, cz + .15], [x, cy, cz + .23], .012, trim);
    }
    for (const z of [-.5, 2.18]) for (let j = 0; j < 6; j++) {
      box(x + side * (.02 + j * .018), 1.54, z + j * .025, .024, 2.7, .018, trim);
    }
  }
  box(0, 3.80, 4.25, 7.62, .08, 5.15, wall);
  // Twin stair flights and their solid sloping parapets, visible at 24-32s.
  const steps = 18, rise = .205, run = .33, startZ = .8;
  for (const side of [-1, 1]) {
    for (let i = 0; i < steps; i++) {
      const top = .164 + (i + 1) * rise, z = startZ - (i + .5) * run;
      box(side * 2.67, (top + .164) / 2, z, 2.02, top - .164, run, tread);
      box(side * 2.67, top + .005, z + run / 2 - .017, 2.02, .016, .035, exterior.trim);
    }
    const shape = new T.Shape(); shape.moveTo(startZ, .164); shape.lineTo(startZ, 1.12);
    shape.lineTo(startZ - steps * run, .96 + steps * rise); shape.lineTo(startZ - steps * run, .164); shape.closePath();
    const g = new T.ExtrudeGeometry(shape, { depth: .18, bevelEnabled: false, steps: 1 });
    g.rotateY(-Math.PI / 2); g.translate(side * 1.55 + .09, 0, 0); add(g, wall);
    rod([side * 1.55, 1.12, startZ], [side * 1.55, .96 + steps * rise, startZ - steps * run], .037, wall);
    box(side * 2.67, 3.78, -5.7, 2.02, .15, 1.1, tread);
  }
  // Only the underside of the central returning stair is evidenced by this clip.
  const soffit = new T.BoxGeometry(2.9, .17, 5.9); soffit.rotateX(-.46); soffit.translate(0, 4.1, -1.82); add(soffit, wall);
  box(0, 1.39, -4.65, 2.96, 2.45, .13, recess);
  box(0, 2.65, -4.55, 3.04, .12, .18, wall);
  const rear = new T.Group(); rear.name = 'Stair landing wall and narrow louvres'; group.add(rear);
  box(0, 6.5, -6.32, 7.58, 3.0, .14, wall);
  box(0, 2.14, -6.32, 7.58, 3.95, .14, wall);
  for (const side of [-1, 1]) {
    box(side * 1.1, 4.62, -6.32, 2.2, 1.02, .14, wall);
    box(side * 3.45, 4.62, -6.32, .7, 1.02, .14, wall);
    const glass = new T.MeshStandardMaterial({ color: '#c1d4c2', emissive: '#9bad91', emissiveIntensity: .35, roughness: .28 });
    box(side * 2.65, 4.64, -6.22, .82, 1.1, .03, glass);
    for (const s of [-1, 1]) box(side * 2.65 + s * .44, 4.64, -6.17, .055, 1.18, .09, trim);
    for (let k = 0; k <= 6; k++) box(side * 2.65, 4.11 + k * .18, -6.16, .88, .035, .1, trim);
  }
  // Stacked timber and a crate in the blue recess are visible, but no invented contents.
  for (let i = 0; i < 11; i++) {
    const g = new T.BoxGeometry(2.0 + rand() * .6, .025, .25 + rand() * .18);
    g.rotateY((rand() - .5) * .1); g.translate(.08, .24 + i * .035, -3.8 + (rand() - .5) * .35); add(g, exterior.doorPanel);
  }
  box(.12, .78, -4.03, 1.5, .35, .55, exterior.entranceWood);
  for (const x of [-.51, .75]) box(x, .78, -3.72, .08, .43, .05, exterior.doorPanel);
  const board = new T.BoxGeometry(.75, 1.6, .035); board.rotateZ(-.09); board.rotateX(-.12); board.translate(-1.26, .96, -2.8); add(board, exterior.doorPanel);

  // Five waiting seats are visible on one wall, with another bank on the opposite side.
  for (const side of [-1, 1]) {
    for (let i = 0; i < 5; i++) {
      const z = 2.95 + i * .62, x = side * 3.23;
      const seat = new T.BoxGeometry(.52, .045, .55); seat.translate(x - side * .15, .62, z); add(seat, metal);
      const back = new T.BoxGeometry(.045, .62, .55); back.rotateZ(side * -.12); back.translate(x + side * .16, .95, z); add(back, metal);
      if (i % 2 === 0) {
        rod([x, .52, z], [x, .23, z], .033, trim);
        rod([x - .3, .21, z], [x + .3, .21, z], .027, trim);
      }
      if (i === 0 || i === 2 || i === 4) {
        rod([x - side * .4, .7, z - .28], [x - side * .4, .9, z - .28], .025, trim);
        rod([x - side * .4, .9, z - .28], [x + side * .12, .9, z - .28], .028, trim);
      }
    }
    // Timber-framed interior notice/window bays; unreadable notices are left unlettered.
    for (let i = 0; i < 3; i++) {
      const z = 3.4 + i * .82;
      for (const edge of [-1, 1]) {
        box(side * 3.78, 2.32, z + edge * .35, .24, 1.15, .065, exterior.entranceWood);
        box(side * 3.78, 2.32 + edge * .55, z, .24, .05, .74, exterior.entranceWood);
      }
      box(side * 3.78, 2.32, z, .018, 1.04, .63, exterior.entranceGlazing);
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
  return { group, fan, floor, lights, stepsPerFlight: steps };
}
