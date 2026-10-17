import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { stairs, terraceCovers, terraceLevels as levels } from './stair-layout.js';
import { rbox, granitePlaque, engraveLine } from './props.js';

export function buildTerraces(parent, m) {
  const group = new T.Group(); group.name = 'Reference terraces and roof stair enclosure'; parent.add(group);
  group.userData.tanks = [];
  const batches = new Map();
  const add = (g, material) => { if (!batches.has(material)) batches.set(material, []); batches.get(material).push(g.index ? g.toNonIndexed() : g); };
  const box = (x, y, z, w, h, d, material = wall) => { const g = new T.BoxGeometry(w, h, d); g.translate(x, y, z); add(g, material); };
  const cylinder = (x, y, z, r, h, material) => { const g = new T.CylinderGeometry(r, r, h, 32); g.translate(x, y, z); add(g, material); };
  function tube(points, radius, material) {
    const curve = new T.CatmullRomCurve3(points.map(p => new T.Vector3(...p)));
    add(new T.TubeGeometry(curve, points.length === 2 ? 1 : points.length * 8, radius, 12, false), material);
  }
  let seed = 104806;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const c = document.createElement('canvas'); c.width = c.height = 512; const ctx = c.getContext('2d');
  ctx.fillStyle = '#a7a698'; ctx.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 7500; i++) {
    ctx.fillStyle = i % 3 ? '#303b3333' : '#d9d1b744';
    ctx.beginPath(); ctx.ellipse(random() * 512, random() * 512, 1 + random() ** 3 * 25, 1 + random() ** 3 * 18, random() * 6, 0, Math.PI * 2); ctx.fill();
  }
  const texture = new T.CanvasTexture(c); texture.colorSpace = T.SRGBColorSpace; texture.wrapS = texture.wrapT = T.RepeatWrapping; texture.anisotropy = 16;
  const roof = new T.MeshStandardMaterial({ name: 'Mottled terrace concrete', color: '#c7c5b6', map: texture, bumpMap: texture, bumpScale: .012, roughness: .92 });
  const cap = roof.clone(); cap.name = 'Projecting weathered terrace coping'; cap.color.set('#777a70');
  const wall = m.wall.clone(); wall.name = 'Weathered terrace plaster'; wall.color.set('#f0efdf'); wall.bumpScale = .008;
  const steel = new T.MeshStandardMaterial({ color: '#373d38', metalness: .55, roughness: .62 });
  const sheet = new T.MeshStandardMaterial({ color: '#c9d4d0', metalness: .12, roughness: .82, side: T.DoubleSide });
  const white = new T.MeshStandardMaterial({ name: 'Terrace tanks and PVC pipework', color: '#e3e4dc', roughness: .64 });
  const black = new T.MeshStandardMaterial({ color: '#252b2b', roughness: .74 });
  const tile = new T.MeshStandardMaterial({ color: '#e1e1d8', roughness: .3, metalness: .03 });
  function floor(x, y, z, w, d, material = roof) {
    const g = new T.BoxGeometry(w, .12, d); g.translate(x, y - .06, z);
    const p = g.attributes.position, uv = g.attributes.uv;
    for (let i = 0; i < p.count; i++) uv.setXY(i, p.getX(i) / 5, p.getZ(i) / 5);
    add(g, material);
  }
  function step(x, y, z, w, d, base) {
    box(x, (base + y) / 2 - .06, z, w, y - base + .12, d, roof);
  }
  // Library wall, first-floor landing (Wall of Library 105821/105923/110011; 094920 at 3-25 s): two engraved black granite
  // plaques, each in a raised white plaster surround, and the two grey conduit runs above them. Sizes and spacing are
  // measured against the library door and the wall's perspective in 105821; the text is as cut on the stones.
  function libraryWall() {
    const face = 3.47, floorY = stairs.first;
    const sans = '"Century Gothic", Futura, "Trebuchet MS", Arial, sans-serif', serif = '"Bookman Old Style", Rockwell, Georgia, serif', arial = 'Arial, Helvetica, sans-serif';
    const westWing = (g, W, H) => {
      engraveLine(g, W, H, 'THIS BLOCK (WEST WING) INAUGURATED', .5, .108, .065, .946, '"Arial Narrow", Arial, sans-serif', 'bold');
      engraveLine(g, W, H, 'BY', .5, .219, .029, .052, sans);
      engraveLine(g, W, H, 'Prof . Y. C. SIMHADRI', .467, .334, .065, .693, '"Times New Roman", Times, serif');
      engraveLine(g, W, H, 'M.A., Ph.D (USA). D.Litt., L.L.D,', .474, .442, .037, .595, sans);
      engraveLine(g, W, H, 'M.S.W., B L(INDIA) D.Y.W. (LONDON)', .485, .504, .037, .69, sans);
      engraveLine(g, W, H, 'C.R.Y.W (GERMANY) L.I.E (JAPAN)', .493, .57, .037, .623, sans);
      engraveLine(g, W, H, 'HON\'BLE VICE-CHANCELLOR', .475, .652, .04, .532, sans);
      engraveLine(g, W, H, 'ANDHRA UNIVERSITY VISAKHAPATNAM', .472, .73, .04, .753, sans);
      engraveLine(g, W, H, 'ON', .5, .83, .037, .059, sans);
      // "25th" with the raised "th", cut as one line.
      const cap = .037 * H, size = cap / .72, y = .909 * H + cap / 2;
      g.textBaseline = 'alphabetic'; g.textAlign = 'left';
      const parts = [['WEDNESDAY., THE 25', size, 0], ['th', size * .55, -cap * .5], [' JUNE, 2008', size, 0]];
      const widths = parts.map(([t, s]) => { g.font = `${s}px ${sans}`; return g.measureText(t)?.width || 1; }), sx = .674 * W / widths.reduce((a, b) => a + b);
      let x = .472 * W - .674 * W / 2;
      parts.forEach(([t, s, dy], k) => { g.font = `${s}px ${sans}`; g.save(); g.translate(x, y + dy); g.scale(sx, 1); g.fillText(t, 0, 0); g.restore(); x += widths[k] * sx; });
      // Border line with concave notched corners.
      const i = .014 * W, r = .028 * W, x0 = i, y0 = i, x1 = W - i, y1 = H - i;
      g.lineWidth = .0028 * W; g.beginPath(); g.moveTo(x0 + r, y0); g.lineTo(x1 - r, y0); g.arc(x1, y0, r, Math.PI, Math.PI / 2, true);
      g.lineTo(x1, y1 - r); g.arc(x1, y1, r, -Math.PI / 2, Math.PI, true); g.lineTo(x0 + r, y1); g.arc(x0, y1, r, 0, -Math.PI / 2, true);
      g.lineTo(x0, y0 + r); g.arc(x0, y0, r, Math.PI / 2, 0, true); g.stroke();
    };
    const eastWing = (g, W, H) => {
      // Andhra University emblem: shield with scrolled shoulders, a spoked wheel in a ring, the founding year below.
      const s = .12 * H; g.save(); g.translate(.505 * W, .112 * H); g.scale(s, s); g.lineWidth = .022;
      g.beginPath(); g.moveTo(-.36, -.42); g.bezierCurveTo(-.48, .05, -.26, .4, 0, .5); g.bezierCurveTo(.26, .4, .48, .05, .36, -.42); g.quadraticCurveTo(0, -.3, -.36, -.42); g.stroke();
      for (const sx of [-1, 1]) { g.beginPath(); g.arc(sx * .42, -.4, .07, 0, Math.PI * 2); g.stroke(); g.beginPath(); g.arc(sx * .42, -.4, .03, 0, Math.PI * 2); g.stroke(); }
      for (const r of [.27, .21, .06]) { g.beginPath(); g.arc(0, -.04, r, 0, Math.PI * 2); g.stroke(); }
      for (let k = 0; k < 24; k++) { const a = k * Math.PI / 12; g.beginPath(); g.moveTo(Math.cos(a) * .07, -.04 + Math.sin(a) * .07); g.lineTo(Math.cos(a) * .2, -.04 + Math.sin(a) * .2); g.stroke(); }
      for (let k = 0; k < 40; k++) { const a = k * Math.PI / 20; g.fillRect(Math.cos(a) * .24 - .008, -.04 + Math.sin(a) * .24 - .008, .016, .016); } // lettering around the ring
      g.restore();
      g.font = `bold ${.1 * s}px ${serif}`; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('1926', .505 * W, .112 * H + .34 * s);
      for (const [t, cx, cy, cap, w, font, weight] of [
        ['ANDHRA UNIVERSITY', .505, .206, .0216, .47, serif, 'bold'], ['A.U. COLLEGE OF ENGINEERING (A)', .51, .249, .0216, .82, serif, 'bold'],
        ['Department of Instrument Technology', .505, .293, .0144, .52, arial], ['Inauguration of First Floor (East Wing)', .505, .321, .0144, .53, arial],
        ['By', .505, .358, .012, .034, arial], ['Sri GANTA SRINIVASA RAO', .506, .399, .0216, .62, serif, 'bold'],
        ['Hon\'ble Minister for HRD', .506, .435, .0134, .34, arial], ['Govt. of Andhra Pradesh', .506, .463, .0134, .34, arial],
        ['On 30th August, 2015', .507, .501, .0134, .29, arial], ['In the presence of', .505, .536, .012, .23, arial],
        ['Col. Prof. G.S.N. RAJU', .508, .572, .02, .43, serif, 'bold'], ['Vice-Chancellor, A.U.', .508, .607, .012, .27, arial],
        ['Prof. E.A. Narayana', .508, .641, .018, .37, serif, 'bold'], ['Rector, A.U.', .506, .673, .0106, .15, arial],
        ['Prof. Ch. V. Ramachandra Murthy', .51, .71, .019, .65, serif, 'bold'], ['Principal, AUCE (A)', .506, .741, .012, .26, arial],
        ['Prof. V. Uma Maheswara Rao', .508, .778, .019, .55, serif, 'bold'], ['Registrar, A.U.', .508, .808, .012, .19, arial],
        ['Prof. A. Bhujanga Rao', .508, .845, .018, .41, serif, 'bold'], ['Head, Instrument Technology', .508, .874, .012, .37, arial],
        ['Prof. K. Srinivasa Rao', .273, .918, .0144, .32, serif, 'bold'], ['Dean, Engineering Works', .274, .945, .012, .29, arial],
        ['Dr. M.G. Madhava Babu', .736, .918, .0144, .35, serif, 'bold'], ['University Engineer', .736, .945, .012, .23, arial],
      ]) engraveLine(g, W, H, t, cx, cy, cap, w, font, weight);
      // Inset border line with a scrolled flourish in each corner.
      const x0 = .055 * W, y0 = .036 * H, x1 = .956 * W, y1 = .975 * H;
      g.lineWidth = .0025 * W; g.strokeRect(x0, y0, x1 - x0, y1 - y0);
      for (const [cx, cy, dx, dy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) {
        g.save(); g.translate(cx + dx * .012 * W, cy + dy * .012 * W); g.scale(dx * W, dy * W); g.lineWidth = .002;
        for (const [ax, ay, r] of [[.035, .012, .012], [.012, .035, .012], [.065, .008, .007], [.008, .065, .007], [.022, .022, .01]]) { g.beginPath(); g.arc(ax, ay, r, 0, Math.PI * 1.6); g.stroke(); }
        g.beginPath(); g.moveTo(0, .1); g.quadraticCurveTo(0, 0, .1, 0); g.stroke();
        g.restore();
      }
    };
    for (const p of [
      { x: 1.51, y: floorY + 1.56, w: 1.03, h: .675, frame: [1.14, .80], engrave: westWing },
      { x: -1.02, y: floorY + 1.21, w: 1.04, h: 1.37, frame: [1.20, 1.50], engrave: eastWing, ink: '#b9c3b2' },
    ]) {
      const [fw, fh] = p.frame, sw = (fw - p.w) / 2, sh = (fh - p.h) / 2;
      for (const s of [-1, 1]) {
        add(rbox(sw, fh, .045, .008, p.x + s * (fw - sw) / 2, p.y, face - .0225), wall);
        add(rbox(fw - 2 * sw + .01, sh, .045, .008, p.x, p.y + s * (fh - sh) / 2, face - .0225), wall);
      }
      const slab = granitePlaque(p.w, p.h, p.engrave, { ink: p.ink }); slab.name = 'Library wall plaque';
      slab.position.set(p.x, p.y, face - .02); slab.rotation.y = Math.PI; slab.layers.enable(1); group.add(slab);
    }
    // Grey conduits on saddles: one at 2.32 m, one at 2.77 m, stepping onto the library partition's face at x = -1.35.
    const conduit = new T.MeshStandardMaterial({ name: 'Grey conduit pipes', color: '#8d918b', metalness: .45, roughness: .5 });
    for (const h of [2.32, 2.77]) {
      const y = floorY + h;
      for (const [a, b] of [[[-3.7, y, 3.40], [-1.40, y, 3.40]], [[-1.40, y, 3.40], [-1.30, y, 3.443]], [[-1.30, y, 3.443], [3.78, y, 3.443]]]) tube([a, b], .012, conduit);
      for (let x = -3.4; x < 3.7; x += .9) box(x, y, x < -1.35 ? 3.418 : 3.461, .03, .034, .018, conduit);
    }
  }
  function canopy(x, y, z, width, depth, slope = 0) {
    const starts = new Map([...batches].map(([material, gs]) => [material, gs.length]));
    // Continuous sheet beneath the raised ribs keeps the roof weather-tight.
    box(x, y, z, width, .045, depth, sheet);
    for (let dx = -width / 2; dx <= width / 2; dx += .22) box(x + dx, y + .025, z, .038, .04, depth, sheet);
    for (const dz of [-depth / 2 + .12, 0, depth / 2 - .12]) box(x, y - .11, z + dz, width, .16, .075, steel);
    for (const [material, gs] of batches) for (const g of gs.slice(starts.get(material) || 0)) {
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + (p.getZ(i) - z) * slope);
      g.computeVertexNormals();
    }
  }
  function cappedEdge(x, low, high, z, depth, stepOverlap = 0, cutDistance = 1.12, span = cutDistance) {
    const outside = Math.sign(x), crest = high + (high - low);
    const inner = x - outside, toe = inner + outside * span, thickness = .08;
    const endHeight = crest + (low - crest) * cutDistance / 1.12;
    const shape = new T.Shape();
    shape.moveTo(inner, low - thickness);
    shape.lineTo(toe, low - thickness);
    if (cutDistance < 1.12) shape.lineTo(toe, endHeight - thickness);
    shape.lineTo(inner, crest - thickness); shape.closePath();
    const face = new T.ExtrudeGeometry(shape, { depth, bevelEnabled: false });
    face.translate(0, 0, z - depth / 2); add(face, wall);
    // Straight high face toward the building; the capped slope falls toward the open roof.
    const capToe = toe + outside * .06;
    const capEndHeight = endHeight + (endHeight - crest) * .06 / span;
    const coping = new T.Shape();
    coping.moveTo(inner, crest - thickness); coping.lineTo(capToe, capEndHeight - thickness);
    coping.lineTo(capToe, capEndHeight); coping.lineTo(inner, crest); coping.closePath();
    const top = new T.ExtrudeGeometry(coping, { depth, bevelEnabled: false });
    top.translate(0, 0, z - depth / 2); add(top, cap);
    if (stepOverlap) {
      // Only the cap over the first tread projects into the stair opening.
      const end = inner + outside * .35, lipHeight = crest + (endHeight - crest) * .35 / span;
      const lip = new T.Shape();
      lip.moveTo(inner, crest - thickness); lip.lineTo(end, lipHeight - thickness);
      lip.lineTo(end, lipHeight); lip.lineTo(inner, crest); lip.closePath();
      const extension = new T.ExtrudeGeometry(lip, { depth: stepOverlap, bevelEnabled: false });
      extension.translate(0, 0, z + depth / 2); add(extension, cap);
    }
  }
  function grille(x, y, z, width, height, rotation = 0, open = true) {
    const gate = new T.Group(); gate.name = 'Terrace double grille gate'; gate.position.set(x, y, z); gate.rotation.y = rotation; group.add(gate);
    for (const side of [-1, 1]) {
      const leaf = new T.Group(); leaf.name = 'Terrace-facing open grille leaf'; leaf.position.x = side * width / 2; leaf.rotation.y = open ? side * Math.PI * .47 : 0; gate.add(leaf);
      const part = (x, y, w, h) => { const mesh = new T.Mesh(new T.BoxGeometry(w, h, .028), steel); mesh.position.set(x, y, 0); leaf.add(mesh); };
      const centre = -side * width / 4;
      for (const dx of [0, -side * width / 2]) part(dx, height / 2, .036, height);
      for (const yy of [0, height / 2, height]) part(centre, yy, width / 2, .035);
      for (let dx = .14; dx < width / 2; dx += .14) part(-side * dx, height / 2, .014, height);
      for (let yy = .18; yy < height; yy += .22) part(centre, yy, width / 2, .012);
      part(-side * (width / 2 - .1), 1.1, .12, .045);
      for (const yy of [.25, height - .25]) {
        const hinge = new T.Mesh(new T.CylinderGeometry(.027, .027, .10, 12), steel); hinge.position.set(0, yy, 0); leaf.add(hinge);
      }
    }
  }
  function tank(x, y, z, radius, height, material, plinth = true) {
    group.userData.tanks.push({ x, y, z, radius: radius + (plinth ? .28 : .02), top: y + (plinth ? .5 : .04) + height + .3 });
    if (plinth) cylinder(x, y + .25, z, radius + .28, .5, wall);
    const base = y + (plinth ? .5 : .04);
    cylinder(x, base + height / 2, z, radius, height, material);
    for (let yy = .16; yy < height; yy += .21) {
      const ring = new T.TorusGeometry(radius + .008, .018, 6, 40); ring.rotateX(Math.PI / 2); ring.translate(x, base + yy, z); add(ring, material);
    }
    const lid = new T.SphereGeometry(radius, 24, 12); lid.scale(1, .22, 1); lid.translate(x, base + height, z); add(lid, material);
    cylinder(x, base + height + .18, z, radius * .33, .1, material);
    tube([[x + radius, base + .15, z], [x + radius + .23, base + .15, z], [x + radius + .23, y + .08, z], [x + radius + .23, y + .08, z - 1.2]], .032, white);
  }
  function ac(x, y, z, rotation = 0) {
    const acGroup = new T.Group(); acGroup.name = 'Terrace condenser'; acGroup.position.set(x, y, z); acGroup.rotation.y = rotation; group.add(acGroup);
    const casing = new T.Mesh(new T.BoxGeometry(.98, .78, .4), white); casing.position.y = .49; acGroup.add(casing);
    const fan = new T.Mesh(new T.CircleGeometry(.29, 28), steel); fan.position.set(-.1, .49, .206); acGroup.add(fan);
    for (let i = -6; i <= 6; i++) {
      const bar = new T.Mesh(new T.BoxGeometry(.66, .012, .012), m.metal); bar.position.set(-.1, .49 + i * .045, .22); acGroup.add(bar);
    }
    for (const dx of [-.34, .34]) { const support = new T.Mesh(new T.BoxGeometry(.06, .12, .55), steel); support.position.set(dx, .06, 0); acGroup.add(support); }
  }
  // Front landings leave all three stair openings clear.
  // First-floor landing: dark grey-brown vitrified tiles, 60 cm, polished (094920, Wall of Library 105821).
  const landingTiles = new T.CanvasTexture((() => {
    const t = document.createElement('canvas'); t.width = t.height = 512; const g = t.getContext('2d'), cell = 64;
    for (let i = 0; i < 8; i++) for (let j = 0; j < 8; j++) { const v = random() * 10 - 5; g.fillStyle = `rgb(${100 + v},${90 + v},${78 + v})`; g.fillRect(i * cell, j * cell, cell, cell); }
    for (let k = 0; k < 2500; k++) { g.fillStyle = random() > .5 ? 'rgba(150,140,128,.08)' : 'rgba(30,26,22,.1)'; g.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3); }
    g.fillStyle = 'rgba(40,34,28,.35)'; for (let i = 0; i < 8; i++) { g.fillRect(i * cell, 0, 1.5, 512); g.fillRect(0, i * cell, 512, 1.5); }
    return t;
  })());
  landingTiles.colorSpace = T.SRGBColorSpace; landingTiles.wrapS = landingTiles.wrapT = T.RepeatWrapping; landingTiles.repeat.set(5 / 4.8, 5 / 4.8); landingTiles.anisotropy = 8;
  floor(0, stairs.first, 2.05, 7.6, 5.5, new T.MeshStandardMaterial({ name: 'First-floor landing tiles', map: landingTiles, roughness: .28, envMapIntensity: .5 }));
  floor(0, stairs.second, 2.05, 7.6, 5.5, tile);
  floor(0, stairs.top, 3.075, 7.6, 7.55, tile);
  // The exit opens onto the low apron. Turn along the wall before climbing east.
  for (let i = 0; i < 3; i++) step(3.99 + i * .38, stairs.top + (i + 1) * (levels.rightStrip - stairs.top) / 3, 2.37, .38, 1.76, stairs.top);
  // Library partition on the FRONT middle block, with the door near the west entrance.
  for (const [left, right] of [[-3.78, -3.12], [-1.98, 3.78]]) box((left + right) / 2, 5.95, 3.55, right - left, 3.81, .16, m.wall);
  box(-2.55, 7.24, 3.55, 1.14, 1.24, .16, m.wall);
  libraryWall();

  // The west/classroom roof is the lower open terrace.
  floor(-13.05, levels.leftStrip, 0, 16, 6.5);
  floor(-4.55, levels.leftStrip, -.9875, 1, 4.525);
  floor(-4.55, levels.leftStrip, 3.1625, 1, .175);
  floor(-3.93, stairs.second, 2.166667, .28, 1.8, tile);
  for (let i = 0; i < 3; i++) step(-4.225 - i * .33, stairs.second - i * (stairs.second - levels.leftStrip) / 3, 2.166667, .33, 1.8, levels.leftStrip);
  floor(-28, levels.leftWing, 0, 12, 30);
  for (let i = 0; i < 2; i++) step(-21.225 - i * .35, levels.leftStrip - (i + 1) * .5 / 3, 2.0375, .35, 2.425, levels.leftWing);
  floor(-21.875, levels.leftWing, 2.0375, .25, 2.425);
  // Align the cap front with the AC-facing pillar faces, without overlapping the posts.
  const leftPostX = -22.05, leftPostWidth = .60;
  const outerSpan = 1 + leftPostWidth / 2, innerSpan = 1 - leftPostWidth / 2;
  cappedEdge(leftPostX, levels.leftWing, levels.leftStrip, -1.2125, 4.075 - leftPostWidth, 0, .35, outerSpan);
  for (const [z, overlap] of [[-3.10, 0], [.675, .18]]) {
    cappedEdge(leftPostX, levels.leftWing, levels.leftStrip, z, leftPostWidth / 2, overlap, .35 * innerSpan / outerSpan, innerSpan);
  }
  // Close the front face beside the steps (owner screenshot, 2026-10-15): the corridor's front wall stops at the classroom
  // roof level west of x = -21.05, leaving a slot below the parapet through which the treads showed side-on.
  box(-21.4, 7.95, 3.175, .7, .5, .15, roof);
  // Square concrete posts frame the ramp ends and the adjacent stair opening (110452).
  for (const z of [-3.25, .825, 3.25]) box(leftPostX, levels.leftWing + .925, z, leftPostWidth, 1.85, leftPostWidth);
  for (const x of [-7, -10, -13, -16, -19]) box(x, levels.leftStrip + .9, 3.25, .52, 1.8, .64);
  grille(-3.79, stairs.second + .025, 2.166667, 2.02, 2.55, -Math.PI / 2);
  const cover = terraceCovers[1]; canopy(cover.x, cover.top - .04, cover.z, cover.width, cover.depth);
  for (const z of [-2.9, -.53, 3.0]) box(-6.34, 9.74, z, .06, 3.26, .06, steel);
  // Keep the enclosure on the roof, with clearance from the rear parapet and stairwell.
  box(-5.51, 9.91, -2.65, 2.18, 2.93, .16);
  for (const x of [-6.52, -4.5]) box(x, 9.91, -.925, .16, 2.93, 3.45);
  for (const z of [-2.2, -1.45, -.7, .05]) {
    box(-6.61, 10.94, z, .025, .18, .46, m.dark);
    for (let j = -2; j <= 2; j++) box(-6.63, 10.94, z + j * .08, .025, .18, .025, wall);
  }
  box(-5.51, (levels.leftStrip + stairs.second) / 2, -.925, 2.18, stairs.second - levels.leftStrip, 3.61);
  for (const x of [-6.31, -4.71]) box(x, 9.91, .80, .58, 2.93, .16);
  box(-5.51, 11.10, .80, 1.02, .55, .16);
  box(-5.51, 9.55, .83, .90, 2.15, .07, sheet);
  for (const dx of [-.48, .48]) box(-5.51 + dx, 9.55, .89, .045, 2.22, .05, white);
  box(-5.16, 9.50, .92, .035, .20, .04, steel);
  for (let i = 0; i < 33; i++) {
    const g = new T.BoxGeometry(.22, .095, .11); g.rotateY((random() - .5) * .18); g.translate(-7.5 + (i % 5) * .23, levels.leftStrip + .05 + Math.floor(i / 5) * .10, 2.8 + (i % 2) * .13); add(g, m.brick);
  }
  for (const x of [-9, -12.5, -16, -19.5]) box(x, levels.leftStrip + .68, -.9, .42, 1.36, .48);
  for (const z of [-10, -5, 0, 5, 10]) box(-25, levels.leftWing + .68, z, .42, 1.36, .48);
  tank(-17.1, levels.leftStrip, -2.1, .74, 1.85, black, false);
  tank(-19.2, levels.leftStrip, -2.1, .74, 1.85, black, false);
  tank(-23.45, levels.leftWing, 3.9, .49, 1.12, white, false);
  for (const z of [-8, -4]) ac(-33.30, levels.leftWing + .14, z, Math.PI / 2);
  for (const x of [-29.7, -26.2]) { ac(x, levels.leftWing + .14, -14.35); ac(x, levels.leftWing + .14, 14.35, Math.PI); }
  tube([[-5.3, 8.3, 3.1], [-13, 8.3, 3.1], [-21, 8.3, 3.1], [-22.3, 7.8, 3.1], [-22.3, 7.8, 14]], .027, white);

  // Opposite corridor on the second floor: blue doors, open balustrade bays, three steps.
  const y = 8.704;
  floor(13.415, y, 2.166667, 17.17, 2.17, tile);
  for (let i = 0; i < 3; i++) box(4.13 + i * .28, stairs.second + (i + 1) * .0867 / 2, 2.166667, .28, (i + 1) * .0867, 2.16, tile);
  box(13, 11.79, 2.166667, 18, .14, 2.25, m.wall);
  box(13, 10.21, 1.02, 18, 3.01, .15, m.wall);
  for (const x of [6.4, 10.6, 14.8, 19]) {
    box(x, y + 1.14, 1.115, 1.03, 2.28, .07, m.blue);
    for (const dx of [-.54, .54]) box(x + dx, y + 1.15, 1.15, .045, 2.35, .06, steel);
    box(x - .38, y + 1.02, 1.18, .03, .20, .05, m.metal);
    box(x, y + 2.78, 1.12, .63, .29, .06, m.brick);
    for (let j = -2; j <= 2; j++) box(x + j * .11, y + 2.78, 1.16, .065, .14, .015, steel);
    box(x, 11.62, 2.17, 1.08, .03, .07, white);
  }
  box(13, 9.09, 3.25, 18, .78, .20, m.wall);
  // Close the facade between storeys: first-floor wall top (8.0) to the parapet (8.70), and the
  // lintel (11.84) to the roof parapet (12.56). Both were open bands showing the slab and interior.
  box(13, 8.35, 3.25, 18, .70, .32, m.wall);
  box(13, 12.2, 3.35, 18, .72, .20, m.wall); // facade line (3.25) out past the roof slab edge (3.425); clear of the corner stair treads
  box(13, 11.55, 3.25, 18, .58, .22, m.wall);
  for (let x = 4.2; x <= 22; x += 2.96) box(x, 10.25, 3.25, .34, 2.02, .24, m.wall);
  // Guard rail: polished steel that catches the sky (the shared 'metal' is a dull painted finish for grilles).
  const railSteel = new T.MeshStandardMaterial({ name: 'Polished steel guard rail', color: '#d4d8da', metalness: .95, roughness: .22, envMapIntensity: 1.3 });
  tube([[4.2, 9.72, 3.22], [21.8, 9.72, 3.22]], .034, railSteel);
  for (let x = 4.6; x < 22; x += .74) tube([[x, 9.49, 3.22], [x, 9.72, 3.22]], .019, railSteel);

  // Single upper stair and three-window landing sit under the metal-sheet headhouse.
  for (const side of [-1, 1]) box(side * 3.96, (stairs.top + 15.54) / 2, -2.8, .16, 15.54 - stairs.top, 8.2, m.wall);
  for (const x of [-2.31, 2.31]) box(x, 13.835, 1.40, 3.38, 3.45, .18, m.wall);
  box(0, 15.06, 1.40, 1.24, 1, .18, m.wall);
  for (const x of [-4.05, 4.05]) for (const z of [-6.85, 1.32]) box(x, 14.05, z, .10, 3, .32, m.blue);
  const topCover = terraceCovers[0]; canopy(topCover.x, topCover.top - .04, topCover.z, topCover.width, topCover.depth, .018);
  const blueDoor = new T.Group(); blueDoor.name = 'Open blue roof-access door'; blueDoor.position.set(.61, stairs.top, 1.51); blueDoor.rotation.y = -Math.PI * .48; group.add(blueDoor);
  const panel = new T.Mesh(new T.BoxGeometry(1.18, 2.45, .06), m.blue); panel.position.set(-.59, 1.225, 0); blueDoor.add(panel);
  const handle = new T.Mesh(new T.BoxGeometry(.03, .2, .06), m.metal); handle.position.set(-1.04, 1.13, -.06); blueDoor.add(handle);
  // Beyond the corner steps, the raised terrace meets the enclosure wall directly.
  floor(13.02, levels.rightStrip, -.88, 17.96, 4.74);
  floor(13.47, levels.rightStrip, 2.37, 17.06, 1.76);
  floor(26.5, levels.rightWing, 0, 9, 33);
  for (let i = 0; i < 2; i++) step(22.175 + i * .35, levels.rightStrip - (i + 1) * (levels.rightStrip - levels.rightWing) / 3, 2.0375, .35, 2.425, levels.rightWing);
  cappedEdge(23, levels.rightWing, levels.rightStrip, -1.2125, 4.075, 0, .35);
  tank(11, levels.rightStrip, -1.35, .82, 2.15, white);
  tank(15, levels.rightStrip, -1.35, .82, 2.15, white);
  const ring = new T.Shape(); ring.absarc(0, 0, 1.1, 0, Math.PI * 2, false);
  const hole = new T.Path(); hole.absarc(0, 0, .86, 0, Math.PI * 2, true); ring.holes.push(hole);
  const emptyBase = new T.ExtrudeGeometry(ring, { depth: .5, bevelEnabled: false, curveSegments: 32 });
  emptyBase.rotateX(-Math.PI / 2); emptyBase.translate(18.5, levels.rightStrip, -1.35); add(emptyBase, wall);
  tank(27.5, levels.rightWing, -9.8, .8, 1.65, black);
  const fallen = new T.Mesh(new T.CylinderGeometry(.83, .83, 1.5, 32), black); fallen.name = 'Disused tank on its side'; fallen.rotation.z = Math.PI / 2; fallen.position.set(29.2, levels.rightWing + .84, 11.3); group.add(fallen);
  for (const z of [-2.9, -2.75, -2.6]) tube([[4.08, levels.rightStrip + .13, z], [5, levels.rightStrip + .13, z], [21.5, levels.rightStrip + .13, z], [21.85, levels.rightStrip + .34, z], [22.1, levels.rightStrip + .28, z], [23.25, levels.rightWing + .13, z], [23.25, levels.rightWing + .13, -15.9], [30, levels.rightWing + .13, -15.9]], .028, white);
  tube([[23.6, levels.rightWing + .07, -10], [27, levels.rightWing + .07, -3], [25, levels.rightWing + .07, 4], [29, levels.rightWing + .07, 8], [27, levels.rightWing + .07, 12]], .034, m.blue);
  const water = new T.MeshPhysicalMaterial({ color: '#53635c', transparent: true, opacity: .32, roughness: .14, metalness: .22, depthWrite: false });
  for (const [x, z, rx, rz] of [[27, -6, 2.7, 4], [26, 8, 2.4, 3.8], [-29, 6, 2.8, 3.1]]) {
    const puddle = new T.Mesh(new T.CircleGeometry(1, 32), water); puddle.rotation.x = -Math.PI / 2; puddle.scale.set(rx, rz, 1); puddle.position.set(x, (x < 0 ? levels.leftWing : levels.rightWing) + .01, z); group.add(puddle);
  }
  for (const [material, gs] of batches) {
    const mesh = new T.Mesh(mergeGeometries(gs), material); mesh.castShadow = mesh.receiveShadow = true; mesh.layers.enable(1); group.add(mesh); gs.forEach(g => g.dispose());
  }
  return group;
}
