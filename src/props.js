import * as T from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

// Modelled furniture and fittings (owner, 2026-10-17: "nothing may look like Roblox cubes"). Every builder returns
// geometry in its own local frame (x right, y up, z toward the viewer / front) with rounded edges, real proportions and
// the parts a real object has; the caller places it and assigns materials. Sizes are typical of the photographed items,
// not measurements. Textures are generated (canvas), never photographs.

const keep = ['position', 'normal', 'uv'];
export function merge(list) {
  return mergeGeometries(list.map(g => {
    const c = g.index ? g.toNonIndexed() : g;
    for (const n of Object.keys(c.attributes)) if (!keep.includes(n)) c.deleteAttribute(n);
    if (!c.attributes.uv) c.setAttribute('uv', new T.Float32BufferAttribute(new Float32Array(c.attributes.position.count * 2), 2));
    return c;
  }));
}
export function rbox(w, h, d, r, x = 0, y = 0, z = 0) {
  const g = new RoundedBoxGeometry(w, h, d, 2, Math.max(.0005, Math.min(r, w / 2 - 1e-4, h / 2 - 1e-4, d / 2 - 1e-4)));
  g.translate(x, y, z); return g;
}
// Tapered member from a (radius r0) to b (radius r1); squash flattens the section (1 = round).
export function member(a, b, r0, r1 = r0, sides = 8, squash = 1) {
  const s = new T.Vector3(...a), e = new T.Vector3(...b), g = new T.CylinderGeometry(r1, r0, s.distanceTo(e), sides);
  if (squash !== 1) g.scale(1, 1, squash);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0, 1, 0), e.clone().sub(s).normalize()));
  g.translate(...s.clone().lerp(e, .5).toArray()); return g;
}
function roundedRect(w, h, r, cx = 0, cy = 0, path = new T.Shape()) {
  const x = cx - w / 2, y = cy - h / 2;
  path.moveTo(x + r, y); path.lineTo(x + w - r, y); path.quadraticCurveTo(x + w, y, x + w, y + r); path.lineTo(x + w, y + h - r);
  path.quadraticCurveTo(x + w, y + h, x + w - r, y + h); path.lineTo(x + r, y + h); path.quadraticCurveTo(x, y + h, x, y + h - r);
  path.lineTo(x, y + r); path.quadraticCurveTo(x, y, x + r, y); return path;
}
const lathe = (profile, segments = 28) => new T.LatheGeometry(profile.map(([r, y]) => new T.Vector2(r, y)), segments);

// ---------------------------------------------------------------- textures
let seed = 170617; const rnd = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
function canvasTexture(w, h, paint, { repeat = true, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; paint(c.getContext('2d'), w, h);
  const t = new T.CanvasTexture(c); if (srgb) t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = repeat ? T.RepeatWrapping : T.ClampToEdgeWrapping; t.anisotropy = 8; return t;
}
// Wood: long wavy grain lines, darker latewood streaks, a few knots. Grain runs along u (or v when vertical).
export function woodTexture(base = '#7a5636', { vertical = false, worn = 0 } = {}) {
  const t = canvasTexture(512, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 180; i++) {
      const y0 = rnd() * h, a = .8 + rnd() * 2.5, f = .003 + rnd() * .008, ph = rnd() * 6;
      g.strokeStyle = rnd() > .5 ? `rgba(30,18,8,${.05 + rnd() * .1})` : `rgba(255,230,190,${.03 + rnd() * .05})`; g.lineWidth = .4 + rnd() * 1.2;
      g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, y0 + Math.sin(x * f + ph) * a + Math.sin(x * f * 3.1 + ph) * a * .3); g.stroke();
    }
    for (let k = 0; k < 1; k++) { const kx = rnd() * w, ky = rnd() * h; for (let r = 2; r < 14; r += 2) { g.strokeStyle = `rgba(40,22,10,${.25 - r / 70})`; g.lineWidth = 1.2; g.beginPath(); g.ellipse(kx, ky, r * 2.2, r * .7, 0, 0, Math.PI * 2); g.stroke(); } }
    if (worn) for (let i = 0; i < 60 * worn; i++) { g.fillStyle = `rgba(20,14,8,${.05 + rnd() * .1})`; g.fillRect(rnd() * w, rnd() * h, 2 + rnd() * 20, 1 + rnd() * 3); }
  });
  if (vertical) { t.center.set(.5, .5); t.rotation = Math.PI / 2; }
  return t;
}
// Painted metal or timber: brush marks, edge chips showing primer and rust, rust bleeding from the bottom, dirt.
export function paintTexture(base, { rust = .5, chips = .5, primer = '#6b6a60' } = {}) {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 160; i++) { g.fillStyle = rnd() > .5 ? 'rgba(255,255,255,.035)' : 'rgba(0,0,0,.05)'; g.fillRect(0, rnd() * h, w, 1 + rnd() * 2); } // brush marks
    // Chips where hands and knocks wear paint: along the edges and the lower part, in irregular flakes.
    for (let i = 0; i < 60 * chips; i++) { const edge = rnd() < .7, x = edge ? (rnd() < .5 ? rnd() * 14 : w - rnd() * 14) : rnd() * w, y = edge ? rnd() * h : h * (.6 + rnd() * .4), s = .8 + rnd() * 3.5;
      g.fillStyle = rnd() > .4 ? primer : '#5a3a22'; g.beginPath(); g.moveTo(x, y); for (let k = 0; k < 6; k++) g.lineTo(x + (rnd() - .5) * s * 2.4, y + (rnd() - .5) * s * 1.6); g.closePath(); g.fill(); }
    if (rust) { const r = g.createLinearGradient(0, h, 0, h * .6); r.addColorStop(0, `rgba(120,62,28,${.55 * rust})`); r.addColorStop(1, 'rgba(120,62,28,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 40 * rust; i++) { g.fillStyle = `rgba(${110 + rnd() * 40},${50 + rnd() * 20},20,${.15 + rnd() * .3})`; g.fillRect(rnd() * w, rnd() * h, 1 + rnd() * 2, 4 + rnd() * 30); } }
    const d = g.createRadialGradient(w / 2, h / 2, w * .2, w / 2, h / 2, w * .75); d.addColorStop(0, 'rgba(0,0,0,0)'); d.addColorStop(1, 'rgba(30,25,15,.18)'); g.fillStyle = d; g.fillRect(0, 0, w, h);
  });
}
// Moulded polypropylene: faint scuffs and grey dirt in the low parts.
export function plasticTexture(base = '#ecebe3') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 220; i++) { g.fillStyle = `rgba(${90 + rnd() * 40},${90 + rnd() * 40},${85 + rnd() * 30},${.03 + rnd() * .07})`; g.beginPath(); g.ellipse(rnd() * w, rnd() * h, 2 + rnd() * 14, 1 + rnd() * 5, rnd() * 3, 0, Math.PI * 2); g.fill(); }
  });
}
export function kraftTexture() {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = '#b48a58'; g.fillRect(0, 0, w, h);
    for (let i = 0; i < 400; i++) { g.fillStyle = `rgba(${80 + rnd() * 60},${55 + rnd() * 40},30,${.05 + rnd() * .08})`; g.fillRect(rnd() * w, rnd() * h, 1, 1 + rnd() * 6); }
    for (let x = 0; x < w; x += 6) { g.fillStyle = 'rgba(70,45,20,.05)'; g.fillRect(x, 0, 2, h); } // corrugation shading
    g.strokeStyle = 'rgba(40,30,20,.6)'; g.lineWidth = 3; g.strokeRect(w * .3, h * .35, w * .4, h * .2); g.fillStyle = 'rgba(40,30,20,.6)'; g.font = 'bold 22px Arial'; g.textAlign = 'center'; g.fillText('THIS SIDE UP', w / 2, h * .48);
    g.fillStyle = 'rgba(200,170,110,.55)'; g.fillRect(0, h * .46, w, h * .08); // brown tape band
  });
}
export function clothTexture(base = '#7e1820') {
  return canvasTexture(256, 256, (g, w, h) => {
    g.fillStyle = base; g.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 2) { g.fillStyle = y % 4 ? 'rgba(0,0,0,.06)' : 'rgba(255,255,255,.03)'; g.fillRect(0, y, w, 1); } // weave
    for (let x = 0; x < w; x += 2) { g.fillStyle = 'rgba(0,0,0,.04)'; g.fillRect(x, 0, 1, h); }
  });
}

// ---------------------------------------------------------------- furniture
// White monobloc chair (moulded polypropylene, stackable): dished seat with a rolled front, splayed channel legs,
// a curved slotted back running into the rear legs, flat armrests.
export function monoblocChair() {
  const parts = [];
  const seat = new T.ExtrudeGeometry(roundedRect(.45, .43, .07), { depth: .012, bevelEnabled: true, bevelThickness: .008, bevelSize: .01, bevelSegments: 2, curveSegments: 6 });
  seat.rotateX(-Math.PI / 2);
  { const p = seat.attributes.position; for (let i = 0; i < p.count; i++) { const x = p.getX(i), z = p.getZ(i); let y = p.getY(i) + .43;
    y -= .018 * Math.max(0, 1 - (x / .225) ** 2) * Math.max(0, 1 - (z / .215) ** 2); if (z > .16) y -= (z - .16) * .8; p.setY(i, y); } }
  seat.computeVertexNormals(); parts.push(seat);
  const back = roundedRect(.43, .38, .06);
  for (let k = 0; k < 3; k++) back.holes.push(roundedRect(.3, .032, .014, 0, -.1 + k * .07, new T.Path()));
  back.holes.push(roundedRect(.12, .03, .014, 0, .14, new T.Path())); // hand-hold
  const bg = new T.ExtrudeGeometry(back, { depth: .012, bevelEnabled: true, bevelThickness: .005, bevelSize: .006, bevelSegments: 2, curveSegments: 6 });
  { const p = bg.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - .7 * p.getX(i) ** 2); }
  bg.computeVertexNormals(); bg.rotateX(-.2); bg.translate(0, .67, -.2); parts.push(bg);
  for (const s of [-1, 1]) {
    parts.push(member([s * .195, .42, .165], [s * .245, 0, .24], .026, .018, 10, .55)); // front legs
    parts.push(member([s * .195, .42, -.185], [s * .245, 0, -.27], .026, .018, 10, .55)); // rear legs
    parts.push(member([s * .205, .4, -.19], [s * .215, .86, -.285], .024, .02, 10, .5)); // back uprights
    parts.push(member([s * .215, .64, -.25], [s * .23, .62, .14], .022, .022, 10, .45)); // armrest
    parts.push(member([s * .23, .62, .14], [s * .2, .43, .165], .02, .022, 10, .6)); // armrest support
  }
  return merge(parts);
}
// Plain wooden chair: square legs, the back legs rising and raked, a slatted seat, two curved back rails, stretchers.
export function woodenChair() {
  const parts = [];
  for (const s of [-1, 1]) {
    parts.push(rbox(.036, .44, .036, .006, s * .19, .22, .18));
    { const g = rbox(.036, .92, .036, .006); g.rotateX(-.09); g.translate(s * .19, .45, -.21); parts.push(g); }
    parts.push(rbox(.022, .03, .38, .004, s * .19, .14, -.015)); // side stretchers
    parts.push(rbox(.02, .06, .36, .004, s * .19, .4, -.015)); // side aprons
  }
  for (let k = 0; k < 4; k++) parts.push(rbox(.42, .02, .09, .005, 0, .45, -.16 + k * .105));
  for (const z of [.18, -.2]) parts.push(rbox(.36, .06, .02, .004, 0, .4, z));
  parts.push(rbox(.36, .025, .02, .004, 0, .14, .18));
  for (const y of [.68, .84]) { const g = rbox(.36, .065, .018, .005); const p = g.attributes.position; for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) - .35 * p.getX(i) ** 2); g.computeVertexNormals(); g.rotateX(-.09); g.translate(0, y, -.24 - (y - .45) * .09); parts.push(g); }
  return merge(parts);
}
// Wooden table: top with rounded edges, apron, tapered legs, an optional low shelf.
export function woodTable(w, d, h, { shelf = true, top = .035 } = {}) {
  const parts = [rbox(w, top, d, .008, 0, h - top / 2, 0)];
  for (const z of [-1, 1]) parts.push(rbox(w - .1, .08, .02, .004, 0, h - top - .04, z * (d / 2 - .05)));
  for (const x of [-1, 1]) parts.push(rbox(.02, .08, d - .1, .004, x * (w / 2 - .05), h - top - .04, 0));
  for (const x of [-1, 1]) for (const z of [-1, 1]) parts.push(member([x * (w / 2 - .05), h - top, z * (d / 2 - .05)], [x * (w / 2 - .055), 0, z * (d / 2 - .055)], .022, .016, 4).rotateY(0));
  if (shelf) parts.push(rbox(w - .1, .015, d - .1, .003, 0, .2, 0));
  return merge(parts);
}
// Low stool: round seat on three splayed legs with a ring.
export function stool(h = .5) {
  const parts = [lathe([[0, h], [.15, h], [.155, h - .01], [.15, h - .03], [0, h - .03]], 24)];
  for (let k = 0; k < 3; k++) { const a = k * Math.PI * 2 / 3; parts.push(member([Math.cos(a) * .09, h - .03, Math.sin(a) * .09], [Math.cos(a) * .15, 0, Math.sin(a) * .15], .016, .013, 8)); }
  parts.push(new T.TorusGeometry(.12, .008, 6, 24).rotateX(Math.PI / 2).translate(0, h * .35, 0));
  return merge(parts);
}
// Table draped with cloth: flat top, a skirt that hangs in soft folds and flares slightly at the hem.
export function drapedCloth(w, d, h, drop = h * .95) {
  const N = 96, M = 8, pos = [], uv = [], idx = [], per = 2 * (w + d);
  const at = s => { s = ((s % per) + per) % per; if (s < w) return [-w / 2 + s, d / 2, 0, 1]; s -= w; if (s < d) return [w / 2, d / 2 - s, 1, 0]; s -= d; if (s < w) return [w / 2 - s, -d / 2, 0, -1]; s -= w; return [-w / 2, -d / 2 + s, -1, 0]; };
  for (let j = 0; j <= M; j++) for (let i = 0; i <= N; i++) {
    const s = i / N * per, t = j / M, [x, z, nx, nz] = at(s), fold = Math.sin(s * 22) * .012 * t + Math.sin(s * 9 + 1.3) * .008 * t, out = .015 + .03 * t * t + fold;
    pos.push(x + nx * out, h - t * drop, z + nz * out); uv.push(s / .5, t * drop / .5);
  }
  for (let j = 0; j < M; j++) for (let i = 0; i < N; i++) { const a = j * (N + 1) + i, b = a + 1, c = a + N + 1, e = c + 1; idx.push(a, c, b, b, c, e); }
  const skirt = new T.BufferGeometry(); skirt.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); skirt.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); skirt.setIndex(idx); skirt.computeVertexNormals();
  const top = rbox(w + .03, .012, d + .03, .005, 0, h, 0);
  return merge([skirt, top]);
}

// ---------------------------------------------------------------- doors, grilles
// Panelled timber door leaf, hinge at x = 0, opening toward x = dir * lw: stiles and rails, recessed panels with
// raised bevelled fields, three butt hinges, a D pull and a tower bolt. { paint, metal } geometries.
export function panelLeaf(lw, h, panels = 4, dir = 1, t = .045) {
  const paint = [], metal = [], X = x => dir * x, sw = .1, rh = .11;
  for (const x of [sw / 2, lw - sw / 2]) paint.push(rbox(sw, h, t, .006, X(x), h / 2, 0));
  const ph = (h - .2 - rh - (panels - 1) * .07) / panels, pw = lw - 2 * sw;
  paint.push(rbox(pw, .2, t, .005, X(lw / 2), .1, 0), rbox(pw, rh, t, .005, X(lw / 2), h - rh / 2, 0));
  for (let r = 0; r < panels; r++) {
    const y = .2 + ph / 2 + r * (ph + .07);
    if (r < panels - 1) paint.push(rbox(pw, .07, t, .005, X(lw / 2), y + ph / 2 + .035, 0));
    paint.push(rbox(pw, ph, t * .45, .003, X(lw / 2), y, 0)); // thin panel
    for (const z of [-1, 1]) paint.push(rbox(pw - .07, ph - .07, t * .3, .012, X(lw / 2), y, z * t * .2)); // raised field
  }
  for (const y of [.22, h / 2, h - .22]) { metal.push(new T.CylinderGeometry(.011, .011, .1, 10).translate(0, y, t / 2 + .004)); metal.push(rbox(.05, .1, .003, .001, X(.025), y, t / 2 + .002)); }
  for (const z of [-1, 1]) { const handle = new T.TorusGeometry(.04, .007, 8, 16, Math.PI); handle.rotateZ(Math.PI / 2 * dir); handle.translate(X(lw - .07), h * .47, z * (t / 2 + .03)); metal.push(handle);
    metal.push(rbox(.03, .14, .004, .001, X(lw - .07), h * .47, z * (t / 2 + .002))); }
  metal.push(rbox(.03, .12, .012, .003, X(lw - .06), h - .2, t / 2 + .008), member([X(lw - .06), h - .16, t / 2 + .014], [X(lw - .06), h - .26, t / 2 + .014], .006, .006, 8));
  return { paint: merge(paint), metal: merge(metal) };
}
// Door frame: jambs and head with a moulded architrave on the passage side.
export function doorFrame(w, h, depth = .12) {
  const parts = [];
  for (const s of [-1, 1]) { parts.push(rbox(.06, h + .06, depth, .006, s * (w / 2 + .03), h / 2, 0)); parts.push(rbox(.07, h + .1, .02, .006, s * (w / 2 + .065), h / 2, depth / 2)); }
  parts.push(rbox(w + .12, .06, depth, .006, 0, h + .03, 0), rbox(w + .2, .07, .02, .006, 0, h + .085, depth / 2));
  return merge(parts);
}
// Welded iron grille leaf, hinge at x = 0: flat-bar frame, round bars, rails, optional arched head with concentric arcs
// and radiating bars, welded at the joints, hinge pins and a hasp with a padlock. { iron, lock } geometries.
export function grilleLeaf(lw, h, dir = 1, arched = true) {
  const iron = [], lock = [], X = x => dir * x;
  for (const x of [.012, lw - .012]) iron.push(rbox(.025, h, .01, .002, X(x), h / 2, 0));
  for (const y of [.03, h - .012]) iron.push(rbox(lw, .025, .01, .002, X(lw / 2), y, 0));
  const bar = (a, b, r = .007) => iron.push(member(a, b, r, r, 8));
  if (arched) {
    const sp = h * .68;
    for (let k = 1; k < 5; k++) bar([X(lw * k / 5), .04, 0], [X(lw * k / 5), sp, 0]);
    for (const y of [.55, 1.05, sp]) iron.push(rbox(lw, .02, .008, .002, X(lw / 2), y, 0));
    for (const r of [.3, .55, .8]) { const curve = new T.EllipseCurve(X(lw / 2), sp, r * lw * .5, r * h * .3, 0, Math.PI, false); const pts = curve.getPoints(24).map(p => new T.Vector3(p.x, p.y, 0)); iron.push(new T.TubeGeometry(new T.CatmullRomCurve3(pts), 32, .0065, 6, false)); }
    for (const a of [Math.PI / 4, Math.PI / 2, 3 * Math.PI / 4]) bar([X(lw / 2), sp, 0], [X(lw / 2) + Math.cos(a) * lw * .4 * dir, sp + Math.sin(a) * h * .24, 0], .006);
    for (let k = 1; k < 5; k++) for (const y of [.55, 1.05]) iron.push(new T.SphereGeometry(.011, 8, 6).scale(1, 1, .6).translate(X(lw * k / 5), y, 0)); // welds
  } else {
    for (let k = 1; k < 7; k++) bar([X(lw * k / 7), .04, 0], [X(lw * k / 7), h - .02, 0], .0065);
    for (let y = .2; y < h - .05; y += .16) iron.push(rbox(lw, .016, .007, .002, X(lw / 2), y, .006));
  }
  for (const y of [.2, h - .2]) iron.push(new T.CylinderGeometry(.012, .012, .09, 10).translate(0, y, 0));
  lock.push(rbox(.045, .05, .018, .006, X(lw - .03), h * .48, .03), new T.TorusGeometry(.016, .004, 6, 14, Math.PI).translate(X(lw - .03), h * .48 + .025, .03));
  return { iron: merge(iron), lock: merge(lock) };
}

// ---------------------------------------------------------------- vessels, containers, tools
// Plastic bucket: tapered, ribbed under the rim, wall thickness and inside visible, wire handle with a grip.
export function bucket(rt = .15, rb = .12, h = .3) {
  const body = lathe([[0, 0], [rb - .01, 0], [rb, .012], [rt - .004, h - .03], [rt + .008, h - .028], [rt + .008, h - .02], [rt - .002, h - .018], [rt + .012, h - .004], [rt + .012, h], [rt - .006, h], [rb - .008, .014], [0, .014]], 32);
  const handle = new T.TubeGeometry(new T.CatmullRomCurve3(Array.from({ length: 13 }, (_, i) => { const a = Math.PI * i / 12; return new T.Vector3(Math.cos(a) * (rt + .01), h - .02 + Math.sin(a) * rt * .85, 0); })), 24, .003, 5, false);
  return { body, handle: merge([handle, member([-.05, h - .02 + rt * .85, 0], [.05, h - .02 + rt * .85, 0], .01, .01, 8)]) };
}
export function steelTumbler(r = .035, h = .1) { return lathe([[0, 0], [r * .85, 0], [r, h], [r + .003, h], [r * .85 + .003, .003], [0, .003]], 24); }
export function steelBowl(r = .09, h = .05) { return lathe([[0, 0], [r * .55, 0], [r * .9, h * .6], [r, h], [r + .004, h], [r * .92 + .003, h * .55], [r * .55, .003], [0, .003]], 28); }
export function steelPlate(r = .14) { return lathe([[0, 0], [r * .8, 0], [r, .022], [r + .003, .022], [r * .8, .003], [0, .003]], 32); }
export function steelPot(r = .1, h = .2) { return lathe([[0, 0], [r * .7, 0], [r, h * .35], [r * .85, h * .75], [r * .55, h * .85], [r * .62, h], [r * .65, h], [r * .58, h * .86], [r * .8, h * .75], [r * .95, h * .35], [r * .7, .003], [0, .003]], 28); }
// Cardboard carton: crisp-cornered box, top flaps meeting at a taped seam.
export function carton(w, h, d) { return { box: rbox(w, h, d, .004, 0, h / 2, 0), tape: rbox(.05, .002, d + .01, .001, 0, h + .001, 0) }; }
// Aluminium step ladder leaning on a wall: channel rails, ribbed treads, rear legs, top cap.
export function stepLadder(h = 2.05) {
  const parts = [], n = 7, slope = .14;
  for (const s of [-1, 1]) { const g = rbox(.05, h / Math.cos(slope), .022, .004); g.rotateX(-slope); g.translate(s * .2, h / 2, -Math.tan(slope) * h / 2 + .02); parts.push(g); } // rails lean with the treads
  for (let k = 1; k <= n; k++) { const y = k * h / (n + 1); const g = rbox(.4, .02, .09, .004); g.translate(0, y, -Math.tan(slope) * y + .02); parts.push(g); for (let r = -1; r <= 1; r++) parts.push(rbox(.39, .006, .006, .002, 0, y + .012, -Math.tan(slope) * y + .02 + r * .025)); }
  parts.push(rbox(.46, .04, .14, .01, 0, h + .02, -Math.tan(slope) * h));
  return merge(parts);
}
// Plywood or plank board with real thickness; slightly bowed.
export function board(w, h, t = .018) {
  const g = new T.BoxGeometry(w, h, t, 8, 8, 1); const p = g.attributes.position;
  for (let i = 0; i < p.count; i++) p.setZ(i, p.getZ(i) + Math.sin((p.getY(i) / h + .5) * Math.PI) * .012);
  g.computeVertexNormals(); return g;
}
// Dry-powder extinguisher: domed cylinder, neck, valve head with lever and pin, hose to a nozzle, wall bracket.
export function extinguisher() {
  const shell = lathe([[0, 0], [.07, 0], [.075, .01], [.075, .38], [.07, .42], [.05, .45], [.025, .46], [.022, .48], [0, .48]], 28);
  const valve = merge([rbox(.05, .05, .04, .008, 0, .5, 0), rbox(.11, .012, .03, .004, .03, .535, 0), member([-.02, .49, 0], [-.05, .52, 0], .006, .006, 8)]);
  const hose = new T.TubeGeometry(new T.CatmullRomCurve3([[.02, .5, .0], [.06, .48, .03], [.085, .3, .04], [.08, .12, .04], [.07, .08, .03]].map(p => new T.Vector3(...p))), 32, .008, 8, false);
  const nozzle = member([.07, .08, .03], [.065, .03, .03], .012, .01, 8), bracket = rbox(.1, .06, .02, .004, 0, .3, -.085);
  return { shell, black: merge([valve, hose, nozzle]), bracket };
}
// Fluorescent tube batten: steel channel with end caps, the tube glowing beneath.
export function tubeBatten(len = 1.22) {
  return { body: merge([rbox(len, .035, .055, .008), rbox(.02, .05, .06, .004, -len / 2 + .01, -.01, 0), rbox(.02, .05, .06, .004, len / 2 - .01, -.01, 0)]),
    tube: new T.CylinderGeometry(.013, .013, len - .05, 12).rotateZ(Math.PI / 2).translate(0, -.03, 0) };
}
// Steel distribution/fuse box: rounded body, a hinged door with a seam, hinges and a latch.
export function fuseBox(w, h, d) {
  return { body: merge([rbox(w, h, d, .008), rbox(w - .02, h - .02, .004, .002, 0, 0, d / 2 + .001)]),
    metal: merge([new T.CylinderGeometry(.006, .006, .04, 8).translate(-w / 2 + .005, h / 4, d / 2), new T.CylinderGeometry(.006, .006, .04, 8).translate(-w / 2 + .005, -h / 4, d / 2), rbox(.02, .04, .012, .003, w / 2 - .03, 0, d / 2 + .006)]) };
}
// Flush timber door with a wood-grain laminate face (the west corridor's room doors, video 0-28 s): one leaf with
// lipped edges, a handle, a hasp with padlock and a tower bolt; hinge at x = 0, opening toward dir. { leaf, metal }.
export function flushLeaf(lw, h, dir = 1, t = .04) {
  const X = x => dir * x, leaf = merge([rbox(lw, h, t, .004, X(lw / 2), h / 2, 0), rbox(lw, .012, t + .004, .002, X(lw / 2), h - .006, 0), rbox(lw, .012, t + .004, .002, X(lw / 2), .006, 0)]);
  const metal = [];
  for (const y of [.2, h / 2, h - .2]) metal.push(new T.CylinderGeometry(.01, .01, .09, 10).translate(0, y, t / 2 + .003));
  for (const z of [-1, 1]) metal.push(member([X(lw - .07), h * .45 - .06, z * (t / 2 + .025)], [X(lw - .07), h * .45 + .06, z * (t / 2 + .025)], .007, .007, 8),
    member([X(lw - .07), h * .45 - .06, z * (t / 2 + .002)], [X(lw - .07), h * .45 - .06, z * (t / 2 + .025)], .006, .006, 6), member([X(lw - .07), h * .45 + .06, z * (t / 2 + .002)], [X(lw - .07), h * .45 + .06, z * (t / 2 + .025)], .006, .006, 6));
  metal.push(rbox(.1, .035, .006, .002, X(lw - .03), h * .52, t / 2 + .003), rbox(.04, .05, .018, .006, X(lw + .01), h * .52 - .04, t / 2 + .02), new T.TorusGeometry(.014, .004, 6, 14, Math.PI).translate(X(lw + .01), h * .52 - .015, t / 2 + .02));
  metal.push(rbox(.025, .14, .012, .003, X(lw - .05), h - .25, t / 2 + .006));
  return { leaf, metal: merge(metal) };
}
