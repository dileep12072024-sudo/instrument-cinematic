import assert from 'node:assert/strict';
import { createAmbience } from '../src/ambience.js';

const sound = createAmbience();
assert.equal(sound.birdLevel, 0, 'Default audio must not chirp before the solar state arrives');
sound.setDaylight(1); assert.equal(sound.birdLevel, .85);
sound.setWeather({ rainFactor: 1 }, true); assert.ok(sound.birdLevel < .02);
sound.setDaylight(0); assert.equal(sound.birdLevel, 0);
console.log('PASS daytime ambience and silent nighttime chirps');
