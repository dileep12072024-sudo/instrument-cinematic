import * as T from 'three';

// Each light fitting in a room lights that room (owner, 2026-10-17: "each individual light should work exactly", not one
// heavy light in the middle). Real three.js lights would add to the light count of every material on the campus (cost on
// every pixel, and a full shader rebuild whenever one is switched). Instead the room's materials get a shader term: a
// diffuse contribution from each fitting, inverse-square falloff, a downward lobe, limited to the room's box so nothing
// leaks through its walls. Switching changes a uniform only: instant, and free everywhere else.
const MAX = 12;

export function createRoomLights(name, bounds) {
  const uniforms = {
    uRL: { value: Array.from({ length: MAX }, () => new T.Vector4(0, -100, 0, 0)) },
    uRLCount: { value: 0 },
    uRLColor: { value: new T.Color('#fff7ea') },
    uRLMin: { value: bounds.min.clone() }, uRLMax: { value: bounds.max.clone() },
  };
  const fittings = [], patched = new WeakSet(), tag = name.replace(/\W/g, '');
  return {
    fittings,
    add(position, power, onLevel = l => {}) {
      if (fittings.length >= MAX) throw new Error(`${name}: too many light fittings`);
      const f = { index: fittings.length, position: position.clone(), power, on: true, level: 1, onLevel };
      fittings.push(f); uniforms.uRLCount.value = fittings.length;
      uniforms.uRL.value[f.index].set(position.x, position.y, position.z, power); onLevel(1);
      return f;
    },
    patch(material) {
      if (!material || patched.has(material) || !(material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial)) return;
      patched.add(material);
      const before = material.onBeforeCompile, key = material.customProgramCacheKey;
      material.customProgramCacheKey = () => (key && key !== T.Material.prototype.customProgramCacheKey ? key.call(material) : '') + '|rl-' + tag;
      material.onBeforeCompile = (shader, renderer) => {
        before?.call(material, shader, renderer);
        Object.assign(shader.uniforms, uniforms);
        shader.vertexShader = 'varying vec3 vRLWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRLWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = `#define RL_MAX ${MAX}
uniform vec4 uRL[RL_MAX]; uniform int uRLCount; uniform vec3 uRLColor, uRLMin, uRLMax; varying vec3 vRLWorld;
` + shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
if (all(greaterThan(vRLWorld, uRLMin)) && all(lessThan(vRLWorld, uRLMax))) {
  vec3 nW = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz); // view to world (viewMatrix is orthonormal)
  for (int i = 0; i < RL_MAX; i++) {
    if (i >= uRLCount) break;
    vec4 rl = uRL[i];
    if (rl.w <= 0.0) continue;
    vec3 toL = rl.xyz - vRLWorld; float d2 = dot(toL, toL); vec3 L = toL * inversesqrt(d2);
    float lobe = 0.25 + 0.75 * clamp(L.y, 0.0, 1.0); // a ceiling panel throws its light downward (L points up to it)
    reflectedLight.directDiffuse += rl.w * max(dot(nW, L), 0.0) * lobe / (d2 + 0.4) * uRLColor * BRDF_Lambert(material.diffuseColor);
  }
}`);
      };
      material.needsUpdate = true;
    },
    set(f, on) { f.on = on; },
    // Fade toward the switch state (an LED driver takes a moment); true while anything changes.
    update(dt) {
      let changed = false;
      for (const f of fittings) {
        const target = f.on ? 1 : 0; if (f.level === target) continue;
        f.level = Math.abs(f.level - target) < .01 ? target : T.MathUtils.damp(f.level, target, 16, dt);
        uniforms.uRL.value[f.index].w = f.power * f.level; f.onLevel(f.level); changed = true;
      }
      return changed;
    },
  };
}
