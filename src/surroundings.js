import * as T from 'three';
import { environmentObstacles } from './blender-environment.js';

// Video-guided surroundings (WhatsApp references 2026-10-12, frame-based review).
// Observed: dark asphalt drive, red laterite earth, dense tree cover around the site, a hazy hill
// ridge beyond the gate, sparse red blooms on green shrubs, and a low brick plinth with a concrete
// cap directly behind the right-hand kerb (facing the entrance). Sizes and distances are estimates.

const rng = seed => () => ((seed = (seed + 0x6D2B79F5) | 0, seed = Math.imul(seed ^ (seed >>> 15), seed | 1), seed ^= seed + Math.imul(seed ^ (seed >>> 7), seed | 61), ((seed ^ (seed >>> 14)) >>> 0) / 4294967296));

function tuneMaterials(landscape) {
  const tint = { 'Draft asphalt aggregate': '#6c6e72', 'Concrete kerb': '#bdb8ae', 'Exposed red earth': '#f0a27a', 'Papery pink bracts': '#ff4a3a', 'Rose bract variation': '#e8392e' };
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
  const terrain = named(/Editable verges|Entrance concrete apron|Lower side courtyard/);
  const hard = named(/Road|driveway|edge paint|kerb|paving|apron/i);
  const blocked = environmentObstacles(scene).map(b => b.clone().expandByScalar(4));
  const existing = landscape.trees.map(t => new T.Box3().setFromObject(t).getCenter(new T.Vector3()));
  const variants = landscape.trees.filter(t => { let trimmed = false; t.traverse(o => { trimmed ||= !!o.userData.trimmedTriangles; }); return !trimmed; })
    .filter((_, i, all) => i % Math.max(1, Math.floor(all.length / 4)) === 0).slice(0, 4).map(t => captureImpostor(renderer, t));
  const random = rng(1928), down = new T.Vector3(0, -1, 0), ray = new T.Raycaster(), p = new T.Vector3();
  const spots = variants.map(() => []);
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

// Low brick plinth with concrete cap, directly behind the east kerb near the flowering shrubs.
function kerbPlinth(landscape) {
  const kerb = []; landscape.group.traverse(o => { if (o.isMesh && /East driveway kerb/.test(o.userData.sourceObject || '')) kerb.push(o); });
  const ground = []; landscape.group.traverse(o => { if (o.isMesh && /Editable verges/.test(o.userData.sourceObject || '')) ground.push(o); });
  const ray = new T.Raycaster(), down = new T.Vector3(0, -1, 0);
  const edge = z => { for (let x = 9; x > 1; x -= .02) { ray.set(new T.Vector3(x, 5, z), down); if (ray.intersectObjects(kerb, false).length) return x; } return null; };
  const z = 20.5, a = edge(z - 1), b = edge(z + 1), c = edge(z);
  if (a == null || b == null || c == null) return null;
  const length = 1.4, depth = .9, height = .38; // estimated against the 0.14 m kerb in the footage
  const x = c + .2 + depth / 2;
  ray.set(new T.Vector3(x, 5, z), down);
  const y = ray.intersectObjects(ground, false)[0]?.point.y ?? 0;
  const plinth = new T.Group(); plinth.name = 'Low brick plinth behind east kerb (provisional)';
  const brick = new T.Mesh(new T.BoxGeometry(depth, height, length), new T.MeshStandardMaterial({ color: '#8f4f3a', roughness: .92 }));
  brick.position.y = height / 2 - .06; // sunk slightly so it sits in sloping ground
  const cap = new T.Mesh(new T.BoxGeometry(depth + .08, .07, length + .08), new T.MeshStandardMaterial({ color: '#8e8b83', roughness: .9 }));
  cap.position.y = height - .06 + .035;
  plinth.add(brick, cap);
  plinth.position.set(x, y, z); plinth.rotation.y = Math.atan2(b - a, 2);
  plinth.traverse(o => { if (o.isMesh) { o.castShadow = o.receiveShadow = true; } });
  landscape.group.add(plinth);
  return plinth;
}

export function buildSurroundings(scene, landscape, renderer, views = []) {
  tuneMaterials(landscape);
  const belt = treeBelt(scene, landscape, renderer, views.map(([e, l]) => [new T.Vector3(...e).setY(0), new T.Vector3(...l).setY(0)]));
  const ridge = hillRidge(scene);
  const plinth = kerbPlinth(landscape);
  const haze = new T.Color(), dark = new T.Color('#4c5a55');
  return {
    belt, ridge, plinth,
    // Follow the fog so the ridge darkens with dusk/rain instead of glowing at night.
    update(fogColor) { haze.copy(fogColor).lerp(dark, .35); ridge.material.color.copy(haze).multiplyScalar(1.55); },
  };
}

// Facade trees from the 2026-10-12 videos (12.38.21 at 2.5-4.5 s; 12.38.14 at 6-8.5 s): the forked tree left of the
// porch stands about one bay out and right beside the wall, a slender one further left, and a multi-stem tree right
// of the porch behind the parked bikes. Distances from the wall (~1.6 m) are estimates. Runs before foliage
// trimming, so canopies are still cut back from the building.
const facadeTrees = [
  { source: 'Forked tree beside main entrance', base: [-8.4, 4.9], bed: true },
  { source: 'Slender tree beside left facade', base: [-17.6, 5.0] },
  { source: 'Forked tree beside main entrance', base: [9.0, 4.9], clone: 'Multi-stem tree right of entrance (video-guided)', turn: Math.PI * .85 },
];

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
    const to = new T.Vector3(spec.base[0], height(...spec.base) - .04, spec.base[1]); // sink slightly into the bed
    const shift = new T.Matrix4().makeTranslation(to.x, to.y, to.z).multiply(new T.Matrix4().makeRotationY(spec.turn || 0)).multiply(new T.Matrix4().makeTranslation(-from.x, -from.y, -from.z));
    const apply = o => { o.updateMatrixWorld(true); const world = shift.clone().multiply(o.matrixWorld); o.parent.updateMatrixWorld(true); o.matrix.copy(o.parent.matrixWorld.clone().invert().multiply(world)); o.matrix.decompose(o.position, o.quaternion, o.scale); };
    apply(tree);
    if (spec.bed) for (const o of group.children.filter(o => /^Low entrance tree-bed edging/.test(o.userData.source_object || ''))) apply(o);
    if (soil[0]) { // bare earth around each trunk, as filmed, instead of paving under the root flare
      const patch = new T.Mesh(new T.CircleGeometry(1.15, 28), soil[0]); patch.rotation.x = -Math.PI / 2;
      patch.position.set(to.x, to.y + .045, to.z); patch.receiveShadow = true; patch.name = 'Earth around facade tree'; group.add(patch);
    }
    moved.push({ name: tree.userData.source_object, from: from.toArray().map(v => +v.toFixed(2)), to: to.toArray().map(v => +v.toFixed(2)) });
  }
  group.updateMatrixWorld(true);
  group.userData.facadeTrees = moved;
  return moved;
}
