import * as T from 'three';
import { footprint } from './footprint.js';

// Roof slabs and cantilevered canopies define shelter independently of the camera.
export const shelters = [
  ...footprint.map(p => ({ x: p.x, z: p.z, width: p.width + .35, depth: p.depth + .35, top: p.height - 1.3 })),
  { x: 0, z: 8.8, width: 10, depth: 4, top: 3.67 },
  { x: 0, z: -7.9, width: 10, depth: 2, top: 3.67 },
  { x: 31.42, z: 0, width: 1.15, depth: 33.3, top: 3.225 },
];

export function isSheltered(x, y, z, margin = 0) {
  return shelters.some(s => Math.abs(x - s.x) <= s.width / 2 + margin && Math.abs(z - s.z) <= s.depth / 2 + margin && y <= s.top + margin);
}

export function rainfall(current) {
  // rain and showers are components of precipitation, not additional totals.
  const liquid = Math.max(0, Number(current.rain) || 0) + Math.max(0, Number(current.showers) || 0);
  const amount = liquid || (current.snowfall > 0 ? 0 : Math.max(0, Number(current.precipitation) || 0));
  const fallbacks = { 51: .1, 53: .3, 55: .6, 56: .2, 57: .6, 61: .5, 63: 3, 65: 9, 66: .5, 67: 3, 80: 1, 81: 5, 82: 12, 95: 3, 96: 5, 99: 9 };
  const rate = amount || fallbacks[current.weather_code] || 0;
  return { rate, factor: rate ? T.MathUtils.clamp(Math.log1p(rate) / Math.log(13), .04, 1) : 0 };
}

export function windVector(speed, direction) {
  // Meteorological bearing is where the wind comes FROM; scene north is -Z.
  const angle = (direction || 0) * Math.PI / 180, metresPerSecond = Math.max(0, speed || 0) / 3.6;
  return new T.Vector2(-Math.sin(angle) * metresPerSecond, Math.cos(angle) * metresPerSecond);
}

export function createRain(scene, camera) {
  const count = 2400, geometry = new T.PlaneGeometry(.018, 1);
  const material = new T.MeshBasicMaterial({ color: '#cadce4', transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide });
  // Clip the full streak, including its ends, at each roof and canopy boundary.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 rainWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nrainWorld = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 rainWorld;\n' + shader.fragmentShader;
    const clip = shelters.map(s => `if (abs(rainWorld.x - ${s.x.toFixed(4)}) <= ${(s.width / 2).toFixed(4)} && abs(rainWorld.z - ${s.z.toFixed(4)}) <= ${(s.depth / 2).toFixed(4)} && rainWorld.y <= ${s.top.toFixed(4)}) discard;`).join('\n');
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + clip);
  };
  const mesh = new T.InstancedMesh(geometry, material, count); mesh.name = 'Live rain'; mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  const drops = Array.from({ length: count }, (_, i) => ({ x: ((i * 37.17) % 120) - 60, y: (i * 19.73) % 48 + 2, z: ((i * 53.11) % 96) - 40, speed: 7 + i % 7 * .45 }));
  const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0), streak = new T.Vector3(), billboard = new T.Quaternion();
  return {
    current: 0,
    update(dt, weather, reduced = false) {
      this.current = T.MathUtils.damp(this.current, weather.rainFactor, 2.8, dt);
      mesh.visible = !reduced && this.current > .004;
      if (!mesh.visible) return;
      mesh.count = Math.max(1, Math.round(count * this.current));
      material.opacity = .22 + this.current * .23;
      const wind = windVector(weather.windSpeed, weather.windDirection).multiplyScalar(.55);
      billboard.setFromAxisAngle(up, camera.rotation.y);
      for (let i = 0; i < mesh.count; i++) {
        const drop = drops[i];
        drop.x += wind.x * dt; drop.z += wind.y * dt; drop.y -= drop.speed * dt;
        if (drop.x < -60) drop.x += 120; if (drop.x > 60) drop.x -= 120;
        if (drop.z < -40) drop.z += 96; if (drop.z > 56) drop.z -= 96;
        if (drop.y < -.5 || isSheltered(drop.x, drop.y, drop.z, .1)) drop.y = 48 + i % 7;
        streak.set(-wind.x, drop.speed, -wind.y).normalize();
        dummy.position.set(drop.x, drop.y, drop.z);
        dummy.quaternion.setFromUnitVectors(up, streak).multiply(billboard);
        dummy.scale.set(1, .35 + this.current * .4, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}

export function applyWind(material, wind, strength, direction) {
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { uWind: wind, uWindStrength: strength, uWindDirection: direction });
    shader.vertexShader = 'uniform float uWind; uniform float uWindStrength; uniform vec2 uWindDirection;\n' + shader.vertexShader;
    // Bend in world coordinates so connected branches and their leaves move together.
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', `
      vec4 mvPosition = vec4(transformed, 1.0);
      #ifdef USE_INSTANCING
        mvPosition = instanceMatrix * mvPosition;
      #endif
      vec4 windWorld = modelMatrix * mvPosition;
      float heightWeight = pow(max(0.0, windWorld.y - .3) / 12.0, 2.0);
      float wave = .65 + .25 * sin(uWind * 1.25 + windWorld.x * .12 + windWorld.z * .09) + .1 * sin(uWind * 2.7 + windWorld.y);
      windWorld.xz += uWindDirection * uWindStrength * heightWeight * wave;
      mvPosition = viewMatrix * windWorld;
      gl_Position = projectionMatrix * mvPosition;
    `);
  };
}
