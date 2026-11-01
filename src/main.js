import * as THREE from 'three';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { buildArchitecture, buildEntranceApron } from './architecture.js';
import { loadBlenderEnvironment, prefetchEnvironment } from './blender-environment.js';
import { buildSurroundings, placeFacadeTrees } from './surroundings.js';
import { makeSwitchboard } from './roomlights.js';
import { mergeStaticDetail, mergeGateParts, mergeByMaterialName, mergeStatic, resolveCoplanar } from './batching.js';
import { footprint } from './footprint.js';
import { createAmbience } from './ambience.js';
import { createRain, rainfall, updateWind, isSheltered } from './weather-effects.js';
import { createPuddles } from './puddles.js';
import { campusMonth, leafLitter } from './seasons.js';
import { regradeGround, rectangularAprons } from './regrade.js';
import { createLiveSky, lunarState, solarState, campusDate, skyDirection } from './sky.js';
import { pieces } from './merge-pieces.js';
import { createRise, createRiseDust, RISE_LENGTH, RISE_RATE } from './rise.js';
import { createPortfolio } from './portfolio.js';
import { loader3d } from './loader3d.js';
import './style.css';
// The reflection captures draw with the screen's own programs (capture() below): a second, linear set of every shader
// cost ~29 s of compiling on the owner's GPU (2026-11-01). A negative exposure skips the tone mapping and the sRGB
// encoding, so a capture stores the same linear light the render-target programs did; the screen is unchanged.
THREE.ShaderChunk.tonemapping_fragment = THREE.ShaderChunk.tonemapping_fragment.replace('gl_FragColor.rgb = toneMapping', 'if ( toneMappingExposure >= 0.0 ) gl_FragColor.rgb = toneMapping');
THREE.ShaderChunk.colorspace_fragment = '#ifdef TONE_MAPPING\nif ( toneMappingExposure >= 0.0 )\n#endif\n' + THREE.ShaderChunk.colorspace_fragment;

if (new URLSearchParams(location.search).has('debug')) document.documentElement.classList.add('debug'); // the guide's position readout (style.css)
const $ = s => document.querySelector(s);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
if ('scrollRestoration' in history) history.scrollRestoration = 'manual'; // the story decides where the page starts (arrival)
// The loading screen (loader3d.js), already on the page and moving: each stage of the build names itself on it
const loading = loader3d({ reduced });
// In the marks' real order, each naming the step that starts there; it only moves forward (E2E 2026-11-01: it went back).
{ const stages = [['architecture-built', 'Growing the landscape'], ['env-trees-placed', 'Planting the trees'], ['surroundings-built', 'Setting the light'],
    ['lighting-set', 'Compiling the light'], ['textures-uploaded', 'Raising the walls'], ['models-uploaded', 'Finishing the light'], ['shaders-compiled', 'Opening the doors']];
  let reached = -1; // read at each paint (an observer's callback waited for an idle main thread: the late stages never showed)
  window.__stageNow = () => { for (let i = stages.length - 1; i > reached; i--) if (performance.getEntriesByName(stages[i][0]).length) { reached = i; loading.status(stages[i][1]); break; } }; }
const small = () => innerWidth < 700;
// The four viewpoints the distant tree belt keeps clear (surroundings.js): the old campus views, kept so the belt stands
// exactly where it did.
const chapters = [{ eye: [42, 18, 80], target: [0, 13, 0] }, { eye: [5, 6.3, 31], target: [0, 6, 6] }, { eye: [4, 7.5, 31], target: [22, 6.5, 8] }, { eye: [-5, 6, 4.8], target: [-22, 4.7, 9.125] }];
$('#app').innerHTML = `
  <main id="experience" aria-label="Instrument Technology campus">
    <div id="viewport"></div><div class="shade" aria-hidden="true"></div>
    <div id="loader" class="loader"><span class="loading-mark">IT</span><p>Raising the department</p><span class="load-track"><span></span></span><small id="loading-status">Preparing the campus</small><button id="begin" class="begin-btn" hidden>Enter</button><small class="begin-note">Opens in full screen.</small></div>
    <div id="toast" role="status" hidden></div>
  </main>`;
const sound = createAmbience();
function updateSoundButton() {
  const active = sound.enabled;
  const b = $('#sound'); if (!b) return; // in the story's header (portfolio.js)
  b.setAttribute('aria-pressed', active); b.setAttribute('aria-label', active ? 'Mute ambient sound' : 'Unmute ambient sound');
  b.textContent = active ? 'Sound on' : 'Sound off';
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
  if (p < 1) loading.status('Downloading the department');
}) : null;
environmentDownload?.catch(() => {}); // handled where it is awaited
const skyDownload = renderer ? new HDRLoader().loadAsync('/media/sky.hdr') : null;
skyDownload?.catch(() => {});
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b6c5c9'); scene.fog = new THREE.Fog('#b6c5c9', 80, 300);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .15, 500);
let architecture, landscape, surroundings;
let doorsOpen = false, hour = 16.5, targetHour = 16.5;
const hallSwitch = { lights: true, fan: true, porch: true }; // entrance hall switch box: wall tubes, fan, porch tube
let ready = false, needsRender = true, lastRendered = 0, lastShadowUpdate = 0, dragging = 0;
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
entranceLight.shadow.autoUpdate = false; // its map is redrawn only when something it sees moves (doors) or once the building stands: every 4th frame it was 6 views of the campus, lit or not (re-test 2026-11-01)
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
  sky.phase(state); needsRender = true;
}

const rain = createRain(scene, camera);
let puddles;


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
    updateWetMaterials(); updateLighting(hour);
  } catch {
    weatherState.stale = true;
    if (!weatherState.loaded) weatherState.summary = 'WEATHER UNAVAILABLE';
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
function setHour(h, { manual = true } = {}) {
  if (manual) liveClock = false;
  targetHour = h;
  if (reduced) hour = h;
  updateLighting(hour); updateMoon();
}

function resize() {
  if (!renderer) return;
  camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight);
  scene.fog.near = small() ? 160 : 80; scene.fog.far = small() ? 450 : 300;
  needsRender = true;
}
// After the next frame has painted (a task queued from the frame callback runs once that frame is done).
const painted = () => { window.__stageNow(); return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve))); };
async function boot() {
  if (!renderer) return;
  await loading.shown(); // the loading screen's motion handed to the compositor before the build holds the main thread
  // the campus's own sound, on by default (owner, 2026-10-27: "sound on by default as earlier"); quieter or off in the
  // settings. Made first: its noise buffers took 15 ms alone but ~15 s next to the GPU's shader compiles (2026-11-01 profile).
  sound.setEnabled(true).then(updateSoundButton).catch(updateSoundButton); updateSoundButton();
  renderer.setPixelRatio(defaultPixelRatio()); renderer.setSize(innerWidth, innerHeight);
  { const pointers = new Set(), canvas = renderer.domElement, up = e => { pointers.delete(e.pointerId); dragging = pointers.size; };
    canvas.addEventListener('pointerdown', e => { pointers.add(e.pointerId); dragging = pointers.size; });
    for (const type of ['pointerup', 'pointercancel']) addEventListener(type, up); addEventListener('blur', () => { pointers.clear(); dragging = 0; }); }
  renderer.debug.checkShaderErrors = false; // its info-log reads are a GPU round trip per program; the shaders are fixed
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
  renderer.domElement.setAttribute('aria-hidden', 'true'); // the story's copy carries the content; the view is its picture
  $('#viewport').append(renderer.domElement);
  // The story over the live campus is the site (owner, 2026-11-01: the walk is removed for now; the model is unchanged).
  // Automated runs skip the Enter gate and the rise unless they ask for it (__playRise).
  const automated = navigator.webdriver || window.__autoBegin || /[?&]auto\b/.test(location.search);
  if (automated && !window.__playRise) window.__noRise = true;
  document.body.append($('#loader')); // above every layer: #experience is fixed (its own stacking context), the story sits over it
  portfolio = createPortfolio({ scene, camera, renderer, reduced: reduced || !!window.__noRise, changed: () => { needsRender = true; } });
  $('#sound').onclick = async () => { $('#sound').disabled = true; try { await sound.setEnabled(!sound.enabled); } catch { toast('Ambient sound could not start. Please try again.'); } finally { $('#sound').disabled = false; updateSoundButton(); } };
  updateSoundButton();
  // No gate (owner, 2026-10-19: the site ships as an app, so no full-screen request): the story shows at once, its hero
  // over the night while the campus is built, and the building rises as soon as it is ready.
  if (!automated) { entered = true; portfolio.wait(); $('#loader').hidden = true; }
  $('#loading-status').textContent = 'Reconstructing the architecture'; loading.status('Reconstructing the architecture');
  await painted(); // the loader's status is painted before the build holds the thread
  pieces.tagging = true; // every merged wall, slab and pane keeps its own centre, for the rise (rise.js)
  architecture = buildArchitecture(scene);
  architecture.mergedDrawCalls = mergeStaticDetail(architecture.group); // ~400 fewer draw calls
  pieces.tagging = false;
  westFittings = architecture.group.getObjectByName('West wing fittings');
  dispensers = architecture.group.getObjectByName('West wing ground floor (video-built)')?.userData.dispensers || []; // they pour on their own clock (props); the walk started them
  // The hall's switch box on the east wall (entrance photos): wall tubes, ceiling fan, porch tube light.
  makeSwitchboard(architecture.interior.group, { name: 'Entrance hall', position: [3.675, 1.281, 6.568], turn: -Math.PI / 2, toggles: [
    { what: 'lights', get: () => hallSwitch.lights, set: on => { hallSwitch.lights = on; architecture.interior.tubes.emissiveIntensity = on ? 1.7 : .05; } },
    { what: 'fan', get: () => hallSwitch.fan, set: on => { hallSwitch.fan = on; } },
    { what: 'porch light', get: () => hallSwitch.porch, set: on => { hallSwitch.porch = on; architecture.materials.porchTube.emissiveIntensity = on ? 2 : .05; updateLighting(hour); } }] });
  architecture.group.traverse(o => { if (o.userData.casements) casements.push(o.userData.casements); // windows that open
    if (o.userData.clickables) clickables.push(...o.userData.clickables); if (o.userData.update) roomUpdates.push(o.userData.update); if (o.userData.interior) interiors.push(o.userData.interior); }); // switches, fans, room lights
  // Small building parts (signs, latches, fans, props): bounds once; skipped while they would cover under ~8 pixels.
  architecture.group.updateMatrixWorld(true);
  architecture.group.traverse(o => { if (!o.isMesh || o.isInstancedMesh || !o.visible) return; o.geometry.computeBoundingSphere(); const s = o.geometry.boundingSphere.clone().applyMatrix4(o.matrixWorld); if (s.radius < 1.2) smallParts.push([o, s]); });
  resolveCoplanar(architecture.group); // no flicker where two surfaces share a plane
  architecture.interior.lights.forEach(light => { light.userData.on = light.intensity; light.intensity = 0; }); // lit inside the hall only
  $('#loading-status').textContent = 'Finding the light';
  await painted();
  $('#loading-status').textContent = 'Growing the Blender landscape';
  performance.mark('architecture-built');
  const reflectionFilter = new THREE.PMREMGenerator(renderer);
  try {
    const hdr = await skyDownload; hdr.mapping = THREE.EquirectangularReflectionMapping;
    const env = reflectionFilter.fromEquirectangular(hdr);
    // the background from the same filtered sky: a blurred background is drawn from a filtered map, and handing three the
    // raw one had it filter it inside the first frame, which then built 19 programs over again (17-55 s on the owner's GPU)
    scene.environment = env.texture; scene.background = env.texture; scene.backgroundBlurriness = .02; scene.backgroundRotation.y = 1.9; scene.environmentRotation.y = 1.9;
  } catch { console.warn('Sky map unavailable. Using daylight fallback.'); }
  reflectionFilter.dispose();
  performance.mark('sky-ready');
  rise = createRise(); rise.attach(architecture.group); rise.attach(litWindowGroup); rise.set(-1); // patched before any shader compiles: no stall later
  landscape = await loadBlenderEnvironment(scene, group => { rectangularAprons(group); regradeGround(group); placeFacadeTrees(group); }, environmentDownload);
  const breathe = painted; // let the page paint between stages
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
  await landscape.batchTrees(); // after the impostor belt captured the individual trees (their detail levels were made meanwhile, in a worker)
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
  // Every model's buffers go to the GPU while it compiles: three uploads them on an object's first draw, which cost ~3.8 s
  // inside the first frame (2026-11-01 profile). Stand-ins share each geometry under one plain program, queued first,
  // and draw nothing (no colour, no depth).
  const uploads = new THREE.Scene(), unseen = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false, depthTest: false }), geometries = new Set();
  scene.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine) && o.geometry?.attributes.position && !geometries.has(o.geometry)) {
    geometries.add(o.geometry); const m = new THREE.Mesh(o.geometry, unseen); m.frustumCulled = false; uploads.add(m); } });
  const uploadsCompiled = renderer.compileAsync(uploads.children[0] || uploads, camera, uploads); // one program serves them all
  // the shadow passes' programs and the screen's, compiled together (one after the other cost ~16 s; E2E report H2)
  const shadowsCompiled = compileShadowShaders();
  setInterval(() => { if (!document.hidden) loadWeather(); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - weatherState.updatedAt > 5 * 60000) loadWeather(); });
  performance.mark('reflections-captured');
  const compiled = Promise.all([shadowsCompiled, renderer.compileAsync(scene, camera), portfolio.compile()]);
  // Upload every texture now: three uploads a texture the first time its object is drawn, so turning the view in the
  // panorama stalled ~0.1 s whenever something new came into sight (measured mid-drag on the owner's laptop). Done while
  // the GPU compiles (its threads, not this one): it ran ~3 s after the compile before.
  { const seen = new Set(); scene.traverse(o => { for (const m of [o.material].flat()) if (m) for (const v of Object.values(m)) if (v?.isTexture && !v.isRenderTargetTexture && !seen.has(v)) { seen.add(v); renderer.initTexture(v); } }); }
  performance.mark('textures-uploaded');
  await uploadsCompiled;
  { const clear = renderer.autoClear, shadows = renderer.shadowMap.needsUpdate; renderer.autoClear = false; renderer.shadowMap.needsUpdate = false;
    try { renderer.render(uploads, camera); } finally { renderer.autoClear = clear; renderer.shadowMap.needsUpdate = shadows; unseen.dispose(); } }
  performance.mark('models-uploaded');
  // Each program is finished (its uniforms read) as soon as the GPU reports it compiled, while the rest still compile:
  // three does this on a program's first draw, one after another, which held the first frame ~12 s (2026-11-01).
  { let done = false; compiled.then(() => { done = true; }, () => { done = true; });
    const gl = renderer.getContext(), parallel = gl.getExtension('KHR_parallel_shader_compile'), finished = new Set();
    const finish = all => { for (const p of renderer.info.programs) if (!finished.has(p) && (all || !parallel || gl.getProgramParameter(p.program, parallel.COMPLETION_STATUS_KHR))) { finished.add(p); p.getUniforms(); } };
    while (!done) { finish(false); window.__stageNow(); await new Promise(r => setTimeout(r, 16)); }
    await compiled; finish(true); }
  performance.mark('shaders-compiled');
  if (!reduced && !window.__noRise) { landscape.lodBias = 2.4; portfolio.warm(() => { landscape.updateTreeDetail(camera); renderer.shadowMap.needsUpdate = true; staticShadows(); renderer.render(scene, camera); }); }
  ready = true; window.__portrait.ready = true; readyAt = performance.now();
  portfolio.show();
  renderer.render(scene, camera);
  // One tap to begin (owner, 2026-10-18: full screen by default). Browsers only allow full screen, and sound, from a
  // tap, click or key, so the loader ends on an Enter button; that one gesture goes full screen, starts the ambience
  // and starts the building rising. Automated runs (and our test scripts) skip it.
  if (automated || entered) begin(false); // in already: the building rises now (or the campus opens)
  else { $('#loader').classList.add('gate'); $('#loading-status').textContent = ''; const go = $('#begin'); go.hidden = false; go.focus({ preventScroll: true }); go.onclick = () => begin(true); }
  loadWeather();
  resize(); requestAnimationFrame(animate);
}
// Shadow-map shaders are only built when shadows first render, synchronously (~6 s here). Compile them ahead, in
// parallel: give each shadow caster the exact material three's shadow pass will use, then restore it.
// The shadow passes' programs, for everything under root. compile() creates the programs synchronously and only their
// readiness is waited for, so the shadow materials are swapped back at once: the scene is never left in its shadow dress
// while other work runs.
// The lights whose maps are drawn once (the porch and the hall lights), drawn with the building standing: the warm-up
// runs before the rise, and maps drawn underground were redrawn on entering the hall. One shadow pass, then the rise
// goes back where it was.
function staticShadows() {
  const t = rise.time; rise.set(1e6); entranceLight.shadow.needsUpdate = true; architecture.interior.lights.forEach(l => { l.shadow.needsUpdate = true; });
  renderer.shadowMap.needsUpdate = true; renderer.render(scene, camera); rise.set(t); // behind the loader, never shown
}
function compileShadowShaders(root = scene) {
  const kinds = new Set();
  scene.traverse(o => { if (o.isLight && o.castShadow) kinds.add(o.isPointLight ? 'distance' : 'depth'); });
  const flip = { [THREE.FrontSide]: THREE.BackSide, [THREE.BackSide]: THREE.FrontSide, [THREE.DoubleSide]: THREE.DoubleSide };
  const plain = { depth: new THREE.MeshDepthMaterial(), distance: new THREE.MeshDistanceMaterial() };
  const pending = [], target = new THREE.WebGLRenderTarget(1, 1);
  for (const kind of kinds) {
    const swapped = [];
    root.traverseVisible(o => {
      if (!o.isMesh || !o.castShadow || Array.isArray(o.material) || !o.material.visible) return;
      const m = o.material, custom = kind === 'distance' ? o.customDistanceMaterial : o.customDepthMaterial;
      const shadow = custom || plain[kind].clone(); // clones keep each caster's settings; programs are shared by key
      Object.assign(shadow, { side: m.shadowSide ?? flip[m.side], alphaMap: m.alphaMap, alphaTest: m.alphaToCoverage ? .5 : m.alphaTest, map: m.map, displacementMap: m.displacementMap, displacementScale: m.displacementScale });
      swapped.push([o, m]); o.material = shadow;
    });
    // compile() walks every object, hidden ones too: the rest go without a material for the call, or their screen
    // materials would compile a linear set for this target (44 programs, ~29 s on the owner's GPU)
    const casters = new Set(swapped.map(([o]) => o)), blank = [];
    root.traverse(o => { if ((o.isMesh || o.isPoints || o.isLine || o.isSprite) && o.material && !casters.has(o)) { blank.push([o, o.material]); o.material = null; } });
    const fog = scene.fog; scene.fog = null; // the shadow pass renders without the scene, so without fog
    // and into its map: a render target bound, so the programs are its own (linear, untonemapped). Compiled for the
    // screen, all 19 were built again inside the first frame (17-55 s on the owner's GPU).
    const previous = renderer.getRenderTarget(); renderer.setRenderTarget(target);
    try { pending.push(renderer.compileAsync(root, camera, scene)); }
    finally { renderer.setRenderTarget(previous); scene.fog = fog; for (const [o, m] of [...swapped, ...blank]) o.material = m; }
  }
  return Promise.all(pending).finally(() => target.dispose());
}
let previous = performance.now(), frames = 0, hallLit = false, hallFanSpeed = 1;
let rise, riseDust, riseStart = 0, riseClock = 0; // the arrival: the building rising out of the land; its own clock
let portfolio = null, entered = false; // the story layer (portfolio.js), shown first; entered: Enter pressed during the load
function goFullscreen() { // the whole page, so the story scrolls in full screen too; iPhone Safari has no API for it
  const el = document.documentElement, ask = el.requestFullscreen || el.webkitRequestFullscreen;
  if (!document.fullscreenElement && ask) try { const r = ask.call(el, { navigationUI: 'hide' }); r?.catch?.(() => {}); } catch {}
}
function openDoors() { doorsOpen = true; }
function begin(gesture) {
  performance.mark('begin');
  if (gesture) { goFullscreen(); resumeDefaultSound(); }
  if (reduced || window.__noRise) { rise.set(1e6); riseDust.set(1e6); renderer.shadowMap.needsUpdate = entranceLight.shadow.needsUpdate = true; architecture.interior.lights.forEach(l => { l.shadow.needsUpdate = true; }); } else { riseStart = 1; riseClock = -.75 * RISE_RATE; } // the arrival, once the loader has faded
  // the story walks in through the front doors
  openDoors(); portfolio.play(RISE_LENGTH / RISE_RATE, .75); arrival();
  loading.finish(); // the view flies into the views as the building starts to rise (the campus page: once it is open)
  $('#loader').classList.add('loaded'); setTimeout(() => $('#loader').hidden = true, reduced ? 0 : 700); needsRender = true;
}
// The arrival plays once a session (E2E report H1): not again on a reload, nor on Back to the story (which comes back
// to the same place, H3), nor on a link to a chapter (M1); any key, click, wheel or touch ends it, and the building
// stands at once.
function arrival() {
  const nav = performance.getEntriesByType('navigation')[0]?.type, saved = +(sessionStorage.getItem('storyY') || 0);
  // A refresh opens the story from its beginning (owner, 2026-10-27): its saved place and the chapter in its address
  // (which follows the reading) are both set aside. Back returns to the place; a chapter link opened afresh goes there.
  const returnY = nav === 'back_forward' ? saved : 0;
  if (nav === 'reload') { if (location.hash) history.replaceState(history.state, '', location.pathname + location.search); portfolio.lenis.scrollTo(0, { immediate: true, force: true }); }
  const hashIdx = nav !== 'reload' && location.hash.length > 1 ? portfolio.sectionIndex(decodeURIComponent(location.hash.slice(1))) : -1;
  const end = () => {
    if (!portfolio.introPlaying) return;
    portfolio.skipIntro(); rise.set(1e6); riseDust.set(1e6); renderer.shadowMap.needsUpdate = true; needsRender = true;
    if (returnY > 0 && hashIdx < 0) portfolio.jumpTo(returnY); else if (hashIdx > 0) portfolio.jumpTo(portfolio.scrollFor(hashIdx));
  };
  if (reduced || sessionStorage.getItem('introSeen') === '1' || returnY > 0 || hashIdx > 0) end();
  else for (const e of ['keydown', 'wheel', 'touchstart', 'pointerdown']) addEventListener(e, () => { if (portfolio.introPlaying) end(); }, { passive: true });
  sessionStorage.setItem('introSeen', '1');
}
addEventListener('pagehide', () => { if (portfolio?.active) sessionStorage.setItem('storyY', String(Math.round(portfolio.placeY()))); });
let westFittings = null, dispensers = [], casements = [], clickables = [], roomUpdates = [], interiors = []; const smallParts = []; const westBox = new THREE.Box3(new THREE.Vector3(-34, -1, -15), new THREE.Vector3(-21, 5, 15));
// What the camera can see: far small parts skipped, rooms' fittings only from inside (the loop's).
function cullForCamera() {
  if (westFittings) westFittings.visible = westBox.distanceToPoint(camera.position) < 30; // far away they are sub-pixel
  // Every draw call costs CPU and GPU-process time on ANGLE: ~170 tiny ones made every few frames late (p90 50 ms).
  for (const [o, s] of smallParts) o.visible = s.radius > .005 * s.center.distanceTo(camera.position);
  // A room's fans and switches are drawn only from inside it (each is several draw calls; from outside they are behind walls or patterned glass).
  for (const { bounds, parts } of interiors) { const inside = bounds.distanceToPoint(camera.position) < 1.5; for (const p of parts) p.visible = inside; }
}


function animate(now) {
  requestAnimationFrame(animate);
  const frameDuration = now - previous;
  const dt = Math.min(frameDuration / 1000, .06); previous = now;
  if (document.hidden || !ready) return;
  const modalOpen = !!document.querySelector('dialog[open]');
  if (modalOpen) return;
  if (portfolio?.active) {
    if (portfolio.update(Math.min(frameDuration / 1000, .1), { light: 1 - .8 * sunlight.night })) needsRender = true;
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
  const windSpeed = updateWind(landscape, weatherState, dt, reduced);
  hallFanSpeed += ((hallSwitch.fan ? 1 : 0) - hallFanSpeed) * Math.min(1, dt * (hallSwitch.fan ? .8 : .35)); // spins up, coasts down
  if (!reduced && hallFanSpeed > .002) architecture.interior.fan.rotation.y += hallFanSpeed * 12 * dt;
  rain.update(dt, weatherState, reduced, windSpeed);
  puddles?.update(dt, weatherState, reduced, scene.environmentIntensity);
  // Hall lights only while the camera is inside the entrance hall; elsewhere they cost every lit pixel for nothing.
  const inHall = Math.abs(camera.position.x) < 4.2 && camera.position.z > -7.2 && camera.position.z < 7.6 && camera.position.y < 4.4;
  const hallOn = inHall && hallSwitch.lights; // the wall tubes are lit only when switched on (and drawn only inside the hall)
  if (hallLit !== hallOn) { hallLit = hallOn; architecture.interior.lights.forEach(light => { light.intensity = hallOn ? light.userData.on : 0; }); needsRender = true; } // their maps don't change with the switch: redrawn here, entering the hall froze ~0.45 s
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
  if ((needsRender || !reduced) && !(!dragging && now - lastRendered < cadence * 1000 / 60 - 4)) {
    const interval = now - lastRendered;
    if (landscape) landscape.lodBias = portfolio?.flying ? 2.4 : 1; // coarser trees while the arrival flight sweeps round
    landscape.updateTreeDetail?.(camera);
    for (const d of dispensers) d.update(now, Math.min(interval / 1000, .1));
    for (const c of casements) if (c.update(camera, Math.min(interval / 1000, .1))) needsRender = true;
    for (const u of roomUpdates) if (u(Math.min(interval / 1000, .1))) needsRender = true;
    cullForCamera();
    renderer.render(scene, camera);
    portfolio?.afterRender(); // the story's live windows onto other rooms
    ++frames;
    if (!reduced && frames > 12 && interval < 250) adaptResolution(interval, now);
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
  const body = () => JSON.stringify({ d: device, v: visit, p: location.pathname, r: document.referrer ? new URL(document.referrer).host : '',
    s: `${screen.width}x${screen.height}`, l: navigator.language, tz: Intl.DateTimeFormat().resolvedOptions().timeZone });
  let fails = 0; // two failures in a row and the log stops for this visit (E2E 2026-11-01: a failing API was asked every 30 s)
  const send = () => fetch('/api/visit', { method: 'POST', keepalive: true, headers: { 'content-type': 'application/json' }, body: body() })
    .then(r => { fails = r.ok ? 0 : fails + 1; }, () => { fails++; });
  send();
  const beat = setInterval(() => { if (fails >= 2) clearInterval(beat); else if (!document.hidden) send(); }, 30000); // keeps 'online now' current on the dashboard
  addEventListener('pagehide', () => { if (fails < 2 && !navigator.sendBeacon?.('/api/visit', new Blob([body()], { type: 'application/json' }))) send(); });
})();
window.__portrait = { ready: false, scene, camera, footprint, sound, weather: weatherState, moon: moonState, refreshWeather: loadWeather, get rain() { return rain; }, get lightning() { return { light: lightning, strike, nextStrike }; }, get architecture() { return architecture; }, get landscape() { return landscape; }, get surroundings() { return surroundings; }, get renderer() { return renderer; }, get doorsOpen() { return doorsOpen; }, get hour() { return hour; }, get liveClock() { return liveClock; }, get lastRendered() { return lastRendered; }, get cadence() { return cadence; }, get puddles() { return puddles; }, get rise() { return rise; }, get portfolio() { return portfolio; }, get riseDust() { return riseDust; }, playRise() { riseStart = 1; riseClock = 0; rise.set(0); }, RISE_LENGTH, tuning: { setRatio: r => setRatio(r), setCadence: n => { cadence = n; } }, THREE };
boot().catch(e => { console.error(e); loading.finish(); $('#loader').innerHTML = '<p>The scene could not load.</p><button class="primary-btn" onclick="location.reload()">Try again</button>'; });

let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').hidden = false; clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').hidden = true, 3300); }
function syncSound() {
  sound.setMuted(document.hidden).catch(() => {});
}
document.addEventListener('visibilitychange', syncSound);
window.addEventListener('resize', resize);
renderer?.domElement.addEventListener('webglcontextlost', e => { e.preventDefault(); ready = false; toast('The graphics context was interrupted. Recovering...'); });
renderer?.domElement.addEventListener('webglcontextrestored', () => location.reload());

