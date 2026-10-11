import { writeFile } from 'node:fs/promises';
import sharp from 'sharp';
import assert from 'node:assert/strict';

// Decode raw Terrarium channels before any color conversion or image resampling.
const tiles = [];
for (const y of [7371, 7372]) {
  const file = `terrain-14-11984-${y}.png`;
  const { data, info } = await sharp(`blender/gis/${file}`).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 256);
  assert.equal(info.height, 256);
  assert.equal(info.channels, 3);
  const heights = Array.from({ length: 256 * 256 }, (_, i) => data[i * 3] * 256 + data[i * 3 + 1] + data[i * 3 + 2] / 256 - 32768);
  assert.ok(heights.every(h => Number.isFinite(h) && h > -100 && h < 1000));
  tiles.push({ zoom: 14, x: 11984, y, file, heights });
}
await writeFile('blender/gis/elevation.json', JSON.stringify({
  source: 'Mapzen / Tilezen Terrain Tiles on AWS',
  sourceUrl: 'https://registry.opendata.aws/terrain-tiles/',
  encoding: 'R * 256 + G + B / 256 - 32768 metres',
  limitations: 'Regional elevation reference, not a site survey. Resampling does not add source detail.',
  tiles,
}));
console.log('Decoded two GIS elevation tiles; all heights finite and in regional range.');
