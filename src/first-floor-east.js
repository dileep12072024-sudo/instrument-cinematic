import * as T from 'three';
import * as P from './props.js';
import { groundSpine } from './footprint.js';
import { stairs } from './stair-layout.js';
import { createRoomLights, makeSwitchboard } from './roomlights.js';

// First floor, east (owner's videos 20261014_111121.mp4 and "Right/First floor - right wing.mp4", 2026-10-18). Read from
// the videos: from the landing, a grille gate and three steps up into the east corridor; room doors, blade signs, a green
// barred window and garlands on the left (rooms), round-holed concrete screens on the right (facade, architecture.js);
// at the east end a collapsible gate under a hexagon transom into a small lobby with the DEVICE FAB LAB door ahead.
// From the lobby: north, a short stub between the screened bay and a garlanded door to a door at its end; south,
// through a second grille gate, the wing's passage past a teal wall, the outer windows, doors, green barred windows and
// an extinguisher to the BIO MEDICAL INSTRUMENTATION LAB door at its end. Order and adjacency are filmed; lengths are
// fitted to the shell (the ground-floor passage below sets the wing passage's line), not surveyed.
export const firstEast = {
  floor: 4 + groundSpine.rightFloor, // every storey of the right block sits .704 above its slab line (ground .704, second 8.704)
  ceiling: 7.83, corridor: [groundSpine.roomFront, 3.09], start: 4.16, gateX: 22,
  passage: { left: 22.16, right: 24.37, north: 7.85, south: -11.2 },
};

// level 2 (owner, 2026-10-18): the second floor's junction, built like the first floor's but plain (no signs, plates,
// garlands or paint) with premium coffee-brown doors; its corridor up to the junction is terraces.js's.
export function buildFirstFloorEast(parent, m, { level = 1 } = {}) {
  const second = level === 2;
  const group = new T.Group(); group.name = second ? 'Second floor east junction and wing passage' : 'First floor east corridor and wing passage'; parent.add(group);
  const batches = new Map();
  const add = (g, material) => { const c = g.index ? g.toNonIndexed() : g; for (const n of Object.keys(c.attributes)) if (!['position', 'normal', 'uv'].includes(n)) c.deleteAttribute(n); if (!c.attributes.uv) c.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2)); if (!batches.has(material)) batches.set(material, []); batches.get(material).push(c); };
  const box = (x, y, z, w, h, d, material) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material); };
  const put = (g, material, matrix) => { g.applyMatrix4(matrix); add(g, material); };
  const bar = (a, b, r, material) => add(P.member(a, b, r, r, 6), material);
  let seed = 111121; const rand = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const canvas = (w, h, paint, repeat = false) => { const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h); const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.anisotropy = 8; if (repeat) t.wrapS = t.wrapT = T.RepeatWrapping; return t; };

  const { corridor: [Z0, Z1], start, gateX, passage: { left: PL, right: PR, north: PN, south: PS } } = firstEast;
  const F = second ? 8 + groundSpine.rightFloor : firstEast.floor, C = second ? 11.72 : firstEast.ceiling, slabTop = second ? 8.03 : 4.03, lintel = second ? 11.7 : 7.78;
  // Materials, from the frames: mauve-brown streaked vitrified tiles, white-washed plaster grimy at the foot, dark skirting.
  const tileMap = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#7a6460'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 260; i++) { const x = rand() * w; g.fillStyle = rand() > .5 ? `rgba(190,165,150,${.06 + rand() * .12})` : `rgba(60,42,40,${.05 + rand() * .1})`; g.fillRect(x, 0, 1 + rand() * 4, h); } // the streaks run one way
    g.strokeStyle = 'rgba(45,32,30,.55)'; g.lineWidth = 2; for (let k = 0; k <= 2; k++) { g.beginPath(); g.moveTo(0, k * h / 2); g.lineTo(w, k * h / 2); g.moveTo(k * w / 2, 0); g.lineTo(k * w / 2, h); g.stroke(); }
  }, true);
  const tiles = second // the second floor carries on its corridor's pale tiles (terraces.js)
    ? new T.MeshStandardMaterial({ name: 'Second floor east tiles', map: canvas(256, 256, (g, w, h) => { g.fillStyle = '#e1e1d8'; g.fillRect(0, 0, w, h); g.strokeStyle = 'rgba(150,150,140,.6)'; g.lineWidth = 2; g.strokeRect(0, 0, w, h); }, true), roughness: .3, metalness: .03 })
    : new T.MeshStandardMaterial({ name: 'First floor east streaked tiles', map: tileMap, roughness: .3, envMapIntensity: .5 });
  const plasterMap = canvas(512, 512, (g, w, h) => {
    g.fillStyle = '#ece9df'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(110,105,92,${.01 + rand() * .035})`; g.fillRect(rand() * w, rand() * h, 1 + rand() * 6, 1 + rand() * 6); }
    const foot = g.createLinearGradient(0, h, 0, h * .7); foot.addColorStop(0, 'rgba(90,80,62,.35)'); foot.addColorStop(1, 'rgba(90,80,62,0)'); g.fillStyle = foot; g.fillRect(0, 0, w, h);
  }, true);
  const plaster = new T.MeshStandardMaterial({ name: 'First floor east plaster', map: plasterMap, roughness: .9 });
  const teal = new T.MeshStandardMaterial({ name: 'Teal painted wall', color: '#5f8a8c', map: plasterMap, roughness: .8 });
  const ceilingMat = new T.MeshStandardMaterial({ name: 'First floor east ceiling', color: '#f1efe7', roughness: .95, emissive: '#bdbab0', emissiveIntensity: .25 });
  const skirting = new T.MeshStandardMaterial({ name: 'Dark skirting', color: '#3a2c2a', roughness: .5 });
  const frameWood = new T.MeshStandardMaterial({ name: 'Door frames', map: P.woodTexture(second ? '#2e1a11' : '#6a4022', { vertical: true }), roughness: .6 });
  const laminate = new T.MeshStandardMaterial({ name: 'Wood-grain door laminate', map: P.woodTexture(second ? '#5a3522' : '#b0763e', { vertical: true, worn: second ? 0 : 1 }), roughness: second ? .35 : .5 }); // level 2: premium coffee brown
  const { brass, steel: lockSteel } = P.hardware();
  const green = new T.MeshStandardMaterial({ name: 'Green painted window', color: '#2f4a3c', roughness: .55, metalness: .2 });
  const greenGlass = new T.MeshStandardMaterial({ name: 'Window glass, green-tinted', map: P.patternedGlass('#6f8f80'), transparent: true, opacity: .85, roughness: .4, depthWrite: false });
  const gateSteel = new T.MeshStandardMaterial({ name: 'Grey-green gate steel', color: '#3e4f4c', roughness: .55, metalness: .4 });
  const pvc = new T.MeshStandardMaterial({ name: 'Grey conduit', color: '#9c9f97', roughness: .6 });
  const boxGrey = new T.MeshStandardMaterial({ name: 'Meter and switch boxes', color: '#c9c6b8', roughness: .55 });
  const ply = new T.MeshStandardMaterial({ name: 'Plywood vent covers', map: P.woodTexture('#7b4f2c', { worn: 2 }), roughness: .8 });
  const marigold = [new T.MeshStandardMaterial({ color: '#f29a12', roughness: .9 }), new T.MeshStandardMaterial({ color: '#f5c518', roughness: .9 }), new T.MeshStandardMaterial({ color: '#c8361b', roughness: .9 })];
  const tubeOn = new T.MeshStandardMaterial({ name: 'Tube light', color: '#fbfaf2', emissive: '#f4f6ee', emissiveIntensity: 1.6 });

  // A wall along x (at z = wz, facing +face) or along z (at x = wx), with openings: [{ at, w, bottom, top }].
  // Walls are 0.16 thick; their room-side face is the given line.
  function wall(axis, line, face, a, b, openings = [], material = plaster) {
    const c = line - face * .08, len = (u0, u1, y0, y1) => {
      if (u1 - u0 < .001 || y1 - y0 < .001) return;
      if (axis === 'x') box((u0 + u1) / 2, (y0 + y1) / 2, c, u1 - u0, y1 - y0, .16, material); else box(c, (y0 + y1) / 2, (u0 + u1) / 2, .16, y1 - y0, u1 - u0, material);
    };
    let edge = a; const bottom = F - .2;
    for (const o of [...openings].sort((p, q) => p.at - q.at)) {
      const u0 = o.at - o.w / 2, u1 = o.at + o.w / 2;
      len(edge, u0, bottom, C); len(u0, u1, bottom, o.bottom); len(u0, u1, o.top, C); edge = u1;
    }
    len(edge, b, bottom, C);
    const sk = (u0, u1) => { if (u1 - u0 < .01) return; if (axis === 'x') box((u0 + u1) / 2, F + .06, line + face * .006, u1 - u0, .12, .012, skirting); else box(line + face * .006, F + .06, (u0 + u1) / 2, .012, .12, u1 - u0, skirting); };
    edge = a; for (const o of [...openings].sort((p, q) => p.at - q.at)) { if (o.bottom <= F + .01) { sk(edge, o.at - o.w / 2); edge = o.at + o.w / 2; } } sk(edge, b);
  }
  // Frame in which local x runs along a wall, y up, +z into the corridor: origin on the wall face at u.
  const frameAt = (axis, line, face, u) => axis === 'x'
    ? new T.Matrix4().makeRotationY(face > 0 ? 0 : Math.PI).setPosition(u, 0, line)
    : new T.Matrix4().makeRotationY(face > 0 ? Math.PI / 2 : -Math.PI / 2).setPosition(line, 0, u);
  const door = { w: 1.0, h: 2.15 };
  function roomDoor(matrix, decor = {}) {
    const { sign, garland, signal, vision, notice } = second ? {} : decor; // level 2 is plain
    put(P.doorFrame(door.w - .04, door.h, .16), frameWood, matrix.clone().multiply(new T.Matrix4().makeTranslation(0, F, -.04)));
    const { leaf, metal, steel } = P.flushLeaf(door.w - .06, door.h - .02, -1);
    const hinge = matrix.clone().multiply(new T.Matrix4().makeTranslation((door.w - .06) / 2, F + .01, -.06));
    put(leaf, laminate, hinge.clone()); put(metal, brass, hinge.clone()); put(steel, lockSteel, hinge.clone());
    if (vision) { // small glazed vision panel in a light timber bead (the lab door by the landing gate)
      put(P.rbox(.42, .32, .03, .005, 0, F + 1.6, -.03), frameWood, matrix.clone()); put(new T.BoxGeometry(.34, .24, .01).translate(0, F + 1.6, -.015), greenGlass, matrix.clone());
    }
    if (sign) plate(matrix, sign, 0, F + (vision ? 1.88 : 1.55), -.035, .34, .1);
    if (notice) { const t = canvas(128, 180, (g, w, h) => { g.fillStyle = '#f2f1ec'; g.fillRect(0, 0, w, h); g.fillStyle = 'rgba(40,40,50,.55)'; for (let y = 14; y < h - 10; y += 7) g.fillRect(10, y, 20 + rand() * (w - 40), 3); });
      const mesh = new T.Mesh(new T.PlaneGeometry(.2, .28), new T.MeshStandardMaterial({ map: t, roughness: .9 })); mesh.applyMatrix4(matrix.clone().multiply(new T.Matrix4().makeTranslation(.62, F + 1.5, .004))); group.add(mesh); }
    if (garland) swag(matrix, door.w + .1, F + door.h + .1);
    if (signal) blade(matrix, signal, .62);
  }
  // Black door plate with white letters.
  function plate(matrix, text, x, y, z, w, h, bg = '#141614', fg = '#f1f1ea') {
    const lines = text.split('\n'), t = canvas(256, Math.round(256 * h / w), (g, cw, ch) => { g.fillStyle = bg; g.fillRect(0, 0, cw, ch); g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = `bold ${Math.min(30, ch / (lines.length + .6))}px Arial`; lines.forEach((l, k) => g.fillText(l, cw / 2, ch * (k + 1) / (lines.length + 1), cw - 16)); });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, h), new T.MeshStandardMaterial({ map: t, roughness: .5 })); mesh.applyMatrix4(matrix.clone().multiply(new T.Matrix4().makeTranslation(x, y, z))); group.add(mesh); return mesh;
  }
  // Faculty blade sign projecting from the wall beside the door head: [lines], colours.
  function blade(matrix, { lines, bg, fg, border }, x) {
    const t = canvas(512, 190, (g, w, h) => {
      g.fillStyle = bg; g.fillRect(0, 0, w, h); if (border) { g.strokeStyle = border; g.lineWidth = 6; g.strokeRect(5, 5, w - 10, h - 10); }
      g.fillStyle = fg; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.font = 'bold 54px "Times New Roman", Times, serif'; g.fillText(lines[0], w / 2, h * .38, w - 36);
      g.font = 'bold 30px "Times New Roman", Times, serif'; g.textAlign = 'right'; g.fillText(lines[1], w - 30, h * .74);
    });
    const material = new T.MeshStandardMaterial({ map: t, roughness: .6 });
    for (const turn of [Math.PI / 2, -Math.PI / 2]) { // printed both sides, each reading the right way
      const mesh = new T.Mesh(new T.PlaneGeometry(.5, .19), material); mesh.name = `Blade sign: ${lines[0]}`;
      mesh.applyMatrix4(matrix.clone().multiply(new T.Matrix4().makeTranslation(x + Math.sign(turn) * .002, F + 2.42, .27)).multiply(new T.Matrix4().makeRotationY(turn))); group.add(mesh);
    }
    put(new T.BoxGeometry(.02, .02, .3).translate(x, F + 2.53, .15), gateSteel, matrix.clone());
  }
  // Marigold garland swagged across a door head (orange and yellow strings, a red bead now and then).
  function swag(matrix, width, y) {
    for (let k = 0; k <= 26; k++) {
      const t = k / 26, x = (t - .5) * width, sag = Math.sin(t * Math.PI * 3) ** 2 * .1 + Math.sin(t * Math.PI) * .04;
      const g = new T.SphereGeometry(.03, 6, 4); g.translate(x, y - sag, .05); put(g, marigold[k % 7 === 3 ? 2 : k % 2], matrix.clone());
    }
  }
  // Green barred window: dark green timber frame, two glazed sashes, round vertical bars and one flat rail outside.
  function barredWindow(matrix, w = 1.25, h = 1.25, sill = .95) {
    const y = F + sill + h / 2, M = matrix.clone();
    for (const s of [-1, 1]) put(P.rbox(.07, h + .07, .1, .01, s * (w / 2), y, -.02), green, M.clone());
    for (const s of [-1, 1]) put(P.rbox(w + .07, .07, .1, .01, 0, y + s * h / 2, -.02), green, M.clone());
    put(P.rbox(.05, h, .06, .01, 0, y, -.04), green, M.clone());
    put(new T.BoxGeometry(w - .04, h - .04, .01).translate(0, y, -.05), greenGlass, M.clone());
    for (let k = 1; k < 9; k++) put(P.member([-w / 2 + k * w / 9, y - h / 2, .03], [-w / 2 + k * w / 9, y + h / 2, .03], .009, .009, 6), green, M.clone());
    put(new T.BoxGeometry(w, .03, .012).translate(0, y + .05, .042), green, M.clone());
    put(P.rbox(w + .14, .04, .1, .01, 0, F + sill - .02, .03), plaster, M.clone()); // sill
  }
  // Grille gate in an opening of width w (local x), at a wall plane: two collapsible gate stacks folded to the jambs, gate
  // head at gh, a transom of elongated hexagons tied by crosses up to the lintel lt (the hall's gate, 14 October photos).
  function gate(matrix, w, gh, lt, { hinged = false, base = F } = {}) {
    const F = base, M = matrix.clone(), seg = (a, b, r = .011) => put(P.member(a, b, r, r, 4), gateSteel, M.clone());
    for (const s of [-1, 1]) put(new T.BoxGeometry(.06, lt - F, .07).translate(s * (w / 2 - .03), (F + lt) / 2, 0), gateSteel, M.clone());
    put(new T.BoxGeometry(w, .06, .07).translate(0, gh, 0), gateSteel, M.clone()); put(new T.BoxGeometry(w, .05, .07).translate(0, lt - .025, 0), gateSteel, M.clone());
    const cols = Math.max(3, Math.round(w / .36)), rows = Math.max(2, Math.round((lt - gh) / .3)), cell = (w - .12) / cols, pitch = (lt - gh - .06) / rows;
    for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
      const cy = gh + .03 + (row + .5) * pitch, cx = -w / 2 + .06 + (col + .5) * cell, hx = .36 * cell, hy = .3 * pitch;
      const pts = [[-hx, 0], [-hx / 2, hy], [hx / 2, hy], [hx, 0], [hx / 2, -hy], [-hx / 2, -hy], [-hx, 0]];
      for (let i = 1; i < pts.length; i++) seg([cx + pts[i - 1][0], cy + pts[i - 1][1], 0], [cx + pts[i][0], cy + pts[i][1], 0]);
      seg([cx, cy + hy, 0], [cx, cy + pitch / 2, 0], .009); seg([cx, cy - hy, 0], [cx, cy - pitch / 2, 0], .009);
      if (col < cols - 1) { seg([cx + hx, cy, 0], [cx + cell - hx, cy, 0], .01); seg([cx + cell / 2, cy - .28 * pitch, 0], [cx + cell / 2, cy + .28 * pitch, 0], .01); }
    }
    const h = gh - F - .05;
    if (hinged) { // one welded grille leaf swung back against the wall (the wing passage's gate)
      const { iron, lock } = P.grilleLeaf(w - .1, h, 1, false);
      const hinge = M.clone().multiply(new T.Matrix4().makeTranslation(-w / 2 + .05, F + .02, .04)).multiply(new T.Matrix4().makeRotationY(-Math.PI * .47));
      put(iron, gateSteel, hinge.clone()); put(lock, lockSteel, hinge.clone()); return;
    }
    for (const [x0, dir] of [[-w / 2 + .07, 1], [w / 2 - .07, -1]]) { // folded collapsible stacks
      for (let j = 0; j < 9; j++) put(new T.BoxGeometry(.012, h, .03).translate(x0 + dir * j * .028, F + .03 + h / 2, .03), gateSteel, M.clone());
      for (let k = 0; k < 7; k++) { const y0 = F + .1 + k * (h - .1) / 7, y1 = y0 + (h - .1) / 7; seg([x0, y0, .03], [x0 + dir * .24, y1, .03], .006); seg([x0, y1, .03], [x0 + dir * .24, y0, .03], .006); }
    }
  }
  const hiVent = (matrix, x, y) => { // plywood board over a high vent, a little askew (as on the corridor walls)
    const g = P.rbox(.62, .48, .015, .004, 0, 0, 0); g.rotateZ((rand() - .5) * .08); g.translate(x, y, .012); put(g, ply, matrix.clone());
  };
  const tubes = [], tubeMats = new Map(), conduit = (a, b) => bar(a, b, .013, pvc);
  const tube = (matrix, x, y) => { put(new T.BoxGeometry(1.22, .05, .06).translate(x, y, .04), boxGrey, matrix.clone()); const lamp = new T.CylinderGeometry(.016, .016, 1.16, 10); lamp.rotateZ(Math.PI / 2); lamp.translate(x, y - .035, .07); if (!tubeMats.has(matrix)) tubeMats.set(matrix, tubeOn.clone()); const mat = tubeMats.get(matrix); put(lamp, mat, matrix.clone()); tubes.push({ matrix, x, y, mat }); }; // one material per circuit (each wall's tubes switch together)
  const switchBox = (matrix, x, y, cord = true) => {
    put(P.rbox(.14, .14, .05, .008, x, y, .025), boxGrey, matrix.clone());
    if (cord) put(new T.TubeGeometry(new T.CatmullRomCurve3([[x + .03, y - .07, .05], [x + .06, y - .45, .07], [x + .02, y - .62, .06], [x - .02, y - .45, .06], [x + .01, y - .07, .05]].map(p => new T.Vector3(...p))), 20, .004, 4, false), skirting, matrix.clone());
    put(new T.CylinderGeometry(.008, .008, C - y - .2, 6).translate(x, (y + C - .2) / 2 + .07, .02), pvc, matrix.clone());
  };
  const meters = (matrix, x, y) => { for (const [dx, dy, w, h] of [[0, 0, .3, .42], [.36, .06, .24, .3], [.12, -.42, .22, .24]]) put(P.rbox(w, h, .12, .01, x + dx, y + dy, .06), boxGrey, matrix.clone()); };

  // ------------------------------------------------------------------ east corridor (x start..gateX, z Z0..Z1)
  const stepRise = (F - stairs.first) / 3;
  if (!second) box((3.8 + start) / 2, stairs.first - .01, (Z0 + Z1) / 2, start - 3.8 + .04, .02, Z1 - Z0 + .16, tiles); // threshold in the landing wall
  if (!second) for (let i = 0; i < 3; i++) box(start + .14 + i * .28, stairs.first + (i + 1) * stepRise / 2, (Z0 + Z1) / 2, .28, (i + 1) * stepRise, Z1 - Z0 + .1, tiles);
  const fill = (x0, x1, z0, z1) => { const g = new T.BoxGeometry(x1 - x0, F - slabTop, z1 - z0); g.translate((x0 + x1) / 2, (F + slabTop) / 2, (z0 + z1) / 2);
    const uv = g.attributes.uv, p = g.attributes.position; for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 1.2, p.getZ(i) / 1.2); add(g, tiles); };
  fill(second ? gateX - .05 : start + .84, PR + .05, Z0 - .05, Z1 + .08); // corridor (first floor) and lobby
  fill(PL - .05, PR + .05, PS - .05, Z0 - .05); fill(PL - .05, PR + .05, Z1 + .08, PN + .05); // the wing passage, south and north
  const ceil = (x0, x1, z0, z1) => box((x0 + x1) / 2, C - .015, (z0 + z1) / 2, x1 - x0, .03, z1 - z0, ceilingMat);
  ceil(second ? gateX : start, PR, Z0, Z1); ceil(PL, PR, PS, Z0); ceil(PL, PR, Z1, PN);

  const Mz0 = frameAt('x', Z0, 1, 0);
  if (!second) {
  // Room side, from the landing: lab door (vision panel, black plate, notice), green barred window, Prof. M. Ramesh
  // Patnaik, Prof. Y. Srinivasa Rao (meter boxes above), a plain door, Prof. A. Bhujanga Rao, GENTS TOILETS (111121).
  const doorsZ0 = [
    { x: 5.45, sign: 'LAB', vision: true, notice: true },
    { x: 9.3, garland: true, signal: { lines: ['Prof. M.Ramesh Patnaik', 'M.Tech., Ph.D., F.I.E'], bg: '#f4f3ee', fg: '#c4161c', border: '#8a8a86' } },
    { x: 11.9, garland: true, signal: { lines: ['Prof.Y.Srinivasa Rao', 'Ph.D'], bg: '#f4f3ee', fg: '#151515', border: '#9a9a96' } },
    { x: 14.0 },
    { x: 16.4, garland: true, signal: { lines: ['Prof. A.BHUJANGA RAO', 'Ph.d'], bg: '#1f4c9c', fg: '#f4f4f4', border: '#13306a' } },
    { x: 19.7, gents: true },
  ];
  const winZ0 = [7.35];
  wall('x', Z0, 1, start, gateX, [...doorsZ0.map(d => ({ at: d.x, w: door.w + .06, bottom: F - .2, top: F + door.h + .06 })), ...winZ0.map(x => ({ at: x, w: 1.3, bottom: F + .93, top: F + 2.22 }))]);
  for (const d of doorsZ0) {
    const M = frameAt('x', Z0, 1, d.x);
    roomDoor(M, d);
    if (d.gents) plate(M, 'GENTS\nTOILETS', 0, F + door.h + .22, .012, .34, .2, '#f2f1ea', '#222');
  }
  for (const x of winZ0) barredWindow(frameAt('x', Z0, 1, x));
  for (const x of [6.4, 8.3, 10.6, 13.0, 15.2, 17.6, 20.8]) hiVent(Mz0, x, F + 2.75);
  for (const x of [7.6, 12.9, 18.0]) tube(Mz0, x, F + 2.55);
  for (const x of [10.5, 15.2, 18.6]) switchBox(Mz0, x, F + 1.42);
  meters(Mz0, 11.2, F + 2.45); meters(Mz0, 20.5, F + 2.4);
  for (const y of [C - .25, C - .3, C - .35]) conduit([start + .1, y, Z0 + .03], [gateX, y, Z0 + .03]);
  }
  // Landing gate (in the opening of the stair block's wall) and the east-end gate into the lobby.
  if (!second) gate(frameAt('z', 4.0, 1, (Z0 + Z1) / 2), Z1 - Z0, stairs.first + 2.25, 7.78, { base: stairs.first });
  gate(frameAt('z', gateX, 1, (Z0 + Z1) / 2), Z1 - Z0 + .16, F + 2.2, lintel);
  // The corridor's facade side: plain plaster under the screens with its skirting (the screens are architecture.js's).
  if (!second) box((start + gateX) / 2, F + .06, Z1 - .006, gateX - start, .12, .012, skirting);
  if (!second) for (let x = 7.6; x < gateX - 1; x += 3.6) box(x, (F + C) / 2, Z1 - .02, .36, C - F, .04, plaster); // plaster faces of the piers between screens

  // ------------------------------------------------------------------ the wing passage (x PL..PR)
  // East wall: DEVICE FAB LAB ahead of the corridor; north stub: a garlanded door; south: green barred windows, doors,
  // the extinguisher; the passage ends at doors north and south.
  const east = [
    { z: (Z0 + Z1) / 2, sign: 'DEVICE FAB\nLAB' },
    { z: 5.6, garland: true },
    { z: -2.7 },
    { z: -7.1, gate: true, sign: 'LAB' },
  ];
  const eastWin = [-.45, -4.9, -9.35];
  wall('z', PR, -1, PS, PN, [...east.map(d => ({ at: d.z, w: door.w + .06, bottom: F - .2, top: F + door.h + .06 })), ...eastWin.map(z => ({ at: z, w: 1.3, bottom: F + .93, top: F + 2.22 }))]);
  for (const d of east) {
    const M = frameAt('z', PR, -1, d.z);
    roomDoor(M, d);
    if (d.gate) { const { iron, lock } = P.grilleLeaf(door.w - .08, door.h - .05, 1, false); const hinge = M.clone().multiply(new T.Matrix4().makeTranslation(-door.w / 2 + .04, F + .02, .06)).multiply(new T.Matrix4().makeRotationY(-.12)); put(iron, gateSteel, hinge.clone()); put(lock, lockSteel, hinge.clone()); }
  }
  for (const z of eastWin) barredWindow(frameAt('z', PR, -1, z));
  const Me = frameAt('z', PR, -1, 0);
  if (!second) meters(Me, (Z0 + Z1) / 2 - 1.05, F + 2.35); // left of DEVICE FAB LAB (frames 40-44)
  for (const z of [(Z0 + Z1) / 2, 5.6, -2.7, -7.1]) put(new T.BoxGeometry(.9, .3, .02).translate(z, F + 2.95, .01), green, Me.clone()); // high vents over the doors
  for (const z of [4.4, -1.8, -6.0]) tube(Me, z, F + 2.6);
  for (const z of [-3.9, -8.2]) switchBox(Me, z, F + 1.42, false);
  { // fire extinguisher on its bracket beside the first window (frame 59.5)
    const e = P.extinguisher(), at = Me.clone().multiply(new T.Matrix4().makeTranslation(.55, F + 1.0, .1)), red = new T.MeshStandardMaterial({ name: 'Extinguisher red', color: '#b3191c', roughness: .35 });
    put(e.shell, red, at.clone()); put(e.black, skirting, at.clone()); put(e.bracket, gateSteel, at.clone()); }
  for (const y of [C - .25, C - .3]) conduit([PR - .03, y, PS], [PR - .03, y, PN]);
  // West side of the passage: the wall behind the corridor's rooms, painted teal (frames 59-64); the outer wall and its
  // windows south of it, and the screened bay north of the lobby, are the facade's (architecture.js).
  if (!second) box(PL + .005, (F + C) / 2, (-3.25 + Z0 - .05) / 2, .01, C - F, Z0 - .05 + 3.25, teal);
  box(PL + .012, F + .06, (PS + Z0) / 2, .012, .12, Z0 - PS, skirting); box(PL + .012, F + .06, (Z1 + PN) / 2, .012, .12, PN - Z1, skirting);
  // Gate from the lobby into the south passage (one grille leaf swung back), and the passage ends.
  gate(frameAt('x', Z0 - .02, -1, (PL + PR) / 2), PR - PL, F + 2.2, C - .02, { hinged: true });
  wall('x', PS, 1, PL - .1, PR + .1, [{ at: (PL + PR) / 2, w: door.w + .06, bottom: F - .2, top: F + door.h + .06 }]);
  { const M = frameAt('x', PS, 1, (PL + PR) / 2); roomDoor(M, { sign: 'BIO MEDICAL\nINSTRUMENTATION\nLAB', garland: true });
    if (!second) plate(M, 'BIOMEDICAL\nLABORATORY', 0, F + door.h + .3, .012, .36, .18, '#f2f1ea', '#222'); put(new T.BoxGeometry(1.1, .32, .02).translate(0, F + 2.95, .01), green, M.clone());
    if (!second) put(P.rbox(.32, .26, .14, .01, .85, F + 2.45, .07), ply, M.clone()); } // the brown junction box beside it
  wall('x', PN, -1, PL - .1, PR + .1, [{ at: (PL + PR) / 2, w: door.w + .06, bottom: F - .2, top: F + door.h + .06 }]);
  { const M = frameAt('x', PN, -1, (PL + PR) / 2); roomDoor(M, { sign: 'LAB' }); put(new T.BoxGeometry(.9, .3, .02).translate(0, F + 2.95, .01), green, M.clone()); }

  for (const [material, list] of batches) { const mesh = new T.Mesh(P.merge(list), material); mesh.receiveShadow = true; mesh.castShadow = material !== greenGlass; mesh.layers.enable(1); group.add(mesh); }

  // Working lights: each tube on the corridor or passage circuit, switched from the boxes by the gates (roomlights.js).
  const circuits = (second ? [1] : [0, 1]).map(k => [
    { name: second ? 'Second floor east corridor' : 'First floor east corridor', box: new T.Box3(new T.Vector3(start - .2, F - .3, Z0 - .2), new T.Vector3(gateX + .2, C + .2, Z1 + .3)), board: { at: Mz0, x: 6.4 } },
    { name: second ? 'Second floor east wing passage' : 'First floor east wing passage', box: new T.Box3(new T.Vector3(PL - .3, F - .3, PS - .2), new T.Vector3(PR + .2, C + .2, PN + .2)), board: { at: Me, x: 1.6 } },
  ][k]);
  for (const c of circuits) {
    const lights = createRoomLights(c.name, c.box), mine = tubes.filter(t => c.box.containsPoint(new T.Vector3(t.x, t.y, 0).applyMatrix4(t.matrix)));
    const fittings = mine.map(t => lights.add(new T.Vector3(t.x, t.y - .1, .3).applyMatrix4(t.matrix), 4, level => { t.mat.emissiveIntensity = 1.6 * Math.max(level, .03); }));
    group.traverse(o => { if (o.isMesh) lights.patch(o.material); });
    const position = new T.Vector3(c.board.x, F + 1.42, .006).applyMatrix4(c.board.at), turn = new T.Euler().setFromRotationMatrix(c.board.at).y;
    const { clickables } = makeSwitchboard(group, { name: c.name, position: position.toArray(), turn, toggles: [{ get: () => fittings[0]?.on ?? true, set: on => fittings.forEach(f => lights.set(f, on)) }] });
    group.userData.clickables = [...(group.userData.clickables || []), ...clickables];
    const prev = group.userData.update; group.userData.update = dt => { const a = prev?.(dt); return lights.update(dt) || a; };
  }
  return group;
}
