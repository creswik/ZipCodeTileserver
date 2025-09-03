import {Storage} from '@google-cloud/storage';
import {createWriteStream, statSync} from 'fs';
import {spawn} from 'child_process';
import path from 'path';

const PORT = process.env.PORT || 8080;
const BUCKET = process.env.BUCKET || 'zipcodetiles';
const OBJECT = process.env.OBJECT || 'zips.mbtiles';
const LOCAL = process.env.LOCAL_TILESET || '/tmp/zips.mbtiles';

async function ensureMbtiles() {
  try {
    const s = statSync(LOCAL);
    if (s.size > 0) return;
  } catch (_) { /* not found */ }

  console.log(`[startup] downloading gs://${BUCKET}/${OBJECT} -> ${LOCAL}`);
  const storage = new Storage();
  await new Promise((resolve, reject) => {
    storage.bucket(BUCKET).file(OBJECT)
      .createReadStream()
      .on('error', reject)
      .pipe(createWriteStream(LOCAL))
      .on('error', reject)
      .on('finish', resolve);
  });
  console.log('[startup] download complete');
}

async function main() {
  await ensureMbtiles();

  const args = ['-p', String(PORT), LOCAL];
  console.log(`[startup] starting tileserver-gl-light ${args.join(' ')}`);
  const ps = spawn('tileserver-gl-light', args, {stdio: 'inherit'});

  ps.on('exit', (code) => {
    console.error(`[tileserver exited] code=${code}`);
    process.exit(code ?? 1);
  });
}

main().catch(err => {
  console.error('[startup error]', err);
  process.exit(1);
});
