import * as T from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { computeBoundsTree, acceleratedRaycast } from 'three-mesh-bvh';

// A walkable human guide the visitor steers around the campus to show where a photo was taken.
// Model: the three.js "Soldier" example (Mixamo) with its own Idle/Walk/Run clips, so every motion matches its
// skeleton. Loads only when the avatar is first switched on.
const WALK = 1.35, RUN = 3.1, TURN = 2.2, STEP_UP = .45, MAX_DROP = .8, RADIUS = .28, EYE = 1.6;

export function createAvatar({ scene, camera, canvas, collidables, changed }) {
  const state = { active: false, eye: false, ready: null, pos: new T.Vector3(0, 0, 13.5), heading: Math.PI, pitch: -.12, speed: 0 };
  const input = { forward: 0, strafe: 0, turn: 0, run: false };
  const root = new T.Group(); root.name = 'Walkable guide avatar'; root.visible = false; scene.add(root);
  let mixer, actions = {}, current, meshes = [], body;
  const ray = new T.Raycaster(); ray.firstHitOnly = true;
  const down = new T.Vector3(0, -1, 0), tmp = new T.Vector3(), forward = new T.Vector3(), right = new T.Vector3();
  const desired = new T.Vector3(), look = new T.Vector3();

  try { const saved = JSON.parse(localStorage.getItem('avatar-pose')); if (saved?.pos) { state.pos.fromArray(saved.pos); state.heading = saved.heading; } } catch {}

  // Soft contact shadow: the sun's shadow map is only re-rendered when the light changes, so a moving
  // figure gets a blurred ground disc instead of re-rendering every tree's shadow each frame.
  const blob = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const r = g.createRadialGradient(32, 32, 2, 32, 32, 31); r.addColorStop(0, 'rgba(0,0,0,.55)'); r.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64);
    const m = new T.Mesh(new T.PlaneGeometry(.9, .9), new T.MeshBasicMaterial({ map: new T.CanvasTexture(c), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 }));
    m.rotation.x = -Math.PI / 2; m.renderOrder = 2; root.add(m); return m;
  })();

  async function load() {
    const loader = new GLTFLoader();
    const person = await loader.loadAsync('/media/avatar/person.glb');
    body = person.scene; body.name = 'Guide figure';
    body.traverse(o => { if (o.isMesh) { o.frustumCulled = false; meshes.push(o); } });
    body.updateMatrixWorld(true); const box = new T.Box3().setFromObject(body); body.scale.multiplyScalar(1.72 / (box.max.y - box.min.y)); // 1.72 m tall
    root.add(body);
    mixer = new T.AnimationMixer(body);
    for (const clip of person.animations) if (['Idle', 'Walk', 'Run'].includes(clip.name)) actions[clip.name] = mixer.clipAction(clip);
    current = actions.Idle; current?.play();
    // Collision against buildings and ground (not foliage): a bounding-volume tree makes each ray cheap.
    for (const mesh of collidables()) if (!mesh.geometry.boundsTree) { mesh.geometry.computeBoundsTree = computeBoundsTree; mesh.geometry.computeBoundsTree(); mesh.raycast = acceleratedRaycast; }
    snapToGround(state.pos, 3);
  }

  function groundAt(p, from) {
    ray.set(tmp.set(p.x, from, p.z), down); ray.far = from - p.y + MAX_DROP + 3;
    return ray.intersectObjects(collidables(), false)[0]?.point.y;
  }
  function snapToGround(p, above = STEP_UP) { const y = groundAt(p, p.y + above); if (y != null) p.y = y; }
  function blocked(from, step) {
    const length = step.length(); if (length < 1e-6) return false;
    tmp.copy(step).divideScalar(length);
    for (const h of [.35, 1.0, 1.55]) { // knees, waist, head
      ray.set(look.copy(from).setY(from.y + h), tmp); ray.far = length + RADIUS;
      if (ray.intersectObjects(collidables(), false)[0]) return true;
    }
    return false;
  }
  function moveBy(step) {
    if (!blocked(state.pos, step)) return tryStep(step);
    // Slide along walls: try each axis on its own.
    return tryStep(tmp.set(step.x, 0, 0).clone(), true) || tryStep(new T.Vector3(0, 0, step.z), true);
  }
  function tryStep(step, check = false) {
    if (check && blocked(state.pos, step)) return false;
    const next = state.pos.clone().add(step), y = groundAt(next, state.pos.y + STEP_UP);
    if (y == null || y < state.pos.y - MAX_DROP) return false; // no walking off roofs or into the void
    next.y = y; state.pos.copy(next); return true;
  }

  function play(name) {
    const next = actions[name]; if (!next || next === current) return;
    next.reset().play(); current?.crossFadeTo(next, .25, false); current = next;
  }

  // Desktop: WASD / arrows walk and turn, Shift runs, mouse drag turns and tilts the view.
  const keys = new Set();
  const keyMap = () => {
    input.forward = (keys.has('w') || keys.has('arrowup') ? 1 : 0) - (keys.has('s') || keys.has('arrowdown') ? 1 : 0);
    input.strafe = (keys.has('d') ? 1 : 0) - (keys.has('a') ? 1 : 0);
    input.turn = (keys.has('arrowleft') || keys.has('q') ? 1 : 0) - (keys.has('arrowright') || keys.has('e') ? 1 : 0);
    input.run = keys.has('shift');
  };
  addEventListener('keydown', e => { if (!state.active || e.target.closest?.('input,select,textarea')) return; const k = e.key.toLowerCase(); if (['w', 'a', 's', 'd', 'q', 'e', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright', 'shift'].includes(k)) { keys.add(k); keyMap(); e.preventDefault(); } });
  addEventListener('keyup', e => { keys.delete(e.key.toLowerCase()); keyMap(); });
  addEventListener('blur', () => { keys.clear(); keyMap(); });
  let drag = null;
  canvas.addEventListener('pointerdown', e => { if (state.active) drag = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
  addEventListener('pointermove', e => {
    if (!drag || e.pointerId !== drag.id) return;
    state.heading -= (e.clientX - drag.x) * .006; state.pitch = T.MathUtils.clamp(state.pitch - (e.clientY - drag.y) * .004, -1.1, .9);
    drag.x = e.clientX; drag.y = e.clientY;
  });
  for (const type of ['pointerup', 'pointercancel']) addEventListener(type, e => { if (drag?.id === e.pointerId) drag = null; });

  const pose = () => {
    forward.set(Math.sin(state.heading), 0, Math.cos(state.heading));
    const facing = (T.MathUtils.radToDeg(Math.atan2(forward.x, -forward.z)) + 360) % 360; // 0 = facing the main entrance
    const toward = facing < 45 || facing >= 315 ? 'the main entrance / building' : facing < 135 ? 'the right (east) wing' : facing < 225 ? 'the gate / road' : 'the left (west) wing';
    const y = state.pos.y, level = y < 2.2 ? 'ground level' : y < 6.4 ? 'first floor' : y < 10.4 ? 'second floor' : 'terrace / roof';
    return { x: +state.pos.x.toFixed(2), y: +y.toFixed(2), z: +state.pos.z.toFixed(2), facing: Math.round(facing), toward, level, eye: state.eye, pitch: Math.round(T.MathUtils.radToDeg(state.pitch)) };
  };

  return {
    state, input, pose,
    get active() { return state.active; },
    async enter() {
      state.active = true; root.visible = true;
      state.ready ||= load();
      await state.ready;
      changed();
    },
    exit() { state.active = false; root.visible = false; keys.clear(); keyMap(); drag = null; changed(); },
    setEye(on) { state.eye = on; if (body) body.visible = !on; blob.visible = !on; changed(); },
    // Exact text to paste into the conversation: position (metres, scene axes) and direction.
    text() { const p = pose(); return `Avatar: x=${p.x} y=${p.y} z=${p.z} (${p.level}), facing ${p.facing}° toward ${p.toward}, view tilt ${p.pitch}°${p.eye ? ', eye view' : ''}`; },
    update(dt) {
      if (!state.active || !mixer) return;
      state.heading += input.turn * TURN * dt;
      forward.set(Math.sin(state.heading), 0, Math.cos(state.heading)); right.set(-forward.z, 0, forward.x);
      const speed = (input.run ? RUN : WALK) * (input.forward || input.strafe ? 1 : 0);
      const step = forward.clone().multiplyScalar(input.forward).addScaledVector(right, input.strafe);
      if (step.lengthSq() > 0) { step.setLength(speed * dt); moveBy(step); }
      play(!speed ? 'Idle' : input.run ? 'Run' : 'Walk');
      if (actions.Walk) actions.Walk.timeScale = input.forward < 0 ? -1 : 1;
      mixer.update(dt);
      root.position.copy(state.pos); body.rotation.y = state.heading + Math.PI; // the Mixamo figure faces -Z blob.position.set(0, .02, 0);
      // Camera: eye view stands where the person stands; follow view sits behind, pulled in before walls.
      const head = look.set(state.pos.x, state.pos.y + EYE, state.pos.z);
      const aim = new T.Vector3(Math.sin(state.heading) * Math.cos(state.pitch), Math.sin(state.pitch), Math.cos(state.heading) * Math.cos(state.pitch));
      if (state.eye) { camera.position.copy(head); camera.lookAt(head.clone().add(aim)); }
      else {
        desired.copy(head).addScaledVector(aim, -3.1).add(new T.Vector3(0, .35, 0));
        const back = desired.clone().sub(head), d = back.length();
        // Check both directions: one-sided surfaces (glass, panels) are only hit from their front, so a single ray
        // from the head missed the back of the entrance transom and parked the camera inside the porch.
        ray.set(head, back.normalize()); ray.far = d;
        let free = ray.intersectObjects(collidables(), false)[0]?.distance ?? d;
        ray.set(desired, back.clone().negate()); ray.far = d; ray.firstHitOnly = false; // need the surface nearest the head
        const reverse = ray.intersectObjects(collidables(), false); ray.firstHitOnly = true;
        if (reverse.length) free = Math.min(free, d - reverse[reverse.length - 1].distance);
        if (free < d) desired.copy(head).addScaledVector(back, Math.max(.35, free - .3));
        camera.position.lerp(desired, 1 - Math.exp(-10 * dt)); camera.lookAt(head.clone().addScaledVector(aim, 2));
      }
      try { if (speed) localStorage.setItem('avatar-pose', JSON.stringify({ pos: state.pos.toArray(), heading: state.heading })); } catch {}
    },
  };
}
