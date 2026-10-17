import assert from 'node:assert/strict';
import * as T from 'three';
import { buildArchitecture } from '../src/architecture.js';
import { stairs, stairFlights, terraceCovers, terraceLevels } from '../src/stair-layout.js';
import { classroom, classroomPassage } from '../src/classroom-wing.js';
import { footprint } from '../src/footprint.js';

// Only texture painting is stubbed; rays inspect the complete production geometry.
const context = new Proxy({}, { get: (_, key) => key.startsWith('create') ? () => ({ addColorStop() {} }) : () => {} });
globalThis.document = {
  createElement: () => ({ getContext: () => context }),
  createElementNS: () => ({ addEventListener() {}, removeEventListener() {} }),
};
const scene = new T.Scene();
const { group, materials } = buildArchitecture(scene); scene.updateMatrixWorld(true);
const hits = (eye, direction, far = 10) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(group, true);
const wing = scene.getObjectByName('Upstairs classroom wing');
const wingHits = (eye, direction, far = 2) => hits(wing.localToWorld(new T.Vector3(...eye)).toArray(), new T.Vector3(...direction).transformDirection(wing.matrixWorld).toArray(), far);
const rise = classroom.stepRise;
assert.equal(wing.userData.mainDoorOffsets.length, 4, 'Main corridor retains four observed room fronts, distinct from the three classroom signs');
assert.ok(16.9 - wing.userData.mainDoorOffsets.at(-1) < 1, 'Last main-corridor front stays beside the junction steps');
assert.ok(!wingHits([.8, classroom.floor + .09, -16.2], [1, 0, 0], .4).some(h => h.object.material.name === 'Classroom veined stone tiles'), 'Skirting stops beside the doorway instead of covering its leaf');
const roomSigns = wing.getObjectsByProperty('isMesh', true).filter(o => o.name.startsWith('Door sign: CLASS ROOM'));
assert.deepEqual(roomSigns.map(o => o.name).sort(), ['II', 'III', 'IV'].map(n => `Door sign: CLASS ROOM - ${n}`), 'The three reference classroom doors are II, III and IV');
const plaque = wing.getObjectByName('Class III information plaque');
assert.ok(plaque?.material.map && plaque.position.x > .23, 'Reference plaque is on the wall to the right of Class III');
assert.ok(wing.getObjectByName('Door sign: CLASS ROOM - III').position.z < -20.5, 'Class III leaf opens into the room');
assert.equal(wingHits([-.35, classroom.lowerFloor + 1.2, -19.9], [0, 0, -1], 1.5).length, 0, 'Class III entrance is open through the wall');
for (const x of [-1, .27, .65, 1.04]) {
  const hit = wingHits([x, classroom.lowerFloor + 1, -19.9], [0, 0, -1], .5)[0];
  assert.equal(hit?.object.material.name, 'Weathered classroom plaster', 'Moving the Class III door leaves no openings in its side piers');
}
for (const height of [.15, 1, 1.8, 2.4]) {
  for (const z of [-19.8, -19.15, -18.6]) {
    const hit = wingHits([classroomPassage.end - 2.2, classroom.lowerFloor + height, z], [1, 0, 0], 3)[0];
    assert.equal(hit?.object.material.name, 'Weathered classroom plaster', 'No stored panel, false doorway or debris blocks the passage end');
    assert.ok(Math.abs(hit.distance - 2.12) < .001, 'The passage ends at its solid wall, not an invented room recess');
  }
}
assert.ok(Math.abs(rise - .18) < 1e-9, 'Both classroom flights match the user-confirmed ground-floor right-wing rise');
for (const [z, expected] of [[1, classroom.landing], [-.15, classroom.floor + 2 * rise], [-.45, classroom.floor + rise], [-1, classroom.floor], [-16.8, classroom.floor], [-17.08, classroom.lowerFloor + 2 * rise], [-17.44, classroom.lowerFloor + rise], [-18.5, classroom.lowerFloor]]) {
  for (const x of [-.82, 0, .86]) {
    const hit = wingHits([x, 4.8, z], [0, -1, 0])[0];
    assert.ok(hit && Math.abs(hit.point.y - expected) < .001, `Classroom floor/step at ${x}, ${z} is unobstructed and at ${expected}`);
  }
}
const west = footprint.find(part => part.type === 'west');
assert.equal(classroomPassage.end, 11, 'Owner-confirmed rear room retains the original corridor partition');
assert.ok(classroom.originZ - classroomPassage.end - (west.z - west.depth / 2) > 6, 'Small rear room remains between the partition and rear shell');
for (const x of [1.084, 1.086, 1.095, 2, 6, 10, 10.8]) {
  const hit = wingHits([x, 4.8, -19.15], [0, -1, 0])[0];
  assert.ok(hit && Math.abs(hit.point.y - classroom.lowerFloor) < .005, 'Side-passage floor has no legacy slab cutting across it');
}
const rearRoomFloor = wingHits([13, 5.7, -19.15], [0, -1, 0], 3)[0];
assert.ok(rearRoomFloor && Math.abs(rearRoomFloor.point.y - 4.03) < .005, 'The rear room retains its own upper slab, not an extension of the corridor');
assert.deepEqual(classroomPassage.grilles.filter(x => x < classroomPassage.doors[0]), [2.5, 4.6], 'Two Class III windows precede its plain side door');
for (const x of [2.5, 4.6]) {
  assert.equal(wingHits([x, classroom.lowerFloor + .5, -19.15], [0, 0, -1], 1.5)[0]?.object.material.name, 'Weathered classroom plaster', 'Solid sill replaces the false full-height doorway');
  assert.ok(wingHits([x + .035, classroom.lowerFloor + 1.66, -19.15], [0, 0, -1], 1.5).some(h => h.object.material.name === 'Classroom sliding glass'), 'Timber/grille window has real glazing into Class III');
}
assert.deepEqual(classroomPassage.grilles, [2.5, 4.6], 'No windows beside the Class IV door');
const room = scene.getObjectByName('Class Room III interior');
assert.equal(room.userData.deskCount, 24);
assert.equal(room.userData.benchLines.length, 4, 'Four lines of benches when viewed from the board');
assert.equal(room.userData.benchWidth, 1.55, 'Benches are narrower than the initial oversized layout');
assert.equal(room.getObjectsByProperty('name', 'Class III ceiling fan rotor').length, 9);
for (let x = .95; x <= 6.65; x += .1) {
  const hit = wingHits([x, classroom.lowerFloor + 1.65, -25.13], [0, -1, 0])[0];
  assert.ok(hit && Math.abs(hit.point.y - classroom.lowerFloor) < .005, 'Class III aisle is clear of desks and the legacy slab');
}
for (const z of [-20.25, -20.36, -20.5, -21.2]) {
  const hit = wingHits([-.35, classroom.lowerFloor + 1.65, z], [0, -1, 0])[0];
  assert.ok(hit && Math.abs(hit.point.y - classroom.lowerFloor) < .005, 'Class III doorway has a continuous level threshold');
}
for (const x of [-.92, -1.09, -1.23, -1.5, -2, -6, -11.6]) {
  const hit = wingHits([x, classroom.lowerFloor + .8, -19.15], [0, -1, 0])[0];
  assert.ok(hit && Math.abs(hit.point.y - classroom.lowerFloor) < .005, 'Class II threshold is level with the lower landing');
}
for (const y of [.05, .4, .9, 1.2, 2.1]) {
  assert.equal(wingHits([-.7, classroom.lowerFloor + y, -19.15], [-1, 0, 0], 1.6).length, 0, 'Class II open doorway is unobstructed from bottom to top');
}
const roomTwo = scene.getObjectByName('Class Room II interior');
assert.equal(roomTwo.userData.deskCount, 24);
assert.equal(roomTwo.userData.columns.length, 3, 'Class II has a separate pillar-lined entrance aisle');
assert.equal(roomTwo.getObjectsByProperty('name', 'Class II ceiling fan rotor').length, 9);
for (let x = -2.4; x >= -11.6; x -= .15) {
  assert.ok(Math.abs(wingHits([x, classroom.lowerFloor + 1.65, -19.15], [0, -1, 0])[0]?.point.y - classroom.lowerFloor) < .005, 'Class II aisle has no old slab through it');
}
for (const z of [-21.8, -23.5, -26, -28.5]) {
  assert.equal(wingHits([-1.5, classroom.lowerFloor + 1, z], [1, 0, 0], .5)[0]?.object.material.name, 'Weathered classroom plaster', 'Class II and III have no interconnecting doorway');
}
for (const x of [6, 7]) assert.ok(wingHits([x, classroom.lowerFloor + 1, -20.6], [0, 0, 1], .5).length, 'Class III side-door jambs have no gaps');
for (let z = -17.63; z > -20.1; z -= .025) {
  const hit = wingHits([0, classroom.lowerFloor + 1.65, z], [0, -1, 0])[0];
  assert.ok(hit && Math.abs(hit.point.y - classroom.lowerFloor) < .005, `No shell lintel crosses the lower junction at ${z}`);
}
for (const [z, bottom, top] of [[0, classroom.floor + 2 * rise, classroom.landing], [-.30, classroom.floor + rise, classroom.floor + 2 * rise], [-.60, classroom.floor, classroom.floor + rise], [-16.9, classroom.lowerFloor + 2 * rise, classroom.floor], [-17.26, classroom.lowerFloor + rise, classroom.lowerFloor + 2 * rise], [-17.62, classroom.lowerFloor, classroom.lowerFloor + rise]]) {
  for (const x of [-.82, 0, .86]) assert.ok(wingHits([x, (bottom + top) / 2, z - .025], [0, 0, 1], .05).length, `Closed classroom riser at ${z}`);
}
const opaque = found => found.filter(h => !h.object.material.transparent);
assert.ok(wingHits([0, 7.5, -16.8], [0, 0, -1], .3).some(h => h.object.material.name === 'Classroom ceiling plaster'), 'Ceiling transition has a closed vertical soffit');
assert.equal(wingHits([0, 3.9, -8], [-1, 0, 0], 1)[0]?.object.material.name, 'Weathered classroom plaster', 'Old exterior blue trim does not protrude through the corridor wall');
assert.equal(opaque(wingHits([0, classroom.floor + 1.82, -1.8 - 2.96 / 36], [-1, 0, 0], 1.4)).length, 0, 'Main screen hole really opens outdoors');
assert.ok(opaque(wingHits([0, classroom.floor + 1.82, -1.8], [-1, 0, 0], 1.4)).some(h => h.object.material.name === 'Pierced classroom concrete screens'), 'Concrete remains between the openings');
assert.equal(opaque(wingHits([classroomPassage.windows[1] + classroomPassage.windowWidth / 36, classroom.lowerFloor + 1.82, -19.15], [0, 0, 1], 1.4)).length, 0, 'Return-passage screen hole really opens outdoors');
for (const x of [1.2, 2, 3, 3.7]) {
  assert.equal(wingHits([x, classroom.lowerFloor + 1.82, -19.15], [0, 0, 1], 1.4)[0]?.object.material.name, 'Weathered classroom plaster', 'Plain wall precedes the first return window');
}
for (const z of [-18.05, -18.15, -18.25]) for (const height of [.3, 1.5, 2.8]) {
  assert.equal(wingHits([.8, classroom.lowerFloor + height, z], [1, 0, 0], .5)[0]?.object.material.name, 'Weathered classroom plaster', 'Corner wall joint is closed through its full height');
}
assert.ok(!scene.getObjectsByProperty('isMesh', true).some(o => o.material.name === 'Facade lattice seen through windows'), 'No glowing opaque lattice image remains');
for (const x of [-2.3, 2.3]) {
  const glassHits = (z, direction) => hits([x, 2.3, z], [0, 0, direction], 3).filter(hit => [materials.entranceReflectiveGlass, materials.entranceTintedGlass].includes(hit.object.material));
  assert.deepEqual(glassHits(9, -1).map(hit => hit.object.material), [materials.entranceReflectiveGlass], 'Outside sees only the reflective face');
  assert.deepEqual(glassHits(5, 1).map(hit => hit.object.material), [materials.entranceTintedGlass], 'Inside sees only the transparent tinted face');
}
assert.equal(materials.entranceReflectiveGlass.transparent, false);
assert.ok(materials.entranceReflectiveGlass.metalness > .5);
assert.ok(materials.entranceTintedGlass.transparent && materials.entranceTintedGlass.opacity < .3 && !materials.entranceTintedGlass.depthWrite);
assert.equal(materials.entranceGlazing.side, T.FrontSide, 'Side notice windows retain their existing glazing');
const terrace = scene.getObjectByName('Reference terraces and roof stair enclosure');
for (const tank of terrace.userData.tanks.filter(t => t.x < -16 && t.x > -20)) {
  for (const [x, z] of [[-19.5, -.9], [-16, -.9], [tank.x, -3.25]]) {
    const direction = new T.Vector3(x - tank.x, 0, z - tank.z).normalize();
    const wall = hits([tank.x, tank.y + .6, tank.z], direction.toArray(), 4)
      .find(hit => ['Weathered terrace plaster', materials.wall.name].includes(hit.object.material.name));
    assert.ok(wall && wall.distance > tank.radius + .12, 'Black tanks clear the concrete posts and rear parapet');
  }
}
const terraceHits = (eye, direction, far) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(terrace, true);
assert.equal(terraceHits([-5.5, 10, -3.25], [0, 0, -1], 4).length, 0, 'Utility enclosure must not project beyond the rear roof edge');
assert.equal(terraceHits([-4.28, 11.3, -1], [0, -1, 0], 2.7).length, 0, 'Utility enclosure keeps a gap from the stairwell wall');
const rear = terraceHits([-5.5, 10, -3.25], [0, 0, 1], 1)[0];
assert.ok(rear && rear.point.z > -2.8, 'Utility rear wall is inset from the parapet');
assert.ok(terraceHits([-5.5, 8.6, -2.6], [0, -1, 0], .5).length, 'Rear enclosure is supported on its terrace plinth');
const cover = terraceCovers[1];
assert.ok(cover.z - cover.depth / 2 > -3.25 && cover.z + cover.depth / 2 < 3.25, 'Utility canopy stays within the roof depth');
for (const [x, z, expected] of [[-22.1, 2.8, terraceLevels.leftWing], [-21.6, 3.02, terraceLevels.leftWing + .5 / 3], [-22, 1.35, terraceLevels.leftWing], [-21.7, 1.35, terraceLevels.leftWing + .5 / 3]]) {
  const hit = hits([x, 8.3, z], [0, -1, 0], 1).find(h => h.object.material.name !== 'Terrace tanks and PVC pipework');
  assert.ok(Math.abs(hit.point.y - expected) < .001, 'Old facade pier/lintel must not protrude beside the terrace steps');
}
assert.ok(hits([13, terraceLevels.rightStrip + .04, 0], [0, 0, 1], 3.4).length, 'Right parapet must meet the strip without a daylight gap');
for (const x of [4.15, 4.5, 4.9]) for (const z of [-2, 0, 1]) {
  const hit = terraceHits([x, 12.7, z], [0, -1, 0], 1)[0];
  assert.ok(hit && Math.abs(hit.point.y - terraceLevels.rightStrip) < .001, 'Right terrace meets enclosure without a lowered strip');
}
for (const [x, expected] of [[3.79, stairs.top], [3.81, stairs.top + .15], [4.03, stairs.top + .15], [4.17, stairs.top + .15], [4.19, stairs.top + .3], [4.55, stairs.top + .3], [4.57, terraceLevels.rightStrip], [4.95, terraceLevels.rightStrip]]) {
  for (const z of [1.5, 1.55, 2.425, 3.05]) {
    const near = hits([x, 12.8, z], [0, -1, 0], .8);
    assert.ok(near[0] && Math.abs(near[0].point.y - expected) < .001, `Unobstructed, full-width tread at ${x}, ${z}`);
    assert.equal(new Set(near.filter(h => Math.abs(h.point.y - expected) < .01).map(h => h.point.y.toFixed(4))).size, 1, 'No flickering duplicate finish on the steps');
  }
}
for (const [x, y] of [[3.8, stairs.top + .07], [4.18, stairs.top + .22], [4.56, stairs.top + .37]]) {
  for (const z of [1.5, 2.425, 3.05]) {
    const face = hits([x - .02, y, z], [1, 0, 0], .04)[0];
    assert.ok(face && Math.abs(face.point.x - x) < .001, 'Every riser is closed across the passage');
  }
}
for (const y of [12.05, 12.2, 12.4]) {
  assert.ok(hits([13, y, 4], [0, 0, -1], 1).length, 'Raised right roof remains sealed to the facade');
}
const stairGroup = scene.getObjectByName('Connected stairways: ground to roof');
const stairHits = (eye, direction, far) => new T.Raycaster(new T.Vector3(...eye), new T.Vector3(...direction), 0, far).intersectObject(stairGroup, true);
for (const x of [1.6, 1.63, 1.645, 3.76]) {
  assert.ok(stairHits([x, stairs.second + .4, 0], [0, 0, -1], 1).length, 'Stopped-flight wall joins its adjoining walls without a slit');
}
for (const f of stairFlights) for (const side of f.sides) {
  const z = -2, start = f.start ?? stairs.front;
  const y = f.base + (f.half - f.base) * (z - start) / (stairs.rear - start);
  assert.ok(stairHits([side * 1.645, y + 1.2, z], [0, -1, 0], .5).length, 'Every side-flight parapet closes against the treads');
}
for (const side of [-1, 1]) {
  const hit = hits([side * 5, 13.2, 0], [-side, 0, 0], 2)[0];
  assert.ok(Math.abs(hit.point.x - side * 4.04) < .025, 'No legacy parapet projects from the headhouse side');
}
const gate = scene.getObjectByName('Terrace double grille gate');
for (const leaf of gate.children) {
  const bounds = new T.Box3().setFromObject(leaf);
  assert.ok(bounds.max.x < gate.position.x + .03 && bounds.min.x < gate.position.x - .8, 'Terrace gates push toward the left terrace');
}
for (const leaf of scene.getObjectsByProperty('name', 'Open classroom entrance leaf')) {
  const hinge = leaf.getWorldPosition(new T.Vector3()), bounds = new T.Box3().setFromObject(leaf);
  assert.ok(bounds.max.x < hinge.x + .03 && bounds.min.x < hinge.x - .8, 'Classroom doors push into the left wing');
}
const blue = scene.getObjectByName('Open blue roof-access door');
assert.ok(blue.position.x > .5 && new T.Box3().setFromObject(blue).min.x > .5, 'Blue door is right-hinged viewed from the terrace');
const blueBounds = new T.Box3().setFromObject(blue);
assert.ok(blueBounds.min.z < blue.position.z - 1 && blueBounds.max.z < blue.position.z + .04, 'Blue door pulls toward the stair landing, not out onto the terrace');
const tables = scene.getObjectsByProperty('name', 'Strong Room passage table');
assert.equal(tables.length, 3);
for (const table of tables) {
  const b = new T.Box3().setFromObject(table);
  assert.ok(b.min.x > 22.3 && b.max.z < -3.5, 'Tables clear the window wall and projecting junction pier');
}
for (const [x, y] of [[-28, terraceLevels.leftWing], [26, terraceLevels.rightWing], [-15, terraceLevels.leftStrip]]) {
  const near = hits([x, y + .1, 0], [0, -1, 0], .13);
  const surfaces = new Set(near.map(h => h.point.y.toFixed(4)));
  assert.equal(surfaces.size, 1, 'Roof finish has no nearly coplanar second surface');
}
console.log('PASS parapet closure, headhouse clearance, push-open gates, right hinge, tables and roof surfaces');
