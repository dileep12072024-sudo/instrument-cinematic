import * as T from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { applyWind } from './weather-effects.js';

// Positions interpreted from the Left / Central / Right photographic survey.
// Coordinates remain approximate until measured site dimensions are available.
export const referenceTrees = [
  { x: -8, z: 8.8, h: 13, lean: [-1.3, .4], spread: 5.8 },
  { x: 7.2, z: 9.5, h: 12.5, lean: [1.1, .2], spread: 5.2 },
  { x: -18, z: 8, h: 12, lean: [.8, .2], spread: 5 },
  { x: -18, z: 24, h: 15, lean: [1.6, -.3], spread: 7 },
  { x: -10, z: 30, h: 13, lean: [2.1, .2], spread: 5.8 },
  { x: 10, z: 25, h: 15, lean: [-1.3, .7], spread: 7.2 },
  { x: 18, z: 30, h: 15.5, lean: [-1.7, -.3], spread: 6.5 },
  // Side trees stay clear of the wing corners; their crowns can still shade the walls.
  { x: -38.5, z: 4, h: 16, lean: [1.1, .5], spread: 5.8 },
  { x: 38.5, z: 4, h: 16, lean: [-1.1, .2], spread: 5.8 },
];

function barkTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const x = c.getContext('2d'); x.fillStyle = '#797469'; x.fillRect(0, 0, 256, 512);
  for (let i = 0; i < 340; i++) {
    const px = (i * 47.31) % 256;
    x.strokeStyle = i % 3 ? '#504b4260' : '#c0b8a04a'; x.lineWidth = .5 + i % 3;
    x.beginPath(); x.moveTo(px, 0);
    for (let y = 0; y <= 512; y += 12) x.lineTo(px + Math.sin(y * .04 + i) * 2.8, y);
    x.stroke();
  }
  const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping; map.repeat.set(2, 3); return map;
}

function leafGeometry() {
  const positions = [], uvs = [], indices = [];
  for (let i = 0; i <= 4; i++) {
    const t = i / 4, w = Math.pow(Math.sin(t * Math.PI), .85) * .23;
    for (const side of [-1, 0, 1]) {
      positions.push(side * w, t, Math.sin(t * Math.PI) * .09 - Math.abs(side) * .035);
      uvs.push((side + 1) / 2, t);
    }
  }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) {
    const a = i * 3 + j; indices.push(a, a + 3, a + 1, a + 1, a + 3, a + 4);
  }
  const geo = new T.BufferGeometry(); geo.setAttribute('position', new T.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new T.Float32BufferAttribute(uvs, 2)); geo.setIndex(indices); geo.computeVertexNormals(); return geo;
}

export function buildReferenceGarden(group, groundHeight, wind, windStrength, windDirection) {
  let seed = 731;
  const random = () => ((seed = (1664525 * seed + 1013904223) >>> 0) / 4294967296);
  const dummy = new T.Object3D(), branches = [], leaves = [], blossoms = [];
  const bark = barkTexture();
  const barkMat = new T.MeshStandardMaterial({ color: '#b5a995', map: bark, bumpMap: bark, bumpScale: .055, roughness: .95 });
  function branch(a, b, radius, bend = .15) {
    const mid = a.clone().lerp(b, .5).add(new T.Vector3(bend, 0, -bend * .35));
    const curve = new T.CatmullRomCurve3([a, mid, b]);
    const segments = radius < .02 ? 2 : 6, radial = radius < .02 ? 3 : 7;
    const geo = new T.TubeGeometry(curve, segments, radius, radial, false);
    const pos = geo.attributes.position;
    for (let ring = 0; ring <= segments; ring++) {
      const center = curve.getPointAt(ring / segments), taper = 1 - ring / segments * .72;
      for (let j = 0; j <= radial; j++) {
        const k = ring * (radial + 1) + j;
        pos.setXYZ(k, center.x + (pos.getX(k) - center.x) * taper, center.y + (pos.getY(k) - center.y) * taper, center.z + (pos.getZ(k) - center.z) * taper);
      }
    }
    geo.computeVertexNormals(); branches.push(geo); return curve;
  }
  function leaf(position, size, tint = 0) {
    leaves.push({ position, size, rotation: [random() * 2.4 - 1.2, random() * Math.PI * 2, random() * Math.PI * 2], tint });
  }
  for (const tree of referenceTrees) {
    const { x, z, h, lean, spread } = tree, floor = groundHeight(z);
    const base = new T.Vector3(x, floor, z), fork = new T.Vector3(x + lean[0] * .35, floor + h * .28, z + lean[1] * .35);
    branch(base, fork, h * .031, .2);
    for (let root = 0; root < 5; root++) {
      const angle = root * Math.PI * .4;
      branch(base.clone().add(new T.Vector3(0, .22, 0)), base.clone().add(new T.Vector3(Math.cos(angle) * .9, .025, Math.sin(angle) * .9)), .12, .08);
    }
    const limbs = 4 + Math.round(random());
    for (let limb = 0; limb < limbs; limb++) {
      const angle = limb * Math.PI * 2 / limbs + random() * 1.2;
      const tip = new T.Vector3(x + lean[0] + Math.cos(angle) * spread * .52, floor + h * (.68 + random() * .13), z + lean[1] + Math.sin(angle) * spread * .52);
      const origin = base.clone().lerp(fork, .72 + random() * .28);
      const limbCurve = branch(origin, tip, h * (.012 + random() * .006), (random() - .5) * 1.6);
      for (let twig = 0; twig < 10; twig++) {
        const a = angle + (random() - .5) * 2.6;
        const attachment = limbCurve.getPoint(.35 + random() * .65);
        const end = attachment.clone().add(new T.Vector3(Math.cos(a) * spread * (.2 + random() * .4), (.04 + random() * .15) * h, Math.sin(a) * spread * (.2 + random() * .4)));
        const twigCurve = branch(attachment, end, .03 + random() * .03, .25);
        for (let spray = 0; spray < 7; spray++) {
          const start = twigCurve.getPoint(.25 + spray / 10);
          const direction = new T.Vector3(Math.cos(a + spray * 2.4), (random() - .4) * .65, Math.sin(a + spray * 2.4));
          const finish = start.clone().addScaledVector(direction, .65 + random() * .65);
          const frond = branch(start, finish, .009, .07);
          // Paired leaves grow along connected twigs, rather than floating in cubical clusters.
          for (let pair = 1; pair <= 5; pair++) for (const side of [-1, 1]) {
            const position = frond.getPoint(pair / 6);
            const size = (.25 + random() * .13) * (1 - pair * .05);
            leaves.push({ position, size, rotation: [Math.PI * .36 + random() * .3, -a - spray * 2.4, side * (.7 + random() * .3)], tint: 0 });
          }
          leaf(finish, .24);
        }
      }
    }
  }
  const brick = new T.MeshStandardMaterial({ color: '#966e58', roughness: 1, map: bark });
  const coping = new T.MeshStandardMaterial({ color: '#929080', roughness: .95 });
  function box(w, h, d, x, y, z, material, name) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), material); mesh.position.set(x, y, z); mesh.name = name;
    mesh.castShadow = mesh.receiveShadow = true; group.add(mesh); return mesh;
  }
  for (const [x, z, width] of [[7.2, 9.5, 2.0], [-8, 8.8, 2.25]]) {
    const floor = groundHeight(z);
    for (let side = 0; side < 4; side++) for (let row = 0; row < 3; row++) for (let b = 0; b < 5; b++) {
      if (side === 0 && b === 2 || side === 3 && row === 2 && b > 2) continue;
      const offset = -width / 2 + b * width / 5 + (row % 2) * .08;
      const px = x + (side < 2 ? offset : (side === 2 ? -1 : 1) * width / 2);
      const pz = z + (side >= 2 ? offset : (side === 0 ? -1 : 1) * width / 2);
      const block = box(side < 2 ? .37 : .2, .11, side < 2 ? .2 : .37, px + (random() - .5) * .045, floor + .055 + row * .115, pz, brick, 'Broken square tree surround');
      block.rotation.y = (random() - .5) * .13;
    }
    const fallen = box(.42, .1, .24, x - .3, floor + .05, z + width / 2 + .3, coping, 'Displaced coping fragment'); fallen.rotation.set(.12, .45, -.16);
  }
  for (const [x, z, radius, flowers] of [[6.4, 19, 1.7, true], [9, 26, 1.2, false], [-5.7, 28, 1.3, false]]) {
    const floor = groundHeight(z);
    for (let i = 0; i < 24; i++) {
      const a = i * Math.PI / 12;
      const block = box(.43, .32, .22, x + Math.cos(a) * radius, floor + .16, z + Math.sin(a) * radius, brick, 'Weathered brick planting bed'); block.rotation.y = -a + Math.PI / 2;
    }
    for (let stem = 0; stem < 18; stem++) {
      const base = new T.Vector3(x + (random() - .5) * radius, floor + .2, z + (random() - .5) * radius);
      const end = base.clone().add(new T.Vector3((random() - .5) * 2.5, 1 + random() * 1.7, (random() - .5) * 2.5));
      branch(base, end, .027, .16);
      for (let l = 0; l < 80; l++) leaf(base.clone().lerp(end, .3 + random() * .7).add(new T.Vector3((random() - .5) * .7, (random() - .5) * .35, (random() - .5) * .7)), .18 + random() * .2, 1);
      if (flowers && stem % 2 === 0) for (let petal = 0; petal < 8; petal++) blossoms.push(end.clone().add(new T.Vector3((random() - .5) * .18, random() * .15, (random() - .5) * .18)));
    }
  }
  const trunks = new T.Mesh(mergeGeometries(branches), barkMat); trunks.name = 'Reference forked trunks and shrub stems'; trunks.castShadow = trunks.receiveShadow = true; group.add(trunks); branches.forEach(g => g.dispose());
  const leafMat = new T.MeshStandardMaterial({ color: '#aebf87', side: T.DoubleSide, roughness: .58 });
  applyWind(leafMat, wind, windStrength, windDirection);
  applyWind(barkMat, wind, windStrength, windDirection);
  trunks.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking });
  applyWind(trunks.customDepthMaterial, wind, windStrength, windDirection);
  const foliage = new T.InstancedMesh(leafGeometry(), leafMat, leaves.length); foliage.name = 'Individual curved foliage';
  leaves.forEach(({ position, size, rotation, tint }, i) => {
    dummy.position.copy(position); dummy.rotation.set(...rotation); dummy.scale.set(size * (tint ? 1.4 : 1), size, size); dummy.updateMatrix(); foliage.setMatrixAt(i, dummy.matrix);
    foliage.setColorAt(i, new T.Color().setHSL(.22 + random() * .065, .32 + random() * .22, .27 + random() * .21));
  });
  foliage.receiveShadow = true; group.add(foliage);
  const flowerMat = new T.MeshStandardMaterial({ color: '#e9609a', side: T.DoubleSide, roughness: .7 });
  applyWind(flowerMat, wind, windStrength, windDirection);
  const flowers = new T.InstancedMesh(new T.CircleGeometry(.06, 5), flowerMat, blossoms.length); flowers.name = 'Pink flower clusters';
  blossoms.forEach((p, i) => { dummy.position.copy(p); dummy.rotation.set(random() * 3, random() * 6, random() * 6); dummy.scale.setScalar(1); dummy.updateMatrix(); flowers.setMatrixAt(i, dummy.matrix); }); group.add(flowers);
  const groundLeaves = new T.InstancedMesh(leafGeometry(), leafMat, 9000); groundLeaves.name = 'Patchy verge groundcover';
  for (let i = 0; i < groundLeaves.count; i++) {
    let x, z;
    do { x = (random() - .5) * 78; z = 11 + random() * 24; } while (Math.abs(x) < 3.4 || Math.abs(x) > 22 && z < 19 || (Math.abs(x) > 11 && z < 22 && random() > .13));
    const patch = Math.sin(x * .9) * Math.cos(z * 1.2);
    dummy.position.set(x, groundHeight(z) + .018, z); dummy.rotation.set(random() * 1.1, random() * 6.28, (random() - .5) * 1.6);
    dummy.scale.setScalar(.06 + random() * (patch > 0 ? .22 : .08)); dummy.updateMatrix(); groundLeaves.setMatrixAt(i, dummy.matrix);
    groundLeaves.setColorAt(i, new T.Color().setHSL(.2 + random() * .12, .3 + random() * .25, .4 + random() * .18));
  }
  group.add(groundLeaves);
  // The gateway is separate from the cantilevered entrance canopy.
  for (const side of [-1, 1]) {
    const x = side * 3.4, z = 34, floor = groundHeight(z);
    box(.62, 2.65, .65, x, floor + 1.325, z, coping, 'Campus gateway pier');
    box(.76, .12, .79, x, floor + 2.71, z, coping, 'Gateway cap');
    for (let bar = 0; bar <= 8; bar++) box(.022, 2, .022, x + side * .35, floor + 1.1, z - bar * .28, brick, 'Open gateway bar');
    for (const y of [.15, 1, 2.05]) box(.045, .045, 2.24, x + side * .35, floor + y, z - 1.12, brick, 'Open gateway rail');
  }
  return { trees: referenceTrees, foliage, groundLeaves };
}
