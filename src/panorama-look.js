import * as T from 'three';
import { bindDragLook } from './drag-look.js';

const MIN_EYE = .5;

// Free exploration turns at the eye, without orbiting a distant building centre.
export function createPanoramaLook(camera, canvas, active, changed) {
  const angles = new T.Euler(0, 0, 0, 'YXZ');
  const target = { x: 0, y: 0 };
  const destination = camera.position.clone();
  let turning = false, moving = false, inertia = null, follow = 12;
  const velocity = { x: 0, y: 0, t: 0 };
  const direction = new T.Vector3();
  canvas.addEventListener('contextmenu', e => { if (active()) e.preventDefault(); });
  // Phones: one finger looks, two fingers pinch to walk forward/back and drag together to pan.
  const touches = new Map(); let spread = 0, middle = null;
  const measure = () => { const [a, b] = [...touches.values()]; return { d: Math.hypot(a.x - b.x, a.y - b.y), x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }; };
  canvas.addEventListener('pointerdown', e => {
    if (!active() || e.pointerType !== 'touch') return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size === 2) { const m = measure(); spread = m.d; middle = m; }
  });
  (canvas.ownerDocument || canvas).addEventListener('pointermove', e => {
    if (!touches.has(e.pointerId)) return;
    touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (touches.size !== 2 || !active()) return;
    const m = measure();
    move((m.d - spread) * .025);
    direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
    destination.addScaledVector(direction, -(m.x - middle.x) * .012); destination.y += (m.y - middle.y) * .012;
    spread = m.d; middle = m; changed();
  });
  for (const type of ['pointerup', 'pointercancel']) (canvas.ownerDocument || canvas).addEventListener(type, e => {
    const flick = type === 'pointerup' && touches.size === 1 && touches.has(e.pointerId) && active() && performance.now() - velocity.t < 80;
    touches.delete(e.pointerId);
    // Glide on and ease to a stop, unless the finger rested before lifting.
    if (flick && Math.hypot(velocity.x, velocity.y) > .25) { inertia = { x: T.MathUtils.clamp(velocity.x, -6, 6), y: T.MathUtils.clamp(velocity.y, -6, 6) }; changed(); }
  });
  function move(distance) {
    if (!moving) destination.copy(camera.position);
    camera.getWorldDirection(direction);
    destination.addScaledVector(direction, distance); moving = true;
    changed();
  }
  bindDragLook(canvas, active, () => {
    angles.setFromQuaternion(camera.quaternion, 'YXZ');
    target.x = angles.x; target.y = angles.y; turning = false; inertia = null; velocity.x = velocity.y = 0; velocity.t = performance.now();
    destination.copy(camera.position); moving = false;
  }, (dx, dy, pan) => {
    if (touches.size > 1) return; // a pinch is not a look
    if (pan) {
      direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
      destination.addScaledVector(direction, -dx * .018);
      destination.y += dy * .018; moving = true;
    } else {
      // A finger swipe across a phone's short side turns about 100 degrees; the mouse keeps its finer scale.
      const touch = touches.size > 0, side = touch ? Math.min(canvas.clientWidth || 800, canvas.clientHeight || 800) : canvas.clientHeight || 800;
      const sensitivity = 1.8 / Math.max(360, side);
      target.y -= dx * sensitivity;
      target.x = T.MathUtils.clamp(target.x - dy * sensitivity, -1.35, 1.35);
      turning = true; follow = touch ? 30 : 12; // the view stays under the finger
      // Release velocity (rad/s), smoothed over the last few moves, carries a flick on after the finger lifts.
      const now = performance.now(), span = Math.max(1, now - velocity.t) / 1000, k = Math.min(1, span / .05);
      velocity.y += (-dx * sensitivity / span - velocity.y) * k; velocity.x += (-dy * sensitivity / span - velocity.x) * k; velocity.t = now;
    }
    changed();
  });
  canvas.addEventListener('wheel', e => {
    if (!active()) return;
    e.preventDefault();
    const delta = e.deltaY * (e.deltaMode === 1 ? 33 : e.deltaMode === 2 ? 400 : 1);
    move(T.MathUtils.clamp(-delta * .007, -1.4, 1.4));
  }, { passive: false });
  canvas.addEventListener('keydown', e => {
    if (!active()) return;
    const key = e.key.toLowerCase();
    if (['w', 's', 'arrowup', 'arrowdown'].includes(key)) {
      e.preventDefault(); move(key === 'w' || key === 'arrowup' ? .7 : -.7);
    }
    if (['a', 'd', 'q', 'e'].includes(key)) {
      e.preventDefault();
      if (!moving) destination.copy(camera.position);
      direction.set(key === 'a' ? -1 : key === 'd' ? 1 : 0, 0, 0).applyQuaternion(camera.quaternion);
      direction.y = key === 'q' ? -1 : key === 'e' ? 1 : 0;
      destination.addScaledVector(direction, .7); moving = true; changed();
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      if (!turning) { angles.setFromQuaternion(camera.quaternion, 'YXZ'); target.x = angles.x; target.y = angles.y; }
      target.y += e.key === 'ArrowLeft' ? .09 : -.09; turning = true; changed();
    }
  });
  return {
    move,
    update(dt) {
      if (!active()) { turning = moving = false; inertia = null; return; }
      if (inertia) {
        target.y += inertia.y * dt; target.x = T.MathUtils.clamp(target.x + inertia.x * dt, -1.35, 1.35);
        const decay = Math.exp(-3.2 * dt); inertia.x *= decay; inertia.y *= decay; turning = true;
        if (Math.hypot(inertia.x, inertia.y) < .02) inertia = null;
      }
      if (moving) {
        // Never below ground: the highest terrain is the entrance datum (y = 0), so 0.5 m keeps every view above
        // the ground surface instead of under it, where the building appeared to float over a flat plate.
        destination.y = Math.max(destination.y, MIN_EYE);
        camera.position.lerp(destination, 1 - Math.exp(-12 * dt));
        if (camera.position.distanceToSquared(destination) < .00000001) { camera.position.copy(destination); moving = false; }
        changed();
      }
      if (!turning) return;
      angles.x = T.MathUtils.damp(angles.x, target.x, follow, dt);
      angles.y = T.MathUtils.damp(angles.y, target.y, follow, dt);
      angles.z = 0;
      if (!inertia && Math.abs(angles.x - target.x) + Math.abs(angles.y - target.y) < .00001) {
        angles.x = target.x; angles.y = target.y; turning = false;
      }
      camera.quaternion.setFromEuler(angles); changed();
    },
  };
}
