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
        for (const [k, v] of Object.entries(uniforms)) shader.uniforms[k + tag] = v; // per-room names: one material may be patched by two rooms
        shader.vertexShader = `varying vec3 vRLWorld${tag};\n` + shader.vertexShader.replace('#include <project_vertex>', `#include <project_vertex>\nvRLWorld${tag} = (modelMatrix * vec4(transformed, 1.0)).xyz;`);
        shader.fragmentShader = `#define RL_MAX${tag} ${MAX}
uniform vec4 uRL${tag}[RL_MAX${tag}]; uniform int uRLCount${tag}; uniform vec3 uRLColor${tag}, uRLMin${tag}, uRLMax${tag}; varying vec3 vRLWorld${tag};
` + shader.fragmentShader.replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
if (all(greaterThan(vRLWorld${tag}, uRLMin${tag})) && all(lessThan(vRLWorld${tag}, uRLMax${tag}))) {
  vec3 nW = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz); // view to world (viewMatrix is orthonormal)
  for (int i = 0; i < RL_MAX${tag}; i++) {
    if (i >= uRLCount${tag}) break;
    vec4 rl = uRL${tag}[i];
    if (rl.w <= 0.0) continue;
    vec3 toL = rl.xyz - vRLWorld${tag}; float d2 = dot(toL, toL); vec3 L = toL * inversesqrt(d2);
    float lobe = 0.25 + 0.75 * clamp(L.y, 0.0, 1.0); // a ceiling panel throws its light downward (L points up to it)
    reflectedLight.directDiffuse += rl.w * max(dot(nW, L), 0.0) * lobe / (d2 + 0.4) * uRLColor${tag} * BRDF_Lambert(material.diffuseColor);
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

// A classroom's working electrics: every panel lights the room, a switchboard by the entrance with one rocker per light
// row and per fan row (red indicator = on), fans that spin up and coast down. room: the room group (local frame);
// box: [minX, maxX, floorY, ceiling, backZ, frontZ] in that frame; panelRows: [{ z?, xs?, positions: [[x, y, z]], material,
// glow }]; fanRows: [[rotor objects]]; board: { position, turn } in the room frame (plate faces its local +z).
export function roomControls(room, { name, box: [x0, x1, y0, y1, z0, z1], panelRows, fanRows, board, power = 7 }) {
  room.updateWorldMatrix(true, false);
  const world = (x, y, z) => new T.Vector3(x, y, z).applyMatrix4(room.matrixWorld);
  const bounds = new T.Box3(); for (const x of [x0 - .15, x1 + .15]) for (const y of [y0 - .2, y1 + .2]) for (const z of [z0 - .15, z1 + .15]) bounds.expandByPoint(world(x, y, z));
  const lights = createRoomLights(name, bounds);
  for (const r of panelRows) { r.glow ??= r.material.emissiveIntensity; r.fittings = r.positions.map(p => lights.add(world(...p), power, level => { r.material.emissiveIntensity = r.glow * Math.max(level, .03); })); }
  const toggles = [...panelRows.map(r => ({ get: () => r.fittings[0].on, set: on => r.fittings.forEach(f => lights.set(f, on)) })), ...fanRows.map(() => ({ on: true }))];
  toggles.forEach(t => { if (!t.get) { t.get = () => t.on; t.set = on => { t.on = on; }; } });
  const { group: switches, clickables } = makeSwitchboard(room, { name, ...board, toggles });
  room.traverse(o => { if (o.isMesh) for (const mat of [o.material].flat()) lights.patch(mat); });
  const fanToggles = toggles.slice(panelRows.length), speed = fanRows.map(() => 1);
  room.userData.clickables = clickables;
  room.userData.update = dt => {
    let changed = lights.update(dt);
    fanRows.forEach((row, k) => { const target = fanToggles[k].on ? 1 : 0; speed[k] += (target - speed[k]) * Math.min(1, dt * (target ? .8 : .35)); // spin up, coast down
      if (speed[k] > .002) { for (const fan of row) { const rotor = fan.userData.rotor || fan; rotor.rotation[fan.userData.axis || 'y'] += speed[k] * (fan.userData.rotor ? 40 : 15) * dt;
        if (fan.userData.head) { fan.userData.phase = (fan.userData.phase || 0) + dt * .5 * speed[k]; fan.userData.head.rotation.y = Math.sin(fan.userData.phase) * .7; } } changed = true; } }); // wall fans also sweep
    return changed;
  };
  return { lights, switches };
}

// A modular switch plate: one rocker per toggle ({ get, set }), red indicator when on; a tap flips a rocker.
// position/turn in the parent's frame; the plate faces its local +z. Returns { group, clickables }.
export function makeSwitchboard(parent, { name, position, turn, toggles }) {
  const plateMat = new T.MeshStandardMaterial({ name: `${name} switch plate`, color: '#f2f1ec', roughness: .35 });
  const rockerMat = new T.MeshStandardMaterial({ name: `${name} switch rockers`, color: '#e9e8e2', roughness: .3 });
  const ledOn = new T.MeshBasicMaterial({ color: '#ff3b2f' }), ledOff = new T.MeshBasicMaterial({ color: '#4a1714' });
  const group = new T.Group(); group.name = `${name} switchboard`; group.position.set(...position); group.rotation.y = turn; parent.add(group);
  const n = toggles.length; group.add(new T.Mesh(new T.BoxGeometry(.06 * n + .04, .14, .012), plateMat));
  const clickables = toggles.map((t, k) => {
    const x = (k - (n - 1) / 2) * .06, rocker = new T.Mesh(new T.BoxGeometry(.04, .07, .012), rockerMat), led = new T.Mesh(new T.CircleGeometry(.006, 10), ledOn);
    rocker.position.set(x, -.005, .012); led.position.set(x, .045, .0065); group.add(rocker, led);
    const show = () => { const on = t.get(); rocker.rotation.x = on ? .18 : -.18; led.material = on ? ledOn : ledOff; };
    rocker.userData.onClick = () => { t.set(!t.get()); show(); return true; }; show();
    return rocker;
  });
  group.userData.clickables = clickables;
  return { group, clickables };
}
