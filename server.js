import {Storage} from '@google-cloud/storage';
import {createWriteStream, statSync} from 'fs';
import {spawn} from 'child_process';

const PORT = process.env.PORT || 8080;
const BUCKET = process.env.BUCKET || 'zipcodetiles';
const OBJECT = process.env.OBJECT || 'zips.mbtiles';
const LOCAL  = process.env.LOCAL_TILESET || '/tmp/zips.mbtiles';

async function ensureMbtiles() {
  try { const s = statSync(LOCAL); if (s.size > 0) return; } catch {}
  console.log(`[startup] downloading gs://${BUCKET}/${OBJECT} -> ${LOCAL}`);
  const storage = new Storage();
  await new Promise((res, rej) =>
    storage.bucket(BUCKET).file(OBJECT)
      .createReadStream().on('error', rej)
      .pipe(createWriteStream(LOCAL)).on('error', rej).on('finish', res)
  );
  console.log('[startup] download complete');
}

(async () => {
  await ensureMbtiles();
  const args = ['--file', LOCAL, '-p', String(PORT), '-b', '0.0.0.0', '--verbose'];
  console.log('[startup] starting tileserver-gl-light', args.join(' '));
  const ps = spawn('tileserver-gl-light', args, {stdio: 'inherit'});
  ps.on('exit', (code) => process.exit(code ?? 1));
})();
