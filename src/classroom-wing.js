import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Route proportions are interpreted from the five clips; see docs/classroom-wing.md.
export const classroom = { floor: 4.264, landing: 4.044, lowerFloor: 4.064, ceiling: 7.78, originX: -4, originZ: 2.166667, length: 20.3 };

export function buildClassroomWing(parent, m) {
  const group = new T.Group(); group.name = 'Upstairs classroom wing';
  group.position.set(classroom.originX, 0, classroom.originZ); group.rotation.y = Math.PI / 2;
  group.userData = { reference: '20260928_103154.mp4', entry: 'right turn upstairs', ...classroom }; parent.add(group);
  const batches = new Map();
  function add(g, material) { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(g.index ? g.toNonIndexed() : g); }
  function box(x, y, z, w, h, d, mat) {
    // The far passage sits beneath the lower terrace, including its wall ends.
    if (mat === plaster && y + h / 2 > 7.46 + .00001 && z - d / 2 < -17.05 - .00001) {
      const back = z - d / 2, front = z + d / 2, split = Math.min(front, -17.05);
      const bottom = y - h / 2;
      if (bottom < 7.46) box(x, (bottom + 7.46) / 2, (back + split) / 2, w, 7.46 - bottom, split - back, mat);
      if (front > split) box(x, y, (split + front) / 2, w, h, front - split, mat);
      return;
    }
    const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z);
    if (mat === plaster) {
      const { position: p, normal: n, uv } = g.attributes;
      for (let i = 0; i < p.count; i++) {
        const u = Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i);
        const v = Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i);
        uv.setXY(i, u / 3, v / 3);
      }
    }
    add(g, mat);
  }
  function tube(points, radius, mat) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    add(new T.TubeGeometry(curve, points.length === 2 ? 1 : 16, radius, 6, false), mat);
  }
  function texture(paint, w = 512, h = 512) {
    const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
    const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t;
  }
  let seed = 103154;
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const stoneMap = texture((c, w, h) => {
    c.fillStyle = '#898d80'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 4500; i++) { c.strokeStyle = rand() > .5 ? '#e2dec724' : '#353c3929'; c.lineWidth = .3 + rand() * 2; const x = rand() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 12, h / 3, x - 8, h * .7, x + rand() * 8, h); c.stroke(); }
    c.strokeStyle = '#4d504c88'; c.lineWidth = 1; c.strokeRect(0, 0, w, h);
  });
  const stone = new T.MeshStandardMaterial({ name: 'Classroom veined stone tiles', map: stoneMap, roughness: .32, envMapIntensity: .22 });
  const dark = new T.MeshStandardMaterial({ color: '#242b29', roughness: .48, metalness: .35 });
  const aluminium = new T.MeshStandardMaterial({ color: '#c0bfae', metalness: .65, roughness: .36 });
  const wood = m.entranceWood.clone(); wood.color.set('#82684e'); wood.roughness = .57;
  const plaster = m.wall.clone(); plaster.name = 'Weathered classroom plaster';
  const film = texture((c, w, h) => {
    c.fillStyle = '#233a42'; c.fillRect(0, 0, w, h);
    for (let row = 0; row < 12; row++) for (let col = 0; col < 6; col++) {
      const x = col * 86 + 20 + row % 2 * 30, y = row * 43;
      c.fillStyle = '#bbc5b6'; c.beginPath(); c.moveTo(x, y); c.bezierCurveTo(x - 20, y + 26, x - 12, y + 35, x, y + 35); c.bezierCurveTo(x + 12, y + 35, x + 20, y + 26, x, y); c.fill();
    }
  });
  const patternedGlass = new T.MeshStandardMaterial({ name: 'Patterned privacy window film', map: film, color: '#b5bdbb', roughness: .32 });
  const clearGlass = new T.MeshStandardMaterial({ color: '#c5d9d5', transparent: true, opacity: .20, roughness: .2, depthWrite: false });
  const doorGlass = new T.MeshStandardMaterial({ color: '#899d97', roughness: .27, metalness: .1, envMapIntensity: .5 });
  function floor(x, z, w, d, y, material = stone) {
    const g = new T.PlaneGeometry(w, d); g.rotateX(-Math.PI / 2); g.translate(x, y, z);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / .64, p.getZ(i) / .88);
    add(g, material);
  }
  function label(text, x, y, z, width, height, bg = '#eeece0', fg = '#20251f') {
    const map = texture((c, w, h) => { c.fillStyle = bg; c.fillRect(0, 0, w, h); c.fillStyle = fg; c.font = `bold ${text.length > 18 ? 34 : 48}px sans-serif`; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, w / 2, h / 2, w - 26); }, 512, 128);
    const mesh = new T.Mesh(new T.PlaneGeometry(width, height), new T.MeshStandardMaterial({ map, roughness: .75 })); mesh.position.set(x, y, z); group.add(mesh); return mesh;
  }
  function door(x, bottom, z, width, name = '', glazed = true) {
    const h = 2.32, front = z + .046;
    const leaf = new T.Shape(); leaf.moveTo(-width / 2, 0); leaf.lineTo(width / 2, 0); leaf.lineTo(width / 2, h); leaf.lineTo(-width / 2, h); leaf.closePath();
    if (glazed) {
      const opening = new T.Path(); opening.moveTo(-.195, 1.55); opening.lineTo(-.195, 1.89); opening.lineTo(.195, 1.89); opening.lineTo(.195, 1.55); opening.closePath(); leaf.holes.push(opening);
    }
    const panel = new T.ExtrudeGeometry(leaf, { depth: .046, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 1, steps: 1 }); panel.translate(x, bottom, z - .023); add(panel, wood);
    for (const s of [-1, 1]) box(x + s * (width / 2 + .036), bottom + h / 2, z, .072, h + .07, .10, wood);
    box(x, bottom + h + .035, z, width + .14, .07, .10, wood);
    // The small inspection pane sits in a recessed timber bead, not a projecting box.
    if (glazed) {
      box(x, bottom + 1.72, z, .39, .34, .012, doorGlass);
      for (const s of [-1, 1]) { box(x + s * .218, bottom + 1.72, front, .036, .40, .032, wood); box(x, bottom + 1.72 + s * .182, front, .47, .036, .032, wood); }
    }
    tube([[x + width * .32, bottom + .85, front], [x + width * .32, bottom + 1.05, front]], .011, aluminium);
    tube([[x + .05, bottom + .70, front + .02], [x + .43, bottom + .70, front + .02]], .012, aluminium);
    for (const dx of [.09, .24, .40]) box(x + dx, bottom + .70, front, .026, .085, .022, aluminium);
    tube([[x + .29, bottom + .65, front], [x + .30, bottom + .60, front], [x + .34, bottom + .65, front]], .008, aluminium);
    const lock = new T.CylinderGeometry(.035, .035, .018, 12); lock.rotateX(Math.PI / 2); lock.translate(x + .315, bottom + .59, front); add(lock, aluminium);
    if (name) label(name, x, bottom + 1.40, front + .02, .52, .11, '#182220', '#eeeedd');
  }
  function window(x, y, z, width, angle = 0) {
    const transform = new T.Matrix4().makeRotationY(angle); transform.setPosition(x, y, z);
    function part(px, py, w, h, material, pz = 0, depth = .03) {
      const g = new T.BoxGeometry(w, h, depth); g.translate(px, py, pz); g.applyMatrix4(transform); add(g, material);
    }
    const height = 1.48;
    for (const s of [-1, 1]) { part(s * width / 2, 0, .035, height + .07, aluminium); part(0, s * height / 2, width, .035, aluminium); }
    for (let i = 0; i < 4; i++) {
      const px = -width / 2 + (i + .5) * width / 4;
      part(px, 0, width / 4 - .024, height - .04, i === 3 ? clearGlass : patternedGlass, -.02, .008);
      part(px - width / 8, 0, .023, height, aluminium, .015);
    }
  }
  const { floor: y, ceiling } = classroom;
  const W = -.985, inner = W + .08; // window-wall centre and its corridor face
  floor(0, -8.45, 2.17, 16.9, y);
  floor(0, -18.85, 2.17, 2.9, classroom.lowerFloor);
  // Two shallow steps, seen clearly on the return clip 103849 at 0-9s.
  box(0, y - .05, -17.05, 2.17, .10, .30, stone); box(0, y - .15, -17.35, 2.17, .10, .30, stone);
  const sideCeiling = 7.4;
  box(0, ceiling, -8.5, 2.35, .12, 17, plaster);
  box(0, sideCeiling, -18.65, 2.35, .12, 3.3, plaster);
  floor(0, 1.1, 2.17, 2.2, classroom.landing);
  // Library is beside the classroom entrance on the upper landing (094920, 12s).
  const libraryStart = new Map([...batches].map(([material, gs]) => [material, gs.length]));
  const libraryChildren = new Set(group.children);
  door(0, classroom.landing, 0, 1.02, 'LIBRARY');
  const libraryTransform = new T.Matrix4().makeRotationY(Math.PI / 2); libraryTransform.setPosition(-1.28, 0, 1.45);
  for (const [material, gs] of batches) for (let j = libraryStart.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(libraryTransform);
  for (const child of group.children) if (!libraryChildren.has(child)) child.applyMatrix4(libraryTransform);
  for (const z of [.57, 2.33]) box(-1.33, (classroom.landing + ceiling) / 2, z, .14, ceiling - classroom.landing, .64, plaster);
  box(-1.33, (classroom.landing + 2.5 + ceiling) / 2, 1.45, .14, ceiling - classroom.landing - 2.5, 1.12, plaster);
  box(0, classroom.landing + .055, .30, 2.17, .11, .3, stone); box(0, classroom.landing + .165, 0, 2.17, .11, .3, stone);
  // Window wall aligns with the existing five pierced facade bays. It stands just inside the front
  // facade, whose blue pilasters and inner face (to x=-0.915 here) would otherwise poke into the corridor.
  box(W, y + .63, -8.76, .16, 1.26, 18.48, plaster); // runs up to the entrance posts at z=.47
  box(W, (y + 2.8 + ceiling) / 2, -8.76, .16, ceiling - y - 2.8, 18.48, plaster);
  box(W, y + 2.0, .3, .16, 1.55, .34, plaster);
  for (let i = 0; i <= 5; i++) box(W, y + 2.0, -i * 3.6, .16, 1.55, .60, plaster);
  for (let i = 0; i < 5; i++) window(W + .085, y + 2.02, -1.8 - i * 3.6, 2.96, Math.PI / 2);
  const openings = [2.3, 5.8, 9.2, 12.6];
  let previous = 0;
  for (const u of openings) {
    const start = u - .58;
    box(1.10, (y + ceiling) / 2, -(previous + start) / 2, .16, ceiling - y, start - previous, plaster);
    box(1.10, (y + 2.4 + ceiling) / 2, -u, .16, ceiling - y - 2.4, 1.16, plaster);
    // Each door is a closed room front; the films do not establish the room interiors.
    const before = new Set(group.children), first = new Map([...batches].map(([m, a]) => [m, a.length]));
    door(0, y, 0, 1.02);
    const matrix = new T.Matrix4().makeRotationY(-Math.PI / 2); matrix.setPosition(1.04, 0, -u);
    for (const [material, gs] of batches) for (let j = first.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(matrix);
    for (const child of group.children) if (!before.has(child)) child.applyMatrix4(matrix);
    previous = u + .58;
  }
  box(1.10, (y + ceiling) / 2, -(previous + 18) / 2, .16, ceiling - y, 18 - previous, plaster);
  // Far door and the perpendicular, lower side passage are both visible in 103154.
  box(-1.10, (classroom.lowerFloor + sideCeiling) / 2, -19.15, .16, sideCeiling - classroom.lowerFloor, 2.3, plaster);
  for (const x of [-.84, .84]) box(x, (classroom.lowerFloor + sideCeiling) / 2, -20.35, .49, sideCeiling - classroom.lowerFloor, .16, plaster);
  box(0, (classroom.lowerFloor + 2.42 + sideCeiling) / 2, -20.35, 1.2, sideCeiling - classroom.lowerFloor - 2.42, .16, plaster);
  door(0, classroom.lowerFloor, -20.24, 1.08, 'CLASS ROOM - III');
  floor(6.0, -19.15, 9.8, 2.3, classroom.lowerFloor);
  box(6.0, sideCeiling, -19.15, 9.8, .12, 2.5, plaster);
  box(6.0, (classroom.lowerFloor + sideCeiling) / 2, -20.4, 9.8, sideCeiling - classroom.lowerFloor, .18, plaster);
  box(6.0, classroom.lowerFloor + .65, -17.97, 9.8, 1.3, .16, plaster);
  box(6.0, (classroom.lowerFloor + 2.8 + sideCeiling) / 2, -17.97, 9.8, sideCeiling - classroom.lowerFloor - 2.8, .16, plaster);
  for (const x of [1.2, 4.4, 7.6, 10.8]) box(x, classroom.lowerFloor + 2.03, -17.97, .3, 1.46, .16, plaster);
  for (const x of [2.8, 6, 9.2]) window(x, classroom.lowerFloor + 2.03, -18.05, 2.85, Math.PI);
  for (const x of [2.5, 5.8, 8.9]) {
    door(x, classroom.lowerFloor, -20.28, .96);
    floor(x, -19.15, .48, 2.3, classroom.lowerFloor + .002, m.tread);
  }
  // Uneven lower-wall staining is visible in the side passage; keep it flush to the plaster.
  const wear = texture((c, w, h) => {
    for (let i = 0; i < 6500; i++) {
      const x = rand() * w, y = h * (.52 + .16 * Math.sin(x / 53)) + rand() * h * .42;
      c.fillStyle = `rgba(67,76,66,${.04 + rand() * .18})`; c.fillRect(x, y, 1 + rand() * 12, 1 + rand() * 9);
    }
  });
  const stain = new T.Mesh(new T.PlaneGeometry(9.3, 2.3), new T.MeshStandardMaterial({ map: wear, transparent: true, depthWrite: false, roughness: 1 }));
  stain.position.set(6, classroom.lowerFloor + 1.15, -18.065); stain.rotation.y = Math.PI; group.add(stain);
  box(11, (classroom.lowerFloor + sideCeiling) / 2, -19.15, .15, sideCeiling - classroom.lowerFloor, 2.5, plaster);
  const terminalStart = new Map([...batches].map(([material, gs]) => [material, gs.length]));
  door(0, classroom.lowerFloor, 0, 1.02, '', false);
  const terminalTransform = new T.Matrix4().makeRotationY(-Math.PI / 2); terminalTransform.setPosition(10.88, 0, -19.15);
  for (const [material, gs] of batches) for (let j = terminalStart.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(terminalTransform);
  // Modest stored furniture at the filmed dead end, using thin frames rather than solid blocks.
  for (let i = 0; i < 3; i++) {
    const x = 9.8 + i * .27, z = -19.1 + i * .12;
    box(x, classroom.lowerFloor + .55 + i * .16, z, .52, .035, .46, wood);
    for (const dx of [-.23, .23]) for (const dz of [-.20, .20]) tube([[x + dx, classroom.lowerFloor + .10 + i * .16, z + dz], [x + dx, classroom.lowerFloor + 1.12 + i * .16, z + dz]], .018, dark);
    for (const dz of [-.20, .20]) tube([[x - .23, classroom.lowerFloor + 1.12 + i * .16, z + dz], [x + .23, classroom.lowerFloor + 1.12 + i * .16, z + dz]], .018, dark);
  }
  // Slim conduits and cross beams follow the filmed ceiling; no invented room fixtures.
  for (const far of [-1.02, 1.02]) {
    const x = far < 0 ? inner + .025 : far; // main corridor follows the inset window wall; the far passage keeps its wall
    box(x, y + .09, -8.45, .05, .18, 16.9, stone);
    for (let j = 0; j < 3; j++) tube([[x, ceiling - .28 - j * .045, .8], [x, ceiling - .28 - j * .045, -17.8], [far, sideCeiling - .28 - j * .045, -18.2], [far, sideCeiling - .28 - j * .045, -20.1]], .012, aluminium);
    for (let u = 1; u < 20; u += 1.5) box(u < 18 ? x : far, (u < 18 ? ceiling : sideCeiling) - .33, -u, .032, .19, .022, dark);
  }
  for (const u of [0, 7.1, 14.8, 18.8]) box(0, (u < 18 ? ceiling : sideCeiling) - .14, -u, 2.16, .30, .22, plaster);
  const lamp = new T.MeshStandardMaterial({ color: '#e9eee5', emissive: '#dceada', emissiveIntensity: 1.4 });
  for (const u of [4, 11, 17.4]) {
    box(1.00, ceiling - .42, -u, .07, .075, 1.14, aluminium);
    tube([[.945, ceiling - .44, -u - .52], [.945, ceiling - .44, -u + .52]], .016, lamp);
  }
  // Classroom-wing entry transom and open slim-framed leaves.
  const posts = [inner + .025, .995]; // each post sits on its wall face, never inside it
  for (const x of posts) box(x, y + 1.35, .47, .05, 2.7, .07, dark);
  box(0, y + 2.8, .47, 2.16, .47, .035, dark);
  label('CLASSROOM WING', 0, y + 2.8, .50, 1.88, .36);
  for (const side of [-1, 1]) {
    const leaf = new T.Group(); leaf.name = 'Open classroom entrance leaf'; leaf.position.set(posts[side > 0 ? 1 : 0], y, .46); leaf.rotation.y = -side * Math.PI * .47; group.add(leaf);
    for (const [px, py, w, h] of [[-side * .47, .04, .94, .04], [-side * .47, 2.55, .94, .04], [0, 1.28, .04, 2.56], [-side * .94, 1.28, .04, 2.56], [-side * .47, 1.15, .94, .04]]) {
      const mesh = new T.Mesh(new T.BoxGeometry(w, h, .04), dark); mesh.position.set(px, py, 0); leaf.add(mesh);
    }
    const panel = new T.Mesh(new T.PlaneGeometry(.88, 1.06), new T.MeshStandardMaterial({ color: '#dad8c5', side: T.DoubleSide })); panel.position.set(-side * .47, .58, 0); leaf.add(panel);
  }
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); geometries.forEach(g => g.dispose());
  }
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  return group;
}
