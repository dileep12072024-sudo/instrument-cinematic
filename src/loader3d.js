// The loading screen (owner, 2026-10-26/27, after a pair of loaders he sent): views of the department fly in and stand
// in 3D, spread round an arch when the site opens, circling a turning ring when the exploration loads. Its markup is in
// the page itself (index.html: loaderMarkup), so it shows and moves before any script has
// loaded; all its motion is CSS on the compositor, which keeps going while the main thread builds the campus.
import './loader3d.css';

const TILES = 16; // public/media/loader/tiles.webp: a 4 x 4 sheet of the stops' own views
export const loaderMarkup = (mode = 'arch') => `<div class="l3d ${mode}" id="l3d" role="status" aria-label="Loading the department">
  <div class="l3d-brand"><b>Instrument Technology</b><i>Andhra University</i></div>
  <p class="l3d-status">Preparing the department</p>
  <div class="l3d-stage" aria-hidden="true"><div class="l3d-group"><div class="l3d-spin">${Array.from({ length: TILES }, (_, k) =>
    `<b class="l3d-slot" style="--k:${k};--sx:${(k % 4) / 3 * 100}%;--sy:${Math.floor(k / 4) / 3 * 100}%"><i class="l3d-tile"></i></b>`).join('')}</div></div></div>
</div>`;

// the one in the page (opening), or a new one (the exploration loading, in the page already open)
export function loader3d({ mode = 'ring', reduced = false } = {}) {
  let el = document.getElementById('l3d');
  if (!el) { document.body.insertAdjacentHTML('beforeend', loaderMarkup(mode)); el = document.getElementById('l3d'); }
  const status = el.querySelector('.l3d-status');
  document.getElementById('loader')?.classList.add('under-l3d');
  let done = false;
  return {
    el,
    // two frames for the compositor to take the animation over before the build blocks the main thread
    shown: () => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))),
    status(text) { if (!done && text) status.textContent = text; },
    // the build is done: the view flies into the views and the campus is behind them
    finish() {
      if (done) return Promise.resolve(); done = true;
      return new Promise(resolve => {
        el.classList.add('out');
        setTimeout(() => { el.remove(); document.getElementById('loader')?.classList.remove('under-l3d'); resolve(); }, reduced ? 300 : 1500);
      });
    },
  };
}
