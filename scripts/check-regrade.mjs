import assert from 'node:assert/strict';
import { solveGround } from '../src/regrade.js';

// A road strip at 0.0 beside earth that sags into a 0.45 m swale; the far border keeps its level (-0.05).
const w = 40, h = 12, ground = new Float32Array(w * h), hard = new Float32Array(w * h).fill(NaN);
for (let i = 0; i < w * h; i++) { const x = i % w, y = (i / w) | 0; ground[i] = x > 8 && x < 20 && y > 0 && y < h - 1 ? -.45 : -.05; if (x >= 2 && x <= 5) hard[i] = 0; }
const building = i => i % w >= 34 && i % w <= 37;
const H = solveGround(ground, hard, building, { w, h }, 1500);
const row = 6, at = x => H[row * w + x];
assert.ok(Math.abs(at(6) - (0 - .01)) < .02, `earth beside the road is flush with it (${at(6)})`);
assert.ok(at(14) > -.1, `the swale is filled (${at(14)})`);
assert.ok(Math.abs(at(33) - -.02) < .02, `earth meets the building plinth (${at(33)})`);
for (let x = 6; x < 33; x++) assert.ok(Math.abs(at(x + 1) - at(x)) < .02, 'no steps: the earth slopes smoothly between edges');
console.log('PASS regrade: flush road and building edges, swale filled, smooth slopes');
