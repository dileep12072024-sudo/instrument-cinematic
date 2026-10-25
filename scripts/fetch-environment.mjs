import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';

// CC0 originals stay local; only optimized Blender exports ship to the browser.
for (const id of ['jacaranda_tree', 'island_tree_02', 'grass_bermuda_01']) {
  const dir = join('blender', 'sources', id);
  mkdirSync(join(dir, 'textures'), { recursive: true });
  const metadata = join(dir, 'files.json');
  const download = (url, path) => {
    if (!existsSync(path)) execFileSync('curl', ['--fail', '--retry', '2', '-sSL', url, '-o', path], { stdio: 'inherit' });
  };
  download(`https://api.polyhaven.com/files/${id}`, metadata);
  const asset = JSON.parse(readFileSync(metadata)).blend['1k'].blend;
  download(asset.url, join(dir, `${id}.blend`));
  for (const [path, file] of Object.entries(asset.include)) download(file.url, join(dir, path));
  console.log(`Downloaded ${id}`);
}
