import * as T from 'three';
import { groundSpine, seminarPassage as passage } from './footprint.js';
import { classroom } from './classroom-wing.js';
import { stairs, stairFlights } from './stair-layout.js';

const stops = [
  { at: 0, z: 12.3, yaw: 0, name: 'The threshold' },
  { at: .24, z: 5.8, yaw: 0, name: 'Entrance hall' },
  { at: .47, z: 2.6, yaw: 0, name: 'The twin stairways' },
  { at: .7, z: -.8, yaw: 0, name: 'The central recess' },
  { at: .83, z: -2.3, yaw: 0, name: 'The central recess' },
  { at: 1, z: .9, yaw: Math.PI, name: 'Looking toward the entrance' },
];
const rightWing = [
  stops[0],
  { at: .18, x: 0, z: 4.0, yaw: 0, name: 'Entrance hall' },
  { at: .32, x: 3.65, z: groundSpine.corridorCenter, yaw: Math.PI / 2, name: 'Right-wing gate' },
  { at: .36, x: 3.8, z: groundSpine.corridorCenter, yaw: Math.PI / 2, name: 'Right-wing steps' },
  { at: .43, x: 4.7, y: groundSpine.rightFloor + 1.666, z: groundSpine.corridorCenter, yaw: Math.PI / 2, name: 'Right-wing corridor' },
  { at: .68, x: 12, y: groundSpine.rightFloor + 1.666, z: groundSpine.corridorCenter, yaw: Math.PI / 2, name: 'Right-wing corridor' },
  { at: .84, x: passage.x, y: groundSpine.rightFloor + 1.666, z: groundSpine.corridorCenter, yaw: Math.PI / 2, name: 'Seminar Hall main entrance' },
  { at: .94, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.hallDoorZ, yaw: Math.PI / 2, name: 'Seminar Hall side entrance' },
  { at: 1, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.hallDoorZ, yaw: 0, name: 'Strong Room passage' },
];
const seminarSurrounds = [
  { at: 0, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.hallDoorZ, yaw: Math.PI / 2, name: 'Seminar Hall entrance' },
  { at: .22, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.hallDoorZ, yaw: 0, name: 'Strong Room passage' },
  { at: .42, x: passage.x, y: groundSpine.rightFloor + 1.666, z: -.8, yaw: 0, name: 'Side passage' },
  { at: .70, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.end + 1.4, yaw: 0, name: 'Strong Room approach' },
  { at: .82, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.end + 1.4, yaw: Math.PI, name: 'Looking back toward the grille' },
  { at: .90, x: passage.x, y: groundSpine.rightFloor + 1.666, z: groundSpine.corridorCenter, yaw: Math.PI, name: 'Front corridor junction' },
  { at: 1, x: passage.x, y: groundSpine.rightFloor + 1.666, z: passage.labEnd - 1.7, yaw: Math.PI, name: 'Electronics Lab II' },
];
// The classroom route is a direct entry; the stair route connects every landing.
const classroomRoute = [
  { at: 0, x: -2.4, y: classroom.landing + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Upstairs classroom-wing entrance' },
  { at: .10, x: -4.6, y: classroom.floor + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Classroom wing' },
  { at: .42, x: -16, y: classroom.floor + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Classroom corridor' },
  { at: .52, x: -20.7, y: classroom.floor + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Classroom passage steps' },
  { at: .60, x: -22, y: classroom.lowerFloor + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Class Room III approach' },
  { at: .70, x: -23.15, y: classroom.lowerFloor + 1.65, z: classroom.originZ, yaw: -Math.PI / 2, name: 'Class Room III' },
  { at: .76, x: -23.15, y: classroom.lowerFloor + 1.65, z: classroom.originZ, yaw: 0, name: 'Classroom side passage' },
  { at: 1, x: -23.15, y: classroom.lowerFloor + 1.65, z: -6.6, yaw: 0, name: 'Classroom side-passage end' },
];

function walkingRoute(points) {
  let distance = 0;
  const result = points.map(([x, floor, z, yaw, name], i) => {
    if (i) distance += Math.hypot(x - points[i - 1][0], floor - points[i - 1][1], z - points[i - 1][2]) + (yaw !== points[i - 1][3] ? .5 : 0);
    return { x, y: floor + 1.65, z, yaw, name, at: distance };
  });
  return result.map(p => ({ ...p, at: p.at / distance }));
}
const stairPoints = [[2.67, stairs.ground, 2.1, 0, 'Ground-floor stair approach']];
stairFlights.forEach((f, i) => {
  stairPoints.push(
    [2.67, f.base, stairs.front, 0, `${i + 1}: Side flight`],
    [2.67, f.half, stairs.rear, 0, 'Rear landing'],
    [2.67, f.half, stairs.landingZ, -Math.PI / 2, 'Rear landing'],
    [0, f.half, stairs.landingZ, -Math.PI, 'Central return flight'],
    [0, f.half, stairs.rear, -Math.PI, 'Central return flight'],
    [0, f.top, stairs.returnEnd, -Math.PI, i === 2 ? 'Blue roof-access door' : `${i + 1}: Front landing`],
    [0, f.top, 2.166667, i === 0 ? -2.1 : -Math.PI, i === 0 ? 'Library and classroom wing' : i === 1 ? 'Second-floor terrace landing' : 'Upper terrace'],
  );
  if (i < 2) stairPoints.push([2.67, f.top, 2.166667, 0, 'Next stair flight']);
});
export const stairRoute = walkingRoute(stairPoints);
const leftTerraceRoute = walkingRoute([
  [0, stairs.second, 2.166667, -Math.PI / 2, 'Second-floor landing'],
  [-4.3, stairs.second, 2.166667, -Math.PI / 2, 'Terrace grille gate'],
  [-6.6, stairs.second, 1.6, -Math.PI / 2, 'Corrugated canopy'],
  [-14, stairs.second, 1.6, -Math.PI / 2, 'Classroom-wing roof'],
  [-20.9, stairs.second, 1.9, -Math.PI / 2, 'Lower terrace steps'],
  [-22.3, 8.11, 1.9, -Math.PI / 2, 'Open terrace'],
  [-28, 8.11, 1.9, 0, 'Open terrace'],
  [-28, 8.11, -11.8, Math.PI, 'Looking back across the classroom roof'],
]);
const rightTerraceRoute = walkingRoute([
  [0, stairs.top, 1.0, Math.PI / 2, 'Roof-access doorway'],
  [2.9, stairs.top, 2.166667, Math.PI / 2, 'Upper terrace steps'],
  [3.99, stairs.top, 2.166667, Math.PI / 2, 'Upper terrace steps'],
  [5.3, 12.11, 2.166667, Math.PI / 2, 'Upper right terrace'],
  [12, 12.11, 1.3, Math.PI / 2, 'White water tanks'],
  [21, 12.11, 1.3, Math.PI / 2, 'Empty tank plinth'],
  [25, 12.11, 1.3, 0, 'Main roof'],
  [25, 12.11, -11.8, Math.PI, 'Black water tank'],
  [25, 12.11, 12.8, -Math.PI / 2, 'Far roof parapet'],
]);
const upperCorridorRoute = walkingRoute([
  [0, stairs.second, 2.166667, Math.PI / 2, 'Second-floor landing'],
  [4, stairs.second, 2.166667, Math.PI / 2, 'Three corridor steps'],
  [4.9, 8.704, 2.166667, Math.PI / 2, 'Upper right corridor'],
  [20.3, 8.704, 2.166667, Math.PI / 2, 'Upper corridor end'],
]);

export function createEntranceWalk(camera, canvas, onExit, onChange) {
  let active = false, playing = false, progress = 0, yaw = 0, pitch = 0, pointer = null;
  let route = stops;
  const panel = document.querySelector('#walk-panel'), slider = document.querySelector('#walk-progress');
  const play = document.querySelector('#walk-play');
  function sync() {
    panel.hidden = !active;
    slider.value = Math.round(progress * 1000);
    const current = route.findLast(stop => progress >= stop.at) || route[0];
    document.querySelector('#walk-location').textContent = current.name;
    slider.setAttribute('aria-valuetext', current.name);
    play.setAttribute('aria-pressed', playing);
    play.setAttribute('aria-label', playing ? 'Pause entrance walkthrough' : 'Play entrance walkthrough');
    play.dataset.tip = playing ? 'Pause walkthrough' : 'Play walkthrough';
    play.querySelector('.walk-play-icon').hidden = playing;
    play.querySelector('.walk-pause-icon').hidden = !playing;
    document.querySelector('#walk-back').disabled = progress === 0;
    document.querySelector('#walk-forward').disabled = progress === 1;
    onChange();
  }
  function seek(value) {
    progress = T.MathUtils.clamp(value, 0, 1); playing = false; sync();
  }
  function step(direction) {
    const stop = direction > 0 ? route.find(s => s.at > progress + .002) : route.findLast(s => s.at < progress - .002);
    seek(stop?.at ?? (direction > 0 ? 1 : 0));
  }
  slider.addEventListener('input', () => seek(Number(slider.value) / 1000));
  document.querySelector('#walk-route').addEventListener('change', e => { route = { hall: stops, right: rightWing, seminar: seminarSurrounds, classroom: classroomRoute, stairs: stairRoute, terraceLeft: leftTerraceRoute, terraceRight: rightTerraceRoute, upperCorridor: upperCorridorRoute }[e.target.value] || stops; yaw = pitch = 0; seek(0); });
  play.onclick = () => { if (progress === 1) progress = 0; playing = !playing; sync(); };
  document.querySelector('#walk-back').onclick = () => step(-1);
  document.querySelector('#walk-forward').onclick = () => step(1);
  document.querySelector('#walk-exit').onclick = onExit;
  canvas.addEventListener('pointerdown', e => {
    if (!active || pointer) return;
    pointer = { id: e.pointerId, x: e.clientX, y: e.clientY }; canvas.setPointerCapture(e.pointerId);
    playing = false; sync();
  });
  canvas.addEventListener('pointermove', e => {
    if (!active || pointer?.id !== e.pointerId) return;
    // Follow the pointer, matching the exterior's perceived turn direction.
    const sensitivity = Math.PI / Math.max(1, canvas.clientHeight || 800);
    yaw += (e.clientX - pointer.x) * sensitivity;
    pitch = T.MathUtils.clamp(pitch - (e.clientY - pointer.y) * sensitivity, -1.25, 1.25);
    pointer.x = e.clientX; pointer.y = e.clientY; onChange();
  });
  const release = e => { if (pointer?.id === e.pointerId) pointer = null; };
  canvas.addEventListener('pointerup', release); canvas.addEventListener('pointercancel', release);
  canvas.addEventListener('lostpointercapture', release);
  canvas.addEventListener('wheel', e => {
    if (!active) return;
    e.preventDefault(); seek(progress + Math.sign(e.deltaY) * .012);
  }, { passive: false });
  canvas.addEventListener('keydown', e => {
    if (!active) return;
    if (e.key === 'ArrowUp' || e.key.toLowerCase() === 'w') { e.preventDefault(); seek(progress + .015); }
    if (e.key === 'ArrowDown' || e.key.toLowerCase() === 's') { e.preventDefault(); seek(progress - .015); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); yaw -= .1; onChange(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); yaw += .1; onChange(); }
  });
  document.addEventListener('keydown', e => { if (active && e.key === 'Escape' && !document.querySelector('dialog[open]')) onExit(); });
  return {
    get active() { return active; }, get progress() { return progress; }, get playing() { return playing; },
    enter() { active = true; playing = false; progress = 0; yaw = pitch = 0; route = stops; document.querySelector('#walk-route').value = 'hall'; sync(); canvas.focus({ preventScroll: true }); },
    exit() { active = playing = false; pointer = null; sync(); },
    resetLook() { yaw = pitch = 0; onChange(); },
    update(dt) {
      if (!active) return;
      if (playing) { progress = Math.min(1, progress + dt / 36); if (progress === 1) playing = false; sync(); }
      const next = route.findIndex(stop => stop.at > progress), b = route[next < 0 ? route.length - 1 : next];
      const a = route[Math.max(0, (next < 0 ? route.length - 1 : next) - 1)];
      const raw = T.MathUtils.clamp((progress - a.at) / (b.at - a.at), 0, 1), t = raw * raw * (3 - 2 * raw);
      const turn = Math.atan2(Math.sin(b.yaw - a.yaw), Math.cos(b.yaw - a.yaw));
      const angle = a.yaw + turn * t + yaw;
      camera.position.set(T.MathUtils.lerp(a.x || 0, b.x || 0, t), T.MathUtils.lerp(a.y || 1.83, b.y || 1.83, t), T.MathUtils.lerp(a.z, b.z, t));
      camera.lookAt(camera.position.x + Math.sin(angle) * Math.cos(pitch), camera.position.y + Math.sin(pitch), camera.position.z - Math.cos(angle) * Math.cos(pitch));
    },
  };
}
