import * as T from 'three';
import { isSheltered } from './weather-effects.js';

// Rain water on the ground: puddles form in the terrain's own low points, rise with rainfall intensity and drain or
// evaporate afterwards. Wet surfaces darken and gloss over; puddles mirror the sky and ripple under falling drops.
// The terrain is the authored Blender grading (provisional, not surveyed); micro-relief is a visual estimate.

const CELL = .5, X0 = -81, Z0 = -75.5, W = 324, H = 362, DEPTH = .15; // grid covers the exported ground meshes
const IMPERVIOUS = /asphalt|concrete|kerb|planter/i, PERVIOUS = /earth|verge/i;

// Fill rates are per mm/h of rain; drain/evaporation rates are per minute. Concrete and asphalt hold water for
// about an hour after heavy rain; soil soaks it up in about a quarter of an hour.
const FILL = { hard: 1 / 60, soil: 1 / 120 }, DRAIN = { hard: 1 / 40, soil: 1 / 12 };
const FILM = { wetting: 1 / .5, drying: 1 / 8 }; // surface film: wet within ~30 s, dry ~8 min after rain stops

// One step of the fill/drain model. state: { hard, soil, film } in 0..1, rate in mm/h, minutes elapsed.
export function waterStep(state, rate, minutes) {
  const r = Math.max(0, rate || 0), out = {};
  for (const k of ['hard', 'soil']) {
    const a = FILL[k] * r, b = DRAIN[k], steady = a / (a + b);
    out[k] = steady + (state[k] - steady) * Math.exp(-(a + b) * minutes);
  }
  const target = r > .05 ? 1 : 0, k = target ? FILM.wetting : FILM.drying;
  out.film = target + (state.film - target) * Math.exp(-k * minutes);
  return out;
}

// Priority-flood (Barnes et al. 2014): water depth each cell holds before spilling to the grid edge.
// heights: Float32Array, NaN = no ground. Empty cells connected to the grid border are beyond the modelled ground,
// so water drains off there; empty cells enclosed by ground (building footprints) are walls.
export function fillDepressions(heights, w, h) {
  const n = w * h, filled = Float32Array.from(heights), done = new Uint8Array(n), outside = new Uint8Array(n);
  const heap = new Int32Array(n), queue = new Int32Array(n), step = [1, -1, w, -w];
  let size = 0, tail = 0;
  const neighbour = (i, k) => { const x = i % w; return k === 0 ? (x < w - 1 ? i + 1 : -1) : k === 1 ? (x ? i - 1 : -1) : (i + step[k] >= 0 && i + step[k] < n ? i + step[k] : -1); };
  const push = i => { let c = size++; heap[c] = i; while (c) { const p = (c - 1) >> 1; if (filled[heap[p]] <= filled[i]) break; heap[c] = heap[p]; c = p; } heap[c] = i; };
  const pop = () => {
    const top = heap[0], last = heap[--size]; let c = 0;
    for (;;) { const l = 2 * c + 1; if (l >= size) break; const m = l + 1 < size && filled[heap[l + 1]] < filled[heap[l]] ? l + 1 : l; if (filled[heap[m]] >= filled[last]) break; heap[c] = heap[m]; c = m; }
    heap[c] = last; return top;
  };
  const edge = i => { const x = i % w; return !x || x === w - 1 || i < w || i >= n - w; };
  for (let i = 0; i < n; i++) if (edge(i) && Number.isNaN(heights[i])) { outside[i] = 1; queue[tail++] = i; }
  while (tail) { const i = queue[--tail]; for (let k = 0; k < 4; k++) { const m = neighbour(i, k); if (m >= 0 && !outside[m] && Number.isNaN(heights[m])) { outside[m] = 1; queue[tail++] = m; } } }
  for (let i = 0; i < n; i++) {
    if (Number.isNaN(heights[i])) { done[i] = 1; continue; }
    let outlet = edge(i);
    for (let k = 0; k < 4 && !outlet; k++) { const m = neighbour(i, k); outlet = m >= 0 && outside[m] === 1; }
    if (outlet) { done[i] = 1; push(i); }
  }
  while (size) {
    const i = pop();
    for (let k = 0; k < 4; k++) {
      const m = neighbour(i, k); if (m < 0 || done[m]) continue;
      done[m] = 1; if (filled[m] < filled[i]) filled[m] = filled[i]; push(m);
    }
  }
  const depth = new Float32Array(n);
  for (let i = 0; i < n; i++) depth[i] = Number.isNaN(heights[i]) ? 0 : filled[i] - heights[i];
  return depth;
}

// Highest ground surface in each cell, from the exported ground meshes' triangles.
function rasterize(meshes) {
  const heights = new Float32Array(W * H).fill(NaN), soil = new Uint8Array(W * H);
  const a = new T.Vector3(), b = new T.Vector3(), c = new T.Vector3();
  for (const mesh of meshes) {
    const pos = mesh.geometry.attributes.position, index = mesh.geometry.index, isSoil = PERVIOUS.test(mesh.userData.surface);
    const tris = (index ? index.count : pos.count) / 3;
    for (let t = 0; t < tris; t++) {
      const v = k => index ? index.getX(t * 3 + k) : t * 3 + k;
      a.fromBufferAttribute(pos, v(0)).applyMatrix4(mesh.matrixWorld); b.fromBufferAttribute(pos, v(1)).applyMatrix4(mesh.matrixWorld); c.fromBufferAttribute(pos, v(2)).applyMatrix4(mesh.matrixWorld);
      const ax = (a.x - X0) / CELL, az = (a.z - Z0) / CELL, bx = (b.x - X0) / CELL, bz = (b.z - Z0) / CELL, cx = (c.x - X0) / CELL, cz = (c.z - Z0) / CELL;
      const area = (bx - ax) * (cz - az) - (cx - ax) * (bz - az); if (Math.abs(area) < 1e-9) continue;
      const x0 = Math.max(0, Math.floor(Math.min(ax, bx, cx))), x1 = Math.min(W - 1, Math.ceil(Math.max(ax, bx, cx)));
      const z0 = Math.max(0, Math.floor(Math.min(az, bz, cz))), z1 = Math.min(H - 1, Math.ceil(Math.max(az, bz, cz)));
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const px = x + .5, pz = z + .5;
        const w0 = ((bx - px) * (cz - pz) - (cx - px) * (bz - pz)) / area, w1 = ((cx - px) * (az - pz) - (ax - px) * (cz - pz)) / area, w2 = 1 - w0 - w1;
        if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
        const y = w0 * a.y + w1 * b.y + w2 * c.y, i = z * W + x;
        if (!(heights[i] >= y)) { heights[i] = y; soil[i] = isSoil ? 1 : 0; }
      }
    }
  }
  return { heights, soil };
}

// Smooth value noise for micro-relief: real paving and soil are never perfectly planar.
function relief(x, z) {
  const hash = (i, j) => { const s = Math.sin(i * 127.1 + j * 311.7) * 43758.5453; return s - Math.floor(s); };
  const octave = (f) => {
    const u = x * f, v = z * f, i = Math.floor(u), j = Math.floor(v), fu = u - i, fv = v - j, su = fu * fu * (3 - 2 * fu), sv = fv * fv * (3 - 2 * fv);
    return T.MathUtils.lerp(T.MathUtils.lerp(hash(i, j), hash(i + 1, j), su), T.MathUtils.lerp(hash(i, j + 1), hash(i + 1, j + 1), su), sv);
  };
  return octave(.35) * .65 + octave(.9) * .35 - .5;
}

export function createPuddles(landscape) {
  const uniforms = {
    uPuddleMap: { value: null }, uPuddleOrigin: { value: new T.Vector4(X0, Z0, W * CELL, H * CELL) },
    uFill: { value: new T.Vector2() }, uFilm: { value: 0 }, uRain: { value: 0 }, uTime: { value: 0 },
  };
  let state = { hard: 0, soil: 0, film: 0 }, heights = null;
  const materials = new Set();
  // Ground shading: darken and gloss with the wet film; in puddles flatten the normal, mirror the sky, ripple.
  function patch(material) {
    if (materials.has(material)) return; materials.add(material);
    material.customProgramCacheKey = () => 'campus-puddles-1';
    material.onBeforeCompile = shader => {
      Object.assign(shader.uniforms, uniforms);
      shader.vertexShader = 'varying vec3 vPuddleWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvPuddleWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      shader.fragmentShader = `uniform sampler2D uPuddleMap; uniform vec4 uPuddleOrigin; uniform vec2 uFill; uniform float uFilm, uRain, uTime;
varying vec3 vPuddleWorld;
float puddleHash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float puddleNoise(vec2 p) { vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(puddleHash(i), puddleHash(i + vec2(1, 0)), u.x), mix(puddleHash(i + vec2(0, 1)), puddleHash(i + vec2(1, 1)), u.x), u.y); }
` + shader.fragmentShader
        .replace('#include <metalnessmap_fragment>', `#include <metalnessmap_fragment>
float puddleCover = 0.0;
if (uFilm + uFill.x + uFill.y > 0.002) {
  vec4 cell = texture2D(uPuddleMap, (vPuddleWorld.xz - uPuddleOrigin.xy) / uPuddleOrigin.zw);
  float shelter = cell.b, fill = mix(uFill.x, uFill.y, cell.g);
  // Edges follow the hollow, broken up at a few centimetres so puddles do not show the 0.5 m grid.
  float depth = cell.r + (puddleNoise(vPuddleWorld.xz * 2.3) - 0.5) * 0.12 + (puddleNoise(vPuddleWorld.xz * 7.0) - 0.5) * 0.04;
  puddleCover = smoothstep(1.0 - fill, 1.0 - fill + 0.05, depth) * step(0.003, cell.r) * (1.0 - shelter) * step(0.02, fill);
  float film = uFilm * (1.0 - shelter) * mix(0.75, 1.0, cell.g);
  diffuseColor.rgb *= mix(1.0, mix(0.62, 0.5, cell.g), film);
  roughnessFactor = mix(roughnessFactor, roughnessFactor * 0.45, film);
  diffuseColor.rgb *= mix(1.0, 0.55, puddleCover);
  roughnessFactor = mix(roughnessFactor, 0.035, puddleCover);
}`)
        .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
if (puddleCover > 0.0) {
  vec3 up = normalize((viewMatrix * vec4(0.0, 1.0, 0.0, 0.0)).xyz);
  vec2 ripple = vec2(0.0);
  // Drop rings at random spots, a few per square metre in heavy rain; too small to read beyond ~15 m.
  float nearEye = 1.0 - smoothstep(5.0, 16.0, distance(vPuddleWorld, cameraPosition));
  if (uRain > 0.0 && nearEye > 0.0) for (int k = 0; k < 2; k++) {
    vec2 grid = vPuddleWorld.xz * 2.2 + vec2(float(k) * 0.43, float(k) * 0.71), id = floor(grid) + float(k) * 17.0;
    vec2 centre = vec2(puddleHash(id + 1.3), puddleHash(id + 5.9)) * 0.6 - 0.3, local = fract(grid) - 0.5 - centre;
    float phase = fract(uTime * (0.7 + puddleHash(id) * 0.8) + puddleHash(id + 3.1)), r = phase * 0.38, d = length(local);
    float ring = exp(-pow((d - r) * 30.0, 2.0)) * (1.0 - phase) * (1.0 - phase) * step(puddleHash(id + 7.7), uRain * 0.6);
    ripple += local / max(d, 1e-3) * ring * nearEye;
  }
  vec3 tangentX = normalize((viewMatrix * vec4(1.0, 0.0, 0.0, 0.0)).xyz), tangentZ = normalize((viewMatrix * vec4(0.0, 0.0, 1.0, 0.0)).xyz);
  normal = normalize(mix(normal, normalize(up + (tangentX * ripple.x + tangentZ * ripple.y) * 0.35), puddleCover));
}`);
    };
    material.needsUpdate = true;
  }
  function build(meshes) {
    const raster = rasterize(meshes);
    for (let i = 0; i < W * H; i++) if (!Number.isNaN(raster.heights[i])) {
      const x = X0 + (i % W + .5) * CELL, z = Z0 + ((i / W | 0) + .5) * CELL;
      raster.heights[i] += relief(x, z) * (raster.soil[i] ? .04 : .024);
    }
    const depth = fillDepressions(raster.heights, W, H), data = new Uint8Array(W * H * 4);
    for (let i = 0; i < W * H; i++) {
      const x = X0 + (i % W + .5) * CELL, z = Z0 + ((i / W | 0) + .5) * CELL, y = raster.heights[i];
      data[i * 4] = Math.round(255 * Math.min(1, depth[i] / DEPTH)); data[i * 4 + 1] = raster.soil[i] * 255;
      data[i * 4 + 2] = !Number.isNaN(y) && isSheltered(x, y + .1, z) ? 255 : 0; data[i * 4 + 3] = 255;
    }
    const map = new T.DataTexture(data, W, H, T.RGBAFormat); map.magFilter = map.minFilter = T.LinearFilter; map.needsUpdate = true;
    uniforms.uPuddleMap.value = map; heights = raster.heights;
    return depth;
  }
  return {
    uniforms, get state() { return state; },
    // Ground meshes of the Blender export: paving, asphalt, kerbs and soil, not foliage or the distant plane.
    attach() {
      const meshes = [];
      landscape.group.traverse(o => {
        if (!o.isMesh || o.userData.windHeight || /Distant/.test(o.name)) return;
        const surface = o.material.userData.source_material || o.material.name;
        if (!IMPERVIOUS.test(surface) && !PERVIOUS.test(surface)) return;
        o.userData.surface = surface; meshes.push(o); patch(o.material);
      });
      return build(meshes);
    },
    // Warm start from the past hours' observed rain (hourly mm), so arriving after a shower still shows puddles.
    // hours: [{ t: ms, mm }] where mm fell during the hour ending at t (Open-Meteo hourly precipitation).
    history(hours, now = Date.now()) {
      let s = { hard: 0, soil: 0, film: 0 }, end = null;
      for (const { t, mm } of hours.filter(h => h.t <= now).sort((p, q) => p.t - q.t)) {
        if (end !== null && t - 3600000 > end) s = waterStep(s, 0, (t - 3600000 - end) / 60000);
        s = waterStep(s, mm, 60); end = t;
      }
      if (end !== null) s = waterStep(s, 0, (now - end) / 60000);
      state = s;
    },
    heightAt(x, z) {
      if (!heights) return null;
      const i = Math.floor((x - X0) / CELL), j = Math.floor((z - Z0) / CELL);
      if (i < 0 || j < 0 || i >= W || j >= H) return null;
      const y = heights[j * W + i]; return Number.isNaN(y) ? null : y;
    },
    update(dt, weather, reduced) {
      state = waterStep(state, weather.rainRate ?? (weather.rainFactor > 0 ? 1 : 0), dt / 60);
      uniforms.uFill.value.set(state.hard, state.soil); uniforms.uFilm.value = state.film;
      uniforms.uRain.value = reduced ? 0 : Math.min(1, weather.rainFactor * 1.4);
      if (!reduced) uniforms.uTime.value += dt;
    },
  };
}
