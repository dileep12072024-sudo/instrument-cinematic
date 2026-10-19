import * as T from 'three';
import * as P from './props.js';
import { patternedGlass } from './props.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { groundSpine } from './footprint.js';
import { buildClassThree } from './classroom-three.js';
import { buildClassTwo } from './classroom-two.js';
import { buildClassFour } from './classroom-four.js';

// Heights are reference-based estimates; the entrance and junction both descend into the wing.
const flightRise = groundSpine.rightFloor - groundSpine.hallFloor;
export const classroom = { floor: 4.044 - flightRise, landing: 4.044, lowerFloor: 4.044 - 2 * flightRise, stepRise: flightRise / 3, ceiling: 7.78, originX: -4, originZ: 2.166667, length: 20.3 };
export const classroomPassage = {
  start: 1.085, end: 11, // owner confirmed the small room behind this original partition
  windowWall: -18.27, windowWidth: 1.95, windows: [4.8, 7.1, 9.4],
  doors: [6.5, 8.9], grilles: [2.5, 4.6],
};

export function buildClassroomWing(parent, m) {
  const group = new T.Group(); group.name = 'Upstairs classroom wing';
  group.position.set(classroom.originX, 0, classroom.originZ); group.rotation.y = Math.PI / 2;
  group.userData = { reference: '20261013_130612.mp4', entry: 'right turn upstairs', ...classroom }; parent.add(group);
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
    if (mat === plaster || mat === stone) {
      const { position: p, normal: n, uv } = g.attributes;
      for (let i = 0; i < p.count; i++) {
        const u = Math.abs(n.getX(i)) > .5 ? p.getZ(i) : p.getX(i);
        const v = Math.abs(n.getY(i)) > .5 ? p.getZ(i) : p.getY(i);
        uv.setXY(i, u / (mat === stone ? .64 : 3), v / (mat === stone ? .88 : 3));
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
    c.fillStyle = '#817e73'; c.fillRect(0, 0, w, h); // grey-brown linear-grain vitrified tiles
    for (let i = 0; i < 2200; i++) { c.strokeStyle = rand() > .5 ? '#c0b9aa12' : '#393a3510'; c.lineWidth = .3 + rand() * 2; const x = rand() * w; c.beginPath(); c.moveTo(x, 0); c.bezierCurveTo(x + 12, h / 3, x - 8, h * .7, x + rand() * 8, h); c.stroke(); }
    c.strokeStyle = '#4d504c88'; c.lineWidth = 1; c.strokeRect(0, 0, w, h);
  });
  const stone = new T.MeshStandardMaterial({ name: 'Classroom veined stone tiles', map: stoneMap, roughness: .32, envMapIntensity: .22 });
  const dark = new T.MeshStandardMaterial({ color: '#242b29', roughness: .48, metalness: .35 });
  const aluminium = new T.MeshStandardMaterial({ color: '#c0bfae', metalness: .65, roughness: .36 });
  const wood = m.entranceWood.clone(); wood.name = 'Classroom timber frames and doors'; wood.color.set('#b47a4c'); wood.roughness = .57; // medium brown, as photographed (renders darker in the dim corridor)
  const plasterMap = texture((c, w, h) => {
    c.fillStyle = '#deddd2'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 7000; i++) {
      c.fillStyle = `rgba(100,105,94,${.015 + rand() * .035})`;
      c.fillRect(rand() * w, rand() * h, 1 + rand() * 5, 1 + rand() * 5);
    }
  });
  const plaster = new T.MeshStandardMaterial({ name: 'Weathered classroom plaster', map: plasterMap, bumpMap: plasterMap, bumpScale: .008, roughness: .9 });
  const screenMaterial = plaster.clone(); screenMaterial.name = 'Pierced classroom concrete screens'; screenMaterial.roughness = .95;
  const screens = new Map();
  // Pressed patterned glass (owner: no window here is clear): translucent, blurred, patterned.
  const clearGlass = new T.MeshStandardMaterial({ name: 'Classroom patterned glass', map: patternedGlass(), transparent: true, opacity: .82, roughness: .45, depthWrite: false, side: T.DoubleSide });
  const { brass: hwBrass, steel: hwSteel } = P.hardware();
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
  function door(x, bottom, z, width, name = '', glazed = true, { open = 0, plateAbove = false, panelled = false } = {}) {
    const h = 2.32, front = z + .046;
    for (const s of [-1, 1]) box(x + s * (width / 2 + .036), bottom + h / 2, z, .072, h + .07, .10, wood);
    box(x, bottom + h + .035, z, width + .14, .07, .10, wood);
    const leafStart = new Map([...batches].map(([material, gs]) => [material, gs.length])), leafChildren = new Set(group.children);
    const leaf = new T.Shape(); leaf.moveTo(-width / 2, 0); leaf.lineTo(width / 2, 0); leaf.lineTo(width / 2, h); leaf.lineTo(-width / 2, h); leaf.closePath();
    if (glazed) {
      const opening = new T.Path(); opening.moveTo(-.195, 1.55); opening.lineTo(-.195, 1.89); opening.lineTo(.195, 1.89); opening.lineTo(.195, 1.55); opening.closePath(); leaf.holes.push(opening);
    }
    const panel = new T.ExtrudeGeometry(leaf, { depth: .046, bevelEnabled: true, bevelSize: .002, bevelThickness: .002, bevelSegments: 1, steps: 1 }); panel.translate(x, bottom, z - .023); add(panel, wood);
    if (panelled) {
      for (const s of [-1, 1]) {
        const face = z + s * .03;
        for (const dx of [-width / 2 + .055, width / 2 - .055]) box(x + dx, bottom + h / 2, face, .11, h, .02, wood);
        for (const dy of [.055, .73, 1.46, h - .055]) box(x, bottom + dy, face, width, .11, .02, wood);
      }
    }
    // The small inspection pane sits in a recessed timber bead, not a projecting box.
    if (glazed) {
      box(x, bottom + 1.72, z, .39, .34, .012, doorGlass);
      for (const s of [-1, 1]) { box(x + s * .218, bottom + 1.72, front, .036, .40, .032, wood); box(x, bottom + 1.72 + s * .182, front, .47, .036, .032, wood); }
    }
    tube([[x + width * .32, bottom + .85, front], [x + width * .32, bottom + 1.05, front]], .011, aluminium);
    { const a = P.aldrop(.38); for (const [g, mat] of [[a.brass, hwBrass], [a.steel, hwSteel]]) if (g) { g.translate(x + .05, bottom + .70, front - .024); add(g, mat); } } // aldrop and padlock (owner's references 75, 76)
    if (name) label(name, x, bottom + (plateAbove ? 1.98 : 1.40), front + .02, .52, .11, '#182220', '#eeeedd').name = `Door sign: ${name}`;
    if (open) { // swing the leaf about its left hinge, into the corridor
      const hinge = new T.Matrix4().makeTranslation(x - width / 2, 0, z).multiply(new T.Matrix4().makeRotationY(-open)).multiply(new T.Matrix4().makeTranslation(-(x - width / 2), 0, -z));
      for (const [material, gs] of batches) for (let j = leafStart.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(hinge);
      for (const child of group.children) if (!leafChildren.has(child)) child.applyMatrix4(hinge);
    }
  }
  function window(x, y, z, width, angle = 0) {
    const transform = new T.Matrix4().makeRotationY(angle); transform.setPosition(x, y, z);
    function part(px, py, w, h, material, pz = 0, depth = .03) {
      const g = new T.BoxGeometry(w, h, depth); g.translate(px, py, pz); g.applyMatrix4(transform); add(g, material);
    }
    const height = 1.48;
    // One continuous pierced screen behind the tracks, not a pattern repeated on each glass pane.
    if (!screens.has(width)) {
      const shape = new T.Shape();
      shape.moveTo(-width / 2, -height / 2); shape.lineTo(width / 2, -height / 2);
      shape.lineTo(width / 2, height / 2); shape.lineTo(-width / 2, height / 2); shape.closePath();
      const cols = 18, rows = 9, dx = width / cols, dy = height / rows;
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols - (row % 2); col++) {
        const cx = -width / 2 + (col + .5 + (row % 2) / 2) * dx, cy = -height / 2 + (row + .5) * dy;
        const hole = new T.Path();
        const rx = dx * .34, ry = dy * .39;
        hole.moveTo(cx, cy + ry);
        hole.bezierCurveTo(cx + rx * 1.33, cy + ry * .45, cx + rx * 1.33, cy - ry * .45, cx, cy - ry);
        hole.bezierCurveTo(cx - rx * 1.33, cy - ry * .45, cx - rx * 1.33, cy + ry * .45, cx, cy + ry);
        hole.closePath(); shape.holes.push(hole);
      }
      const screen = new T.ExtrudeGeometry(shape, { depth: .075, curveSegments: 4, bevelEnabled: true, bevelSize: .004, bevelThickness: .004, bevelSegments: 1, steps: 1 });
      screen.translate(0, 0, -.15); screens.set(width, screen);
    }
    add(screens.get(width).clone().applyMatrix4(transform), screenMaterial);
    for (const s of [-1, 1]) { part(s * width / 2, 0, .035, height + .07, aluminium); part(0, s * height / 2, width, .035, aluminium); }
    for (const track of [-.025, .025]) for (const s of [-1, 1]) part(0, s * (height / 2 - .027), width, .014, aluminium, track, .012);
    for (let i = 0; i < 4; i++) {
      const paneWidth = width / 4, px = -width / 2 + (i + .5) * paneWidth + (i === 1 ? -.65 * paneWidth : i === 2 ? .65 * paneWidth : 0);
      const track = i % 2 ? .025 : -.025;
      part(px, 0, paneWidth - .024, height - .07, clearGlass, track, .006);
      for (const s of [-1, 1]) { part(px + s * paneWidth / 2, 0, .023, height - .03, aluminium, track); part(px, s * (height / 2 - .04), paneWidth, .02, aluminium, track); }
      part(px + paneWidth / 2 - .04, -.12, .018, .13, dark, track + .025, .02);
    }
  }
  const { floor: y, ceiling } = classroom;
  const W = -.985, inner = W + .08; // window-wall centre and its corridor face
  floor(0, -8.75, 2.17, 16.3, y); // -.6 to -16.9
  floor(0, -18.96, 2.17, 2.68, classroom.lowerFloor); // -17.62 to -20.3
  // Three full-width risers, two treads, then the lower junction landing (photo 1 / return clip 0s).
  for (let i = 0; i < 2; i++) {
    const h = (2 - i) * classroom.stepRise;
    box(0, classroom.lowerFloor + h / 2, -17.08 - i * .36, 2.17, h, .36, stone);
  }
  box(0, y - (flightRise + .02) / 2, -8.75, 2.17, flightRise - .02, 16.3, plaster);
  box(0, y - classroom.stepRise / 2, -16.91, 2.17, classroom.stepRise, .02, stone);
  const sideCeiling = 7.22; // just below the west wing roof slab (7.29), whose dark underside otherwise covers it
  // Ceilings read bright white in every reference (daylight bounce off the floor and walls); a faint emissive term stands in.
  const ceilingPlaster = plaster.clone(); ceilingPlaster.name = 'Classroom ceiling plaster'; ceilingPlaster.emissive.set('#bdbab0'); ceilingPlaster.emissiveIntensity = .45;
  box(0, ceiling, -8.5, 2.35, .12, 17, ceilingPlaster);
  box(0, sideCeiling, -18.65, 2.35, .12, 3.3, ceilingPlaster);
  box(0, (ceiling + sideCeiling) / 2, -17, 2.35, ceiling - sideCeiling, .12, ceilingPlaster);
  floor(0, 1.1, 2.17, 2.2, classroom.landing);
  // Library is beside the classroom entrance on the upper landing (094920, 12s).
  const libraryStart = new Map([...batches].map(([material, gs]) => [material, gs.length]));
  const libraryChildren = new Set(group.children);
  door(0, classroom.landing, 0, 1.02, 'LIBRARY', true, { plateAbove: true });
  // Paper notice on the frame head (094920 at 11-25 s): outlined red DEPARTMENT over LIBRARY.
  const notice = texture((c, w, h) => {
    c.fillStyle = '#f1efe6'; c.fillRect(0, 0, w, h); c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = 'bold 46px Arial'; c.strokeStyle = '#c23a2c'; c.lineWidth = 2; c.strokeText('DEPARTMENT', w / 2, h * .33, w - 40);
    c.font = 'bold 50px Arial'; c.fillStyle = '#c23a2c'; c.fillText('LIBRARY', w / 2, h * .7, w - 110);
  }, 320, 200);
  const paper = new T.Mesh(new T.PlaneGeometry(.335, .21), new T.MeshStandardMaterial({ map: notice, roughness: .9 }));
  paper.name = 'DEPARTMENT LIBRARY notice'; paper.position.set(0, classroom.landing + 2.50, .06); group.add(paper);
  const libraryTransform = new T.Matrix4().makeRotationY(Math.PI / 2); libraryTransform.setPosition(-1.28, 0, 1.45);
  for (const [material, gs] of batches) for (let j = libraryStart.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(libraryTransform);
  for (const child of group.children) if (!libraryChildren.has(child)) child.applyMatrix4(libraryTransform);
  // Only the pier left of the door: right of it the terrace partition carries on as the plaque wall (one plane, as filmed).
  box(-1.33, (classroom.landing + ceiling) / 2, .57, .14, ceiling - classroom.landing, .64, plaster);
  box(-1.33, (classroom.landing + 2.5 + ceiling) / 2, 1.45, .14, ceiling - classroom.landing - 2.5, 1.12, plaster);
  for (let i = 0; i < 2; i++) {
    const h = (2 - i) * classroom.stepRise;
    box(0, y + h / 2, -.15 - i * .30, 2.17, h, .30, stone);
  }
  box(0, y + (flightRise - .02) / 2, 1.1, 2.17, flightRise - .02, 2.2, plaster);
  box(0, classroom.landing - classroom.stepRise / 2, .01, 2.17, classroom.stepRise, .02, stone);
  // Window wall aligns with the existing five pierced facade bays. It stands just inside the front
  // facade, whose blue pilasters and inner face (to x=-0.915 here) would otherwise poke into the corridor.
  box(W, (classroom.lowerFloor + y + 1.08) / 2, -8.76, .16, y + 1.08 - classroom.lowerFloor, 18.48, plaster);
  box(W, (y + 2.56 + ceiling) / 2, -8.76, .16, ceiling - y - 2.56, 18.48, plaster);
  box(W, y + 1.82, .3, .16, 1.48, .34, plaster);
  for (let i = 0; i <= 5; i++) box(W, y + 1.82, -i * 3.6, .16, 1.48, .64, plaster);
  for (let i = 0; i < 5; i++) window(W + .085, y + 1.82, -1.8 - i * 3.6, 2.96, Math.PI / 2);
  // Room doors along the corridor: Dr. A. Daisy Rani's (2.3), Dr.A. Kamala Kumari's (5.8) and Dr.P. Swapna's (9.2) rooms, then the girls'
  // washroom and, beside the lower junction, the boys' washroom (owner, 2026-10-18; 103849 at 0-3 s).
  const openings = [2.3, 5.8, 9.2, 11.4, 16.2];
  group.userData.mainDoorOffsets = openings;
  let previous = 0;
  for (const u of openings) {
    const start = u - .58;
    box(1.10, (classroom.lowerFloor + ceiling) / 2, -(previous + start) / 2, .16, ceiling - classroom.lowerFloor, start - previous, plaster);
    box(1.10, (y + 2.4 + ceiling) / 2, -u, .16, ceiling - y - 2.4, 1.16, plaster);
    // Each door is a closed room front; the films do not establish the room interiors.
    const before = new Set(group.children), first = new Map([...batches].map(([m, a]) => [m, a.length]));
    door(0, y, 0, 1.02, '', false, { panelled: true }); // closed (owner, 2026-10-18)
    const matrix = new T.Matrix4().makeRotationY(-Math.PI / 2); matrix.setPosition(1.04, 0, -u);
    for (const [material, gs] of batches) for (let j = first.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(matrix);
    for (const child of group.children) if (!before.has(child)) child.applyMatrix4(matrix);
    previous = u + .58;
  }
  const cornerEnd = -classroomPassage.windowWall + .08;
  box(1.10, (classroom.lowerFloor + ceiling) / 2, -(previous + cornerEnd) / 2, .16, ceiling - classroom.lowerFloor, cornerEnd - previous, plaster);
  // Far door and the perpendicular, lower side passage are both visible in 103154.
  // Class Room II is beside III at the foot of the steps (new video 31-56s).
  for (const z of [-18.285, -20.015]) box(-1.10, (classroom.lowerFloor + sideCeiling) / 2, z, .16, sideCeiling - classroom.lowerFloor, .57, plaster);
  box(-1.10, (classroom.lowerFloor + 2.42 + sideCeiling) / 2, -19.15, .16, sideCeiling - classroom.lowerFloor - 2.42, 1.16, plaster);
  const iiStart = new Map([...batches].map(([material, gs]) => [material, gs.length])), iiChildren = new Set(group.children);
  door(0, classroom.lowerFloor, 0, 1.02, 'CLASS ROOM - II', true, { open: -Math.PI * .48 });
  const iiTransform = new T.Matrix4().makeRotationY(Math.PI / 2); iiTransform.setPosition(-1.04, 0, -19.15);
  for (const [material, gs] of batches) for (let j = iiStart.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(iiTransform);
  for (const child of group.children) if (!iiChildren.has(child)) child.applyMatrix4(iiTransform);
  floor(-1.15, -19.15, .35, 1.16, classroom.lowerFloor);
  // Seal the reveal above the frame; the frame top is below the masonry lintel.
  box(-1.10, classroom.lowerFloor + 2.385, -19.15, .16, .07, 1.16, plaster);
  // 103154 at 60s: III is left of centre; its information plaque occupies the right pier.
  for (const [left, right] of [[-1.085, -.93], [.23, 1.10]]) box((left + right) / 2, (classroom.lowerFloor + sideCeiling) / 2, -20.35, right - left, sideCeiling - classroom.lowerFloor, .16, plaster);
  box(-.35, (classroom.lowerFloor + 2.42 + sideCeiling) / 2, -20.35, 1.16, sideCeiling - classroom.lowerFloor - 2.42, .16, plaster);
  box(-.35, classroom.lowerFloor + 2.385, -20.35, 1.16, .07, .16, plaster);
  door(-.35, classroom.lowerFloor, -20.24, 1.02, 'CLASS ROOM - III', true, { open: -Math.PI * .48 });
  floor(-.35, -20.36, 1.1, .3, classroom.lowerFloor);
  const plaqueMap = texture((c, w, h) => {
    c.fillStyle = '#101916'; c.fillRect(0, 0, w, h);
    c.strokeStyle = '#a3945d'; c.lineWidth = 2;
    for (const inset of [22, 34]) c.strokeRect(inset, inset, w - 2 * inset, h - 2 * inset);
    c.fillStyle = '#b0a377'; c.textAlign = 'center'; c.textBaseline = 'middle';
    // Only lettering legible in the 60-second reference frame; no invented date or crest.
    for (const [line, py, size, bold] of [
      ['ANDHRA UNIVERSITY', .13, 52, true],
      ['COLLEGE OF ENGINEERING (A)', .34, 30, true],
      ['DEPARTMENT OF INSTRUMENT TECHNOLOGY', .38, 20, false],
      ['SMART CLASS ROOM-II & III', .43, 36, true],
      ['INAUGURATED', .48, 26, false], ['BY', .515, 22, false],
      ['Prof. G. NAGESWARA RAO', .58, 34, true], ['HON\'BLE VICE-CHANCELLOR, A.U.', .62, 21, false],
      ['Prof. P.S. AVADHANI', .69, 34, true], ['PRINCIPAL, AUCE(A)', .73, 21, false],
      ['Prof. D.V. RAMA KOTI REDDY', .80, 32, true], ['HEAD OF THE DEPARTMENT', .84, 21, false],
    ]) {
      c.font = `${bold ? 'bold ' : ''}${size}px ${py < .2 ? 'serif' : 'sans-serif'}`;
      c.fillText(line, w / 2, h * py, w - 100);
    }
  }, 1024, 860);
  const plaque = new T.Mesh(new T.BoxGeometry(.74, .62, .018), new T.MeshStandardMaterial({ name: 'Class III black information plaque', map: plaqueMap, roughness: .22 }));
  plaque.name = 'Class III information plaque'; plaque.position.set(.65, classroom.lowerFloor + 1.57, -20.26); group.add(plaque);
  const { start, end, windows, windowWidth, doors, grilles } = classroomPassage;
  const passageLength = end - start, passageCentre = (start + end) / 2;
  floor(passageCentre, -19.15, passageLength, 2.3, classroom.lowerFloor);
  box(passageCentre, sideCeiling, -19.15, passageLength, .12, 2.5, ceilingPlaster);
  const sideDoor = doors[0], sideLeft = sideDoor - .55, sideRight = sideDoor + .55;
  const ivLeft = doors[1] - .55, ivRight = doors[1] + .55; // Class IV's doorway (it was a door drawn on a solid wall)
  for (const [a, b] of [[start, sideLeft], [sideRight, ivLeft], [ivRight, end]]) box((a + b) / 2, classroom.lowerFloor + .475, -20.4, b - a, .95, .18, plaster);
  box(passageCentre, (classroom.lowerFloor + 2.37 + sideCeiling) / 2, -20.4, passageLength, sideCeiling - classroom.lowerFloor - 2.37, .18, plaster);
  let roomEdge = start;
  for (const x of grilles) {
    box((roomEdge + x - .75) / 2, classroom.lowerFloor + 1.66, -20.4, x - .75 - roomEdge, 1.42, .18, plaster);
    roomEdge = x + .75;
  }
  for (const [a, b] of [[roomEdge, sideLeft], [sideRight, ivLeft], [ivRight, end]]) box((a + b) / 2, classroom.lowerFloor + 1.66, -20.4, b - a, 1.42, .18, plaster);
  for (const x of doors) box(x, classroom.lowerFloor + 2.36, -20.4, 1.16, .02, .18, plaster);
  // Window wall sits 0.3 m inside the west wing's east face, whose wall and blue pilasters otherwise show through.
  const SW = classroomPassage.windowWall;
  box(passageCentre, classroom.lowerFloor + .54, SW, passageLength, 1.08, .16, plaster);
  box(passageCentre, (classroom.lowerFloor + 2.56 + sideCeiling) / 2, SW, passageLength, sideCeiling - classroom.lowerFloor - 2.56, .16, plaster);
  let windowEnd = start;
  for (const x of windows) {
    const windowStart = x - windowWidth / 2;
    box((windowEnd + windowStart) / 2, classroom.lowerFloor + 1.82, SW, windowStart - windowEnd, 1.48, .16, plaster);
    window(x, classroom.lowerFloor + 1.82, SW - .08, windowWidth, Math.PI);
    windowEnd = x + windowWidth / 2;
  }
  box((windowEnd + end) / 2, classroom.lowerFloor + 1.82, SW, end - windowEnd, 1.48, .16, plaster);
  for (const x of doors) door(x, classroom.lowerFloor, -20.28, .96, x === doors.at(-1) ? 'CLASS ROOM - IV' : '', x === doors.at(-1));
  // Wall telephones by the classroom doors (130612 at 40-56 and 113-116 s): a steel cradle box with a black handset, its
  // coiled cord hanging below, fed by a wire from a small white socket box. (x, y, z) is the wall face, ry turns +z out.
  function wallPhone(x, y, z, ry) {
    const m = new T.Matrix4().makeRotationY(ry); m.setPosition(x, y, z);
    const part = (g, material) => { g.applyMatrix4(m); add(g, material); };
    const b = (w, h, d, px, py, pz, material) => { const g = new T.BoxGeometry(w, h, d); g.translate(px, py, pz); part(g, material); };
    b(.1, .23, .05, 0, 0, .025, aluminium); b(.07, .19, .006, 0, 0, .053, dark); // cradle box and its dark face
    b(.05, .2, .035, 0, -.005, .075, dark); b(.06, .05, .045, 0, .085, .08, dark); b(.06, .05, .045, 0, -.095, .08, dark); // handset: grip, ear and mouth pieces
    const coil = [], turns = 14; for (let i = 0; i <= turns * 8; i++) { const a = i / 8 * Math.PI * 2, t = i / (turns * 8); coil.push(new T.Vector3(Math.cos(a) * .012, -.12 - t * .32, .08 + Math.sin(a) * .012)); }
    part(new T.TubeGeometry(new T.CatmullRomCurve3(coil), turns * 8, .003, 4, false), dark);
    b(.07, .07, .03, .12, .2, .015, panelWhite); part(new T.TubeGeometry(new T.CatmullRomCurve3([new T.Vector3(.12, .23, .02), new T.Vector3(.12, .5, .02)]), 1, .004, 4, false), panelWhite);
  }
  // Class IV (130612 at 115-118 s): a stencilled IV YEAR paper above the vision panel, and the election strong-room board
  // over the frame head, red on white.
  { const iv = doors.at(-1), lf1 = classroom.lowerFloor;
    const paper = texture((c, w, h) => { c.fillStyle = '#e4e2da'; c.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { c.fillStyle = `rgba(90,90,80,${rand() * .12})`; c.fillRect(rand() * w, rand() * h, 2 + rand() * 6, 2 + rand() * 6); }
      c.fillStyle = '#20302a'; c.font = 'bold 88px Impact, "Arial Narrow", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.save(); c.translate(w / 2, h / 2); c.scale(.62, 1.25); c.fillText('IV YEAR', 0, 0); c.restore(); }, 256, 200);
    const yearSign = new T.Mesh(new T.PlaneGeometry(.24, .19), new T.MeshStandardMaterial({ map: paper, roughness: .9 })); yearSign.name = 'IV YEAR paper';
    yearSign.position.set(iv - .03, lf1 + 2.04, -20.28 + .049); group.add(yearSign);
    const board = texture((c, w, h) => { c.fillStyle = '#f1f1ec'; c.fillRect(0, 0, w, h); c.strokeStyle = '#9a9a92'; c.lineWidth = 4; c.strokeRect(2, 2, w - 4, h - 4);
      c.fillStyle = '#c4161c'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = 'bold 64px "Arial Narrow", Arial, sans-serif';
      for (const [t, y, size] of [['STRONG ROOM', 52, 66], ['HOP', 122, 72], ['24 - Visakhapatnam A/C', 186, 46], ['with in', 230, 36], ['4 - Visakhapatnam P/C', 276, 46]]) { c.font = `bold ${size}px "Arial Narrow", Arial, sans-serif`; c.fillText(t, w / 2, y, w - 40); } }, 512, 310);
    const strong = new T.Mesh(new T.PlaneGeometry(.7, .42), new T.MeshStandardMaterial({ map: board, roughness: .55 })); strong.name = 'STRONG ROOM board';
    strong.position.set(iv, lf1 + 2.64, -20.31 + .006); group.add(strong); }
  // Uneven lower-wall staining is visible in the side passage; keep it flush to the plaster.
  const wear = texture((c, w, h) => {
    for (let i = 0; i < 6500; i++) {
      const x = rand() * w, y = h * (.52 + .16 * Math.sin(x / 53)) + rand() * h * .42;
      c.fillStyle = `rgba(67,76,66,${.04 + rand() * .18})`; c.fillRect(x, y, 1 + rand() * 12, 1 + rand() * 9);
    }
  });
  const stain = new T.Mesh(new T.PlaneGeometry(passageLength, 1.05), new T.MeshStandardMaterial({ map: wear, transparent: true, depthWrite: false, roughness: 1 }));
  stain.position.set(passageCentre, classroom.lowerFloor + .525, SW - .095); stain.rotation.y = Math.PI; group.add(stain);
  // The furniture and boxes stored before the end door are left out: the passage is kept clear.
  // End wall (130612 at 96-104 s, 103154 at 120-132 s): a closed brown flush door, right of centre toward the window
  // wall, under the high screened vent.
  const endDoor = -19.06, lf0 = classroom.lowerFloor, wallH = sideCeiling - lf0;
  for (const [a, b] of [[-20.4, endDoor - .55], [endDoor + .55, -17.9]]) box(end, lf0 + wallH / 2, (a + b) / 2, .16, wallH, b - a, plaster);
  box(end, (lf0 + 2.4 + sideCeiling) / 2, endDoor, .16, sideCeiling - lf0 - 2.4, 1.1, plaster);
  { const first = new Map([...batches].map(([m, a]) => [m, a.length])), before = new Set(group.children);
    door(0, lf0, 0, .93, '', false);
    const matrix = new T.Matrix4().makeRotationY(-Math.PI / 2); matrix.setPosition(end, 0, endDoor);
    for (const [material, gs] of batches) for (let j = first.get(material) || 0; j < gs.length; j++) gs[j].applyMatrix4(matrix);
    for (const child of group.children) if (!before.has(child)) child.applyMatrix4(matrix); }
  // The vent above it sits in a small dark recess.
  box(end - .085, classroom.lowerFloor + 3.25, -19.15, .012, .44, .94, dark);
  const endVent = screens.get(windowWidth).clone();
  endVent.scale(.9 / windowWidth, .4 / 1.48, .3);
  endVent.rotateY(-Math.PI / 2); endVent.translate(end - .15, classroom.lowerFloor + 3.25, -19.15);
  add(endVent, screenMaterial);
  // Room-side wall details from the 2026-10-13 corridor photos and 103849 (no debris, no invented text):
  // brown-framed brass-grilled windows between doors, electrical boxes fed from the conduit run,
  // high square wall niches, faculty name boards, darker floor bands and the patterned tile inlay.
  const brass = new T.MeshStandardMaterial({ name: 'Brass window grilles', color: '#b49a5c', metalness: .55, roughness: .42 });
  const panelGrey = new T.MeshStandardMaterial({ name: 'Grey distribution boxes', color: '#9fa5a3', metalness: .45, roughness: .45 });
  const panelWhite = new T.MeshStandardMaterial({ name: 'White isolator boxes', color: '#e6e5dd', roughness: .6 });
  wallPhone(7.45, classroom.lowerFloor + 1.5, -20.31, 0); // between the plain door and Class IV
  wallPhone(-1.02, classroom.lowerFloor + 1.5, -20.0, Math.PI / 2); // on the pier right of Class II
  // Side passage door wall (z = -20.4, facing +z): photos and 103154 82-117 s.
  const lf = classroom.lowerFloor, wz = -20.31;
  for (const c of grilles) {
    const sill = lf + .95, w = 1.5, h = 1.42, mid = sill + h / 2;
    box(c, mid, wz + .004, w - .06, h - .06, .008, clearGlass);
    for (const dx of [-w / 2, -w / 6, w / 6, w / 2]) box(c + dx, mid, wz + .03, .07, h, .06, wood);
    for (const dy of [-h / 2, h / 2]) box(c, mid + dy, wz + .03, w + .07, .07, .06, wood);
    for (const dy of [-h / 6, h / 6]) box(c, mid + dy, wz + .015, w - .07, .035, .025, wood);
    for (let dx = -w / 2 + .1; dx < w / 2 - .05; dx += .1) box(c + dx, mid, wz + .045, .012, h - .07, .012, brass);
    for (let dy = -h / 2 + .16; dy < h / 2 - .05; dy += .16) box(c, mid + dy, wz + .045, w - .07, .012, .012, brass);
    for (const s of [-1, 1]) { box(c + s * .26, sideCeiling - .7, wz + .012, .05, .40, .024, plaster); box(c, sideCeiling - .7 + s * .2, wz + .012, .52, .05, .024, plaster); }
  }
  for (const c of [5.65, 9.7]) {
    box(c, lf + 2.75, wz + .08, .42, .55, .16, panelGrey);
    box(c, lf + 2.2, wz + .07, .30, .36, .14, panelWhite);
    tube([[c, lf + 3.02, wz + .05], [c, sideCeiling - .28, wz + .05]], .014, aluminium);
  }
  const lightTile = new T.MeshStandardMaterial({ name: 'Light grey square floor tiles', color: '#b9b6ae', roughness: .35 });
  const darkBand = stone.clone(); darkBand.color.set('#55524d');
  for (const x of [4.9, 7.4, 10.2]) floor(x, -19.15, .48, 2.25, lf + .002, lightTile);
  floor(6.1, -19.15, .9, 2.25, lf + .002, darkBand);
  const face = 1.02; // room-side wall face (local x)
  // Faculty blade signs over the room doors (103849 at 27-39 s): white boards, blue border, name, degrees and post.
  // Dr. A. Daisy Rani's room is the first door (owner, 2026-10-19); her plate follows the others' pattern, with the Ph.D
  // from the hall board and no post until it is confirmed.
  for (const [u, name, degrees, post] of [[2.3, 'Dr.A. Daisy Rani', 'Ph.D', ''], [5.8, 'Dr.A. Kamala Kumari', 'M.Tech,Ph D', 'Associate Professor'], [9.2, 'Dr.P. Swapna', 'M.Tech,Ph.D', 'Professor']]) {
    const board = texture((c, w, h) => {
      c.fillStyle = '#f4f3ee'; c.fillRect(0, 0, w, h); c.strokeStyle = '#2a4aa0'; c.lineWidth = 6; c.strokeRect(5, 5, w - 10, h - 10);
      c.fillStyle = '#1f2f80'; c.textBaseline = 'middle'; c.textAlign = 'center';
      c.font = 'bold 50px "Times New Roman", Times, serif'; c.fillText(name, w / 2, h * .28, w - 40);
      c.font = 'bold 24px "Times New Roman", Times, serif'; c.textAlign = 'right'; c.fillText(degrees, w - 28, h * .55);
      c.font = 'bold 42px "Times New Roman", Times, serif'; c.textAlign = 'center'; c.fillText(post, w / 2, h * .78, w - 40);
    }, 512, 190);
    const material = new T.MeshStandardMaterial({ map: board, roughness: .6 });
    const sign = new T.Mesh(new T.PlaneGeometry(.46, .17), material); sign.name = `Blade sign: ${name}`; sign.position.set(face - .26, y + 2.62, -(u + .72) + .002); group.add(sign); // projects from the wall, read along the corridor
    const back = sign.clone(); back.rotation.y = Math.PI; back.position.z -= .004; group.add(back);
    box(face - .02, y + 2.74, -(u + .72), .04, .02, .02, dark);
  }
  const inlay = texture((c, w, h) => {
    c.fillStyle = '#e4dfcf'; c.fillRect(0, 0, w, h);
    const cell = w / 8;
    for (let gx = 0; gx <= 8; gx++) for (let gy = 0; gy <= 4; gy++) {
      const x = gx * cell, yy = gy * cell;
      c.fillStyle = '#2d5246'; c.beginPath(); // four-pointed star at each tile corner
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4, r = k % 2 ? cell * .14 : cell * .42; c.lineTo(x + Math.cos(a) * r, yy + Math.sin(a) * r); } c.fill();
      c.strokeStyle = '#3f6a5a'; c.lineWidth = 3; c.strokeRect(x + cell * .3, yy + cell * .3, cell * .4, cell * .4); // small square between stars
    }
  }, 512, 256);
  const inlayMat = new T.MeshStandardMaterial({ name: 'Patterned tile inlay', map: inlay, roughness: .4 });
  { const g = new T.PlaneGeometry(2.17, 1.6); g.rotateX(-Math.PI / 2); g.translate(0, y + .003, -7.6); add(g, inlayMat); }
  // Slim conduits and cross beams follow the filmed ceiling; no invented room fixtures.
  for (const far of [-1.02, 1.02]) {
    const x = far < 0 ? inner + .025 : far; // main corridor follows the inset window wall; the far passage keeps its wall
    if (far < 0) box(x, y + .09, -8.45, .05, .18, 16.9, stone);
    else {
      let start = 0;
      for (const end of [...openings.map(u => u - .60), 16.9]) {
        if (end > start) box(x, y + .09, -(start + end) / 2, .05, .18, end - start, stone);
        start = end + 1.20;
      }
    }
    for (let j = 0; j < 3; j++) tube([[x, ceiling - .28 - j * .045, .8], [x, ceiling - .28 - j * .045, -17.8], [far, sideCeiling - .28 - j * .045, -18.2], [far, sideCeiling - .28 - j * .045, -20.1]], .012, aluminium);
    for (let u = 1; u < 20; u += 1.5) box(u < 18 ? x : far, (u < 18 ? ceiling : sideCeiling) - .33, -u, .032, .19, .022, dark);
  }
  for (const u of [0, 7.1, 14.8, 18.8]) box(0, (u < 18 ? ceiling : sideCeiling) - .14, -u, 2.16, .30, .22, plaster);
  const lamp = new T.MeshStandardMaterial({ color: '#e9eee5', emissive: '#dceada', emissiveIntensity: 1.4 });
  for (let j = 0; j < 3; j++) tube([[start, sideCeiling - .28 - j * .045, wz + .04], [end - .1, sideCeiling - .28 - j * .045, wz + .04]], .012, aluminium);
  for (const x of [4.6, 8.1]) {
    box(x, sideCeiling - .48, wz + .055, 1.14, .075, .07, aluminium);
    tube([[x - .52, sideCeiling - .50, wz + .11], [x + .52, sideCeiling - .50, wz + .11]], .016, lamp);
  }
  for (const u of [4, 11, 17.4]) {
    box(1.00, ceiling - .42, -u, .07, .075, 1.14, aluminium);
    tube([[.945, ceiling - .44, -u - .52], [.945, ceiling - .44, -u + .52]], .016, lamp);
  }
  // Classroom-wing entry transom and open slim-framed leaves.
  const posts = [inner + .025, .995], entryY = classroom.landing; // entry is above the corridor
  for (const x of posts) box(x, entryY + 1.35, .47, .05, 2.7, .07, dark);
  // Transom: black steel frame, a white panel on the left and the CLASSROOM WING board (094701 0 s, 094920 15.8 s).
  box(0, entryY + 2.8, .47, 2.16, .47, .035, dark);
  box(-.74, entryY + 2.8, .49, .52, .37, .01, new T.MeshStandardMaterial({ color: '#efeee6', roughness: .8 }));
  box(-.46, entryY + 2.8, .48, .04, .47, .05, dark);
  label('CLASSROOM WING', .28, entryY + 2.8, .50, 1.36, .36);
  box(0, entryY + 2.55, .47, 2.16, .05, .07, dark);
  const leafGlass = new T.MeshStandardMaterial({ name: 'Entrance door glass', color: '#b9cbc6', transparent: true, opacity: .22, roughness: .1, depthWrite: false });
  const cream = new T.MeshStandardMaterial({ name: 'Cream door panels', color: '#dcd8c4', roughness: .7, side: T.DoubleSide });
  const panelFrame = (parent, cx, w) => { // glass above, cream panel below, in slim black steel
    for (const [px, py, pw, ph] of [[cx, .04, w, .05], [cx, 2.5, w, .05], [cx - w / 2, 1.27, .05, 2.5], [cx + w / 2, 1.27, .05, 2.5], [cx, .95, w, .05]]) {
      const m = new T.Mesh(new T.BoxGeometry(pw, ph, .045), dark); m.position.set(px, py, 0); parent.add(m);
    }
    const lower = new T.Mesh(new T.PlaneGeometry(w - .05, .88), cream); lower.position.set(cx, .5, 0); parent.add(lower);
    const upper = new T.Mesh(new T.PlaneGeometry(w - .05, 1.5), leafGlass); upper.position.set(cx, 1.72, 0); parent.add(upper);
  };
  const sidelight = new T.Group(); sidelight.name = 'Fixed classroom entrance sidelight'; sidelight.position.set(0, entryY, .47); group.add(sidelight);
  panelFrame(sidelight, posts[0] + .38, .72);
  const leafWidth = posts[1] - (posts[0] + .74) - .02;
  const leaf = new T.Group(); leaf.name = 'Open classroom entrance leaf'; leaf.position.set(posts[1], entryY, .46); leaf.rotation.y = -Math.PI * .49; group.add(leaf);
  panelFrame(leaf, -leafWidth / 2, leafWidth);
  const push = label('PUSH', -.12, 1.08, .03, .16, .07, '#f5f5f0', '#111'); leaf.attach(push); push.position.set(-.12, 1.08, .03); push.rotation.set(0, 0, 0);
  buildClassThree(group, { plaster, wood, aluminium, glass: clearGlass, fan: m.fan }, classroom.lowerFloor);
  buildClassTwo(group, { plaster, wood, aluminium, glass: clearGlass, fan: m.fan }, classroom.lowerFloor);
  buildClassFour(group, { plaster, wood, aluminium, glass: clearGlass, fan: m.fan }, classroom.lowerFloor);
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); geometries.forEach(g => g.dispose());
  }
  screens.forEach(g => g.dispose());
  group.traverse(o => { if (o.isMesh) o.layers.enable(1); });
  return group;
}
