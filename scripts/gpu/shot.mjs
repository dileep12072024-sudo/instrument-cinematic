// a screenshot some seconds into the load (the loader while the campus builds): node.exe shot.mjs <url> <file> [seconds]
import { open, sleep } from './cdp.mjs';
const [url, file, s = '12'] = process.argv.slice(2), b = await open(url, { w: 1280, h: 720 });
try { await sleep(+s * 1000); await b.shot(file, 70); } finally { b.close(); }
