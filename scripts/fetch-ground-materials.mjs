import { mkdirSync, readFileSync, existsSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, basename } from 'node:path';
import { createHash } from 'node:crypto';

// Powered by Poly Haven. CC0 textures stay local until the runtime export is approved.
for (const id of ['asphalt_02', 'brown_mud_leaves_01']) {
  const dir = join('blender', 'sources', id);
  mkdirSync(dir, { recursive: true });
  const download = (url, path) => {
    if (!existsSync(path)) execFileSync('curl', ['--fail', '--retry', '2', '-sSL', url, '-o', path], { stdio: 'inherit' });
  };
  const metadata = join(dir, 'files.json');
  download(`https://api.polyhaven.com/files/${id}`, metadata);
  const files = JSON.parse(readFileSync(metadata));
  const maps = {};
  for (const [slot, keys] of Object.entries({ color: ['diff', 'Diffuse'], normal: ['nor_gl'], roughness: ['rough', 'Rough'] })) {
    const key = keys.find(key => files[key]);
    if (!key) throw new Error(`${id}: missing ${slot}`);
    const file = files[key]['1k'].jpg;
    const path = join(dir, basename(file.url));
    download(file.url, path);
    if (createHash('md5').update(readFileSync(path)).digest('hex') !== file.md5) throw new Error(`Checksum failed: ${path}`);
    maps[slot] = basename(path);
  }
  writeFileSync(join(dir, 'maps.json'), JSON.stringify(maps, null, 2) + '\n');
  console.log(`${id}: verified color, normal and roughness maps`);
}
