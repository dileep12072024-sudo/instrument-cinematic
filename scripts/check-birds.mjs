import assert from 'node:assert/strict';
import { createAmbience } from '../src/ambience.js';

const sound = createAmbience();
assert.equal(sound.birdLevel, 0, 'Default audio must not chirp before the solar state arrives');
sound.setDaylight(1); assert.equal(sound.birdLevel, .85);
sound.setWeather({ rainFactor: 1 }, true); assert.ok(sound.birdLevel < .02);
sound.setDaylight(0); assert.equal(sound.birdLevel, 0);
console.log('PASS daytime ambience and silent nighttime chirps');
// Calls come in phrases: a dawn chorus while the sun is low, sparser at midday, fewer in strong wind, none at night.
sound.setWeather({ rainFactor: 0 }, false, 0);
sound.setDaylight(1, 8); const dawn = sound.birdActivity;
sound.setDaylight(1, 70); const noon = sound.birdActivity;
sound.setWeather({ rainFactor: 0 }, false, 60); const windy = sound.birdActivity;
sound.setDaylight(0, -20); const night = sound.birdActivity;
assert.ok(dawn > noon * 2 && noon > windy && night === 0, JSON.stringify({ dawn, noon, windy, night }));
console.log('PASS bird phrases follow time of day, wind, rain and night', { dawn, noon: +noon.toFixed(2), windy: +windy.toFixed(2) });
