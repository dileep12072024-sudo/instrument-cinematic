import sharp from 'sharp';
import { readFile, writeFile, copyFile } from 'node:fs/promises';
import convert from 'heic-convert';

const source = '/mnt/c/Users/Dileep/Downloads/';
const photos = [
  ['RUID86e0b51e749148a6a1b9367aef8afd3c.jpg', 'entrance', 'The main entrance'],
  ['RUID8e810f4e2d9e4e129a4b9dfa100b1140.jpg', 'courtyard', 'The eastern courtyard'],
  ['RUID24762db432d5443ea3589d44fa4a3cca.jpg', 'west', 'The western wing'],
  ['RUIDd05f20b7f3644a7f970f37e897c5d329.jpg', 'facade', 'Blue bands and weathered plaster'],
  ['RUIDe649ccd04d2d48e5bc8f36d6da5c07b8.jpg', 'east', 'The eastern return'],
  ['RUIDc335a0ab91064a6ca45d8bcf4cc46bba.jpg', 'windows', 'Windows of the west wing'],
  ['RUID77ff9dd4655141f382e83905f27406f9.jpg', 'corner', 'An open corridor'],
  ['RUIDbb41611c46e54ebba6646dfdf419e719.jpg', 'trees', 'Beneath the canopy'],
  ['RUID7af37a60a97d4c9f9e3d34c460664b58.jpg', 'west-court', 'The quiet courtyard'],
  ['RUID1c65c953289a4357b74db720e0bd2269.jpg', 'west-end', 'The western return'],
  ['RUID46830d4b8bee48258573fdf931271582.jpg', 'arrival', 'An everyday arrival'],
  ['RUID9b10b57cce3241a8bbb5ec2636f92441.jpg', 'corridor', 'A rhythm of light and shade'],
  ['RUID78b72101967f491b9d77fc897c718ad1.jpg', 'department', 'Instrument Technology'],
];
const manifest = [];
for (const [file, id, title] of photos) {
  await sharp(source + file).rotate().resize({ width: 1800, height: 1400, fit: 'inside', withoutEnlargement: true }).webp({ quality: 85 }).toFile(`public/media/${id}.webp`);
  manifest.push({ src: `/media/${id}.webp`, title });
}
for (const [i, name] of ['RUIDc63e6e87ec1542baa515c04f02c45eb0.heic', 'RUIDc7c8b064ddb943c7955d2cff4e55891f.heic'].entries()) {
  try {
    const jpeg = await convert({ buffer: await readFile(source + name), format: 'JPEG', quality: .9 });
    await sharp(Buffer.from(jpeg)).resize({ width: 1800, height: 1400, fit: 'inside' }).webp({ quality: 85 }).toFile(`public/media/additional-${i + 1}.webp`);
    manifest.push({ src: `/media/additional-${i + 1}.webp`, title: `Campus study ${i + 1}` });
  } catch (e) { console.error('HEIC conversion:', name, e.message); }
}
await copyFile(source + 'WhatsApp Video 2026-09-19 at 8.33.16 PM.mp4', 'public/media/campus.mp4');
await sharp('/mnt/c/Users/Dileep/Pictures/Screenshots/Screenshot 2026-08-26 155120.png').webp().toFile('public/media/footprint.webp');
await writeFile('public/media/photos.json', JSON.stringify(manifest));
console.log(`Prepared ${manifest.length} original photographs, footprint and video.`);
