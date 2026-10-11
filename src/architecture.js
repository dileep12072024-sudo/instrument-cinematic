import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { footprint, groundSpine, seminarPassage } from './footprint.js';
import { buildReferenceGarden, trimBuildingFoliage } from './garden.js';
import { buildEntranceHall } from './entrance-hall.js';
import { buildClassroomWing } from './classroom-wing.js';
import { buildTerraces } from './terraces.js';
import { stairs, terraceLevels } from './stair-layout.js';
import { applyWind } from './weather-effects.js';

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
    if (!screenTemplates.has(key)) {
      const shape = new T.Shape();
      shape.moveTo(-w / 2, -h / 2); shape.lineTo(w / 2, -h / 2); shape.lineTo(w / 2, h / 2); shape.lineTo(-w / 2, h / 2); shape.closePath();
      const cols = 16, rows = 11, cw = w / cols, ch = h / rows;
      const hole = (left, bottom, width, height) => {
        const p = new T.Path(), chip = Math.min(width, height) * .075;
        p.moveTo(left, bottom); p.lineTo(left + chip, bottom + height * .52); p.lineTo(left, bottom + height);
        p.lineTo(left + width * .58, bottom + height - chip); p.lineTo(left + width, bottom + height);
        p.lineTo(left + width - chip, bottom + height * .35); p.lineTo(left + width, bottom); p.closePath(); shape.holes.push(p);
      };
      for (let row = 0; row < rows; row++) for (let col = 0; col < cols; col++) {
        // Alternating narrow slots interrupt the horizontal openings, as in the concrete blocks.
        if (row === 4 && col >= 5 && col <= 9) continue;
        const narrow = col === 3 || col === 4 || col === 11 || col === 12;
        const inset = narrow ? cw * .32 : cw * .14;
        const wear = Math.sin(row * 9.3 + col * 5.7) * .006;
        hole(-w / 2 + col * cw + inset, -h / 2 + row * ch + ch * .22 + wear, cw - 2 * inset, ch * .55);
      }
      hole(-w / 2 + 5 * cw + .02, -h / 2 + 4 * ch + .015, 5 * cw - .04, ch - .025);
      const geo = new T.ExtrudeGeometry(shape, { depth: .2, bevelEnabled: false, steps: 1, curveSegments: 1 });
      geo.translate(0, 0, -.07); screenTemplates.set(key, geo);
    }
    const geo = screenTemplates.get(key).clone(); geo.translate(x, y, 0); geo.applyMatrix4(transform);
    if (!batches.has(m.screen)) batches.set(m.screen, []); batches.get(m.screen).push(geo);
    // Small sloping sill in the wider central ventilation slot.
    const slotY = -h / 11, sill = new T.BoxGeometry(w * 5 / 16 - .04, .035, .24).toNonIndexed(); sill.rotateX(.25); sill.translate(x - w / 32, y + slotY - h / 22, .025); sill.applyMatrix4(transform);
    batches.get(m.screen).push(sill);
    // Raised A U forms within the central ventilation slot.
    const letter = (points, radius = .028) => {
      const curve = new T.CatmullRomCurve3(points.map(([px, py]) => new T.Vector3(x + px - w / 32, y + py + slotY, .06)), false, 'centripetal');
      const geo = new T.TubeGeometry(curve, 16, radius, 5, false); geo.applyMatrix4(transform);
      if (!batches.has(m.blue)) batches.set(m.blue, []); batches.get(m.blue).push(geo);
    };
    const lh = h / 13, lx = w / 12;
    letter([[-lx * 1.6, -lh * .35], [-lx, lh * .5], [-lx * .4, -lh * .35]]);
    letter([[-lx * 1.35, 0], [-lx * .65, 0]]);
    letter([[lx * .3, lh * .5], [lx * .4, -lh * .2], [lx, -lh * .3], [lx * 1.5, -lh * .2], [lx * 1.6, lh * .5]]);
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
    let facade = true;
    const b = (x, y, z, w, h, d, material) => {
      const emit = (left, right, top = Infinity) => {
        const bottom = y - h / 2, clippedTop = Math.min(y + h / 2, top);
        if (clippedTop > bottom && right > left) box((left + right) / 2, (bottom + clippedTop) / 2, z, right - left, clippedTop - bottom, d, material, transform);
      };
      // The lowered classroom roof must not expose the old storey's piers or lintels.
      if (facade && height === 9.4 && Math.abs(cx) >= 22) emit(x - w / 2, x + w / 2, terraceLevels.leftWing - .12);
      else if (facade && type === 'low-corridor' && rotation === 0 && x - w / 2 < -21.05 - cx) {
        const split = Math.min(x + w / 2, -21.05 - cx);
        emit(x - w / 2, split, terraceLevels.leftWing - .12); emit(split, x + w / 2);
      } else emit(x - w / 2, x + w / 2);
    };
    const floors = Math.round((height - 1.4) / 4), floorH = (height - 1.4) / floors, bay = width / bays;
    const westOuter = type === 'west-end' || type === 'west-outer';
    const westWindow = type === 'west' || westOuter;
    const tower = type.startsWith('tower') || type === 'east-wing' || westOuter;
    const corridor = type === 'corridor' || type === 'gate-return';
    for (let f = 0; f < floors; f++) {
      if (onlyFloor !== null && f !== onlyFloor) continue;
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
        // Preserve the original facade outside the filmed side-passage window band.
        for (const [a, c] of [[cz - width / 2, -8.813333]]) {
          face(cx, (a + c) / 2, rotation, c - a, height, Math.max(1, Math.round((c - a) / 3.5)), type, closedGround, openGround, 1);
        }
        // Continue the opening through the corridor junction, not just the window band.
        box(cx, 4.032, -2.781667, .32, .064, 12.063333, m.wall);
        box(cx, 7.45, -2.781667, .32, .10, 12.063333, m.wall);
        continue;
      }
      // The entrance is an actual opening, not doors placed over a solid ground-floor wall.
      if ((openGround || type === 'tower-front' || type === 'tower-side') && f === 0) continue;
      const raisedScreen = type === 'corridor' && cx > 0 && f === 0 && rotation === 0;
      const y = f * floorH, openingH = raisedScreen ? 2.04 : f === 0 ? 2.15 : 1.9;
      const openingY = raisedScreen ? groundSpine.screenBottom + openingH / 2 : y + (f === 0 ? 1.9 : 2.55);
      const hasGate = (type === 'gate-return' || type === 'west-end') && f === 0;
      const gateMaterial = type === 'west-end' ? m.westGate : m.gate;
      if (!hasGate) b(0, y + (openingY - openingH / 2 - y) / 2, 0, width, openingY - openingH / 2 - y, .32, m.wall);
      const high = openingY + openingH / 2;
      b(0, (high + y + floorH) / 2, 0, width, y + floorH - high, .32, m.wall);
      for (let j = 0; j < bays; j++) {
        const x = -width / 2 + bay * (j + .5), ow = bay - .6;
        const worldZ = cz - Math.sin(rotation) * x;
        const solid = closedGround === 'all' || f === 0 && (closedGround === true || closedGround === 'rear-half' && worldZ < -3.25);
        const glass = closedGround === true || worldZ < -3.25 ? m.rearGlass : m.glass;
        const lattice = type === 'low-corridor' || corridor && f < floors - 1 || type === 'west' && f === 0;
        b(x - bay / 2, y + floorH / 2, 0, .6, floorH, .32, m.wall);
        if (!tower || j === 0) b(x - bay / 2, y + floorH / 2, .05, .3, floorH, .45, m.blue);
        if (hasGate && j === bays - 1) {
          const gateBottom = .16, gateTop = high, gateHeight = gateTop - gateBottom;
          if (type !== 'gate-return') b(x, (gateTop + gateBottom) / 2, -.4, ow, gateHeight, .06, m.dark);
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
          } else {
            ramp(x, .08, ow, 1.2, .16, m.paving, transform);
          }
          b(x, 3.12, .45, bay, .16, 1.15, m.trim);
        } else if (solid) {
          b(x, openingY, 0, ow, openingH, .32, m.wall);
        } else if (lattice) {
          if ((f !== 0 || !type.includes('corridor')) && !(type === 'low-corridor' && f === 1 && rotation === 0)) b(x, openingY, -.27, ow, openingH, .05, m.dark);
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
            b(x - ow / 2 + k * ow / 8, h / 2, .169, ow / 8, h, .008, m.stain);
          }
        }
      }
      b(width / 2, y + floorH / 2, 0, .6, floorH, .32, m.wall);
      b(width / 2, y + floorH / 2, .05, .3, floorH, .45, m.blue);
      if (f !== 0 || type !== 'west' && type !== 'east-wing') b(0, y + floorH - .1, .1, width + .24, .19, .63, m.trim);
      if (f === 0 && !westOuter) {
        if (type === 'room' && cx < 0 && rotation === Math.PI / 2) {
          const rear = cz - width / 2, junction = 1.083333;
          box(cx + .19, y + floorH + .45, (rear + junction) / 2, .075, .35, junction - rear, m.blue);
        } else b(0, y + floorH + .45, .19, width, .35, .075, m.blue);
      }
      if (f === 0 && (westWindow || type === 'east-wing')) b(0, 3.15, .38, width + .25, .14, 1.05, m.trim);
    }
    if (onlyFloor !== null) return;
    facade = false;
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
      const geo = new T.PlaneGeometry(width - gateInset - .35, .8); geo.translate(-gateInset / 2, .4, .168); geo.applyMatrix4(transform);
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
            if (front < 3.03) box(x + side * w / 2, 2, (front + 3.03) / 2, .32, 4, 3.03 - front, m.wall);
            box(x + side * w / 2, 2, 6.205, .32, 4, 1.59, m.wall);
            box(x + side * w / 2, .8725, 4.37, .32, 1.745, 2.08, m.wall);
            box(x + side * w / 2, 3.4475, 4.37, .32, 1.105, 2.08, m.wall);
            box(x + side * w / 2, 3.8, groundSpine.corridorCenter, .32, .4, groundSpine.corridorDepth, m.wall);
            // Tower storeys are 4.2 high; join the 4.0-high entrance shell to the upper facade.
            const storey = (h - 1.4) / Math.round((h - 1.4) / 4);
            box(x + side * w / 2, (4 + storey) / 2, z, .32, storey - 4, d, m.wall);
          }
        }
      }
    }
    box(x, .02, z, w, .18, d, m.roof);
    const roofBase = h - 1.4 - (type === 'west' ? .5 : 0);
    for (let y = 4; y < roofBase - .001; y += 4) {
      // Every stair level needs an opening, including the final roof return.
      if (type === 'tower') box(x, y - .07, 4.15, w, .2, 5.7, m.roof);
      else box(x, y - .07, z, w, .2, d, m.roof);
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
  box(0, .04, 8.5, 10, .18, 5.2, m.paving);
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
    const mesh = new T.Mesh(mergeGeometries(geometries), material); mesh.castShadow = material !== m.weather && material !== m.entranceGlazing; mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh);
    geometries.forEach(g => g.dispose());
  }
  screenTemplates.forEach(geo => geo.dispose());
  const interior = buildEntranceHall(group, m);
  buildClassroomWing(group, { ...m, tread: interior.floor.material });
  buildTerraces(group, m);
  for (const { pivot } of doors) pivot.traverse(object => { if (object.isMesh) object.layers.enable(1); });
  return { group, doors, materials: m, interior };
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
  const earthMap = loader.load('/media/earth.jpg'); earthMap.colorSpace = T.SRGBColorSpace; earthMap.wrapS = earthMap.wrapT = T.RepeatWrapping; earthMap.repeat.set(1000, 1000); earthMap.anisotropy = 8;
  const earthNormal = loader.load('/media/earth-normal.jpg'); earthNormal.wrapS = earthNormal.wrapT = T.RepeatWrapping; earthNormal.repeat.copy(earthMap.repeat); earthNormal.anisotropy = 4;
  const groundMat = mat('#c4ad8b', { map: earthMap, normalMap: earthNormal, normalScale: new T.Vector2(.6, .6) });
  const slope = z => T.MathUtils.clamp((z - 11) / 25, 0, 1) * .45;
  const groundHeight = z => -.14 - slope(z);
  const groundGeo = new T.PlaneGeometry(2000, 2000, 1, 400); groundGeo.rotateX(-Math.PI / 2);
  const groundPos = groundGeo.attributes.position;
  for (let i = 0; i < groundPos.count; i++) groundPos.setY(i, groundHeight(groundPos.getZ(i)));
  groundGeo.computeVertexNormals();
  const ground = new T.Mesh(groundGeo, groundMat); ground.receiveShadow = true; group.add(ground);
  const soilMap = earthMap.clone(), soilNormal = earthNormal.clone(); soilMap.repeat.set(60, 60); soilNormal.repeat.set(60, 60);
  const soilMat = groundMat.clone(); soilMat.map = soilMap; soilMat.normalMap = soilNormal; soilMat.vertexColors = true;
  const soilGeo = new T.PlaneGeometry(120, 120, 160, 160); soilGeo.rotateX(-Math.PI / 2);
  const soilPos = soilGeo.attributes.position, soilColors = [], color = new T.Color();
  for (let i = 0; i < soilPos.count; i++) {
    const x = soilPos.getX(i), z = soilPos.getZ(i);
    const edge = T.MathUtils.smoothstep(60 - Math.max(Math.abs(x), Math.abs(z)), 0, 4);
    const patch = Math.sin(x * .51 + Math.sin(z * .29)) * Math.cos(z * .43) * .5 + .5;
    soilPos.setY(i, groundHeight(z) + edge * (.005 + patch * .044));
    color.setRGB(.73 + patch * .27, .67 + patch * .3, .58 + patch * .34); soilColors.push(color.r, color.g, color.b);
  }
  soilGeo.setAttribute('color', new T.Float32BufferAttribute(soilColors, 3)); soilGeo.computeVertexNormals();
  const soil = new T.Mesh(soilGeo, soilMat); soil.name = 'Uneven mottled courtyard earth'; soil.receiveShadow = true; group.add(soil);
  const roadMat = mat('#989a90', { map: noiseMap('#53585a', 20) }); roadMat.bumpMap = roadMat.map; roadMat.bumpScale = .016;
  const pavingMat = mat('#c5c3b3', { map: noiseMap('#b3b3a8', 10, true), bumpScale: .018 }); pavingMat.bumpMap = pavingMat.map;
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
  const treePositions = [[-37, 10, 14], [-37, -6, 14], [-29, 18, 14], [-43, 16, 14], [41, 11, 13], [-45, -10, 14], [44, -15, 12], [-13, -25, 13], [9, -25, 15], [30, -29, 13], [-30, -29, 15]];
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
  const windStrength = { value: 0 }, windDirection = { value: new T.Vector2(0, 1) };
  applyWind(leafMat, wind, windStrength, windDirection);
  group.add(foliage);
  const debrisMat = mat('#8b7957', { side: T.DoubleSide });
  const debris = new T.InstancedMesh(new T.PlaneGeometry(.14, .055), debrisMat, 1900);
  for (let i = 0; i < 1900; i++) {
    let x = (random() - .5) * 95, z = 10 + random() * 40;
    if (Math.abs(x) < 3 || Math.abs(z - 39) < 3.3) x += x < 0 ? -5 : 5;
    const paved = (x < -21 && x > -35 && z < 16) || (x > 21 && x < 32 && z < 17.5);
    dummy.position.set(x, (paved ? .022 : groundHeight(z) + .06) + random() * .01, z); dummy.rotation.set(-Math.PI / 2, 0, random() * 6); dummy.scale.setScalar(.7 + random() * 1.7); dummy.updateMatrix(); debris.setMatrixAt(i, dummy.matrix);
    debris.setColorAt(i, new T.Color().setHSL(.07 + random() * .12, .2 + random() * .25, .3 + random() * .25));
  }
  group.add(debris);
  const stones = new T.InstancedMesh(new T.IcosahedronGeometry(1, 0), mat('#a69f8c'), 280);
  stones.name = 'Broken verge aggregate';
  for (let i = 0; i < stones.count; i++) {
    const side = random() < .5 ? -1 : 1, x = side * (3.2 + random() ** 2 * 19), z = 12 + random() * 23;
    const size = .035 + random() ** 3 * .18;
    dummy.position.set(x, groundHeight(z) + .04, z); dummy.rotation.set(random() * 3, random() * 6, random() * 3);
    dummy.scale.set(size * 1.6, size * .5, size); dummy.updateMatrix(); stones.setMatrixAt(i, dummy.matrix);
    stones.setColorAt(i, new T.Color().setHSL(.08, .1 + random() * .2, .35 + random() * .3));
  }
  stones.receiveShadow = true; group.add(stones);
  const garden = buildReferenceGarden(group, groundHeight, wind, windStrength, windDirection);
  const tanks = scene.getObjectByName('Reference terraces and roof stair enclosure')?.userData.tanks || [];
  trimBuildingFoliage(foliage, tanks);
  trimBuildingFoliage(garden.foliage, tanks);
  return { group, foliage, wind, windStrength, windDirection, garden, groundMaterial: groundMat, soilMaterial: soilMat, pavingMaterial: pavingMat };
}
