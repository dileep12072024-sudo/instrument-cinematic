import * as T from 'three';
import Lenis from 'lenis';
import { gsap } from 'gsap';
import { SplitText } from 'gsap/SplitText';
import * as C from './portfolio-content.js';
import './portfolio.css';

gsap.registerPlugin(SplitText);
gsap.ticker.lagSmoothing(500, 1000 / 30); // the arrival keeps wall time through slow frames, but one long stall (a first draw) pauses it instead of skipping it, as the rise does (main.js)

// The portfolio layer (docs/portfolio-layer.md, plan v2): the first thing a visitor sees. A normal scrolling document
// over the fixed live campus, after mengto.github.io/kage: every chapter is a camera waypoint and the scroll position,
// damped, drives the camera. Here the waypoints are real doors inside the building, and between them the camera walks
// the corridors, steps and stairs instead of flying a curve through the walls. A chapter holds at its door while it is
// read; the walk happens in the scroll between chapters, as long as the real distance.

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// dialable from anywhere (E.164): Indian numbers get +91 in place of the trunk 0
const e164 = n => { const d = n.replace(/[^0-9+]/g, ''); return d.startsWith('+') ? d : '+91' + d.replace(/^0/, ''); };
const tel = n => `<a href="tel:${e164(n)}" data-cursor>${esc(n)}</a>`;
const linkify = s => esc(s).replace(/[\w.]+@[\w.]+\w/g, m => `<a href="mailto:${m}" data-cursor>${m}</a>`).replace(/\b(0891 \d{7}|0891 \d{6,7}|\d{10})\b/g, m => tel(m));
const angle = (a, b) => { let d = b - a; while (d > Math.PI) d -= 2 * Math.PI; while (d < -Math.PI) d += 2 * Math.PI; return d; };
const lerpAngle = (a, b, k) => a + angle(a, b) * k;
const OVERLAY = 3; // camera layer for the cursor wisps and the leaves: the main view only, never the live windows
const PER_COST = .13; // screens of scroll per unit of walk cost (a metre indoors, 6 frames): the one walking speed of the story

// ---------------------------------------------------------------------------------------------------------- markup
function markup() {
  const { hero, heritage, admissions, labs, guide, faculty, enter, footer, credits, chapters, people, labRooms, classroomRooms } = C;
  // header links: the first stop of each group
  const groups = [['heritage', 'Heritage'], ['admissions', 'Admissions'], ['labs', 'Laboratories'], ['faculty', 'Faculty'], ['classrooms', 'Classrooms'], ['enter', 'Overview']];
  const firstOf = g => chapters.find(c => c.group === g);
  const where = { heritage: 'Entrance hall', admissions: 'West corridor', labs: 'Eleven laboratories', faculty: 'Faculty offices', classrooms: 'End of the classroom wing', enter: 'Over the north campus' };
  let n = 0;
  const head = c => `<div class="pf-sec-head" data-rv="fade"><span class="k"><b>${String(++n).padStart(2, '0')}</b> ${esc(c.nav)}</span><span class="rule"></span><span class="k">${esc(c.where)}</span></div>`;
  const walk = i => `<div class="pf-walk" data-walk="${i}"></div>`;
  // the plate's own entrance is the genie out of the door's sign (portfolio.js plates): only its caption fades in
  const photo = p => p.photo ? `<div class="pf-side-lens"><figure class="pf-view pf-photo" data-photo="${p.photo}" role="img" aria-label="Photo of ${esc(p.name)}" data-cursor><span class="pf-view-fr" data-frame></span><figcaption data-rv="fade"><b>${esc(p.name)}</b>${p.role ? `<i>${esc(p.role)}</i>` : ''}</figcaption></figure></div>` : '';
  const person = (c, p, extra = '') => `${head(c)}
      <div class="pf-copy"><div class="pf-lean">
        <h2 class="pf-display">${esc(c.id === 'hod' ? 'Head of the Department.' : p.name)}</h2>
        <div class="pf-hod" data-rv="up">${c.id === 'hod' ? `<b>${esc(p.name)}</b>` : ''}${p.role ? `<span class="role">${esc(p.role)}</span>` : ''}<span class="deg">${esc(p.degrees)}. ${esc(p.area)}.</span></div>
        ${p.note ? `<p class="pf-lead" data-rv="up">${esc(p.note)}</p>` : ''}${extra}
      </div></div>${photo(p)}`;
  const stop = (c, title, lead, extra = '') => `${head(c)}
      <div class="pf-copy"><div class="pf-lean">
        <h2 class="pf-display">${esc(title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(lead)}</p>${extra}
      </div></div>`;
  const body = (c, i) => {
    if (c.id === 'heritage') return `${head(c)}
      <div class="pf-copy"><div class="pf-lean">
        <h2 class="pf-display">${esc(heritage.title)}</h2>
        <p class="pf-lead" data-rv="up">${esc(heritage.lead)}</p>
        <ol class="pf-years" data-rv="up">${heritage.events.map(e => `<li><b>${e.year}</b><span>${esc(e.text)}</span></li>`).join('')}</ol>
        <p class="pf-note" data-rv="up">${esc(heritage.now)}</p>
      </div></div>
      <div class="pf-stats" data-rv="up">${heritage.stats.map(([b, t]) => `<div><b>${esc(b)}</b><span>${esc(t)}</span></div>`).join('')}</div>`;
    if (c.id === 'admissions') return stop(c, admissions.title, admissions.lead, `
        <dl class="pf-programmes">${admissions.list.map(p => `<div data-rv="up"><dt>${esc(p.name)}</dt><dd class="len">${esc(p.length)}</dd><dd>${esc(p.entry)}</dd></div>`).join('')}</dl>
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(admissions.objectivesTitle)}</summary><ol>${admissions.objectives.map(o => `<li>${esc(o)}</li>`).join('')}</ol></details>`);
    if (c.id === 'lab-instruments') return stop(c, labRooms[c.id].title, labRooms[c.id].lead, `
        <p class="pf-note" data-rv="up">${esc(labs.lead)}</p>
        <ul class="pf-labs" data-rv="up">${labs.list.map(l => `<li><b>${esc(l.name)}</b><span>${esc(l.where)}</span></li>`).join('')}</ul>
        <p class="pf-research" data-rv="up">${labs.research.map(r => `<span>${esc(r)}</span>`).join('')}</p>
        <ul class="pf-facts" data-rv="up">${labs.facts.map(f => `<li>${esc(f)}</li>`).join('')}</ul>`);
    if (labRooms[c.id]) return stop(c, labRooms[c.id].title, labRooms[c.id].lead);
    if (classroomRooms[c.id]) return stop(c, classroomRooms[c.id].title, classroomRooms[c.id].lead);
    if (c.id === 'guide') return stop(c, guide.title, guide.lead, guide.groups.map(g => `<div class="pf-group" data-rv="up"><h3>${esc(g.title)}</h3>${g.items ? `<ul>${g.items.map(t => `<li>${linkify(t)}</li>`).join('')}</ul>` : ''}${g.contacts ? `<dl class="pf-calls">${g.contacts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${tel(v)}</dd></div>`).join('')}</dl>` : ''}</div>`).join(''));
    if (c.id === 'hod') return person(c, people[c.person], `
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(faculty.staffTitle)}</summary><ul class="pf-staff">${faculty.staff.map(([k, r]) => `<li><b>${esc(k)}</b><span>${esc(r)}</span></li>`).join('')}</ul></details>
        <details class="pf-more" data-rv="up"><summary data-cursor>${esc(faculty.headsTitle)}</summary><ol class="pf-staff">${faculty.heads.map(([k, r]) => `<li><b>${esc(k)}</b><span>${esc(r)}</span></li>`).join('')}</ol><p class="pf-note">${esc(faculty.headsNote)}</p></details>`);
    if (c.person) return person(c, people[c.person]);
    return '';
  };
  const stops = chapters.map((c, i) => {
    if (i === 0) return '';
    if (c.id === 'enter') return `${walk(i)}
    <section id="enter" class="pf-sec pf-fin" data-cam="${i}">
      <p class="pf-eyebrow" data-rv="fade"><span class="dot"></span>${esc(c.where)}</p>
      <h2 class="pf-display pf-big">${esc(enter.title)}</h2>
      <p class="pf-lead" data-rv="up">${esc(enter.lead)}</p>
    </section>`;
    if (c.id === 'foot') return `${walk(i)}
    <footer class="pf-foot" data-cam="${i}">
      <div class="pf-foot-grid">
        <div class="pf-foot-brand"><address>${footer.address.map(esc).join('<br>')}</address></div>
        <div><h4>Chapters</h4><ul>${groups.map(([g, t]) => `<li><a href="#${firstOf(g).id}" data-cursor>${esc(t)}</a></li>`).join('')}</ul></div>
        <div><h4>Contact</h4><ul>${footer.phones.map(([l, k]) => `<li>${esc(l)} ${tel(k)}</li>`).join('')}</ul></div>
        <div><h4>Credits</h4><ul><li>Made by ${esc(credits.maker.name)}, <a href="${credits.maker.link}" target="_blank" rel="noopener" data-cursor>${esc(credits.maker.linkText)}</a>, <a href="https://www.instagram.com/${credits.maker.instagram}/" target="_blank" rel="noopener" data-cursor>@${esc(credits.maker.instagram)}</a></li><li>Guided by ${esc(credits.guide.name)}, <a href="${credits.guide.link}" target="_blank" rel="noopener" data-cursor>${esc(credits.guide.org)}</a></li></ul></div>
      </div>
      <div class="pf-foot-base"><span>${esc(footer.note)} <a href="/about/" data-cursor>About the department</a></span><span>Three.js, live sky over Visakhapatnam</span><span>Anonymous visit counts only: no names or IP addresses are stored.</span></div>
    </footer>`;
    return `${walk(i)}
    <section id="${c.id}" class="pf-sec" data-cam="${i}">
      ${body(c, i)}
    </section>`;
  }).join('\n');
  return `
  <div class="pf-night" aria-hidden="true"></div>
  <div class="pf-scrim" aria-hidden="true"></div>
  <div class="pf-veil" aria-hidden="true"></div>
  <div class="pf-vignette" aria-hidden="true"></div>
  <a class="pf-skiplink" href="#heritage">Skip to content</a>
  <header class="pf-nav">
    <a class="pf-brand" href="#arrival" data-cursor aria-label="${esc(C.department.name)}, back to the start"><span class="pf-brand-tx"><b>Instrument Technology</b><i>Andhra University</i></span></a>
    <nav class="pf-links" id="pf-links" aria-label="Chapters">${groups.map(([g, t]) => `<a class="pf-link" href="#${firstOf(g).id}" data-group="${g}" data-cursor><span>${esc(t)}</span><span class="alt" aria-hidden="true">${esc(where[g])}</span></a>`).join('')}</nav>
    <button class="pf-skip pf-sound" id="sound" type="button" aria-pressed="true" aria-label="Mute ambient sound" data-cursor>Sound on</button>
    <button class="pf-burger" aria-label="Chapters" aria-controls="pf-links" aria-expanded="false" data-cursor><i></i><i></i></button>
  </header>
  <nav class="pf-rail" aria-label="Chapter position">${chapters.slice(0, -1).map((c, i) => `<button data-rail="${i}" aria-label="${esc(c.nav)}" title="${esc(c.nav)}"><i></i></button>`).join('')}</nav>
  <p class="pf-where" aria-live="polite"><span class="pf-where-dot"></span><span class="pf-where-tx"></span></p>
  <button class="pf-skip-intro" type="button" data-cursor>Skip intro</button>
  <main class="pf-doc">
    <section id="arrival" class="pf-sec pf-hero" data-cam="0">
      <div class="pf-hero-top">
        <p class="pf-eyebrow pf-live" data-rv="fade"><span class="dot"></span><span class="pf-live-tx">Live from Visakhapatnam</span></p>
        <h1 class="pf-display pf-h-hero" aria-label="${esc(hero.lines.join(' '))}">${hero.lines.map(l => `<span class="pf-line">${esc(l)}</span>`).join('')}</h1>
        <p class="pf-hero-sub" data-rv="up">${esc(hero.lead)}</p>
      </div>
      <div class="pf-hero-foot">
        <p class="pf-cue" data-rv="fade"><span>${esc(hero.cue)}</span><span class="track"><i></i></span></p>
        <div class="pf-chips">${hero.chips.map(c => `<a class="pf-chip" href="#${firstOf(c.group).id}" data-rv="up" data-cursor><span class="num">${c.n}</span><span class="tx"><b>${esc(c.title)}</b><span>${esc(c.text)}</span></span></a>`).join('')}</div>
      </div>
    </section>
    ${stops}
  </main>
  <div class="pf-cursor" aria-hidden="true"></div>`;
}

// -------------------------------------------------------------------------------------------------- the wordmark
// "IST" over the front lawn (owner, 2026-10-19: the initials, floating, after Kage's wordmark): one plane per glyph, rising
// out of the ground after the building, then hanging in the air with a slow drift of its own, and dissolving as the
// camera passes through it on the way to the porch. It stands on the hero's line of sight (the overview, high on the
// front right), turned to face it.
async function buildWordmark(scene) {
  const word = 'IST', height = 4.4, offsetX = 0, group = new T.Group(); group.name = 'Portfolio wordmark'; scene.add(group);
  group.position.set(24.5, 0, 46.5); group.rotation.y = Math.atan2(42 - 24.5, 80 - 46.5); // facing the hero's eye (chapters[0])
  try { await document.fonts.load('700 200px "Instrument Sans"'); } catch {}
  const glyphs = [], measure = document.createElement('canvas').getContext('2d'); measure.font = '700 400px "Instrument Sans"';
  const widths = [...word].map(ch => measure.measureText(ch).width / 400 * height * 1.04), gap = height * .32; // wide tracking, as Kage sets its four letters
  const total = widths.reduce((a, b) => a + b, 0) + gap * (word.length - 1);
  let x = offsetX - total / 2;
  [...word].forEach((ch, i) => {
    const w = widths[i], c = document.createElement('canvas'); c.width = Math.ceil(w / height * 512); c.height = 512;
    const g = c.getContext('2d'); g.font = '700 400px "Instrument Sans"'; g.textBaseline = 'alphabetic'; g.textAlign = 'center';
    const wash = g.createLinearGradient(0, 40, 0, 470); wash.addColorStop(0, '#f4efe0'); wash.addColorStop(.7, '#e6dfca'); wash.addColorStop(1, '#a99f86'); // whitewash, darker at the foot
    g.fillStyle = wash; g.fillText(ch, c.width / 2, 470);
    const map = new T.CanvasTexture(c); map.colorSpace = T.SRGBColorSpace; map.anisotropy = 8;
    const material = new T.MeshStandardMaterial({ map, transparent: true, alphaTest: .02, roughness: .8, emissive: '#ffffff', emissiveMap: map, emissiveIntensity: .3, depthTest: false, depthWrite: false, side: T.DoubleSide }); // lit a little from within, so it reads at night too
    const mesh = new T.Mesh(new T.PlaneGeometry(w, height), material); mesh.position.set(x + w / 2, height / 2 + 6.4, 0); mesh.renderOrder = 8; // floats over the scenery: no branch cuts a letter
    group.add(mesh); glyphs.push({ mesh, material, base: mesh.position.y, delay: i * .14, phase: i * 2.1, rate: .55 + i * .07 }); x += w + gap;
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
    // a turn costs more than a step: the frames are spaced by cost, so turns get more of them (each re-aimed exactly);
    // out in front of the building (z beyond the porch) a metre costs 0.4: all in view is far off, so the glide in from
    // the overview and the climb out over the campus go by in fewer frames and fewer screens of scrolling
    // through a wall under the veil (b.through) a metre costs next to nothing: that stretch is a breath of scroll, not
    // screens of a dark page (owner, 2026-10-27: the screen went dark for a long scroll before Step inside)
    const veiled = b.through && P[i].z > b.through[0] - .8 && P[i].z < b.through[1] + 1.2;
    if (prev) cost += (P[i].distanceTo(prev.p) * (veiled ? 1 : P[i].z > 8.5 ? .4 : 1) + 2.2 * Math.abs(angle(prev.yaw, yaw)) + Math.abs(pitch - prev.pitch) + .02 * Math.abs(fov - prev.fov)) * (veiled ? .04 : 1);
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
      out.veil = cross ? smooth(cross[0] - .6, cross[0], s) * (1 - smooth(cross[1], cross[1] + .8, s)) : 0;
      return out;
    },
  };
}

// --------------------------------------------------------------------------------------------------- the cloth
// After Kage's plates (Canvas UI's Cloth): each photo plate hangs like fabric, pinned along its top, stirred by a slow
// wind, and pushed out where the cursor touches it; folds catch the light. A height field on a 48 x 48 grid (wave
// equation, 120 steps a second), drawn with perspective so a fold lifts toward the viewer.
const CL_SEG = 48, CL_N = CL_SEG + 1, CL_DT = 1 / 120, CL_WAVE = 15, CL_STIFF = .55, CL_GAIN = 5, CL_BLEED = 40;
const CLOTH = { wind: 1.6, speed: .5, amplitude: 26, drape: 26, brush: 1.05, brushSize: 50, damping: 1.4, // calmer under the hand (owner, 2026-10-27)
   light: .85, sheen: .22, focal: 800 }; // scaled to these ~200 px plates
const clothVertex = /* glsl */`
  attribute vec4 aData; attribute vec2 aOffset;
  uniform vec2 uRes, uOut, uSrc, uPad; uniform float uFocal, uGenie;
  varying vec2 vUv; varying vec3 vNormal; varying float vFold; varying float vGenie;
  void main() {
    vUv = position.xy; float z = aData.x * uGenie; vec2 nxy = aData.yz * uGenie;
    vNormal = vec3(nxy, sqrt(max(1. - dot(nxy, nxy), .04))); vFold = mix(1., aData.w, uGenie);
    vec2 local = position.xy * uRes + aOffset * uGenie;
    // The genie (after macOS): the plate pours out of uSrc, the door's name plate, in plate pixels. Rows nearest the
    // source lead; each row's width opens as it travels, so the plate funnels along a curve and lands square.
    float row = 1. - position.y; // the top row is nearest a sign above the plate's top edge
    float k = clamp(uGenie * 1.7 - row * .7, 0., 1.), ky = k * k * (3. - 2. * k), kw = pow(ky, 1.8);
    vec2 centre = vec2(uRes.x * .5, local.y);
    local = vec2(mix(uSrc.x, centre.x, pow(ky, .7)) + (local.x - centre.x) * mix(.03, 1., kw), mix(uSrc.y, local.y, ky));
    vGenie = ky;
    vec2 px = local + uPad, ndc = px / uOut * 2. - 1.; ndc.y = -ndc.y; // uPad: the plate's corner within the drawn area
    gl_Position = vec4(ndc, -z / uFocal, (uFocal - z) / uFocal);
  }`;
const clothFragment = /* glsl */`
  uniform sampler2D tA, tB; uniform float uMix, uAlpha, uLight, uSheen, uEdge; uniform vec2 uRes;
  varying vec2 vUv; varying vec3 vNormal; varying float vFold; varying float vGenie;
  void main() {
    vec2 uv = vec2(vUv.x, 1. - vUv.y); // the texture's first row is its bottom (a photo loaded with flipY)
    vec3 c = mix(texture2D(tA, uv).rgb, texture2D(tB, uv).rgb, smoothstep(0., 1., uMix));
    vec2 q = vUv - .5; c *= 1. - .55 * dot(q, q); c *= mix(1., .62, smoothstep(.55, 1., vUv.y));
    vec3 n = normalize(vNormal), L = normalize(vec3(-.3, .42, .86));
    c *= mix(1., (.58 + .42 * dot(n, L)) / (.58 + .42 * L.z) * vFold, uLight);
    vec3 H = normalize(L + vec3(0., 0., 1.)); float flat_ = pow(H.z, 34.);
    c += uSheen * max(pow(max(dot(n, H), 0.), 34.) - flat_, 0.) / (1. - flat_) * mix(vec3(1.), c, .35);
    vec2 e = min(vUv, 1. - vUv) * uRes; c += smoothstep(1.2, .2, min(e.x, e.y)) * uEdge * vec3(.91, .89, .84); // a hairline that rides the folds
    gl_FragColor = vec4(c, uAlpha * smoothstep(0., .35, vGenie));
  }`;
function createCloth(opts = {}) {
  const CLOTH_ = { ...CLOTH, ...opts };
  const grid = new Float32Array(CL_N * CL_N * 3), idx = [];
  for (let y = 0; y < CL_N; y++) for (let x = 0; x < CL_N; x++) grid.set([x / CL_SEG, y / CL_SEG, 0], (y * CL_N + x) * 3);
  for (let y = 0; y < CL_SEG; y++) for (let x = 0; x < CL_SEG; x++) { const a = y * CL_N + x, b = a + 1, c = a + CL_N, d = c + 1; idx.push(a, c, b, b, c, d); }
  const g = new T.BufferGeometry();
  g.setAttribute('position', new T.BufferAttribute(grid, 3)); g.setIndex(idx);
  const data = new T.BufferAttribute(new Float32Array(CL_N * CL_N * 4), 4).setUsage(T.DynamicDrawUsage);
  const offset = new T.BufferAttribute(new Float32Array(CL_N * CL_N * 2), 2).setUsage(T.DynamicDrawUsage);
  g.setAttribute('aData', data); g.setAttribute('aOffset', offset);
  const material = new T.ShaderMaterial({ vertexShader: clothVertex, fragmentShader: clothFragment, transparent: true, depthTest: false, depthWrite: false, toneMapped: false,
    uniforms: { tA: { value: null }, tB: { value: null }, uMix: { value: 0 }, uAlpha: { value: 1 }, uLight: { value: CLOTH_.light }, uSheen: { value: CLOTH_.sheen }, uEdge: { value: .05 },
      uRes: { value: new T.Vector2(1, 1) }, uOut: { value: new T.Vector2(1, 1) }, uSrc: { value: new T.Vector2() }, uPad: { value: new T.Vector2(CL_BLEED, CL_BLEED) }, uGenie: { value: 1 }, uFocal: { value: CLOTH_.focal } } });
  const mesh = new T.Mesh(g, material); mesh.frustumCulled = false;
  const scene = new T.Scene(); scene.add(mesh);
  let hCur = new Float32Array(CL_N * CL_N), hPrev = new Float32Array(CL_N * CL_N), hNext = new Float32Array(CL_N * CL_N);
  const zF = new Float32Array(CL_N * CL_N), rowF = new Float32Array(CL_N), colF = new Float32Array(CL_N), hang = new Float32Array(CL_N);
  for (let a = 0; a < CL_N; a++) hang[a] = Math.pow(a / CL_SEG, 1.3);
  let time = Math.random() * 60, gust = .5, debt = 0, edge = .05;
  const touch = { x: -1e5, y: -1e5, vx: 0, vy: 0, s: 0 };
  function step(dt) {
    time += dt * CLOTH_.speed;
    const t = time, windAmp = CL_GAIN * CLOTH_.wind * gust, kb1 = 2 * Math.PI / (CL_SEG / 1.5), kb2 = 2 * Math.PI / (CL_SEG / 3.8), ka = 2 * Math.PI / (CL_SEG / 2.2);
    const w1 = CL_WAVE * kb1, w2 = CL_WAVE * kb2, drift = 1.8 * Math.sin(.23 * t);
    for (let b = 0; b < CL_N; b++) rowF[b] = Math.sin(kb1 * b - w1 * t + drift) + .45 * Math.sin(kb2 * b + w2 * t * .8 + 3);
    for (let a = 0; a < CL_N; a++) colF[a] = (.7 + .3 * Math.sin(ka * a - 1.7 * t)) * hang[a];
    const c2 = CL_WAVE * CL_WAVE, dt2 = dt * dt, decay = Math.exp(-CLOTH_.damping * dt);
    for (let y = 0; y < CL_N; y++) {
      const up = Math.max(y - 1, 0) * CL_N, down = Math.min(y + 1, CL_SEG) * CL_N, row = y * CL_N;
      for (let x = 0; x < CL_N; x++) {
        const i = row + x, h = hCur[i];
        const lap = hCur[row + Math.max(x - 1, 0)] + hCur[row + Math.min(x + 1, CL_SEG)] + hCur[up + x] + hCur[down + x] - 4 * h;
        const next = 2 * h - hPrev[i] + dt2 * (c2 * lap - CL_STIFF * h + windAmp * rowF[x] * colF[y]);
        hNext[i] = Math.max(-3.5, Math.min(3.5, h + (next - h) * decay));
      }
    }
    for (let x = 0; x < CL_N; x++) hNext[x] = 0; // pinned along the top
    [hPrev, hCur, hNext] = [hCur, hNext, hPrev];
  }
  function imprint(dt, w, h) {
    if (touch.s < .01) return;
    const cw = w / CL_SEG, ch = h / CL_SEG, rx = CLOTH_.brushSize / cw, ry = CLOTH_.brushSize / ch, gx = touch.x / cw, gy = touch.y / ch;
    const lift = 1.1 * CLOTH_.brush * touch.s, rate = Math.min(dt * 4, 1);
    for (let y = Math.max(Math.ceil(gy - 2.5 * ry), 0); y <= Math.min(Math.floor(gy + 2.5 * ry), CL_SEG); y++) {
      const oy = (y - gy) / ry;
      for (let x = Math.max(Math.ceil(gx - 2.5 * rx), 0); x <= Math.min(Math.floor(gx + 2.5 * rx), CL_SEG); x++) {
        const ox = (x - gx) / rx, k = Math.exp(-(ox * ox + oy * oy)); if (k < .02) continue;
        const i = y * CL_N + x, pull = rate * k, goal = lift * k;
        hCur[i] += (goal - hCur[i]) * pull; hPrev[i] += (goal - hPrev[i]) * pull;
      }
    }
  }
  // the fabric does not stretch: where it tilts, the points below the pin (and either side of the middle) draw in
  function foreshorten(o, stride, lineStride, ds, anchor, comp) {
    const ds2 = ds * ds;
    for (let l = 0; l < CL_N; l++) {
      const base = l * lineStride; o[(base + anchor * stride) * 2 + comp] = 0;
      let cum = 0;
      for (let k = anchor + 1; k < CL_N; k++) { const i = base + k * stride, dz = zF[i] - zF[i - stride]; cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0)); o[i * 2 + comp] = -cum; }
      cum = 0;
      for (let k = anchor - 1; k >= 0; k--) { const i = base + k * stride, dz = zF[i] - zF[i + stride]; cum += ds - Math.sqrt(Math.max(ds2 - dz * dz, 0)); o[i * 2 + comp] = cum; }
    }
  }
  const lean = { x: 0, y: 0, z: 0 };
  function compose(w, h) {
    const cw = w / CL_SEG, ch = h / CL_SEG, drape = CLOTH_.drape * (.3 + .7 * gust), d = data.array;
    // the sheet's mean slope (across, down) and lift, without the drape's constant hang
    const zw = i => CLOTH_.amplitude * Math.tanh(hCur[i]);
    let sx = 0, sy = 0, sz = 0;
    for (let a = 0; a < CL_N; a++) { sx += zw(a * CL_N + CL_SEG) - zw(a * CL_N); sy += zw(CL_SEG * CL_N + a) - zw(a); }
    for (let i = 0; i < CL_N * CL_N; i += 7) sz += zw(i);
    lean.x = sx / CL_N / w; lean.y = sy / CL_N / h; lean.z = sz / Math.ceil(CL_N * CL_N / 7);
    for (let y = 0; y < CL_N; y++) for (let x = 0; x < CL_N; x++) { const i = y * CL_N + x; zF[i] = CLOTH_.amplitude * Math.tanh(hCur[i]) + drape * hang[y]; }
    for (let y = 0; y < CL_N; y++) {
      const up = Math.max(y - 1, 0) * CL_N, down = Math.min(y + 1, CL_SEG) * CL_N, row = y * CL_N;
      for (let x = 0; x < CL_N; x++) {
        const i = row + x, l = row + Math.max(x - 1, 0), r = row + Math.min(x + 1, CL_SEG);
        const dzdx = (zF[r] - zF[l]) / (2 * cw), dzdy = (zF[down + x] - zF[up + x]) / (2 * ch), inv = 1 / Math.hypot(dzdx, dzdy, 1);
        const fold = Math.max(.86, Math.min(1.06, 1 - (zF[l] + zF[r] + zF[up + x] + zF[down + x] - 4 * zF[i]) * .01));
        d[i * 4] = zF[i]; d[i * 4 + 1] = -dzdx * inv; d[i * 4 + 2] = -dzdy * inv; d[i * 4 + 3] = fold;
      }
    }
    foreshorten(offset.array, CL_N, 1, ch, 0, 1); foreshorten(offset.array, 1, CL_N, cw, CL_SEG >> 1, 0);
    data.needsUpdate = true; offset.needsUpdate = true;
  }
  return {
    scene, material, lean,
    // dt: seconds; w, h: the window's size in CSS pixels; px, py: the pointer in the window (null when outside)
    update(dt, w, h, px, py, still) {
      if (!still) {
        const target = Math.max(.55 + .35 * Math.sin(time * .31 + 1.3) + .25 * Math.sin(time * .83) * (.5 + .5 * Math.sin(time * .17)), .15);
        gust += (target - gust) * Math.min(dt * 2, 1);
        const inside = px != null;
        if (inside) { touch.tx = px; touch.ty = py; if (touch.s < .01) { touch.x = px; touch.y = py; } }
        touch.s += ((inside ? 1 : 0) - touch.s) * Math.min(dt * (inside ? 8 : 2.5), 1);
        const om = 14;
        touch.vx += (((touch.tx ?? touch.x) - touch.x) * om * om - 2 * om * touch.vx) * dt; touch.vy += (((touch.ty ?? touch.y) - touch.y) * om * om - 2 * om * touch.vy) * dt;
        touch.x += touch.vx * dt; touch.y += touch.vy * dt;
        imprint(dt, w, h);
        edge += ((inside ? .32 : .05) - edge) * Math.min(dt * 5, 1);
        debt = Math.min(debt + dt, CL_DT * 5);
        while (debt >= CL_DT) { step(CL_DT); debt -= CL_DT; }
      }
      compose(w, h);
      material.uniforms.uEdge.value = edge;
    },
  };
}

// ------------------------------------------------------------------------------------------- photo plates
// The professors' photographs, hung as cloth (above) over the rectangle of their frame on the page. Drawn after the
// main view; the frame on the page only holds the place and the caption.
const CARD = { wind: .7, amplitude: 18, drape: 9, brush: 1.7, brushSize: 120, light: .95, sheen: .15, focal: 1100 };
// The viewport's size, read once per resize: per-frame code never asks the window (after a style write that read
// forces a whole style and layout pass; a scroll did it once per plate per frame).
const view = { w: innerWidth, h: innerHeight };
addEventListener('resize', () => { view.w = innerWidth; view.h = innerHeight; });
function createPlates(renderer) {
  const flatCam = new T.Camera(), loader = new T.TextureLoader(), list = [];
  const ink = new T.DataTexture(new Uint8Array([10, 17, 32, 255]), 1, 1); ink.needsUpdate = true; // the night's ink, #0a1120
  let frame = 0;
  const visible = p => p.rect && p.tex && p.rect.width >= 8 && p.rect.bottom > -60 && p.rect.top < view.h + 60 && p.alpha >= .02;
  return {
    list,
    // a photo: pours out of its door's sign (the genie) and hangs as cloth; onIn: once it has landed
    attach(el, onIn, onOut) {
      const p = { kind: 'photo', cloth: createCloth(), el, frame: el.querySelector('[data-frame]') || el, tex: null, rect: null, alpha: 0, genie: 0, want: 0, src: new T.Vector2(), onIn, onOut };
      // the photo's bytes go straight to the screen, like the copied frames the cloth was written for: no colour conversion
      loader.load(el.dataset.photo, t => { t.colorSpace = T.NoColorSpace; t.anisotropy = 4; p.tex = t; });
      list.push(p); return p;
    },
    // a description's card: a sheet of the night's ink behind the text, hung from its top edge, giving way under the
    // hand; the text stays crisp in the page above it and leans with the sheet. after: the stop's photo plate, which
    // lands before the card comes in
    card(el, after = null) {
      const p = { kind: 'card', cloth: createCloth(CARD), el, frame: el, tex: ink, rect: null, alpha: 0, genie: 1, want: 0, src: new T.Vector2(), pad: 30, after, words: el.querySelector('.pf-lean'), leant: '' };
      list.push(p); return p;
    },
    invalidate() { for (const p of list) p.box = null; }, // the layout changed: measure again on the next frame
    // per page frame: where each plate is, its genie and its cloth; pointer: { x, y } in the page, or null; here(el):
    // { on, x, y }: whether the plate's stop is being read and where its door's sign is on screen. True while any shows.
    // sy: the page's scroll position (from Lenis, not the window); scrolling: the page is moving (a card's sheet then
    // hangs as it is unless the hand is on it: nobody reads a fold mid-scroll, and the simulation is the costly part)
    update(dt, pointer, still, measureAlpha, here, near, sy, scrolling) {
      frame++;
      let moving = false;
      for (const p of list) {
        if (!near(p.el) && p.alpha <= .001 && (p.kind === 'card' || p.genie <= .001)) { p.box = null; p.calm = 0; continue; } // far off and out: nothing to do
        // where the plate is: measured (a layout) when it comes near and after the layout changes, and between those
        // carried by the scroll alone; a photo's opacity (a style walk) every 30th frame
        const fresh = !p.box || p.kind === 'photo'; // a photo's frame is sticky (it stays put while its chapter scrolls): measured every frame
        // measured against the page's real scroll at that moment (the layout is fresh, so it costs nothing); the smooth
        // scroll's own figure can lag a touch fling by a few pixels, and a plate measured with it snapped later (E2E)
        if (fresh) { const r = p.frame.getBoundingClientRect(), d = p.pad ?? 0, real = window.scrollY; p.box = { left: r.left - d, top: r.top + real - d, width: r.width + 2 * d, height: r.height + 2 * d }; }
        if (p.kind === 'photo' && (fresh || frame % 30 === 0)) p.alpha = measureAlpha(p.el);
        const top = p.box.top - sy;
        p.rect = { left: p.box.left, top, width: p.box.width, height: p.box.height, right: p.box.left + p.box.width, bottom: top + p.box.height };
        const h = here(p.el); p.want = h.on && (!p.after || p.after.landed) ? 1 : 0;
        if (p.kind === 'card') { // a card fades in while its stop is being read
          const a = p.alpha; p.alpha = still ? p.want * .82 : p.alpha + Math.sign(p.want * .82 - p.alpha) * Math.min(Math.abs(p.want * .82 - p.alpha), dt / .6);
          if (p.alpha !== a) moving = true;
        } else {
          if (h.on) p.src.set(h.x - p.rect.left, h.y - p.rect.top);
          const g = p.genie; p.genie = still ? p.want : p.genie + Math.sign(p.want - p.genie) * Math.min(Math.abs(p.want - p.genie), dt / .85);
          if (p.genie !== g) moving = true;
          // the photo first, then its card and words; once it has gone back into the sign, they go too
          if (p.genie >= .98 && !p.landed) { p.landed = true; p.onIn?.(); }
          if (p.genie <= .02 && p.landed) { p.landed = false; p.onOut?.(); }
        }
        if (!visible(p) || p.genie <= .001) { p.calm = 0; continue; }
        const r = p.rect, inside = pointer && pointer.x >= r.left - 10 && pointer.x <= r.right + 10 && pointer.y >= r.top - 10 && pointer.y <= r.bottom + 10;
        // Battery (owner, 2026-10-19): a sheet sways while it comes in and while the hand is on it; a few seconds after,
        // it is left hanging as it is and nothing is drawn for it until the hand comes back.
        p.calm = inside || p.genie < 1 || (p.kind === 'card' && Math.abs(p.alpha - p.want * .82) > .01) ? 0 : (p.calm || 0) + dt;
        if (p.calm > (p.kind === 'card' ? 2.5 : 4)) { // at rest the words settle back flat, where text is sharpest
          if (p.words && p.leant) { p.leant = ''; p.words.style.transition = 'transform 1.2s cubic-bezier(.22, 1, .36, 1)'; p.words.style.transform = ''; setTimeout(() => { if (!p.leant) p.words.style.willChange = ''; }, 1300); }
          continue;
        }
        if (p.kind === 'card' && scrolling && !inside) { // hung as it is mid-scroll; shaped once if it came in mid-scroll
          if (!p.shaped) { p.cloth.update(0, r.width, r.height, null, null, true); p.shaped = true; }
          continue;
        }
        p.shaped = true;
        p.cloth.update(dt, r.width, r.height, inside ? pointer.x - r.left : null, inside ? pointer.y - r.top : null, still); moving = true;
        if (p.words) { // the words lean with the sheet, a few degrees at most: read through the fold, never off it
          const l = p.cloth.lean, deg = v => Math.max(-3, Math.min(3, Math.atan(v * 1.6) * 180 / Math.PI)).toFixed(2);
          const rx = deg(-l.y), ry = deg(l.x), z = (l.z * .6).toFixed(1);
          const t = `perspective(1600px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(${z}px)`;
          // its own GPU layer while it moves (a transformed block of text is otherwise repainted every frame)
          if (t !== p.leant) { if (!p.leant) p.words.style.willChange = 'transform'; p.leant = t; p.words.style.transition = ''; p.words.style.transform = t; }
        }
      }
      return moving;
    },
    // the cloth's program, compiled with the campus's (the first card drawn compiled it mid-scroll; E2E 2026-11-01)
    compile: () => list[0] && renderer.compileAsync(list[0].cloth.scene, flatCam),
    // after the main view: each plate over its rectangle, drawn with a margin so a fold can lift past the frame
    draw() {
      const keepClear = renderer.autoClear; renderer.autoClear = false;
      let drew = false;
      for (const p of [...list].sort((a, b) => (a.kind === 'card' ? 0 : 1) - (b.kind === 'card' ? 0 : 1))) {
        if (!visible(p) || p.genie <= .001) continue;
        // drawn over the plate with a margin for its folds, and while the genie runs, over the way to the door's sign too
        const r = p.rect, H = renderer.domElement.height / renderer.getPixelRatio(), B = CL_BLEED, u = p.cloth.material.uniforms;
        let x0 = r.left - B, y0 = r.top - B, x1 = r.right + B, y1 = r.bottom + B;
        if (p.genie < 1) { const sx = r.left + p.src.x, sy = r.top + p.src.y; x0 = Math.min(x0, sx - 30); y0 = Math.min(y0, sy - 30); x1 = Math.max(x1, sx + 30); y1 = Math.max(y1, sy + 30); }
        renderer.setViewport(x0, H - y1, x1 - x0, y1 - y0); renderer.setScissor(x0, H - y1, x1 - x0, y1 - y0); renderer.setScissorTest(true);
        u.uPad.value.set(r.left - x0, r.top - y0);
        u.tA.value = u.tB.value = p.tex; u.uMix.value = 0; u.uAlpha.value = p.alpha; u.uGenie.value = p.genie; u.uSrc.value.copy(p.src);
        u.uRes.value.set(r.width, r.height); u.uOut.value.set(x1 - x0, y1 - y0);
        renderer.render(p.cloth.scene, flatCam); drew = true;
      }
      if (drew) { const pr = renderer.getPixelRatio(), w = renderer.domElement.width / pr, h = renderer.domElement.height / pr; renderer.setScissorTest(false); renderer.setViewport(0, 0, w, h); renderer.setScissor(0, 0, w, h); }
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
    fragmentShader: 'varying float vA; void main() { if (vA <= 0.) discard; float r = length(gl_PointCoord - .5) * 2.; float a = exp(-r * r * 4.) + .5 * exp(-r * r * 30.); gl_FragColor = vec4(vec3(.78, .9, 1.) * a, a * vA); }',
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
    mesh,
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
// The story over the live campus: the page, its scroll, and the camera that follows it.
export function createPortfolio({ scene, camera, renderer, reduced, changed }) {
  // hidden and idle until shown (wait, show): the campus page opened for explore or walk never shows it (E2E N2, N3)
  const root = document.createElement('div'); root.id = 'portfolio'; root.hidden = true; root.innerHTML = markup(); document.body.append(root);
  const $ = s => root.querySelector(s), $$ = s => [...root.querySelectorAll(s)];
  const coarse = matchMedia('(pointer: coarse)').matches;
  const sections = $$('[data-cam]'), walks = $$('[data-walk]'), chapters = C.chapters;
  const rig = { prog: 0, smooth: 0, mx: 0, my: 0, tmx: 0, tmy: 0, intro: 1, fly: 1, nx: 0, ny: 0 }; // fly: the arrival flight, 0..1 (1: done)
  let segments = [], holds = [], drift = [], maxScroll = 1, active = false, wordmark = null, wordT = reduced ? 99 : -1, lastChapter = -1, aspect = innerWidth / innerHeight;
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
    // each walk's scroll distance is its cost, the same everywhere (owner, 2026-10-26: every frame matches every tiny
    // scroll at every point): a screen for about every 7.7 m walked (48 frames), long walks too; the copy's own
    // margins give each walk 0.17 of a screen besides its spacer
    walks.forEach(w => { const s = segments[+w.dataset.walk]; w.style.height = `${Math.round(Math.max(.05, s.cost * PER_COST - .17) * vh)}px`; });
    maxScroll = Math.max(1, document.documentElement.scrollHeight - vh);
    holds = sections.map((el, i) => {
      if (i === 0) return [0, Math.max(0, el.offsetTop + el.offsetHeight - vh * 1.02)];
      const a = clamp(el.offsetTop - vh * .45, 0, maxScroll), b = i === sections.length - 1 ? maxScroll : clamp(el.offsetTop + el.offsetHeight - vh * .62, a, maxScroll);
      return [a, Math.max(a, b)];
    });
    for (let i = 1; i < holds.length; i++) { holds[i][0] = Math.max(holds[i][0], holds[i - 1][1] + 1); holds[i][1] = Math.max(holds[i][1], holds[i][0]); }
    // while a chapter is read the camera still drifts on, a few centimetres into the next walk, so no scroll is ever
    // without its movement
    drift = holds.map(([a, b], i) => i + 1 < holds.length ? Math.min(.1, (chapters[i].outdoors ? .2 : .1) * clamp((b - a) / vh) / Math.max(.5, segments[i + 1].cost)) : 0); // by the hold's length: none where there is none
    lenis?.resize(); // the walks changed the page's height: Lenis must not clamp to the old one
  }
  function progressFor(y) {
    for (let i = 0; i < holds.length; i++) {
      if (y <= holds[i][1]) {
        const [a, b] = holds[i];
        if (y >= a || i === 0) return i + drift[i] * clamp((y - a) / Math.max(1, b - a));
        const d = drift[i - 1], e = holds[i - 1][1];
        if (a - y < .5) return i; // under a pixel off a stop is on it (a resize left 9.9991); no more, or a tiny scroll shows nothing
        return i - 1 + d + (1 - d) * (y - e) / Math.max(1, a - e);
      }
    }
    return holds.length - 1;
  }
  // the scroll position that shows progress k (the inverse of progressFor)
  function scrollAt(k) {
    const i = clamp(Math.floor(k), 0, holds.length - 1), f = k - i, [a, b] = holds[i], d = drift[i];
    if (i === holds.length - 1 || f <= d) return a + (b - a) * (d ? clamp(f / d) : 0);
    return b + (holds[i + 1][0] - b) * (f - d) / (1 - d);
  }
  const scrollFor = i => holds[i] ? holds[i][0] + (i === 0 ? 0 : Math.min(innerHeight * .12, (holds[i][1] - holds[i][0]) * .5)) : 0;

  // the arrival: a long-lens dolly in from further down the drive while the building rises
  // The arrival (owner, 2026-10-25): no loading screen; out of the sky and round the department while it rises, to the
  // 3D model's own opening view, high on the front right. Shot like a drone over a build: a short drop from the sky,
  // tilting from straight down to an angle as the ground storey breaks through (from directly above, rising walls
  // read as flat slabs appearing); then a low, close orbit, west, rear, east, climbing with the storeys as they land;
  // then the pull-back to the overview, timed to settle as the last signs land. The camera keeps moving to the end.
  const flight = (() => {
    const pts = [ // [eye, look-at, fov]
      [[-6, 92, 48], [0, 0, 6], 46],         // in the sky over the site, looking down
      [[-30, 40, 36], [0, 2, 2], 50],        // dropping to the front left: the ground storey seen breaking through
      [[-60, 20, 8], [0, 4, 0], 52],         // along the west wing, clear of its roof
      [[-28, 17, -38], [0, 5.5, -2], 52],    // the rear corner, the storeys stacking
      [[22, 21, -42], [2, 7, -2], 50],       // across the back, climbing with them
      [[52, 20, 0], [4, 8.5, 0], 48],        // the east wing's end
      [[58, 19, 50], [2, 11, 0], 45],        // round to the front right, pulling back
      [[42, 18, 80], [0, 13, 0], 43],        // the model's opening view (chapters[0])
    ];
    const eye = new T.CatmullRomCurve3(pts.map(p => V(p[0])), false, 'centripetal'), look = new T.CatmullRomCurve3(pts.map(p => V(p[1])), false, 'centripetal');
    const fovAt = u => { const k = u * (pts.length - 1), i = Math.min(pts.length - 2, Math.floor(k)); return pts[i][2] + (pts[i + 1][2] - pts[i][2]) * (k - i); };
    // sampled once (arc-length lookups per frame cost a millisecond or two of a 16 ms frame); read by interpolation
    const N = 1200, E = eye.getSpacedPoints(N), Lk = look.getSpacedPoints(N), L = new T.Vector3();
    return (t, out) => {
      const u = 1 - Math.pow(1 - clamp(t), 1.3); // nearly even, a gentle settle at the end: the orbit spans the rise
      const k = u * N, i = Math.min(N - 1, Math.floor(k)), f = k - i;
      out.p.lerpVectors(E[i], E[i + 1], f); L.lerpVectors(Lk[i], Lk[i + 1], f);
      const d = L.sub(out.p); out.yaw = yawOf(d); out.pitch = pitchOf(d); out.fov = fovAt(u); out.outdoors = true; out.veil = 0;
    };
  })();
  // The camera's pose without the hand-held parallax: at scroll position k (chapters) or, while fly < 1, on the arrival
  // flight.
  function basePose(k, fly, out = pose) {
    const N = chapters.length - 1; k = clamp(k, 0, N);
    const i = Math.min(N - 1, Math.floor(k)), f = k - i;
    if (f < 1e-5 && k < N) { const c = chapters[i], F = framing(c, aspect); out.p.set(...c.eye); out.yaw = F.yaw; out.pitch = F.pitch; out.fov = F.fov; out.outdoors = !!c.outdoors; out.veil = 0; }
    else segments[i + 1].sample(f, out);
    if (k >= N) { const c = chapters[N], F = framing(c, aspect); out.p.set(...c.eye); out.yaw = F.yaw; out.pitch = F.pitch; out.fov = F.fov; out.outdoors = true; out.veil = 0; }
    if (fly < 1) { // the flight, blended over its last stretch into the page's own hero pose (a wider lens on tall screens)
      const p = out.p.clone(), yaw = out.yaw, pitch = out.pitch, fov = out.fov, w = smooth(.82, 1, fly);
      flight(fly, out);
      out.p.lerp(p, w); out.yaw = lerpAngle(out.yaw, yaw, w); out.pitch += (pitch - out.pitch) * w; out.fov += (fov - out.fov) * w;
    }
    return out;
  }
  const lookFrom = (p, yaw, pitch) => { dir.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)); camera.position.copy(p); camera.lookAt(p.clone().add(dir)); };
  // the parallax of the frame on screen: camera shift (metres, along its right and up) and turn (radians)
  const sway = { x: 0, y: 0, yaw: 0, pitch: 0 };
  function apply() {
    const flying = rig.fly < 1;
    basePose(rig.smooth, rig.fly);
    // hand-held parallax: generous outdoors, a breath indoors
    const out = pose.outdoors ? 1 : 0, still = flying ? 0 : 1 - Math.min(1, Math.abs(rig.smooth - rig.prog) * 3);
    const shift = flying ? 0 : (out ? .55 : .07) * (1 - smooth(0, 1.4, rig.smooth) * .5 * out), turn = (out ? .012 : .022) * still;
    sway.x = rig.mx * shift; sway.y = rig.my * shift * .5; sway.yaw = -rig.mx * turn; sway.pitch = rig.my * turn * .6;
    right.set(-Math.cos(pose.yaw), 0, Math.sin(pose.yaw));
    lookFrom(pose.p.clone().addScaledVector(right, sway.x).add(new T.Vector3(0, sway.y, 0)), pose.yaw + sway.yaw, pose.pitch + sway.pitch);
    const fov = pose.fov;
    if (Math.abs(camera.fov - fov) > 1e-4) { camera.fov = fov; camera.updateProjectionMatrix(); }
  }

  // ------------------------------------------------------------------ smooth scroll (Lenis), driven per frame from update()
  // touch through it as well (a fling is its glide, not the browser's), so the camera can hold every scroll to its frames
  // A turn of the wheel (or the finger) against a scroll still held back drops what was left of it: the page turns at once
  const lenis = new Lenis({ autoRaf: false, lerp: reduced ? 1 : .065, wheelMultiplier: .75, touchMultiplier: 1.2, syncTouch: !reduced,
    virtualScroll: ({ deltaY }) => { if (lenis && deltaY * (lenis.targetScroll - lenis.animatedScroll) < 0) lenis.targetScroll = lenis.animatedScroll; } });
  let scrollY = 0, steadyY = 0, nativeScroll = false; // nativeScroll: the last scroll was the browser's own (update) // steadyY: where the page was at the last frame (the browser's own jump to a link comes between frames)
  lenis.on('scroll', () => { scrollY = lenis.animatedScroll; rig.prog = progressFor(scrollY); });
  // A jump from the menu: to a near stop the camera walks there; further (over pre-rendered frames, which a long fast
  // walk would outrun) the view fades through the veil, the page lands on the stop, and the view comes back up there.
  let leap = null;
  const goTo = i => {
    if (introTl) skipIntro(); // a jump during the arrival ends it
    const y = scrollFor(i), d = Math.abs(y - scrollY) / innerHeight;
    lenis.scrollTo(y, { duration: reduced ? 0 : clamp(1.2 + d * .22, 1.2, 4.2), easing: x => x < .5 ? 4 * x ** 3 : 1 - (-2 * x + 2) ** 3 / 2, force: true });
  };
  function leapStep(dt) {
    if (!leap) return;
    if (leap.phase === 'out') { leap.veil = Math.min(1, leap.veil + dt / .32); if (leap.veil >= 1) { const y = leap.y ?? scrollY; lenis.scrollTo(y, { immediate: true, force: true }); rig.prog = progressFor(y); rig.smooth = rig.prog; leap.phase = 'land'; } } // y null: where the page is (a native scroll)
    else if (leap.phase === 'land') { leap.wait = (leap.wait || 0) + dt; leap.phase = 'in'; } // the frames there up first
    else { leap.veil = Math.max(0, leap.veil - dt / .45); if (leap.veil <= 0) leap = null; }
  }
  // the keys through it too (the browser's own key scroll could not be held to the frames); Home and End are a leap
  addEventListener('keydown', e => {
    if (!active || reduced || e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey || $('.pf-nav')?.classList.contains('menu-open')) return;
    if (e.target.closest?.('input, textarea, select, [contenteditable]') || (e.key === ' ' && e.target.closest?.('button, a, summary, [role="button"]'))) return;
    if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); goTo(e.key === 'Home' ? 0 : sections.length - 1); return; }
    const page = innerHeight * .85, d = { ArrowDown: 60, ArrowUp: -60, PageDown: page, PageUp: -page, ' ': e.shiftKey ? -page : page }[e.key];
    if (d === undefined) return;
    const from = d * (lenis.targetScroll - lenis.animatedScroll) < 0 ? lenis.animatedScroll : lenis.targetScroll; // a turn back drops what was held
    e.preventDefault(); lenis.scrollTo(from + d, { programmatic: false, lerp: lenis.options.lerp });
  });
  function relayout() { build(); measure(); rig.prog = progressFor(scrollY); wisps?.resize(); plates?.invalidate(); }
  addEventListener('resize', relayout);
  new ResizeObserver(() => { measure(); rig.prog = progressFor(scrollY); plates?.invalidate(); }).observe($('.pf-doc')); // opening a <details> moves the holds
  root.addEventListener('click', e => {
    if (e.target.closest('.pf-skip-intro')) { skipIntro(); return; }
    const rail = e.target.closest('[data-rail]'); if (rail) { goTo(+rail.dataset.rail); return; }
    const jump = e.target.closest('a[href^="#"]'); if (!jump) return;
    const el = document.getElementById(jump.getAttribute('href').slice(1)); if (!el) return;
    e.preventDefault(); closeMenu(); const i = sections.indexOf(el); goTo(i >= 0 ? i : 0);
    // the chapter can be shared and bookmarked, and Back steps through the chapters visited (E2E report M2)
    if (location.hash !== '#' + el.id) history.pushState(null, '', '#' + el.id);
    seenHash = location.hash;
  });
  // Back, Forward, or a link to a chapter of this page already open: the story goes there. A link has the browser jump
  // the page to the chapter first, taking the copy and its cards with it; that jump is undone at once and the story
  // makes its own (veiled) way there. Checked at the start of each frame too: a frame can come between the jump and
  // its hashchange event, and would take the jumped scroll for where the page was; and popstate comes before the jump,
  // so hashchange undoes a jump even for a chapter already set off for.
  let seenHash = location.hash;
  function onHash(e) {
    if (!active) return; // the campus is open in this page: its own address is not a chapter
    const fresh = location.hash !== seenHash;
    if (!fresh && e?.type !== 'hashchange') return;
    seenHash = location.hash;
    const i = location.hash.length > 1 ? sections.findIndex(s => s.id === decodeURIComponent(location.hash.slice(1))) : 0;
    const jumped = Math.abs(window.scrollY - steadyY) > 2;
    if (i < 0 || (!fresh && !jumped) || Math.abs(i - rig.smooth) <= .01) return;
    // the window itself: the smooth scroll has not heard of the jump yet, and takes the page to be there already
    if (jumped) { window.scrollTo({ top: steadyY, behavior: 'instant' }); lenis.scrollTo(steadyY, { immediate: true, force: true }); scrollY = steadyY; rig.prog = progressFor(steadyY); }
    goTo(i);
  }
  addEventListener('popstate', onHash);
  addEventListener('hashchange', onHash);

  // ------------------------------------------------------------------ nav, burger, rail, where-am-I line
  const nav = $('.pf-nav'), burger = $('.pf-burger'), links = $$('.pf-link'), rails = $$('[data-rail]');
  // the menu (phones, narrow windows): focus goes into it on opening and is kept there, and back to the button on
  // closing (E2E report L5)
  const closeMenu = () => { const was = nav.classList.contains('menu-open'); nav.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); if (was && nav.contains(document.activeElement)) burger.focus(); };
  burger.addEventListener('click', () => { const open = !nav.classList.contains('menu-open'); nav.classList.toggle('menu-open', open); burger.setAttribute('aria-expanded', String(open)); if (open) { nav.classList.remove('hide'); links[0]?.focus(); } else burger.focus(); });
  nav.addEventListener('keydown', e => {
    if (e.key !== 'Tab' || !nav.classList.contains('menu-open')) return;
    const ring = [burger, ...links], i = ring.indexOf(document.activeElement);
    if (i < 0) return; e.preventDefault(); ring[(i + (e.shiftKey ? ring.length - 1 : 1)) % ring.length].focus();
  });
  addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  const where = $('.pf-where'), whereTx = $('.pf-where-tx');
  // the caption hides where the page's own copy, the stats, the doors or the footer come within 24 px of it (E2E report
  // M4): the blocks of the two chapters the walk is between, against the caption's own box, each frame it shows (an
  // observer on that band let one through, twice)
  const blocksOf = new Map(), blocks = i => { if (!blocksOf.has(i)) blocksOf.set(i, sections[i] ? [...sections[i].querySelectorAll('.pf-copy, .pf-stats, .pf-foot, .pf-chips, .pf-doors, .pf-side-lens'), ...(sections[i].matches('.pf-foot') ? [sections[i]] : [])] : []); return blocksOf.get(i); };
  const captionCovered = () => {
    const c = where.getBoundingClientRect(), top = c.top - 24, bottom = c.bottom + 24;
    return [Math.floor(rig.smooth), Math.ceil(rig.smooth)].some(i => blocks(i).some(e => { const r = e.getBoundingClientRect(); return r.height && r.bottom > top && r.top < bottom && r.right > c.left - 24 && r.left < c.right + 24; }));
  };
  let lastY = 0;
  function chrome() {
    nav.classList.toggle('stuck', scrollY > 40);
    nav.classList.toggle('hide', !nav.classList.contains('menu-open') && scrollY > lastY + 4 && scrollY > view.h * .8);
    if (scrollY < lastY - 4) nav.classList.remove('hide');
    lastY = scrollY;
    const k = Math.round(rig.smooth);
    if (k !== lastChapter) {
      lastChapter = k;
      rails.forEach((r, i) => r.classList.toggle('on', i === k));
      links.forEach(l => l.classList.toggle('on', l.dataset.group === chapters[k]?.group));
    }
    // the address follows the chapter, so a copied link opens where it was copied (E2E N4); no history entry each
    if (rig.fly >= 1 && !leap && !introTl) {
      const want = k > 0 && sections[k]?.id ? '#' + sections[k].id : '';
      if (location.hash !== want) { history.replaceState(history.state, '', want || location.pathname + location.search); seenHash = location.hash; }
    }
    // between chapters, a line says where the walk is going
    const walking = Math.abs(rig.smooth - Math.round(rig.smooth)) > .06 && rig.smooth < chapters.length - 1.5;
    if (walking) { const to = chapters[Math.ceil(rig.smooth)]; if (to?.where) whereTx.textContent = `Next: ${to.where}`; } // "To over the north campus" read wrong (E2E N6)
    where.classList.toggle('on', walking && rig.intro >= 1);
    where.classList.toggle('covered', walking && captionCovered());
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
  const photoFirst = el => !!el.closest('.pf-sec')?.querySelector('.pf-photo');
  $$('[data-rv]').forEach(el => { if (!el.closest('#arrival') && !photoFirst(el)) io.observe(el); });
  // headings arrive word by word, masked, the first time they come into view; the hero waits for the arrival
  const reveals = new Map();
  let splitReady = Promise.resolve();
  if (!reduced) splitReady = document.fonts.ready.then(() => $$('.pf-display').forEach(h => {
    const split = SplitText.create(h, { type: 'words', mask: 'words', aria: 'auto' });
    gsap.set(split.words, { yPercent: 112, opacity: 0 });
    const play = () => gsap.to(split.words, { yPercent: 0, opacity: 1, duration: .95, ease: 'expo.out', stagger: .072 });
    play.now = () => gsap.set(split.words, { yPercent: 0, opacity: 1 }); // while the campus is built the page stalls now and then: no animation to stall
    play.hide = () => { gsap.killTweensOf(split.words); gsap.set(split.words, { yPercent: 112, opacity: 0 }); };
    reveals.set(h, play);
    if (!h.closest('#arrival') && !photoFirst(h)) { const o = new IntersectionObserver(([e]) => { if (e.isIntersecting) { o.disconnect(); play(); } }, { rootMargin: '0px 0px -12% 0px' }); o.observe(h); }
  })).then(() => root.classList.add('split'));
  else root.classList.add('split');

  // ------------------------------------------------------------------ the hero exit (Kage: each piece of the hero foot goes in its own window)
  const exitSeq = [
    { el: $('.pf-cue'), at: .1, span: .3, shift: true },
    ...$$('.pf-chip').map((el, i) => ({ el, at: .2 + i * .1, span: .3, shift: true }))
  ];
  let exiting = false;
  function heroExit() {
    const t = clamp(scrollY / (view.h * .58));
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
  const plates = createPlates(renderer), signAt = new T.Vector3();
  // a plate is out while its stop is being read; it pours from (and back into) that door's name plate on screen
  const stopOf = new WeakMap(), kOf = el => { let k = stopOf.get(el); if (k === undefined) stopOf.set(el, k = +el.closest('[data-cam]').dataset.cam); return k; };
  const plateNear = el => rig.fly >= 1 && Math.abs(rig.smooth - kOf(el)) < 1.2;
  const plateHere = el => {
    // out once the camera has arrived at the stop, not on the way to it (owner, 2026-10-27: the next professor's photo had
    // poured out before the walk reached the door, and the genie went unseen); back in as the walk on begins
    const k = kOf(el), on = rig.fly >= 1 && rig.smooth > k - .04 && rig.smooth < k + (drift[k] ?? 0) + .12;
    if (on) signAt.set(...(chapters[k].sign ?? chapters[k].anchor)).project(camera);
    return { on, x: (signAt.x + 1) / 2 * view.w, y: (1 - signAt.y) / 2 * view.h };
  };
  // photos first, then their words (owner, 2026-10-19): a stop's text comes in once its photo has poured out of the sign
  const revealSection = sec => { sec.querySelectorAll('[data-rv]').forEach((e, i) => setTimeout(() => e.classList.add('rv-in'), reduced ? 0 : 150 + i * 90)); sec.querySelectorAll('.pf-display').forEach(h => reveals.get(h)?.()); };
  // and when the photo has gone back into its sign, the words go too, to come in after it again on the next visit
  const hideSection = sec => { sec.querySelectorAll('[data-rv]').forEach(e => e.classList.remove('rv-in')); sec.querySelectorAll('.pf-display').forEach(h => reveals.get(h)?.hide()); };
  const photoOf = new Map();
  $$('.pf-photo').forEach(el => { const sec = el.closest('.pf-sec'); photoOf.set(sec, plates.attach(el, () => revealSection(sec), () => hideSection(sec))); });
  // every stop's description on its own cloth card, after the stop's photo where it has one
  $$('.pf-sec:not(.pf-hero):not(.pf-fin) > .pf-copy').forEach(el => plates.card(el, photoOf.get(el.closest('.pf-sec'))));
  $$('.pf-chip').forEach(el => {
    el.addEventListener('pointerenter', () => $$('.pf-chip').forEach(o => o.classList.toggle('on', o === el)));
    el.addEventListener('pointerleave', () => el.classList.remove('on'));
  });
  const alphaOf = el => { let a = 1; for (let n = el; n && n !== document.body; n = n.parentElement) { const s = getComputedStyle(n); if (s.display === 'none' || s.visibility === 'hidden') return 0; a *= +s.opacity; if (a < .01) return 0; } return a; };

  // ------------------------------------------------------------------ the cursor (Kage: a ring that trails the hand and opens over anything live)
  const cursor = $('.pf-cursor'), wisps = createWisps(camera, coarse), leaves = createLeaves(scene);
  const pointer = { x: innerWidth / 2, y: innerHeight / 2, tx: innerWidth / 2, ty: innerHeight / 2, seen: false };
  addEventListener('pointermove', e => {
    if (!active || e.pointerType === 'touch') return;
    if (!pointer.seen) { pointer.x = e.clientX; pointer.y = e.clientY; cursor.classList.add('seen'); } // the ring starts under the hand, not mid-screen
    pointer.tx = e.clientX; pointer.ty = e.clientY; pointer.seen = true; pointer.at = performance.now();
    if (e.clientY < 90) nav.classList.remove('hide'); // the hidden nav comes back when the hand goes to it
    rig.tmx = e.clientX / view.w * 2 - 1; rig.tmy = -(e.clientY / view.h * 2 - 1);
    cursor.classList.toggle('act', !!e.target.closest?.('[data-cursor], a, button, summary'));
  }, { passive: true });
  // the ring replaces the system pointer only on a fine pointer, only while the story shows, and only after the arrival
  const ring = on => document.documentElement.classList.toggle('pf-ring', on && !coarse && matchMedia('(hover: hover) and (pointer: fine)').matches);
  document.addEventListener('pointerleave', () => cursor.classList.add('away'));
  document.addEventListener('pointerenter', () => cursor.classList.remove('away'));

  buildWordmark(scene).then(w => { wordmark = w; for (const g of w.glyphs) g.mesh.position.y = g.base - 10; changed(); });

  build(); measure(); rig.prog = progressFor(0); rig.smooth = rig.prog;

  // The arrival: one GSAP timeline over the rise. The camera dollies in from far down the drive on a long lens, the
  // wordmark rises from the lawn as the signs land, then the hero copy. Scrolling is held until the building stands.
  // While the campus is still being built: the live line reads the load's own progress.
  const loading = document.querySelector('#loading-status');
  if (loading) new MutationObserver(() => { if (waiting && loading.textContent) $('.pf-live-tx').textContent = `Raising the department: ${loading.textContent.charAt(0).toLowerCase()}${loading.textContent.slice(1)}`; })
    .observe(loading, { childList: true, characterData: true, subtree: true });

  // The arrival can be skipped at any moment (E2E report H1): everything it would still do happens at once.
  let introTl = null;
  function skipIntro() {
    if (!introTl) return;
    rig.fly = 1; wordT = Math.max(wordT, 3);
    introTl.progress(1); // runs every step left: the hero copy, the nav, scrolling back on
    root.classList.remove('flying');
  }
  function play(riseLength, delay = 0) {
    const heroParts = $$('#arrival [data-rv]');
    const heroShown = waiting; // the hero already came in during the wait
    if (waiting) { waiting = false; root.classList.remove('waiting'); status(); }
    if (reduced) { rig.intro = 1; wordT = 99; root.classList.add('arrived'); ring(true); heroParts.forEach(e => e.classList.add('rv-in')); return; }
    lenis.stop(); root.classList.remove('arrived');
    const tl = introTl = gsap.timeline({ delay, onComplete: () => { introTl = null; lenis.start(); root.classList.add('arrived'); ring(true); } });
    // the hero steps aside for the flight and comes back as the camera settles
    root.classList.add('flying');
    tl.fromTo(rig, { fly: 0 }, { fly: 1, duration: riseLength + .6, ease: 'none' }, 0);
    tl
      .call(() => root.classList.remove('flying'), null, riseLength - 1.4)
      .call(() => { wordT = 0; }, null, riseLength - .9)
      .call(() => { if (!heroShown) reveals.get($('#arrival .pf-display'))?.(); }, null, riseLength - .2)
      .call(() => heroParts.forEach((e, i) => setTimeout(() => e.classList.add('rv-in'), 120 + i * 95)), null, riseLength + .1);
    // the hero steps aside and returns through the .flying class (portfolio.css); the nav stays up throughout
  }

  let last = performance.now();
  return {
    play, lenis, root,
    get active() { return active; },
    get progress() { return rig.smooth; },
    goTo,
    // The visitor pressed Enter before the building was ready: the hero over the night, the load's progress on the live
    // line; play() takes over when the campus is ready.
    skipIntro,
    get introPlaying() { return !!introTl; },
    // straight to a scroll position (a return from the campus, a deep link): under the veil, which lifts once the
    // frames there are in
    jumpTo(y) {
      skipIntro();
      lenis.scrollTo(y, { immediate: true, force: true }); rig.prog = progressFor(y); rig.smooth = rig.prog;
    },
    scrollFor: i => scrollFor(i),
    compile: () => plates.compile(),
    // where to come back to: a chapter being read at its own reading position, below the header (E2E N5); between
    // chapters, the scroll itself
    placeY() { const c = Math.round(rig.smooth); return Math.abs(rig.smooth - c) < .1 && c > 0 ? scrollFor(c) : scrollY; },
    sectionIndex: id => sections.findIndex(s => s.id === id),
    wait() {
      this.show(); waiting = true; root.classList.add('waiting'); lenis.stop();
      $('.pf-live-tx').textContent = 'Raising the department';
      $$('#arrival [data-rv]').forEach((e, i) => setTimeout(() => e.classList.add('rv-in'), reduced ? 0 : 250 + i * 95));
      splitReady.then(() => reveals.get($('#arrival .pf-display'))?.now());
    },
    // the exploration canvas is not a stop in the story's tab order
    // shown: the address it is shown at is not a link to follow
    show() { active = true; seenHash = location.hash; document.documentElement.classList.add('portfolio-mode'); ring(root.classList.contains('arrived')); root.hidden = false; renderer.domElement.tabIndex = -1; lenis.start(); relayout(); },
    hide() { active = false; ring(false); lenis.stop(); closeMenu(); renderer.domElement.tabIndex = 0; document.documentElement.classList.remove('portfolio-mode'); root.hidden = true; if (wordmark) wordmark.group.visible = false; if (wisps) wisps.points.visible = false; leaves.update(1, camera, false, 1); },
    // the page's own frame: called from main.js's loop before it draws; true while anything moves
    update(dt, { light = 1 } = {}) {
      if (!active) return false;
      onHash(); // before the smooth scroll reads a link's jump of the page
      const now = performance.now(); lenis.raf(now); last = now; steadyY = scrollY;
      const before = rig.smooth;
      // The camera is the scroll (owner, 2026-10-26: every frame matches every tiny scroll at every point): no lag of
      // its own, the smooth scroll's easing is the only one. Over pre-rendered frames it never outruns them (owner,
      // 2026-10-26: flicker and skipped frames when the scroll sped up): no further than the frames on the GPU reach
      // and no faster than they can come; where it would, the scroll itself is held there, its target kept, so the
      // page and the picture go on together, a quick flick a glide that catches up. A scroll the browser makes itself
      // (the scroll bar, find in page) cannot be held: the camera follows that one as it can.
      let target = rig.prog;
      // while a leap's veil closes, the camera stays put (a link's own jump of the page had it chase frames not yet in)
      if (leap?.phase === 'out') target = rig.smooth;
      // a scroll the browser made itself (Tab to a link, find in page, the scroll bar) is the camera's to catch, unheld,
      // through the veil when it is further than a walk; the page is held to the camera again once it has (E2E N1: a
      // wheel turn after Tab had pulled the page back 45,000 px, to the camera still on its way)
      if (lenis.isScrolling === 'native') nativeScroll = true;
      else if (nativeScroll && Math.abs(rig.smooth - rig.prog) < 1e-4) nativeScroll = false;
      const held = !nativeScroll && !leap && !reduced;
      let next = reduced || held ? target : T.MathUtils.damp(rig.smooth, target, 5.2, dt);
      next = clamp(next, 0, chapters.length - 1); // never before the start or past the end (a scroll during the flight left it at -0.002)
      if (held && Math.abs(next - rig.prog) > 1e-5) {
        // what the hand asked for beyond the picture plays out after it, at most half a screen of it (the page does not
        // run on for seconds after the hand has stopped)
        const y = scrollAt(next), to = y + clamp(lenis.targetScroll - y, -innerHeight * .5, innerHeight * .5);
        lenis.scrollTo(y, { immediate: true, force: true });
        lenis.scrollTo(to, { programmatic: false, lerp: lenis.options.lerp, force: true });
        scrollY = y; rig.prog = next;
      }
      rig.smooth = next;
      if (Math.abs(rig.smooth - rig.prog) < 1e-4) rig.smooth = rig.prog;
      leapStep(dt);
      rig.mx = T.MathUtils.damp(rig.mx, reduced ? 0 : rig.tmx, 2.6, dt); rig.my = T.MathUtils.damp(rig.my, reduced ? 0 : rig.tmy, 2.6, dt);
      apply();
      chrome(); heroExit();
      $('.pf-veil').style.opacity = Math.max(pose.veil, leap ? leap.veil : 0).toFixed(3);
      // the copy column's wash: full while a chapter is read indoors, lighter outdoors and on the walk
      const hold = 1 - Math.min(1, Math.abs(rig.smooth - Math.round(rig.smooth)) * 4);
      $('.pf-scrim').style.opacity = ((pose.outdoors ? .4 : .6) * (.45 + .55 * hold)).toFixed(3); // lighter: each description sits on its own card
      // cursor: the ring trails the hand
      pointer.x += (pointer.tx - pointer.x) * .18; pointer.y += (pointer.ty - pointer.y) * .18;
      cursor.style.transform = `translate3d(${pointer.x.toFixed(1)}px,${pointer.y.toFixed(1)}px,0)`;
      let moving = Math.abs(before - rig.smooth) > 1e-5 || Math.abs(rig.mx - rig.tmx) > 1e-3 || Math.abs(rig.my - rig.tmy) > 1e-3 || rig.intro < 1 || rig.fly < 1;
      // the motes' faint breath stops once the hand has been still a moment: a resting page draws nothing (battery)
      if (wisps && wisps.update(dt, rig.tmx, rig.tmy, pointer.seen && !reduced && performance.now() - (pointer.at || 0) < 1500)) moving = true;
      if (!reduced && leaves.update(dt, camera, pose.outdoors && rig.intro > .9, light)) moving = true;
      if (plates.update(dt, pointer.seen ? { x: pointer.tx, y: pointer.ty } : null, reduced, alphaOf, plateHere, plateNear, scrollY, Math.abs(rig.smooth - rig.prog) > 1e-3)) moving = true;
      if (wordmark) {
        if (wordT >= 0) wordT += dt;
        const near = 1 - smooth(.25, .75, rig.smooth); // gone by the time the camera reaches the porch
        wordmark.group.visible = near > .01 && wordT > 0;
        // narrower on a tall screen, so the three letters stay on it
        wordmark.group.scale.setScalar(clamp(camera.aspect / 1.15, .5, 1));
        if (wordmark.group.visible) {
          moving = true;
          for (const g of wordmark.glyphs) {
            const k = smooth(g.delay, g.delay + 1.1, wordT), back = 1 + 1.7 * (k - 1) ** 3 + .7 * (k - 1) ** 2; // rises with a little overshoot
            // then floats: each letter on its own slow swell, a little lift and lean, never in step with its neighbours
            const f = reduced ? 0 : smooth(.6, 1.6, wordT - g.delay), t = wordT * g.rate + g.phase;
            g.mesh.position.y = g.base - 10 * (1 - back) + f * (.16 * Math.sin(t) + .05 * Math.sin(t * 2.3));
            g.mesh.rotation.z = f * .018 * Math.sin(t * .8 + 1); g.mesh.rotation.y = f * .05 * Math.sin(t * .6);
            g.material.opacity = near * (view.w < 600 ? .38 : 1); // on a phone it would sit over the chapter cards (E2E L1)
          }
        }
      }
      return moving;
    },
    // after main.js has drawn the frame: the live windows
    get flying() { return rig.fly < 1; },
    get fly() { return rig.fly; },
    // anything moving because of the visitor or the story (not the ambient leaves and cloth): drawn at full rate
    get busy() { return rig.fly < 1 || Math.abs(rig.smooth - rig.prog) > 1e-4 || lenis.isScrolling || !!leap; },
    get pose() { return pose; },
    // the flight's opening view, drawn once while the page is still covered (the driver finishes a shader on its first
    // draw; a whole new side of the campus otherwise stalls the first frames of the rise)
    warm(draw) {
      const keep = camera.position.clone(), q = camera.quaternion.clone(), fov = camera.fov;
      flight(0, pose); camera.position.copy(pose.p); camera.lookAt(pose.p.clone().add(new T.Vector3(Math.sin(pose.yaw) * Math.cos(pose.pitch), Math.sin(pose.pitch), Math.cos(pose.yaw) * Math.cos(pose.pitch)))); camera.fov = pose.fov; camera.updateProjectionMatrix();
      draw();
      camera.position.copy(keep); camera.quaternion.copy(q); camera.fov = fov; camera.updateProjectionMatrix();
    },
    // after main.js has drawn the frame: the photo plates over it
    afterRender() { if (active) plates.draw(); },
  };
}
