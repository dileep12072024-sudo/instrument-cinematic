import * as T from 'three';

// Free exploration turns at the eye, without orbiting a distant building centre.
export function createPanoramaLook(camera, canvas, active, changed) {
  let pointer = null;
  const angles = new T.Euler(0, 0, 0, 'YXZ');
  const direction = new T.Vector3();
  canvas.addEventListener('contextmenu', e => { if (active()) e.preventDefault(); });
  function move(distance) {
    camera.getWorldDirection(direction);
    camera.position.addScaledVector(direction, distance);
    changed();
  }
  canvas.addEventListener('pointerdown', e => {
    if (!active() || pointer) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: e.button === 2 };
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if (!active() || pointer?.id !== e.pointerId) return;
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    if (pointer.pan) {
      direction.set(1, 0, 0).applyQuaternion(camera.quaternion);
      camera.position.addScaledVector(direction, -dx * .018);
      camera.position.y += dy * .018;
    } else {
      angles.setFromQuaternion(camera.quaternion, 'YXZ');
      angles.y -= dx * .0025;
      angles.x = T.MathUtils.clamp(angles.x - dy * .0025, -1.35, 1.35);
      angles.z = 0;
      camera.quaternion.setFromEuler(angles);
    }
    pointer.x = e.clientX; pointer.y = e.clientY;
    changed();
  });
  const release = e => { if (pointer?.id === e.pointerId) pointer = null; };
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) canvas.addEventListener(event, release);
  canvas.addEventListener('wheel', e => {
    if (!active()) return;
    e.preventDefault(); move(-Math.sign(e.deltaY) * .7);
  }, { passive: false });
  canvas.addEventListener('keydown', e => {
    if (!active()) return;
    if (['w', 's', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
      e.preventDefault(); move(e.key === 'w' || e.key === 'ArrowUp' ? .7 : -.7);
    }
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault(); angles.setFromQuaternion(camera.quaternion, 'YXZ');
      angles.y += e.key === 'ArrowLeft' ? .09 : -.09; angles.z = 0;
      camera.quaternion.setFromEuler(angles); changed();
    }
  });
  return { move };
}
