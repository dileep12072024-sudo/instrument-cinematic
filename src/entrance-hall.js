import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundSpine, hallWindows } from './footprint.js';
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
  // Flat steel strip in a side-wall plane (constant x): grilles are flat bar, and a box is cheaper than a cylinder.
  function strip(a, b, width, material) {
    const dy = b[1] - a[1], dz = b[2] - a[2], g = new T.BoxGeometry(.012, width, Math.hypot(dy, dz));
    g.rotateX(-Math.atan2(dy, dz)); g.translate(a[0], (a[1] + b[1]) / 2, (a[2] + b[2]) / 2); add(g, material);
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
  // 14 October photographs (docs/entrance-video.md): the gate head sits at about half the clear height and
  // the hexagon grille fills the rest up to the beam, nine rows deep.
  const gateHead = 2.017, grilleTop = 3.66;
  for (const side of [-1, 1]) {
    const x = side * 3.79, win = hallWindows[side];
    const { roomFront, front, corridorCenter, corridorDepth } = groundSpine;
    box(x, 2.03, (roomFront - 6.8) / 2, .12, 3.72, roomFront + 6.8, wall);
    box(x, 5.85, -3.74, .12, 4.2, 6.12, wall);
    // Front stretch: solid wall around one steel window (hallWindows), from the passage edge to the facade.
    box(x, 2.03, (front + win.z0) / 2, .12, 3.72, win.z0 - front, wall);
    box(x, 2.03, (win.z1 + 6.7) / 2, .12, 3.72, 6.7 - win.z1, wall);
    box(x, (.17 + win.y0) / 2, (win.z0 + win.z1) / 2, .12, win.y0 - .17, win.z1 - win.z0, wall);
    box(x, (win.y1 + 3.89) / 2, (win.z0 + win.z1) / 2, .12, 3.89 - win.y1, win.z1 - win.z0, wall);
    box(x, 3.79, corridorCenter, .12, .26, corridorDepth, wall);
    box(x - side * .07, .26, 4.55, .07, .2, 4.3, tread);
    box(x - side * .07, .26, -3.74, .07, .2, 6.12, tread);
    // The camera shows the passage mouth, not the rooms beyond it.
    box(side * 4.7, .125, corridorCenter, 1.75, .07, corridorDepth, tread);
    for (const z of [roomFront + .04, front - .04]) box(x, (.164 + grilleTop) / 2, z, .16, grilleTop - .164, .07, trim);
    box(x, gateHead, corridorCenter, .16, .07, corridorDepth, trim);
    box(x, grilleTop - .02, corridorCenter, .16, .05, corridorDepth, trim);
    // Elongated hexagons in columns, tied vertically, with a cross between neighbours in each row.
    const cols = 8, rows = 9, cell = (corridorDepth - .12) / cols, pitch = (grilleTop - gateHead - .06) / rows;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cy = gateHead + .035 + (row + .5) * pitch, cz = roomFront + .06 + (col + .5) * cell, hx = .36 * cell, hy = .3 * pitch;
      const pts = [[-hx, 0], [-hx / 2, hy], [hx / 2, hy], [hx, 0], [hx / 2, -hy], [-hx / 2, -hy], [-hx, 0]];
      for (let i = 1; i < pts.length; i++) strip([x, cy + pts[i - 1][1], cz + pts[i - 1][0]], [x, cy + pts[i][1], cz + pts[i][0]], .022, trim);
      strip([x, cy + hy, cz], [x, cy + pitch / 2, cz], .018, trim); strip([x, cy - hy, cz], [x, cy - pitch / 2, cz], .018, trim);
      if (col < cols - 1) {
        strip([x, cy, cz + hx], [x, cy, cz + cell - hx], .02, trim);
        strip([x, cy - .28 * pitch, cz + cell / 2], [x, cy + .28 * pitch, cz + cell / 2], .02, trim);
      }
    }
    // Folded collapsible gate leaves at both jambs: flat bars with the scissor links between them.
    for (const [z0, dir] of [[roomFront + .08, 1], [front - .08, -1]]) {
      const h = gateHead - .2;
      for (let j = 0; j < 9; j++) box(x + side * .02, .18 + h / 2, z0 + dir * j * .03, .03, h, .012, trim);
      for (let k = 0; k < 7; k++) {
        const y0 = .25 + k * (h - .1) / 7, y1 = y0 + (h - .1) / 7;
        strip([x + side * .02, y0, z0], [x + side * .02, y1, z0 + dir * .24], .012, trim);
        strip([x + side * .02, y1, z0], [x + side * .02, y0, z0 + dir * .24], .012, trim);
      }
    }
  }
  // Downstand beams frame each passage mouth and run across the hall at the room-front and spine-front lines.
  for (const z of [groundSpine.roomFront - .115, groundSpine.front + .115]) box(0, 3.645, z, 7.46, .23, .23, wall);
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
  // The 14 October east-wall photograph shows the bench backs below the window sill: seat 0.53, back top 0.86.
  const benchHeight = y => y < .65 ? .164 + (y - .164) * .753 : .53 + (y - .65) * .5;
  for (const geometries of seatBatches.values()) for (const g of geometries) {
    const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setY(i, benchHeight(p.getY(i)));
    g.computeVertexNormals();
  }
  for (const [material, geometries] of seatBatches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material);
    mesh.name = material.name; mesh.castShadow = mesh.receiveShadow = true; seating.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  for (const side of [-1, 1]) {
    if (side > 0) { // the west grille (photo 3) has no fitting in front of it
      box(side * 3.65, 2.8, 1.96, .08, .19, .24, exterior.paving);
      rod([side * 3.66, 2.88, 1.99], [side * 3.66, 3.64, 1.99], .012, wall);
    }
  }
  // 14 October photographs: boards, plaques and fittings on both side walls, measured on each wall and fitted to
  // this hall (docs/entrance-video.md). Faces are perspective-corrected crops of the photographs, so the lettering
  // (heads of department with their terms, Ph.D awardees, staff, contacts) is the real lettering, tinsel included.
  const fittings = {
    wood: exterior.entranceWood, flex: trim, steel: new T.MeshStandardMaterial({ name: 'Grey steel window frames and bars', color: '#5e686c', metalness: .45, roughness: .5 }),
    stone: new T.MeshStandardMaterial({ name: 'Black granite plaque', color: '#1f2324', roughness: .35 }),
    red: new T.MeshStandardMaterial({ name: 'Red complaints box', color: '#76201f', roughness: .55 }),
    grey: new T.MeshStandardMaterial({ name: 'Distribution board casing', color: '#53585a', metalness: .3, roughness: .55 }),
    white: new T.MeshStandardMaterial({ name: 'White switch and conduit plastic', color: '#d8d4c8', roughness: .7 }),
  };
  // [z0, z1, y0, y1, depth, edge, atlas x, y, w, h, body bottom]; the west cabinets continue below the photographed part.
  const wallItems = {
    [-1]: ['west-boards', 2048, 1102, [
      [4.84, 6.357, 2.471, 3.546, .03, 'wood', 445, 0, 789, 559], // department and Ph.D awardee boards
      [3.584, 4.049, 2.784, 3.595, .012, 'flex', 1238, 0, 242, 422], // non-teaching staff
      [3.258, 3.604, 1.921, 2.091, .01, 'flex', 1751, 704, 180, 88], // UGC SAP
      [3.259, 3.599, 1.708, 1.892, .01, 'flex', 1570, 704, 177, 96], // DST FIST
      [3.60, 4.02, .833, 1.599, .03, 'stone', 0, 704, 231, 398], // renovation plaque
      [3.259, 3.588, .869, 1.652, .07, 'wood', 1843, 0, 171, 407], // time tables case
      [4.88, 5.469, 1.737, 2.178, .02, 'flex', 1260, 704, 306, 229], // vision, over the window
      [4.172, 4.854, 1.284, 2.078, .02, 'flex', 1484, 0, 355, 413], // grievance cells, over the window
      [4.857, 6.66, 1.18, 1.736, .14, 'wood', 235, 704, 1021, 289, .91], // notice cabinets
      [.212, 1.061, .616, 1.963, .012, 'flex', 0, 0, 441, 700], // programme objectives, beside the stair foot
    ]],
    [1]: ['east-boards', 2048, 962, [
      [4.447, 4.93, 2.248, 3.308, .03, 'wood', 385, 0, 257, 551], // faculty
      [4.93, 5.375, 2.231, 3.266, .03, 'wood', 646, 0, 245, 538], // successive heads I
      [5.375, 5.83, 2.239, 3.273, .03, 'wood', 895, 0, 243, 538], // successive heads II
      [5.835, 6.652, 2.327, 3.083, .012, 'flex', 0, 569, 431, 393], // student charter
      [4.246, 4.978, .863, 1.949, .02, 'flex', 0, 0, 381, 565], // anti-ragging poster, over the window
      [5.017, 6.391, .801, 1.626, .14, 'wood', 1142, 0, 714, 429], // notice cabinet
      [3.773, 4.028, .958, 1.275, .14, 'red', 607, 569, 133, 165], // complaints box
      [3.302, 3.508, 1.113, 1.267, .006, 'flex', 881, 569, 107, 80], // CCTV notice
      [3.697, 4.021, 2.148, 2.779, .14, 'grey', 435, 569, 168, 328], // distribution board
      [3.733, 3.989, 1.693, 1.981, .12, 'white', 744, 569, 133, 150], // isolator
      [6.453, 6.684, 1.218, 1.344, .05, 'white', 992, 569, 120, 66], // switch box
    ]],
  };
  for (const side of [-1, 1]) {
    const [file, aw, ah, items] = wallItems[side], faces = [];
    for (const [z0, z1, y0, y1, depth, edge, u, v, w, h, bottom = y0] of items) {
      const zc = (z0 + z1) / 2, face = 3.73 - depth; // side walls' inner face is at 3.73
      box(side * (3.73 - depth / 2), (bottom + y1) / 2, zc, depth, y1 - bottom, z1 - z0, fittings[edge]);
      const g = new T.PlaneGeometry(z1 - z0, y1 - y0); g.rotateY(-side * Math.PI / 2); g.translate(side * (face - .002), (y0 + y1) / 2, zc);
      const uv = g.attributes.uv;
      for (let i = 0; i < uv.count; i++) uv.setXY(i, (u + uv.getX(i) * w) / aw, 1 - (v + (1 - uv.getY(i)) * h) / ah);
      faces.push(g);
    }
    const map = loader.load(`/media/entrance-hall/${file}.webp`); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const boards = new T.Mesh(mergeGeometries(faces), new T.MeshStandardMaterial({ name: 'Photographed hall boards', map, roughness: .8, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: .12 }));
    // A trace of their own photographed light keeps high boards legible in the dim hall.
    boards.name = `${side < 0 ? 'West' : 'East'} hall boards and notices`; boards.receiveShadow = true; group.add(boards);
    faces.forEach(g => g.dispose());
    // Grey steel window: frame, mullions roughly every half metre, close horizontal bars, clear glazing.
    const { z0, z1, y0, y1 } = hallWindows[side], wx = side * 3.80, ww = z1 - z0, wh = y1 - y0, wz = (z0 + z1) / 2, steel = fittings.steel;
    for (const z of [z0 + .025, z1 - .025]) box(wx, (y0 + y1) / 2, z, .06, wh, .05, steel);
    for (const y of [y0 + .025, y1 - .025]) box(wx, y, wz, .06, .05, ww, steel);
    const panes = Math.max(2, Math.round(ww / .55));
    for (let i = 1; i < panes; i++) box(wx, (y0 + y1) / 2, z0 + i * ww / panes, .05, wh, .035, steel);
    for (let y = y0 + .09; y < y1 - .06; y += .09) box(wx - side * .02, y, wz, .012, .018, ww - .05, steel);
    box(wx + side * .01, (y0 + y1) / 2, wz, .006, wh - .05, ww - .05, exterior.entranceGlazing);
  }
  // East wall: white conduits rise from the distribution board and run along the wall top toward the passage.
  for (const z of [3.76, 3.86, 3.96]) rod([3.69, 2.78, z], [3.69, 3.55, z], .016, fittings.white);
  rod([3.69, 3.55, 3.30], [3.69, 3.55, 3.98], .018, fittings.white);
  // Thin security bars behind the fixed entrance sidelights, visible on looking back.
  for (const x of [-2.75, 2.75]) {
    for (let col = -2; col <= 2; col++) box(x + col * .36, 2.2, 6.92, .014, 1.98, .014, trim);
    for (let row = -3; row <= 3; row++) box(x, 2.2 + row * .28, 6.92, 1.88, .014, .014, trim);
  }
  const tubeMat = new T.MeshStandardMaterial({ color: '#fffceb', emissive: '#fffceb', emissiveIntensity: 1.7 });
  const lights = [];
  // Wall tubes where the photographs show them: over the west notice boards, near the east front corner.
  for (const [side, y, z] of [[-1, 2.18, 4.77], [1, 2.10, 6.10]]) {
    box(side * 3.66, y, z, .05, .04, .98, tubeMat);
    const light = new T.SpotLight('#fff4da', 7, 6, 1.25, .65, 2); light.position.set(side * 3.32, y - .02, z);
    light.target.position.set(0, .2, z); group.add(light, light.target); lights.push(light);
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
  const motorProfile = [[0, -.075], [.09, -.075], [.15, -.045], [.17, 0], [.15, .065], [.075, .09], [0, .09]].map(([r, y]) => new T.Vector2(r, y));
  const hub = new T.Mesh(new T.LatheGeometry(motorProfile, 32), trim); fan.add(hub);
  rod([0, 3.40, 3.9], [0, 3.76, 3.9], .022, trim);
  const ceilingCup = new T.Mesh(new T.CylinderGeometry(.12, .045, .13, 24), trim); ceilingCup.position.set(0, 3.69, 3.9); group.add(ceilingCup);
  for (let i = 0; i < 3; i++) {
    const shape = new T.Shape(); shape.moveTo(.11, -.025); shape.lineTo(.27, -.052); shape.quadraticCurveTo(.52, -.10, .69, -.055); shape.quadraticCurveTo(.75, .005, .68, .075); shape.lineTo(.27, .06); shape.lineTo(.11, .025); shape.closePath();
    const geometry = new T.ExtrudeGeometry(shape, { depth: .006, bevelEnabled: false, curveSegments: 10 }); geometry.rotateX(-Math.PI / 2);
    const blade = new T.Mesh(geometry, trim); blade.name = 'Thin curved ceiling-fan blade'; blade.rotation.y = i * Math.PI * 2 / 3; blade.position.y = -.015; fan.add(blade);
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
