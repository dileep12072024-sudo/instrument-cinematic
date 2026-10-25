import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createIcons, PersonStanding, Eye, Copy, ArrowUpRight, ArrowLeft, ArrowRight, Play, Pause, X, Plus, Minus, RotateCcw, Maximize, Minimize, Sun, Sunset, Moon, Camera, MapPin, Aperture, DoorOpen, Info, Compass, ChevronDown, Check } from 'lucide';
import { buildArchitecture, buildEntranceApron } from './architecture.js';
import { loadBlenderEnvironment, prefetchEnvironment } from './blender-environment.js';
import { buildSurroundings, placeFacadeTrees } from './surroundings.js';
import { makeSwitchboard } from './roomlights.js';
import { mergeStaticDetail, mergeGateParts, mergeByMaterialName, mergeStatic, resolveCoplanar } from './batching.js';
import { createAvatar } from './avatar.js';
import { footprint } from './footprint.js';
import { Map as MapIcon, Volume2, VolumeX, Move } from 'lucide';
import { createAmbience } from './ambience.js';
import { createRain, rainfall, updateWind, isSheltered } from './weather-effects.js';
import { createPuddles } from './puddles.js';
import { campusMonth, leafLitter } from './seasons.js';
import { regradeGround, rectangularAprons } from './regrade.js';
import { createEntranceWalk } from './entrance-walk.js';
import { createPanoramaLook } from './panorama-look.js';
import { createLiveSky, lunarState, solarState, campusDate, skyDirection } from './sky.js';
import { pieces } from './merge-pieces.js';
import { createRise, createRiseDust, RISE_LENGTH, RISE_RATE } from './rise.js';
import { createPortfolio } from './portfolio.js';
import './style.css';

const $ = s => document.querySelector(s);
const icon = name => `<i data-lucide="${name}"></i>`;
const icons = { PersonStanding, Eye, Copy, Move, Volume2, VolumeX, Map: MapIcon, ArrowUpRight, ArrowLeft, ArrowRight, Play, Pause, X, Plus, Minus, RotateCcw, Maximize, Minimize, Sun, Sunset, Moon, Camera, MapPin, Aperture, DoorOpen, Info, Compass, ChevronDown, Check };
const refreshIcons = () => createIcons({ icons, attrs: { 'stroke-width': 1.5 } });
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const small = () => innerWidth < 700;
const chapters = [
  { name: 'The arrival', title: 'Instrument<br><em>Technology.</em>', note: 'Andhra University, Visakhapatnam', eye: [42, 18, 80], target: [0, 13, 0] },
  { name: 'The entrance', title: 'A familiar<br><em>welcome.</em>', note: 'At the heart of the department', eye: [5, 6.3, 31], target: [0, 6, 6] },
  { name: 'East courtyard', title: 'Light, shade.<br><em>And possibility.</em>', note: 'The eastern wing', eye: [4, 7.5, 31], target: [22, 6.5, 8] },
  { name: 'West wing', title: 'A quieter<br><em>perspective.</em>', note: 'Beneath the trees of North Campus', eye: [-5, 6, 4.8], target: [-22, 4.7, 9.125] },
];
$('#app').innerHTML = `
  <main id="experience" aria-label="Instrument Technology interactive campus">
    <div id="viewport"></div><div class="shade" aria-hidden="true"></div>
    <header class="topbar">
      <a href="#" class="brand" aria-label="Instrument Technology home"><span class="brand-mark" aria-hidden="true">IT<span></span></span><span>ANDHRA UNIVERSITY<small>A CAMPUS PORTRAIT</small></span></a>
      <nav aria-label="Main navigation"><button id="to-story" class="text-btn">The department</button><span class="nav-divider"></span><button id="about" class="icon-btn" aria-label="About this portrait" data-tip="About this portrait">${icon('info')}</button><span class="nav-divider"></span><button id="film" class="film-btn">${icon('play')}<span>Play the journey</span></button></nav>
    </header>
    <div class="scene-meta"><span class="live-dot"></span><span id="scene-mode">LIVE EXPLORATION</span><span class="meta-line"></span><span id="time-label">16:30 / AFTERNOON</span><span class="meta-line weather-divider"></span><span id="weather-label" class="weather-live">SYNCING SKY</span></div>
    <div class="scene-number" aria-hidden="true"><span id="scene-number">01</span><small>/ 04</small></div>
    <section class="scene-heading"><p class="eyebrow" id="eyebrow">THE DEPARTMENT / NORTH CAMPUS</p><h1>${chapters[0].title}</h1><p class="scene-note">${icon('map-pin')}<span id="scene-note">${chapters[0].note}</span></p><div class="heading-actions"><button id="explore" class="primary-btn">Enter the courtyard ${icon('arrow-up-right')}</button></div></section>
    <div class="scene-tools" aria-label="Scene tools">
      <button class="icon-btn" id="light" aria-label="Light and quality" aria-expanded="false" data-tip="Light & quality">${icon('sun')}</button>
      <button class="icon-btn" id="orbit" aria-label="Orbit building" aria-pressed="false" data-tip="Orbit building">${icon('compass')}</button>
      <button class="icon-btn" id="panorama" aria-label="Panorama exploration" aria-pressed="false" data-tip="Panorama exploration">${icon('move')}</button>
      <button class="icon-btn" id="avatar-mode" aria-label="Walk as a person" aria-pressed="false" data-tip="Walk as a person">${icon('person-standing')}</button>
      <button class="icon-btn mobile-plan" id="mobile-plan" aria-label="View building from above" data-tip="Overhead view">${icon('map')}</button>
      <span class="tools-divider"></span>
      <button class="icon-btn" id="zoom-in" aria-label="Zoom in" data-tip="Zoom in">${icon('plus')}</button>
      <button class="icon-btn" id="zoom-out" aria-label="Zoom out" data-tip="Zoom out">${icon('minus')}</button>
      <button class="icon-btn" id="reset" aria-label="Reset view" data-tip="Reset view">${icon('rotate-ccw')}</button>
      <span class="tools-divider"></span>
      <button class="icon-btn" id="capture" aria-label="Save photograph" data-tip="Save photograph">${icon('camera')}</button>
      <button class="icon-btn" id="fullscreen" aria-label="Full screen" data-tip="Full screen">${icon('maximize')}</button>
    </div>
    <section id="light-panel" class="light-panel" hidden aria-label="Scene settings"><div class="panel-title">The light of a place<button class="icon-btn" id="light-close" aria-label="Close settings">${icon('x')}</button></div><div class="light-presets"><button data-hour="10" aria-label="Morning light">${icon('sun')}<span>Daylight</span></button><button data-hour="16.5" class="selected" aria-label="Afternoon light">${icon('sunset')}<span>Afternoon</span></button><button data-hour="18.8" aria-label="Blue hour">${icon('moon')}<span>Blue hour</span></button></div><label class="range-label" for="hour">Time of day <output id="hour-output">16:30</output></label><input id="hour" type="range" min="8" max="19" value="16.5" step="0.1"/><div class="quality-row"><label for="quality">Render quality</label><select id="quality"><option value="auto">Adaptive</option><option value="high">High</option><option value="low">Performance</option></select></div><label class="motion-row" for="motion">Camera drift<input type="checkbox" id="motion" ${reduced ? '' : 'checked'} /></label></section>
    <div class="entrance-actions"><button id="door" class="door-action" hidden aria-pressed="false">${icon('door-open')}<span>Open the doors</span></button><button id="enter-hall" class="primary-btn" hidden>${icon('arrow-up-right')}<span>Step inside</span></button></div>
    <section id="avatar-panel" class="avatar-panel" hidden aria-label="Walking guide">
      <p id="avatar-readout" class="avatar-readout" role="status">Preparing the guide…</p>
      <div class="avatar-actions"><button id="avatar-eye" class="text-btn" aria-pressed="false">${icon('eye')}<span>Eye view</span></button><button id="avatar-copy" class="text-btn">${icon('copy')}<span>Copy position</span></button><button id="avatar-exit" class="text-btn">${icon('x')}<span>Exit</span></button></div>
      <p class="avatar-help">W A S D or arrow keys to walk · Q / E or ← → to turn · Shift to run · drag to look around</p>
    </section>
    <div class="avatar-pad" aria-label="Movement controls"><button data-move="forward" aria-label="Walk forward">▲</button><button data-move="left" aria-label="Turn left">◀</button><button data-move="back" aria-label="Walk back">▼</button><button data-move="right" aria-label="Turn right">▶</button></div>
    <section id="walk-panel" class="walk-panel" hidden aria-label="Entrance walkthrough"><span id="walk-location">The threshold</span><div class="walk-controls"><button id="walk-back" class="icon-btn" aria-label="Previous entrance viewpoint" data-tip="Previous viewpoint">${icon('arrow-left')}</button><button id="walk-play" class="icon-btn" aria-label="Play entrance walkthrough" aria-pressed="false" data-tip="Play walkthrough"><span class="walk-play-icon">${icon('play')}</span><span class="walk-pause-icon" hidden>${icon('pause')}</span></button><input id="walk-progress" type="range" min="0" max="1000" value="0" aria-label="Position along the entrance walkthrough"/><button id="walk-forward" class="icon-btn" aria-label="Next entrance viewpoint" data-tip="Next viewpoint">${icon('arrow-right')}</button><button id="walk-exit" class="icon-btn" aria-label="Return to courtyard" data-tip="Return to courtyard">${icon('x')}</button></div></section>
    <button id="plan" class="plan" aria-label="View building from above" data-tip="Overhead view"><canvas width="220" height="120" aria-hidden="true"></canvas><span>NORTH CAMPUS ${icon('arrow-up-right')}</span></button>
    <footer class="chapter-bar"><div class="chapter-caption"><span>THE CAMPUS</span><small>Four perspectives. One place.</small></div><nav class="chapters" aria-label="Camera viewpoints">${chapters.map((c, i) => `<button data-chapter="${i}" class="chapter ${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}"><span>0${i + 1}</span><strong>${c.name}</strong><span class="chapter-line"></span></button>`).join('')}</nav><button id="next" class="next-btn" aria-label="Next viewpoint">${icon('arrow-right')}</button></footer>
    <div id="journey-track" class="journey-track" hidden><span></span></div>
    <div id="loader" class="loader"><span class="loading-mark">IT</span><p>Raising the department</p><span class="load-track"><span></span></span><small id="loading-status">Preparing the campus</small><button id="begin" class="begin-btn" hidden>Enter</button><small class="begin-note">Opens in full screen.</small></div>
    <div id="toast" role="status" hidden></div>
  </main>
  <dialog id="about-dialog" class="about-dialog"><div class="dialog-top"><span class="eyebrow">ABOUT THE PORTRAIT</span><button class="icon-btn close-dialog" aria-label="Close about">${icon('x')}</button></div><h2>Built around<br><em>a real place.</em></h2><p>Department of Instrument Technology.<br>Andhra University, Visakhapatnam.</p><p>This independent architectural portrait is reconstructed from the supplied campus photographs, video, and footprint. The blue structural frame, open corridors, entrance, and different wing heights follow those references.</p><p>Geometry is constructed directly in Three.js. Dimensions, hidden elevations, planting, and materials are interpreted; this is not a measured survey or a photogrammetric scan.</p><a href="https://www.google.com/maps/search/?api=1&query=Andhra+University+Department+of+Instrument+Technology" target="_blank" rel="noopener" class="text-btn">Find the department ${icon('arrow-up-right')}</a><div class="credits">Original photographs & footage supplied by the project owner. Sky lighting: <a href="https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky" target="_blank" rel="noopener">Poly Haven / CC0</a>.<br>This site keeps anonymous visit statistics (device type, browser, approximate city, visit times). No names or IP addresses are stored.</div></dialog>`;
$('#about').insertAdjacentHTML('afterend', `<button id="sound" class="icon-btn" aria-label="Mute ambient sound" aria-pressed="true" data-tip="Mute ambient sound">${icon('volume-2')}</button>`);
$('#walk-location').insertAdjacentHTML('beforebegin', '<select id="walk-route" aria-label="Interior route"><option value="hall">Central hall</option><option value="right">Ground-floor right wing</option><option value="seminar">Seminar Hall surrounds</option><option value="classroom">Upstairs classroom wing</option></select>');
$('#walk-route').insertAdjacentHTML('beforeend', '<option value="stairs">Stairs: ground to roof</option><option value="terraceLeft">Classroom-wing terrace</option><option value="upperCorridor">Second-floor right corridor</option><option value="terraceRight">Upper right terrace</option>');
$('#light-panel').insertAdjacentHTML('beforeend', '<label class="range-label" for="ambient-volume">Ambient volume <output id="volume-output">40%</output></label><input id="ambient-volume" type="range" min="0" max="100" value="40" step="1"/>');
$('#light-panel').insertAdjacentHTML('beforeend', '<label class="motion-row" for="live-clock">Live campus time<input id="live-clock" type="checkbox" checked /></label><p id="weather-detail" class="weather-detail" role="status">Fetching campus weather</p><p id="forecast" class="weather-detail"></p><a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener">Weather: Open-Meteo</a>');
$('#hour').min = 0; $('#hour').max = 23.99;
$('#weather-detail').insertAdjacentHTML('afterend', '<p id="moon-detail" class="weather-detail"></p>');
refreshIcons();
$("#walk-route").insertAdjacentHTML("beforeend", '<option value="classII">Class Room II</option><option value="classIII">Class Room III</option>');
const sound = createAmbience();
function updateSoundButton() {
  const active = sound.enabled;
  $('#sound').setAttribute('aria-pressed', active);
  $('#sound').setAttribute('aria-label', active ? 'Mute ambient sound' : 'Unmute ambient sound');
  $('#sound').dataset.tip = active ? 'Mute ambient sound' : 'Unmute ambient sound';
  $('#sound').innerHTML = icon(active ? 'volume-2' : 'volume-x');
  refreshIcons();
}
let soundActivationBound = true;
function resumeDefaultSound() {
  if (!soundActivationBound || !sound.enabled) return;
  sound.setEnabled(true).then(() => {
    if (sound.context?.state === 'running') {
      soundActivationBound = false;
      for (const type of soundGestures) document.removeEventListener(type, resumeDefaultSound, true);
    }
  }).catch(() => {});
}
// Phones grant audio permission on touch release or tap, not on touch-down.
const soundGestures = ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown'];
for (const type of soundGestures) document.addEventListener(type, resumeDefaultSound, true);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
} catch {
  $('#loader').innerHTML = '<p>This browser cannot start the 3D scene.</p><small>Please try a current version of Chrome, Edge, Firefox or Safari with hardware acceleration on.</small>';
}
// Download the environment and sky while the page sets up, instead of after the building is built.
const loadBar = () => $('.load-track>span');
const environmentDownload = renderer ? prefetchEnvironment(p => {
  const bar = loadBar(); if (bar) { bar.style.animation = 'none'; bar.style.transform = `scaleX(${p.toFixed(3)})`; }
  if (p < 1) $('#loading-status').textContent = `Downloading the campus ${Math.round(p * 100)}%`;
}) : null;
environmentDownload?.catch(() => {}); // handled where it is awaited
const skyDownload = renderer ? new HDRLoader().loadAsync('/media/sky.hdr') : null;
skyDownload?.catch(() => {});
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b6c5c9'); scene.fog = new THREE.Fog('#b6c5c9', 80, 300);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .15, 500);
let controls, architecture, landscape, surroundings, entranceWalk, panoramaLook, avatar;
let selected = 0, transition = null, journey = false, journeyStart = 0, isOrbiting = false, doorsOpen = false, hour = 16.5, targetHour = 16.5;
const hallSwitch = { lights: true, fan: true, porch: true }; // entrance hall switch box: wall tubes, fan, porch tube
let ready = false, drift = !reduced, quality = 'auto', needsRender = true, lastRendered = 0, lastShadowUpdate = 0;
let interactive = false, dragging = 0, avatarMovedAt = 0;
let panorama = false;
function setPanorama(enabled) {
  panorama = enabled;
  $('#panorama').setAttribute('aria-pressed', enabled);
  $('#experience').classList.toggle('panorama-view', enabled);
  if (!controls) return;
  controls.enabled = !enabled && !entranceWalk?.active;
  controls.enablePan = enabled;
  controls.screenSpacePanning = true;
  controls.minDistance = enabled ? 2 : 13;
  controls.maxPolarAngle = enabled ? Math.PI - .01 : Math.PI * .485;
  controls.touches.TWO = THREE.TOUCH.DOLLY_PAN;
}
const sun = new THREE.DirectionalLight('#ffe8c5', 3.5);
sun.position.set(-34, 39, 30); sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048); sun.shadow.camera.left = -55; sun.shadow.camera.right = 55; sun.shadow.camera.top = 40; sun.shadow.camera.bottom = -40; sun.shadow.camera.far = 180;
sun.shadow.normalBias = .05; sun.shadow.bias = -.00015; sun.shadow.radius = 3; scene.add(sun);
const ambient = new THREE.HemisphereLight('#e4eff7', '#77654c', 1.25); scene.add(ambient);
// Lightning: a cool sky-wide flash during live thunderstorm weather (never for reduced-motion users).
const lightning = new THREE.DirectionalLight('#dce6ff', 0); lightning.position.set(-30, 90, -60); scene.add(lightning);
// Lights are never hidden, only dimmed to 0: hiding or showing one changes the light count, which rebuilds every lit
// material's shader at once (an 8 s freeze on the owner's laptop). A dark light costs about 2 ms per frame there.
let skyBase = .95, nextStrike = 0, strike = null;
const shadowSun = new THREE.Vector3();
const entranceLight = new THREE.PointLight('#fff0cc', 0, 14, 2);
entranceLight.name = 'Entrance tube light';
entranceLight.position.set(0, 3.30, 7.32);
entranceLight.castShadow = true;
entranceLight.shadow.mapSize.set(512, 512);
entranceLight.shadow.camera.near = .025;
entranceLight.shadow.camera.far = 14;
entranceLight.shadow.bias = -.00003;
entranceLight.shadow.normalBias = .008;
// Static canopy occlusion needs a new cube map only when the doors move.
entranceLight.shadow.autoUpdate = false;
entranceLight.shadow.needsUpdate = true;
scene.add(entranceLight);
const litWindows = [], litWindowGroup = new THREE.Group(); litWindowGroup.name = 'Lit tower windows'; scene.add(litWindowGroup); // they rise with the tower (rise.js)
const warm = new THREE.MeshStandardMaterial({ color: '#f1d6a7', emissive: '#ffbd6a', emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false });
for (const x of [-2, 2]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), warm); p.position.set(x, 10.8, 7.02); litWindowGroup.add(p); litWindows.push(p);
}
const defaultPixelRatio = () => Math.min(devicePixelRatio, 1.35);
const frameSamples = [];
let lastResolutionChange = 0;
// Previously this only ever lowered the pixel ratio, so every tab switch (one huge frame) blurred the scene for good.
let readyAt = Infinity, cadence = 1, cadenceFloor = 1; // render every Nth display frame (1 = 60 fps, 2 = 30, 3 = 20); floor = fastest that held
let resolutionCap = Infinity; // highest pixel ratio this device has proven it can sustain (session-long)
// A new pixel ratio resizes, and so clears, the canvas that was just drawn: draw it again at once, or the browser shows
// a blank frame (a grey flash mid-walk).
const setRatio = ratio => { renderer.setPixelRatio(ratio); if (ready) { renderer.render(scene, camera); portfolio?.afterRender(); } };
// Adaptive quality for weak GPUs. Goal: one steady state, never oscillation (sharp/soft switching reads as flashing).
// Under load: (1) even 30 fps, (2) small resolution steps (x0.88) down to 0.8, (3) even 20 fps.
// Every 20 s of stability it tries one step better; a step that fails becomes a permanent limit, so nothing flips back.
function adaptResolution(interval, now) {
  frameSamples.push(interval); if (frameSamples.length > 40) frameSamples.shift();
  if (frameSamples.length < 40 || now - lastResolutionChange < 2000 || now - readyAt < 4000) return; // skip shader warm-up
  const average = frameSamples.slice().sort((a, b) => a - b)[20], ratio = renderer.getPixelRatio(); // median: one-off stalls do not count
  const budget = cadence * 1000 / 60, best = defaultPixelRatio();
  const change = () => { frameSamples.length = 0; lastResolutionChange = now; needsRender = true; };
  // The story's camera moves with the scroll, so it sheds sharpness before frames, down to Kage's floor (.55 of the
  // display's pixels): skipped frames read as a stutter in the walk, softness during it does not.
  const story = portfolio?.active;
  if (average > budget * (cadence > 1 ? 1.12 : 1.2)) {
    if (cadence < 2 && !story) { cadence = cadenceFloor = 2; return change(); }
    // Phones have few CSS pixels; below ~1.1 they turn visibly soft, so they shed frames before sharpness.
    const floor = story ? .55 * Math.min(devicePixelRatio, 1.5) : small() ? Math.min(1.1, best) : .8;
    // One step straight to the estimated ratio: every resize stalls ~0.15 s here, and four small steps in a row read
    // as stutter right after the scene appears (cost ~ pixels, so scale the pixel ratio by the square root).
    if (ratio > floor + .01) { resolutionCap = Math.max(floor, Math.min(ratio * .88, ratio * Math.sqrt(budget / average) * .95)); setRatio(resolutionCap); return change(); }
    if (cadence < 2) { cadence = cadenceFloor = 2; return change(); }
    if (cadence < 3) { cadence = cadenceFloor = 3; return change(); }
  } else if (story && cadence > 1 && now - lastResolutionChange > 6000) {
    // The story moves between heavy outdoor views and light interiors. The samples are render intervals, which at a
    // slower pace say nothing about whether a faster one fits, so it tries one: frames on pace for six seconds step up,
    // and the rule above steps back if it does not hold.
    cadence--; cadenceFloor = Math.min(cadenceFloor, cadence); return change();
  } else if (now - lastResolutionChange > 20000) {
    const up = Math.min(best, resolutionCap, ratio / .88);
    if (up > ratio + .01) { setRatio(up); return change(); }
    if (cadence > cadenceFloor) { cadence--; return change(); }
  }
}
// Live weather point supplied for the Andhra University campus.
const LOCATION = { latitude: 17.6801, longitude: 83.2016, timezone: 'Asia/Kolkata', label: 'ANDHRA UNIVERSITY / VISAKHAPATNAM' };
const WEATHER_RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const weatherState = { loaded: false, stale: false, rainFactor: 0, storm: false, windSpeed: 0, code: null, temperature: null, cloudCover: 0, summary: 'SYNCING WEATHER', updatedAt: 0, observedAt: 0, sunrise: null, sunset: null, moonrise: null, moonset: null, forecast: '' };
const moonState = { phase: 0, illumination: 0, label: 'MOON', updatedAt: 0 };
let sunlight = solarState(new Date(), LOCATION);
let liveClock = true;
let lastClockSync = 0;

function localHour(now = Date.now()) {
  const parts = new Intl.DateTimeFormat('en-IN', { timeZone: LOCATION.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(now);
  const h = Number(parts.find(part => part.type === 'hour')?.value || 0);
  const m = Number(parts.find(part => part.type === 'minute')?.value || 0);
  return Math.min(23.99, h + m / 60);
}

function moonLabel(phase, illumination) {
  if (phase < .015 || phase > .985) return 'NEW MOON';
  if (Math.abs(phase - .5) < .015) return 'FULL MOON';
  if (Math.abs(illumination - .5) < .035) return phase < .5 ? 'FIRST QUARTER' : 'LAST QUARTER';
  return `${phase < .5 ? 'WAXING' : 'WANING'} ${illumination < .5 ? 'CRESCENT' : 'GIBBOUS'}`;
}
const sky = createLiveSky(scene, camera);
function updateMoon(now = Date.now()) {
  const state = lunarState(liveClock ? new Date(now) : campusDate(targetHour, now), LOCATION);
  Object.assign(moonState, state, { label: moonLabel(state.phase, state.illumination), updatedAt: now });
  sky.phase(state); updateWeatherLabel(); needsRender = true;
  $('#moon-detail').textContent = `Moon: ${(state.illumination * 100).toFixed(1)}% illuminated`;
}

const rain = createRain(scene, camera);
let puddles;

function updateWeatherLabel() {
  const temp = weatherState.temperature == null ? '' : ` / ${Math.round(weatherState.temperature)}°C`;
  const weather = weatherState.loaded ? `${weatherState.stale ? 'LAST REPORT / ' : ''}${weatherState.summary}${temp}` : weatherState.summary;
  $('#weather-label').textContent = `${weather} / ${moonState.label}`;
  $('#weather-label').title = 'Latest campus weather and lunar phase; moon size and placement are artistic';
  $('#weather-detail').textContent = weatherState.loaded ? `${weatherState.stale ? 'Last available' : 'Reported'} ${new Date(weatherState.observedAt).toLocaleTimeString('en-IN', { timeZone: LOCATION.timezone, hour: '2-digit', minute: '2-digit' })} IST / Wind ${Math.round(weatherState.windSpeed)} km/h` : weatherState.summary;
  $('#forecast').textContent = weatherState.forecast;
}

function updateWetMaterials() {
  const wet = weatherState.rainFactor;
  if (!landscape) return;
  // Ground wetness and puddles follow the water model in puddles.js, which keeps surfaces wet after rain.
  if (architecture) {
    architecture.materials.paving.roughness = THREE.MathUtils.lerp(.9, .3, wet);
    architecture.materials.glass.roughness = THREE.MathUtils.lerp(.055, .025, wet);
    architecture.materials.rearGlass.roughness = architecture.materials.glass.roughness;
  }
}

let weatherRetry;
async function loadWeather() {
  clearTimeout(weatherRetry);
  const params = new URLSearchParams({
    latitude: LOCATION.latitude, longitude: LOCATION.longitude,
    current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,wind_speed_10m,wind_direction_10m,wind_gusts_10m,rain,precipitation,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure',
    daily: 'weather_code,temperature_2m_min,temperature_2m_max,sunrise,sunset,rain_sum,showers_sum,precipitation_sum,precipitation_hours,precipitation_probability_max,sunshine_duration,daylight_duration,moonrise,moon_phase,moonset,apparent_temperature_max,apparent_temperature_min,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant',
    hourly: 'temperature_2m,showers,rain,precipitation,precipitation_probability,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,visibility,wind_speed_10m,wind_direction_10m,wind_gusts_10m,is_day,sunshine_duration',
    timeformat: 'unixtime', timezone: 'auto', past_days: '2', forecast_days: '7'
  });
  try {
    const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, { mode: 'cors', cache: 'no-store', signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`weather ${response.status}`);
    const data = await response.json(), current = data.current;
    if (!current || ![current.time, current.weather_code, current.temperature_2m, current.cloud_cover, current.wind_speed_10m].every(Number.isFinite)) throw new Error('Incomplete weather report');
    const code = Number(current.weather_code); const precip = Number(current.precipitation) || 0; const rainNow = Number(current.rain) || 0; const showers = Number(current.showers) || 0;
    const wet = WEATHER_RAIN_CODES.has(code) || precip > 0 || rainNow > 0 || showers > 0;
    weatherState.loaded = true; weatherState.observedAt = current.time * 1000; weatherState.stale = Math.abs(Date.now() - weatherState.observedAt) > 90 * 60000;
    weatherState.code = code; weatherState.temperature = current.temperature_2m; weatherState.cloudCover = THREE.MathUtils.clamp(current.cloud_cover, 0, 100);
    weatherState.storm = [95, 96, 99].includes(code); weatherState.windSpeed = Math.max(0, Number(current.wind_speed_10m) || 0);
    weatherState.windDirection = Number(current.wind_direction_10m) || 0;
    weatherState.windGusts = Math.max(weatherState.windSpeed, Number(current.wind_gusts_10m) || 0);
    const rainReport = rainfall(current);
    weatherState.rainFactor = rainReport.factor; weatherState.rainRate = rainReport.rate;
    weatherState.summary = weatherState.storm ? 'THUNDERSTORM' : wet ? 'RAIN' : [45, 48].includes(code) ? 'FOG' : weatherState.cloudCover > 72 ? 'OVERCAST' : weatherState.cloudCover > 35 ? 'PARTLY CLOUDY' : 'CLEAR'; weatherState.updatedAt = Date.now();
    if (wet) weatherState.cloudCover = Math.max(weatherState.cloudCover, 75);
    const daily = data.daily;
    const dayIndex = daily?.time?.reduce((best, day, index, days) => Math.abs(day * 1000 - Date.now()) < Math.abs(days[best] * 1000 - Date.now()) ? index : best, 0) ?? -1;
    if (daily && dayIndex >= 0) {
      weatherState.sunrise = Number.isFinite(daily.sunrise?.[dayIndex]) ? daily.sunrise[dayIndex] * 1000 : null;
      weatherState.sunset = Number.isFinite(daily.sunset?.[dayIndex]) ? daily.sunset[dayIndex] * 1000 : null;
      weatherState.moonrise = Number.isFinite(daily.moonrise?.[dayIndex]) ? daily.moonrise[dayIndex] * 1000 : null;
      weatherState.moonset = Number.isFinite(daily.moonset?.[dayIndex]) ? daily.moonset[dayIndex] * 1000 : null;
    }
    const forecast = data.hourly;
    const next = forecast?.time?.map((t, i) => ({ t, chance: forecast.precipitation_probability?.[i], code: forecast.weather_code?.[i] })).filter(v => v.t * 1000 >= Date.now() && v.t * 1000 < Date.now() + 6 * 3600000) || [];
    const chances = next.map(v => v.chance).filter(Number.isFinite);
    const dailyRisk = Number.isFinite(data.daily?.precipitation_probability_max?.[dayIndex]) ? data.daily.precipitation_probability_max[dayIndex] : null;
    const risk = chances.length ? Math.max(...chances, dailyRisk ?? 0) : dailyRisk;
    weatherState.forecast = risk == null ? 'Forecast unavailable' : `Next 6 hours: ${risk}% maximum hourly rain chance.${risk >= 50 ? ' An umbrella is advisable.' : ''}${next.some(v => [95, 96, 99].includes(v.code)) ? ' Thunderstorms possible.' : ''}`;
    // Hourly rain over the past two days warm-starts the puddles, once.
    weatherState.rainHistory = forecast?.time?.map((t, i) => ({ t: t * 1000, mm: Number(forecast.precipitation?.[i]) || 0 })) || [];
    if (puddles && !puddles.warmed) { puddles.history(weatherState.rainHistory); puddles.warmed = true; }
    updateWetMaterials(); updateLighting(hour); updateWeatherLabel();
  } catch {
    weatherState.stale = true;
    if (!weatherState.loaded) weatherState.summary = 'WEATHER UNAVAILABLE';
    updateWeatherLabel();
    weatherRetry = setTimeout(() => { if (!document.hidden) loadWeather(); }, 30000);
  }
}

function updateLighting(h) {
  sunlight = solarState(liveClock ? new Date() : campusDate(h), LOCATION);
  sound.setDaylight(THREE.MathUtils.smoothstep(sunlight.altitude, 0, 6), sunlight.altitude);
  const evening = sunlight.night;
  const golden = 1 - THREE.MathUtils.smoothstep(sunlight.altitude, 0, 25);
  const wet = weatherState.rainFactor;
  sun.position.copy(skyDirection(sunlight.altitude, sunlight.azimuth)).multiplyScalar(80);
  sun.color.set('#fff4dc').lerp(new THREE.Color('#ffd0a2'), golden);
  sun.intensity = 3.6 * THREE.MathUtils.smoothstep(sunlight.altitude, -.833, 12) * (1 - weatherState.cloudCover / 100 * .75);
  ambient.intensity = THREE.MathUtils.lerp(.7, .5, evening) * THREE.MathUtils.lerp(1, .9, wet);
  scene.environmentIntensity = THREE.MathUtils.lerp(.42, .2, evening);
  // Overcast rain dims and greys the clear-sky photograph instead of leaving a bright blue sky.
  skyBase = scene.backgroundIntensity = THREE.MathUtils.lerp(.95, .13, evening) * (1 - .5 * wet) * (1 - weatherState.cloudCover / 100 * .25);
  scene.fog.color.set('#b6c5c9').lerp(new THREE.Color('#182336'), evening).lerp(new THREE.Color('#64757b'), wet * .6);
  if (scene.background?.isColor) scene.background.copy(scene.fog.color);
  surroundings?.update(scene.fog.color);
  entranceLight.intensity = hallSwitch.porch ? evening * 40 : 0; // the porch tube is on its switch (hall switch box)
  warm.opacity = evening * .6; warm.emissiveIntensity = evening * 1.4;
  if (architecture) {
    for (const material of [architecture.materials.glass, architecture.materials.rearGlass]) material.envMapIntensity = THREE.MathUtils.lerp(1.4, .22, evening);
    architecture.materials.entranceReflectiveGlass.envMapIntensity = THREE.MathUtils.lerp(2, .65, evening);
  }
  if (renderer) {
    renderer.toneMappingExposure = THREE.MathUtils.lerp(.94, .8, evening);
    // Re-render shadows only when the sun has visibly moved (~0.3 degrees), so edges do not jump every clock tick.
    if (!ready || performance.now() - lastShadowUpdate > 200 && sun.position.angleTo(shadowSun) > .005) { renderer.shadowMap.needsUpdate = true; lastShadowUpdate = performance.now(); shadowSun.copy(sun.position); }
  }
  needsRender = true;
}
function formatTime(h) { const m = Math.round(h * 60) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; }
function setHour(h, { manual = true } = {}) {
  if (manual) liveClock = false;
  $('#live-clock').checked = liveClock;
  targetHour = h;
  if (reduced) hour = h;
  updateLighting(hour); updateMoon();
  $('#hour').value = h; $('#hour-output').textContent = formatTime(h);
  const sunAtTime = solarState(liveClock ? new Date() : campusDate(h), LOCATION);
  const period = sunAtTime.altitude < -6 ? 'NIGHT' : sunAtTime.altitude < 4 ? (sunAtTime.azimuth < 180 ? 'DAWN' : 'DUSK') : h < 12 ? 'MORNING' : 'AFTERNOON';
  $('#time-label').textContent = `${formatTime(h)} IST / ${liveClock ? 'LIVE' : 'PREVIEW'} / ${period}`;
  document.querySelectorAll('[data-hour]').forEach(b => { b.classList.toggle('selected', Math.abs(+b.dataset.hour - h) < .2); b.setAttribute('aria-pressed', Math.abs(+b.dataset.hour - h) < .2); });
}
function fly(eye, target, duration = 2600) {
  if (!controls) return;
  transition = { start: performance.now(), duration: reduced ? 1 : duration, from: camera.position.clone(), to: new THREE.Vector3(...eye), fromTarget: controls.target.clone(), toTarget: new THREE.Vector3(...target) };
  needsRender = true;
}
function cameraFor(index) {
  const c = chapters[index];
  if (small() && index === 3) return [-1, 7, 26];
  if (small() && index === 2) return [0, 8, 30];
  const target = new THREE.Vector3(...c.target), eye = new THREE.Vector3(...c.eye);
  if (small()) eye.sub(target).multiplyScalar(index === 0 ? 2.4 : 1.25).add(target);
  return eye.toArray();
}
function updateChapter(index) {
  selected = index;
  document.querySelectorAll('[data-chapter]').forEach(b => { const active = +b.dataset.chapter === index; b.classList.toggle('active', active); b.setAttribute('aria-pressed', active); });
  $('h1').innerHTML = chapters[index].title;
  $('#scene-note').textContent = chapters[index].note;
  $('#scene-number').textContent = `0${index + 1}`;
  $('#eyebrow').textContent = index === 0 ? 'THE DEPARTMENT / NORTH CAMPUS' : `PERSPECTIVE 0${index + 1} / NORTH CAMPUS`;
  $('#door').hidden = index !== 1;
  $('#enter-hall').hidden = index !== 1;
  $('.heading-actions').hidden = index !== 0;
  $('#experience').classList.toggle('detail-view', index !== 0);
}
function selectChapter(index) {
  if (avatar?.active) leaveAvatar();
  if (entranceWalk?.active) leaveHall(false);
  setPanorama(false);
  $('#experience').classList.remove('footprint-view');
  stopJourney(); setOrbit(false); interactive = false; updateChapter(index);
  if (controls) controls.maxPolarAngle = Math.PI * .485;
  fly(cameraFor(index), chapters[index].target);
}
function setOrbit(enabled) {
  isOrbiting = enabled; $('#orbit').setAttribute('aria-pressed', enabled);
  if (controls) {
    controls.autoRotate = enabled; controls.autoRotateSpeed = .35;
    // Constant-speed orbit needs no input inertia; preserve damping for manual exploration.
    controls.enableDamping = !enabled;
  }
}
function stopJourney() {
  journey = false; $('#journey-track').hidden = true; $('#film').innerHTML = `${icon('play')}<span>Play the journey</span>`;
  $('#film').setAttribute('aria-pressed', 'false'); $('#scene-mode').textContent = 'LIVE EXPLORATION'; refreshIcons();
}
function startJourney() {
  if (avatar?.active) leaveAvatar();
  if (!ready) return;
  if (entranceWalk?.active) leaveHall(false);
  if (journey) return stopJourney();
  setPanorama(false);
  transition = null; interactive = false; setOrbit(false); journey = true; journeyStart = performance.now();
  tourFrom.copy(camera.position); tourLookFrom.copy(controls.target);
  $('#film').innerHTML = `${icon('pause')}<span>Pause the journey</span>`; $('#film').setAttribute('aria-pressed', 'true');
  $('#scene-mode').textContent = 'THE CAMPUS / IN MOTION'; $('#journey-track').hidden = false; refreshIcons();
}
const tourFrom = new THREE.Vector3(), tourLookFrom = new THREE.Vector3();
const tourCurve = new THREE.CatmullRomCurve3([[42, 31, 76], [21, 17, 49], [5, 6.3, 31], [9, 8, 30], [34, 18, 42], [0, 32, 72], [-13, 10, 37], [-30, 30, 64], [42, 31, 76]].map(p => new THREE.Vector3(...p)));
const lookCurve = new THREE.CatmullRomCurve3([[0, 5, 0], [0, 6, 2], [0, 6, 3], [18, 6, 0], [20, 5, 0], [0, 5, 0], [-18, 4, 0], [-9, 5, 0], [0, 5, 0]].map(p => new THREE.Vector3(...p)));

function resize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  scene.fog.near = small() ? 160 : 80; scene.fog.far = small() ? 450 : 300;
  if (!interactive && !journey && !entranceWalk?.active && !portfolio?.active) { camera.position.fromArray(cameraFor(selected)); controls.target.fromArray(chapters[selected].target); transition = null; }
  needsRender = true;
}
function drawPlan() {
  const c = $('.plan canvas'), x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height);
  x.fillStyle = '#dee5d744'; x.strokeStyle = '#e7eed9'; x.lineWidth = 1.3;
  const scale = 2.65;
  for (const p of footprint) {
    const left = 110 + (p.x - p.width / 2) * scale, top = 54 + (p.z - p.depth / 2) * scale;
    x.fillRect(left, top, p.width * scale, p.depth * scale); x.strokeRect(left, top, p.width * scale, p.depth * scale);
  }
  if (camera) { x.fillStyle = '#d5e9a7'; x.beginPath(); x.arc(110 + camera.position.x * .85, 63 + camera.position.z * .5, 3, 0, Math.PI * 2); x.fill(); }
}
async function boot() {
  if (!renderer) return;
  renderer.setPixelRatio(defaultPixelRatio()); renderer.setSize(innerWidth, innerHeight);
  { const pointers = new Set(), canvas = renderer.domElement, up = e => { pointers.delete(e.pointerId); dragging = pointers.size; };
    canvas.addEventListener('pointerdown', e => { pointers.add(e.pointerId); dragging = pointers.size; });
    for (const type of ['pointerup', 'pointercancel']) addEventListener(type, up); addEventListener('blur', () => { pointers.clear(); dragging = 0; }); }
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Interactive building. Arrow keys rotate, plus and minus zoom, Home returns to arrival.');
  $('#viewport').append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .055;
  // The story layer exists from the start, so a visitor can step in while the campus is still being built: Enter is
  // live at once, and the hero shows over the night until the building is ready to rise (owner, 2026-10-19: loading
  // must feel quick). Automated runs (checks, measurements) see the finished building in the exploration layer unless
  // they ask for the story (__story) or the rise (__playRise).
  const automated = navigator.webdriver || window.__autoBegin || /[?&]auto\b/.test(location.search);
  // This page is the live campus (/campus/): the story is the pre-rendered one at the site's root (src/story.js), whose
  // doors land here, ?explore for the free camera or ?walk for the guide. ?live still plays the story live, here.
  const params = new URLSearchParams(location.search), liveStory = params.has('live') || window.__story;
  if (!liveStory || (automated && !window.__story)) { window.__noStory = true; window.__noRise = true; window.__enterWay = params.has('walk') ? 'walk' : 'explore'; }
  if (automated && !window.__playRise) window.__noRise = true;
  document.body.append($('#loader')); // above every layer: #experience is fixed (its own stacking context), the story sits over it
  portfolio = createPortfolio({ scene, camera, renderer, reduced: reduced || !!window.__noRise, changed: () => { needsRender = true; }, onEnter: way => leaveStory(way) });
  // No gate (owner, 2026-10-19: the site ships as an app, so no full-screen request): the story shows at once, its hero
  // over the night while the campus is built, and the building rises as soon as it is ready.
  if (!automated && !window.__noStory) { entered = true; controls.enabled = false; portfolio.wait(); $('#loader').hidden = true; }
  controls.minDistance = 13; controls.maxDistance = 260; controls.maxPolarAngle = Math.PI * .485; controls.minPolarAngle = .001; controls.enablePan = false; controls.zoomSpeed = .7; controls.rotateSpeed = .5;
  camera.position.fromArray(cameraFor(0)); controls.target.fromArray(chapters[0].target); controls.update();
  controls.addEventListener('start', () => { transition = null; interactive = true; stopJourney(); setOrbit(false); });
  controls.addEventListener('change', () => { needsRender = true; });
  entranceWalk = createEntranceWalk(camera, renderer.domElement, () => leaveHall(), () => { needsRender = true; });
  panoramaLook = createPanoramaLook(camera, renderer.domElement, () => panorama && !entranceWalk.active, () => {
    const direction = camera.getWorldDirection(new THREE.Vector3());
    controls.target.copy(camera.position).addScaledVector(direction, 15);
    needsRender = true;
  });
  $('#loading-status').textContent = 'Reconstructing the architecture';
  await new Promise(resolve => requestAnimationFrame(resolve));
  pieces.tagging = true; // every merged wall, slab and pane keeps its own centre, for the rise (rise.js)
  architecture = buildArchitecture(scene);
  architecture.mergedDrawCalls = mergeStaticDetail(architecture.group); // ~400 fewer draw calls
  pieces.tagging = false;
  westFittings = architecture.group.getObjectByName('West wing fittings');
  dispensers = architecture.group.getObjectByName('West wing ground floor (video-built)')?.userData.dispensers || [];
  // The hall's switch box on the east wall (entrance photos): wall tubes, ceiling fan, porch tube light.
  makeSwitchboard(architecture.interior.group, { name: 'Entrance hall', position: [3.675, 1.281, 6.568], turn: -Math.PI / 2, toggles: [
    { get: () => hallSwitch.lights, set: on => { hallSwitch.lights = on; architecture.interior.tubes.emissiveIntensity = on ? 1.7 : .05; } },
    { get: () => hallSwitch.fan, set: on => { hallSwitch.fan = on; } },
    { get: () => hallSwitch.porch, set: on => { hallSwitch.porch = on; architecture.materials.porchTube.emissiveIntensity = on ? 2 : .05; updateLighting(hour); } }] });
  architecture.group.traverse(o => { if (o.userData.casements) casements.push(o.userData.casements); // windows that open
    if (o.userData.clickables) clickables.push(...o.userData.clickables); if (o.userData.update) roomUpdates.push(o.userData.update); if (o.userData.interior) interiors.push(o.userData.interior); }); // switches, fans, room lights
  { // A tap or click (not a drag) on a water machine within reach starts it pouring.
    const canvas = renderer.domElement, ray = new THREE.Raycaster(), at = new THREE.Vector2(); let down = null;
    canvas.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, t: performance.now() }; });
    canvas.addEventListener('pointerup', e => {
      if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8 || performance.now() - down.t > 500) return;
      const r = canvas.getBoundingClientRect(); at.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
      ray.setFromCamera(at, camera); ray.far = 8;
      const hit = ray.intersectObjects(dispensers.map(d => d.hit), false)[0];
      if (hit && dispensers.find(d => d.hit === hit.object).start(sound)) { needsRender = true; return; }
      const control = ray.intersectObjects(clickables, false)[0]; // a switch on a switchboard
      if (control && control.object.userData.onClick()) { needsRender = true; return; }
      ray.far = 25; // windows: tap one to open or close it (both leaves swing outward)
      const pane = ray.intersectObjects(casements.map(c => c.group), true).find(h => h.object.userData.casement);
      if (pane) { casements.find(c => c.windows.includes(pane.object.userData.casement)).toggle(pane.object.userData.casement); needsRender = true; }
    });
  }
  // Small building parts (signs, latches, fans, props): bounds once; skipped while they would cover under ~8 pixels.
  architecture.group.updateMatrixWorld(true);
  architecture.group.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.visible) return; o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (s.radius < 1.2) smallParts.push([o, s]); });
  resolveCoplanar(architecture.group); // no flicker where two surfaces share a plane
  architecture.interior.lights.forEach(light => { light.userData.on = light.intensity; light.intensity = 0; }); // lit inside the hall only
  $('#loading-status').textContent = 'Finding the light';
  await new Promise(resolve => requestAnimationFrame(resolve));
  $('#loading-status').textContent = 'Growing the Blender landscape';
  performance.mark('architecture-built');
  // One filter for the sky and every reflection probe: each new generator recompiled its shaders (~1.6 s apiece).
  reflectionFilter = new THREE.PMREMGenerator(renderer);
  try {
    const hdr = await skyDownload; hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = reflectionFilter.fromEquirectangular(hdr);
    scene.environment = env.texture; scene.background = hdr; scene.backgroundBlurriness = .02; scene.backgroundRotation.y = 1.9; scene.environmentRotation.y = 1.9;
  } catch { console.warn('Sky map unavailable. Using daylight fallback.'); }
  performance.mark('sky-ready');
  rise = createRise(); rise.attach(architecture.group); rise.attach(litWindowGroup); rise.set(-1); // patched before any shader compiles: no stall later
  landscape = await loadBlenderEnvironment(scene, group => { rectangularAprons(group); regradeGround(group); placeFacadeTrees(group); }, environmentDownload);
  const breathe = () => new Promise(resolve => requestAnimationFrame(resolve)); // let the loader paint between stages
  await breathe();
  buildEntranceApron(landscape.group);
  puddles = createPuddles(landscape); puddles.attach(); rain.ground = (x, z) => puddles.heightAt(x, z);
  if (weatherState.rainHistory) { puddles.history(weatherState.rainHistory); puddles.warmed = true; }
  mergeGateParts(landscape.group);
  mergeByMaterialName(landscape.group, (o, name) => /gate iron/i.test(name)); // ~40 gate parts, one cloned material each
  surroundings = buildSurroundings(scene, landscape, renderer, chapters.flatMap(c => [[c.eye, c.target], [new THREE.Vector3(...c.eye).sub(new THREE.Vector3(...c.target)).multiplyScalar(2.4).add(new THREE.Vector3(...c.target)).toArray(), c.target]]));
  performance.mark('surroundings-built');
  await breathe();
  landscape.month = campusMonth();
  leafLitter(scene, landscape.trees, (x, z) => puddles.heightAt(x, z), { time: landscape.wind, strength: landscape.windStrength, direction: landscape.windDirection }, landscape.month);
  landscape.batchTrees(); // after the impostor belt captured the individual trees
  mergeStatic(surroundings.sheds); // 24 separate shed parts
  for (const root of [landscape.group, surroundings.sheds]) root.traverse(o => { // small scenery joins the far-away skip
    if (!o.isMesh || o.isInstancedMesh || o.isBatchedMesh || !o.visible) return; o.geometry.computeBoundingSphere(); const sphere = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (sphere.radius < 1.2) smallParts.push([o, sphere]); });
  // Static scenery: compute matrices once instead of every frame (wind runs in the vertex shader).
  for (const root of [landscape.group, surroundings.belt.group, surroundings.ridge]) root.traverse(o => { o.updateMatrix(); o.matrixAutoUpdate = false; });
  // Full anisotropic filtering keeps road lines, paving and soil crisp at grazing angles.
  const anisotropy = Math.min(16, renderer.capabilities.getMaxAnisotropy());
  scene.traverse(o => { for (const m of [o.material].flat()) if (m) for (const v of Object.values(m)) if (v?.isTexture && !v.isRenderTargetTexture) v.anisotropy = Math.max(v.anisotropy, anisotropy); });
  setHour(localHour(), { manual: false });
  hour = targetHour;
  updateMoon();
  sky.update(0, sunlight.night, weatherState, reduced);
  updateWetMaterials();
  performance.mark('lighting-set');
  updateLighting(hour);
  // The building rises out of the land on arrival (rise.js): patched before any shader compiles, so it costs no stall.
  rise.attach(architecture.group, scene); // again: parts built since that share the building's materials get their centres
  riseDust = createRiseDust(footprint, (x, z) => puddles.heightAt(x, z)); scene.add(riseDust.points);
  $('#loading-status').textContent = 'Compiling the light';
  await compileShadowShaders();
  const defaultAudio = sound.setEnabled(true);
  updateSoundButton();
  defaultAudio.then(updateSoundButton).catch(updateSoundButton);
  setInterval(() => { if (!document.hidden) loadWeather(); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - weatherState.updatedAt > 5 * 60000) loadWeather(); });
  performance.mark('reflections-captured');
  await renderer.compileAsync(scene, camera);
  performance.mark('shaders-compiled');
  // Upload every texture now: three uploads a texture the first time its object is drawn, so turning the view in the
  // panorama stalled ~0.1 s whenever something new came into sight (measured mid-drag on the owner's laptop).
  { const seen = new Set(); scene.traverse(o => { for (const m of [o.material].flat()) if (m) for (const v of Object.values(m)) if (v?.isTexture && !v.isRenderTargetTexture && !seen.has(v)) { seen.add(v); renderer.initTexture(v); } }); }
  performance.mark('textures-uploaded');
  // Walkable guide: collides with the building and ground, never with foliage or effects.
  avatar = createAvatar({ scene, camera, canvas: renderer.domElement, changed: () => { needsRender = true; }, collidables: (() => {
    let list; return () => list ||= (() => { const out = []; const add = root => root?.traverse(o => { if (o.isMesh && o.visible !== false && !o.isInstancedMesh && !o.userData.windHeight && !/Batched trees|Live rain|sky|cloud|moon|horizon|Distant/i.test(o.name + (o.parent?.name || ''))) out.push(o); });
      add(architecture.group); add(landscape.group); add(surroundings.sheds); return out; })(); })() });
  performance.mark('guide-built');
  if (window.__noStory) await prepareExploration(); // straight to the free camera: ready as before
  else if (!reduced && !window.__noRise) { landscape.lodBias = 2.4; portfolio.warm(() => { landscape.updateTreeDetail(camera); renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); }); }
  ready = true; window.__portrait.ready = true; readyAt = performance.now();
  // The portfolio layer comes first: the story of the department over the live campus, then the doors into it.
  // Automated runs (checks, measurements) see the finished building in the exploration layer unless they ask for the
  // story (__story) or the rise (__playRise).
  if (!window.__noStory) { controls.enabled = false; portfolio.show(); }
  renderer.render(scene, camera);
  // One tap to begin (owner, 2026-10-18: full screen by default). Browsers only allow full screen, and sound, from a
  // tap, click or key, so the loader ends on an Enter button; that one gesture goes full screen, starts the ambience
  // and starts the building rising. Automated runs (and our test scripts) skip it.
  if (automated || entered || window.__noStory) begin(false); // in already: the building rises now (or the campus opens)
  else { $('#loader').classList.add('gate'); $('#loading-status').textContent = ''; const go = $('#begin'); go.hidden = false; go.focus({ preventScroll: true }); go.onclick = () => begin(true); }
  loadWeather();
  drawPlan(); resize(); requestAnimationFrame(animate);
}
// Shadow-map shaders are only built when shadows first render, synchronously (~6 s here). Compile them ahead, in
// parallel: give each shadow caster the exact material three's shadow pass will use, then restore it.
// The shadow passes' programs, for everything under root. compile() creates the programs synchronously and only their
// readiness is waited for, so the shadow materials are swapped back at once: the scene is never left in its shadow dress
// while other work runs.
function compileShadowShaders(root = scene) {
  const kinds = new Set();
  scene.traverse(o => { if (o.isLight && o.castShadow) kinds.add(o.isPointLight ? 'distance' : 'depth'); });
  const flip = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
  const plain = { depth: new THREE.MeshDepthMaterial(), distance: new THREE.MeshDistanceMaterial() };
  const pending = [];
  for (const kind of kinds) {
    const swapped = [];
    root.traverseVisible(o => {
      if (!o.isMesh || !o.castShadow || Array.isArray(o.material) || !o.material.visible) return;
      const m = o.material, custom = kind === 'distance' ? o.customDistanceMaterial : o.customDepthMaterial;
      const shadow = custom || plain[kind].clone(); // clones keep each caster's settings; programs are shared by key
      Object.assign(shadow, { side: m.shadowSide ?? flip[m.side], alphaMap: m.alphaMap, alphaTest: m.alphaToCoverage ? .5 : m.alphaTest, map: m.map, displacementMap: m.displacementMap, displacementScale: m.displacementScale });
      swapped.push([o, m]); o.material = shadow;
    });
    const fog = scene.fog; scene.fog = null; // the shadow pass renders without the scene, so without fog
    try { pending.push(renderer.compileAsync(root, camera, scene)); }
    finally { scene.fog = fog; for (const [o, m] of swapped) o.material = m; }
  }
  return Promise.all(pending);
}
let previous = performance.now(), frames = 0, hallLit = false, hallFanSpeed = 1;
let rise, riseDust, riseStart = 0, riseClock = 0; // the arrival: the building rising out of the land; its own clock
let portfolio = null, entered = false; // the story layer (portfolio.js), shown first; entered: Enter pressed during the load
function goFullscreen() { // the whole page, so the story scrolls in full screen too; iPhone Safari has no API for it
  const el = document.documentElement, ask = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!document.fullscreenElement && ask) try { const r = ask.call(el, { navigationUI: 'hide' }); r?.catch?.(() => {}); } catch {}
}
function openDoors() { doorsOpen = true; $('#door span').textContent = 'Close the doors'; $('#door').setAttribute('aria-pressed', 'true'); }
function begin(gesture) {
  performance.mark('begin');
  if (gesture) { goFullscreen(); resumeDefaultSound(); }
  if (reduced || window.__noRise) { rise.set(1e6); riseDust.set(1e6); renderer.shadowMap.needsUpdate = true; } else { riseStart = 1; riseClock = -.75 * RISE_RATE; } // the arrival, once the loader has faded
  // the story walks in through the front doors
  if (window.__noStory) leaveStory(window.__enterWay || 'explore'); else { openDoors(); portfolio.play(RISE_LENGTH / RISE_RATE, .75); }
  $('#loader').classList.add('loaded'); setTimeout(() => $('#loader').hidden = true, reduced ? 0 : 700); needsRender = true;
}
let reflectionFilter, explorationReady = null, explored = false;
// The reflection captures and the shader warm-up serve the free camera (glass and puddles seen up close, the panorama's
// turns). The story starts without them, its glass lit by the sky's own reflection, and they run once, behind the
// loader, when the visitor first leaves the story (they cost ~30 s of the load on an integrated GPU).
function prepareExploration() {
  return explorationReady ||= (async () => {
    const glass = [architecture.materials.glass, architecture.materials.rearGlass, architecture.materials.entranceReflectiveGlass];
    glass.forEach(material => { material.visible = false; });
    // Shaders compile in parallel off the main thread: first the reflection probes' linear (untonemapped) variants,
    // then the screen's. Compiling them inside the first render froze the page for ~20 s on integrated GPUs.
    // The reflections show the building and the sky; the 7-million-triangle campus environment around it is left out of
    // them (it cost ~45 s of the load on an integrated GPU, compiling and drawing into twenty-four cube faces).
    const environment = scene.getObjectByName('Blender campus environment'), environmentShown = environment?.visible;
    if (environment) environment.visible = false;
    const probeTarget = new THREE.WebGLCubeRenderTarget(4, { type: THREE.HalfFloatType });
    renderer.setRenderTarget(probeTarget);
    try { await renderer.compileAsync(scene, camera); } finally { renderer.setRenderTarget(null); probeTarget.dispose(); }
    performance.mark('probe-shaders-compiled');
    try {
      for (const [i, position] of [[0, 6, 20], [0, 6, -9], [0, 2.2, 7.25]].entries()) {
        // The entrance needs a crisp reflection; capture it once, without a per-frame render pass.
        const probe = new THREE.WebGLCubeRenderTarget(i === 2 ? 512 : 128, { type: THREE.HalfFloatType });
        const probeCamera = new THREE.CubeCamera(.2, 180, probe);
        try {
          probeCamera.position.fromArray(position); probeCamera.update(renderer, scene); performance.mark(`probe-${i}-rendered`);
          glass[i].envMap = reflectionFilter.fromCubemap(probe.texture).texture;
          glass[i].needsUpdate = true;
        } finally {
          probe.dispose();
        }
      }
      // Ground-level view in front of the building for the puddles (one capture; parallax is not tracked).
      { const probe = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType }), cam = new THREE.CubeCamera(.1, 200, probe);
        try { cam.position.set(0, .35, 15); cam.update(renderer, scene); puddles.setReflection(reflectionFilter.fromCubemap(probe.texture).texture); } finally { probe.dispose(); } }
    } finally {
      glass.forEach(material => { material.visible = true; });
      if (environment) environment.visible = environmentShown;
    }
    reflectionFilter.dispose();
    performance.mark('reflections-captured');
    await renderer.compileAsync(scene, camera); // the glass and puddles, recompiled with their new reflections
    // Draw the scene once in six directions: ANGLE (D3D11) finishes each shader the first time it draws on screen, so
    // the first turn of the panorama stalled 0.1-0.6 s per new view.
    const facing = camera.quaternion.clone(), ahead = new THREE.Vector3();
    for (const d of [[1, 0, 0], [-1, 0, 0], [0, 0, 1], [0, 0, -1], [0, 1, .01], [0, -1, .01]]) { camera.lookAt(ahead.copy(camera.position).add(new THREE.Vector3(...d))); renderer.render(scene, camera); }
    camera.quaternion.copy(facing);
    explored = true; performance.mark('exploration-ready');
  })();
}
async function leaveStory(way) {
  if (!explored) {
    const loader = $('#loader'); loader.hidden = false; loader.classList.remove('loaded', 'gate'); $('#loading-status').textContent = 'Opening the campus';
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); await prepareExploration();
    loader.classList.add('loaded'); setTimeout(() => { loader.hidden = true; }, reduced ? 0 : 700);
  }
  portfolio.hide(); scrollTo(0, 0); controls.enabled = true; camera.fov = 43; camera.updateProjectionMatrix();
  controls.target.copy(camera.position).add(camera.getWorldDirection(new THREE.Vector3()).multiplyScalar(30)); controls.update();
  if (way === 'walk') enterAvatar(); else selectChapter(0);
  renderer.domElement.focus({ preventScroll: true }); needsRender = true;
}
function showStory() {
  if (avatar?.active) leaveAvatar(); if (entranceWalk?.active) leaveHall(false);
  setPanorama(false); stopJourney(); setOrbit(false); transition = null; controls.enabled = false; openDoors(); portfolio.show(); needsRender = true;
}
let westFittings = null, dispensers = [], casements = [], clickables = [], roomUpdates = [], interiors = []; const smallParts = []; const westBox = new THREE.Box3(new THREE.Vector3(-34, -1, -15), new THREE.Vector3(-21, 5, 15));
// What the camera can see: far small parts skipped, rooms' fittings only from inside (shared by the loop and snapshots).
function cullForCamera() {
  if (westFittings) westFittings.visible = westBox.distanceToPoint(camera.position) < 30; // far away they are sub-pixel
  // Every draw call costs CPU and GPU-process time on ANGLE: ~170 tiny ones made every few frames late (p90 50 ms).
  for (const [o, s] of smallParts) o.visible = s.radius > .005 * s.center.distanceTo(camera.position);
  // A room's fans and switches are drawn only from inside it (each is several draw calls; from outside they are behind walls or patterned glass).
  for (const { bounds, parts } of interiors) { const inside = bounds.distanceToPoint(camera.position) < 1.5; for (const p of parts) p.visible = inside; }
}

// Snapshots (portfolio/tools/snapshots.mjs drives this over the DevTools protocol): the story's frames, shot from the
// real scene at the story's own camera poses, each with a depth image for the snapshot page's 3D parallax.
let snapshotting = false;
const snapshot = (() => {
  let size = null, depthMaterial = null, faded = null;
  // Outdoors the trees appear only as they cross the screen (owner, 2026-10-19, after Kage's foreground trees): a tree
  // fragment's opacity follows its distance from the centre of the frame, almost nothing over the building, whole at
  // the edges, so as the camera moves each tree sweeps in at the side instead of standing in front of the department.
  const treeFade = { value: 0 }, frameSize = { value: new THREE.Vector2(1, 1) };
  const fadeTrees = on => {
    if (!faded) {
      const mats = new Set();
      scene.traverse(o => { if (o.isBatchedMesh && /Batched trees/.test(o.name)) mats.add(o.material); if (/tree belt/i.test(o.name)) o.traverse(m => { if (m.material) mats.add(m.material); }); });
      faded = [...mats].map(m => [m, m.transparent]);
      for (const [m] of faded) {
        const before = m.onBeforeCompile, key = m.customProgramCacheKey;
        m.customProgramCacheKey = () => (key && key !== THREE.Material.prototype.customProgramCacheKey ? key.call(m) : '') + '|edge-fade';
        m.onBeforeCompile = (sh, r) => {
          before?.call(m, sh, r);
          Object.assign(sh.uniforms, { uTreeFade: treeFade, uFrame: frameSize });
          sh.fragmentShader = 'uniform float uTreeFade; uniform vec2 uFrame;\n' + sh.fragmentShader.replace('#include <opaque_fragment>', `#include <opaque_fragment>
            { vec2 q = gl_FragCoord.xy / uFrame - .5; q.x *= uFrame.x / uFrame.y;
              float d = length(q) / length(vec2(.5 * uFrame.x / uFrame.y, .5)); // 0 at the centre, 1 in a corner
              gl_FragColor.a *= mix(1., mix(.05, 1., smoothstep(.36, .8, d)), uTreeFade); }`);
        };
        m.needsUpdate = true;
      }
    }
    treeFade.value = on ? 1 : 0;
    for (const [m, t] of faded) if (m.transparent !== (on || t)) { m.transparent = on || t; m.needsUpdate = true; }
  };
  return {
    setup({ w, h }) {
      snapshotting = true; size = { w, h }; frameSize.value.set(w, h);
      renderer.setPixelRatio(1); renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
      controls.enabled = false;
      for (const o of portfolio.overlays()) o.visible = false;
      if (landscape) landscape.lodBias = 1;
      depthMaterial = new THREE.MeshDepthMaterial({ side: THREE.DoubleSide });
      depthMaterial.onBeforeCompile = sh => { sh.fragmentShader = sh.fragmentShader.replace('gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
        '// view depth, log-scaled from 0.3 m (white) to 300 m (black)\n\t\tgl_FragColor = vec4( vec3( 1.0 - clamp( log( max( vHighPrecisionZW[ 1 ], 0.3 ) / 0.3 ) / log( 1000.0 ), 0.0, 1.0 ) ), 1.0 );'); };
      return { aspect: w / h, riseLength: RISE_LENGTH / RISE_RATE };
    },
    plan: opts => portfolio.renderPlan(opts),
    // item: from plan(); returns [colour webp data URL, depth webp data URL at half size, or null]
    shoot(item, { quality = .8, shadows = false, moon = null, depth = false } = {}) {
      const t = item.fly < 1 ? item.fly * (RISE_LENGTH + .6 * RISE_RATE) : 1e6;
      rise.set(t); riseDust.set(t); riseDust.material.uniforms.uLight.value = 1 - .8 * sunlight.night;
      fadeTrees(!!item.outdoor);
      portfolio.poseFor(item, size.w / size.h);
      if (moon) { const m = scene.getObjectByName('Photographic phased moon'); if (m) { m.position.copy(camera.position).addScaledVector(new THREE.Vector3(...moon.dir).normalize(), 240); m.lookAt(camera.position); m.scale.setScalar(moon.scale ?? 1); m.renderOrder = -1; } } // before the trees: a faded tree's depth would otherwise cut the moon into fragments
      landscape.updateTreeDetail(camera); cullForCamera();
      if (shadows || item.fly < 1) renderer.shadowMap.needsUpdate = true;
      renderer.render(scene, camera);
      const colour = renderer.domElement.toDataURL('image/webp', quality);
      if (!depth) return [colour, null];
      // the depth image (the snapshot page's parallax): the faded trees are left out of it, so they do not warp
      const hidden = item.outdoor ? faded.flatMap(([m]) => { const out = []; scene.traverse(o => { if (o.material === m && o.visible) { o.visible = false; out.push(o); } }); return out; }) : [];
      const bg = scene.background, fog = scene.fog; scene.background = new THREE.Color(0); scene.fog = null; scene.overrideMaterial = depthMaterial;
      renderer.render(scene, camera);
      scene.overrideMaterial = null; scene.background = bg; scene.fog = fog; hidden.forEach(o => { o.visible = true; });
      const half = document.createElement('canvas'); half.width = size.w / 2; half.height = size.h / 2;
      half.getContext('2d').drawImage(renderer.domElement, 0, 0, half.width, half.height);
      return [colour, half.toDataURL('image/webp', .9)];
    },
  };
})();

function animate(now) {
  requestAnimationFrame(animate);
  if (snapshotting) return; // tools/snapshots.mjs owns the camera and the canvas
  const frameDuration = now - previous;
  const dt = Math.min(frameDuration / 1000, .06); previous = now;
  if (document.hidden || !ready) return;
  const modalOpen = !!document.querySelector('dialog[open]');
  if (modalOpen) return;
  panoramaLook.update(Math.min(frameDuration / 1000, .1));
  if (portfolio?.active) {
    if (portfolio.update(Math.min(frameDuration / 1000, .1), { light: 1 - .8 * sunlight.night })) needsRender = true;
  } else if (avatar?.active) {
    avatar.update(Math.min(frameDuration / 1000, .1)); needsRender = true;
    if (frames % 6 === 0) $('#avatar-readout').textContent = avatar.text().replace(/^Avatar: /, '');
    // The panel steps out of the way while walking, turning or looking, and returns once the guide stands still.
    const i = avatar.input; if (i.forward || i.strafe || i.turn || dragging) avatarMovedAt = now;
    $('#avatar-panel').classList.toggle('quiet', now - avatarMovedAt < 1200);
  } else if (entranceWalk?.active) {
    entranceWalk.update(Math.min(frameDuration / 1000, .1));
  } else if (transition) {
    const raw = THREE.MathUtils.clamp((now - transition.start) / transition.duration, 0, 1), t = raw * raw * raw * (raw * (raw * 6 - 15) + 10);
    camera.position.lerpVectors(transition.from, transition.to, t); controls.target.lerpVectors(transition.fromTarget, transition.toTarget, t);
    if (raw >= 1) transition = null;
    needsRender = true;
  } else if (journey) {
    // A queued RAF timestamp can precede a click handler on a busy device.
    const elapsed = Math.max(0, now - journeyStart), t = (elapsed / 56000) % 1;
    const eye = tourCurve.getPoint(t), look = lookCurve.getPoint(t);
    if (small()) eye.sub(look).multiplyScalar(1.45).add(look);
    const blend = THREE.MathUtils.smoothstep(elapsed, 0, 2200);
    camera.position.lerpVectors(tourFrom, eye, blend); controls.target.lerpVectors(tourLookFrom, look, blend);
    const chapter = t < .23 ? 0 : t < .36 ? 1 : t < .62 ? 2 : t < .9 ? 3 : 0;
    if (chapter !== selected) updateChapter(chapter);
    $('#journey-track span').style.transform = `scaleX(${t})`; needsRender = true;
  } else if (drift && !interactive && !isOrbiting && !reduced) {
    const base = new THREE.Vector3(...cameraFor(selected)); const look = new THREE.Vector3(...chapters[selected].target);
    const theta = Math.sin(now * .00007) * .014;
    base.sub(look).applyAxisAngle(new THREE.Vector3(0, 1, 0), theta).add(look);
    camera.position.lerp(base, 1 - Math.exp(-dt * 1.5)); needsRender = true;
  }
  if (liveClock && now - lastClockSync > 15000) { lastClockSync = now; setHour(localHour(), { manual: false }); updateMoon(); }
  if (Date.now() - moonState.updatedAt > 30000) updateMoon();
  if (riseStart && !rise.done) { // the building rising: every frame, with its shadows
    // the rise's own clock steps by the frame time, capped: one long stall (a first draw) pauses it rather than skipping
    // it, as the story's timeline does (portfolio.js); ordinary slow frames keep wall time
    riseClock += Math.min(frameDuration / 1000, .5) * RISE_RATE;
    const t = Math.max(-1, riseClock); rise.set(t); riseDust.set(t); riseDust.material.uniforms.uLight.value = 1 - .8 * sunlight.night;
    if (frames % 4 === 0) renderer.shadowMap.needsUpdate = true; needsRender = true; // shadows follow every fourth frame: redrawing the whole campus into the shadow map halved the frame rate
    if (rise.done) { renderer.shadowMap.needsUpdate = true; riseDust.set(1e6); }
  }
  if (Math.abs(hour - targetHour) > .005) { hour = THREE.MathUtils.damp(hour, targetHour, 4, dt); updateLighting(hour); }
  for (const d of architecture.doors) {
    const a = doorsOpen ? d.openAngle : 0;
    if (Math.abs(d.pivot.rotation.y - a) > .001) {
      d.pivot.rotation.y = reduced ? a : THREE.MathUtils.damp(d.pivot.rotation.y, a, 5, dt); needsRender = true;
      if (Math.abs(d.pivot.rotation.y - a) < .002) {
        renderer.shadowMap.needsUpdate = true;
        entranceLight.shadow.needsUpdate = true;
        architecture.interior.lights.forEach(light => { light.shadow.needsUpdate = true; });
      }
    }
  }
  // Orbit speed follows wall time, including slower devices; damping is for pointer input.
  if (!entranceWalk?.active && !panorama && !avatar?.active && !portfolio?.active) controls.update(Math.min(frameDuration / 1000, 1));
  const windSpeed = updateWind(landscape, weatherState, dt, reduced);
  hallFanSpeed += ((hallSwitch.fan ? 1 : 0) - hallFanSpeed) * Math.min(1, dt * (hallSwitch.fan ? .8 : .35)); // spins up, coasts down
  if (!reduced && hallFanSpeed > .002) architecture.interior.fan.rotation.y += hallFanSpeed * 12 * dt;
  if (!reduced && entranceWalk?.active) for (const fan of architecture.classroomFans) fan.rotation.y += dt * 4;
  rain.update(dt, weatherState, reduced, windSpeed);
  puddles?.update(dt, weatherState, reduced, scene.environmentIntensity);
  // Hall lights only while the camera is inside the entrance hall; elsewhere they cost every lit pixel for nothing.
  const inHall = entranceWalk?.active || Math.abs(camera.position.x) < 4.2 && camera.position.z > -7.2 && camera.position.z < 7.6 && camera.position.y < 4.4;
  const hallOn = inHall && hallSwitch.lights; // the wall tubes are lit only when switched on (and drawn only inside the hall)
  if (hallLit !== hallOn) { hallLit = hallOn; architecture.interior.lights.forEach(light => { light.intensity = hallOn ? light.userData.on : 0; light.shadow.needsUpdate = true; }); renderer.shadowMap.needsUpdate = true; needsRender = true; }
  if (weatherState.storm && !reduced) {
    nextStrike ||= now + 5000 + Math.random() * 15000;
    if (now > nextStrike) {
      // At most two short pulses per strike, well under three flashes a second.
      strike = { start: now, pulses: Math.random() < .5 ? [0] : [0, 160], power: .6 + Math.random() * .4 };
      sound.thunder(.8 + Math.random() * 3.5);
      nextStrike = now + 12000 + Math.random() * 28000;
    }
  } else nextStrike = 0;
  if (strike) {
    const t = now - strike.start, flash = strike.pulses.reduce((m, p) => t >= p && t < p + 110 ? Math.max(m, 1 - (t - p) / 110) : m, 0) * strike.power;
    lightning.intensity = flash * 3.5; scene.backgroundIntensity = skyBase + flash * .7;
    if (t > 400) { strike = null; lightning.intensity = 0; scene.backgroundIntensity = skyBase; }
    needsRender = true;
  }
  // Rain closes in the view: nearer, denser haze while it falls.
  const haze = 1 - .55 * rain.current;
  scene.fog.near = (small() ? 160 : 80) * haze; scene.fog.far = (small() ? 450 : 300) * (1 - .45 * rain.current);
  sound.setWeather(weatherState, isSheltered(camera.position.x, camera.position.y, camera.position.z), windSpeed);
  if (dispensers.length && frames % 15 === 0) { // compressor and pump hum, heard within a few metres
    const near = Math.min(...dispensers.map(d => d.centre.distanceTo(camera.position)));
    sound.machine(Math.max(0, 1 - near / 5) * (dispensers.some(d => d.pouring) ? 1.6 : 1));
  }
  sky.update(now / 1000, sunlight.night, weatherState, reduced);
  // Even pacing: draw every Nth display frame so motion advances in equal steps.
  // While a finger or mouse is dragging the view, draw every frame the display offers: input must track the hand.
  if ((needsRender || !reduced) && !(quality === 'auto' && !dragging && now - lastRendered < cadence * 1000 / 60 - 4)) {
    const interval = now - lastRendered;
    if (landscape) landscape.lodBias = portfolio?.flying ? 2.4 : 1; // coarser trees while the arrival flight sweeps round
    landscape.updateTreeDetail?.(camera);
    for (const d of dispensers) d.update(now, Math.min(interval / 1000, .1));
    for (const c of casements) if (c.update(camera, Math.min(interval / 1000, .1))) needsRender = true;
    for (const u of roomUpdates) if (u(Math.min(interval / 1000, .1))) needsRender = true;
    cullForCamera();
    renderer.render(scene, camera);
    portfolio?.afterRender(); // the story's live windows onto other rooms
    if (++frames % 60 === 0) drawPlan();
    if (quality === 'auto' && !reduced && frames > 12 && interval < 250) adaptResolution(interval, now);
    needsRender = false; lastRendered = now;
  }
}
// Anonymous visit log (functions/api/visit.js): one random ID per browser, one per tab session, a heartbeat while visible.
(() => {
  if (!/^https:/.test(location.protocol) || navigator.webdriver) return; // not from local development or automated tests
  const rid = () => crypto.randomUUID?.() || Math.random().toString(36).slice(2) + Date.now().toString(36);
  let device, visit;
  try { device = localStorage.getItem('visitor-id') || (localStorage.setItem('visitor-id', device = rid()), device); } catch { device = rid(); }
  try { visit = sessionStorage.getItem('visit-id') || (sessionStorage.setItem('visit-id', visit = rid()), visit); } catch { visit = rid(); }
  const send = () => fetch('/api/visit', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: JSON.stringify({
    d: device, v: visit, p: location.pathname, r: document.referrer ? new URL(document.referrer).host : '', s: `${screen.width}x${screen.height}`,
    l: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone }) }).catch(() => {});
  send(); setInterval(() => { if (!document.hidden) send(); }, 30000); // keeps 'online now' current on the dashboard
  addEventListener('pagehide', send);
})();
window.__portrait = { ready: false, scene, camera, footprint, sound, weather: weatherState, moon: moonState, refreshWeather: loadWeather, get rain() { return rain; }, get lightning() { return { light: lightning, strike, nextStrike }; }, get architecture() { return architecture; }, get entranceWalk() { return entranceWalk; }, get landscape() { return landscape; }, get surroundings() { return surroundings; }, get renderer() { return renderer; }, get controls() { return controls; }, get selected() { return selected; }, get journey() { return journey; }, get doorsOpen() { return doorsOpen; }, get hour() { return hour; }, get liveClock() { return liveClock; }, get lastRendered() { return lastRendered; }, get cadence() { return cadence; }, get avatar() { return avatar; }, get puddles() { return puddles; }, get rise() { return rise; }, get portfolio() { return portfolio; }, snapshot, get riseDust() { return riseDust; }, playRise() { riseStart = 1; riseClock = 0; rise.set(0); }, RISE_LENGTH, tuning: { setRatio: r => setRatio(r), setCadence: n => { cadence = n; } }, THREE };
boot().catch(e => { console.error(e); $('#loader').innerHTML = '<p>The scene could not load.</p><button class="primary-btn" onclick="location.reload()">Try again</button>'; });

let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3300); }
document.querySelectorAll('[data-chapter]').forEach(b => b.addEventListener('click', () => selectChapter(+b.dataset.chapter)));
$('#next').onclick = () => selectChapter((selected + 1) % chapters.length);
$('#explore').onclick = () => selectChapter(1);
function leaveHall(returnToEntrance = true) {
  entranceWalk.exit(); controls.enabled = true;
  camera.fov = 43; camera.updateProjectionMatrix();
  $('#experience').classList.remove('interior-view');
  $('#scene-mode').textContent = 'LIVE EXPLORATION';
  if (returnToEntrance) { selectChapter(1); $('#enter-hall').focus(); }
}
$('#enter-hall').onclick = () => { if (avatar?.active) leaveAvatar();
  if (!ready) return;
  stopJourney(); setOrbit(false); setPanorama(false); transition = null; interactive = true;
  $('#experience').classList.remove('footprint-view');
  doorsOpen = true; $('#door span').textContent = 'Close the doors'; $('#door').setAttribute('aria-pressed', 'true');
  architecture.doors.forEach(d => { d.pivot.rotation.y = d.openAngle; });
  renderer.shadowMap.needsUpdate = entranceLight.shadow.needsUpdate = true;
  architecture.interior.lights.forEach(light => { light.shadow.needsUpdate = true; });
  controls.enabled = false; camera.fov = 68; camera.updateProjectionMatrix();
  $('#experience').classList.add('interior-view'); $('#scene-mode').textContent = 'ENTRANCE HALL';
  entranceWalk.enter(); entranceWalk.update(0); needsRender = true;
};
$('.brand').onclick = e => { e.preventDefault(); selectChapter(0); };
$('#reset').onclick = () => { if (entranceWalk?.active) { entranceWalk.resetLook(); camera.fov = 68; camera.updateProjectionMatrix(); } else selectChapter(0); };
$('#film').onclick = startJourney;
$('#sound').onclick = async () => {
  $('#sound').disabled = true;
  try {
    await sound.setEnabled(!sound.enabled);
    updateSoundButton();
  } catch { toast('Ambient sound could not start. Please try again.'); }
  finally { $('#sound').disabled = false; }
};
$('#ambient-volume').oninput = e => {
  sound.setVolume(+e.target.value / 100); $('#volume-output').textContent = `${e.target.value}%`;
};
function syncSound() {
  sound.setMuted(document.hidden).catch(() => {});
}
document.addEventListener('visibilitychange', syncSound);
$('#orbit').onclick = () => { if (avatar?.active) leaveAvatar(); if (entranceWalk?.active) return; setPanorama(false); stopJourney(); transition = null; interactive = true; setOrbit(!isOrbiting); };
$('#panorama').onclick = () => { if (avatar?.active) leaveAvatar();
  if (entranceWalk?.active) {
    entranceWalk.exit();
    $('#experience').classList.remove('interior-view');
    $('#scene-mode').textContent = 'LIVE EXPLORATION';
    setPanorama(true);
    renderer.domElement.focus({ preventScroll: true });
    needsRender = true;
    return;
  }
  stopJourney(); transition = null; interactive = true; setOrbit(false);
  setPanorama(!panorama);
  if (panorama) {
    $('#experience').classList.remove('footprint-view');
    renderer.domElement.focus({ preventScroll: true });
    needsRender = true;
  }
};
for (const [id, factor] of [['zoom-in', .8], ['zoom-out', 1.25]]) $(`#${id}`).onclick = () => {
  if (!controls) return;
  if (entranceWalk?.active) { camera.fov = THREE.MathUtils.clamp(camera.fov * factor, 48, 90); camera.updateProjectionMatrix(); needsRender = true; return; }
  if (panorama) { panoramaLook.move(factor < 1 ? 1 : -1); return; }
  stopJourney(); interactive = true; setOrbit(false);
  const v = camera.position.clone().sub(controls.target); v.setLength(THREE.MathUtils.clamp(v.length() * factor, controls.minDistance, controls.maxDistance));
  fly(v.add(controls.target).toArray(), controls.target.toArray(), 600);
};
$('#plan').onclick = $('#mobile-plan').onclick = () => { if (avatar?.active) leaveAvatar(); setPanorama(false); stopJourney(); interactive = true; setOrbit(false); $('#experience').classList.add('footprint-view'); fly([0, small() ? 210 : 100, .1], [0, 0, 0]); };
$('#door').onclick = () => { doorsOpen = !doorsOpen; $('#door span').textContent = doorsOpen ? 'Close the doors' : 'Open the doors'; $('#door').setAttribute('aria-pressed', doorsOpen); };
$('#light').onclick = () => { const open = $('#light-panel').hidden; $('#light-panel').hidden = !open; $('#light').setAttribute('aria-expanded', open); };
$('#light-close').onclick = () => { $('#light-panel').hidden = true; $('#light').setAttribute('aria-expanded', false); $('#light').focus(); };
$('#hour').oninput = e => setHour(+e.target.value);
$('#live-clock').onchange = e => { liveClock = e.target.checked; if (liveClock) setHour(localHour(), { manual: false }); updateMoon(); };
document.querySelectorAll('[data-hour]').forEach(b => b.onclick = () => setHour(+b.dataset.hour));
$('#motion').onchange = e => { drift = e.target.checked; interactive = !drift; };
$('#quality').onchange = e => { quality = e.target.value; frameSamples.length = 0; resolutionCap = Infinity; cadence = cadenceFloor = 1; if (renderer) { setRatio(quality === 'high' ? Math.min(devicePixelRatio, 2) : quality === 'low' ? .9 : defaultPixelRatio()); needsRender = true; } };
$('#capture').onclick = () => { if (!renderer) return; renderer.render(scene, camera); renderer.domElement.toBlob(blob => { if (!blob) return toast('Could not save the photograph.'); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'instrument-technology.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Your campus photograph is ready.'); }); };
$('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else goFullscreen(); } catch { toast('Full screen is unavailable in this browser.'); } };
document.addEventListener('fullscreenchange', () => { $('#fullscreen').innerHTML = icon(document.fullscreenElement ? 'minimize' : 'maximize'); $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Full screen'); refreshIcons(); });
window.addEventListener('resize', resize);
renderer?.domElement.addEventListener('keydown', e => {
  if (entranceWalk?.active || avatar?.active || portfolio?.active) return;
  if (['+', '=', '-', 'Home', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) e.preventDefault();
  if (e.key === '+' || e.key === '=') $('#zoom-in').click();
  if (e.key === '-') $('#zoom-out').click();
  if (e.key === 'Home') selectChapter(0);
  if (!panorama && e.key.startsWith('Arrow')) {
    stopJourney(); transition = null; setOrbit(false); interactive = true;
    const s = new THREE.Spherical().setFromVector3(camera.position.clone().sub(controls.target));
    if (e.key === 'ArrowLeft') s.theta -= .09; if (e.key === 'ArrowRight') s.theta += .09;
    if (e.key === 'ArrowUp') s.phi -= .07; if (e.key === 'ArrowDown') s.phi += .07;
    s.phi = THREE.MathUtils.clamp(s.phi, controls.minPolarAngle, controls.maxPolarAngle);
    camera.position.setFromSpherical(s).add(controls.target); needsRender = true;
  }
});
renderer?.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; toast('The graphics context was interrupted. Recovering...'); });
renderer?.domElement.addEventListener('webglcontextrestored', () => location.reload());

$('#about').onclick = () => { stopJourney(); $('#about-dialog').showModal(); };
$('#to-story').onclick = () => showStory();
document.querySelectorAll('.close-dialog').forEach(b => b.onclick = () => b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target !== d) return; const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); });
  d.addEventListener('close', () => { needsRender = true; });
});

// Walk as a person: a guide figure the visitor steers to show exactly where a photo was taken.
async function enterAvatar() {
  if (!ready || !avatar) return;
  if (entranceWalk?.active) leaveHall(false);
  stopJourney(); setOrbit(false); setPanorama(false); transition = null; interactive = true; controls.enabled = false;
  doorsOpen = true; $('#door span').textContent = 'Close the doors'; $('#door').setAttribute('aria-pressed', 'true'); // so the guide can walk in
  camera.fov = 60; camera.updateProjectionMatrix();
  $('#experience').classList.add('avatar-view'); $('#experience').classList.remove('footprint-view');
  $('#avatar-panel').hidden = false; $('#avatar-mode').setAttribute('aria-pressed', 'true');
  $('#avatar-readout').textContent = 'Preparing the guide…';
  try { await avatar.enter(); renderer.domElement.focus({ preventScroll: true }); }
  catch (e) { console.error(e); toast('The guide could not load. Please try again.'); leaveAvatar(); }
}
function leaveAvatar() {
  avatar?.exit(); controls.enabled = true; camera.fov = 43; camera.updateProjectionMatrix();
  $('#experience').classList.remove('avatar-view'); $('#avatar-panel').hidden = true; $('#avatar-mode').setAttribute('aria-pressed', 'false');
}
$('#avatar-mode').onclick = () => avatar?.active ? (leaveAvatar(), selectChapter(1)) : enterAvatar();
$('#avatar-exit').onclick = () => { leaveAvatar(); selectChapter(1); };
$('#avatar-eye').onclick = () => { const on = !avatar.state.eye; avatar.setEye(on); $('#avatar-eye').setAttribute('aria-pressed', on); $('#avatar-eye span').textContent = on ? 'Follow view' : 'Eye view'; camera.fov = on ? 68 : 60; camera.updateProjectionMatrix(); };
$('#avatar-copy').onclick = async () => {
  const text = avatar.text();
  try { await navigator.clipboard.writeText(text); toast('Position copied. Paste it into our chat.'); }
  catch { $('#avatar-readout').textContent = text; getSelection().selectAllChildren($('#avatar-readout')); toast('Select and copy the highlighted text.'); }
};
// Phone controls: hold an arrow to walk or turn.
document.querySelectorAll('[data-move]').forEach(b => {
  const set = on => { const k = b.dataset.move; if (k === 'forward') avatar.input.forward = on ? 1 : 0; if (k === 'back') avatar.input.forward = on ? -1 : 0; if (k === 'left') avatar.input.turn = on ? 1 : 0; if (k === 'right') avatar.input.turn = on ? -1 : 0; };
  b.addEventListener('pointerdown', e => { e.preventDefault(); b.setPointerCapture?.(e.pointerId); set(true); });
  for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(type, () => set(false));
});
