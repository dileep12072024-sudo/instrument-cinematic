import * as T from 'three';
import * as C from './portfolio-content.js';

// The portfolio layer (docs/portfolio-layer.md): the first thing a visitor sees. A normal scrolling document over the
// fixed live campus; every chapter is a camera waypoint, the scroll position is damped onto a curve through them (the
// pattern of mengto.github.io/kage). It opens on the building rising out of the land (rise.js), then the wordmark
// rises from the lawn, and it ends by handing the visitor to the exploration or avatar layer.

const smooth = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// Headings arrive word by word the first time they are seen; the visible words carry no meaning of their own.
const words = text => `<span class="pf-sr">${esc(text)}</span><span class="pf-words" aria-hidden="true">${esc(text).split(' ').map((w, i) => `<span class="pf-w"><span style="--i:${i}">${w}</span></span>`).join(' ')}</span>`;
const tel = n => `<a href="tel:${n.replace(/[^0-9+]/g, '')}">${esc(n)}</a>`;

function markup() {
  const { hero, heritage, programmes, people, labs, guide, enter, footer, department } = C;
  const first = heritage.events[0].year, last = new Date().getFullYear(), at = y => ((y - first) / (last - first) * 100).toFixed(2);
  return `
  <div class="pf-veil" aria-hidden="true"></div>
  <header class="pf-bar">
    <a class="pf-mark" href="#arrival" aria-label="${esc(department.name)}, top"><span class="pf-glyph" aria-hidden="true"></span><span>${esc(department.short)}<small>${esc(department.university)}</small></span></a>
    <button class="pf-skip" data-enter="explore">${esc(enter.explore)}</button>
  </header>
  <nav class="pf-scale" aria-label="Chapters">
    <span class="pf-ticks" aria-hidden="true"></span><span class="pf-needle" aria-hidden="true"></span>
    ${C.chapters.map((c, i) => `<a href="#${c.id}" class="pf-major" style="--at:${(i / (C.chapters.length - 1) * 100).toFixed(2)}%"><span>${esc(c.scale)}</span></a>`).join('')}
  </nav>
  <main class="pf-doc">
    <section id="arrival" class="pf-sec pf-hero" data-cam="0">
      <div class="pf-copy">
        <h1 class="pf-display">${words(hero.title)}</h1>
        <p class="pf-te" lang="te">${esc(hero.telugu)}</p>
        <p class="pf-lead">${esc(hero.lead)}</p>
      </div>
      <p class="pf-cue" aria-hidden="true"><span></span>${esc(hero.cue)}</p>
    </section>

    <section id="heritage" class="pf-sec" data-cam="1">
      <div class="pf-copy">
        <h2 class="pf-display">${words(heritage.title)}</h2>
        <p class="pf-te" lang="te">${esc(heritage.telugu)}</p>
        <p class="pf-lead">${esc(heritage.lead)}</p>
      </div>
      <figure class="pf-timeline" aria-label="Timeline from ${first} to today">
        <div class="pf-rule" aria-hidden="true">${Array.from({ length: Math.floor((last - first) / 10) + 1 }, (_, k) => first + k * 10 - (first % 10) + 10).filter(y => y <= last).map(y => `<span style="--at:${at(y)}%">${y}</span>`).join('')}</div>
        <ol>${heritage.events.map(e => `<li style="--at:${at(e.year)}%"><b>${e.year}</b><span>${esc(e.text)}</span></li>`).join('')}</ol>
        <figcaption>${esc(heritage.now)}</figcaption>
      </figure>
    </section>

    <section id="programmes" class="pf-sec" data-cam="2">
      <div class="pf-copy">
        <h2 class="pf-display">${words(programmes.title)}</h2>
        <p class="pf-te" lang="te">${esc(programmes.telugu)}</p>
        <p class="pf-lead">${esc(programmes.lead)}</p>
        <dl class="pf-readouts">${programmes.list.map(p => `<div><dt>${esc(p.name)}</dt><dd class="pf-len">${esc(p.length)}</dd><dd>${esc(p.entry)}</dd></div>`).join('')}</dl>
        <details class="pf-more"><summary>${esc(programmes.objectivesTitle)}</summary><ol>${programmes.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ol></details>
      </div>
    </section>

    <section id="people" class="pf-sec" data-cam="3">
      <div class="pf-copy">
        <h2 class="pf-display">${words(people.title)}</h2>
        <p class="pf-te" lang="te">${esc(people.telugu)}</p>
        <p class="pf-head"><b>${esc(people.head.name)}</b><span>${esc(people.head.role)}. ${esc(people.head.area)}.</span></p>
        <ul class="pf-names">${people.faculty.map(f => `<li><b>${esc(f.name)}</b><span>${esc(f.area)}</span></li>`).join('')}</ul>
        <details class="pf-more"><summary>${esc(people.staffTitle)}</summary><ul class="pf-staff">${people.staff.map(([n, r]) => `<li><b>${esc(n)}</b> ${esc(r)}</li>`).join('')}</ul></details>
        <p class="pf-note">${esc(people.headsNote)}</p>
      </div>
    </section>

    <section id="labs" class="pf-sec" data-cam="4">
      <div class="pf-copy">
        <h2 class="pf-display">${words(labs.title)}</h2>
        <p class="pf-te" lang="te">${esc(labs.telugu)}</p>
        <p class="pf-lead">${esc(labs.lead)}</p>
        <ul class="pf-labs">${labs.list.map(l => `<li><b>${esc(l.name)}</b><span>${esc(l.where)}</span></li>`).join('')}</ul>
        <p class="pf-research">${labs.research.map(esc).join('<i aria-hidden="true"></i>')}</p>
        <ul class="pf-facts">${labs.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
    </section>

    <section id="guide" class="pf-sec" data-cam="5">
      <div class="pf-copy pf-wide">
        <h2 class="pf-display">${words(guide.title)}</h2>
        <p class="pf-te" lang="te">${esc(guide.telugu)}</p>
        <div class="pf-guide">${guide.groups.map(g => `<div><h3>${esc(g.title)}</h3>${g.items ? `<ul>${g.items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>` : ''}${g.contacts ? `<dl class="pf-calls">${g.contacts.map(([n, v]) => `<div><dt>${esc(n)}</dt><dd>${tel(v)}</dd></div>`).join('')}</dl>` : ''}</div>`).join('')}</div>
      </div>
    </section>

    <section id="enter" class="pf-sec pf-finale" data-cam="6">
      <div class="pf-copy">
        <h2 class="pf-display pf-big">${words(enter.title)}</h2>
        <p class="pf-te" lang="te">${esc(enter.telugu)}</p>
        <p class="pf-lead">${esc(enter.lead)}</p>
        <div class="pf-doors"><button class="pf-door" data-enter="explore">${esc(enter.explore)}</button><button class="pf-door pf-alt" data-enter="walk">${esc(enter.walk)}</button></div>
      </div>
    </section>
    <footer class="pf-foot">
      <address>${footer.address.map(esc).join('<br>')}</address>
      <p>${footer.phones.map(p => { const [label, n] = p.split(/ (?=\d)/); return `${esc(label)} ${tel(n)}`; }).join('<br>')}</p>
      <p class="pf-colophon">${esc(footer.note)}</p>
    </footer>
  </main>`;
}

// "INSTRUMENT" standing on the front lawn: one plane per glyph, painted with the display face, rising out of the
// ground after the building and dissolving as the camera passes through it on the way to the porch.
async function buildWordmark(scene) {
  const word = 'INSTRUMENT', height = 4.2, z = 25, group = new T.Group(); group.name = 'Portfolio wordmark'; scene.add(group);
  try { await document.fonts.load('700 200px "Instrument Sans"'); } catch {}
  const glyphs = [], measure = document.createElement('canvas').getContext('2d'); measure.font = '700 400px "Instrument Sans"';
  const widths = [...word].map(ch => measure.measureText(ch).width / 400 * height * 1.04), gap = height * .1;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x = -total / 2;
  [...word].forEach((ch, i) => {
    const w = widths[i], c = document.createElement('canvas'); c.width = Math.ceil(w / height * 512); c.height = 512;
    const g = c.getContext('2d'); g.font = '700 400px "Instrument Sans"'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    const wash = g.createLinearGradient(0, 40, 0, 470); wash.addColorStop(0, '#f4efe0'); wash.addColorStop(.7, '#e6dfca'); wash.addColorStop(1, '#a99f86'); // whitewash, darker at the foot
    g.fillStyle = wash; g.fillText(ch, c.width / 2, 470);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const material = new T.MeshStandardMaterial({ map, transparent: true, alphaTest: .02, roughness: .8, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: 0, depthWrite: true, side: T.DoubleSide });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, height), material); mesh.position.set(x + w / 2, height / 2 - .25, z); mesh.renderOrder = 1;
    group.add(mesh); glyphs.push({ mesh, material, base: mesh.position.y, delay: i * .07 }); x += w + gap;
  });
  return { group, glyphs, z };
}

export function createPortfolio({ scene, camera, reduced, onEnter, changed }) {
  const root = document.createElement('div'); root.id = 'portfolio'; root.innerHTML = markup(); document.body.append(root);
  const sections = [...root.querySelectorAll('[data-cam]')], cams = C.chapters.map(c => c.cam);
  const curveP = new T.CatmullRomCurve3(cams.map(c => new T.Vector3(...c.eye)), false, 'catmullrom', .42);
  const curveT = new T.CatmullRomCurve3(cams.map(c => new T.Vector3(...c.target)), false, 'catmullrom', .42);
  const rig = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: reduced ? 1 : 0 };
  let anchors = [], maxScroll = 1, active = true, wordmark = null, wordT = reduced ? 99 : -1, lastActive = -1;
  const p = new T.Vector3(), t = new T.Vector3(), d = new T.Vector3();
  const vw = () => innerWidth, vh = () => innerHeight;

  function measure() {
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh());
    anchors = sections.map((el, i) => i === 0 ? 0 : i === sections.length - 1 ? Math.min(maxScroll, el.offsetTop + el.offsetHeight * .5 - vh() * .5) : Math.max(0, Math.min(maxScroll, el.offsetTop + el.offsetHeight * .5 - vh() * .5)));
    for (let i = 1; i < anchors.length; i++) anchors[i] = Math.max(anchors[i], anchors[i - 1] + 1);
    // the ruler's ticks: one every 2% of the document, a longer one every 10%
    root.querySelector('.pf-ticks').innerHTML = Array.from({ length: 51 }, (_, k) => `<i style="--at:${k * 2}%"${k % 5 ? '' : ' class="l"'}></i>`).join('');
  }
  function progressFor(y) {
    if (y <= anchors[0]) return 0;
    for (let i = 0; i < anchors.length - 1; i++) if (y <= anchors[i + 1]) return i + (y - anchors[i]) / (anchors[i + 1] - anchors[i]);
    return anchors.length - 1;
  }
  // Tall frames: the waypoints are composed wide, so the rig steps back along its view axis and opens the lens.
  const tall = () => Math.min(1, Math.max(0, (1.62 - vw() / vh()) / 1.05));
  // The arrival: from low and far down the drive, on a long lens, in to the hero framing while the building rises.
  const introFrom = { eye: new T.Vector3(1.2, 1.25, 74), target: new T.Vector3(0, 5.2, 0), fov: 26 };

  function apply() {
    const N = cams.length - 1, u = Math.min(1, Math.max(0, rig.smooth / N));
    curveP.getPoint(u, p); curveT.getPoint(u, t);
    const i = Math.min(N - 1, Math.floor(rig.smooth)), f = Math.min(1, Math.max(0, rig.smooth - i));
    let fov = cams[i].fov + (cams[i + 1].fov - cams[i].fov) * f;
    const nf = tall();
    if (nf > 0) { d.subVectors(p, t).normalize(); p.addScaledVector(d, nf * 9); p.y += nf * 1.2; fov *= 1 + nf * .4; }
    const io = 1 - smooth(0, 1, rig.intro), e = io * io * (3 - 2 * io);
    if (e > 0) { p.lerp(introFrom.eye, e); t.lerp(introFrom.target, e); fov += (introFrom.fov - fov) * e; }
    const par = 1 - smooth(0, 1.4, rig.smooth) * .6; // hand-held drift, quieter after the hero
    p.x += rig.mx * .6 * par; p.y += rig.my * .3 * par; t.x -= rig.mx * .2 * par; t.y -= rig.my * .12 * par;
    camera.position.copy(p); camera.lookAt(t);
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  const needle = root.querySelector('.pf-needle'), majors = [...root.querySelectorAll('.pf-major')];
  function onScroll() { rig.prog = progressFor(scrollY); }
  addEventListener('scroll', onScroll, { passive: true });
  addEventListener('resize', () => { measure(); onScroll(); });
  addEventListener('pointermove', e => { if (!active || e.pointerType === 'touch') return; rig.tmx = e.clientX / vw() * 2 - 1; rig.tmy = -(e.clientY / vh() * 2 - 1); }, { passive: true });
  root.addEventListener('click', e => {
    const door = e.target.closest('[data-enter]'); if (door) { onEnter(door.dataset.enter); return; }
    const jump = e.target.closest('a[href^="#"]'); if (!jump) return;
    const el = document.getElementById(jump.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault(); const i = sections.indexOf(el); scrollTo({ top: i >= 0 ? anchors[i] : el.offsetTop, behavior: reduced ? 'auto' : 'smooth' });
  });
  // First sight of a heading plays its words in; after that it simply stays.
  const seen = new IntersectionObserver(entries => { for (const en of entries) if (en.isIntersecting) { en.target.classList.add('in'); seen.unobserve(en.target); } }, { threshold: .35 });
  root.querySelectorAll('.pf-sec').forEach(s => seen.observe(s));

  buildWordmark(scene).then(w => { wordmark = w; for (const g of w.glyphs) g.mesh.position.y = g.base - 5; changed(); });

  measure(); onScroll(); rig.smooth = rig.prog;
  return {
    root,
    get active() { return active; },
    // The arrival clock (0..1 over the rise) and the wordmark's own clock in seconds (it starts near the rise's end).
    setIntro(x) { rig.intro = x; },
    startWordmark() { if (wordT < 0) wordT = 0; },
    show() { active = true; document.documentElement.classList.add('portfolio-mode'); root.hidden = false; measure(); onScroll(); },
    hide() { active = false; document.documentElement.classList.remove('portfolio-mode'); root.hidden = true; if (wordmark) wordmark.group.visible = false; },
    update(dt) {
      if (!active) return false;
      const before = rig.smooth;
      rig.smooth = reduced ? rig.prog : T.MathUtils.damp(rig.smooth, rig.prog, 3.2, dt);
      if (Math.abs(rig.smooth - rig.prog) < 1e-4) rig.smooth = rig.prog;
      rig.mx = T.MathUtils.damp(rig.mx, reduced ? 0 : rig.tmx, 2, dt); rig.my = T.MathUtils.damp(rig.my, reduced ? 0 : rig.tmy, 2, dt);
      apply();
      // the scale: needle on the document position, the current chapter's tick lit
      needle.style.setProperty('--at', `${(rig.smooth / (cams.length - 1) * 100).toFixed(3)}%`);
      const current = Math.round(rig.smooth); if (current !== lastActive) { majors.forEach((m, k) => m.classList.toggle('on', k === current)); lastActive = current; }
      let moving = Math.abs(before - rig.smooth) > 1e-5 || Math.abs(rig.mx - rig.tmx) > 1e-3 || Math.abs(rig.my - rig.tmy) > 1e-3 || rig.intro < 1;
      if (wordmark) {
        if (wordT >= 0 && wordT < 3) { wordT += dt; moving = true; }
        const near = 1 - smooth(.25, .75, rig.smooth); // gone by the time the camera reaches the porch
        wordmark.group.visible = near > .01 && wordT > 0;
        for (const g of wordmark.glyphs) {
          const k = smooth(g.delay, g.delay + .9, wordT), back = 1 + 1.7 * (k - 1) ** 3 + .7 * (k - 1) ** 2; // rises with a little overshoot
          g.mesh.position.y = g.base - 5 * (1 - back); g.material.opacity = near; g.material.emissiveIntensity = .12;
        }
      }
      return moving;
    },
  };
}
