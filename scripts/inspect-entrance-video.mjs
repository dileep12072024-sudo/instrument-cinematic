import { execFileSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const source = '/mnt/c/Users/Dileep/Pictures/Internal parts/20260928_093712.mp4';
const dir = 'artifacts/entrance-video';
mkdirSync(dir, { recursive: true });
const times = process.argv.slice(2).map(Number);
if (!times.length) times.push(0, 8, 16, 24, 32, 40, 48, 56, 64, 72, 80, 88);
const composite = [];
for (const [index, time] of times.entries()) {
  const file = `${dir}/${time}.jpg`;
  execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '2', '-ss', String(time), '-i', source, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '2', '-y', file]);
  const tile = await sharp(file).resize(480, 270).extend({ bottom: 26, background: '#101010' }).composite([{ input: Buffer.from(`<svg width="480" height="26"><text x="12" y="19" fill="white" font-size="17">${time} seconds</text></svg>`), left: 0, top: 270 }]).jpeg().toBuffer();
  composite.push({ input: tile, left: index % 3 * 480, top: Math.floor(index / 3) * 296 });
  console.log(`Frame ${time}s`);
}
await sharp({ create: { width: 1440, height: Math.ceil(times.length / 3) * 296, channels: 3, background: '#101010' } }).composite(composite).jpeg({ quality: 90 }).toFile(`${dir}/overview-${times[0]}.jpg`);
