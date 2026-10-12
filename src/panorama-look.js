import * as T from 'three';
import { bindDragLook } from './drag-look.js';

// Free exploration turns at the eye, without orbiting a distant building centre.
export function createPanoramaLook(camera, canvas, active, changed) {
  const angles = new T.Euler(0, 0, 0, 'YXZ');
  const target = { x: 0, y: 0 };
  const destination = camera.position.clone();
  let turning = false, moving = false;
  const direction = new T.Vector3();
  canvas.addEventListener('contextmenu', e => { if (active()) e.preventDefault(); });
  function move(distance) {
    if (!moving) destination.copy(camera.position);
    camera.getWorldDirection(direction);
    destination.addScaledVector(direction, distance); moving = true;
    changed();
  }
  bindDragLook(canvas, active, () => {
    angles.setFromQuaternion(camera.quaternion, 'YXZ');
    target.x = angles.x; target.y = angles.y; turning = false;
    destination.copy(camera.position); moving = false;
  }, (dx, dy, pan) => {
    if (pan) {
      direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
      destination.addScaledVector(direction, -dx * .018);
      destination.y += dy * .018; moving = true;
    } else {
      const sensitivity = 1.8 / Math.max(360, canvas.clientHeight || 800);
      target.y -= dx * sensitivity;
      target.x = T.MathUtils.clamp(target.x - dy * sensitivity, -1.35, 1.35);
      turning = true;
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
      if (!active()) { turning = moving = false; return; }
      if (moving) {
        camera.position.lerp(destination, 1 - Math.exp(-12 * dt));
        if (camera.position.distanceToSquared(destination) < .00000001) { camera.position.copy(destination); moving = false; }
        changed();
      }
      if (!turning) return;
      angles.x = T.MathUtils.damp(angles.x, target.x, 12, dt);
      angles.y = T.MathUtils.damp(angles.y, target.y, 12, dt);
      angles.z = 0;
      if (Math.abs(angles.x - target.x) + Math.abs(angles.y - target.y) < .00001) {
        angles.x = target.x; angles.y = target.y; turning = false;
      }
      camera.quaternion.setFromEuler(angles); changed();
    },
  };
}
