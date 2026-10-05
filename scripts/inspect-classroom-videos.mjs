import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import sharp from 'sharp';
import ffmpeg from 'ffmpeg-static';

const dir = 'artifacts/classroom-video';
mkdirSync(dir, { recursive: true });
for (const name of ['094055', '094701', '094920', '103154', '103849']) {
  const source = `/mnt/c/Users/Dileep/Pictures/Internal parts/20260928_${name}.mp4`;
  const info = spawnSync(ffmpeg, ['-hide_banner', '-i', source], { encoding: 'utf8' }).stderr;
  const [, h, m, s] = info.match(/Duration: (\d+):(\d+):([\d.]+)/);
  const duration = Number(h) * 3600 + Number(m) * 60 + Number(s);
  const composite = [];
  for (let i = 0; i < 12; i++) {
    const time = Math.round(i * (duration - 1) / 11);
    const file = `${dir}/${name}-${time}.jpg`;
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-threads', '2', '-ss', String(time), '-i', source, '-frames:v', '1', '-vf', 'scale=1280:-2', '-q:v', '2', '-y', file]);
    const tile = await sharp(file).resize(480, 270, { fit: 'contain' }).extend({ bottom: 24, background: '#101010' }).composite([{ input: Buffer.from(`<svg width="480" height="24"><text x="12" y="18" fill="white" font-size="16">${name} / ${time}s</text></svg>`), left: 0, top: 270 }]).jpeg().toBuffer();
    composite.push({ input: tile, left: i % 3 * 480, top: Math.floor(i / 3) * 294 });
  }
  await sharp({ create: { width: 1440, height: 1176, channels: 3, background: '#101010' } }).composite(composite).jpeg({ quality: 90 }).toFile(`${dir}/${name}-overview.jpg`);
  console.log(`${name}: ${duration}s reviewed at 12 timestamps`);
}
