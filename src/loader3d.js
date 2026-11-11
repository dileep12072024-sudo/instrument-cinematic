// The loading screen (owner, 2026-11-11: a stylish single line): the department's name, one fine line that fills as the
// campus is built, a light travelling along it, and the stage in words. Its markup is in the page itself (index.html),
// so it shows before any script has loaded; its motion is CSS on the compositor, which keeps going while the main
// thread builds the campus.
import './loader3d.css';

export function loader3d({ reduced = false } = {}) {
  const el = document.getElementById('l3d'), status = el?.querySelector('.l3d-status');
  document.getElementById('loader')?.classList.add('under-l3d');
  let done = false;
  return {
    el,
    // two frames for the compositor to take the animation over before the build blocks the main thread
    shown: () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    status(text) { if (!done && text && status) status.textContent = text; },
    // how far the build is, 0..1: the line fills to it (a transition, so it moves on while the thread is busy)
    progress(p) { if (!done) el?.style.setProperty('--p', Math.max(0, Math.min(1, p)).toFixed(3)); },
    // the build is done: the line completes and the screen clears to the campus behind it
    finish() {
      if (done || !el) return Promise.resolve(); done = true; el.style.setProperty('--p', '1');
      return new Promise(resolve => {
        el.classList.add('out');
        setTimeout(() => { el.remove(); document.getElementById('loader')?.classList.remove('under-l3d'); resolve(); }, reduced ? 300 : 1100);
      });
    },
  };
}
