import * as T from 'three';
import { environmentObstacles } from './blender-environment.js';
import { MeshBVH, acceleratedRaycast } from 'three-mesh-bvh';

// Ground lookups through bounds trees: rays tested against every terrain triangle cost ~2.4 s of the load (2026-11-01
// profile); the hits are the same. Indirect trees leave the geometry untouched, and they are dropped again after the
// lookups, so a later edit to these meshes never meets a stale tree (the walk builds its own, avatar.js).
function bounded(meshes) {
  const made = [], raycasts = meshes.map(m => m.raycast);
  for (const m of meshes) { if (!m.geometry.boundsTree) { m.geometry.boundsTree = new MeshBVH(m.geometry, { indirect: true }); made.push(m.geometry); } m.raycast = acceleratedRaycast; }
  return () => { meshes.forEach((m, i) => { m.raycast = raycasts[i]; }); for (const g of made) delete g.boundsTree; };
}

// Video-guided surroundings (WhatsApp references 2026-10-12, frame-based review).
// Observed: dark asphalt drive, red laterite earth, dense tree cover around the site, a hazy hill
// ridge beyond the gate, sparse red blooms on green shrubs, and a low brick plinth with a concrete
// cap directly behind the right-hand kerb (facing the entrance). Sizes and distances are estimates.

const rng = seed => () => ((seed = (seed + 0x6D2B79F5) | 0, seed = Math.imul(seed ^ (seed >>> 15), seed | 1), seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61), ((seed ^ (seed >>> 14)) >>> 0) / 4294967296));

function tuneMaterials(landscape) {
  const tint = { 'Draft asphalt aggregate': '#6c6e72', 'Concrete kerb': '#bdb8ae', 'Exposed red earth': '#f0a27a', 'Papery pink bracts': '#cf2a62', 'Rose bract variation': '#b01f50' }; // magenta-pink, as photographed 2026-10-13
  for (const m of landscape.materials) {
    const name = (m.userData.source_material || m.name).replace(/^Web - /, '').replace(/\.\d+$/, '');
    if (tint[name]) m.color.set(tint[name]);
  }
}

// One-off orthographic capture of a real Blender tree: two crossed cards cost ~4 vertices per tree.
function captureImpostor(renderer, tree) {
  const box = new T.Box3().setFromObject(tree), size = box.getSize(new T.Vector3()), centre = box.getCenter(new T.Vector3());
  const width = Math.max(size.x, size.z), height = size.y;
  const target = new T.WebGLRenderTarget(512, Math.round(512 * Math.min(2, height / width)), { samples: 4 });
  target.texture.colorSpace = T.LinearSRGBColorSpace;
  const stage = new T.Scene();
  const copy = tree.clone(true);
  copy.matrixAutoUpdate = false; copy.matrix.copy(tree.matrixWorld);
  stage.add(copy, new T.AmbientLight('#ffffff', Math.PI));
  const camera = new T.OrthographicCamera(-width / 2, width / 2, height / 2, -height / 2, .1, width * 4);
  camera.position.set(centre.x, centre.y, centre.z + width * 2); camera.lookAt(centre);
  const clear = renderer.getClearColor(new T.Color()), alpha = renderer.getClearAlpha(), previous = renderer.getRenderTarget(), shadows = renderer.shadowMap.enabled;
  renderer.shadowMap.enabled = false;
  renderer.setClearColor('#3c4a2c', 0); // leaf-coloured transparent border, so mip levels do not darken edges
  renderer.setRenderTarget(target); renderer.clear(); renderer.render(stage, camera);
  renderer.setRenderTarget(previous); renderer.setClearColor(clear, alpha); renderer.shadowMap.enabled = shadows;
  target.texture.generateMipmaps = true; target.texture.minFilter = T.LinearMipmapLinearFilter;
  return { texture: target.texture, width, height, baseOffset: centre.y - height / 2 - box.min.y };
}

function crossedCards(width, height) {
  // Four front-facing cards (two crossed pairs, back to back): DoubleSide would flip the up-normal on back faces and turn them black.
  const cards = [0, 1, 2, 3].map(k => new T.PlaneGeometry(width, height).rotateY(k * Math.PI / 2));
  const g = new T.BufferGeometry();
  for (const key of ['position', 'uv']) g.setAttribute(key, new T.Float32BufferAttribute(cards.flatMap(c => [...c.attributes[key].array]), key === 'uv' ? 2 : 3));
  g.setIndex(cards.flatMap((c, k) => [...c.index.array].map(i => i + k * 4)));
  g.setAttribute('normal', new T.Float32BufferAttribute(Array.from({ length: 48 }, (_, i) => i % 3 === 1 ? 1 : 0), 3)); // light like a canopy top
  return g.translate(0, height / 2, 0);
}

function treeBelt(scene, landscape, renderer, views) {
  const named = re => { const out = []; landscape.group.traverse(o => { if (o.isMesh && re.test(o.userData.sourceObject || '')) out.push(o); }); return out; };
  const terrain = named(/Editable verges|Entrance concrete apron|Lower side courtyard|Distant ground continuation/);
  const hard = named(/Road|driveway|edge paint|kerb|paving|apron/i);
  const blocked = environmentObstacles(scene).map(b => b.clone().expandByScalar(4));
  const existing = landscape.trees.map(t => new T.Box3().setFromObject(t).getCenter(new T.Vector3()));
  const variants = landscape.trees.filter(t => { let trimmed = false; t.traverse(o => { trimmed ||= !!o.userData.trimmedTriangles; }); return !trimmed; })
    .filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 4)) === 0).slice(0, 4).map(t => captureImpostor(renderer, t));
  const random = rng(1928), down = new T.Vector3(0, -1, 0), ray = new T.Raycaster(), p = new T.Vector3();
  const spots = variants.map(() => []), release = bounded([...terrain, ...hard]);
  for (let i = 0; i < 900 && spots.flat().length < 260; i++) {
    const angle = random() * Math.PI * 2, radius = 42 + Math.sqrt(random()) * 130;
    p.set(Math.sin(angle) * radius, 30, Math.cos(angle) * radius);
    if (views.some(([eye, look]) => new T.Line3(eye, look).closestPointToPoint(new T.Vector3(p.x, eye.y, p.z), true, new T.Vector3()).distanceTo(new T.Vector3(p.x, eye.y, p.z)) < 16)) continue; // keep chapter sightlines open
    if (blocked.some(b => b.containsPoint(new T.Vector3(p.x, 0, p.z))) || existing.some(e => Math.hypot(e.x - p.x, e.z - p.z) < 7)) continue;
    ray.set(p, down);
    const hits = ray.intersectObjects([...terrain, ...hard], false);
    if (hits[0] && hard.includes(hits[0].object)) continue; // never on a road, kerb or paving
    const y = hits[0] ? hits[0].point.y : -2.2;
    if (spots.flat().some(s => Math.hypot(s.x - p.x, s.z - p.z) < 4.6)) continue;
    spots[Math.floor(random() * variants.length)].push({ x: p.x, y, z: p.z, s: .75 + random() * .55, r: random() * Math.PI });
  }
  release();
  const group = new T.Group(); group.name = 'Distant tree belt (impostors)';
  const m = new T.Matrix4(), q = new T.Quaternion(), up = new T.Vector3(0, 1, 0);
  variants.forEach((v, k) => {
    const material = new T.MeshStandardMaterial({ map: v.texture, alphaTest: .42, alphaToCoverage: true, roughness: .95, metalness: 0, color: '#8f9a80' }); // captured albedo lacks canopy self-shadowing
    const mesh = new T.InstancedMesh(crossedCards(v.width, v.height), material, spots[k].length);
    spots[k].forEach((s, i) => mesh.setMatrixAt(i, m.compose(new T.Vector3(s.x, s.y - .15, s.z), q.setFromAxisAngle(up, s.r), new T.Vector3(s.s, s.s, s.s))));
    mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
    group.add(mesh);
  });
  scene.add(group);
  return { group, count: spots.flat().length };
}

// Hazy ridge seen over the gate (outward, +Z). GIS bearing of +Z is roughly NNW; shape is illustrative.
function hillRidge(scene) {
  const segments = 160, radius = 430, position = [], color = [], index = [];
  const near = new T.Color('#5f6f68'), far = new T.Color('#9aaab0');
  for (let i = 0; i <= segments; i++) {
    const a = -Math.PI * .62 + (i / segments) * Math.PI * 1.24; // only the arc that faces the gate side
    const fade = Math.cos(a * .8) ** 2;
    const h = (14 + 9 * Math.sin(a * 5.3 + 1.1) + 5 * Math.sin(a * 11.7 + .4) + 3 * Math.sin(a * 23.1)) * fade;
    const x = Math.sin(a) * radius, z = Math.cos(a) * radius;
    position.push(x, -4, z, x, Math.max(0, h), z);
    color.push(...near.toArray(), ...far.toArray());
    if (i < segments) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.Float32BufferAttribute(position, 3));
  g.setAttribute('color', new T.Float32BufferAttribute(color, 3));
  g.setIndex(index);
  const material = new T.MeshBasicMaterial({ vertexColors: true, fog: false, side: T.DoubleSide, depthWrite: false });
  const ridge = new T.Mesh(g, material);
  ridge.name = 'Distant hill ridge (approximate)'; ridge.renderOrder = -1; ridge.frustumCulled = false;
  scene.add(ridge);
  return ridge;
}

// Low brick edging just behind the east kerb, in front of the flowering bush (photos 2026-10-13: uncapped brickwork,
// knee-low, about two metres long). Height and length are estimates against the 0.14 m kerb.
function kerbPlinth(landscape) {
  const kerb = []; landscape.group.traverse(o => { if (o.isMesh && /East driveway kerb/.test(o.userData.sourceObject || '')) kerb.push(o); });
  const ground = []; landscape.group.traverse(o => { if (o.isMesh && /Editable verges/.test(o.userData.sourceObject || '')) ground.push(o); });
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  const edge = z => { for (let x = 9; x > 1; x -= .02) { ray.set(new T.Vector3(x, 5, z), down); if (ray.intersectObjects(kerb, false).length) return x; } return null; };
  const z = 20.5, a = edge(z - 1), b = edge(z + 1), c = edge(z);
  if (a == null || b == null || c == null) return null;
  const length = 2.0, depth = .34, height = .3;
  const x = c + .25 + depth / 2;
  ray.set(new T.Vector3(x, 5, z), down);
  const y = ray.intersectObjects(ground, false)[0]?.point.y ?? 0;
  const map = brickTexture(); map.repeat.set(length / .9, height / .45);
  const plinth = new T.Mesh(new T.BoxGeometry(depth, height + .06, length), new T.MeshStandardMaterial({ name: 'Edging brick', map, roughness: .95 }));
  plinth.name = 'Low brick edging behind east kerb (photo-guided)';
  plinth.position.set(x, y + height / 2 - .03, z); plinth.rotation.y = Math.atan2(b - a, 2);
  plinth.castShadow = plinth.receiveShadow = true;
  landscape.group.add(plinth);
  return plinth;
}

// Sparse blooms: the photographed bushes are mostly green leaves with scattered magenta flowers, not solid colour.
function thinBlooms(landscape) {
  landscape.group.traverse(o => {
    if (!o.isMesh || !o.geometry.index) return;
    const name = o.material.userData?.source_material || o.material.name;
    if (/Small ivory flower centres/.test(name)) { o.visible = false; return; } // sub-centimetre centres; invisible at viewing range
    if (!/Papery pink bracts|Rose bract variation/.test(name)) return;
    const index = o.geometry.index.array, n = o.geometry.attributes.position.count, parent = Int32Array.from({ length: n }, (_, i) => i);
    const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
    for (let t = 0; t < index.length; t += 3) { const r = find(index[t]); parent[find(index[t + 1])] = r; parent[find(index[t + 2])] = r; }
    const order = new Map(), kept = [];
    for (let t = 0; t < index.length; t += 3) { const r = find(index[t]); if (!order.has(r)) order.set(r, order.size); if (order.get(r) % 3 === 0) kept.push(index[t], index[t + 1], index[t + 2]); }
    o.geometry = o.geometry.clone(); o.geometry.setIndex(kept);
  });
}

// Low sheds among the trees on the left (photo 2026-10-13, looking out from the porch): single-storey, pale walls,
// dark doorways, low pitched roofs. Footprints and positions are estimates; skipped if they would touch a road.
function leftSheds(scene, landscape) {
  const hard = []; landscape.group.traverse(o => { if (o.isMesh && /Road|driveway|edge paint|kerb|paving|apron/i.test(o.userData.sourceObject || '')) hard.push(o); });
  const terrain = []; landscape.group.traverse(o => { if (o.isMesh && /Editable verges/.test(o.userData.sourceObject || '')) terrain.push(o); });
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0), group = new T.Group(); group.name = 'Left-side sheds among trees (photo-guided)';
  const grime = document.createElement('canvas'); grime.width = 256; grime.height = 128; const gg = grime.getContext('2d');
  gg.fillStyle = '#cfc5b1'; gg.fillRect(0, 0, 256, 128);
  const fade = gg.createLinearGradient(0, 128, 0, 70); fade.addColorStop(0, '#8a6a52cc'); fade.addColorStop(1, '#8a6a5200'); gg.fillStyle = fade; gg.fillRect(0, 70, 256, 58); // splash-back from red earth
  for (let i = 0; i < 260; i++) { gg.fillStyle = `rgba(90,84,70,${.03 + (i % 7) * .012})`; gg.fillRect((i * 83) % 256, (i * 41) % 70, 2 + i % 9, 6 + i % 23); } // rain streaks
  const grimeMap = new T.CanvasTexture(grime); grimeMap.colorSpace = T.SRGBColorSpace;
  const wall = new T.MeshStandardMaterial({ name: 'Shed lime-washed walls', map: grimeMap, roughness: .95 });
  const roof = new T.MeshStandardMaterial({ name: 'Shed weathered roof sheets', color: '#5f605c', roughness: .85, metalness: .1, side: T.DoubleSide });
  const doorway = new T.MeshStandardMaterial({ name: 'Shed doorways', color: '#2a2724', roughness: 1 });
  const release = bounded([...hard, ...terrain]);
  for (const [x, z, w, d, turn] of [[-27, 31, 9, 4.6, .1], [-37.5, 27.5, 7, 4.2, -.05]]) {
    const corners = [[-w / 2, -d / 2], [w / 2, -d / 2], [-w / 2, d / 2], [w / 2, d / 2], [0, 0]].map(([dx, dz]) => [x + dx * Math.cos(turn) + dz * Math.sin(turn), z - dx * Math.sin(turn) + dz * Math.cos(turn)]);
    let blocked = false, low = Infinity;
    for (const [cx, cz] of corners) { ray.set(new T.Vector3(cx, 30, cz), down); const hit = ray.intersectObjects([...hard, ...terrain], false)[0]; if (hit && hard.includes(hit.object)) blocked = true; low = Math.min(low, hit ? hit.point.y : -2.2); }
    if (blocked) continue;
    const shed = new T.Group(); shed.position.set(x, low - .05, z); shed.rotation.y = turn;
    const body = new T.Mesh(new T.BoxGeometry(w, 2.7, d), wall); body.position.y = 1.35;
    const ridge = 3.45, roofGeo = new T.BufferGeometry();
    const hw = w / 2 + .35, hd = d / 2 + .45;
    roofGeo.setAttribute('position', new T.Float32BufferAttribute([-hw, 2.65, -hd, hw, 2.65, -hd, hw, ridge, 0, -hw, 2.65, -hd, hw, ridge, 0, -hw, ridge, 0, -hw, ridge, 0, hw, ridge, 0, hw, 2.65, hd, -hw, ridge, 0, hw, 2.65, hd, -hw, 2.65, hd], 3));
    roofGeo.computeVertexNormals();
    const top = new T.Mesh(roofGeo, roof);
    shed.add(body, top);
    for (const side of [-1, 1]) for (const dx of [-w / 3, 0, w / 3]) { // doorways and small windows on both long sides
      const door = new T.Mesh(new T.PlaneGeometry(.95, 2.05), doorway); door.position.set(dx, 1.03, side * (d / 2 + .005)); door.rotation.y = side < 0 ? Math.PI : 0; shed.add(door);
      const win = new T.Mesh(new T.PlaneGeometry(.6, .5), doorway); win.position.set(dx + w / 6, 1.9, side * (d / 2 + .005)); win.rotation.y = door.rotation.y; if (Math.abs(dx + w / 6) < w / 2 - .4) shed.add(win);
    }
    shed.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
    group.add(shed);
  }
  release();
  scene.add(group);
  return group;
}

export function buildSurroundings(scene, landscape, renderer, views = []) {
  tuneMaterials(landscape);
  const belt = treeBelt(scene, landscape, renderer, views.map(([e, l]) => [new T.Vector3(...e).setY(0), new T.Vector3(...l).setY(0)]));
  const ridge = hillRidge(scene);
  const plinth = kerbPlinth(landscape);
  thinBlooms(landscape);
  const sheds = leftSheds(scene, landscape);
  const haze = new T.Color(), dark = new T.Color('#4c5a55');
  return {
    belt, ridge, plinth, sheds,
    // Follow the fog so the ridge darkens with dusk/rain instead of glowing at night.
    update(fogColor) { haze.copy(fogColor).lerp(dark, .35); ridge.material.color.copy(haze).multiplyScalar(1.55); },
  };
}

// Facade trees from the 2026-10-12 videos (12.38.21 at 2.5-4.5 s; 12.38.14 at 6-8.5 s): the forked tree left of the
// porch stands about one bay out and right beside the wall, a slender one further left, and a multi-stem tree right
// of the porch behind the parked bikes. Distances from the wall (~1.6 m) are estimates. Runs before foliage
// trimming, so canopies are still cut back from the building.
const ENTRANCE_DOOR_Z = 7.06; // plane of the entrance's wooden doors and glazing
const PLANTER = { width: 1.7, depth: 1.7, height: .5, cap: .08, hole: .4, soil: .4 };
const PLANTER_TRUNK = [-.1, 0]; // trunk offset from the planter centre (towards the porch), from the photos
const SHRUB_BOX = { width: 1.4, depth: 1.4, height: .38, cap: .07, hole: .5, soil: .3 }; // square, low; size estimated from the kerb beside it
const facadeTrees = [
  // Owner, 2026-10-15: back in the corner beside the porch, with its edged bed.
  { source: 'Forked tree beside main entrance', base: [-8.4, 4.9], bed: true },
  { source: 'Slender tree beside left facade', base: [-17.6, 5.0] },
  // Right of the porch: rises from a raised square brick planter with a cracked concrete cap (photos 2026-10-13).
  // The owner confirmed (2026-10-15) that the planter's centre line is in line with the entrance's wooden doors.
  { source: 'Forked tree beside main entrance', base: [7.2 + PLANTER_TRUNK[0], ENTRANCE_DOOR_Z + PLANTER_TRUNK[1]], clone: 'Multi-stem tree right of entrance (video-guided)', turn: Math.PI * .85, planter: true },
];

// Square (owner, 2026-10-15); about 1.7 m a side, estimated against the scooters parked beside it.
const brickTexture = () => {
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const g = c.getContext('2d');
  g.fillStyle = '#b9ab95'; g.fillRect(0, 0, 256, 128); // mortar
  for (let row = 0; row < 8; row++) for (let col = -1; col < 5; col++) {
    const x = col * 64 + (row % 2) * 32 + 2, y = row * 16 + 2, shade = 120 + ((row * 7 + col * 13) % 5) * 9;
    g.fillStyle = `rgb(${shade + 40},${shade - 38},${shade - 62})`; g.fillRect(x, y, 60, 12);
  }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 8; return t;
};
// Raised square planter: brick sides under a concrete cap with a round opening and cracks (no debris).
function raisedPlanter(x, y, z, soilMaterial, dims = PLANTER, trunk = PLANTER_TRUNK, name = 'Raised brick planter (right facade tree)') {
  const { width, depth, height, cap, hole } = dims, group = new T.Group(); group.name = name;
  const brickMap = brickTexture(); brickMap.repeat.set(width / .9, height / .45);
  const brick = new T.MeshStandardMaterial({ name: 'Planter brick', map: brickMap, roughness: .95 });
  const capC = document.createElement('canvas'); capC.width = capC.height = 256; const g = capC.getContext('2d');
  g.fillStyle = '#a9a69c'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 900; i++) { g.fillStyle = i % 2 ? '#7f7d7433' : '#c8c5bb33'; g.fillRect((i * 97) % 256, (i * 57) % 256, 3, 3); }
  g.strokeStyle = '#4c4a44'; g.lineWidth = 2; g.beginPath(); g.moveTo(0, 70); g.lineTo(60, 92); g.lineTo(96, 88); g.moveTo(256, 150); g.lineTo(205, 168); g.lineTo(190, 210); g.lineTo(200, 256); g.stroke();
  const capMap = new T.CanvasTexture(capC); capMap.colorSpace = T.SRGBColorSpace;
  const concrete = new T.MeshStandardMaterial({ name: 'Planter concrete cap', map: capMap, roughness: .9 });
  const wall = new T.Mesh(new T.BoxGeometry(width - .06, height - cap + .08, depth - .06), brick);
  wall.position.y = (height - cap) / 2 - .04;
  const shape = new T.Shape(); shape.moveTo(-width / 2, -depth / 2); shape.lineTo(width / 2, -depth / 2); shape.lineTo(width / 2, depth / 2); shape.lineTo(-width / 2, depth / 2); shape.closePath();
  const [tx, tz] = trunk, opening = new T.Path(); opening.absarc(tx, -tz, hole, 0, Math.PI * 2, true); shape.holes.push(opening); // shape y becomes -z
  const top = new T.ExtrudeGeometry(shape, { depth: cap, bevelEnabled: true, bevelSize: .012, bevelThickness: .012, bevelSegments: 1, curveSegments: 28 });
  top.rotateX(-Math.PI / 2); top.translate(0, height - cap, 0);
  const uv = top.attributes.uv, pos = top.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, pos.getX(i) / width + .5, pos.getZ(i) / depth + .5);
  const capMesh = new T.Mesh(top, concrete);
  const fill = new T.Mesh(new T.CircleGeometry(hole + .01, 28), soilMaterial); fill.rotation.x = -Math.PI / 2; fill.position.set(tx, height - .07, tz);
  group.add(wall, capMesh, fill);
  group.traverse(o => { if (o.isMesh) o.castShadow = o.receiveShadow = true; });
  group.position.set(x - tx, y, z - tz);
  return group;
}

export function placeFacadeTrees(group) {
  group.updateMatrixWorld(true);
  const owner = o => { while (o && !o.userData.source_object) o = o.parent; return o?.userData.source_object || ''; };
  const ground = []; group.traverse(o => { if (o.isMesh && /Editable verges|Entrance concrete apron|Entrance driveway/.test(owner(o))) ground.push(o); });
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  const height = (x, z) => { ray.set(new T.Vector3(x, 20, z), down); return ray.intersectObjects(ground, false)[0]?.point.y ?? 0; };
  const root = tree => { // trunk base: centroid of the lowest vertices
    const p = new T.Vector3(), low = []; let min = Infinity;
    tree.traverse(o => { if (!o.isMesh) return; const a = o.geometry.attributes.position; for (let i = 0; i < a.count; i += 3) { p.fromBufferAttribute(a, i).applyMatrix4(o.matrixWorld); if (p.y < min + .4) { low.push(p.clone()); min = Math.min(min, p.y); } } });
    const base = low.filter(v => v.y < min + .4); return base.reduce((s, v) => s.add(v), new T.Vector3()).divideScalar(base.length);
  };
  const find = name => { let hit; group.traverse(o => { if (!hit && o.userData.tree && o.userData.source_object === name) hit = o; }); return hit; };
  const soil = []; group.traverse(o => { if (o.isMesh && /Exposed red earth/.test(o.material.userData?.source_material || o.material.name)) soil.push(o.material); });
  const moved = [];
  for (const spec of facadeTrees) {
    let tree = find(spec.source); if (!tree) continue;
    const from = root(tree);
    if (spec.clone) {
      tree = tree.clone(true); tree.userData = { ...tree.userData, source_object: spec.clone };
      tree.traverse(o => { if (o !== tree) o.userData = { ...o.userData }; });
      group.add(tree);
    }
    const ground0 = height(...spec.base);
    const to = new T.Vector3(spec.base[0], ground0 + (spec.planter ? PLANTER.soil : -.04), spec.base[1]); // in the planter's soil, or sunk slightly into the bed
    const shift = new T.Matrix4().makeTranslation(to.x, to.y, to.z).multiply(new T.Matrix4().makeRotationY(spec.turn || 0)).multiply(new T.Matrix4().makeScale(spec.scale || 1, spec.scale || 1, spec.scale || 1)).multiply(new T.Matrix4().makeTranslation(-from.x, -from.y, -from.z));
    const apply = o => { o.updateMatrixWorld(true); const world = shift.clone().multiply(o.matrixWorld); o.parent.updateMatrixWorld(true); o.matrix.copy(o.parent.matrixWorld.clone().invert().multiply(world)); o.matrix.decompose(o.position, o.quaternion, o.scale); };
    apply(tree);
    if (spec.bed) for (const o of group.children.filter(o => /^Low entrance tree-bed edging/.test(o.userData.source_object || ''))) apply(o);
    if (spec.planter) group.add(raisedPlanter(to.x, ground0, to.z, soil[0]));
    else if (soil[0]) { // bare earth around each trunk, as filmed, instead of paving under the root flare
      const earth = soil[0].clone(); earth.polygonOffset = true; earth.polygonOffsetFactor = earth.polygonOffsetUnits = -2; // no shimmer against paving
      const patch = new T.Mesh(new T.CircleGeometry(1.15, 28), earth); patch.rotation.x = -Math.PI / 2;
      patch.position.set(to.x, to.y + .06, to.z); patch.receiveShadow = true; patch.name = 'Earth around facade tree'; group.add(patch);
    }
    moved.push({ name: tree.userData.source_object, from: from.toArray().map(v => +v.toFixed(2)), to: to.toArray().map(v => +v.toFixed(2)) });
  }
  // The large pink-flowering shrub beside the east kerb grows from a raised brick box like the right tree's (owner,
  // 2026-10-15; photo from the drive looking east). Lift its foliage, stems and bracts onto the box's soil.
  const shrub = group.children.filter(o => /^(Pink flowering shrub|Supporting shrub stems|Pink bloom clusters) 01\b/.test(o.userData.source_object || ''));
  if (shrub.length) {
    const box = new T.Box3(); shrub.forEach(o => box.expandByObject(o)); const c = box.getCenter(new T.Vector3()), y0 = height(c.x, c.z);
    for (const o of shrub) { o.position.y += SHRUB_BOX.soil; o.updateMatrix(); }
    group.add(raisedPlanter(c.x, y0, c.z, soil[0], SHRUB_BOX, [0, 0], 'Raised brick box (pink flowering shrub)'));
    moved.push({ name: 'Pink flowering shrub 01', raised: SHRUB_BOX.soil, box: [+c.x.toFixed(2), +c.z.toFixed(2)] });
  }
  // Right bank toward the gate (owner's photo 2026-10-15, looking east from the porch): the planting continues along the
  // kerb past the pink shrubs. Copies of the exported shrubs; positions are estimates from that photo.
  const copyPlant = (number, x, z, turn, scale = 1) => {
    const parts = group.children.filter(o => new RegExp(`^(Pink flowering shrub|Bright green understory|Supporting shrub stems|Pink bloom clusters) ${number}\\b`).test(o.userData.source_object || ''));
    if (!parts.length) return;
    const box = new T.Box3(); parts.forEach(o => box.expandByObject(o)); const c = box.getCenter(new T.Vector3());
    const from = new T.Vector3(c.x, height(c.x, c.z), c.z), to = new T.Vector3(x, height(x, z) - .03, z);
    const shift = new T.Matrix4().makeTranslation(to.x, to.y, to.z).multiply(new T.Matrix4().makeRotationY(turn)).multiply(new T.Matrix4().makeScale(scale, scale, scale)).multiply(new T.Matrix4().makeTranslation(-from.x, -from.y, -from.z));
    for (const o of parts) {
      const copy = o.clone(); copy.userData = { ...o.userData, source_object: `${o.userData.source_object} (bank copy ${x},${z})` };
      o.updateMatrixWorld(true); copy.matrix.copy(group.matrixWorld.clone().invert().multiply(shift).multiply(o.matrixWorld)); copy.matrix.decompose(copy.position, copy.quaternion, copy.scale);
      group.add(copy);
    }
    moved.push({ name: `shrub copy ${number}`, to: [x, z] });
  };
  for (const [number, x, z, turn, scale] of [['03', 4.9, 25.4, 1.1, 1.1], ['01', 5.4, 27.6, 2.3, .85], ['04', 4.7, 30.0, .4, 1.15], ['03', 5.1, 32.6, 2.9, .95]]) copyPlant(number, x, z, turn, scale);
  // Beside the right porch pier: a small concrete-edged earth bed with a sapling (photos 2026-10-13 and 2026-10-15).
  if (soil[0]) {
    const bed = new T.Group(); bed.name = 'Sapling bed beside right porch pier';
    const kerb = new T.MeshStandardMaterial({ name: 'Bed concrete edging', color: '#a9a69c', roughness: .9 });
    const corners = [[5.15, 8.7], [6.55, 8.7], [6.75, 10.6], [5.15, 10.6]], y0 = height(5.9, 9.6);
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4], length = Math.hypot(bx - ax, bz - az);
      const edge = new T.Mesh(new T.BoxGeometry(length + .1, .14, .1), kerb);
      edge.position.set((ax + bx) / 2, y0 + .05, (az + bz) / 2); edge.rotation.y = -Math.atan2(bz - az, bx - ax); bed.add(edge);
    }
    const fill = new T.Shape(corners.map(([x, z]) => new T.Vector2(x, -z)));
    const earth = new T.Mesh(new T.ShapeGeometry(fill), soil[0]); earth.rotation.x = -Math.PI / 2; earth.position.y = y0 + .05; bed.add(earth);
    bed.traverse(o => { if (o.isMesh) o.receiveShadow = o.castShadow = true; }); group.add(bed);
    copyPlant('05', 5.9, 9.7, .7, 1.1);
  }
  group.updateMatrixWorld(true);
  group.userData.facadeTrees = moved;
  return moved;
}
