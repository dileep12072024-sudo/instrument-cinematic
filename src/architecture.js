import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint } from './footprint.js';
import { buildReferenceGarden } from './garden.js';

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
    x.strokeStyle = '#696b6355'; x.lineWidth = 2;
    for (let y = 0; y < 512; y += 64) for (let xx = (y % 128 ? -64 : 0); xx < 512; xx += 128) x.strokeRect(xx, y, 128, 64);
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
    grille: mat('#d1cbb8'), brick: mat('#ae7259'), stain: mat('#ad7c56'), paving: mat('#b4b2a6', { map: noiseMap('#c7c4b8', 7, true), bumpScale: .025 }),
    weather: mat('#ffffff', { map: weatherMap(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
  };
  m.rearGlass = m.glass.clone(); m.rearGlass.name = 'Rear glass';
  const grain = woodGrain();
  m.entranceWood = mat('#927c64', { name: 'Entrance timber', map: grain, bumpMap: grain, bumpScale: .003, roughness: .65 });
  m.doorPanel = m.entranceWood.clone(); m.doorPanel.color.set('#b69372');
  m.upperDoorPanel = m.entranceWood.clone(); m.upperDoorPanel.color.set('#dac98b');
  m.screen = mat('#d5d0bd', { name: 'Pierced concrete screens', map: plasterMap, bumpMap: plasterMap, bumpScale: .018 });
  m.gate = mat('#65777b', { name: 'East folding gate', metalness: .7, roughness: .46 });
  m.paving.bumpMap = m.paving.map;
  const batches = new Map(), matrix = new T.Matrix4(), quaternion = new T.Quaternion();
  const screenTemplates = new Map();
  function concreteScreen(x, y, w, h, transform) {
    const key = `${w}:${h}`;
    if (!screenTemplates.has(key)) {
      const shape = new T.Shape();
      shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
      const cols = 15, rows = 12, cw = w / cols, ch = h / rows;
      const hole = (left, bottom, width, height) => {
        const p = new T.Path(); p.moveTo(left, bottom); p.lineTo(left, bottom + height); p.lineTo(left + width, bottom + height); p.lineTo(left + width, bottom); p.closePath(); shape.holes.push(p);
      };
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        // Alternating narrow slots interrupt the horizontal openings, as in the concrete blocks.
        if ((row === 5 || row === 6) && col >= 5 && col <= 9) continue;
        const narrow = (col + (row < 6 ? 0 : 2)) % 5 === 3;
        const inset = narrow ? cw * .32 : cw * .14;
        const wear = Math.sin(row * 9.3 + col * 5.7) * .006;
        hole(-w / 2 + col * cw + inset, -h / 2 + row * ch + ch * .22 + wear, cw - 2 * inset, ch * .55);
      }
      hole(-w / 2 + 5 * cw + .04, -ch + .04, 5 * cw - .08, 2 * ch - .08);
      const geo = new T.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: false, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -.07); screenTemplates.set(key, geo);
    }
    const geo = screenTemplates.get(key).clone(); geo.translate(x, y, 0); geo.applyMatrix4(transform);
    if (!batches.has(m.screen)) batches.set(m.screen, []); batches.get(m.screen).push(geo);
    // Small sloping sill in the wider central ventilation slot.
    const sill = new T.BoxGeometry(w / 3 - .08, .04, .24).toNonIndexed(); sill.rotateX(.25); sill.translate(x, y - h / 12 + .04, .025); sill.applyMatrix4(transform);
    batches.get(m.screen).push(sill);
    // Raised A U forms within the central ventilation slot.
    const letter = (points, radius = .025) => {
      const curve = new T.CatmullRomCurve3(points.map(([px, py]) => new T.Vector3(x + px, y + py, .06)), false, 'centripetal');
      const geo = new T.TubeGeometry(curve, 16, radius, 5, false); geo.applyMatrix4(transform);
      if (!batches.has(m.blue)) batches.set(m.blue, []); batches.get(m.blue).push(geo);
    };
    const lh = h / 7, lx = w / 9;
    letter([[-lx * 1.6, -lh * .35], [-lx, lh * .5], [-lx * .4, -lh * .35]]);
    letter([[-lx * 1.35, 0], [-lx * .65, 0]]);
    letter([[lx * .3, lh * .5], [lx * .4, -lh * .2], [lx, -lh * .3], [lx * 1.5, -lh * .2], [lx * 1.6, lh * .5]]);
  }
  function box(x, y, z, w, h, d, material, parent = null) {
    const geo = new T.BoxGeometry(w, h, d); matrix.makeTranslation(x, y, z); geo.applyMatrix4(matrix);
    if (parent) geo.applyMatrix4(parent);
    if (!batches.has(material)) batches.set(material, []); batches.get(material).push(geo);
  }
  function face(cx, cz, rotation, width, height, bays, type, closedGround = false) {
    const transform = new T.Matrix4().compose(new T.Vector3(cx, 0, cz), quaternion.setFromAxisAngle(new T.Vector3(0, 1, 0), rotation), new T.Vector3(1, 1, 1));
    const b = (x, y, z, w, h, d, material) => box(x, y, z, w, h, d, material, transform);
    const floors = Math.round((height - 1.4) / 4), floorH = (height - 1.4) / floors, bay = width / bays;
    const tower = type.startsWith('tower') || type === 'east-wing';
    const corridor = type === 'corridor' || type === 'gate-return';
    for (let f = 0; f < floors; f++) {
      // The entrance is an actual opening, not doors placed over a solid ground-floor wall.
      if (type === 'tower-front' && f === 0) continue;
      const y = f * floorH, openingY = y + (f === 0 ? 1.9 : 2.55), openingH = f === 0 ? 2.15 : 1.9;
      const hasGate = type === 'gate-return' && f === 0;
      if (!hasGate) b(0, y + (openingY - openingH / 2 - y) / 2, 0, width, openingY - openingH / 2 - y, .32, m.wall);
      const high = openingY + openingH / 2;
      b(0, (high + y + floorH) / 2, 0, width, y + floorH - high, .32, m.wall);
      for (let j = 0; j < bays; j++) {
        const x = -width / 2 + bay * (j + .5), ow = bay - .6;
        const worldZ = cz - Math.sin(rotation) * x;
        const solid = f === 0 && (closedGround === true || closedGround === 'rear-half' && worldZ < -3.25);
        const glass = closedGround === true || worldZ < -3.25 ? m.rearGlass : m.glass;
        const lattice = type === 'low-corridor' || corridor && f < floors - 1 || type === 'west' && f === 0;
        b(x - bay / 2, y + floorH / 2, 0, .6, floorH, .32, m.wall);
        if (!tower || j === 0) b(x - bay / 2, y + floorH / 2, .05, .3, floorH, .45, m.blue);
        if (hasGate && j === bays - 1) {
          const gateBottom = .16, gateTop = high, gateHeight = gateTop - gateBottom;
          b(x, (gateTop + gateBottom) / 2, -.4, ow, gateHeight, .06, m.dark);
          for (const s of [-1, 1]) b(x + s * (ow / 2 - .04), (gateTop + gateBottom) / 2, .08, .08, gateHeight, .12, m.gate);
          for (const yy of [gateBottom, gateTop]) b(x, yy, .08, ow, .08, .12, m.gate);
          for (let k = 1; k < 15; k++) b(x - ow / 2 + k * ow / 15, (gateTop + gateBottom) / 2, .07, .018, gateHeight, .04, m.gate);
          for (const slope of [-3, 3]) for (let offset = -gateHeight / 2 - ow * 1.5; offset <= gateHeight / 2 + ow * 1.5; offset += .85) {
            const a = (-gateHeight / 2 - offset) / slope, c = (gateHeight / 2 - offset) / slope;
            const lo = Math.max(-ow / 2, Math.min(a, c)), hi = Math.min(ow / 2, Math.max(a, c));
            if (hi <= lo) continue;
            const mid = (lo + hi) / 2, geo = new T.BoxGeometry((hi - lo) * Math.sqrt(10), .025, .045);
            geo.rotateZ(Math.atan(slope)); geo.translate(x + mid, (gateTop + gateBottom) / 2 + slope * mid + offset, .1); geo.applyMatrix4(transform);
            if (!batches.has(m.gate)) batches.set(m.gate, []); batches.get(m.gate).push(geo);
          }
          b(x, .1, .6, ow, .16, 1.15, m.brick);
          b(x, .19, 1.17, ow, .035, .1, mat('#c2aa52'));
          b(x, 3.12, .45, bay, .16, 1.15, m.trim);
        } else if (solid) {
          b(x, openingY, 0, ow, openingH, .32, m.wall);
        } else if (lattice) {
          b(x, openingY, -.27, ow, openingH, .05, m.dark);
          if (f === 0) {
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
          const ww = type === 'west' ? ow - .25 : Math.min(ow - .4, type === 'east-wing' ? 1.85 : tower ? 2.8 : 2.0), wh = openingH - .13;
          const windowFrame = type === 'west' ? m.entranceWood : m.frame;
          const side = (ow - ww) / 2;
          for (const s of [-1, 1]) b(x + s * (ww + side) / 2, openingY, 0, side, openingH, .32, m.wall);
          b(x, openingY, -.19, ww, wh, .05, glass);
          for (const s of [-1, 1]) {
            b(x, openingY + s * (wh / 2 + (openingH - wh) / 4), 0, ww, (openingH - wh) / 2, .32, m.wall);
            b(x + s * ww / 2, openingY, .005, .085, wh, .12, windowFrame);
            b(x, openingY + s * wh / 2, .005, ww + .1, .08, .12, windowFrame);
          }
          if (type === 'west') {
            for (const s of [-1, 1]) {
              b(x + s * ww / 6, openingY, .015, .075, wh, .13, windowFrame);
              b(x, openingY + s * wh / 6, .015, ww, .065, .13, windowFrame);
            }
          } else {
            b(x, openingY, .015, .065, wh, .13, windowFrame);
            for (const s of type === 'east-wing' ? [-1, 1] : [0]) b(x, openingY + s * wh / 6, .015, ww, .05, .13, windowFrame);
          }
          const grilleZ = type === 'west' || type === 'east-wing' ? -.04 : .09;
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
            b(x - ow / 2 + k * ow / 8, h / 2, .169, ow / 8, h, .008, m.stain);
          }
        }
      }
      b(width / 2, y + floorH / 2, 0, .6, floorH, .32, m.wall);
      b(width / 2, y + floorH / 2, .05, .3, floorH, .45, m.blue);
      if (f !== 0 || type !== 'west' && type !== 'east-wing') b(0, y + floorH - .1, .1, width + .24, .19, .63, m.trim);
      if (f === 0) b(0, y + floorH + .45, .19, width, .35, .075, m.blue);
      if (f === 0 && (type === 'west' || type === 'east-wing')) b(0, 3.15, .38, width + .25, .14, 1.05, m.trim);
    }
    const roofY = height - 1.4;
    b(0, roofY + .7, 0, width, 1.4, .32, m.wall);
    b(0, roofY + 1.35, .05, width + .2, .16, .49, m.trim);
    for (let j = 0; j <= bays; j++) if (!tower || j === 0 || j === bays) b(-width / 2 + j * bay, roofY + .72, .07, .26, 1.6, .42, m.blue);
    for (let j = 0; j < bays; j++) {
      const x = -width / 2 + (j + .5) * bay;
      b(x, roofY + .58, .17, .52, .32, .04, tower ? m.brick : m.grille);
      for (let k = -2; k <= 2; k++) b(x + k * .1, roofY + .58, .2, .035, .26, .02, m.dark);
    }
    if (type !== 'tower-front' && type !== 'gate-return') {
      const geo = new T.PlaneGeometry(width - .35, .8); geo.translate(0, .4, .168); geo.applyMatrix4(transform);
      if (!batches.has(m.weather)) batches.set(m.weather, []); batches.get(m.weather).push(geo);
    }
  }
  function block(x, z, w, d, h, bays, type) {
    face(x, z + d / 2, 0, w, h, bays, type === 'tower' ? 'tower-front' : type);
    face(x, z - d / 2, Math.PI, w, h, bays, 'room', true);
    if (!type.includes('corridor')) {
      for (const side of [-1, 1]) {
        const innerWing = type === 'west' && side === 1 || type === 'room' && x > 20 && side === -1;
        if (innerWing) {
          const length = d / 2 - 3.25;
          if (type === 'west') {
            face(x + w / 2, z + (d / 2 + 3.25) / 2, Math.PI / 2, length, h, 3, 'west');
          } else {
            // The gate faces into the courtyard on the short return, beside the room windows.
            const gateWidth = 3.3, roomStart = 3.25 + gateWidth;
            face(x - w / 2, z + 3.25 + gateWidth / 2, -Math.PI / 2, gateWidth, h, 1, 'gate-return');
            face(x - w / 2, z + (d / 2 + roomStart) / 2, -Math.PI / 2, length - gateWidth, h, 2, 'east-wing');
          }
          face(x + side * w / 2, z + (3.25 - d / 2) / 2, side * Math.PI / 2, d / 2 + 3.25, h, Math.max(2, Math.round((d / 2 + 3.25) / 3.5)), 'room', 'rear-half');
        } else face(x + side * w / 2, z, side * Math.PI / 2, d, h, Math.max(2, Math.round(d / 3.5)), type === 'west' ? 'west' : 'room', 'rear-half');
      }
    }
    box(x, .02, z, w, .18, d, m.roof);
    for (let y = 4; y < h - 1.3; y += 4) box(x, y - .07, z, w, .2, d, m.roof);
    box(x, h - 1.4, z, w + .35, .2, d + .35, m.roof);
  }
  for (const p of footprint) block(p.x, p.z, p.width, p.depth, p.height, p.bays, p.type);
  box(0, .04, 8.5, 10, .18, 5.2, m.paving);
  box(0, 3.55, 8.8, 10, .24, 4, m.wall);
  box(0, 3.7, 10.8, 10.1, .48, .18, mat('#1287b7'));
  // Cantilevered rear canopy: half the front canopy's depth, with no freestanding posts.
  box(0, 3.55, -7.9, 10, .24, 2, m.wall);
  box(0, 3.63, -8.9, 10.1, .3, .18, m.blue);
  box(0, 3.78, 7, 8, .44, .35, m.wall);
  for (const x of [-3.85, 3.85]) box(x, 1.75, 7, .3, 3.5, .45, m.blue);
  box(0, 1.7, 3, 7.5, 3.4, .25, m.dark);
  box(0, 3.43, 7, 7.5, .3, .28, m.entranceWood);
  for (const x of [-1.715, 1.715]) box(x, 1.7, 7, .075, 3.25, .28, m.entranceWood);
  for (const x of [-2.75, 2.75]) {
    box(x, 1.7, 7, 2.05, 3.2, .08, m.entranceWood);
    box(x, 2.2, 7.06, 1.88, 1.98, .045, m.glass);
    box(x, 2.2, 7.10, .065, 2.02, .08, m.entranceWood);
    for (const s of [-1, 1]) box(x + s * .94, 2.2, 7.10, .065, 2.02, .08, m.entranceWood);
    for (const offset of [-.49, .49]) box(x + offset, .63, 7.05, .83, .83, .025, m.doorPanel);
    box(x, 1.17, 7.09, 2.05, .12, .1, m.entranceWood);
  }
  const doors = [];
  for (const side of [-1, 1]) {
    const pivot = new T.Group(); pivot.name = side < 0 ? 'Left entrance door' : 'Right entrance door'; pivot.position.set(side * 1.7, .1, 6.82); group.add(pivot);
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
    leaf.castShadow = leaf.receiveShadow = panelMesh.castShadow = panelMesh.receiveShadow = true;
    doors.push({ pivot, side, openAngle: -side * Math.PI });
  }
  box(0, .18, 6.85, 7.5, .09, .45, mat('#343d3c', { roughness: .25 }));
  box(0, 3.36, 7.32, 1.8, .065, .065, new T.MeshStandardMaterial({ color: '#fffde7', emissive: '#fffde7', emissiveIntensity: 2 }));
  const sign = new T.Mesh(new T.PlaneGeometry(9.8, .35), mat('white', { map: textMap('DEPARTMENT OF INSTRUMENT TECHNOLOGY', '#eee9da', '#96372e'), roughness: .9 }));
  sign.position.set(0, 3.7, 10.901); group.add(sign);
  const upperSign = new T.Mesh(new T.PlaneGeometry(6.8, .36), new T.MeshStandardMaterial({ map: textMap('INSTRUMENT TECHNOLOGY', '#dfddd3', '#858880'), roughness: .9 }));
  upperSign.position.set(0, 9.65, 7.17); group.add(upperSign);
  for (const x of [-21.8, -4.3, 4.3, 21.8]) {
    const height = x < 0 ? 8.3 : 12.3;
    box(x, height / 2, 3.53, .065, height, .08, m.trim);
    box(x + .12, .25, 3.53, .24, .065, .08, m.trim);
  }
  for (const [material, geometries] of batches) {
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = material !== m.weather; mesh.receiveShadow = true; group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  screenTemplates.forEach(geo => geo.dispose());
  return { group, doors, materials: m };
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

export function buildLandscape(scene) {
  const group = new T.Group(); group.name = 'Courtyard and planting'; scene.add(group);
  const mat = (color, opts = {}) => new T.MeshStandardMaterial({ color, roughness: .95, ...opts });
  const loader = new T.TextureLoader();
  const earthMap = loader.load('/media/earth.jpg'); earthMap.colorSpace = T.SRGBColorSpace; earthMap.wrapS = earthMap.wrapT = T.RepeatWrapping; earthMap.repeat.set(330, 330); earthMap.anisotropy = 8;
  const earthNormal = loader.load('/media/earth-normal.jpg'); earthNormal.wrapS = earthNormal.wrapT = T.RepeatWrapping; earthNormal.repeat.copy(earthMap.repeat); earthNormal.anisotropy = 4;
  const groundMat = mat('#c4ad8b', { map: earthMap, normalMap: earthNormal, normalScale: new T.Vector2(.6, .6) });
  const slope = z => T.MathUtils.clamp((z - 11) / 25, 0, 1) * .45;
  const groundHeight = z => -.14 - slope(z);
  const groundGeo = new T.PlaneGeometry(2000, 2000, 1, 400); groundGeo.rotateX(-Math.PI / 2);
  const groundPos = groundGeo.attributes.position;
  for (let i = 0; i < groundPos.count; i++) groundPos.setY(i, groundHeight(groundPos.getZ(i)));
  groundGeo.computeVertexNormals();
  const ground = new T.Mesh(groundGeo, groundMat); ground.receiveShadow = true; group.add(ground);
  const grassMap = noiseMap('#76805a', 22), grassMat = mat('#9b9d73', { map: grassMap, bumpMap: grassMap, bumpScale: .08 });
  const grass = new T.Mesh(new T.PlaneGeometry(400, 400), grassMat); grass.rotation.x = -Math.PI / 2; grass.position.set(0, -.12, -219); grass.receiveShadow = true; group.add(grass);
  const roadMat = mat('#989a90', { map: noiseMap('#53585a', 20) }); roadMat.bumpMap = roadMat.map; roadMat.bumpScale = .016;
  const pavingMat = mat('#c5c3b3', { map: noiseMap('#bebeb3', 10, true) });
  const curbMat = mat('#c7c4b6'), white = mat('#e3dfcb');
  function box(w, h, d, x, y, z, material) { const m = new T.Mesh(new T.BoxGeometry(w, h, d), material); m.position.set(x, y, z); m.receiveShadow = true; group.add(m); return m; }
  box(64, .12, 6, 0, -.045, 6.3, pavingMat);
  for (const p of footprint.filter(p => p.depth > 20)) box(p.width + 2, .12, p.depth + 2, p.x, -.045, p.z, pavingMat);
  function gradedBox(w, h, d, x, y, z, material) {
    const mesh = box(w, h, d, x, y, z, material), p = mesh.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) - slope(z + p.getZ(i)));
    mesh.geometry.computeVertexNormals(); return mesh;
  }
  gradedBox(5.2, .1, 25, 0, -.045, 23.5, roadMat).name = 'Sloping entrance drive';
  gradedBox(180, .1, 6.5, 0, -.045, 39, roadMat);
  for (const x of [-2.5, 2.5]) gradedBox(.065, .012, 25, x, .017, 23.5, white);
  for (const z of [35.95, 42.04]) gradedBox(180, .014, .08, 0, .018, z, white);
  for (const x of [-3, 3]) gradedBox(.18, .22, 24, x, .035, 23.5, curbMat);
  for (const z of [35.7, 42.3]) gradedBox(180, .18, .22, 0, .025, z, curbMat);
  const tiles = canvas(256), tileCtx = tiles.getContext('2d');
  tileCtx.fillStyle = '#c1a39a'; tileCtx.fillRect(0, 0, 256, 256);
  tileCtx.strokeStyle = '#816d65'; tileCtx.lineWidth = 2; tileCtx.strokeRect(2, 2, 252, 252);
  for (let r = 24; r < 170; r += 22) { tileCtx.beginPath(); tileCtx.arc(128, 128, r, 0, Math.PI * 2); tileCtx.stroke(); }
  const tileMap = texture(tiles); tileMap.repeat.set(16, 6);
  const tileMat = mat('#ded0c5', { map: tileMap, bumpMap: tileMap, bumpScale: .009 });
  box(9.9, .03, 3.55, 0, .145, 8.95, tileMat).name = 'Pink patterned entrance apron';
  const treePositions = [[-39, 16, 14], [41, 11, 13], [-43, -10, 14], [44, -15, 12], [-13, -25, 13], [9, -25, 15], [30, -29, 13], [-30, -29, 15]];
  for (let i = 0; i < 26; i++) {
    const a = random() * Math.PI * 2, r = 60 + random() * 50;
    const z = Math.sin(a) * r;
    if (z < 12) treePositions.push([Math.cos(a) * r, z, 10 + random() * 10]);
  }
  for (let i = 0; i < 16; i++) treePositions.push([-65 + i * 9, -43 - random() * 15, 11 + random() * 7]);
  const barkMat = mat('#6b6454', { map: noiseMap('#aea38b', 2), bumpScale: .12 }); barkMat.bumpMap = barkMat.map;
  const branchGeos = [], leaves = [], dummy = new T.Object3D();
  const up = new T.Vector3(0, 1, 0);
  function branch(a, b, radius) {
    const geo = new T.CylinderGeometry(radius * .55, radius, a.distanceTo(b), 6);
    dummy.position.copy(a).lerp(b, .5); dummy.quaternion.setFromUnitVectors(up, b.clone().sub(a).normalize()); dummy.scale.set(1, 1, 1); dummy.updateMatrix(); geo.applyMatrix4(dummy.matrix); branchGeos.push(geo);
  }
  for (const [x, z, h] of treePositions) {
    const crown = new T.Vector3(x, h * .62, z);
    branch(new T.Vector3(x, 0, z), crown, h * .029);
    for (let j = 0; j < 8; j++) {
      const a = j * Math.PI / 4 + random() * .5;
      const tip = crown.clone().add(new T.Vector3(Math.cos(a) * h * .29, h * (.12 + random() * .24), Math.sin(a) * h * .29));
      branch(crown.clone().add(new T.Vector3(0, -random() * 1.5, 0)), tip, h * .009);
      for (let k = 0; k < 8; k++) {
        const end = tip.clone().add(new T.Vector3((random() - .5) * h * .48, (random() - .4) * h * .28, (random() - .5) * h * .48));
        if (k < 3) branch(tip, end, .032);
        leaves.push({ p: end, s: h * (.19 + random() * .12) });
      }
    }
  }
  const trunks = new T.Mesh(mergeGeometries(branchGeos), barkMat); trunks.castShadow = true; trunks.receiveShadow = true; group.add(trunks); branchGeos.forEach(g => g.dispose());
  const leafMap = foliageTexture();
  const leafMat = new T.MeshStandardMaterial({ map: leafMap, alphaTest: .45, side: T.DoubleSide, roughness: .95, color: '#b6c195' });
  const foliage = new T.InstancedMesh(new T.PlaneGeometry(1, 1), leafMat, leaves.length * 2);
  for (let i = 0; i < leaves.length; i++) for (let j = 0; j < 2; j++) {
    const { p, s } = leaves[i]; dummy.position.copy(p); dummy.rotation.set((random() - .5) * 2.5, random() * Math.PI * 2, random() * 2); dummy.scale.set(s, s, s); dummy.updateMatrix(); foliage.setMatrixAt(i * 2 + j, dummy.matrix);
    foliage.setColorAt(i * 2 + j, new T.Color().setHSL(.19 + random() * .07, .18 + random() * .14, .54 + random() * .2));
  }
  // Separate canopy shadow cards keep the shadow pass independent of leaf density.
  foliage.castShadow = false; foliage.receiveShadow = false;
  const shadowMaterial = new T.MeshBasicMaterial({ colorWrite: false, depthWrite: false, side: T.DoubleSide });
  const canopyShadows = new T.InstancedMesh(new T.PlaneGeometry(1, 1), shadowMaterial, treePositions.length * 3);
  canopyShadows.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: leafMap, alphaTest: .45, side: T.DoubleSide });
  treePositions.forEach(([x, z, h], i) => {
    for (let k = 0; k < 3; k++) {
      dummy.position.set(x, h * .87, z); dummy.scale.set(h * .8, h * .65, 1);
      dummy.rotation.set(k === 2 ? Math.PI / 2 : 0, k === 1 ? Math.PI / 2 : 0, 0);
      dummy.updateMatrix(); canopyShadows.setMatrixAt(i * 3 + k, dummy.matrix);
    }
  });
  canopyShadows.castShadow = true; group.add(canopyShadows);
  const wind = { value: 0 };
  leafMat.onBeforeCompile = shader => {
    shader.uniforms.uWind = wind;
    shader.vertexShader = 'uniform float uWind;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += sin(uWind * 0.75 + instanceMatrix[3].x * 0.5 + instanceMatrix[3].z * 0.3) * 0.025 * (position.y + 0.5);');
  };
  group.add(foliage);
  const debrisMat = mat('#8b7957', { side: T.DoubleSide });
  const debris = new T.InstancedMesh(new T.PlaneGeometry(.14, .055), debrisMat, 1900);
  for (let i = 0; i < 1900; i++) {
    let x = (random() - .5) * 95, z = 10 + random() * 40;
    if (Math.abs(x) < 3 || Math.abs(z - 39) < 3.3) x += x < 0 ? -5 : 5;
    dummy.position.set(x, -.052 + random() * .01, z); dummy.rotation.set(-Math.PI / 2, 0, random() * 6); dummy.scale.setScalar(.7 + random() * 1.7); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
  }
  group.add(debris);
  const garden = buildReferenceGarden(group, groundHeight, wind);
  return { group, foliage, wind, garden, groundMaterial: groundMat, pavingMaterial: pavingMat };
}
