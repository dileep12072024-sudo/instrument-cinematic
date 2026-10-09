import assert from 'node:assert/strict';
import { Scene } from 'three';
import { birdDaylight, createBirds } from '../src/birds.js';
import { createAmbience } from '../src/ambience.js';

const scene = new Scene(), birds = createBirds(scene, () => .5), sound = createAmbience();
assert.equal(birdDaylight(-10), 0);
assert.equal(birdDaylight(0), 0);
assert.equal(birdDaylight(30), 1);
assert.equal(sound.birdLevel, 0, 'Default audio must not chirp before the solar state arrives');
sound.setDaylight(birdDaylight(30)); assert.equal(sound.birdLevel, .85);
sound.setWeather({ rainFactor: 1 }, true); assert.ok(sound.birdLevel < .02);
sound.setDaylight(birdDaylight(-10)); assert.equal(sound.birdLevel, 0);
birds.update(0, 30);
assert.equal(birds.group.visible, true);
assert.deepEqual(new Set(birds.group.children.map(b => b.name)), new Set(['Parrot', 'Cuckoo', 'Crow']));
const initial = birds.group.children.map(b => b.position.clone());
for (let i = 0; i < 1200; i++) {
  birds.update(.1, 30);
  for (const b of birds.group.children) assert.ok(b.position.y > 17, 'Flight path clears the roof');
}
birds.group.children.forEach((b, i) => assert.ok(b.position.distanceTo(initial[i]) > .1));
birds.update(.1, -1); assert.equal(birds.group.visible, false);
birds.update(.1, 30, true); assert.equal(birds.group.visible, false);
birds.update(.1, 30); assert.equal(birds.group.visible, true);
console.log('PASS daytime calls, silent nights, three species, moving roof-clear paths and reduced motion');
