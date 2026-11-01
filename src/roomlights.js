import * as T from 'three';

// Each light fitting in a room lights that room (owner, 2026-10-17: "each individual light should work exactly", not one
// heavy light in the middle). Real three.js lights would add to the light count of every material on the campus (cost on
// every pixel, and a full shader rebuild whenever one is switched). Instead the room's materials get a shader term: a
// diffuse contribution from each fitting, inverse-square falloff, a downward lobe, limited to the room's box so nothing
// leaks through its walls. Switching changes a uniform only: instant, and free everywhere else.
// One table for every room (it was one shader term per room: each room's materials then compiled their own programs,
// 140 of the campus's 337). The table is a small float texture, not uniform arrays: three re-uploads array uniforms on
// every draw that switches material, which with 64 fittings cost several milliseconds a frame. Row 0: each fitting's
// position and power; row 1: its room; rows 2 and 3: each room's box. A fragment is lit by the fittings of the rooms
// whose boxes contain it, so nothing leaks through walls, and every patched material shares one program key.
const ROOMS = 8, FITTINGS = 64;
const texels = new Float32Array(FITTINGS * 4 * 4);
const tableTexture = new T.DataTexture(texels, FITTINGS, 4, T.RGBAFormat, T.FloatType);
tableTexture.minFilter = tableTexture.magFilter = T.NearestFilter; tableTexture.needsUpdate = true;
const row = (r, i) => (r * FITTINGS + i) * 4;
const table = { uRLTable: { value: tableTexture }, uRLCount: { value: 0 }, uRLRooms: { value: 0 }, uRLColor: { value: new T.Color('#fff7ea') } };
const patched = new WeakSet();
const GLSL = /* glsl */`
if (uRLOn > 0.5) {
  int inRooms = 0;
  for (int r = 0; r < ${ROOMS}; r++) {
    if (r >= uRLRooms) break;
    vec3 lo = texelFetch(uRLTable, ivec2(r, 2), 0).xyz, hi = texelFetch(uRLTable, ivec2(r, 3), 0).xyz;
    if (all(greaterThan(vRLWorld, lo)) && all(lessThan(vRLWorld, hi))) inRooms |= 1 << r;
  }
  if (inRooms != 0) {
    vec3 nW = normalize((vec4(geometryNormal, 0.0) * viewMatrix).xyz); // view to world (viewMatrix is orthonormal)
    for (int i = 0; i < ${FITTINGS}; i++) {
      if (i >= uRLCount) break;
      vec4 rl = texelFetch(uRLTable, ivec2(i, 0), 0);
      if (rl.w <= 0.0 || ((inRooms >> int(texelFetch(uRLTable, ivec2(i, 1), 0).x)) & 1) == 0) continue;
      vec3 toL = rl.xyz - vRLWorld; float d2 = dot(toL, toL); vec3 L = toL * inversesqrt(d2);
      float lobe = 0.25 + 0.75 * clamp(L.y, 0.0, 1.0); // a ceiling panel throws its light downward (L points up to it)
      reflectedLight.directDiffuse += rl.w * max(dot(nW, L), 0.0) * lobe / (d2 + 0.4) * uRLColor * BRDF_Lambert(material.diffuseColor);
    }
  }
}`;

// The room term on a material; lit = false carries it switched off (uRLOn = 0), so the building's other materials share
// the room materials' programs: twins that differed only by this term cost ~1 s of compiling each (2026-11-01).
// A material patched dark and later given to a room is switched on.
export function patchRoomLights(material, lit = false) {
  if (!material || !(material.isMeshStandardMaterial || material.isMeshLambertMaterial || material.isMeshPhongMaterial)) return;
  if (patched.has(material)) { if (lit) material.userData.rlOn.value = 1; return; }
  patched.add(material);
  const on = material.userData.rlOn = { value: lit ? 1 : 0 };
  const before = material.onBeforeCompile, key = material.customProgramCacheKey;
  material.customProgramCacheKey = () => (key && key !== T.Material.prototype.customProgramCacheKey ? key.call(material) : '') + '|rl';
  material.onBeforeCompile = (shader, renderer) => {
    before?.call(material, shader, renderer);
    Object.assign(shader.uniforms, table, { uRLOn: on });
    shader.vertexShader = 'varying vec3 vRLWorld;\n' + shader.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\nvRLWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;');
    shader.fragmentShader = 'uniform highp sampler2D uRLTable; uniform int uRLCount, uRLRooms; uniform vec3 uRLColor; uniform float uRLOn; varying vec3 vRLWorld;\n'
      + shader.fragmentShader.replace('#include <lights_fragment_end>', '#include <lights_fragment_end>\n' + GLSL);
  };
  material.needsUpdate = true;
}

export function createRoomLights(name, bounds) {
  const room = table.uRLRooms.value;
  if (room >= ROOMS) throw new Error(`${name}: more than ${ROOMS} lit rooms`);
  table.uRLRooms.value++;
  texels.set([bounds.min.x, bounds.min.y, bounds.min.z, 0], row(2, room)); texels.set([bounds.max.x, bounds.max.y, bounds.max.z, 0], row(3, room));
  tableTexture.needsUpdate = true;
  const fittings = [];
  return {
    fittings,
    add(position, power, onLevel = l => {}) {
      const index = table.uRLCount.value;
      if (index >= FITTINGS) throw new Error(`${name}: more than ${FITTINGS} light fittings in all`);
      const f = { index, position: position.clone(), power, on: true, level: 1, onLevel };
      fittings.push(f); table.uRLCount.value++;
      texels.set([position.x, position.y, position.z, power], row(0, index)); texels[row(1, index)] = room; tableTexture.needsUpdate = true;
      onLevel(1);
      return f;
    },
    patch(material) { patchRoomLights(material, true); },
    set(f, on) { f.on = on; },
    // Fade toward the switch state (an LED driver takes a moment); true while anything changes.
    update(dt) {
      let changed = false;
      for (const f of fittings) {
        const target = f.on ? 1 : 0; if (f.level === target) continue;
        f.level = Math.abs(f.level - target) < .01 ? target : T.MathUtils.damp(f.level, target, 16, dt);
        texels[row(0, f.index) + 3] = f.power * f.level; tableTexture.needsUpdate = true; f.onLevel(f.level); changed = true;
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
  const toggles = [...panelRows.map(r => ({ what: 'lights', get: () => r.fittings[0].on, set: on => r.fittings.forEach(f => lights.set(f, on)) })), ...fanRows.map(() => ({ what: 'fans', on: true }))];
  toggles.forEach(t => { if (!t.get) { t.get = () => t.on; t.set = on => { t.on = on; }; } });
  const { group: switches, clickables } = makeSwitchboard(room, { name, ...board, toggles });
  room.traverse(o => { if (o.isMesh) for (const mat of [o.material].flat()) lights.patch(mat); });
  const fanToggles = toggles.slice(panelRows.length), speed = fanRows.map(() => 1);
  room.userData.clickables = clickables;
  room.userData.interior = { bounds, parts: [...fanRows.flat(), switches] }; // main.js draws these only from inside
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
    rocker.userData.what = t.what || 'switch'; rocker.userData.isOn = () => t.get(); // for the exploration's prompt (main.js)
    return rocker;
  });
  group.userData.clickables = clickables;
  return { group, clickables };
}
