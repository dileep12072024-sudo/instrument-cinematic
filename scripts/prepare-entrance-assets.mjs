import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';

await mkdir('public/media/entrance-hall', { recursive: true });
// Crops contain only the observed notice boards and plaster, never people or vehicles.
await sharp('artifacts/entrance-video/24-detail.jpg').extract({ left: 2050, top: 188, width: 190, height: 390 }).resize(256, 512).webp({ quality: 90 }).toFile('public/media/entrance-hall/environment-notice.webp');
await sharp('artifacts/entrance-video/24-detail.jpg').extract({ left: 294, top: 405, width: 113, height: 473 }).resize(160, 512).webp({ quality: 90 }).toFile('public/media/entrance-hall/department-notice.webp');
await sharp('artifacts/entrance-video/68.jpg').extract({ left: 400, top: 480, width: 360, height: 200 }).resize(512, 512).webp({ quality: 90 }).toFile('public/media/entrance-hall/plaster.webp');
