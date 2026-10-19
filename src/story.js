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
// Fetched as needed, nearest first in the direction of travel; a window of decoded frames is kept around the camera.
const bitmaps = new Map(), pending = new Map(), used = new Map(), depths = new Map();
let pinned = new Set(), fresh = true, curWalk = 1; // curWalk: the walk on screen
async function load(key, depth = false) {
  const store = depth ? depths : bitmaps, id = depth ? key + '.d' : key;
  if (store.has(key)) return store.get(key);
  if (pending.has(id)) return pending.get(id);
  const p = (async () => {
    const r = await fetch(`${base}${key}${depth ? '.d' : ''}.webp`); if (!r.ok) throw new Error(`${key}: ${r.status}`);
    const bmp = await createImageBitmap(await r.blob());
    store.set(key, bmp); if (!depth) used.set(key, performance.now()); if (depth || key.startsWith(`w${pad(curWalk, 2)}/`)) fresh = true; evict(); return bmp;
  })().finally(() => pending.delete(id));
  pending.set(id, p); return p;
}
function evict() {
  if (bitmaps.size <= 90) return;
  const old = [...used].filter(([k]) => !pinned.has(k)).sort((a, b) => a[1] - b[1]);
  for (const [k] of old.slice(0, bitmaps.size - 90)) { bitmaps.get(k)?.close(); bitmaps.delete(k); used.delete(k); }
}
// the frames around (i, jf), ahead of the direction of travel first; at most six fetches at once
function want(i, jf, dir) {
  const n = counts[i], j0 = Math.round(jf);
  for (let d = 0; d < 22 && pending.size < 6; d++) for (const j of dir >= 0 ? [j0 + d, j0 - d] : [j0 - d, j0 + d]) {
    if (j < 0 || j >= n || pending.size >= 6) continue;
    const k = keyOf(i, j); if (!bitmaps.has(k) && !pending.has(k)) load(k).catch(() => {});
  }
}
// the stops' frames and depth images, early: a tab click or a long scroll lands on something sharp
const holdOf = c => c === 0 ? keyOf(1, 0) : keyOf(c, counts[c] - 1);
const stops = counts.length; // stops 0 .. stops - 1
async function prefetchHolds() { for (let c = 0; c < stops; c++) { try { await load(holdOf(c)); await load(holdOf(c), true); } catch {} } }

// (i, jf): which walk and where in it, for scroll position k (stops); a stop is its walk's last frame
function locate(k) {
  const c = Math.floor(k), f = k - c;
  if (f < 1e-4) return c === 0 ? [1, 0] : [c, counts[c] - 1];
  return [c + 1, f * (counts[c + 1] - 1)];
}

// ---------------------------------------------------------------------------------------------------- the backdrop
const blank = new T.DataTexture(new Uint8Array([11, 19, 34, 255]), 1, 1); blank.needsUpdate = true;
const tex = () => { const t = new T.Texture(); t.flipY = false; t.generateMipmaps = false; t.minFilter = T.LinearFilter; t.colorSpace = T.NoColorSpace; return t; };
const tA = tex(), tB = tex(), tD = tex();
const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto', src: `${base}flight.mp4` });
video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
const tV = new T.VideoTexture(video); tV.colorSpace = T.NoColorSpace; tV.flipY = true;
const back = new T.ShaderMaterial({
  uniforms: { tA: { value: blank }, tB: { value: blank }, tD: { value: blank }, uMix: { value: 0 }, uFlip: { value: 1 }, uScale: { value: new T.Vector2(1, 1) },
    uDepth: { value: 0 }, uPos: { value: new T.Vector3() }, uRight: { value: new T.Vector3() }, uUp: { value: new T.Vector3() }, uBack: { value: new T.Vector3() },
    uTan: { value: new T.Vector2(1, 1) }, uVP: { value: new T.Matrix4() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tA, tB, tD; uniform float uMix, uFlip, uDepth; uniform vec2 uScale, uTan;
    uniform vec3 uPos, uRight, uUp, uBack; uniform mat4 uVP; varying vec2 vUv;
    vec2 img(vec2 f) { return vec2(f.x, mix(f.y, 1. - f.y, uFlip)); } // frame uv (0 at the bottom) to image uv
    void main() {
      vec2 f = .5 + (vUv - .5) * uScale; // the frame, cover-fitted to the screen
      if (uDepth > .5) {
        // re-projection: this pixel's point in the scene (from the frame's camera and its depth), seen from the
        // hand-moved camera; the frame is sampled where that point came from
        vec2 ndc = f * 2. - 1.;
        float z = .3 * exp((1. - texture2D(tD, img(f)).r) * 6.9078); // log-scaled 0.3..300 m (scripts/snapshots.mjs)
        vec3 P = uPos + uRight * (ndc.x * uTan.x * z) + uUp * (ndc.y * uTan.y * z) - uBack * z;
        vec4 c = uVP * vec4(P, 1.);
        f -= (c.xy / c.w - ndc) * .5;
      }
      vec3 a = texture2D(tA, img(f)).rgb, b = texture2D(tB, img(f)).rgb;
      gl_FragColor = vec4(mix(a, b, smoothstep(.25, .75, uMix)), 1.); // a sharpened blend: frames a step apart never double
    }`,
  depthTest: false, depthWrite: false, toneMapped: false,
});
const backScene = new T.Scene(), backCam = new T.Camera(), quad = new T.Mesh(new T.PlaneGeometry(2, 2), back); quad.frustumCulled = false; backScene.add(quad);
const shown = { a: null, b: null, d: null };
const setImage = (t, slot, img) => { if (shown[slot] !== img) { t.image = img; t.needsUpdate = true; shown[slot] = img; return true; } return false; };
function cover() { const W = innerWidth / innerHeight; back.uniforms.uScale.value.set(W > A ? 1 : W / A, W > A ? A / W : 1); }
cover();

// the frame camera (the pose the frame was shot from) and the hand-moved one, for the re-projection
const frameCam = new T.PerspectiveCamera(50, A, .1, 1000), swayCam = new T.PerspectiveCamera(50, A, .1, 1000), look = new T.Vector3();
function placeCam(cam, p, yaw, pitch, fov) {
  look.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).add(p);
  cam.position.copy(p); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}

let lastSway = '', travel = 1, lastK = 0;
// what the backdrop shows this frame; true if it changed
function backdrop() {
  const u = back.uniforms;
  if (portfolio.fly < 1 && !reduced) { // the arrival: the video
    u.uFlip.value = 0; u.uDepth.value = 0; u.uMix.value = 0; u.tA.value = u.tB.value = tV;
    return true; // a new video frame, every frame
  }
  u.tA.value = tA; u.tB.value = tB; u.uFlip.value = 1;
  const k = portfolio.progress; if (Math.abs(k - lastK) > 1e-5) travel = Math.sign(k - lastK); lastK = k;
  const [i, jf] = locate(k), j0 = Math.floor(jf), j1 = Math.min(counts[i] - 1, j0 + 1);
  curWalk = i;
  want(i, jf, travel);
  let a = bitmaps.get(keyOf(i, j0)), b = bitmaps.get(keyOf(i, j1)), mix = jf - j0;
  if (!a) { // not in yet: the nearest frame of this walk that is, else its stop
    for (let d = 1; d < counts[i] && !a; d++) a = bitmaps.get(keyOf(i, j0 - d)) || bitmaps.get(keyOf(i, j0 + d));
    b = null; mix = 0;
  }
  if (!a) return false;
  pinned = new Set([keyOf(i, j0), keyOf(i, j1)]);
  used.set(keyOf(i, j0), performance.now());
  let changed = setImage(tA, 'a', a); changed = setImage(tB, 'b', b || a) || changed;
  if (Math.abs(u.uMix.value - (b ? mix : 0)) > 1e-4) { u.uMix.value = b ? mix : 0; changed = true; }
  // at a stop, with its depth in: the 3D parallax
  const c = Math.round(k), hold = Math.abs(k - c) < .02 && depths.get(holdOf(c));
  u.uDepth.value = hold ? 1 : 0;
  if (hold) {
    changed = setImage(tD, 'd', hold) || changed; u.tD.value = tD;
    const p = portfolio.pose, s = portfolio.sway;
    placeCam(frameCam, p.p, p.yaw, p.pitch, p.fov);
    const right = new T.Vector3(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    placeCam(swayCam, p.p.clone().addScaledVector(right, s.x).add(new T.Vector3(0, s.y, 0)), p.yaw + s.yaw, p.pitch + s.pitch, p.fov);
    const m = frameCam.matrixWorld.elements;
    u.uRight.value.set(m[0], m[1], m[2]); u.uUp.value.set(m[4], m[5], m[6]); u.uBack.value.set(m[8], m[9], m[10]); u.uPos.value.copy(frameCam.position);
    const tv = Math.tan(p.fov * Math.PI / 360); u.uTan.value.set(tv * A, tv);
    // redrawn only when the hand has actually moved the view
    const key = `${c}|${s.x.toFixed(4)}|${s.y.toFixed(4)}|${s.yaw.toFixed(5)}|${s.pitch.toFixed(5)}`;
    if (key !== lastSway) { lastSway = key; u.uVP.value.multiplyMatrices(swayCam.projectionMatrix, swayCam.matrixWorldInverse); changed = true; }
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
  portfolio.play(RISE_LENGTH / RISE_RATE, 0);
  if (!reduced) video.play().catch(() => {});
  // then everything the walk needs first: its opening frames, and every stop
  (async () => { for (let j = 0; j < counts[1]; j += 1) await load(keyOf(1, j)).catch(() => {}); })();
  prefetchHolds();
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
