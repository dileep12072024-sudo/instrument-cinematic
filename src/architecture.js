import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint, groundSpine, seminarPassage, hallWindows } from './footprint.js';
import { buildEntranceHall } from './entrance-hall.js';
import { buildClassroomWing, classroom, classroomPassage } from './classroom-wing.js';
import { classThree } from './classroom-three.js';
import { classTwo } from './classroom-two.js';
import { buildWestWing, westWing } from './west-wing.js';
import { buildTerraces } from './terraces.js';
import { casementCluster } from './openable.js';
import { stairs, terraceLevels } from './stair-layout.js';

let seed = 1937;
const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
function texture(c, repeat = 1) {
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace;
  t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(repeat, repeat); t.anisotropy = 8; return t;
}
function plaster() {
  const c = canvas(512), x = c.getContext('2d');
  x.fillStyle = '#dfddd3'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 19000; i++) {
    const b = 90 + random() * 125;
    x.fillStyle = `rgba(${b},${b - 4},${b - 12},${random() * .16})`;
    x.fillRect(random() * 512, random() * 512, random() * 3 + 1, random() * 4 + 1);
  }
  for (let i = 0; i < 170; i++) {
    const px = random() * 512, py = random() * 512, r = 4 + random() * 25;
    const g = x.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, 'rgba(117,100,78,.085)'); g.addColorStop(1, 'rgba(117,100,78,0)');
    x.fillStyle = g; x.fillRect(px - r, py - r, r * 2, r * 2);
  }
  for (let i = 0; i < 180; i++) {
    const px = random() * 512, py = 270 + random() * 230;
    x.fillStyle = `rgba(160,124,101,${random() * .2})`;
    x.beginPath(); x.ellipse(px, py, random() * 8 + 1, random() * 13 + 2, random(), 0, Math.PI * 2); x.fill();
  }
  return texture(c);
}
function noiseMap(base, repeat, paving = false) {
  const c = canvas(512), x = c.getContext('2d'); x.fillStyle = base; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 33000; i++) {
    const b = random() > .5 ? 255 : 10;
    x.fillStyle = `rgba(${b},${b},${b},${random() * .15})`;
    x.fillRect(random() * 512, random() * 512, 1 + random() * 2, 1 + random() * 2);
  }
  if (paving) {
    for (let i = 0; i < 110; i++) {
      x.fillStyle = i % 3 ? '#454b3b08' : '#d8ceae10';
      x.beginPath(); x.ellipse(random() * 512, random() * 512, 12 + random() * 55, 5 + random() * 30, random() * 6, 0, Math.PI * 2); x.fill();
    }
    x.strokeStyle = '#55564c65'; x.lineWidth = 1.4;
    for (const start of [0, 256, 512]) {
      x.beginPath(); x.moveTo(start, 0); x.lineTo(start, 512); x.stroke();
      x.beginPath(); x.moveTo(0, start); x.lineTo(512, start); x.stroke();
    }
    for (let i = 0; i < 10; i++) {
      let px = random() * 512, py = random() * 512;
      x.lineWidth = .6 + random(); x.beginPath(); x.moveTo(px, py);
      for (let j = 0; j < 7; j++) { px += (random() - .4) * 20; py += random() * 20; x.lineTo(px, py); }
      x.stroke();
    }
  }
  return texture(c, repeat);
}
function textMap(text, bg, color, w = 2048, h = 128) {
  const c = canvas(w, h), x = c.getContext('2d');
  x.fillStyle = bg; x.fillRect(0, 0, w, h); x.fillStyle = color;
  x.font = `700 ${Math.round(h * .58)}px Arial`; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(text, w / 2, h / 2 + 2, w * .96); return texture(c);
}

function weatherMap() {
  const c = canvas(512, 128), x = c.getContext('2d');
  for (let i = 0; i < 2200; i++) {
    const px = random() * 512, height = 5 + random() ** 3 * 119;
    const g = x.createLinearGradient(0, 128 - height, 0, 128);
    g.addColorStop(0, 'rgba(141,97,59,0)'); g.addColorStop(1, `rgba(141,97,59,${.08 + random() * .3})`);
    x.fillStyle = g; x.fillRect(px, 128 - height, 1 + random() * 8, height);
  }
  return texture(c);
}

function woodGrain() {
  const c = canvas(256, 512), x = c.getContext('2d');
  x.fillStyle = '#997452'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 256; i++) {
    x.strokeStyle = `rgba(51,26,13,${.06 + (Math.sin(i * 12.9898) + 1) * .055})`;
    x.lineWidth = 1; x.beginPath(); x.moveTo(i, 0);
    for (let y = 0; y <= 512; y += 16) x.lineTo(i + Math.sin(y * .018 + i * .3) * 1.5, y);
    x.stroke();
  }
  return texture(c);
}

// Pierced concrete block screen (the photographed blocks): chipped openings, narrow slots in every eighth pair of
// columns, and a wider ventilation slot with a sill and the raised A U forms. Centred on the origin, 0.2 deep (from
// -0.07 to 0.13, +z facing out). The facade panels are 16 x 11 blocks; smaller panels (west wing) use fewer blocks of
// the same size. Returns { screen, sill, letters } geometries.
export function concreteScreenParts(w, h, cols = 16, rows = 11) {
  const shape = new T.Shape();
  shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
  const cw = w / cols, ch = h / rows;
  const hole = (left, bottom, width, height) => {
    const p = new T.Path(), chip = Math.min(width, height) * .075;
    p.moveTo(left, bottom); p.lineTo(left + chip, bottom + height * .52); p.lineTo(left, bottom + height);
    p.lineTo(left + width * .58, bottom + height - chip); p.lineTo(left + width, bottom + height);
    p.lineTo(left + width - chip, bottom + height * .35); p.lineTo(left + width, bottom); p.closePath(); shape.holes.push(p);
  };
  const slot = cols >= 8 && rows >= 5, slotRow = Math.round(rows * 4 / 11), c0 = Math.round(cols * 5 / 16), n = Math.max(2, Math.round(cols * 5 / 16));
  for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
    if (slot && row === slotRow && col >= c0 && col < c0 + n) continue;
    // Alternating narrow slots interrupt the horizontal openings, as in the concrete blocks.
    const narrow = col % 8 === 3 || col % 8 === 4;
    const inset = narrow ? cw * .32 : cw * .14;
    const wear = Math.sin(row * 9.3 + col * 5.7) * .006;
    hole(-w / 2 + col * cw + inset, -h / 2 + row * ch + ch * .22 + wear, cw - 2 * inset, ch * .55);
  }
  const letters = []; let sill = new T.BufferGeometry();
  if (slot) {
    hole(-w / 2 + c0 * cw + .02, -h / 2 + slotRow * ch + .015, n * cw - .04, ch - .025);
    const sx = -w / 2 + (c0 + n / 2) * cw, sy = -h / 2 + (slotRow + .5) * ch;
    // Small sloping sill in the wider central ventilation slot.
    sill = new T.BoxGeometry(n * cw - .04, .035, .24).toNonIndexed(); sill.rotateX(.25); sill.translate(sx, sy - ch / 2, .025);
    // Raised A U forms within the slot.
    const lh = ch * 11 / 13, lx = n * cw * 4 / 15;
    for (const points of [[[-lx * 1.6, -lh * .35], [-lx, lh * .5], [-lx * .4, -lh * .35]], [[-lx * 1.35, 0], [-lx * .65, 0]], [[lx * .3, lh * .5], [lx * .4, -lh * .2], [lx, -lh * .3], [lx * 1.5, -lh * .2], [lx * 1.6, lh * .5]]]) {
      const curve = new T.CatmullRomCurve3(points.map(([px, py]) => new T.Vector3(sx + px, sy + py, .06)), false, 'centripetal');
      letters.push(new T.TubeGeometry(curve, 16, .028, 5, false));
    }
  }
  const screen = new T.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: false, steps: 1, curveSegments: 1 }); screen.translate(0, 0, -.07);
  return { screen, sill, letters };
}

export function buildArchitecture(scene) {
  const group = new T.Group(); group.name = 'Reference-built department'; scene.add(group);
  const plasterMap = plaster();
  const mat = (color, opts = {}) => new T.MeshStandardMaterial({ color, roughness: .9, ...opts });
  const m = {
    wall: mat('#f3f0e5', { map: plasterMap, bumpMap: plasterMap, bumpScale: .023 }),
    blue: mat('#517694', { map: plasterMap, bumpMap: plasterMap, bumpScale: .016 }),
    trim: mat('#738491', { map: plasterMap }), roof: mat('#96988e', { map: plasterMap }),
    dark: mat('#222a27'), frame: mat('#627976', { metalness: .25 }), wood: mat('#65503c'),
    glass: new T.MeshPhysicalMaterial({ name: 'Courtyard glass', color: '#6d8580', roughness: .055, metalness: .12, clearcoat: 1, clearcoatRoughness: .04, ior: 1.52, envMapIntensity: 1.4 }),
    metal: mat('#8a928c', { metalness: .65, roughness: .5 }),
    plinth: mat('#a2785a', { map: plasterMap, bumpMap: plasterMap, bumpScale: .02 }),
    grille: mat('#d1cbb8'), brick: mat('#ae7259'), stain: mat('#ad7c56'), paving: mat('#b4b2a6', { map: noiseMap('#c7c4b8', 7, true), bumpScale: .025 }),
    weather: mat('#ffffff', { map: weatherMap(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
  };
  m.rearGlass = m.glass.clone(); m.rearGlass.name = 'Rear glass';
  m.entranceGlazing = m.glass.clone(); m.entranceGlazing.name = 'Transparent entrance sidelights';
  m.entranceGlazing.color.set('#d9e5d9'); m.entranceGlazing.transparent = true; m.entranceGlazing.opacity = .22; m.entranceGlazing.depthWrite = false;
  m.entranceReflectiveGlass = m.glass.clone(); m.entranceReflectiveGlass.name = 'Green reflective entrance exterior';
  m.entranceReflectiveGlass.color.set('#afd5b5'); m.entranceReflectiveGlass.metalness = .85; m.entranceReflectiveGlass.roughness = 0;
  m.entranceReflectiveGlass.clearcoatRoughness = 0;
  // Three's 256px reflection blur floor softens our 512px polished entrance capture.
  m.entranceReflectiveGlass.onBeforeCompile = shader => {
    shader.fragmentShader = shader.fragmentShader.replace('#include <lights_physical_fragment>', T.ShaderChunk.lights_physical_fragment.replaceAll('0.0525', '0.025'));
  };
  m.entranceReflectiveGlass.customProgramCacheKey = () => 'polished-entrance-512';
  m.entranceTintedGlass = new T.MeshPhysicalMaterial({ name: 'Cool tinted entrance interior', color: '#789c8c', transparent: true, opacity: .18, depthWrite: false, side: T.BackSide, roughness: .25, metalness: 0, envMapIntensity: .08 });
  const grain = woodGrain();
  m.entranceWood = mat('#927c64', { name: 'Entrance timber', map: grain, bumpMap: grain, bumpScale: .003, roughness: .65 });
  m.doorPanel = m.entranceWood.clone(); m.doorPanel.color.set('#b69372');
  m.upperDoorPanel = m.entranceWood.clone(); m.upperDoorPanel.color.set('#dac98b');
  m.screen = mat('#d5d0bd', { name: 'Pierced concrete screens', map: plasterMap, bumpMap: plasterMap, bumpScale: .018 });
  m.gate = mat('#65777b', { name: 'East folding gate', metalness: .7, roughness: .46 });
  m.westGate = m.gate.clone(); m.westGate.name = 'West folding gate';
  m.eastRamp = mat('#a54637', { name: 'Red east gate ramp', map: plasterMap, bumpMap: plasterMap, bumpScale: .008 });
  m.rampEdge = mat('#c4a83f', { name: 'Yellow east ramp edge', map: plasterMap });
  m.paving.bumpMap = m.paving.map;
  const batches = new Map(), matrix = new T.Matrix4(), quaternion = new T.Quaternion();
  const screenTemplates = new Map();
  function concreteScreen(x, y, w, h, transform) {
    const key = `${w}:${h}`;
    if (!screenTemplates.has(key)) screenTemplates.set(key, concreteScreenParts(w, h, 16, Math.max(5, Math.round(h / (2.15 / 11))))); // block size kept
    const parts = screenTemplates.get(key), move = new T.Matrix4().makeTranslation(x, y, 0).premultiply(transform);
    if (!batches.has(m.screen)) batches.set(m.screen, []); if (!batches.has(m.blue)) batches.set(m.blue, []);
    for (const g of [parts.screen, parts.sill]) batches.get(m.screen).push(g.clone().applyMatrix4(move));
    for (const g of parts.letters) batches.get(m.blue).push(g.clone().applyMatrix4(move));
  }
  function box(x, y, z, w, h, d, material, parent = null) {
    const geo = new T.BoxGeometry(w, h, d); matrix.makeTranslation(x, y, z); geo.applyMatrix4(matrix);
    if (parent) geo.applyMatrix4(parent);
    if (!batches.has(material)) batches.set(material, []); batches.get(material).push(geo);
  }
  function ramp(x, z, w, d, h, material, parent) {
    // A triangular prism keeps the gate threshold flush with the surrounding ground.
    const hw = w / 2, vertices = new Float32Array([
      -hw, .016, 0, hw, .016, 0, -hw, .016, d, hw, .016, d,
      -hw, h, 0, hw, h, 0,
    ]);
    const indices = [0, 1, 2, 1, 3, 2, 0, 5, 1, 0, 4, 5, 2, 5, 4, 2, 3, 5, 0, 2, 4, 1, 5, 3];
    const uv = new Float32Array([0, 0, 1, 0, 0, 1, 1, 1, 0, 0, 1, 0]);
    const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(vertices, 3)); geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); geo.setIndex(indices); geo.translate(x, 0, z); geo.applyMatrix4(parent); geo.computeVertexNormals();
    if (!batches.has(material)) batches.set(material, []); batches.get(material).push(geo);
  }
  function face(cx, cz, rotation, width, height, bays, type, closedGround = false, openGround = false, onlyFloor = null) {
    const transform = new T.Matrix4().compose(new T.Vector3(cx, 0, cz), quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), rotation), new T.Vector3(1, 1, 1));
    let facade = true, belowClassroomJunction = false, belowClassThree = false, belowClassTwo = false;
    const b = (x, y, z, w, h, d, material) => {
      const emit = (left, right, top = Infinity) => {
        const bottom = y - h / 2, clippedTop = Math.min(y + h / 2, top);
        if (clippedTop > bottom && right > left) box((left + right) / 2, (bottom + clippedTop) / 2, z, right - left, clippedTop - bottom, d, material, transform);
      };
      // Close the wall below the lower classroom landing, never across its walking space.
      if (belowClassTwo) {
        emit(x - w / 2, x + w / 2, classroom.lowerFloor - .16);
      } else if (belowClassThree) {
        const a = classroom.originZ - classThree.maxX - cz, c = classroom.originZ - classTwo.minX + .18 - cz;
        emit(x - w / 2, Math.min(x + w / 2, a));
        emit(Math.max(x - w / 2, a), Math.min(x + w / 2, c), classroom.lowerFloor - .16);
        emit(Math.max(x - w / 2, c), x + w / 2);
      } else if (belowClassroomJunction && x - w / 2 < cz - 1.083333) {
        const split = Math.min(x + w / 2, cz - 1.083333);
        emit(x - w / 2, split, classroom.lowerFloor - .06);
        emit(split, x + w / 2);
      }
      // The lowered classroom roof must not expose the old storey's piers or lintels.
      else if (facade && height === 9.4 && Math.abs(cx) >= 22) emit(x - w / 2, x + w / 2, terraceLevels.leftWing - .12);
      else if (facade && type === 'low-corridor' && rotation === 0 && x - w / 2 < -21.05 - cx) {
        const split = Math.min(x + w / 2, -21.05 - cx);
        emit(x - w / 2, split, terraceLevels.leftWing - .12); emit(split, x + w / 2);
      } else emit(x - w / 2, x + w / 2);
    };
    const floors = Math.round((height - 1.4) / 4), floorH = (height - 1.4) / floors, bay = width / bays;
    // Blue pilasters at every bay line and the storey trim, for storeys whose wall another module builds.
    const facadeTrim = (f, from = -width / 2) => {
      const y = f * floorH;
      for (let j = 0; j <= bays; j++) { const x = -width / 2 + j * bay; if (x >= from - .01 && (!tower || j === 0 || j === bays)) b(x, y + floorH / 2, .17, .3, floorH, .12, m.blue); }
      b(0, y + floorH - .1, .26, width + .24, .19, .2, m.trim);
      const sill = f === 1 ? classroom.lowerFloor : y; // the upstairs classrooms sit on the lowered floor: band and vents follow their sills
      b(from / 2 + width / 4, sill + .45, .21, width / 2 - from, .35, .075, m.blue); // storey band
      if (type !== 'west') for (let j = 0; j < bays; j++) { const x = -width / 2 + bay * (j + .5); if (x < from) continue; // vents under the upper windows
        b(x, sill + .12, .2, .48, .24, .025, m.dark); for (let k = -2; k <= 2; k++) b(x, sill + .12 + k * .05, .22, .49, .022, .03, m.grille); }
    };
    const westOuter = type === 'west-end' || type === 'west-outer';
    const westWindow = type === 'west' || westOuter;
    const tower = type.startsWith('tower') || type === 'east-wing' || westOuter;
    const corridor = type === 'corridor' || type === 'gate-return';
    for (let f = 0; f < floors; f++) {
      if (onlyFloor !== null && f !== onlyFloor) continue;
      // west-wing.js builds this ground-floor wall (screens and the courtyard door) along the filmed passage.
      if (f === 0 && type === 'room' && cx < 0 && rotation === Math.PI / 2) continue;
      belowClassroomJunction = f === 0 && type === 'room' && cx < 0 && rotation === Math.PI / 2;
      belowClassThree = f === 0 && type === 'west-outer' && rotation === -Math.PI / 2;
      belowClassTwo = f === 0 && (type === 'west-end' || type === 'west' && rotation === Math.PI / 2);
      // Class II owns the end and courtyard-facing walls, including their lower sills. The facade's blue pilasters and
      // storey trim still run over them (owner, 2026-10-17: they had been lost with the old wall).
      if (f === 1 && (type === 'west-end' || type === 'west' && rotation === Math.PI / 2)) { facadeTrim(f); continue; }
      if (f === 1 && onlyFloor === null && type === 'west-outer' && rotation === -Math.PI / 2) {
        facadeTrim(f, classroom.originZ - classThree.maxX - cz); // over the classroom-owned stretch too
        // Both classrooms own their outer windows and lowered sill/room slabs.
        for (const [a, c] of [[cz - width / 2, classroom.originZ - classThree.maxX]]) {
          face(cx, (a + c) / 2, rotation, c - a, height, Math.max(1, Math.round((c - a) / 3.5)), type, closedGround, openGround, 1);
        }
        continue;
      }
      if (f === 1 && type === 'low-corridor' && rotation === 0) {
        // The interior owns the actual openings and pierced screens, including their exterior faces.
        // Keep the blue structural strips; a second generic facade would obstruct the new windows.
        for (let j = 0; j <= bays; j++) b(-width / 2 + j * bay, 5.7, .05, .3, 3.4, .45, m.blue);
        b(0, 7.9, .1, width + .24, .19, .63, m.trim);
        continue;
      }
      // The filmed upstairs classroom passage supplies the west tower opening and return windows.
      if (type === 'tower-side' && (f === 1 && cx < 0 || f === 2)) {
        const bottom = f * floorH, top = (f + 1) * floorH;
        for (const [a, c] of [[-7, 1.083333], [3.25, 7]]) {
          box(cx, (bottom + top) / 2, (a + c) / 2, .32, top - bottom, c - a, m.wall);
        }
        const lintel = f === 1 ? 7.78 : 11.25;
        const lintelTop = f === 2 ? 12.0 : top;
        box(cx, (lintel + lintelTop) / 2, 2.166667, .32, lintelTop - lintel, 2.166667, m.wall);
        continue;
      }
      if (f === 2 && type === 'corridor' && rotation === 0) continue;
      if (f === 1 && onlyFloor === null && type === 'room' && cx < 0 && rotation === Math.PI / 2) {
        // The original end partition separates the corridor from the owner-confirmed rear room.
        const rear = classroom.originZ - classroomPassage.end + .02, front = 3.25;
        const roomRear = cz - width / 2;
        face(cx, (roomRear + rear) / 2, rotation, rear - roomRear, height, Math.max(1, Math.round((rear - roomRear) / 3.5)), type, closedGround, openGround, 1);
        box(cx, classroom.lowerFloor - .032, (rear + front) / 2, .32, .064, front - rear, m.wall);
        box(cx, 7.45, (rear + front) / 2, .32, .10, front - rear, m.wall);
        continue;
      }
      // The entrance is an actual opening, not doors placed over a solid ground-floor wall.
      if ((openGround || type === 'tower-front' || type === 'tower-side') && f === 0) continue;
      const raisedScreen = type === 'corridor' && cx > 0 && f === 0 && rotation === 0;
      const y = f * floorH; let openingH = raisedScreen ? 2.04 : f === 0 ? 2.15 : 1.9;
      // The west wing's ground storey is sunk with its floor (owner, 2026-10-16): its walls, screens, windows and gate
      // start at the wing floor; the storey above stays where it is.
      const sunk = f === 0 && (westOuter || type === 'west') ? westWing.floor : f === 0 && type === 'low-corridor' && rotation === 0 ? westWing.corridor : 0, y0 = y + sunk; // front of the west corridor: with its floor
      let openingY = raisedScreen ? groundSpine.screenBottom + openingH / 2 : y0 + (f === 0 ? 1.9 : 2.55);
      const hasGate = (type === 'gate-return' || type === 'west-end') && f === 0;
      const gateMaterial = type === 'west-end' ? m.westGate : m.gate;
      if (!hasGate) b(0, y0 + (openingY - openingH / 2 - y0) / 2, 0, width, openingY - openingH / 2 - y0, .32, m.wall);
      else if (bays > 1) b(-width / bays / 2, y0 + (openingY - openingH / 2 - y0) / 2, 0, width - width / bays, openingY - openingH / 2 - y0, .32, m.wall); // under the windows beside the gate bay
      const high = openingY + openingH / 2;
      b(0, (high + y + floorH) / 2, 0, width, y + floorH - high, .32, m.wall);
      for (let j = 0; j < bays; j++) {
        const x = -width / 2 + bay * (j + .5), ow = bay - .6;
        const worldZ = cz - Math.sin(rotation) * x;
        const solid = closedGround === 'all' || f === 0 && (closedGround === true || closedGround === 'rear-half' && worldZ < -3.25);
        const glass = closedGround === true || worldZ < -3.25 ? m.rearGlass : m.glass;
        const passageEnd = f === 0 && type === 'west-outer' && rotation === Math.PI && Math.abs(cx - x + 23.5) < .6; // screened end bay
        const lattice = type === 'low-corridor' || corridor && f < floors - 1 || type === 'west' && f === 0 || passageEnd;
        b(x - bay / 2, (y0 + y + floorH) / 2, 0, .6, y + floorH - y0, .32, m.wall);
        if (!tower || j === 0) b(x - bay / 2, (y0 + y + floorH) / 2, .05, .3, y + floorH - y0, .45, m.blue);
        if (f === 0 && j === 0 && type === 'low-corridor' && rotation === 0) { // the corner pier stands on the landing three steps down
          b(x - bay / 2, westWing.floor / 2 - .01, 0, .6, -westWing.floor + .02, .32, m.wall); b(x - bay / 2, westWing.floor / 2 - .01, .25, .3, -westWing.floor + .02, .2, m.blue); // blue on the outside face only
        }
        if (hasGate && j === bays - 1) {
          // The west gate (frame 57): full passage width on a 0.8 dwarf wall (west-wing.js), 1.55 tall, plain wall above.
          const westGate = type === 'west-end', gateBottom = westGate ? westWing.floor + .02 : .16, gateTop = westGate ? westWing.floor + 2.35 : high, gateHeight = gateTop - gateBottom;
          if (westGate) b(x, (gateTop + high) / 2, 0, ow, high - gateTop, .32, m.wall);
          {
          if (type !== 'gate-return' && type !== 'west-end') b(x, (gateTop + gateBottom) / 2, -.4, ow, gateHeight, .06, m.dark);
          for (const s of [-1, 1]) b(x + s * (ow / 2 - .04), (gateTop + gateBottom) / 2, .08, .08, gateHeight, .12, gateMaterial);
          for (const yy of [gateBottom, gateTop]) b(x, yy, .08, ow, .08, .12, gateMaterial);
          const bars = Math.round(ow / .18);
          for (let k = 1; k < bars; k++) b(x - ow / 2 + k * ow / bars, (gateTop + gateBottom) / 2, .07, .022, gateHeight, .04, gateMaterial);
          for (const slope of [-3, 3]) for (let offset = -gateHeight / 2 - ow * 1.5; offset <= gateHeight / 2 + ow * 1.5; offset += .85) {
            const a = (-gateHeight / 2 - offset) / slope, c = (gateHeight / 2 - offset) / slope;
            const lo = Math.max(-ow / 2, Math.min(a, c)), hi = Math.min(ow / 2, Math.max(a, c));
            if (hi <= lo) continue;
            const mid = (lo + hi) / 2, geo = new T.BoxGeometry((hi - lo) * Math.sqrt(10), .025, .045);
            geo.rotateZ(Math.atan(slope)); geo.translate(x + mid, (gateTop + gateBottom) / 2 + slope * mid + offset, .1); geo.applyMatrix4(transform);
            if (!batches.has(gateMaterial)) batches.set(gateMaterial, []); batches.get(gateMaterial).push(geo);
          }
          if (type === 'gate-return') {
            const edge = .16;
            ramp(x - edge / 2, .08, ow - edge, 1.2, .16, m.eastRamp, transform);
            ramp(x + (ow - edge) / 2, .08, edge, 1.2, .16, m.rampEdge, transform);
          } else if (!westGate) {
            ramp(x, .08, ow, 1.2, .16, m.paving, transform);
          }
          }
          b(x, westGate ? gateTop + .12 : 3.12, .45, bay, .16, 1.15, m.trim);
        } else if (solid) {
          b(x, openingY, 0, ow, openingH, .32, m.wall);
        } else if (lattice) {
          if ((f !== 0 || !type.includes('corridor')) && !(type === 'low-corridor' && f === 1 && rotation === 0) && !(f === 0 && (type === 'west' || passageEnd))) b(x, openingY, -.27, ow, openingH, .05, m.dark);
          if (f === 0) { // (the washing bay's end screen now uses the full opening: owner, it had been cut short)
            concreteScreen(x, openingY, ow, openingH, transform);
          } else {
            // Clipped diagonal strips form the pierced diamond screens visible in the photos.
            for (const slope of [-1, 1]) for (let offset = -ow / 2 - openingH / 2; offset <= ow / 2 + openingH / 2; offset += .27) {
              const lo = Math.max(-ow / 2, slope === 1 ? -openingH / 2 - offset : offset - openingH / 2);
              const hi = Math.min(ow / 2, slope === 1 ? openingH / 2 - offset : offset + openingH / 2);
              if (hi <= lo) continue;
              const mid = (lo + hi) / 2;
              const geo = new T.BoxGeometry((hi - lo) * Math.SQRT2, .06, .18);
              geo.rotateZ(slope * Math.PI / 4); geo.translate(x + mid, openingY + slope * mid + offset, .04); geo.applyMatrix4(transform);
              if (!batches.has(m.grille)) batches.set(m.grille, []); batches.get(m.grille).push(geo);
            }
          }
        } else if (corridor && f === floors - 1) {
          b(x, openingY, -1.1, ow, openingH, .15, m.dark);
          b(x, openingY - openingH / 2 + .18, -.08, ow, .38, .25, m.wall);
          b(x, openingY - openingH / 2 + .52, .04, ow, .045, .05, m.metal);
          for (let k = -1; k <= 1; k++) b(x + k * ow / 3, openingY - openingH / 2 + .34, .04, .04, .48, .05, m.metal);
        } else {
          if (hasGate) b(x, (openingY - openingH / 2) / 2, 0, ow, openingY - openingH / 2, .32, m.wall);
          const ww = westWindow ? ow - .25 : Math.min(ow - .4, type === 'east-wing' ? 1.85 : tower ? 2.8 : 2.0), wh = openingH - .13;
          const windowFrame = westWindow && f > 0 ? m.entranceWood : m.frame;
          const side = (ow - ww) / 2;
          for (const s of [-1, 1]) b(x + s * (ww + side) / 2, openingY, 0, side, openingH, .32, m.wall);
          b(x, openingY, -.19, ww, wh, .05, glass);
          for (const s of [-1, 1]) {
            b(x, openingY + s * (wh / 2 + (openingH - wh) / 4), 0, ww, (openingH - wh) / 2, .32, m.wall);
            b(x + s * ww / 2, openingY, .005, .085, wh, .12, windowFrame);
            b(x, openingY + s * wh / 2, .005, ww + .1, .08, .12, windowFrame);
          }
          if (westWindow) {
            for (const s of [-1, 1]) {
              b(x + s * ww / 6, openingY, .015, .075, wh, .13, windowFrame);
              b(x, openingY + s * wh / 6, .015, ww, .065, .13, windowFrame);
            }
          } else {
            b(x, openingY, .015, .065, wh, .13, windowFrame);
            for (const s of type === 'east-wing' ? [-1, 1] : [0]) b(x, openingY + s * wh / 6, .015, ww, .05, .13, windowFrame);
          }
          const grilleZ = westWindow || type === 'east-wing' ? -.04 : .09;
          for (let k = -4; k <= 4; k++) b(x + k * ww / 10, openingY, grilleZ, .015, wh, .018, m.metal);
          for (let k = -3; k <= 3; k++) b(x, openingY + k * wh / 8, grilleZ, ww, .014, .018, m.metal);
          b(x, openingY - wh / 2 - .065, .13, ww + .25, .12, .55, m.trim);
        }
        if (f > 0 && type !== 'west') {
          b(x, y + .49, .17, .48, .24, .025, m.dark);
          for (let k = -2; k <= 2; k++) b(x, y + .49 + k * .05, .19, .49, .022, .03, m.grille);
        }
        if (f === 0 && !hasGate) {
          for (let k = 0; k < 8; k++) {
            const h = .06 + random() * .15;
            b(x - ow / 2 + k * ow / 8, y0 + h / 2, .169, ow / 8, h, .008, m.stain); // at the ground
          }
        }
      }
      b(width / 2, (y0 + y + floorH) / 2, 0, .6, y + floorH - y0, .32, m.wall);
      b(width / 2, (y0 + y + floorH) / 2, .05, .3, y + floorH - y0, .45, m.blue);
      if (f === 0 && type === 'low-corridor' && rotation === 0) {
        // Keep the exterior trim's outer edge, but not its old intrusion into the lowered corridor.
        b(0, y + floorH - .1, .175, width + .24, .19, .48, m.trim);
      } else if (f !== 0 || type !== 'west' && type !== 'east-wing') b(0, y + floorH - .1, .1, width + .24, .19, .63, m.trim);
      if (f === 0 && !westOuter) {
        if (type === 'room' && cx < 0 && rotation === Math.PI / 2) {
          const rear = cz - width / 2, junction = 1.083333;
          box(cx + .19, classroom.lowerFloor + .45, (rear + junction) / 2, .075, .35, junction - rear, m.blue);
        } else b(0, type === 'low-corridor' && rotation === 0 ? classroom.floor + .45 : y + floorH + .45, .19, width, .35, .075, m.blue);
      }
      if (f === 0 && (westWindow || type === 'east-wing')) b(0, 3.15 + sunk, .38, width + .25, .14, 1.05, m.trim); // sunshade above the openings
    }
    if (onlyFloor !== null) return;
    facade = false; belowClassroomJunction = false;
    const roofY = type.startsWith('tower') ? stairs.top : height === 9.4
      ? (Math.abs(cx) >= 22 ? terraceLevels.leftWing : terraceLevels.leftStrip)
      : height === 13.4 ? (cx > 4 && cx < 22 ? terraceLevels.rightStrip : terraceLevels.rightWing) : height - 1.4;
    // Real roof connections must cut through the old perimeter parapets.
    if (type === 'tower-side') {
      // The headhouse supplies its own side walls; do not bury a parapet inside them.
      const start = cx > 0 ? 3.25 : 1.49;
      box(cx, roofY + .7, (start + 7) / 2, .32, 1.4, 7 - start, m.wall);
      return;
    }
    if (type === 'room' && (cx === -22 || cx === 22) && cz < 0) {
      const rear = cz - width / 2;
      box(cx, roofY + .7, (rear - 3.25) / 2, .32, 1.4, -3.25 - rear, m.wall);
      return;
    }
    b(0, roofY + .7, 0, width, 1.4, .32, m.wall);
    b(0, roofY + 1.35, .05, width + .2, .16, .49, m.trim);
    for (let j = 0; j <= bays; j++) if (!tower || j === 0 || j === bays) b(-width / 2 + j * bay, roofY + .72, .07, .26, 1.6, .42, m.blue);
    for (let j = 0; j < bays; j++) {
      const x = -width / 2 + (j + .5) * bay;
      b(x, roofY + .58, .17, .52, .32, .04, tower ? m.brick : m.grille);
      for (let k = -2; k <= 2; k++) b(x + k * .1, roofY + .58, .2, .035, .26, .02, m.dark);
    }
    if (type !== 'tower-front' && type !== 'gate-return') {
      const gateInset = type === 'west-end' ? bay : 0;
      // Splash stains start at the ground: the low-lying earth around the west wing (regrade.js) sits below y = 0.
      const ground = type === 'west-outer' || type === 'west-end' || type === 'west' ? westWing.floor : 0;
      const geo = new T.PlaneGeometry(width - gateInset - .35, .8); geo.translate(-gateInset / 2, ground + .4, .168); geo.applyMatrix4(transform);
      if (!batches.has(m.weather)) batches.set(m.weather, []); batches.get(m.weather).push(geo);
    }
  }
  function block(x, z, w, d, h, bays, type) {
    face(x, z + d / 2, 0, w, h, bays, type === 'tower' ? 'tower-front' : type === 'west' ? 'west-end' : type);
    const rearBays = type === 'tower' ? 3 : bays;
    if (type !== 'tower') face(x, z - d / 2, Math.PI, w, h, rearBays, type === 'west' ? 'west-outer' : 'room', type.includes('corridor'));
    if (!type.includes('corridor')) {
      for (const side of [-1, 1]) {
        const innerWing = type === 'west' && side === 1 || type === 'room' && x > 20 && side === -1;
        if (innerWing) {
          const length = d / 2 - 3.25;
          if (type === 'west') {
            face(x + w / 2, z + (d / 2 + 3.25) / 2, Math.PI / 2, length, h, 3, 'west');
          } else {
            // The gate faces into the courtyard on the short return, beside the room windows.
            const gateWidth = 4.6, roomStart = 3.25 + gateWidth;
            face(x - w / 2, z + 3.25 + gateWidth / 2, -Math.PI / 2, gateWidth, h, 1, 'gate-return');
            face(x - w / 2, z + (d / 2 + roomStart) / 2, -Math.PI / 2, length - gateWidth, h, 2, 'east-wing');
          }
          // The filmed east passage supplies its own windowed ground-floor wall.
          face(x + side * w / 2, z + (3.25 - d / 2) / 2, side * Math.PI / 2, d / 2 + 3.25, h, Math.max(2, Math.round((d / 2 + 3.25) / 3.5)), 'room', 'rear-half', type === 'room');
          if (type === 'room') {
            // Only the filmed window openings replace the old facade; retain its finish and trim.
            const rear = -d / 2, end = seminarPassage.end, left = x - w / 2;
            box(left, 2, (rear + end) / 2, .32, 4, end - rear, m.wall);
            box(left, groundSpine.rightFloor / 2, (end + groundSpine.roomFront) / 2, .32, groundSpine.rightFloor, groundSpine.roomFront - end, m.wall);
            box(left, 3.9, (rear + 3.25) / 2, .63, .19, 3.25 - rear + .24, m.trim);
            box(left - .19, 4.45, (rear + 3.25) / 2, .075, .35, 3.25 - rear, m.blue);
            for (const zz of [rear, rear + (3.25 - rear) / 6, rear + (3.25 - rear) / 3, end].filter(zz => zz <= end)) {
              box(left - .05, 2, zz, .45, 4, .30, m.blue);
            }
          }
        } else {
          face(x + side * w / 2, z, side * Math.PI / 2, d, h, Math.max(2, Math.round(d / 3.5)), type === 'tower' ? 'tower-side' : type === 'west' ? 'west-outer' : 'room', type === 'tower' ? 'all' : false);
          if (type === 'tower') {
            // Ground-floor openings connect the filmed entrance hall to each side passage.
            const { roomFront, front } = groundSpine;
            box(x + side * w / 2, 2, (roomFront - 7) / 2, .32, 4, roomFront + 7, m.wall);
            // Steel side windows: openings from the 14 October photographs (hallWindows).
            const win = hallWindows[side], sx = x + side * w / 2, wz = (win.z0 + win.z1) / 2, ww = win.z1 - win.z0;
            box(sx, 2, (front + win.z0) / 2, .32, 4, win.z0 - front, m.wall);
            box(sx, 2, (win.z1 + 7) / 2, .32, 4, 7 - win.z1, m.wall);
            box(sx, win.y0 / 2, wz, .32, win.y0, ww, m.wall);
            box(sx, (win.y1 + 4) / 2, wz, .32, 4 - win.y1, ww, m.wall);
            const passageLintelTop = side < 0 ? classroom.floor - .05 : 4;
            box(x + side * w / 2, passageLintelTop - .2, groundSpine.corridorCenter, .32, .4, groundSpine.corridorDepth, m.wall);
            // Tower storeys are 4.2 high; join the 4.0-high entrance shell to the upper facade.
            const storey = (h - 1.4) / Math.round((h - 1.4) / 4);
            if (side < 0) {
              for (const [a, b] of [[z - d / 2, 1.083333], [3.25, z + d / 2]]) box(x + side * w / 2, (4 + storey) / 2, (a + b) / 2, .32, storey - 4, b - a, m.wall);
            } else box(x + side * w / 2, (4 + storey) / 2, z, .32, storey - 4, d, m.wall);
          }
        }
      }
    }
    if (type === 'low-corridor') box(x + (westWing.stepsTop - x + w / 2) / 2, .02, (z - d / 2 + groundSpine.roomFront - .2) / 2, w - (westWing.stepsTop - x + w / 2), .18, groundSpine.roomFront - .2 - (z - d / 2), m.roof); // stops inside the corridor wall // rooms only: the corridor floor is three steps lower
    else box(x, type === 'west' ? westWing.floor - .1 : .02, z, w, .18, d, m.roof); // the west wing floor is three steps lower
    // Plinth: the walls continue into the ground (the terrain around the building lies 0.05-0.15 below the floor
    // datum), stained by rain splash as photographed, so the building never shows a gap or the slab edge.
    if (type === 'west') { // hollow: the wing floor sits three steps down inside it (west-wing.js)
      // The whole ground storey is sunk with its floor (owner): walls start at the floor; a plinth ring closes below.
      const t = .3, bottom = westWing.floor - .5, top = westWing.floor - .02;
      for (const s of [-1, 1]) box(x, (bottom + top) / 2, z + s * d / 2, w + t, top - bottom, t, m.plinth);
      for (const s of [-1, 1]) box(x + s * w / 2, (bottom + top) / 2, z, t, top - bottom, d + t, m.plinth);
    } else if (type === 'low-corridor') { // stops at the top step; the landing below belongs to the west wing
      // Rooms keep a solid base to y = 0; under the corridor (three steps down) it stops below the floor, with a ring
      // under the facade wall up to its base.
      const cut = westWing.stepsTop - (x - w / 2), x0 = x - w / 2 + cut, x1 = x + w / 2 + .01, rooms = groundSpine.roomFront, front = z + d / 2;
      box((x0 + x1) / 2, -.4, (z - d / 2 - .01 + rooms - .2) / 2, x1 - x0, .8, rooms - .2 - (z - d / 2 - .01), m.plinth);
      box((x0 + x1) / 2, (westWing.corridor - .02 - .8) / 2, (rooms + front - .15) / 2, x1 - x0, westWing.corridor - .02 + .8, front - .15 - rooms, m.plinth);
      // Below the sunk facade: its plaster wall continues down to the low left slab, the plinth below that.
      const slab = westWing.ground + .1;
      box((x0 + x1) / 2, (slab - .03 + westWing.corridor - .02) / 2, front, x1 - x0, westWing.corridor - .02 - slab + .03, .32, m.wall);
      box((x0 + x1) / 2, (slab - .03 - 1.6) / 2, front, x1 - x0, slab - .03 + 1.6, .3, m.plinth);
    } else box(x, -.4, z, w + .02, .8, d + .02, m.plinth);
    const roofBase = h - 1.4 - (type === 'west' ? .5 : 0);
    for (let y = 4; y < roofBase - .001; y += 4) {
      // Every stair level needs an opening, including the final roof return.
      if (type === 'tower') box(x, y - .07, 4.15, w, .2, 5.7, m.roof);
      else if (type === 'low-corridor' && y === 4) {
        // The classroom floor descends below this legacy slab. Retain it only behind the room wall.
        box(x, y - .07, (-d / 2 + 1.08) / 2, w, .2, 1.08 + d / 2, m.roof);
      } else if (type === 'west' && y === 4) {
        const left = x - w / 2, right = x + w / 2, passageLeft = -24.5, rear = classroom.originZ - classroomPassage.end, front = 3.25;
        const roomRear = classroom.originZ - classThree.maxX;
        box((left + passageLeft) / 2, y - .07, (-d / 2 + roomRear) / 2, passageLeft - left, .2, roomRear + d / 2, m.roof);
        box((passageLeft + right) / 2, y - .07, (-d / 2 + rear) / 2, right - passageLeft, .2, rear + d / 2, m.roof);
        // Class II's entire floor is lowered, not just a pocket behind its door.
        box(x, classroom.lowerFloor - .12, (front + d / 2) / 2, w, .16, d / 2 - front, m.roof);
        box((passageLeft + right) / 2, classroom.lowerFloor - .12, (rear + front) / 2, right - passageLeft, .16, front - rear, m.roof);
      } else box(x, y - .07, z, w, .2, d, m.roof);
    }
    if (type === 'tower') box(x, stairs.top - .22, 4.15, w + .35, .2, 5.7, m.roof);
    else if (type === 'low-corridor') box(-12.4375, terraceLevels.leftStrip - .22, z, 17.225, .2, d + .35, m.roof);
    else {
      const surface = type === 'west' ? terraceLevels.leftWing : type === 'room' ? terraceLevels.rightWing : terraceLevels.rightStrip;
      const bottom = Math.min(surface - .32, roofBase - .2), top = surface - .12;
      if (type === 'corridor') {
        // Leave the entire corner stair footprint clear; the solid treads close the notch.
        const end = x + (w + .35) / 2, rear = z - (d + .35) / 2;
        box((4.94 + end) / 2, (bottom + top) / 2, z, end - 4.94, top - bottom, d + .35, m.roof);
        box((3.825 + 4.94) / 2, (bottom + top) / 2, (rear + 1.49) / 2, 4.94 - 3.825, top - bottom, 1.49 - rear, m.roof);
      } else box(x, (bottom + top) / 2, z, w + .35, top - bottom, d + .35, m.roof);
    }
  }
  for (const p of footprint) block(p.x, p.z, p.width, p.depth, p.height, p.bays, p.type);
  // Outdoor condensers sit on the narrow ledge of the right-hand outer elevation.
  const acCase = mat('#d4d1c2', { name: 'Right canopy AC casings', map: plasterMap, metalness: .2 });
  box(31.42, 3.15, 0, 1.15, .15, 33.3, m.trim);
  for (const [z, width, height] of [[-11, .95, .9], [-6.6, 1.05, 1.15], [-2.1, .9, 1.0], [2.5, 1.1, 1.2], [7.1, .9, .95], [11.7, 1.02, 1.12]]) {
    const y = 3.29 + height / 2;
    box(31.46, y, z, .48, height, width, acCase);
    box(31.71, y, z, .015, height * .77, width * .77, m.dark);
    const fan = new T.RingGeometry(height * .25, height * .27, 28);
    fan.rotateY(Math.PI / 2); fan.translate(31.735, y, z);
    if (!batches.has(m.metal)) batches.set(m.metal, []); batches.get(m.metal).push(fan);
    for (let i = -4; i <= 4; i++) box(31.75, y + i * height * .078, z, .025, .018, width * .8, acCase);
    for (const side of [-1, 1]) {
      box(31.45, 3.26, z + side * width * .33, .64, .07, .06, m.metal);
      box(31.13, 3.64, z + side * width * .33, .07, .72, .055, m.metal);
    }
    box(31.18, y + .5, z + width * .58, .07, 1.1, .055, m.trim);
  }
  box(0, -.535, 8.5, 10, 1.33, 5.2, m.paving); // porch base: down to the low left plain, no gap under its edge
  box(0, 3.55, 8.8, 10, .24, 4, m.wall);
  box(0, 3.7, 10.8, 10.1, .48, .18, mat('#1287b7'));
  // Cantilevered rear canopy: half the front canopy's depth, with no freestanding posts.
  box(0, 3.55, -7.9, 10, .24, 2, m.wall);
  box(0, 3.63, -8.9, 10.1, .3, .18, m.blue);
  const tower = footprint.find(part => part.type === 'tower');
  const firstStorey = (tower.height - 1.4) / Math.round((tower.height - 1.4) / 4);
  box(0, (3.56 + firstStorey) / 2, 7, 8, firstStorey - 3.56, .35, m.wall);
  for (const x of [-3.85, 3.85]) box(x, 1.75, 7, .3, 3.5, .45, m.blue);
  box(0, 3.43, 7, 7.5, .3, .28, m.entranceWood);
  const halfDoorway = 1.3, sideWidth = 3.75 - halfDoorway, sideCenter = (3.75 + halfDoorway) / 2;
  group.userData.entranceJoinery = { halfDoorway, sideWidth };
  for (const side of [-1, 1]) box(side * (halfDoorway + .015), 1.7, 7, .075, 3.25, .28, m.entranceWood);
  for (const x of [-sideCenter, sideCenter]) {
    const glassWidth = sideWidth - .17;
    box(x, .64, 7, sideWidth, 1.08, .08, m.entranceWood);
    box(x, 3.23, 7, sideWidth, .15, .08, m.entranceWood);
    // Opposite culled faces: reflective outside, see-through tint inside, no stacked glass box.
    const pane = new T.PlaneGeometry(glassWidth, 1.98);
    for (const material of [m.entranceReflectiveGlass, m.entranceTintedGlass]) {
      const surface = new T.Mesh(pane, material); surface.name = material.name;
      surface.position.set(x, 2.2, 7.06); surface.layers.enable(1); group.add(surface);
    }
    box(x, 2.2, 7.10, .065, 2.02, .08, m.entranceWood);
    for (const s of [-1, 1]) box(x + s * glassWidth / 2, 2.2, 7.10, .065, 2.02, .08, m.entranceWood);
    for (const side of [-1, 1]) {
      box(x + side * sideWidth / 4, .63, 7.05, sideWidth / 2 - .18, .83, .025, m.doorPanel);
      for (const offset of [-1, 0, 1]) box(x + side * sideWidth / 4 + offset * .28, 2.2, 6.97, .009, 1.96, .012, m.metal);
    }
    for (let row = 1; row < 6; row++) box(x, 1.21 + row * .33, 6.97, glassWidth, .009, .012, m.metal);
    box(x, 1.17, 7.09, sideWidth, .12, .1, m.entranceWood);
  }
  const doors = [];
  for (const side of [-1, 1]) {
    const pivot = new T.Group(); pivot.name = side < 0 ? 'Left entrance door' : 'Right entrance door'; pivot.position.set(side * halfDoorway, .1, 6.82); pivot.scale.x = halfDoorway / 1.7; group.add(pivot);
    const leaf = new T.Mesh(new T.BoxGeometry(1.68, 3.2, .14), m.entranceWood); leaf.name = 'Solid timber leaf'; leaf.position.set(-side * .85, 1.6, 0); pivot.add(leaf);
    // Inset-style panel fields on both sides keep the folded-open doors finished too.
    const panels = [];
    for (const z of [-.074, .074]) {
      const panel = new T.BoxGeometry(1.32, .82, .018); panel.translate(-side * .85, .56, z); panels.push(panel);
      const upper = new T.Mesh(new T.BoxGeometry(1.32, 1.88, .018), m.upperDoorPanel);
      upper.name = 'Single tall inset panel'; upper.position.set(-side * .85, 2.06, z); pivot.add(upper);
      for (const edge of [-1, 1]) {
        const molding = new T.Mesh(new T.BoxGeometry(.034, 1.95, .036), m.doorPanel);
        molding.position.set(-side * .85 + edge * .68, 2.06, z); pivot.add(molding);
        const rail = new T.Mesh(new T.BoxGeometry(1.39, .034, .036), m.doorPanel);
        rail.position.set(-side * .85, 2.06 + edge * .965, z); pivot.add(rail);
      }
    }
    const panelMesh = new T.Mesh(mergeGeometries(panels), m.doorPanel); panelMesh.name = 'Timber panels'; pivot.add(panelMesh); panels.forEach(g => g.dispose());
    for (const z of [-.15, .15]) {
      const handle = new T.Mesh(new T.CylinderGeometry(.022, .022, .4, 8), m.metal); handle.position.set(-side * 1.49, 1.5, z); pivot.add(handle);
    }
    if (side === 1) {
      // Exterior-face hardware stays with the leaf as it folds inward.
      const hardware = [], add = (geometry, x, y, z) => {
        geometry.translate(x, y, -z); hardware.push(geometry);
      };
      const bolt = new T.CylinderGeometry(.022, .022, .68, 10);
      bolt.rotateZ(Math.PI / 2); add(bolt, -1.22, 1.08, -.17);
      for (const x of [-1.52, -1.18]) {
        add(new T.BoxGeometry(.08, .15, .025), x, 1.08, -.086);
        const guide = new T.TorusGeometry(.034, .012, 6, 12);
        guide.rotateY(Math.PI / 2); add(guide, x, 1.08, -.17);
        for (const y of [1.025, 1.135]) {
          const screw = new T.CylinderGeometry(.009, .009, .012, 6);
          screw.rotateX(Math.PI / 2); add(screw, x, y, -.105);
        }
      }
      add(new T.BoxGeometry(.034, .13, .045), -1.29, 1.02, -.2);
      add(new T.BoxGeometry(.07, .1, .04), -1.5, .965, -.12);
      add(new T.TorusGeometry(.042, .009, 6, 14, Math.PI), -1.5, .894, -.18);
      for (const x of [-1.542, -1.458]) add(new T.CylinderGeometry(.009, .009, .044, 6), x, .872, -.18);
      const lockBody = new T.CylinderGeometry(.064, .058, .045, 16);
      lockBody.rotateX(Math.PI / 2); add(lockBody, -1.5, .817, -.18);
      const fittings = new T.Mesh(mergeGeometries(hardware), m.metal);
      fittings.name = 'Exterior sliding bolt and hanging padlock';
      fittings.castShadow = fittings.receiveShadow = true; pivot.add(fittings);
      hardware.forEach(geometry => geometry.dispose());
    }
    leaf.castShadow = leaf.receiveShadow = panelMesh.castShadow = panelMesh.receiveShadow = true;
    doors.push({ pivot, side, openAngle: -side * Math.PI });
  }
  box(0, .18, 6.85, 7.5, .09, .45, mat('#343d3c', { roughness: .25 }));
  m.porchTube = new T.MeshStandardMaterial({ name: 'Porch tube light', color: '#fffde7', emissive: '#fffde7', emissiveIntensity: 2 });
  box(0, 3.36, 7.32, 1.8, .065, .065, m.porchTube);
  const sign = new T.Mesh(new T.PlaneGeometry(9.8, .35), mat('white', { map: textMap('DEPARTMENT OF INSTRUMENT TECHNOLOGY', '#eee9da', '#96372e'), roughness: .9 }));
  sign.position.set(0, 3.7, 10.901); group.add(sign);
  const upperSign = new T.Mesh(new T.PlaneGeometry(6.8, .36), new T.MeshStandardMaterial({ map: textMap('INSTRUMENT TECHNOLOGY', '#dfddd3', '#858880'), roughness: .9 }));
  upperSign.position.set(0, 9.65, 7.17); group.add(upperSign);
  for (const x of [-21.8, -4.3, 4.3, 21.8]) {
    const height = x < 0 ? 8.3 : 12.3;
    box(x, height / 2, 3.53, .065, height, .08, m.trim);
    box(x + .12, .25, 3.53, .24, .065, .08, m.trim);
  }
  // Upstairs over the west block (owner, 2026-10-17): the Class II/III rooms stay exactly as built inside; from outside
  // each of their windows gets the original facade window at the outer face of the wall - maroon frame with glazing bars,
  // glass, grille and a grey concrete sill. Positions are the classrooms' own (classroom-two/three.js), mapped to world.
  {
    const sill = classroom.lowerFloor + .95, head = classroom.lowerFloor + 2.37, h = head - sill, y = (sill + head) / 2;
    const toWorld = (lx, lz) => [classroom.originX + lz, classroom.originZ - lx]; // classroom group: rotated a quarter turn
    const windows = [ // [world x, world z, width, outward normal x, outward normal z]
      ...[-10.4, -6.8, -3.2].map(lx => [...toWorld(lx, -29.98), 1.65, -1, 0]),                // Class II, west side
      ...[-9.8, -6.7, -3.6].map(lx => [...toWorld(lx, -18.16 + .06 + .12), 1.55, 1, 0]),     // Class II, courtyard side
      ...[-27.85, -25.05, -22.25, -19.4].map(lz => [...toWorld(-12.65 - .08 - .12, lz), 1.65, 0, 1]), // Class II, south end
      ...[.15, 2.2, 4.25, 6.3].map(lx => [...toWorld(lx, -29.82 - .08 - .16), 1.48, -1, 0]),  // Class III, west side
    ];
    // The classroom walls are smooth classroom plaster outside too; give their outer faces the facade's own aged plaster
    // (m.wall), a thin layer with openings at the windows, so the upper floor matches the rest of the building.
    const base = classroom.lowerFloor, top = terraceLevels.leftWing - .12;
    const skins = [ // [fixed world coordinate, axis ('x': the face is at world x = c, running along z), from, to, outward sign, window centres along the run, width]
      [-34.03, 'x', 3.25, 15.03, -1, [-10.4, -6.8, -3.2].map(lx => classroom.originZ - lx), 1.65],
      [-34.07, 'x', -5.13, 3.25, -1, [.15, 2.2, 4.25, 6.3].map(lx => classroom.originZ - lx), 1.48],
      [-21.97, 'x', 3.35, 15.03, 1, [-9.8, -6.7, -3.6].map(lx => classroom.originZ - lx), 1.55],
      [15.03, 'z', -34.03, -21.97, 1, [-27.85, -25.05, -22.25, -19.4].map(lz => classroom.originX + lz), 1.65],
    ];
    for (const [c, axis, from, to, sign, centres, w] of skins) {
      const q = u => axis === 'x' && sign > 0 ? -u : u; // rotated a quarter turn toward +x the plane's local x runs along -z
      const shape = new T.Shape(); shape.moveTo(q(from), base); shape.lineTo(q(to), base); shape.lineTo(q(to), top); shape.lineTo(q(from), top); shape.closePath();
      for (const u of centres) { const hole = new T.Path(); hole.moveTo(q(u - w / 2), sill); hole.lineTo(q(u + w / 2), sill); hole.lineTo(q(u + w / 2), head); hole.lineTo(q(u - w / 2), head); hole.closePath(); shape.holes.push(hole); }
      const g = new T.ShapeGeometry(shape); const p = g.attributes.position, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 3.4, p.getY(i) / 4); // the facade's scale: about one texture per bay and storey
      const turn = new T.Matrix4();
      if (axis === 'x') turn.makeRotationY(sign < 0 ? -Math.PI / 2 : Math.PI / 2).setPosition(c, 0, 0); else turn.makeRotationY(sign < 0 ? Math.PI : 0).setPosition(0, 0, c);
      g.applyMatrix4(turn); g.computeVertexNormals();
      if (!batches.has(m.wall)) batches.set(m.wall, []); batches.get(m.wall).push(g);
    }
    const outside = casementCluster('Upstairs classroom windows (outside)', m.entranceWood, m.rearGlass, { near: 25 });
    for (const [wx, wz, w, nx, nz] of windows) {
      const t = new T.Matrix4().makeRotationY(Math.atan2(nx, nz)).setPosition(wx, 0, wz); // local +z = outward
      const b = (x, yy, z, bw, bh, bd, material) => box(x, yy, z, bw, bh, bd, material, t);
      // Fixed outer frame; two glazed leaves that open outward (no grille outside: the room has its own inside).
      for (const sx of [-1, 1]) { b(sx * (w / 2 + .04), y, .02, .08, h + .08, .1, m.entranceWood); b(0, y + sx * (h / 2 + .04), .02, w + .16, .08, .1, m.entranceWood); }
      outside.add(new T.Matrix4().copy(t).multiply(new T.Matrix4().makeTranslation(0, sill, .11)), w, h, { leaves: 3, rows: 3, cols: 1 });
      b(0, sill - .065, .12, w + .25, .12, .3, m.trim);
    }
    outside.finish(); group.add(outside.group); group.userData.casements = outside;
  }  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = material !== m.weather && material !== m.entranceGlazing; mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  screenTemplates.forEach(parts => [parts.screen, parts.sill, ...parts.letters].forEach(g => g.dispose()));
  const interior = buildEntranceHall(group, m);
  buildClassroomWing(group, { ...m, tread: interior.floor.material, fan: interior.fan });
  buildWestWing(group, m, classroom.lowerFloor - .2);

  buildTerraces(group, m);
  for (const { pivot } of doors) pivot.traverse(object => { if (object.isMesh) object.layers.enable(1); });
  return { group, doors, materials: m, interior, classroomFans: ['II', 'III'].flatMap(n => group.getObjectsByProperty('name', `Class ${n} ceiling fan rotor`)) };
}

function foliageTexture() {
  const c = canvas(256), x = c.getContext('2d');
  for (let branch = 0; branch < 10; branch++) {
    const cx = 35 + random() * 186, cy = 35 + random() * 186;
    x.strokeStyle = '#6c744a'; x.lineWidth = 1.4; x.beginPath(); x.moveTo(128, 230); x.lineTo(cx, cy); x.stroke();
    for (let i = 0; i < 20; i++) {
      const px = cx + (random() - .5) * 80, py = cy + (random() - .5) * 70;
      const g = 74 + random() * 65;
      x.fillStyle = `rgb(${g * .67},${g},${g * .36})`;
      x.beginPath(); x.ellipse(px, py, 4 + random() * 4, 2 + random() * 3, random() * 6, 0, Math.PI * 2); x.fill();
    }
  }
  return texture(c);
}

export function buildEntranceApron(group) {
  const tiles = canvas(256), tileCtx = tiles.getContext('2d');
  tileCtx.fillStyle = '#c1a39a'; tileCtx.fillRect(0, 0, 256, 256);
  tileCtx.strokeStyle = '#816d65'; tileCtx.lineWidth = 2; tileCtx.strokeRect(2, 2, 252, 252);
  for (let r = 24; r < 170; r += 22) { tileCtx.beginPath(); tileCtx.arc(128, 128, r, 0, Math.PI * 2); tileCtx.stroke(); }
  const tileMap = texture(tiles); tileMap.repeat.set(16, 6);
  const tileMat = new T.MeshStandardMaterial({ color: '#ded0c5', roughness: .95, map: tileMap, bumpMap: tileMap, bumpScale: .009 });
  const apron = new T.Mesh(new T.BoxGeometry(9.9, .03, 3.55), tileMat);
  apron.position.set(0, .145, 8.95); apron.name = 'Pink patterned entrance apron'; apron.receiveShadow = true; group.add(apron);
  return apron;
}

