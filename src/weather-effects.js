import * as T from 'three';
import { footprint } from './footprint.js';
import { terraceCovers, terraceLevels } from './stair-layout.js';

// Roof slabs and cantilevered canopies define shelter independently of the camera.
export const shelters = [
  ...footprint.map(p => ({
    x: p.type === 'low-corridor' ? -12.4375 : p.x, z: p.z,
    width: p.type === 'low-corridor' ? 17.225 : p.width + .35, depth: p.depth + .35,
    top: p.type === 'west' ? terraceLevels.leftWing : p.type === 'low-corridor' ? terraceLevels.leftStrip : p.type === 'room' ? terraceLevels.rightWing : p.type === 'corridor' || p.type === 'tower' ? terraceLevels.rightStrip : p.height - 1.3,
  })),
  { x: 0, z: 8.8, width: 10, depth: 4, top: 3.67 },
  { x: 0, z: -7.9, width: 10, depth: 2, top: 3.67 },
  { x: 31.42, z: 0, width: 1.15, depth: 33.3, top: 3.225 },
  ...terraceCovers,
];

export function shelterAt(x, y, z, margin = 0) {
  return shelters.find(s => Math.abs(x - s.x) <= s.width / 2 + margin && Math.abs(z - s.z) <= s.depth / 2 + margin && y <= s.top + margin);
}
export const isSheltered = (x, y, z, margin = 0) => !!shelterAt(x, y, z, margin);

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
  // Drops fall in a volume that follows the camera, so rain reads clearly from every viewpoint,
  // including the distant arrival view (previously a fixed box around the building).
  const count = 5200, radius = 34, above = 26, below = 14;
  const geometry = new T.PlaneGeometry(.028, 1);
  const fade = document.createElement('canvas'); fade.width = 4; fade.height = 64;
  const ctx = fade.getContext('2d'), gradient = ctx.createLinearGradient(0, 0, 0, 64);
  gradient.addColorStop(0, '#000'); gradient.addColorStop(.35, '#fff'); gradient.addColorStop(1, '#222');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 4, 64);
  const material = new T.MeshBasicMaterial({ color: '#e4eef2', alphaMap: new T.CanvasTexture(fade), transparent: true, opacity: 0, depthWrite: false, side: T.DoubleSide, fog: false });
  // Clip the full streak, including its ends, at each roof and canopy boundary.
  material.onBeforeCompile = shader => {
    shader.vertexShader = 'varying vec3 rainWorld;\n' + shader.vertexShader;
    shader.vertexShader = shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nrainWorld = (modelMatrix * instanceMatrix * vec4(position, 1.0)).xyz;');
    shader.fragmentShader = 'varying vec3 rainWorld;\n' + shader.fragmentShader;
    const clip = shelters.map(s => `if (abs(rainWorld.x - ${s.x.toFixed(4)}) <= ${(s.width / 2).toFixed(4)} && abs(rainWorld.z - ${s.z.toFixed(4)}) <= ${(s.depth / 2).toFixed(4)} && rainWorld.y <= ${s.top.toFixed(4)}) discard;`).join('\n');
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', '#include <clipping_planes_fragment>\n' + clip);
  };
  const mesh = new T.InstancedMesh(geometry, material, count); mesh.name = 'Live rain'; mesh.frustumCulled = false; mesh.visible = false; scene.add(mesh);
  let seed = 7;
  const random = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
  const drops = Array.from({ length: count }, () => ({ x: (random() * 2 - 1) * radius, y: random() * (above + below) - below, z: (random() * 2 - 1) * radius, speed: 8.5 + random() * 3 }));
  const dummy = new T.Object3D(), up = new T.Vector3(0, 1, 0), streak = new T.Vector3(), billboard = new T.Quaternion();
  // Splashes where drops land on the ground or a roof: a small crown of droplets thrown up and out, then gone
  // within a quarter of a second. Only near the eye, where a 20 cm splash is visible at all.
  const crown = document.createElement('canvas'); crown.width = crown.height = 64;
  const g = crown.getContext('2d'); g.fillStyle = '#fff';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (.08 + .84 * i / 8), r = 18 + (i % 3) * 6, x = 32 + Math.cos(a) * r, y = 58 - Math.sin(a) * r * 1.25;
    g.globalAlpha = .9; g.beginPath(); g.arc(x, y, 2.2, 0, Math.PI * 2); g.fill();
    g.globalAlpha = .35; g.lineWidth = 1.4; g.strokeStyle = '#fff'; g.beginPath(); g.moveTo(32, 60); g.lineTo(x, y); g.stroke();
  }
  g.globalAlpha = .55; g.beginPath(); g.ellipse(32, 60, 14, 3, 0, 0, Math.PI * 2); g.fill();
  const splashGeometry = new T.PlaneGeometry(1, 1); splashGeometry.translate(0, .5, 0);
  const splashes = new T.InstancedMesh(splashGeometry, new T.MeshBasicMaterial({ map: new T.CanvasTexture(crown), color: '#cfdde3', transparent: true, depthWrite: false, blending: T.AdditiveBlending, fog: false }), 320);
  splashes.name = 'Rain splashes'; splashes.frustumCulled = false; splashes.visible = false; splashes.count = 0; scene.add(splashes);
  const splashPool = [], NEAR = 18, LIFE = .26;
  const splashColor = new T.Color();
  const wrap = (v, centre) => v - centre < -radius ? v + radius * 2 : v - centre > radius ? v - radius * 2 : v;
  return {
    current: 0, gust: 0, splashes,
    ground: () => null, // ground height at (x, z), set once the terrain is loaded
    // windSpeed: the gusting speed the trees sway to (updateWind), so rain and foliage lean together.
    update(dt, weather, reduced = false, windSpeed = weather.windSpeed) {
      this.current = T.MathUtils.damp(this.current, weather.rainFactor, 2.8, dt);
      mesh.visible = !reduced && this.current > .004;
      if (!mesh.visible) { splashPool.length = 0; splashes.visible = false; return; }
      mesh.count = Math.max(1, Math.round(count * Math.sqrt(this.current)));
      material.opacity = .38 + this.current * .4;
      // Drops drift at about the air's speed, so the streak leans by atan(wind / fall speed); damped like the trees.
      this.gust = T.MathUtils.damp(this.gust, Math.max(0, windSpeed || 0), 2, dt);
      const wind = windVector(this.gust, weather.windDirection);
      const eye = camera.getWorldPosition(streak);
      const cx = eye.x, cy = eye.y, cz = eye.z;
      billboard.setFromAxisAngle(up, camera.rotation.y);
      for (let i = 0; i < mesh.count; i++) {
        const drop = drops[i];
        drop.x = wrap(drop.x + wind.x * dt, cx); drop.z = wrap(drop.z + wind.y * dt, cz); drop.y -= drop.speed * dt;
        const roof = shelterAt(drop.x, drop.y, drop.z, .1), ground = roof ? roof.top : this.ground(drop.x, drop.z);
        const landed = roof || ground != null && drop.y < ground;
        if (landed || drop.y < Math.max(-.5, cy - below)) {
          if (landed && splashPool.length < 320 && (drop.x - cx) ** 2 + (drop.z - cz) ** 2 < NEAR * NEAR) splashPool.push({ x: drop.x, y: ground + .01, z: drop.z, age: 0, size: .12 + random() * .1 });
          drop.y = cy + above - random() * 4; drop.x = cx + (random() * 2 - 1) * radius; drop.z = cz + (random() * 2 - 1) * radius;
        }
        streak.set(-wind.x, drop.speed, -wind.y).normalize();
        dummy.position.set(drop.x, drop.y, drop.z);
        dummy.quaternion.setFromUnitVectors(up, streak).multiply(billboard);
        dummy.scale.set(1, .55 + this.current * .5, 1); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
      let live = 0;
      for (const s of splashPool) {
        s.age += dt; if (s.age > LIFE) continue;
        const t = s.age / LIFE; dummy.position.set(s.x, s.y, s.z); dummy.quaternion.copy(billboard);
        dummy.scale.set(s.size * (.5 + t), s.size * (.9 + .6 * t), 1); dummy.updateMatrix();
        splashes.setMatrixAt(live, dummy.matrix); splashes.setColorAt(live, splashColor.setScalar((1 - t) * (1 - t) * material.opacity)); live++;
      }
      for (let i = splashPool.length - 1; i >= 0; i--) if (splashPool[i].age > LIFE) splashPool.splice(i, 1);
      splashes.count = live; splashes.visible = live > 0;
      if (live) { splashes.instanceMatrix.needsUpdate = true; splashes.instanceColor.needsUpdate = true; }
    },
  };
}

export function updateWind(landscape, weather, dt, reduced = false) {
  if (!reduced) landscape.wind.value += dt;
  const time = landscape.wind.value;
  const gust = (.5 + .3 * Math.sin(time * .47) + .2 * Math.sin(time * .19 + 1.7)) ** 4;
  const speed = Math.max(0, Number(weather.windSpeed) || 0);
  const windSpeed = speed + (Math.max(speed, Number(weather.windGusts) || speed) - speed) * gust;
  landscape.windStrength.value = reduced ? 0 : T.MathUtils.damp(landscape.windStrength.value, Math.min(1.5, (windSpeed / 35) ** 1.5), 2, dt);
  const bearing = windVector(1, weather.windDirection).normalize();
  // Interpolate the vector without normalizing: even a 180-degree change cannot snap.
  landscape.windDirection.value.lerp(bearing, 1 - Math.exp(-.8 * dt));
  return windSpeed;
}

export function applyWind(material, wind, strength, direction, flutter = 0) {
  material.customProgramCacheKey = () => `campus-wind-2:${flutter}`;
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
      float phase = windWorld.x * .12 + windWorld.z * .09;
      float wave = .60 + .28 * sin(uWind * .72 + phase) + .12 * sin(uWind * 1.63 + phase * 2.3 + windWorld.y * .14);
      windWorld.xz += uWindDirection * uWindStrength * heightWeight * wave;
      ${flutter ? `
      // Fine movement is tip-weighted, spatially varied and bounded to 5.25 cm.
      // The shared branch displacement above still anchors the petiole.
      vec4 leafOrigin = vec4(0.0, 0.0, 0.0, 1.0);
      #ifdef USE_INSTANCING
        leafOrigin = instanceMatrix * leafOrigin;
      #endif
      leafOrigin = modelMatrix * leafOrigin;
      float leafPhase = dot(leafOrigin.xyz, vec3(2.17, 3.13, 1.71));
      float tip = clamp(length(position), 0.0, 1.0);
      float flutterWave = .65 * sin(uWind * 5.1 + leafPhase) + .35 * sin(uWind * 8.3 + leafPhase * 1.7);
      float flutterAmount = ${flutter.toFixed(3)} * .035 * uWindStrength * tip * flutterWave;
      windWorld.xz += uWindDirection * flutterAmount;
      windWorld.y += flutterAmount * .4;
      ` : ''}
      mvPosition = viewMatrix * windWorld;
      gl_Position = projectionMatrix * mvPosition;
    `);
  };
}
