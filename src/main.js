import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { HDRLoader } from 'three/addons/loaders/HDRLoader.js';
import { createIcons, ArrowUpRight, ArrowLeft, ArrowRight, Play, Pause, X, Plus, Minus, RotateCcw, Maximize, Minimize, Sun, Sunset, Moon, Camera, Images, MapPin, Aperture, DoorOpen, Info, Compass, ChevronDown, Check } from 'lucide';
import { buildArchitecture, buildLandscape } from './architecture.js';
import { footprint } from './footprint.js';
import { Map as MapIcon, Volume2, VolumeX, Move } from 'lucide';
import { createAmbience } from './ambience.js';
import { createRain, rainfall, windVector, isSheltered } from './weather-effects.js';
import { createEntranceWalk } from './entrance-walk.js';
import { createPanoramaLook } from './panorama-look.js';
import { createLiveSky, lunarState, solarState, campusDate, skyDirection } from './sky.js';
import './style.css';

const $ = s => document.querySelector(s);
const icon = name => `<i data-lucide="${name}"></i>`;
const icons = { Move, Volume2, VolumeX, Map: MapIcon, ArrowUpRight, ArrowLeft, ArrowRight, Play, Pause, X, Plus, Minus, RotateCcw, Maximize, Minimize, Sun, Sunset, Moon, Camera, Images, MapPin, Aperture, DoorOpen, Info, Compass, ChevronDown, Check };
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
      <nav aria-label="Main navigation"><button id="archive" class="nav-link">${icon('images')}<span>The archive</span><span class="count">15</span></button><button id="about" class="icon-btn" aria-label="About this portrait" data-tip="About this portrait">${icon('info')}</button><span class="nav-divider"></span><button id="film" class="film-btn">${icon('play')}<span>Play the journey</span></button></nav>
    </header>
    <div class="scene-meta"><span class="live-dot"></span><span id="scene-mode">LIVE EXPLORATION</span><span class="meta-line"></span><span id="time-label">16:30 / AFTERNOON</span><span class="meta-line weather-divider"></span><span id="weather-label" class="weather-live">SYNCING SKY</span></div>
    <div class="scene-number" aria-hidden="true"><span id="scene-number">01</span><small>/ 04</small></div>
    <section class="scene-heading"><p class="eyebrow" id="eyebrow">THE DEPARTMENT / NORTH CAMPUS</p><h1>${chapters[0].title}</h1><p class="scene-note">${icon('map-pin')}<span id="scene-note">${chapters[0].note}</span></p><div class="heading-actions"><button id="explore" class="primary-btn">Enter the courtyard ${icon('arrow-up-right')}</button><button id="original-film" class="text-btn">${icon('play')} Original film</button></div></section>
    <div class="scene-tools" aria-label="Scene tools">
      <button class="icon-btn" id="light" aria-label="Light and quality" aria-expanded="false" data-tip="Light & quality">${icon('sun')}</button>
      <button class="icon-btn" id="orbit" aria-label="Orbit building" aria-pressed="false" data-tip="Orbit building">${icon('compass')}</button>
      <button class="icon-btn" id="panorama" aria-label="Panorama exploration" aria-pressed="false" data-tip="Panorama exploration">${icon('move')}</button>
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
    <section id="walk-panel" class="walk-panel" hidden aria-label="Entrance walkthrough"><span id="walk-location">The threshold</span><div class="walk-controls"><button id="walk-back" class="icon-btn" aria-label="Previous entrance viewpoint" data-tip="Previous viewpoint">${icon('arrow-left')}</button><button id="walk-play" class="icon-btn" aria-label="Play entrance walkthrough" aria-pressed="false" data-tip="Play walkthrough"><span class="walk-play-icon">${icon('play')}</span><span class="walk-pause-icon" hidden>${icon('pause')}</span></button><input id="walk-progress" type="range" min="0" max="1000" value="0" aria-label="Position along the entrance walkthrough"/><button id="walk-forward" class="icon-btn" aria-label="Next entrance viewpoint" data-tip="Next viewpoint">${icon('arrow-right')}</button><button id="walk-exit" class="icon-btn" aria-label="Return to courtyard" data-tip="Return to courtyard">${icon('x')}</button></div></section>
    <button id="plan" class="plan" aria-label="View building from above" data-tip="Overhead view"><canvas width="220" height="120" aria-hidden="true"></canvas><span>NORTH CAMPUS ${icon('arrow-up-right')}</span></button>
    <footer class="chapter-bar"><div class="chapter-caption"><span>THE CAMPUS</span><small>Four perspectives. One place.</small></div><nav class="chapters" aria-label="Camera viewpoints">${chapters.map((c, i) => `<button data-chapter="${i}" class="chapter ${i === 0 ? 'active' : ''}" aria-pressed="${i === 0}"><span>0${i + 1}</span><strong>${c.name}</strong><span class="chapter-line"></span></button>`).join('')}</nav><button id="next" class="next-btn" aria-label="Next viewpoint">${icon('arrow-right')}</button></footer>
    <div id="journey-track" class="journey-track" hidden><span></span></div>
    <div id="loader" class="loader"><span class="loading-mark">IT</span><p>A place comes into focus.</p><span class="load-track"><span></span></span><small id="loading-status">Preparing the campus</small></div>
    <div id="toast" role="status" hidden></div>
  </main>
  <dialog id="archive-dialog" class="archive-dialog"><div class="dialog-top"><span class="eyebrow">FIELD NOTES / NORTH CAMPUS</span><button class="icon-btn close-dialog" aria-label="Close archive">${icon('x')}</button></div><div class="archive-heading"><h2>The original <em>perspectives.</em></h2><button id="archive-film" class="text-btn">${icon('play')} Watch the film</button></div><div class="photo-layout"><figure><img id="archive-image" alt=""/><figcaption><span id="photo-title"></span><span id="photo-index"></span></figcaption></figure><div class="photo-side"><div class="photo-thumbnails"></div><div class="photo-arrows"><button id="photo-prev" class="icon-btn" aria-label="Previous photo">${icon('arrow-left')}</button><span>FROM THE CAMPUS</span><button id="photo-next" class="icon-btn" aria-label="Next photo">${icon('arrow-right')}</button></div></div></div></dialog>
  <dialog id="video-dialog" class="video-dialog"><div class="dialog-top"><span class="eyebrow">THE CAMPUS / ORIGINAL FOOTAGE</span><button class="icon-btn close-dialog" aria-label="Close film">${icon('x')}</button></div><video controls playsinline preload="none" poster="/media/entrance.webp"><source src="/media/campus.mp4" type="video/mp4" /></video></dialog>
  <dialog id="about-dialog" class="about-dialog"><div class="dialog-top"><span class="eyebrow">ABOUT THE PORTRAIT</span><button class="icon-btn close-dialog" aria-label="Close about">${icon('x')}</button></div><h2>Built around<br><em>a real place.</em></h2><p>Department of Instrument Technology.<br>Andhra University, Visakhapatnam.</p><p>This independent architectural portrait is reconstructed from the supplied campus photographs, video, and footprint. The blue structural frame, open corridors, entrance, and different wing heights follow those references.</p><p>Geometry is constructed directly in Three.js. Dimensions, hidden elevations, planting, and materials are interpreted; this is not a measured survey or a photogrammetric scan.</p><a href="https://www.google.com/maps/search/?api=1&query=Andhra+University+Department+of+Instrument+Technology" target="_blank" rel="noopener" class="text-btn">Find the department ${icon('arrow-up-right')}</a><div class="credits">Original photographs & footage supplied by the project owner. Sky lighting: <a href="https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky" target="_blank" rel="noopener">Poly Haven / CC0</a>.</div></dialog>`;
$('#about').insertAdjacentHTML('afterend', `<button id="sound" class="icon-btn" aria-label="Mute ambient sound" aria-pressed="true" data-tip="Mute ambient sound">${icon('volume-2')}</button>`);
$('#walk-location').insertAdjacentHTML('beforebegin', '<select id="walk-route" aria-label="Interior route"><option value="hall">Central hall</option><option value="right">Ground-floor right wing</option><option value="seminar">Seminar Hall surrounds</option><option value="classroom">Upstairs classroom wing</option></select>');
$('#walk-route').insertAdjacentHTML('beforeend', '<option value="stairs">Stairs: ground to roof</option><option value="terraceLeft">Classroom-wing terrace</option><option value="upperCorridor">Second-floor right corridor</option><option value="terraceRight">Upper right terrace</option>');
$('#light-panel').insertAdjacentHTML('beforeend', '<label class="range-label" for="ambient-volume">Ambient volume <output id="volume-output">40%</output></label><input id="ambient-volume" type="range" min="0" max="100" value="40" step="1"/>');
$('#light-panel').insertAdjacentHTML('beforeend', '<label class="motion-row" for="live-clock">Live campus time<input id="live-clock" type="checkbox" checked /></label><p id="weather-detail" class="weather-detail" role="status">Fetching campus weather</p><p id="forecast" class="weather-detail"></p><a class="weather-source" href="https://open-meteo.com/" target="_blank" rel="noopener">Weather: Open-Meteo</a>');
$('#hour').min = 0; $('#hour').max = 23.99;
$('#weather-detail').insertAdjacentHTML('afterend', '<p id="moon-detail" class="weather-detail"></p>');
refreshIcons();
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
      document.removeEventListener('pointerdown', resumeDefaultSound, true);
      document.removeEventListener('keydown', resumeDefaultSound, true);
    }
  }).catch(() => {});
}
document.addEventListener('pointerdown', resumeDefaultSound, true);
document.addEventListener('keydown', resumeDefaultSound, true);

let renderer;
try {
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
} catch {
  $('#loader').innerHTML = '<p>This browser cannot start the 3D scene.</p><small>You can still explore the original photographs and film.</small><button id="fallback-archive" class="primary-btn">Open the archive</button>';
  $('#viewport').style.background = 'url(/media/entrance.webp) center/cover';
}
const scene = new THREE.Scene();
scene.background = new THREE.Color('#b6c5c9'); scene.fog = new THREE.Fog('#b6c5c9', 80, 300);
const camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, .15, 500);
let controls, architecture, landscape, entranceWalk, panoramaLook;
let selected = 0, transition = null, journey = false, journeyStart = 0, isOrbiting = false, doorsOpen = false, hour = 16.5, targetHour = 16.5;
let ready = false, drift = !reduced, quality = 'auto', needsRender = true, lastRendered = 0, lastShadowUpdate = 0;
let interactive = false;
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
const litWindows = [];
const warm = new THREE.MeshStandardMaterial({ color: '#f1d6a7', emissive: '#ffbd6a', emissiveIntensity: 0, transparent: true, opacity: 0, depthWrite: false });
for (const x of [-2, 2]) {
  const p = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.5), warm); p.position.set(x, 10.8, 7.02); scene.add(p); litWindows.push(p);
}
const defaultPixelRatio = () => Math.min(devicePixelRatio, small() ? 1.4 : 1.65);
const frameSamples = [];
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
  landscape.groundMaterial.roughness = THREE.MathUtils.lerp(.95, .58, wet);
  landscape.soilMaterial.roughness = THREE.MathUtils.lerp(.95, .58, wet);
  landscape.pavingMaterial.roughness = THREE.MathUtils.lerp(.95, .25, wet);
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
  const evening = sunlight.night;
  const golden = 1 - THREE.MathUtils.smoothstep(sunlight.altitude, 0, 25);
  const wet = weatherState.rainFactor;
  sun.position.copy(skyDirection(sunlight.altitude, sunlight.azimuth)).multiplyScalar(80);
  sun.color.set('#fff4dc').lerp(new THREE.Color('#ffd0a2'), golden);
  sun.intensity = 3.6 * THREE.MathUtils.smoothstep(sunlight.altitude, -.833, 12) * (1 - weatherState.cloudCover / 100 * .75);
  ambient.intensity = THREE.MathUtils.lerp(.7, .5, evening) * THREE.MathUtils.lerp(1, .9, wet);
  scene.environmentIntensity = THREE.MathUtils.lerp(.42, .2, evening);
  scene.backgroundIntensity = THREE.MathUtils.lerp(.95, .13, evening);
  scene.fog.color.set('#b6c5c9').lerp(new THREE.Color('#182336'), evening).lerp(new THREE.Color('#64757b'), wet * .22);
  if (scene.background?.isColor) scene.background.copy(scene.fog.color);
  entranceLight.intensity = evening * 40;
  warm.opacity = evening * .6; warm.emissiveIntensity = evening * 1.4;
  if (architecture) for (const material of [architecture.materials.glass, architecture.materials.rearGlass]) material.envMapIntensity = THREE.MathUtils.lerp(1.4, .22, evening);
  if (renderer) {
    renderer.toneMappingExposure = THREE.MathUtils.lerp(.94, .8, evening);
    if (performance.now() - lastShadowUpdate > 200 || !ready) { renderer.shadowMap.needsUpdate = true; lastShadowUpdate = performance.now(); }
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
  if (!interactive && !journey && !entranceWalk?.active) { camera.position.fromArray(cameraFor(selected)); controls.target.fromArray(chapters[selected].target); transition = null; }
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
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.shadowMap.autoUpdate = false; renderer.shadowMap.needsUpdate = true;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = .94;
  renderer.domElement.tabIndex = 0; renderer.domElement.setAttribute('aria-label', 'Interactive building. Arrow keys rotate, plus and minus zoom, Home returns to arrival.');
  $('#viewport').append(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .055;
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
  architecture = buildArchitecture(scene);
  $('#loading-status').textContent = 'Finding the light';
  await new Promise(resolve => requestAnimationFrame(resolve));
  landscape = buildLandscape(scene);
  setHour(localHour(), { manual: false });
  hour = targetHour;
  updateMoon();
  sky.update(0, sunlight.night, weatherState, reduced);
  updateWetMaterials();
  try {
    const hdr = await new HDRLoader().loadAsync('/media/sky.hdr'); hdr.mapping = THREE.EquirectangularReflectionMapping;
    const pmrem = new THREE.PMREMGenerator(renderer); const env = pmrem.fromEquirectangular(hdr);
    scene.environment = env.texture; scene.background = hdr; scene.backgroundBlurriness = .02; scene.backgroundRotation.y = 1.9; scene.environmentRotation.y = 1.9;
    pmrem.dispose();
  } catch { console.warn('Sky map unavailable. Using daylight fallback.'); }
  updateLighting(hour);
  $('#loading-status').textContent = 'Reflecting the courtyards';
  const probe = new THREE.WebGLCubeRenderTarget(128, { type: THREE.HalfFloatType });
  const probeCamera = new THREE.CubeCamera(.2, 180, probe);
  const reflectionFilter = new THREE.PMREMGenerator(renderer);
  const glass = [architecture.materials.glass, architecture.materials.rearGlass];
  glass.forEach(material => { material.visible = false; });
  try {
    for (const [i, z] of [20, -9].entries()) {
      probeCamera.position.set(0, 6, z); probeCamera.update(renderer, scene);
      glass[i].envMap = reflectionFilter.fromCubemap(probe.texture).texture;
      glass[i].needsUpdate = true;
    }
  } finally {
    glass.forEach(material => { material.visible = true; });
    probe.dispose(); reflectionFilter.dispose();
  }
  const defaultAudio = sound.setEnabled(true);
  updateSoundButton();
  defaultAudio.then(updateSoundButton).catch(updateSoundButton);
  setInterval(() => { if (!document.hidden) loadWeather(); }, 5 * 60000);
  document.addEventListener('visibilitychange', () => { if (!document.hidden && Date.now() - weatherState.updatedAt > 5 * 60000) loadWeather(); });
  ready = true; window.__portrait.ready = true;
  renderer.render(scene, camera); $('#loader').classList.add('loaded'); setTimeout(() => $('#loader').hidden = true, reduced ? 0 : 700);
  loadWeather();
  drawPlan(); resize(); requestAnimationFrame(animate);
}
let previous = performance.now(), frames = 0;
function animate(now) {
  requestAnimationFrame(animate);
  const frameDuration = now - previous;
  const dt = Math.min(frameDuration / 1000, .06); previous = now;
  if (document.hidden || !ready) return;
  const modalOpen = !!document.querySelector('dialog[open]');
  if (modalOpen) return;
  if (entranceWalk?.active) {
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
  if (!entranceWalk?.active && !panorama) controls.update(Math.min(frameDuration / 1000, 1));
  if (!reduced) landscape.wind.value += dt;
  const gust = (.5 + .5 * Math.sin(landscape.wind.value * .47)) ** 4;
  const windSpeed = weatherState.windSpeed + ((weatherState.windGusts || weatherState.windSpeed) - weatherState.windSpeed) * gust;
  landscape.windStrength.value = THREE.MathUtils.damp(landscape.windStrength.value, reduced ? 0 : Math.min(1.5, (windSpeed / 35) ** 1.5), 2, dt);
  landscape.windDirection.value.copy(windVector(1, weatherState.windDirection)).normalize();
  if (!reduced && entranceWalk?.active) architecture.interior.fan.rotation.y += dt * 3;
  rain.update(dt, weatherState, reduced);
  sound.setWeather(weatherState, isSheltered(camera.position.x, camera.position.y, camera.position.z), windSpeed);
  sky.update(now / 1000, sunlight.night, weatherState, reduced);
  if (needsRender || !reduced) {
    renderer.render(scene, camera);
    if (++frames % 60 === 0) drawPlan();
    if (quality === 'auto' && !reduced && frames > 90) {
      frameSamples.push(frameDuration); if (frameSamples.length > 90) frameSamples.shift();
      if (frameSamples.length === 90 && frames % 90 === 0 && frameSamples.reduce((a, b) => a + b, 0) / 90 > 25 && renderer.getPixelRatio() > .85) renderer.setPixelRatio(Math.max(.85, renderer.getPixelRatio() - .2));
    }
    needsRender = false; lastRendered = now;
  }
}
window.__portrait = { ready: false, scene, camera, footprint, sound, weather: weatherState, moon: moonState, refreshWeather: loadWeather, get rain() { return rain; }, get architecture() { return architecture; }, get entranceWalk() { return entranceWalk; }, get landscape() { return landscape; }, get renderer() { return renderer; }, get controls() { return controls; }, get selected() { return selected; }, get journey() { return journey; }, get doorsOpen() { return doorsOpen; }, get hour() { return hour; }, get liveClock() { return liveClock; }, get lastRendered() { return lastRendered; } };
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
$('#enter-hall').onclick = () => {
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
  sound.setMuted(document.hidden || $('#video-dialog').open).catch(() => {});
}
document.addEventListener('visibilitychange', syncSound);
$('#orbit').onclick = () => { if (entranceWalk?.active) return; setPanorama(false); stopJourney(); transition = null; interactive = true; setOrbit(!isOrbiting); };
$('#panorama').onclick = () => {
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
$('#plan').onclick = $('#mobile-plan').onclick = () => { setPanorama(false); stopJourney(); interactive = true; setOrbit(false); $('#experience').classList.add('footprint-view'); fly([0, small() ? 210 : 100, .1], [0, 0, 0]); };
$('#door').onclick = () => { doorsOpen = !doorsOpen; $('#door span').textContent = doorsOpen ? 'Close the doors' : 'Open the doors'; $('#door').setAttribute('aria-pressed', doorsOpen); };
$('#light').onclick = () => { const open = $('#light-panel').hidden; $('#light-panel').hidden = !open; $('#light').setAttribute('aria-expanded', open); };
$('#light-close').onclick = () => { $('#light-panel').hidden = true; $('#light').setAttribute('aria-expanded', false); $('#light').focus(); };
$('#hour').oninput = e => setHour(+e.target.value);
$('#live-clock').onchange = e => { liveClock = e.target.checked; if (liveClock) setHour(localHour(), { manual: false }); updateMoon(); };
document.querySelectorAll('[data-hour]').forEach(b => b.onclick = () => setHour(+b.dataset.hour));
$('#motion').onchange = e => { drift = e.target.checked; interactive = !drift; };
$('#quality').onchange = e => { quality = e.target.value; frameSamples.length = 0; if (renderer) { renderer.setPixelRatio(quality === 'high' ? Math.min(devicePixelRatio, 2) : quality === 'low' ? .9 : defaultPixelRatio()); needsRender = true; } };
$('#capture').onclick = () => { if (!renderer) return; renderer.render(scene, camera); renderer.domElement.toBlob(blob => { if (!blob) return toast('Could not save the photograph.'); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'instrument-technology.png'; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); toast('Your campus photograph is ready.'); }); };
$('#fullscreen').onclick = async () => { try { if (document.fullscreenElement) await document.exitFullscreen(); else await $('#experience').requestFullscreen(); } catch { toast('Full screen is unavailable in this browser.'); } };
document.addEventListener('fullscreenchange', () => { $('#fullscreen').innerHTML = icon(document.fullscreenElement ? 'minimize' : 'maximize'); $('#fullscreen').setAttribute('aria-label', document.fullscreenElement ? 'Exit full screen' : 'Full screen'); refreshIcons(); });
window.addEventListener('resize', resize);
renderer?.domElement.addEventListener('keydown', e => {
  if (entranceWalk?.active) return;
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

let photos = [], photoIndex = 0;
function showPhoto(index) {
  if (!photos.length) return;
  photoIndex = (index + photos.length) % photos.length;
  $('#archive-image').src = photos[photoIndex].src; $('#archive-image').alt = photos[photoIndex].title;
  $('#photo-title').textContent = photos[photoIndex].title;
  $('#photo-index').textContent = `${String(photoIndex + 1).padStart(2, '0')} / ${photos.length}`;
  document.querySelectorAll('[data-photo]').forEach(b => { b.classList.toggle('selected', +b.dataset.photo === photoIndex); b.setAttribute('aria-pressed', +b.dataset.photo === photoIndex); });
}
async function openArchive() {
  if (!photos.length) {
    try { const r = await fetch('/media/photos.json'); if (!r.ok) throw new Error('Archive unavailable'); photos = await r.json(); }
    catch { return toast('The archive could not load. Please try again.'); }
    $('.photo-thumbnails').innerHTML = photos.map((p, i) => `<button data-photo="${i}" aria-label="${p.title}"><img src="${p.src}" alt="" loading="lazy" /></button>`).join('');
    document.querySelectorAll('[data-photo]').forEach(b => b.onclick = () => showPhoto(+b.dataset.photo));
  }
  stopJourney(); showPhoto(photoIndex); $('#archive-dialog').showModal();
}
function openVideo() { stopJourney(); $('#archive-dialog').close(); $('#video-dialog').showModal(); syncSound(); $('video').play().catch(() => {}); }
$('#archive').onclick = openArchive;
if ($('#fallback-archive')) $('#fallback-archive').onclick = openArchive;
$('#original-film').onclick = openVideo; $('#archive-film').onclick = openVideo;
$('#photo-prev').onclick = () => showPhoto(photoIndex - 1); $('#photo-next').onclick = () => showPhoto(photoIndex + 1);
$('#archive-dialog').addEventListener('keydown', e => { if (e.key === 'ArrowLeft') showPhoto(photoIndex - 1); if (e.key === 'ArrowRight') showPhoto(photoIndex + 1); });
$('#about').onclick = () => { stopJourney(); $('#about-dialog').showModal(); };
document.querySelectorAll('.close-dialog').forEach(b => b.onclick = () => b.closest('dialog').close());
document.querySelectorAll('dialog').forEach(d => {
  d.addEventListener('click', e => { if (e.target !== d) return; const r = d.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) d.close(); });
  d.addEventListener('close', () => { if (d.id === 'video-dialog') { $('video').pause(); syncSound(); } needsRender = true; });
});
