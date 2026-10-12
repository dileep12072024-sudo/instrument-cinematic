import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { footprint } from './footprint.js';
import { terraceCovers, terraceLevels } from './stair-layout.js';

export function environmentObstacles(scene) {
  const tops = { west: terraceLevels.leftWing + 1.6, 'low-corridor': terraceLevels.leftStrip + 1.6, corridor: terraceLevels.rightStrip + 1.6, room: terraceLevels.rightWing + 1.6, tower: 14 };
  const boxes = footprint.map(p => new T.Box3(new T.Vector3(p.x - p.width / 2 - .2, -.3, p.z - p.depth / 2 - .2), new T.Vector3(p.x + p.width / 2 + .2, tops[p.type], p.z + p.depth / 2 + .2)));
  for (const p of terraceCovers) boxes.push(new T.Box3(new T.Vector3(p.x - p.width / 2, terraceLevels.leftStrip, p.z - p.depth / 2), new T.Vector3(p.x + p.width / 2, p.top, p.z + p.depth / 2)));
  for (const t of scene.getObjectByName('Reference terraces and roof stair enclosure')?.userData.tanks || []) boxes.push(new T.Box3(new T.Vector3(t.x - t.radius, t.y, t.z - t.radius), new T.Vector3(t.x + t.radius, t.top, t.z + t.radius)));
  return boxes;
}

export const modelWindReach = height => 1.5 * Math.max(.035, (height / 12) ** 2) + .053;

export function clearModelVegetation(mesh, obstacles, height) {
  const reach = modelWindReach(height);
  mesh.geometry.computeBoundingBox();
  const bounds = mesh.geometry.boundingBox.clone().applyMatrix4(mesh.matrixWorld).expandByVector(new T.Vector3(reach, .03, reach));
  const nearby = obstacles.filter(box => box.intersectsBox(bounds));
  if (!nearby.length) return 0;
  const geometry = mesh.geometry, position = geometry.attributes.position, index = geometry.index;
  const world = new Float32Array(position.count * 3), point = new T.Vector3();
  for (let i = 0; i < position.count; i++) point.fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).toArray(world, i * 3);
  const kept = [], count = index ? index.count : position.count;
  const triangle = new T.Box3(), margin = new T.Vector3(reach, .03, reach);
  for (let i = 0; i < count; i += 3) {
    triangle.makeEmpty();
    for (let k = 0; k < 3; k++) triangle.expandByPoint(point.fromArray(world, (index ? index.getX(i + k) : i + k) * 3));
    triangle.expandByVector(margin);
    if (!nearby.some(box => box.intersectsBox(triangle))) for (let k = 0; k < 3; k++) kept.push(index ? index.getX(i + k) : i + k);
  }
  if (kept.length === count) return 0;
  mesh.geometry = geometry.clone();
  mesh.geometry.setIndex(kept);
  mesh.visible = kept.length > 0;
  mesh.userData.trimmedTriangles = (count - kept.length) / 3;
  return mesh.userData.trimmedTriangles;
}

export function applyModelWind(material, state, height) {
  material.customProgramCacheKey = () => 'blender-vegetation-wind-1';
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uWind: state.wind, uWindStrength: state.windStrength, uWindDirection: state.windDirection, uBendScale: { value: Math.max(.035, (height / 12) ** 2) } });
    shader.vertexShader = 'attribute vec3 _wind; uniform float uWind; uniform float uWindStrength; uniform vec2 uWindDirection; uniform float uBendScale;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 windWorld = modelMatrix * vec4(transformed, 1.0);
      float phase = windWorld.x * .12 + windWorld.z * .09;
      float wave = .60 + .28 * sin(uWind * .72 + phase) + .12 * sin(uWind * 1.63 + phase * 2.3 + windWorld.y * .14);
      float flutter = (.65 * sin(uWind * 5.1 + _wind.z * 6.283 + phase) + .35 * sin(uWind * 8.3 + _wind.z * 10.68)) * _wind.y * .035 * uWindStrength;
      windWorld.xz += uWindDirection * (uWindStrength * uBendScale * _wind.x * wave + flutter);
      windWorld.y += flutter * .4;
      vec4 mvPosition = viewMatrix * windWorld;
      gl_Position = projectionMatrix * mvPosition;
    `);
  };
}

export async function loadBlenderEnvironment(scene) {
  const draco = new DRACOLoader().setDecoderPath('/media/draco/').setWorkerLimit(2);
  let gltf;
  try { gltf = await new GLTFLoader().setDRACOLoader(draco).loadAsync('/media/campus-environment.glb'); }
  finally { draco.dispose(); }
  const group = gltf.scene;
  group.name = 'Blender campus environment';
  const state = { group, wind: { value: 0 }, windStrength: { value: 0 }, windDirection: { value: new T.Vector2(0, 1) }, vegetation: [], trees: [], materials: [], trimmedTriangles: 0 };
  group.updateMatrixWorld(true);
  const obstacles = environmentObstacles(scene);
  group.traverse(node => {
    if (node.userData.tree) state.trees.push(node);
    if (!node.isMesh) return;
    let owner = node;
    while (!owner.userData.source_object && owner.parent) owner = owner.parent;
    node.userData.sourceObject = owner.userData.source_object;
    node.material = node.material.clone();
    const material = node.material;
    material.vertexColors = false;
    for (const texture of [material.map, material.normalMap, material.roughnessMap]) if (texture) texture.anisotropy = 4;
    node.receiveShadow = true;
    const name = material.userData.source_material || material.name;
    if (/Exposed red earth/.test(name)) state.soilMaterial = material;
    if (/Planted verge ground/.test(name)) { state.groundMaterial = material; material.color.set('#a4ad83'); }
    if (/Weathered concrete apron/.test(name)) state.pavingMaterial = material;
    state.materials.push(material);
    if (!owner.userData.vegetation) return;
    if (!node.geometry.getAttribute('_wind')) throw new Error(`Missing Blender wind weights: ${node.name}`);
    const height = owner.userData.wind_height;
    node.userData.windHeight = height;
    state.trimmedTriangles += clearModelVegetation(node, obstacles, height);
    if (material.userData.foliage) {
      material.transparent = false; material.alphaTest = .45; material.depthWrite = true;
      material.side = T.DoubleSide;
    }
    applyModelWind(material, state, height);
    node.castShadow = true;
    node.customDepthMaterial = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map: material.map, alphaTest: material.alphaTest, side: material.side });
    applyModelWind(node.customDepthMaterial, state, height);
    node.geometry.computeBoundingSphere();
    node.geometry.boundingSphere.radius += modelWindReach(height) / Math.max(.01, node.getWorldScale(new T.Vector3()).length() / Math.sqrt(3));
    state.vegetation.push(node);
  });
  if (state.trees.length !== 23 || !state.groundMaterial || !state.soilMaterial || !state.pavingMaterial) throw new Error('Incomplete Blender environment export');
  // Distant continuation sits below the authored terrain, never over the roads.
  const horizon = new T.Mesh(new T.PlaneGeometry(2000, 2000), state.soilMaterial.clone());
  for (const slot of ['map', 'normalMap', 'roughnessMap']) if (horizon.material[slot]) {
    horizon.material[slot] = horizon.material[slot].clone();
    horizon.material[slot].wrapS = horizon.material[slot].wrapT = T.RepeatWrapping;
    horizon.material[slot].repeat.set(800, 800);
  }
  horizon.rotation.x = -Math.PI / 2; horizon.position.y = -2.2; horizon.name = 'Distant ground continuation';
  group.add(horizon);
  scene.add(group);
  return state;
}
