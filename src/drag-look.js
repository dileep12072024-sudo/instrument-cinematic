// Track releases outside the canvas, and recover after a window switch or lost capture.
export function bindDragLook(canvas, active, start, move) {
  const owner = canvas.ownerDocument || canvas;
  let pointer = null;
  const release = () => { pointer = null; };
  canvas.addEventListener('pointerdown', e => {
    if (!active() || e.isPrimary === false) return;
    canvas.focus({ preventScroll: true });
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY, pan: e.button === 2 || e.button === 1 || e.shiftKey };
    // Document listeners remain usable when capture is unavailable or interrupted.
    try { canvas.setPointerCapture(e.pointerId); } catch {}
    start?.();
  });
  owner.addEventListener('pointermove', e => {
    if (!active()) { release(); return; }
    if (pointer?.id !== e.pointerId) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) { release(); return; }
    const dx = e.clientX - pointer.x, dy = e.clientY - pointer.y;
    pointer.x = e.clientX; pointer.y = e.clientY;
    move(dx, dy, pointer.pan);
  });
  const end = e => { if (pointer?.id === e.pointerId) release(); };
  owner.addEventListener('pointerup', end);
  owner.addEventListener('pointercancel', end);
  canvas.addEventListener('lostpointercapture', end);
  owner.defaultView?.addEventListener('blur', release);
  owner.addEventListener('visibilitychange', release);
  return release;
}
