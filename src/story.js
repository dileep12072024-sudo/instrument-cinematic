// The portfolio as pre-rendered frames (owner, 2026-10-19: "the same, only fast"). scripts/snapshots.mjs shoots every
// frame of the story from the real scene at the story's own camera poses; here the arrival plays as a video, the walk is
// scrubbed by the scroll, and at each stop the frame is re-projected through its depth image as the hand moves, so the
// stop keeps its 3D. What moves on its own (leaves, the cursor's motes, IST, the cloth) is drawn live over the frames by
// the same story layer as the live site (portfolio.js). The live 3D campus opens at /campus/.
import * as T from 'three';
import { createPortfolio } from './portfolio.js';
import { RISE_LENGTH, RISE_RATE } from './rise.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
// day or night by the hour in Visakhapatnam; portrait frames for tall screens
const hourIST = +new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', hour12: false }).format(new Date());
const night = hourIST < 6 || hourIST >= 18, shape = innerWidth / innerHeight < .9 ? 'port' : 'land';
const base = `/frames/${night ? 'night' : 'day'}-${shape}/`;
const pad = (n, w) => String(n).padStart(w, '0');
const keyOf = (i, j) => `w${pad(i, 2)}/${pad(j, 3)}`;

const manifest = await (await fetch(`${base}manifest.json`)).json();
const A = manifest.w / manifest.h, counts = manifest.segments; // counts[i]: frames of the walk into stop i

// ---------------------------------------------------------------------------------------------------- renderer
const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight); renderer.autoClear = false;
renderer.domElement.className = 'story-canvas'; document.body.prepend(renderer.domElement);
const scene = new T.Scene(), camera = new T.PerspectiveCamera(50, innerWidth / innerHeight, .1, 1000);
scene.add(camera, new T.HemisphereLight('#dfe8f5', '#3a3428', night ? .55 : 1.5));
const sun = new T.DirectionalLight(night ? '#9fb4d8' : '#fff1dc', night ? .5 : 2.2); sun.position.set(-30, 40, 30); scene.add(sun);

// ---------------------------------------------------------------------------------------------------- the frames
// Fetched as needed, nearest first in the direction of travel, each with its depth image; a window of decoded frames
// is kept around the camera, and every stop's frame for good (a tab click lands on something sharp).
const bitmaps = new Map(), pending = new Map(), used = new Map(), depths = new Map();
let pinned = new Set(), fresh = true, curWalk = 1; // curWalk: the walk on screen
const holdOf = c => c === 0 ? keyOf(1, 0) : keyOf(c, counts[c] - 1);
const stops = counts.length; // stops 0 .. stops - 1
const keep = new Set(counts.map((n, c) => holdOf(c)));
async function load(key, depth = false) {
  const store = depth ? depths : bitmaps, id = depth ? key + '.d' : key;
  if (store.has(key)) return store.get(key);
  if (pending.has(id)) return pending.get(id);
  const p = (async () => {
    const r = await fetch(`${base}${key}${depth ? '.d' : ''}.webp`); if (!r.ok) throw new Error(`${key}: ${r.status}`);
    const bmp = await createImageBitmap(await r.blob());
    store.set(key, bmp); used.set(id, performance.now()); if (keep.has(key) || key.startsWith(`w${pad(curWalk, 2)}/`)) fresh = true; evict(); return bmp;
  })().finally(() => pending.delete(id));
  pending.set(id, p); return p;
}
function evict() {
  if (used.size <= 180) return;
  const old = [...used].filter(([id]) => !pinned.has(id) && !keep.has(id.replace(/\.d$/, ''))).sort((a, b) => a[1] - b[1]);
  for (const [id] of old.slice(0, used.size - 180)) {
    const d = id.endsWith('.d'), k = d ? id.slice(0, -2) : id, store = d ? depths : bitmaps;
    store.get(k)?.close(); store.delete(k); used.delete(id);
  }
}
// the frames around (i, jf), ahead of the direction of travel first; at most eight fetches at once
function want(i, jf, dir) {
  const n = counts[i], j0 = Math.round(jf);
  for (let d = 0; d < 22 && pending.size < 8; d++) for (const j of dir >= 0 ? [j0 + d, j0 - d] : [j0 - d, j0 + d]) {
    if (j < 0 || j >= n || pending.size >= 8) continue;
    const k = keyOf(i, j);
    if (!bitmaps.has(k) && !pending.has(k)) load(k).catch(() => {});
    if (!depths.has(k) && !pending.has(k + '.d')) load(k, true).catch(() => {});
  }
}
async function prefetchHolds() { for (let c = 0; c < stops; c++) { try { await load(holdOf(c)); await load(holdOf(c), true); } catch {} } }

// (i, jf): which walk and where in it, for scroll position k (stops); a stop is its walk's last frame
function locate(k) {
  const c = Math.floor(k), f = k - c;
  if (f < 1e-4) return c === 0 ? [1, 0] : [c, counts[c] - 1];
  return [c + 1, f * (counts[c + 1] - 1)];
}

// ---------------------------------------------------------------------------------------------------- the backdrop
// The two frames either side of the camera, each re-projected through its depth image to the camera's own pose and
// blended: the walk moves continuously between frames shot a step apart, and at a stop the hand-moved view keeps its 3D.
const tex = () => { const t = new T.Texture(); t.flipY = false; t.generateMipmaps = false; t.minFilter = T.LinearFilter; t.colorSpace = T.NoColorSpace; return t; };
const tA = tex(), tB = tex(), tDA = tex(), tDB = tex();
const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto', src: `${base}flight.mp4` });
video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
const tV = new T.VideoTexture(video); tV.colorSpace = T.NoColorSpace; tV.flipY = true;
// The film grain, an overlay blend at 5% (it was a full-screen CSS layer in mix-blend-mode overlay, which made the
// compositor blend the whole screen every frame: 30 fps instead of 60 on integrated graphics).
const grain = `vec3 grain(vec3 c) { float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  vec3 o = mix(2. * c * n, 1. - 2. * (1. - c) * (1. - n), step(.5, c)); return mix(c, o, .05); }`;
const back = new T.ShaderMaterial({
  uniforms: { tA: { value: tA }, tB: { value: tB }, tDA: { value: tDA }, tDB: { value: tDB }, uMix: { value: 0 }, uScale: { value: new T.Vector2(1, 1) },
    uDepth: { value: 0 }, uPos: { value: new T.Vector3() }, uRight: { value: new T.Vector3() }, uUp: { value: new T.Vector3() }, uBack: { value: new T.Vector3() },
    uTan: { value: new T.Vector2(1, 1) }, uVPA: { value: new T.Matrix4() }, uVPB: { value: new T.Matrix4() },
    uPosA: { value: new T.Vector3() }, uFwdA: { value: new T.Vector3() }, uPosB: { value: new T.Vector3() }, uFwdB: { value: new T.Vector3() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tA, tB, tDA, tDB; uniform float uMix, uDepth; uniform vec2 uScale, uTan;
    uniform vec3 uPos, uRight, uUp, uBack, uPosA, uFwdA, uPosB, uFwdB; uniform mat4 uVPA, uVPB; varying vec2 vUv;
    ${grain}
    vec2 img(vec2 f) { return vec2(f.x, 1. - f.y); } // frame uv (0 at the bottom) to image uv
    // log-scaled 0.3..300 m (scripts/snapshots.mjs); an explicit level: Direct3D runs a branch with implicit-lod reads both ways
    float depth(sampler2D d, vec2 f) { return .3 * exp((1. - textureLod(d, img(f), 0.).r) * 6.9078); }
    vec2 proj(mat4 vp, vec3 P) { vec4 c = vp * vec4(P, 1.); return c.xy / c.w * .5 + .5; }
    // where this pixel's ray from the camera meets the frame's surface, in the frame: from the far point (a pure turn),
    // walked to the frame's depth along the ray a few times
    vec2 warp(sampler2D d, mat4 vp, vec3 pos, vec3 fwd, vec3 ray) {
      float rf = max(dot(ray, fwd), .05), o = dot(uPos - pos, fwd);
      vec2 f = proj(vp, uPos + ray * 300.);
      for (int i = 0; i < 4; i++) f = proj(vp, uPos + ray * max((depth(d, f) - o) / rf, .05));
      return f;
    }
    float inside(vec2 f) { vec2 e = step(vec2(0.), f) * step(f, vec2(1.)); return e.x * e.y; }
    void main() {
      vec2 f = .5 + (vUv - .5) * uScale; // the frame, cover-fitted to the screen
      vec2 fa = f, fb = f; float w = smoothstep(.25, .75, uMix); // without depth: a sharpened blend, frames a step apart never double
      if (uDepth > .5) {
        vec2 ndc = f * 2. - 1.;
        vec3 ray = uRight * (ndc.x * uTan.x) + uUp * (ndc.y * uTan.y) - uBack;
        fa = warp(tDA, uVPA, uPosA, uFwdA, ray); fb = warp(tDB, uVPB, uPosB, uFwdB, ray);
        float ia = inside(fa), ib = inside(fb); // a frame that cannot see this pixel leaves it to the other
        w = ia * ib > .5 ? uMix : ib > .5 ? 1. : 0.;
      }
      gl_FragColor = vec4(grain(mix(texture2D(tA, img(fa)).rgb, texture2D(tB, img(fb)).rgb, w)), 1.);
    }`,
  depthTest: false, depthWrite: false, toneMapped: false,
});
// the arrival's video on its own plain program: none of the walk's re-projection runs while it plays
const flat = new T.ShaderMaterial({
  uniforms: { tV: { value: tV }, uScale: back.uniforms.uScale },
  vertexShader: back.vertexShader,
  fragmentShader: `uniform sampler2D tV; uniform vec2 uScale; varying vec2 vUv; ${grain} void main() { gl_FragColor = vec4(grain(texture2D(tV, .5 + (vUv - .5) * uScale).rgb), 1.); }`,
  depthTest: false, depthWrite: false, toneMapped: false,
});
const backScene = new T.Scene(), backCam = new T.Camera(), quad = new T.Mesh(new T.PlaneGeometry(2, 2), back); quad.frustumCulled = false; backScene.add(quad);
const shown = { a: null, b: null, da: null, db: null };
const setImage = (t, slot, img) => { if (shown[slot] !== img) { t.image = img; t.needsUpdate = true; shown[slot] = img; return true; } return false; };
function cover() { const W = innerWidth / innerHeight; back.uniforms.uScale.value.set(W > A ? 1 : W / A, W > A ? A / W : 1); }
cover();

// the frames' cameras (the poses they were shot from) and the camera on screen (the walk's pose, moved by the hand)
const camA = new T.PerspectiveCamera(50, A, .1, 1000), camB = new T.PerspectiveCamera(50, A, .1, 1000), swayCam = new T.PerspectiveCamera(50, A, .1, 1000);
const qA = { p: new T.Vector3() }, qB = { p: new T.Vector3() }, look = new T.Vector3(), side = new T.Vector3();
function placeCam(cam, p, yaw, pitch, fov) {
  look.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).add(p);
  cam.position.copy(p); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
function frameCam(cam, q, vp, pos, fwd) {
  placeCam(cam, q.p, q.yaw, q.pitch, q.fov);
  vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); pos.copy(cam.position);
  const m = cam.matrixWorld.elements; fwd.set(-m[8], -m[9], -m[10]);
}

let lastView = '', travel = 1, lastK = 0, begun = false; // begun: the flight has started (until then the video has the network)
// what the backdrop shows this frame; true if it changed
function backdrop() {
  const u = back.uniforms;
  if (portfolio.fly < 1 && !reduced) { // the arrival: the video
    quad.material = flat; lastView = '';
    return true; // a new video frame, every frame
  }
  if (quad.material === flat) { quad.material = back; lastView = ''; }
  const k = portfolio.progress; if (Math.abs(k - lastK) > 1e-5) travel = Math.sign(k - lastK); lastK = k;
  const [i, jf] = locate(k), n = counts[i];
  curWalk = i;
  if (begun) want(i, jf, travel);
  // a frame not in yet: the nearest of this walk that is (re-projected from its own pose, it still lines up)
  const near = j => { for (let d = 0; d < n; d++) for (const q of [j - d, j + d]) if (q >= 0 && q < n && bitmaps.has(keyOf(i, q))) return q; return -1; };
  let j0 = Math.floor(jf), j1 = Math.min(n - 1, j0 + 1);
  if (!bitmaps.has(keyOf(i, j0))) j0 = near(j0);
  if (j0 < 0) return false;
  if (!bitmaps.has(keyOf(i, j1))) j1 = j0;
  const kA = keyOf(i, j0), kB = keyOf(i, j1), deep = depths.has(kA) && depths.has(kB);
  const mix = j1 === j0 ? 0 : Math.min(1, Math.max(0, (jf - j0) / (j1 - j0)));
  pinned = new Set([kA, kB, kA + '.d', kB + '.d']);
  for (const id of pinned) if (used.has(id)) used.set(id, performance.now());
  let changed = setImage(tA, 'a', bitmaps.get(kA)); changed = setImage(tB, 'b', bitmaps.get(kB)) || changed;
  if (deep) { changed = setImage(tDA, 'da', depths.get(kA)) || changed; changed = setImage(tDB, 'db', depths.get(kB)) || changed; }
  const s = portfolio.sway;
  const view = `${kA}|${kB}|${deep}|${k.toFixed(5)}|${s.x.toFixed(4)}|${s.y.toFixed(4)}|${s.yaw.toFixed(5)}|${s.pitch.toFixed(5)}`;
  if (view !== lastView) {
    lastView = view; changed = true;
    u.uMix.value = mix; u.uDepth.value = deep ? 1 : 0;
    if (deep) {
      portfolio.poseAt(i - 1 + j0 / (n - 1), qA); portfolio.poseAt(i - 1 + j1 / (n - 1), qB);
      frameCam(camA, qA, u.uVPA.value, u.uPosA.value, u.uFwdA.value); frameCam(camB, qB, u.uVPB.value, u.uPosB.value, u.uFwdB.value);
      const p = portfolio.pose; side.set(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
      placeCam(swayCam, p.p.clone().addScaledVector(side, s.x).add(new T.Vector3(0, s.y, 0)), p.yaw + s.yaw, p.pitch + s.pitch, p.fov);
      const m = swayCam.matrixWorld.elements;
      u.uRight.value.set(m[0], m[1], m[2]); u.uUp.value.set(m[4], m[5], m[6]); u.uBack.value.set(m[8], m[9], m[10]); u.uPos.value.copy(swayCam.position);
      const tv = Math.tan(p.fov * Math.PI / 360); u.uTan.value.set(tv * A, tv);
    }
  }
  if (fresh) { fresh = false; changed = true; }
  return changed;
}

// ---------------------------------------------------------------------------------------------------- the story
const swayGate = k => { const c = Math.round(k); return depths.has(holdOf(c)) ? 1 - Math.min(1, Math.abs(k - c) / .02) : 0; };
const portfolio = createPortfolio({
  scene, camera, renderer, reduced, changed: () => {}, snapshot: { aspect: A, swayGate },
  flightClock: () => video.duration ? video.currentTime / video.duration : 0,
  onEnter: way => { location.href = `/campus/?${way}`; },
});
portfolio.wait(); // the hero over the night while the first frames come in

// the hero's frame first, then the arrival as soon as the video can play
await load(holdOf(0)).catch(() => {});
const start = () => {
  if (begun) return; begun = true;
  portfolio.play(RISE_LENGTH / RISE_RATE, 0);
  if (!reduced) video.play().catch(() => {});
  // then, once the flight is under way, what the walk needs first: every stop, and the walk's opening stretch
  setTimeout(async () => {
    await prefetchHolds();
    for (let j = 0; j < Math.min(counts[1], 48); j++) { await load(keyOf(1, j)).catch(() => {}); await load(keyOf(1, j), true).catch(() => {}); }
  }, reduced ? 0 : 2500);
};
if (reduced) start();
else if (video.readyState >= 3) start();
else { video.addEventListener('canplay', start, { once: true }); video.load(); setTimeout(() => { if (portfolio.fly >= 1 && video.paused) start(); }, 6000); }

// ---------------------------------------------------------------------------------------------------- the loop
// Drawn only when something changed. Ambient motion (leaves, cloth, IST's drift) runs at 30 frames a second; scrolling,
// the flight and the hand at 60. A page left alone draws nothing.
let last = performance.now(), odd = false, handAt = 0;
addEventListener('pointermove', () => { handAt = performance.now(); }, { passive: true });
renderer.setAnimationLoop(now => {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  const moving = portfolio.update(dt, { light: night ? .25 : 1 });
  const changed = backdrop();
  const busy = portfolio.busy || now - handAt < 400;
  if (!moving && !changed && !busy) return;
  odd = !odd; if (!busy && !changed && odd) return;
  renderer.clear(); renderer.render(backScene, backCam); renderer.render(scene, camera); portfolio.afterRender();
});

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); cover(); fresh = true;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (portfolio.fly < 1) video.play().catch(() => {}); });

window.__story = { portfolio, manifest, bitmaps, depths, video, renderer }; // for the test scripts
