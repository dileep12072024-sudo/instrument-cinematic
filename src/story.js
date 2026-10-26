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
// Three stages, each on its own budget, so a scroll never waits on one of them and never pays for all at once (owner,
// 2026-10-25: frames fetched one by one on demand left 47% of a scroll without its frame, and four uploads in a tick
// made it stutter):
//   bytes    fetched ahead of the camera in its direction of travel, coarse to fine: every 8th frame first, then every
//            4th, 2nd, all, so the walk ahead is soon covered sparsely and then filled in; the compressed bytes are
//            kept (~60 KB a frame), so hundreds of frames cost little memory
//   decode   the few frames either side of the camera, decoded off the main thread
//   upload   one frame a tick sent to the GPU, nearest first (a 1280x720 upload is several ms on integrated graphics)
// The backdrop draws the nearest uploaded frames either side of the camera, each re-aimed to the camera's heading: a
// frame not in yet shows as a slightly longer crossfade, never as a jump.
const have = new Set(), fetching = new Map(), gpu = new Map(), decoding = new Set(), ready = []; // have: frames whose bytes a worker holds
let fresh = true, pinned = new Set();
const holdOf = c => c === 0 ? keyOf(1, 0) : keyOf(c, counts[c] - 1);
const stops = counts.length; // stops 0 .. stops - 1
const keep = new Set(counts.map((n, c) => holdOf(c)));
const stats = { ticks: 0, exact: 0, gap: 0, none: 0 }; // for the test scripts: how close the frames drawn were
// the workers (frame-worker.js) fetch, keep and decode the frames; here only what they hold is tracked
// two of them, each fetching and decoding its own half of the frames (odd and even), on separate cores
const workers = [0, 1].map(() => new Worker(new URL('./frame-worker.js', import.meta.url), { type: 'module' })), waiting = new Map();
const workerOf = key => workers[+key.slice(-3) % 2];
const onmessage = ({ data }) => {
  const k = data.fetched ?? data.failed;
  if (k) { if (data.fetched) have.add(k); fetching.get(k)?.done(!!data.fetched); fetching.delete(k); trimBytes(); return; }
  const p = waiting.get(data.key); waiting.delete(data.key); p?.done(data.error ? null : data);
};
for (const w of workers) { w.postMessage({ base }); w.onmessage = onmessage; }
const asked = (map, key, message) => {
  if (map.has(key)) return map.get(key).promise;
  let done; const promise = new Promise(r => done = r);
  map.set(key, { promise, done }); workerOf(key).postMessage(message);
  return promise;
};
const fetchFrame = key => have.has(key) ? Promise.resolve(true) : asked(fetching, key, { fetch: key, depth: keep.has(key) }); // depth: the stops' frames
const pixelsOf = key => asked(waiting, key, { decode: key, depth: keep.has(key) }); // one decode per frame, however many ask for it
// the oldest bytes go first (a Set keeps insertion order); the stops' frames stay
function trimBytes() {
  if (have.size <= 700) return;
  const forget = [];
  for (const k of have) { if (have.size - forget.length <= 640) break; if (!keep.has(k) && !gpu.has(k) && !decoding.has(k)) forget.push(k); }
  for (const k of forget) have.delete(k);
  for (const w of workers) w.postMessage({ forget });
}
async function decode(key) {
  decoding.add(key);
  try { const r = await pixelsOf(key); if (r) ready.push(r); } finally { decoding.delete(key); }
}
const texOf = (data, w, h, format) => {
  const t = new T.DataTexture(data, w, h, format); t.generateMipmaps = false; t.minFilter = t.magFilter = T.LinearFilter; t.colorSpace = T.NoColorSpace; t.unpackAlignment = 1; t.needsUpdate = true;
  return t;
};
function upload({ key, c, w, h, d, dw, dh }) {
  if (gpu.has(key)) return; // already up (a stop brought it while the walk's decode was under way)
  const f = { c: texOf(new Uint8Array(c), w, h, T.RGBAFormat), d: d ? texOf(new Uint8Array(d), dw, dh, T.RedFormat) : null };
  renderer.initTexture(f.c); f.c.image.data = null; // on the GPU now: the pixels are not kept
  if (f.d) { renderer.initTexture(f.d); f.d.image.data = null; }
  gpu.set(key, f);
  // redrawn only if it can change the picture: within the backdrop's reach of the camera, or a stop's frame (a frame
  // fetched ahead, uploaded while the page rests, is not drawn: the resting page kept redrawing on phones)
  if (keep.has(key) || distance(key, here.i, here.jf) <= 9) fresh = true;
}
// position of a key along the story, for distances: walk i, frame j
const where = key => [+key.slice(1, 3), +key.slice(4)];
const distance = (key, i, jf) => { const [wi, wj] = where(key); return wi === i ? Math.abs(wj - jf) : wi === i + 1 ? counts[i] - jf + wj : wi === i - 1 ? jf + counts[wi] - wj : 1e4; };
// how far behind the camera (frames, against its direction of travel) a key lies; ahead of it is 0
const behind = (key, i, jf, dir) => { const [wi, wj] = where(key), at = wi === i ? wj : wi === i + 1 ? counts[i] - 1 + wj : wi === i - 1 ? wj - (counts[wi] - 1) : 1e4 * -dir; return Math.max(0, (jf - at) * dir); };
// at most 32 frames on the GPU: the farthest from the camera go first, never the pair on screen
function trimGpu(i, jf) {
  if (gpu.size <= 32) return;
  const far = [...gpu.keys()].filter(k => !pinned.has(k)).sort((a, b) => distance(b, i, jf) - distance(a, i, jf));
  for (const k of far.slice(0, gpu.size - 32)) { const f = gpu.get(k); f.c.dispose(); f.d?.dispose(); gpu.delete(k); }
}
// what the camera will need, most urgent first: the frames either side of it, a few just ahead, then the walk ahead
// coarse to fine, a few behind, and the next walk's opening when the end is near
// step: 1 at a walking pace; 2 or 4 in a fast scroll, when the near frames are taken every 2nd or 4th (the motion hides
// the detail, the depth blend lines them up, and half or a quarter of the uploads keep the frames on time)
function wanted(i, jf, dir, step = 1) {
  const n = counts[i], j0 = dir >= 0 ? Math.floor(jf) : Math.ceil(jf), out = [], seen = new Set();
  const add = (wi, j) => { if (wi < 1 || wi >= stops || j < 0 || j >= counts[wi]) return; const k = keyOf(wi, j); if (!seen.has(k)) { seen.add(k); out.push(k); } };
  const s0 = dir >= 0 ? Math.floor(jf / step) * step : Math.ceil(jf / step) * step;
  // past this walk's end the next one goes on (its frame 0 is this walk's last pose), before its start the previous one
  const near = j => j >= n ? add(i + 1, j - (n - 1)) : j < 0 ? (i > 1 && add(i - 1, counts[i - 1] - 1 + j)) : add(i, j);
  for (let d = 0; d <= 3; d++) near(s0 + dir * step * d);
  near(s0 - dir * step);
  for (const stride of [8, 4, 2, 1]) for (let d = stride; d <= 96; d += stride) { // ~15 m ahead at 16 cm a frame
    const j = j0 + dir * d;
    if (j >= 0 && j < n) add(i, j);
    else if (dir > 0) add(i + 1, j - n); // past the stop: the next walk
    else add(i - 1, counts[i - 1] + j); // before the walk's start: the one before, from its end
  }
  for (let d = 2; d <= 4; d++) add(i, j0 - dir * d);
  return out;
}
let paceAt = 0, paceJ = 0, pace = 0; // the camera's speed, in frames a second, smoothed
function schedule(i, jf, dir) {
  const n = counts[i];
  const now = performance.now(), g = i * 1000 + jf, dt = Math.max(1, now - paceAt);
  pace += (Math.min(200, Math.abs(g - paceJ) * 1000 / dt) - pace) * Math.min(1, dt / 250); paceAt = now; paceJ = g;
  // decoded where the camera will be by the time a frame is ready (~0.15 s at its speed), not where it is: in a quick
  // scroll every frame decoded at the camera's position was already behind it when it arrived, and was thrown away
  const lead = Math.min(24, pace * .15), list = wanted(i, jf + dir * lead, dir, pace > 24 ? 2 : 1);
  for (const k of [keyOf(i, Math.floor(jf)), keyOf(i, Math.min(n - 1, Math.ceil(jf)))].reverse()) if (!list.includes(k)) list.unshift(k); // and the pair on screen now
  // bytes: up to twelve frames in flight, the next stretch first: what lies within 24 frames may use every slot, the
  // walk further ahead only spare ones (when all slots went to far frames, the near ones queued behind them and a
  // quick scroll outran them)
  for (const k of list) {
    if (fetching.size >= 12) break;
    if (have.has(k) || fetching.has(k)) continue;
    if (distance(k, i, jf) > 24 && fetching.size >= 6) continue;
    fetchFrame(k);
  }
  // decode: the frames either side of the camera and just ahead (the first eight wanted), one per worker at a time
  // (four at once kept every frame ready but took the main thread's core: one frame in ten ran 33 ms)
  for (const k of list.slice(0, 8)) { if (decoding.size >= 2) break; if (!gpu.has(k) && !decoding.has(k) && !ready.some(r => r.key === k) && have.has(k)) decode(k); }
  // upload: one a tick, nearest first; decoded frames the camera has already passed are dropped
  ready.sort((a, b) => distance(a.key, i, jf) - distance(b.key, i, jf));
  // decoded frames the camera has passed are dropped; those ahead are kept for it
  for (let r = ready.length - 1; r >= 0; r--) if (!keep.has(ready[r].key) && behind(ready[r].key, i, jf, dir) > 4) ready.splice(r, 1);
  for (let u = pace > 24 ? 2 : 1; u > 0 && ready.length; u--) upload(ready.shift()); // a raw-pixel upload is ~1 ms
  trimGpu(i, jf);
}
// a frame now, whatever the budgets (the hero before the arrival, a stop landed on)
async function bring(key) {
  if (gpu.has(key)) return;
  await fetchFrame(key);
  const r = await pixelsOf(key);
  if (r && !gpu.has(key)) upload(r);
}
// the stops' bytes, early: a tab click or a long scroll lands on something sharp
async function prefetchHolds() { for (let c = 0; c < stops; c++) await fetchFrame(holdOf(c)).catch(() => {}); }

// (i, jf): which walk and where in it, for scroll position k (stops); a stop is its walk's last frame
function locate(k) {
  const c = Math.floor(k), f = k - c;
  if (f < 1e-4) return c === 0 ? [1, 0] : [c, counts[c] - 1];
  return [c + 1, f * (counts[c + 1] - 1)];
}

// ---------------------------------------------------------------------------------------------------- the backdrop
// The two frames either side of the camera, each re-aimed to the camera's heading and blended: walking, by rotation
// alone (exact, nothing stretches; the frames are 16 cm apart); resting on a stop, every pixel through the stop's
// depth image, so the hand-moved view keeps its 3D.
const video = Object.assign(document.createElement('video'), { muted: true, playsInline: true, preload: 'auto', src: `${base}flight.mp4` });
video.setAttribute('playsinline', ''); video.setAttribute('muted', '');
const tV = new T.VideoTexture(video); tV.colorSpace = T.NoColorSpace; tV.flipY = true;
// The film grain, an overlay blend at 5% (it was a full-screen CSS layer in mix-blend-mode overlay, which made the
// compositor blend the whole screen every frame: 30 fps instead of 60 on integrated graphics).
const grain = `vec3 grain(vec3 c) { float n = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
  vec3 o = mix(2. * c * n, 1. - 2. * (1. - c) * (1. - n), step(.5, c)); return mix(c, o, .05); }`;
const back = new T.ShaderMaterial({
  uniforms: { tA: { value: null }, tB: { value: null }, tH: { value: null }, tDH: { value: null }, tP: { value: null }, uMix: { value: 0 }, uHeld: { value: 0 }, uPrev: { value: 0 }, uScale: { value: new T.Vector2(1, 1) },
    uPos: { value: new T.Vector3() }, uRight: { value: new T.Vector3() }, uUp: { value: new T.Vector3() }, uBack: { value: new T.Vector3() },
    uTan: { value: new T.Vector2(1, 1) }, uVPA: { value: new T.Matrix4() }, uVPB: { value: new T.Matrix4() }, uVPH: { value: new T.Matrix4() }, uVPP: { value: new T.Matrix4() },
    uPosH: { value: new T.Vector3() }, uFwdH: { value: new T.Vector3() } },
  vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
  fragmentShader: /* glsl */`
    uniform sampler2D tA, tB, tH, tDH, tP; uniform float uMix, uHeld, uPrev; uniform vec2 uScale, uTan;
    uniform vec3 uPos, uRight, uUp, uBack, uPosH, uFwdH; uniform mat4 uVPA, uVPB, uVPH, uVPP; varying vec2 vUv;
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
    // walking: each frame only re-aimed to the camera's heading and lens (a direction projected, the frame's position
    // left out). A pure rotation is exact for every pixel, so nothing stretches or tears; the step between two frames
    // 16 cm apart is a short crossfade. (Depth warps, per pixel or as a plane, stretched near things like gum.)
    vec2 aim(mat4 vp, vec3 ray) { vec4 c = vp * vec4(ray, 0.); return c.xy / c.w * .5 + .5; }
    float inside(vec2 f) { vec2 e = step(vec2(0.), f) * step(f, vec2(1.)); return e.x * e.y; }
    void main() {
      vec2 f = .5 + (vUv - .5) * uScale; // the frame, cover-fitted to the screen
      vec2 ndc = f * 2. - 1.;
      vec3 ray = uRight * (ndc.x * uTan.x) + uUp * (ndc.y * uTan.y) - uBack;
      // the walk: the two frames either side, re-aimed and crossfaded; it always follows the camera exactly
      vec2 fa = aim(uVPA, ray), fb = aim(uVPB, ray);
      float ia = inside(fa), ib = inside(fb); // a frame that cannot see this pixel leaves it to the other
      float w = ia * ib > .5 ? uMix : ib > .5 ? 1. : 0.;
      vec3 c = mix(texture2D(tA, img(fa)).rgb, texture2D(tB, img(fb)).rgb, w);
      // resting on a stop: its own frame, every pixel through its depth as the hand moves the camera (the 3D), laid
      // over the walk and dissolved in and out (uHeld): both show the same place, so neither change is ever a cut
      if (uHeld > 0.) { vec2 fh = warp(tDH, uVPH, uPosH, uFwdH, ray); c = mix(c, texture2D(tH, img(fh)).rgb, uHeld * inside(fh)); }
      // where the picture would change at once (a frame that came in late, a catch-up), the one before dissolves out
      if (uPrev > 0.) { vec2 fp = aim(uVPP, ray); c = mix(c, texture2D(tP, img(fp)).rgb, uPrev * inside(fp)); }
      gl_FragColor = vec4(grain(c), 1.);
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
function cover() { const W = innerWidth / innerHeight; back.uniforms.uScale.value.set(W > A ? 1 : W / A, W > A ? A / W : 1); }
cover();

// the frames' cameras (the poses they were shot from) and the camera on screen (the walk's pose, moved by the hand)
const camA = new T.PerspectiveCamera(50, A, .1, 1000), camB = new T.PerspectiveCamera(50, A, .1, 1000), camH = new T.PerspectiveCamera(50, A, .1, 1000), camP = new T.PerspectiveCamera(50, A, .1, 1000), swayCam = new T.PerspectiveCamera(50, A, .1, 1000);
const qA = { p: new T.Vector3() }, qB = { p: new T.Vector3() }, qH = { p: new T.Vector3() }, qP = { p: new T.Vector3() }, look = new T.Vector3(), side = new T.Vector3(), scratchP = new T.Vector3(), scratchF = new T.Vector3();
function placeCam(cam, p, yaw, pitch, fov) {
  look.set(Math.sin(yaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(yaw) * Math.cos(pitch)).add(p);
  cam.position.copy(p); cam.lookAt(look); cam.fov = fov; cam.updateProjectionMatrix(); cam.updateMatrixWorld();
}
function frameCam(cam, q, vp, pos, fwd) {
  placeCam(cam, q.p, q.yaw, q.pitch, q.fov);
  vp.multiplyMatrices(cam.projectionMatrix, cam.matrixWorldInverse); pos.copy(cam.position);
  const m = cam.matrixWorld.elements; fwd.set(-m[8], -m[9], -m[10]);
}

let shownW = new Map(), shownPose = new Map(), prevKey = '', prevPose = 0, cutAt = performance.now(); // the dissolve over cuts
let lastView = '', travel = 1, lastK = 0, begun = false; const here = { i: 1, jf: 0 }; // here: the camera's walk and frame // begun: the flight has started (until then the video has the network)
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
  here.i = i; here.jf = jf;
  if (begun) schedule(i, jf, travel);
  // the nearest frames on the GPU either side of the camera, within eight frames (1.3 m): a frame from further off
  // would be a jump; until a near one is in, the last picture stays
  let j0 = -1, j1 = -1;
  const keyAt = j => j === 0 && i > 1 && !gpu.has(keyOf(i, 0)) ? keyOf(i - 1, counts[i - 1] - 1) : keyOf(i, j); // frame 0 = the stop before
  for (let j = Math.floor(jf); j >= Math.max(0, Math.floor(jf) - 8); j--) if (gpu.has(keyAt(j))) { j0 = j; break; }
  for (let j = Math.ceil(jf); j <= Math.min(n - 1, Math.ceil(jf) + 8); j++) if (gpu.has(keyAt(j))) { j1 = j; break; }
  if (j0 < 0 && j1 < 0) { stats.none++; return false; }
  if (j0 < 0) j0 = j1; if (j1 < 0) j1 = j0;
  stats.ticks++; if (j0 === Math.floor(jf) && j1 === Math.ceil(jf)) stats.exact++; stats.gap += j1 - j0;
  const kA = keyAt(j0), kB = keyAt(j1), fa = gpu.get(kA), fb = gpu.get(kB);
  // a cut? the frames' weights on screen against last tick's: smooth scrolling moves a few percent a tick; more than
  // a third at once is a frame arriving late or a catch-up, and the last picture's main frame dissolves out over it
  const now = performance.now(), dtc = Math.min(.1, (now - cutAt) / 1000); cutAt = now;
  const mixNow = j1 === j0 ? 0 : Math.min(1, Math.max(0, (jf - j0) / (j1 - j0))), weights = new Map([[kA, 1 - mixNow]]); weights.set(kB, (weights.get(kB) || 0) + mixNow);
  let jumpBy = 0; for (const key of new Set([...weights.keys(), ...shownW.keys()])) jumpBy += Math.abs((weights.get(key) || 0) - (shownW.get(key) || 0));
  if (jumpBy > .66 && shownW.size) { const [pk] = [...shownW].sort((a, b) => b[1] - a[1])[0]; if (gpu.has(pk)) { prevKey = pk; prevPose = shownPose.get(pk); u.uPrev.value = 1; } }
  else if (u.uPrev.value > 0) u.uPrev.value = Math.max(0, u.uPrev.value - dtc / .15);
  shownW = weights; shownPose = new Map([[kA, i - 1 + j0 / (n - 1)], [kB, i - 1 + j1 / (n - 1)]]);
  if (!gpu.has(prevKey)) u.uPrev.value = 0;
  // the stop's layer (the hand's 3D), while it is dissolved in at all
  const c = Math.round(k), stop = gpu.get(holdOf(c)), held = hand > 0 && stop?.d ? hand * hand * (3 - 2 * hand) : 0;
  const mix = mixNow;
  pinned = new Set([kA, kB, ...(u.uPrev.value > 0 ? [prevKey] : [])]);
  let changed = false;
  for (const [name, t] of [['tA', fa.c], ['tB', fb.c], ['tH', held ? stop.c : null], ['tDH', held ? stop.d : null], ['tP', u.uPrev.value > 0 ? gpu.get(prevKey).c : null]]) if (u[name].value !== t) { u[name].value = t; changed = true; }
  const s = portfolio.sway;
  const view = `${kA}|${kB}|${held.toFixed(3)}|${u.uPrev.value.toFixed(3)}|${k.toFixed(5)}|${s.x.toFixed(4)}|${s.y.toFixed(4)}|${s.yaw.toFixed(5)}|${s.pitch.toFixed(5)}`;
  if (view !== lastView) {
    lastView = view; changed = true;
    u.uMix.value = mix;
    u.uHeld.value = held;
    stats.view = `${kA} ${kB} mix ${mix.toFixed(3)} held ${held.toFixed(2)} k ${k.toFixed(4)}`; // for the test scripts
    // the frames' cameras (the stop's too, while its layer shows), and the camera on screen (the walk's pose, moved by the hand)
    portfolio.poseAt(i - 1 + j0 / (n - 1), qA); portfolio.poseAt(i - 1 + j1 / (n - 1), qB);
    frameCam(camA, qA, u.uVPA.value, scratchP, scratchF); frameCam(camB, qB, u.uVPB.value, scratchP, scratchF);
    if (held) { portfolio.poseAt(c, qH); frameCam(camH, qH, u.uVPH.value, u.uPosH.value, u.uFwdH.value); }
    if (u.uPrev.value > 0) { portfolio.poseAt(prevPose, qP); frameCam(camP, qP, u.uVPP.value, scratchP, scratchF); }
    const p = portfolio.pose; side.set(-Math.cos(p.yaw), 0, Math.sin(p.yaw));
    placeCam(swayCam, p.p.clone().addScaledVector(side, s.x).add(new T.Vector3(0, s.y, 0)), p.yaw + s.yaw, p.pitch + s.pitch, p.fov);
    const m = swayCam.matrixWorld.elements;
    u.uRight.value.set(m[0], m[1], m[2]); u.uUp.value.set(m[4], m[5], m[6]); u.uBack.value.set(m[8], m[9], m[10]); u.uPos.value.copy(swayCam.position);
    // a 4% overscan: a frame re-aimed by half a step's turn never shows its edge (portfolio.js coverFov matches it)
    const tv = Math.tan(p.fov * Math.PI / 360) / 1.04; u.uTan.value.set(tv * A, tv);
  }
  if (fresh) { fresh = false; changed = true; }
  return changed;
}

// ---------------------------------------------------------------------------------------------------- the story
// The hand's 3D at a stop: eased in over 0.6 s once the page has landed on it, eased out in 0.15 s as soon as it moves
// on, with the stop's layer dissolving in and out with it (backdrop): switching to the stop's frame at one instant,
// or from it, was a visible cut.
let hand = 0, handT = performance.now();
const swayGate = k => {
  const now = performance.now(), dt = Math.min(.1, (now - handT) / 1000); handT = now;
  const c = Math.round(k), on = Math.abs(k - c) < 1e-5 && !!gpu.get(holdOf(c))?.d; // exactly on it: the page has come to rest
  hand = on ? Math.min(1, hand + dt / .6) : Math.max(0, hand - dt / .15);
  return hand * hand * (3 - 2 * hand);
};
const portfolio = createPortfolio({
  scene, camera, renderer, reduced, changed: () => {}, snapshot: { aspect: A, swayGate },
  flightClock: () => video.duration ? video.currentTime / video.duration : 0,
  onEnter: way => { location.href = `/campus/?${way}`; },
});
portfolio.wait(); // the hero over the night while the first frames come in

// the hero's frame first, then the arrival as soon as the video can play
await bring(holdOf(0)).catch(() => {});
const start = () => {
  if (begun) return; begun = true;
  portfolio.play(RISE_LENGTH / RISE_RATE, 0);
  if (!reduced) video.play().catch(() => {});
  // then, once the flight is under way, what the walk needs first: every stop, then every other frame of the walk in
  // from the overview, four at a time. Its frames are the heaviest of the story (foliage, up to 170 KB) and a quick
  // scroll down it needs several megabytes a second; fetched while the flight plays and the hero is read, the scroll
  // only fills in between (it froze under the trees by the porch when they were fetched on the way)
  setTimeout(async () => {
    await prefetchHolds();
    const todo = []; for (let j = 0; j < counts[1]; j += 2) todo.push(keyOf(1, j));
    // it gives way to the frames the camera needs (a slot only when few are in flight) and stops once the camera has
    // left that walk: a background download competing with the next walk's frames froze it
    const idle = () => new Promise(r => setTimeout(r, 60));
    await Promise.all([0, 1, 2, 3].map(async () => {
      while (todo.length && portfolio.progress < 1) { if (fetching.size >= 6) { await idle(); continue; } await fetchFrame(todo.shift()).catch(() => {}); }
    }));
  }, reduced ? 0 : 2500);
};
if (reduced) start();
else if (video.readyState >= 3) start();
else { video.addEventListener('canplay', start, { once: true }); video.load(); setTimeout(() => { if (portfolio.fly >= 1 && video.paused) start(); }, 6000); }

// ---------------------------------------------------------------------------------------------------- the loop
// Drawn only when something changed. Ambient motion (leaves, cloth, IST's drift) runs at 30 frames a second; scrolling,
// the flight and the hand at 60. Battery (owner, 2026-10-25): twelve seconds after the visitor's last input, with the
// story at rest, the loop itself stops (ambient motion freezes where it is, nothing runs at all) until the next
// scroll, touch, key, pointer move or resize.
let last = performance.now(), odd = false, handAt = 0, inputAt = performance.now(), storyAt = 0, asleep = false; // storyAt: when the story itself last moved
addEventListener('pointermove', () => { handAt = performance.now(); }, { passive: true });
// one bad frame is reported and skipped, never allowed to stop the loop (the page would freeze)
function frame(now) { try { tick(now); } catch (e) { console.error(e); } }
function tick(now) {
  const dt = Math.min(.1, (now - last) / 1000); last = now;
  const moving = portfolio.update(dt, { light: night ? .25 : 1 });
  const changed = backdrop();
  const busy = portfolio.busy || now - handAt < 400;
  if (busy || changed) storyAt = now;
  if (begun && now - Math.max(inputAt, storyAt) > 12000) { asleep = true; renderer.setAnimationLoop(null); document.documentElement.classList.add('story-asleep'); return; }
  if (!moving && !changed && !busy) return;
  odd = !odd; if (!busy && !changed && odd) return;
  renderer.clear(); renderer.render(backScene, backCam); renderer.render(scene, camera); portfolio.afterRender();
}
const wake = () => { inputAt = performance.now(); if (asleep) { asleep = false; last = performance.now(); document.documentElement.classList.remove('story-asleep'); renderer.setAnimationLoop(frame); } };
for (const e of ['pointermove', 'pointerdown', 'wheel', 'touchstart', 'keydown', 'scroll', 'resize']) addEventListener(e, wake, { passive: true });
const goTo = portfolio.goTo; portfolio.goTo = i => { wake(); goTo(i); }; // a jump from code (no input event) wakes it too
renderer.setAnimationLoop(frame);

addEventListener('resize', () => {
  renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); cover(); fresh = true;
});
document.addEventListener('visibilitychange', () => { if (document.hidden) video.pause(); else if (portfolio.fly < 1) video.play().catch(() => {}); });

window.__story = { portfolio, manifest, bitmaps: gpu, depths: gpu, have, fetching, decoding, ready, stats, video, renderer, keyOf, locate }; // for the test scripts
