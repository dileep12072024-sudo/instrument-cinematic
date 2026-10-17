import * as T from 'three';
import { footprint } from './footprint.js';

// Seasonal canopies for Visakhapatnam's climate (owner, 2026-10-15): trees are not the same all year. The jacaranda is
// dry-season deciduous, thinning from January and barest in March before the monsoon; the evergreen broadleaves only
// thin lightly in the hot dry months. Fraction of leaf cards shed, by month (0 = January). Estimates, not observations.
const SHED = {
  jacaranda: [.25, .5, .6, .35, .1, .03, .03, .03, .03, .03, .08, .15],
  island: [.1, .18, .25, .25, .15, .02, .02, .02, .02, .02, .05, .08],
};
export function campusMonth(now = new Date()) {
  const forced = Number(new URLSearchParams(globalThis.location?.search || '').get('month')); // ?month=3 to preview March
  if (forced >= 1 && forced <= 12) return forced - 1;
  return Number(new Intl.DateTimeFormat('en-IN', { timeZone: 'Asia/Kolkata', month: 'numeric' }).format(now)) - 1;
}
export function shedFraction(materialName, month) {
  const species = /jacaranda/i.test(materialName) ? 'jacaranda' : /island_tree/i.test(materialName) ? 'island' : null;
  return species ? SHED[species][month] : 0;
}

// Drop whole leaf cards (connected triangles), chosen by a stable hash so the same leaves stay on between visits.
export function thinFoliage(geometry, shed) {
  if (!(shed > 0) || !geometry.index) return 0;
  const index = geometry.index.array, n = geometry.attributes.position.count, parent = Int32Array.from({ length: n }, (_, i) => i);
  const find = i => { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; };
  for (let t = 0; t < index.length; t += 3) { const r = find(index[t]); parent[find(index[t + 1])] = r; parent[find(index[t + 2])] = r; }
  const kept = [], hash = r => { const s = Math.sin(r * 12.9898 + 78.233) * 43758.5453; return s - Math.floor(s); };
  for (let t = 0; t < index.length; t += 3) if (hash(find(index[t])) >= shed) kept.push(index[t], index[t + 1], index[t + 2]);
  const dropped = (index.length - kept.length) / 3; geometry.setIndex(kept);
  return dropped;
}

// Fallen leaves under each crown: one instanced draw. More in the shedding season; some litter all year (photos show
// leaves on the concrete and earth in October). They stir in place when the gusting wind is strong.
export function leafLitter(scene, trees, heightAt, wind, month) {
  const sheet = document.createElement('canvas'); sheet.width = 512; sheet.height = 128; const g = sheet.getContext('2d');
  // Four dry leaves (pointed, with midrib and side veins, mottled, edges darker where they curl), one per atlas column.
  const tones = [['#8a5a2b', '#5e3b1b'], ['#b08243', '#7a5428'], ['#76703a', '#4f4a22'], ['#c09553', '#87622f']];
  tones.forEach(([light, dark], k) => {
    g.save(); g.translate(k * 128 + 64, 64); g.rotate(.45 + k * .2);
    const leaf = new Path2D(); leaf.moveTo(-54, 0); leaf.bezierCurveTo(-30, -26, 22, -24, 54, 0); leaf.bezierCurveTo(22, 22, -30, 26, -54, 0);
    const fill = g.createRadialGradient(-6, -4, 4, 0, 0, 56); fill.addColorStop(0, light); fill.addColorStop(1, dark);
    g.fillStyle = fill; g.fill(leaf);
    g.save(); g.clip(leaf);
    for (let i = 0; i < 70; i++) { g.fillStyle = i % 2 ? '#00000014' : '#ffffff10'; g.beginPath(); g.arc(((i * 37) % 108) - 54, ((i * 23) % 44) - 22, 1 + (i % 4), 0, Math.PI * 2); g.fill(); }
    g.lineWidth = 6; g.strokeStyle = '#0000002a'; g.stroke(leaf); g.restore();
    g.strokeStyle = '#2a1a0c77'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(-58, 1); g.lineTo(50, 0); g.stroke();
    g.lineWidth = .9; for (let v = -36; v < 40; v += 12) for (const side of [-1, 1]) { g.beginPath(); g.moveTo(v, 0); g.quadraticCurveTo(v + 8, side * 9, v + 13, side * 16); g.stroke(); }
    g.restore();
  });
  const map = new T.CanvasTexture(sheet); map.colorSpace = T.SRGBColorSpace;
  const geometry = new T.PlaneGeometry(.12, .12); geometry.rotateX(-Math.PI / 2);
  const material = new T.MeshLambertMaterial({ name: 'Fallen leaves', map, alphaTest: .5, side: T.DoubleSide });
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uWind: wind.time, uWindStrength: wind.strength, uWindDirection: wind.direction });
    shader.vertexShader = 'attribute float leafVariant; uniform float uWind; uniform float uWindStrength; uniform vec2 uWindDirection;\n' + shader.vertexShader
      .replace('#include <uv_vertex>', '#include <uv_vertex>\nvMapUv = vec2((uv.x + leafVariant) * .25, uv.y);')
      .replace('#include <project_vertex>', `
        vec4 leafWorld = modelMatrix * instanceMatrix * vec4(transformed, 1.0);
        float phase = instanceMatrix[3].x * 3.1 + instanceMatrix[3].z * 1.7;
        float gust = max(0.0, uWindStrength - .35);
        leafWorld.xz += uWindDirection * gust * .22 * (.6 + .4 * sin(uWind * 2.3 + phase));
        leafWorld.y += gust * .03 * max(0.0, sin(uWind * 3.7 + phase * 2.0));
        vec4 mvPosition = viewMatrix * leafWorld;
        gl_Position = projectionMatrix * mvPosition;`);
  };
  const shed = trees.map(t => {
    let leafName = ''; t.traverse(o => { if (o.isMesh && /leaves/i.test(o.material?.name || '')) leafName = o.material.name; });
    return shedFraction(leafName, month);
  });
  const spots = [], dummy = new T.Object3D(), box = new T.Box3(), centre = new T.Vector3(), size = new T.Vector3();
  let seed = 7; const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const inBuilding = (x, z) => footprint.some(p => Math.abs(x - p.x) < p.width / 2 + .1 && Math.abs(z - p.z) < p.depth / 2 + .1);
  trees.forEach((tree, k) => {
    box.setFromObject(tree); box.getCenter(centre); box.getSize(size);
    const radius = Math.max(1.5, Math.min(6, Math.max(size.x, size.z) / 2)), count = Math.round(70 + 900 * shed[k]);
    for (let i = 0; i < count; i++) {
      const a = random() * Math.PI * 2, r = radius * Math.sqrt(random()), x = centre.x + Math.cos(a) * r, z = centre.z + Math.sin(a) * r;
      const y = heightAt(x, z); if (y == null || inBuilding(x, z)) continue;
      spots.push([x, y + .012, z, random() * Math.PI * 2, .7 + random() * .7, Math.floor(random() * 4)]);
    }
  });
  const mesh = new T.InstancedMesh(geometry, material, Math.max(1, spots.length));
  const variants = new Float32Array(spots.length);
  spots.forEach(([x, y, z, turn, scale, v], i) => {
    dummy.position.set(x, y, z); dummy.rotation.set(0, turn, 0); dummy.scale.set(scale, 1, scale * (.6 + (i % 5) * .1)); dummy.updateMatrix();
    mesh.setMatrixAt(i, dummy.matrix); variants[i] = v;
  });
  geometry.setAttribute('leafVariant', new T.InstancedBufferAttribute(variants, 1));
  mesh.count = spots.length; mesh.name = 'Fallen leaves (seasonal)'; mesh.receiveShadow = true; mesh.frustumCulled = false;
  scene.add(mesh);
  return mesh;
}
