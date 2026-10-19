import * as T from 'three';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import * as C from './portfolio-content.js';
import './portfolio.css';

gsap.registerPlugin(SplitText);
gsap.ticker.lagSmoothing(250, 1000 / 60); // the arrival keeps wall time through slow frames, but one long stall (a first draw) pauses it instead of skipping it, as the rise does (main.js)

// The portfolio layer (docs/portfolio-layer.md, plan v2): the first thing a visitor sees. A normal scrolling document
// over the fixed live campus, after mengto.github.io/kage: every chapter is a camera waypoint and the scroll position,
// damped, drives the camera. Here the waypoints are real doors inside the building, and between them the camera walks
// the corridors, steps and stairs instead of flying a curve through the walls. A chapter holds at its door while it is
// read; the walk happens in the scroll between chapters, as long as the real distance.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const tel = n => `<a href="tel:${n.replace(/[^0-9+]/g, '')}" data-cursor>${esc(n)}</a>`;
const linkify = s => esc(s).replace(/[\w.]+@[\w.]+\w/g, m => `<a href="mailto:${m}" data-cursor>${m}</a>`).replace(/\b(0891 \d{7}|0891 \d{6,7}|\d{10})\b/g, m => tel(m));
const arrow = '<svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 11 11 3M5 3h6v6" stroke="currentColor" stroke-width="1.3"/></svg>';
const angle = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const lerpAngle = (a, b, k) => a + angle(a, b) * k;
const OVERLAY = 3; // camera layer for the cursor wisps and the leaves: the main view only, never the live windows

// ---------------------------------------------------------------------------------------------------------- markup
function markup() {
  const { hero, heritage, admissions, labs, guide, hod, faculty, enter, footer, credits, chapters, views } = C;
  const nav = chapters.filter(c => ['heritage', 'admissions', 'labs', 'faculty', 'enter'].includes(c.id));
  const sec = (c, i, n) => `<div class="pf-sec-head" data-rv="fade"><span class="k"><b>${String(n).padStart(2, '0')}</b> ${esc(c.nav)}</span><span class="rule"></span><span class="k">${esc(c.where)}</span></div>`;
  const view = (name, cls = '') => { const v = views[name]; return `<figure class="pf-view ${cls}" data-view="${name}" data-cursor><span class="pf-view-fr" data-frame></span><span class="pf-view-ar">${arrow}</span><figcaption><b>${esc(v.label)}</b><i>${esc(v.note)}</i></figcaption></figure>`; };
  const ch = Object.fromEntries(chapters.map((c, i) => [c.id, i]));
  return `
  <div class="pf-night" aria-hidden="true"></div>
  <div class="pf-scrim" aria-hidden="true"></div>
  <div class="pf-veil" aria-hidden="true"></div>
  <div class="pf-vignette" aria-hidden="true"></div>
  <div class="pf-grain" aria-hidden="true"></div>
  <header class="pf-nav">
    <a class="pf-brand" href="#arrival" data-cursor aria-label="${esc(C.department.name)}, back to the start"><span class="pf-glyph" aria-hidden="true"></span><span class="pf-brand-tx"><b>Instrument Technology</b><i>Andhra University</i></span></a>
    <nav class="pf-links" id="pf-links" aria-label="Chapters">${nav.map(c => `<a class="pf-link" href="#${c.id}" data-cursor><span>${esc(c.nav)}</span><span class="alt" aria-hidden="true">${esc(c.where)}</span></a>`).join('')}</nav>
    <button class="pf-skip" data-enter="explore" data-cursor>Explore the campus</button>
    <button class="pf-burger" aria-label="Chapters" aria-controls="pf-links" aria-expanded="false" data-cursor><i></i><i></i></button>
  </header>
  <nav class="pf-rail" aria-label="Chapter position">${chapters.slice(0, -1).map((c, i) => `<button data-rail="${i}" aria-label="${esc(c.nav)}" title="${esc(c.nav)}"><i></i></button>`).join('')}</nav>
  <p class="pf-where" aria-live="polite"><span class="pf-where-dot"></span><span class="pf-where-tx"></span></p>
  <main class="pf-doc">
    <section id="arrival" class="pf-sec pf-hero" data-cam="${ch.arrival}">
      <div class="pf-hero-top">
        <p class="pf-eyebrow pf-live" data-rv="fade"><span class="dot"></span><span class="pf-live-tx">Live from Visakhapatnam</span></p>
        <h1 class="pf-display pf-h-hero" aria-label="${esc(hero.lines.join(' '))}">${hero.lines.map(l => `<span class="pf-line">${esc(l)}</span>`).join('')}</h1>
        <p class="pf-hero-sub" data-rv="up">${esc(hero.lead)}</p>
      </div>
      <div class="pf-hero-foot">
        <p class="pf-cue" data-rv="fade"><span>${esc(hero.cue)}</span><span class="track"><i></i></span></p>
        <div class="pf-chips">${hero.chips.map(c => `<a class="pf-chip" href="#${c.to}" data-chip="${c.view}" data-rv="up" data-cursor><span class="num">${c.n}</span><span class="tx"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></span></a>`).join('')}</div>
      </div>
      <div class="pf-peek" data-rv="fade">${view(hero.peek, 'pf-lens')}</div>
    </section>
    <div class="pf-walk" data-walk="${ch.heritage}"></div>

    <section id="heritage" class="pf-sec" data-cam="${ch.heritage}">
      ${sec(chapters[ch.heritage], ch.heritage, 1)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(heritage.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(heritage.lead)}</p>
        <ol class="pf-years" data-rv="up">${heritage.events.map(e => `<li><b>${e.year}</b><span>${esc(e.text)}</span></li>`).join('')}</ol>
        <p class="pf-note" data-rv="up">${esc(heritage.now)}</p>
      </div>
      <div class="pf-stats" data-rv="up">${heritage.stats.map(([b, s]) => `<div><b>${esc(b)}</b><span>${esc(s)}</span></div>`).join('')}</div>
    </section>
    <div class="pf-walk" data-walk="${ch.admissions}"></div>

    <section id="admissions" class="pf-sec" data-cam="${ch.admissions}">
      ${sec(chapters[ch.admissions], ch.admissions, 2)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(admissions.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(admissions.lead)}</p>
        <dl class="pf-programmes">${admissions.list.map(p => `<div data-rv="up"><dt>${esc(p.name)}</dt><dd class="len">${esc(p.length)}</dd><dd>${esc(p.entry)}</dd></div>`).join('')}</dl>
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(admissions.objectivesTitle)}</summary><ol>${admissions.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ol></details>
      </div>
    </section>
    <div class="pf-walk" data-walk="${ch.labs}"></div>

    <section id="labs" class="pf-sec" data-cam="${ch.labs}">
      ${sec(chapters[ch.labs], ch.labs, 3)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(labs.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(labs.lead)}</p>
      </div>
      <div class="pf-cards">${labs.cards.map((v, i) => `<div class="pf-card" data-rv="up">${view(v)}<p class="pf-card-meta"><span>${esc(C.views[v].note)}</span><span>0${i + 1} / 0${labs.cards.length}</span></p></div>`).join('')}</div>
      <div class="pf-copy pf-copy-2">
        <ul class="pf-labs" data-rv="up">${labs.list.map(l => `<li><b>${esc(l.name)}</b><span>${esc(l.where)}</span></li>`).join('')}</ul>
        <p class="pf-research" data-rv="up">${labs.research.map(r => `<span>${esc(r)}</span>`).join('')}</p>
        <ul class="pf-facts" data-rv="up">${labs.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>
      </div>
    </section>
    <div class="pf-walk" data-walk="${ch.guide}"></div>

    <section id="guide" class="pf-sec" data-cam="${ch.guide}">
      ${sec(chapters[ch.guide], ch.guide, 4)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(guide.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(guide.lead)}</p>
        ${guide.groups.map(g => `<div class="pf-group" data-rv="up"><h3>${esc(g.title)}</h3>${g.items ? `<ul>${g.items.map(i => `<li>${linkify(i)}</li>`).join('')}</ul>` : ''}${g.contacts ? `<dl class="pf-calls">${g.contacts.map(([n, v]) => `<div><dt>${esc(n)}</dt><dd>${tel(v)}</dd></div>`).join('')}</dl>` : ''}</div>`).join('')}
      </div>
    </section>
    <div class="pf-walk" data-walk="${ch.hod}"></div>

    <section id="hod" class="pf-sec" data-cam="${ch.hod}">
      ${sec(chapters[ch.hod], ch.hod, 5)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(hod.title)}</h2>
        <div class="pf-hod" data-rv="up"><b>${esc(hod.name)}</b><span>${esc(hod.role)}</span><span>${esc(hod.degrees)}. ${esc(hod.area)}.</span></div>
        <p class="pf-lead" data-rv="up">${esc(hod.room)} ${esc(hod.lead)}</p>
        <ul class="pf-next">${hod.next.map(n => `<li data-rv="up" data-show="${n.view}" data-cursor tabindex="0"><b>${esc(n.name)}</b><span>${esc(n.text)}</span></li>`).join('')}</ul>
      </div>
      <div class="pf-side-lens" data-rv="fade">${view('swapna', 'pf-lens')}</div>
    </section>
    <div class="pf-walk" data-walk="${ch.faculty}"></div>

    <section id="faculty" class="pf-sec" data-cam="${ch.faculty}">
      ${sec(chapters[ch.faculty], ch.faculty, 6)}
      <div class="pf-copy">
        <h2 class="pf-display">${esc(faculty.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(faculty.lead)}</p>
      </div>
      <div class="pf-people">${faculty.people.map((p, i) => `<div class="pf-person" data-rv="up" ${p.view ? `data-show="${p.view}" tabindex="0"` : ''} data-cursor><span class="k">${String(i + 1).padStart(2, '0')}</span><h3>${esc(p.name)}<em>${esc(p.role)}</em></h3><p>${esc(p.area)}</p><span class="t">${esc(p.room || 'Room not shown in the model')}</span><i class="bar"></i></div>`).join('')}</div>
      <div class="pf-side-lens" data-rv="fade">${view('ysrao', 'pf-lens')}</div>
      <div class="pf-copy pf-copy-2">
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(faculty.staffTitle)}</summary><ul class="pf-staff">${faculty.staff.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ul></details>
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(faculty.headsTitle)}</summary><ol class="pf-staff">${faculty.heads.map(([n, r]) => `<li><b>${esc(n)}</b><span>${esc(r)}</span></li>`).join('')}</ol><p class="pf-note">${esc(faculty.headsNote)}</p></details>
      </div>
    </section>
    <div class="pf-walk" data-walk="${ch.enter}"></div>

    <section id="enter" class="pf-sec pf-fin" data-cam="${ch.enter}">
      <p class="pf-eyebrow" data-rv="fade"><span class="dot"></span>Chapter 07, ${esc(chapters[ch.enter].where)}</p>
      <h2 class="pf-display pf-big">${esc(enter.title)}</h2>
      <p class="pf-lead" data-rv="up">${esc(enter.lead)}</p>
      <div class="pf-doors" data-rv="up"><button class="pf-cta" data-enter="explore" data-cursor><i></i><span>${esc(enter.explore)}</span>${arrow}</button><button class="pf-cta pf-alt" data-enter="walk" data-cursor><i></i><span>${esc(enter.walk)}</span>${arrow}</button></div>
    </section>
    <div class="pf-walk" data-walk="${ch.foot}"></div>

    <footer class="pf-foot" data-cam="${ch.foot}">
      <div class="pf-foot-grid">
        <div class="pf-foot-brand"><span class="pf-glyph" aria-hidden="true"></span><address>${footer.address.map(esc).join('<br>')}</address></div>
        <div><h4>Chapters</h4><ul>${nav.map(c => `<li><a href="#${c.id}" data-cursor>${esc(c.nav)}</a></li>`).join('')}</ul></div>
        <div><h4>Contact</h4><ul>${footer.phones.map(([l, n]) => `<li>${esc(l)} ${tel(n)}</li>`).join('')}</ul></div>
        <div><h4>Credits</h4><ul><li>Made by ${esc(credits.maker.name)}, <a href="${credits.maker.link}" target="_blank" rel="noopener" data-cursor>${esc(credits.maker.linkText)}</a></li><li>Guided by ${esc(credits.guide.name)}, <a href="${credits.guide.link}" target="_blank" rel="noopener" data-cursor>${esc(credits.guide.org)}</a></li></ul></div>
      </div>
      <div class="pf-foot-base"><span>${esc(footer.note)}</span><span>Three.js, live sky over Visakhapatnam</span></div>
    </footer>
  </main>
  <div class="pf-cursor" aria-hidden="true"></div>`;
}

// -------------------------------------------------------------------------------------------------- the wordmark
// "INSTRUMENT" standing on the front lawn: one plane per glyph, rising out of the ground after the building and
// dissolving as the camera passes through it on the way to the porch.
async function buildWordmark(scene) {
  const word = 'INSTRUMENT', height = 2.9, z = 15.5, offsetX = 6.9, group = new T.Group(); group.name = 'Portfolio wordmark'; scene.add(group);
  try { await document.fonts.load('700 200px "Instrument Sans"'); } catch {}
  const glyphs = [], measure = document.createElement('canvas').getContext('2d'); measure.font = '700 400px "Instrument Sans"';
  const widths = [...word].map(ch => measure.measureText(ch).width / 400 * height * 1.04), gap = height * .1;
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x = offsetX - total / 2;
  [...word].forEach((ch, i) => {
    const w = widths[i], c = document.createElement('canvas'); c.width = Math.ceil(w / height * 512); c.height = 512;
    const g = c.getContext('2d'); g.font = '700 400px "Instrument Sans"'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    const wash = g.createLinearGradient(0, 40, 0, 470); wash.addColorStop(0, '#f4efe0'); wash.addColorStop(.7, '#e6dfca'); wash.addColorStop(1, '#a99f86'); // whitewash, darker at the foot
    g.fillStyle = wash; g.fillText(ch, c.width / 2, 470);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const material = new T.MeshStandardMaterial({ map, transparent: true, alphaTest: .02, roughness: .8, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: .12, depthWrite: true, side: T.DoubleSide });
    const mesh = new T.Mesh(new T.PlaneGeometry(w, height), material); mesh.position.set(x + w / 2, height / 2 - .25, z); mesh.renderOrder = 1;
    group.add(mesh); glyphs.push({ mesh, material, base: mesh.position.y, delay: i * .07 }); x += w + gap;
  });
  return { group, glyphs };
}

// ------------------------------------------------------------------------------------------------------ the walk
// One segment per chapter: from the previous chapter's eye along its route to this chapter's eye. The heading is the
// direction of travel, eased out of the previous chapter's framing and into this one's over a distance that grows with
// the turn; frames are spaced by distance walked plus turning, so a turn on a landing is not a whip pan.
const V = a => new T.Vector3(...a);
const yawOf = d => Math.atan2(d.x, d.z), pitchOf = d => Math.asin(clamp(d.y / d.length(), -1, 1));
function framing(c, aspect) {
  // the heading that places the chapter's anchor where the layout leaves room for it: right of the copy column on a
  // wide screen, in the upper half on a tall one, centred for the outdoor views
  const d = V(c.anchor).sub(V(c.eye)), vf = c.fov * (aspect < .9 ? 1.28 : 1) * Math.PI / 180;
  let yaw = yawOf(d), pitch = pitchOf(d);
  if (c.frame !== 'centre') {
    const hf = 2 * Math.atan(Math.tan(vf / 2) * aspect);
    if (aspect >= .9) yaw += Math.atan(.36 * Math.tan(hf / 2));
    pitch -= Math.atan((aspect >= .9 ? .04 : .34) * Math.tan(vf / 2));
  }
  return { yaw, pitch, fov: vf * 180 / Math.PI };
}
function buildSegment(a, b, aspect) {
  const pts = [V(a.eye), ...(b.route || []).map(V), V(b.eye)];
  const curve = new T.CatmullRomCurve3(pts, false, 'centripetal');
  const N = 900, P = [], S = [0];
  for (let i = 0; i <= N; i++) { P.push(curve.getPoint(i / N)); if (i) S.push(S[i - 1] + P[i].distanceTo(P[i - 1])); }
  const len = S[N], A = framing(a, aspect), B = framing(b, aspect);
  const at = s => { let lo = 1, hi = N; while (lo < hi) { const m = (lo + hi) >> 1; if (S[m] < s) lo = m + 1; else hi = m; } const i = lo, k = (s - S[i - 1]) / Math.max(1e-6, S[i] - S[i - 1]); return P[i - 1].clone().lerp(P[i], clamp(k)); };
  const ahead = s => { const d = at(Math.min(len, s + 2.2)).sub(at(Math.max(0, Math.min(s, len - 2.2)))); return { yaw: yawOf(d), pitch: pitchOf(d) * .45 }; };
  const h0 = ahead(0), h1 = ahead(len);
  let wa = .9 + 2.2 * Math.abs(angle(A.yaw, h0.yaw)) / Math.PI, wb = 1.4 + 2.6 * Math.abs(angle(h1.yaw, B.yaw)) / Math.PI;
  if (wa + wb > len * .9) { const k = len * .9 / (wa + wb); wa *= k; wb *= k; }
  const walkFov = b.outdoors && a.outdoors ? (A.fov + B.fov) / 2 : 58;
  // Outdoors the camera backs away from the building, so it keeps looking at it rather than where it is going: from the
  // moment it is clear of the walls (b.through[1]) the heading turns to b's anchor; between two outdoor views it simply
  // carries the framing from one to the other.
  const anchorB = V(b.anchor), lookB = s => { const d = anchorB.clone().sub(at(s)); return { yaw: yawOf(d), pitch: pitchOf(d) }; };
  // where the path crosses the facade band (z from..to), in metres along it
  const cross = b.through && [S[P.findIndex(p => p.z >= b.through[0])], S[P.findIndex(p => p.z >= b.through[1])]];
  const outFrom = a.outdoors ? 0 : cross ? cross[1] : Infinity;
  const rows = [];
  let cost = 0, prev = null;
  for (let i = 0; i <= N; i++) {
    const s = S[i], u = 1 - smooth(0, wa, s), v = smooth(len - wb, len, s);
    let h = ahead(s);
    if (s >= outFrom - 1.5) { const L = lookB(s), k = smooth(outFrom - 1.5, outFrom + 2.5, s); h = { yaw: lerpAngle(h.yaw, L.yaw, k), pitch: h.pitch + (L.pitch - h.pitch) * k }; }
    let yaw = lerpAngle(h.yaw, A.yaw, u); yaw = lerpAngle(yaw, B.yaw, v);
    let pitch = h.pitch + (A.pitch - h.pitch) * u; pitch += (B.pitch - pitch) * v;
    if (a.outdoors && b.outdoors) { const k = smooth(0, len, s); yaw = lerpAngle(A.yaw, B.yaw, k); pitch = A.pitch + (B.pitch - A.pitch) * k; }
    const mid = Math.min(smooth(0, wa * 1.5, s), 1 - smooth(len - wb * 1.5, len, s));
    const fov = (A.fov + (B.fov - A.fov) * (s / len)) * (1 - mid) + walkFov * mid;
    if (prev) cost += P[i].distanceTo(prev.p) + 1.5 * Math.abs(angle(prev.yaw, yaw)) + Math.abs(pitch - prev.pitch) + .02 * Math.abs(fov - prev.fov);
    rows.push(prev = { p: P[i], s, yaw, pitch, fov, cost });
  }
  return {
    cost, len,
    sample(f, out) {
      const goal = clamp(f) * cost; let i = 1; while (i < N && rows[i].cost < goal) i++;
      const r0 = rows[i - 1], r1 = rows[i], k = clamp((goal - r0.cost) / Math.max(1e-6, r1.cost - r0.cost));
      out.p.copy(r0.p).lerp(r1.p, k); out.yaw = lerpAngle(r0.yaw, r1.yaw, k); out.pitch = r0.pitch + (r1.pitch - r0.pitch) * k; out.fov = r0.fov + (r1.fov - r0.fov) * k;
      out.outdoors = (f < .5 ? a : b).outdoors || (a.outdoors && b.outdoors);
      const s = r0.s + (r1.s - r0.s) * k;
      out.veil = cross ? smooth(cross[0] - 1.2, cross[0], s) * (1 - smooth(cross[1], cross[1] + 1.6, s)) : 0;
      return out;
    },
  };
}

// --------------------------------------------------------------------------------------------- live windows
// Kage's card viewports: a camera elsewhere in the building, shown in the rectangle of a frame on the page. A window's
// view is drawn straight into the canvas at its rectangle before the main view (with the screen's own shaders: an
// offscreen buffer would need a second, linear set of every shader, ~20 s to compile on an integrated GPU) and copied
// into a texture; after the main view, each window's texture is laid back over its rectangle. A view is redrawn while
// its lens pushes in, when it changes place, and otherwise every 30th frame; changing place crossfades.
function createViews(scene, renderer) {
  const quadScene = new T.Scene(), quadCam = new T.Camera();
  const material = new T.ShaderMaterial({
    uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uAlpha: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    // the textures hold finished screen pixels: no tone mapping or colour conversion here
    fragmentShader: `uniform sampler2D tA, tB; uniform float uMix, uAlpha; varying vec2 vUv;
      void main() { vec3 a = texture2D(tA, vUv).rgb, b = texture2D(tB, vUv).rgb; vec3 c = mix(a, b, smoothstep(0., 1., uMix));
        vec2 q = vUv - .5; c *= 1. - .55 * dot(q, q); c *= mix(.62, 1., smoothstep(0., .45, vUv.y));
        gl_FragColor = vec4(c, uAlpha); }`,
    depthTest: false, depthWrite: false, transparent: true, toneMapped: false,
  });
  quadScene.add(new T.Mesh(new T.PlaneGeometry(2, 2), material));
  const list = [], at = new T.Vector2();
  let frame = 0;
  function aim(v, def, cam) {
    const eye = V(def.eye), look = V(def.look), dir = look.clone().sub(eye).normalize();
    cam.position.copy(eye).addScaledVector(dir, v.push * 1.1); cam.lookAt(look); cam.fov = def.fov - v.push * 6; cam.updateProjectionMatrix();
  }
  // the window's rectangle in drawing-buffer pixels, whole pixels, inside the canvas
  function box(r) {
    const pr = renderer.getPixelRatio(), cw = renderer.domElement.width, ch = renderer.domElement.height;
    const x = Math.max(0, Math.round(r.left * pr)), y = Math.max(0, Math.round(ch - r.bottom * pr));
    return { x, y, w: Math.min(cw - x, Math.round(r.width * pr)), h: Math.min(ch - y, Math.round(r.height * pr)), pr };
  }
  function shoot(cam, def, v, tex, b) {
    aim(v, def, cam); cam.aspect = b.w / b.h; cam.updateProjectionMatrix();
    renderer.setViewport(b.x / b.pr, b.y / b.pr, b.w / b.pr, b.h / b.pr); renderer.setScissor(b.x / b.pr, b.y / b.pr, b.w / b.pr, b.h / b.pr); renderer.setScissorTest(true);
    renderer.render(scene, cam);
    renderer.copyFramebufferToTexture(tex, at.set(b.x, b.y));
  }
  const reset = () => { const pr = renderer.getPixelRatio(), w = renderer.domElement.width / pr, h = renderer.domElement.height / pr; renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); };
  const visible = v => v.rect && v.rect.width >= 8 && v.rect.bottom > -40 && v.rect.top < innerHeight + 40 && v.alpha >= .02;
  return {
    list,
    attach(el) {
      const v = { el, frame: el.querySelector('[data-frame]') || el, name: el.dataset.view, next: null, mix: 0, push: 0, want: 0, texA: null, texB: null, cam: new T.PerspectiveCamera(46, 1, .12, 400), camB: new T.PerspectiveCamera(46, 1, .12, 400), dirty: true, dirtyB: false, slot: list.length * 7, alpha: 0, rect: null };
      v.cam.layers.set(0); v.camB.layers.set(0);
      el.addEventListener('pointerenter', () => { v.want = 1; }); el.addEventListener('pointerleave', () => { v.want = 0; });
      list.push(v); return v;
    },
    // turn a window to another place: shot into the second texture, then crossfaded
    show(v, name) {
      if (!v || !C.views[name] || name === (v.next ?? v.name)) return;
      if (v.next) { v.name = v.next; [v.texA, v.texB] = [v.texB, v.texA]; }
      v.next = name; v.mix = 0; v.dirtyB = true;
      v.el.querySelector('figcaption b').textContent = C.views[name].label; v.el.querySelector('figcaption i').textContent = C.views[name].note;
    },
    // per page frame: easing; returns true while anything moves
    update(dt) {
      let moving = false;
      for (const v of list) {
        const p = v.push; v.push = T.MathUtils.damp(v.push, v.want, 3.4, dt); if (Math.abs(v.push - p) > 1e-4) moving = true;
        if (v.next) { v.mix = Math.min(1, v.mix + dt / .65); moving = true; if (v.mix >= 1) { v.name = v.next; v.next = null; [v.texA, v.texB] = [v.texB, v.texA]; v.mix = 0; } }
      }
      return moving;
    },
    // the first shot of a window, taken while the loader still covers the page: a place's first draw finishes its
    // shaders in the driver (~2.5 s here), which would otherwise land as a stall just after the arrival
    prime(v) {
      v.rect = v.frame.getBoundingClientRect(); const b = box(v.rect); if (b.w < 8 || b.h < 8) return;
      v.texA?.dispose(); v.texB?.dispose(); v.texA = new T.FramebufferTexture(b.w, b.h); v.texB = new T.FramebufferTexture(b.w, b.h);
      shoot(v.cam, C.views[v.name], v, v.texA, b); v.dirty = false; reset();
    },
    // before the main view: shoot the views that need it into their textures
    shoot(measureAlpha) {
      frame++;
      let shot = false;
      for (const v of list) {
        if (frame % 10 === 0 || !v.rect) { v.rect = v.frame.getBoundingClientRect(); v.alpha = measureAlpha(v.el); }
        if (!visible(v)) continue;
        const b = box(v.rect); if (b.w < 8 || b.h < 8) continue;
        if (!v.texA || v.texA.image.width !== b.w || v.texA.image.height !== b.h) { v.texA?.dispose(); v.texB?.dispose(); v.texA = new T.FramebufferTexture(b.w, b.h); v.texB = new T.FramebufferTexture(b.w, b.h); v.dirty = true; if (v.next) v.dirtyB = true; }
        const pushing = Math.abs(v.push - v.want) > .002 || v.push > .002 && v.want > 0;
        if (v.dirty || pushing || (frame + v.slot) % 30 === 0) { shoot(v.cam, C.views[v.name], v, v.texA, b); v.dirty = false; shot = true; }
        if (v.next && (v.dirtyB || pushing || frame % 4 === 0)) { shoot(v.camB, C.views[v.next], v, v.texB, b); v.dirtyB = false; shot = true; }
      }
      if (shot) reset();
    },
    // after the main view: lay each window's picture over its rectangle
    draw() {
      const keepClear = renderer.autoClear; renderer.autoClear = false;
      let drew = false;
      for (const v of list) {
        if (!visible(v) || !v.texA) continue;
        const b = box(v.rect);
        renderer.setViewport(b.x / b.pr, b.y / b.pr, b.w / b.pr, b.h / b.pr); renderer.setScissor(b.x / b.pr, b.y / b.pr, b.w / b.pr, b.h / b.pr); renderer.setScissorTest(true);
        material.uniforms.tA.value = v.texA; material.uniforms.tB.value = v.next ? v.texB : v.texA; material.uniforms.uMix.value = v.next ? v.mix : 0; material.uniforms.uAlpha.value = v.alpha;
        renderer.render(quadScene, quadCam); drew = true;
      }
      if (drew) reset();
      renderer.autoClear = keepClear;
    },
  };
}

// ------------------------------------------------------------------------------------------ the cursor wisps
// After Kage: a drift of motes hung from the camera, so they stay under the hand while the rig moves; emitted by distance
// travelled, so a slow hand lays a continuous drift and a fast one throws the motes apart.
function createWisps(camera, coarse) {
  if (coarse) return null;
  const N = 170, D = 3.4, g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(new Float32Array(N * 3), 3));
  g.setAttribute('aA', new T.BufferAttribute(new Float32Array(N), 1));
  g.setAttribute('aS', new T.BufferAttribute(new Float32Array(N), 1));
  const material = new T.ShaderMaterial({
    uniforms: { uPx: { value: innerHeight } }, transparent: true, blending: T.AdditiveBlending, depthWrite: false, depthTest: false, fog: false,
    vertexShader: 'attribute float aA; attribute float aS; uniform float uPx; varying float vA; void main() { vA = aA; vec4 mv = modelViewMatrix * vec4(position, 1.); gl_PointSize = uPx * aS / max(-mv.z, .4); gl_Position = projectionMatrix * mv; }',
    fragmentShader: 'varying float vA; void main() { if (vA <= 0.) discard; float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r * r * 4.) + .5 * exp(-r * r * 30.); gl_FragColor = vec4(vec3(1., .93, .78) * a, a * vA); }',
  });
  const points = new T.Points(g, material); points.frustumCulled = false; points.renderOrder = 9; points.layers.set(OVERLAY);
  camera.add(points);
  const L = Array.from({ length: N }, () => ({ life: 1, max: 1, vx: 0, vy: 0, sz: 0, ph: 0 }));
  const W = { i: 0, acc: 0, ex: 0, ey: 0, lx: 0, ly: 0, idle: 0, seen: false, t: 0 };
  const P = g.attributes.position.array, A = g.attributes.aA.array, S = g.attributes.aS.array;
  const spawn = (x, y, a, weak) => {
    const i = W.i; W.i = (i + 1) % N; const w = L[i], k = i * 3;
    P[k] = x + (Math.random() + Math.random() - 1) * .26; P[k + 1] = y + (Math.random() + Math.random() - 1) * .26; P[k + 2] = -D + (Math.random() - .5) * .9;
    w.life = 0; w.max = (weak ? 2.1 : 1.4) + Math.random() * 1.2;
    w.vx = -Math.cos(a) * .09 + (Math.random() - .5) * .36; w.vy = -Math.sin(a) * .09 + (Math.random() - .5) * .3 + .02;
    w.sz = (weak ? .016 : .022) + Math.random() * .022; w.ph = Math.random() * 6.283;
  };
  return {
    points,
    resize() { material.uniforms.uPx.value = innerHeight * Math.min(devicePixelRatio, 2); },
    update(dt, nx, ny, on) {
      W.t += dt;
      const hh = Math.tan(camera.fov * Math.PI / 360) * D, px = nx * hh * camera.aspect, py = ny * hh;
      if (!W.seen) { W.ex = W.lx = px; W.ey = W.ly = py; W.seen = true; }
      W.ex = T.MathUtils.damp(W.ex, px, 16, dt); W.ey = T.MathUtils.damp(W.ey, py, 16, dt);
      const dx = W.ex - W.lx, dy = W.ey - W.ly, moved = Math.hypot(dx, dy), ang = moved > 1e-5 ? Math.atan2(dy, dx) : 0;
      if (on) {
        W.acc += moved; let guard = 0;
        while (W.acc >= .03 && guard++ < 14) { W.acc -= .03; const t = moved > 1e-6 ? Math.min(1, guard * .03 / moved) : 0; spawn(W.lx + dx * t, W.ly + dy * t, ang, false); }
        W.idle += dt; if (W.idle > .45) { W.idle = 0; spawn(W.ex, W.ey, Math.random() * 6.283, true); }
      }
      W.lx = W.ex; W.ly = W.ey;
      let alive = false;
      for (let i = 0; i < N; i++) {
        const w = L[i], k = i * 3;
        if (w.life >= w.max) { A[i] = 0; continue; }
        alive = true; w.life += dt; const u = w.life / w.max;
        P[k] += (w.vx + Math.sin(W.t * 1.3 + w.ph) * .17) * dt; P[k + 1] += (w.vy + Math.cos(W.t * 1.1 + w.ph * 1.7) * .14) * dt;
        w.vx *= 1 - .5 * dt; w.vy = w.vy * (1 - .5 * dt) + .022 * dt;
        A[i] = smooth(0, .12, u) * (1 - smooth(.22, 1, u)) * .85; S[i] = w.sz * (1 + u * .55);
      }
      g.attributes.position.needsUpdate = true; g.attributes.aA.needsUpdate = true; g.attributes.aS.needsUpdate = true;
      return alive;
    },
  };
}

// --------------------------------------------------------------------------------------------- the leaf fall
// Outdoors only: neem leaves drifting down around the camera, slowly, turning as they fall.
function createLeaves(scene) {
  const N = 46, c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d'); g.fillStyle = '#fff'; g.beginPath(); g.moveTo(32, 4); g.bezierCurveTo(58, 34, 56, 86, 32, 124); g.bezierCurveTo(8, 86, 6, 34, 32, 4); g.fill();
  const map = new T.CanvasTexture(c);
  const mesh = new T.InstancedMesh(new T.PlaneGeometry(.07, .14), new T.MeshBasicMaterial({ alphaMap: map, transparent: true, depthWrite: false, side: T.DoubleSide, color: '#ffffff', fog: true }), N);
  mesh.frustumCulled = false; mesh.layers.set(OVERLAY); mesh.renderOrder = 2; scene.add(mesh);
  const tints = ['#56643a', '#6f7a42', '#8a7a3e', '#4e5d33', '#7d6a35'].map(h => new T.Color(h));
  const state = Array.from({ length: N }, (_, i) => ({ p: new T.Vector3(), v: .25 + Math.random() * .35, sway: .3 + Math.random() * .6, ph: Math.random() * 6.3, spin: new T.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(1.4), r: new T.Euler(), born: false, tint: tints[i % tints.length] }));
  state.forEach((s, i) => mesh.setColorAt(i, s.tint));
  const m = new T.Matrix4(), q = new T.Quaternion(), one = new T.Vector3(1, 1, 1);
  let opacity = 0, t = 0;
  return {
    update(dt, camera, outdoors, light) {
      t += dt; opacity = T.MathUtils.damp(opacity, outdoors ? 1 : 0, 2, dt);
      mesh.visible = opacity > .01; if (!mesh.visible) return false;
      mesh.material.opacity = opacity * .9; mesh.material.color.setScalar(.25 + .75 * light);
      const fwd = camera.getWorldDirection(new T.Vector3());
      state.forEach((s, i) => {
        const rel = s.p.clone().sub(camera.position);
        if (!s.born || rel.length() > 16 || s.p.y < camera.position.y - 6) {
          s.born = true; const d = 3 + Math.random() * 11;
          s.p.copy(camera.position).addScaledVector(fwd, d).add(new T.Vector3((Math.random() - .5) * d * 1.4, 2 + Math.random() * 5, (Math.random() - .5) * d * .6));
        }
        s.p.y -= s.v * dt; s.p.x += Math.sin(t * .7 + s.ph) * s.sway * dt; s.p.z += Math.cos(t * .5 + s.ph) * s.sway * .5 * dt;
        s.r.x += s.spin.x * dt; s.r.y += s.spin.y * dt; s.r.z += s.spin.z * dt * .4;
        mesh.setMatrixAt(i, m.compose(s.p, q.setFromEuler(s.r), one));
      });
      mesh.instanceMatrix.needsUpdate = true;
      return true;
    },
  };
}

// ---------------------------------------------------------------------------------------------------- the layer
export function createPortfolio({ scene, camera, renderer, reduced, onEnter, changed }) {
  const root = document.createElement('div'); root.id = 'portfolio'; root.innerHTML = markup(); document.body.append(root);
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const coarse = matchMedia('(pointer: coarse)').matches;
  const sections = $$('[data-cam]'), walks = $$('[data-walk]'), chapters = C.chapters;
  const rig = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: reduced ? 1 : 0, nx: 0, ny: 0 };
  let segments = [], holds = [], maxScroll = 1, active = true, wordmark = null, wordT = reduced ? 99 : -1, lastChapter = -1, aspect = innerWidth / innerHeight;
  const pose = { p: new T.Vector3(), yaw: 0, pitch: 0, fov: 50, outdoors: true, veil: 0 };
  const dir = new T.Vector3(), right = new T.Vector3();
  if (!camera.parent) scene.add(camera); // the wisps hang from the camera
  camera.layers.enable(OVERLAY);

  // ------------------------------------------------------------------ the path and the scroll
  function build() {
    aspect = innerWidth / innerHeight;
    segments = chapters.map((c, i) => i ? buildSegment(chapters[i - 1], c, aspect) : null);
  }
  function measure() {
    const vh = innerHeight;
    // each walk's scroll distance follows its cost: about a screen per 9 m, never less than half a screen
    walks.forEach(w => { const s = segments[+w.dataset.walk]; w.style.height = `${Math.round(clamp(s.cost * .11, .35, 2.6) * vh)}px`; });
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    holds = sections.map((el, i) => {
      if (i === 0) return [0, Math.max(0, el.offsetTop + el.offsetHeight - vh * 1.02)];
      const a = clamp(el.offsetTop - vh * .45, 0, maxScroll), b = i === sections.length - 1 ? maxScroll : clamp(el.offsetTop + el.offsetHeight - vh * .62, a, maxScroll);
      return [a, Math.max(a, b)];
    });
    for (let i = 1; i < holds.length; i++) { holds[i][0] = Math.max(holds[i][0], holds[i - 1][1] + 1); holds[i][1] = Math.max(holds[i][1], holds[i][0]); }
    lenis?.resize(); // the walks changed the page's height: Lenis must not clamp to the old one
  }
  function progressFor(y) {
    for (let i = 0; i < holds.length; i++) {
      if (y <= holds[i][1]) return y >= holds[i][0] || i === 0 ? i : i - 1 + (y - holds[i - 1][1]) / Math.max(1, holds[i][0] - holds[i - 1][1]);
    }
    return holds.length - 1;
  }
  const scrollFor = i => holds[i] ? holds[i][0] + (i === 0 ? 0 : Math.min(innerHeight * .12, (holds[i][1] - holds[i][0]) * .5)) : 0;

  // the arrival: a long-lens dolly in from further down the drive while the building rises
  const introFrom = { p: new T.Vector3(1.2, 1.25, 74), yaw: 0, pitch: Math.atan2(5.2 - 1.25, 74), fov: 26 };
  function apply() {
    const N = chapters.length - 1, k = clamp(rig.smooth, 0, N), i = Math.min(N - 1, Math.floor(k)), f = k - i;
    if (f < 1e-5 && k < N) { const c = chapters[i], F = framing(c, aspect); pose.p.set(...c.eye); pose.yaw = F.yaw; pose.pitch = F.pitch; pose.fov = F.fov; pose.outdoors = !!c.outdoors; pose.veil = 0; }
    else segments[i + 1].sample(f, pose);
    if (k >= N) { const c = chapters[N], F = framing(c, aspect); pose.p.set(...c.eye); pose.yaw = F.yaw; pose.pitch = F.pitch; pose.fov = F.fov; pose.outdoors = true; pose.veil = 0; }
    const io = 1 - smooth(0, 1, rig.intro), e = io * io * (3 - 2 * io);
    if (e > 0) { pose.p.lerp(introFrom.p, e); pose.yaw = lerpAngle(pose.yaw, introFrom.yaw, e); pose.pitch += (introFrom.pitch - pose.pitch) * e; pose.fov += (introFrom.fov - pose.fov) * e; }
    // hand-held parallax: generous outdoors, a breath indoors
    const out = pose.outdoors ? 1 : 0, still = 1 - Math.min(1, Math.abs(rig.smooth - rig.prog) * 3);
    const shift = (out ? .55 : .07) * (1 - smooth(0, 1.4, rig.smooth) * .5 * out), turn = (out ? .012 : .022) * still;
    dir.set(Math.sin(pose.yaw) * Math.cos(pose.pitch), Math.sin(pose.pitch), Math.cos(pose.yaw) * Math.cos(pose.pitch));
    right.set(-Math.cos(pose.yaw), 0, Math.sin(pose.yaw));
    camera.position.copy(pose.p).addScaledVector(right, rig.mx * shift); camera.position.y += rig.my * shift * .5;
    const yaw = pose.yaw - rig.mx * turn, pitch = pose.pitch + rig.my * turn * .6;
    dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch));
    camera.lookAt(camera.position.clone().add(dir));
    if (Math.abs(camera.fov - pose.fov) > 1e-4) { camera.fov = pose.fov; camera.updateProjectionMatrix(); }
  }

  // ------------------------------------------------------------------ smooth scroll (Lenis), driven per frame from update()
  const lenis = new Lenis({ autoRaf: false, lerp: reduced ? 1 : .085, wheelMultiplier: .9, touchMultiplier: 1.4, syncTouch: false });
  let scrollY = 0;
  lenis.on('scroll', () => { scrollY = lenis.animatedScroll; rig.prog = progressFor(scrollY); });
  const goTo = i => { const y = scrollFor(i), d = Math.abs(y - scrollY) / innerHeight; lenis.scrollTo(y, { duration: reduced ? 0 : clamp(1.2 + d * .22, 1.2, 4.2), easing: x => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2, force: true }); };
  function relayout() { build(); measure(); rig.prog = progressFor(scrollY); wisps?.resize(); }
  addEventListener('resize', relayout);
  new ResizeObserver(() => { measure(); rig.prog = progressFor(scrollY); }).observe($('.pf-doc')); // opening a <details> moves the holds
  root.addEventListener('click', e => {
    const door = e.target.closest('[data-enter]'); if (door) { onEnter(door.dataset.enter); return; }
    const rail = e.target.closest('[data-rail]'); if (rail) { goTo(+rail.dataset.rail); return; }
    const jump = e.target.closest('a[href^="#"]'); if (!jump) return;
    const el = document.getElementById(jump.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault(); closeMenu(); const i = sections.indexOf(el); goTo(i >= 0 ? i : 0);
  });
  root.addEventListener('keydown', e => { const t = e.target.closest('[data-show]'); if (t && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); showIn(t); } });

  // ------------------------------------------------------------------ nav, burger, rail, where-am-I line
  const nav = $('.pf-nav'), burger = $('.pf-burger'), links = $$('.pf-link'), rails = $$('[data-rail]');
  const linkFor = links.map(l => sections.indexOf(document.getElementById(l.getAttribute('href').slice(1))));
  const closeMenu = () => { nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); };
  burger.addEventListener('click', () => { const open = !nav.classList.contains('menu-open'); nav.classList.toggle('menu-open', open); burger.setAttribute('aria-expanded', String(open)); if (open) nav.classList.remove('hide'); });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const where = $('.pf-where'), whereTx = $('.pf-where-tx');
  let lastY = 0;
  function chrome() {
    nav.classList.toggle('stuck', scrollY > 40);
    nav.classList.toggle('hide', !nav.classList.contains('menu-open') && scrollY > lastY + 4 && scrollY > innerHeight * .8);
    if (scrollY < lastY - 4) nav.classList.remove('hide');
    lastY = scrollY;
    const k = Math.round(rig.smooth);
    if (k !== lastChapter) {
      lastChapter = k;
      rails.forEach((r, i) => r.classList.toggle('on', i === k));
      links.forEach((l, i) => l.classList.toggle('on', linkFor[i] === k));
    }
    // between chapters, a line says where the walk is going
    const walking = Math.abs(rig.smooth - Math.round(rig.smooth)) > .06 && rig.smooth < chapters.length - 1.5;
    if (walking) { const to = chapters[Math.ceil(rig.smooth)]; if (to?.where) whereTx.textContent = `To ${to.where.charAt(0).toLowerCase()}${to.where.slice(1)}`; }
    where.classList.toggle('on', walking && rig.intro >= 1);
  }

  // ------------------------------------------------------------------ live status (the real time of the department)
  let waiting = false;
  function status() {
    if (waiting) return;
    const time = document.querySelector('#time-label')?.textContent || '', weather = document.querySelector('#weather-label')?.textContent || '';
    const [clock, , period] = time.split(' / '), [sky, moon] = weather.split(' / ');
    if (!clock) return;
    const lc = s => (s || '').toLowerCase().trim();
    const parts = [`${clock}${period ? `, ${lc(period)}` : ''}`];
    if (sky && !/syncing|unavailable/i.test(sky)) parts.push(lc(sky)); if (moon && /moon|crescent|gibbous|quarter/i.test(moon)) parts.push(lc(moon));
    $('.pf-live-tx').textContent = `Live in Visakhapatnam, ${parts.join(', ')}`;
  }
  status(); setInterval(status, 10000);

  // ------------------------------------------------------------------ reveals (Kage: grouped stagger, IntersectionObserver)
  const groups = new Map();
  $$('[data-rv]').forEach(el => { const arr = groups.get(el.parentElement) || []; arr.push(el); groups.set(el.parentElement, arr); });
  groups.forEach(arr => arr.forEach((el, i) => { el.dataset.rvd = i * 85; }));
  const io = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return; io.unobserve(e.target);
    setTimeout(() => e.target.classList.add('rv-in'), reduced ? 0 : +e.target.dataset.rvd || 0);
  }), { rootMargin: '0px 0px -10% 0px', threshold: .04 });
  $$('[data-rv]').forEach(el => { if (!el.closest('#arrival')) io.observe(el); });
  // headings arrive word by word, masked, the first time they come into view; the hero waits for the arrival
  const reveals = new Map();
  let splitReady = Promise.resolve();
  if (!reduced) splitReady = document.fonts.ready.then(() => $$('.pf-display').forEach(h => {
    const split = SplitText.create(h, { type: 'words', mask: 'words', aria: 'auto' });
    gsap.set(split.words, { yPercent: 112, opacity: 0 });
    const play = () => gsap.to(split.words, { yPercent: 0, opacity: 1, duration: .95, ease: 'expo.out', stagger: .072 });
    reveals.set(h, play);
    if (!h.closest('#arrival')) { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); play(); } }, { rootMargin: '0px 0px -12% 0px' }); o.observe(h); }
  })).then(() => root.classList.add('split'));
  else root.classList.add('split');

  // ------------------------------------------------------------------ the hero exit (Kage: each piece of the hero foot goes in its own window)
  const exitSeq = [
    { el: $('.pf-peek'), at: 0, span: .26, blur: 10 }, { el: $('.pf-cue'), at: .1, span: .3, shift: true },
    ...$$('.pf-chip').map((el, i) => ({ el, at: .2 + i * .1, span: .3, shift: true }))
  ];
  let exiting = false;
  function heroExit() {
    const t = clamp(scrollY / (innerHeight * .58));
    if (t <= 0) { if (exiting) { exitSeq.forEach(o => { o.el.style.opacity = o.el.style.transform = o.el.style.filter = o.el.style.pointerEvents = o.el.style.transition = ''; }); exiting = false; } return; }
    exiting = true;
    exitSeq.forEach(o => {
      const a = 1 - smooth(o.at, o.at + o.span, t); o.el.style.transition = 'none'; o.el.style.opacity = a.toFixed(3);
      if (o.shift) o.el.style.transform = `translate3d(0,${((1 - a) * 15).toFixed(1)}px,0)`;
      if (o.blur) o.el.style.filter = a > .999 ? '' : `blur(${((1 - a) * o.blur).toFixed(1)}px)`;
      o.el.style.pointerEvents = a < .05 ? 'none' : '';
    });
  }

  // ------------------------------------------------------------------ live windows, chips and rows
  const views = createViews(scene, renderer);
  const viewEls = $$('.pf-view').map(el => views.attach(el));
  const lensOf = el => views.list.find(v => v.el === el.closest('.pf-sec')?.querySelector('.pf-lens'));
  const heroLens = views.list.find(v => v.el.closest('.pf-peek'));
  function showIn(row) {
    const lens = lensOf(row); if (!lens) return;
    views.show(lens, row.dataset.show);
    row.closest('.pf-sec').querySelectorAll('[data-show]').forEach(o => o.classList.toggle('on', o === row));
  }
  $$('.pf-chip').forEach(el => {
    el.addEventListener('pointerenter', () => { views.show(heroLens, el.dataset.chip); heroLens.want = .35; $$('.pf-chip').forEach(o => o.classList.toggle('on', o === el)); });
    el.addEventListener('pointerleave', () => { views.show(heroLens, C.hero.peek); heroLens.want = 0; el.classList.remove('on'); });
    el.addEventListener('focus', () => views.show(heroLens, el.dataset.chip)); el.addEventListener('blur', () => views.show(heroLens, C.hero.peek));
  });
  $$('[data-show]').forEach(el => { el.addEventListener('pointerenter', () => showIn(el)); el.addEventListener('focus', () => showIn(el)); });
  const alphaOf = el => { let a = 1; for (let n = el; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return 0; a *= +s.opacity; if (a < .01) return 0; } return a; };

  // ------------------------------------------------------------------ the cursor (Kage: a ring that trails the hand and opens over anything live)
  const cursor = $('.pf-cursor'), wisps = createWisps(camera, coarse), leaves = createLeaves(scene);
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, seen: false };
  addEventListener('pointermove', e => {
    if (!active || e.pointerType === 'touch') return;
    if (!pointer.seen) { pointer.x = e.clientX; pointer.y = e.clientY; cursor.classList.add('seen'); } // the ring starts under the hand, not mid-screen
    pointer.tx = e.clientX; pointer.ty = e.clientY; pointer.seen = true;
    rig.tmx = e.clientX / innerWidth * 2 - 1; rig.tmy = -(e.clientY / innerHeight * 2 - 1);
    cursor.classList.toggle('act', !!e.target.closest?.('[data-cursor], a, button, summary'));
  }, { passive: true });
  // the ring replaces the system pointer only on a fine pointer, only while the story shows, and only after the arrival
  const ring = on => document.documentElement.classList.toggle('pf-ring', on && !coarse && matchMedia('(hover: hover) and (pointer: fine)').matches);
  document.addEventListener('pointerleave', () => cursor.classList.add('away'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('away'));

  buildWordmark(scene).then(w => { wordmark = w; for (const g of w.glyphs) g.mesh.position.y = g.base - 5; changed(); });

  build(); measure(); rig.prog = progressFor(0); rig.smooth = rig.prog;

  // The arrival: one GSAP timeline over the rise. The camera dollies in from far down the drive on a long lens, the
  // wordmark rises from the lawn as the signs land, then the hero copy. Scrolling is held until the building stands.
  // While the campus is still being built: the live line reads the load's own progress.
  const loading = document.querySelector('#loading-status');
  if (loading) new MutationObserver(() => { if (waiting && loading.textContent) $('.pf-live-tx').textContent = `Raising the department: ${loading.textContent.charAt(0).toLowerCase()}${loading.textContent.slice(1)}`; })
    .observe(loading, { childList: true, characterData: true, subtree: true });

  function play(riseLength, delay = 0) {
    views.prime(heroLens);
    const heroParts = $$('#arrival [data-rv]');
    if (waiting) { waiting = false; root.classList.remove('waiting'); status(); }
    if (reduced) { rig.intro = 1; wordT = 99; root.classList.add('arrived'); ring(true); heroParts.forEach(e => e.classList.add('rv-in')); return; }
    lenis.stop(); root.classList.remove('arrived');
    const tl = gsap.timeline({ delay, onComplete: () => { lenis.start(); root.classList.add('arrived'); ring(true); } });
    tl.fromTo(rig, { intro: 0 }, { intro: 1, duration: riseLength + 1.2, ease: 'power2.inOut' }, 0)
      .call(() => { wordT = 0; }, null, riseLength - .9)
      .call(() => reveals.get($('#arrival .pf-display'))?.(), null, riseLength - .2)
      .call(() => heroParts.forEach((e, i) => setTimeout(() => e.classList.add('rv-in'), 120 + i * 95)), null, riseLength + .1)
      .from('.pf-nav, .pf-rail', { autoAlpha: 0, y: -10, duration: 1.1, ease: 'power3.out', clearProps: 'transform' }, riseLength + .2); // a transform left on the nav would hold the phone menu sheet inside it
  }

  let last = performance.now();
  return {
    play, lenis, root,
    get active() { return active; },
    get progress() { return rig.smooth; },
    goTo,
    // The visitor pressed Enter before the building was ready: the hero over the night, the load's progress on the live
    // line; play() takes over when the campus is ready.
    wait() {
      this.show(); waiting = true; root.classList.add('waiting'); lenis.stop();
      $('.pf-live-tx').textContent = 'Raising the department';
      $$('#arrival [data-rv]').forEach((e, i) => setTimeout(() => e.classList.add('rv-in'), reduced ? 0 : 250 + i * 95));
      splitReady.then(() => reveals.get($('#arrival .pf-display'))?.());
    },
    // the exploration canvas is not a stop in the story's tab order
    show() { active = true; document.documentElement.classList.add('portfolio-mode'); ring(root.classList.contains('arrived')); root.hidden = false; renderer.domElement.tabIndex = -1; lenis.start(); relayout(); },
    hide() { active = false; ring(false); lenis.stop(); closeMenu(); renderer.domElement.tabIndex = 0; document.documentElement.classList.remove('portfolio-mode'); root.hidden = true; if (wordmark) wordmark.group.visible = false; if (wisps) wisps.points.visible = false; leaves.update(1, camera, false, 1); },
    // the page's own frame: called from main.js's loop before it draws; true while anything moves
    update(dt, { light = 1 } = {}) {
      if (!active) return false;
      const now = performance.now(); lenis.raf(now); last = now;
      const before = rig.smooth;
      rig.smooth = reduced ? rig.prog : T.MathUtils.damp(rig.smooth, rig.prog, 5.2, dt);
      if (Math.abs(rig.smooth - rig.prog) < 1e-4) rig.smooth = rig.prog;
      rig.mx = T.MathUtils.damp(rig.mx, reduced ? 0 : rig.tmx, 2.6, dt); rig.my = T.MathUtils.damp(rig.my, reduced ? 0 : rig.tmy, 2.6, dt);
      apply();
      chrome(); heroExit();
      $('.pf-veil').style.opacity = pose.veil.toFixed(3);
      // the copy column's wash: full while a chapter is read indoors, lighter outdoors and on the walk
      const hold = 1 - Math.min(1, Math.abs(rig.smooth - Math.round(rig.smooth)) * 4);
      $('.pf-scrim').style.opacity = ((pose.outdoors ? .55 : .9) * (.45 + .55 * hold)).toFixed(3);
      // cursor: the ring trails the hand
      pointer.x += (pointer.tx - pointer.x) * .18; pointer.y += (pointer.ty - pointer.y) * .18;
      cursor.style.transform = `translate3d(${pointer.x.toFixed(1)}px,${pointer.y.toFixed(1)}px,0)`;
      let moving = Math.abs(before - rig.smooth) > 1e-5 || Math.abs(rig.mx - rig.tmx) > 1e-3 || Math.abs(rig.my - rig.tmy) > 1e-3 || rig.intro < 1;
      if (wisps && wisps.update(dt, rig.tmx, rig.tmy, pointer.seen && !reduced)) moving = true;
      if (!reduced && leaves.update(dt, camera, pose.outdoors && rig.intro > .9, light)) moving = true;
      if (views.update(dt)) moving = true;
      if (wordmark) {
        if (wordT >= 0 && wordT < 3) { wordT += dt; moving = true; }
        const near = 1 - smooth(.25, .75, rig.smooth); // gone by the time the camera reaches the porch
        wordmark.group.visible = near > .01 && wordT > 0;
        for (const g of wordmark.glyphs) {
          const k = smooth(g.delay, g.delay + .9, wordT), back = 1 + 1.7 * (k - 1) ** 3 + .7 * (k - 1) ** 2; // rises with a little overshoot
          g.mesh.position.y = g.base - 5 * (1 - back); g.material.opacity = near;
        }
      }
      return moving || views.list.some(v => v.rect && v.rect.bottom > 0 && v.rect.top < innerHeight);
    },
    // after main.js has drawn the frame: the live windows
    // around main.js's draw of the frame: the live windows are shot before it and laid over it after
    beforeRender() { if (active && (root.classList.contains('arrived') || reduced)) views.shoot(alphaOf); },
    afterRender() { if (active && (root.classList.contains('arrived') || reduced)) views.draw(); },
  };
}
