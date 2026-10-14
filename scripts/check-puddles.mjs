import assert from 'node:assert/strict';
import { fillDepressions, waterStep } from '../src/puddles.js';

// Depression fill: a 5x5 plate sloping to one edge with a 4 cm pit; a walled cell (NaN) holds nothing.
const w = 5, h = 5, heights = new Float32Array(w * h).map((_, i) => .01 * (i % w));
heights[2 * w + 2] -= .04; heights[1 * w + 3] = NaN;
const depth = fillDepressions(heights, w, h);
assert.ok(Math.abs(depth[2 * w + 2] - .03) < 1e-6, `pit holds water to its lowest rim (${depth[2 * w + 2]})`);
assert.equal(depth.reduce((n, d, i) => n + (i !== 2 * w + 2 && d > 1e-6), 0), 0, 'sloping ground drains');
assert.equal(depth[1 * w + 3], 0);
// Ground that ends inside the grid drains off its edge; an enclosed empty block (a building) is a wall water pools against.
const g = 7, field = new Float32Array(g * g).fill(NaN);
for (let y = 1; y < 6; y++) for (let x = 1; x < 6; x++) field[y * g + x] = .01 * x;
field[3 * g + 3] = NaN; field[3 * g + 2] = -.02;
const pooled = fillDepressions(field, g, g);
assert.ok(Math.abs(pooled[3 * g + 2] - .03) < 1e-6 && pooled[3 * g + 1] === 0, `pools beside a building, drains at the ground's edge (${pooled[3 * g + 2]})`);

// Water model: heavier rain fills more of each hollow and its water lasts longer; soil drains faster than paving.
const dry = { hard: 0, soil: 0, film: 0 }, after = (mm, rainMinutes, dryMinutes) => waterStep(waterStep(dry, mm, rainMinutes), 0, dryMinutes);
const light = waterStep(dry, 1, 60), heavy = waterStep(dry, 15, 60);
assert.ok(heavy.hard > .85 && light.hard < .5 && light.hard > .1, JSON.stringify({ light, heavy }));
assert.ok(heavy.soil < heavy.hard, 'soil soaks up more');
assert.ok(after(15, 60, 45).hard > after(1, 60, 45).hard * 2, 'puddles from heavy rain stay longer');
assert.ok(after(15, 60, 180).hard < .02, 'puddles dry within a few hours');
assert.ok(waterStep(dry, 3, 1).film > .8 && after(3, 10, 30).film < .05, 'surface film wets fast, dries in tens of minutes');
console.log('PASS puddles: depression fill, rain-dependent filling and draining');
