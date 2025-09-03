import { Storage } from "@google-cloud/storage";
import { createWriteStream, statSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";

const PORT   = process.env.PORT || 8080;
const BUCKET = process.env.BUCKET || "zipcodetiles";
const OBJECT = process.env.OBJECT || "zips.mbtiles";
const LOCAL  = process.env.LOCAL_TILESET || "/tmp/zips.mbtiles";
const CFG    = "/tmp/config.json";

async function ensureMbtiles() {
  try { const s = statSync(LOCAL); if (s.size > 0) return; } catch {}
  console.log(`[startup] downloading gs://${BUCKET}/${OBJECT} -> ${LOCAL}`);
  const storage = new Storage();
  await new Promise((res, rej) =>
    storage.bucket(BUCKET).file(OBJECT)
      .createReadStream().on("error", rej)
      .pipe(createWriteStream(LOCAL)).on("error", rej).on("finish", res)
  );
  console.log("[startup] download complete");
}

function writeConfig() {
  // Disable the default front page (which looks for tileserver-gl-styles)
  // and tell TileServer where our MBTiles live.
  const cfg = {
    options: {
      frontPage: false,
      paths: {
        // 'root' is a prefix; with root="/" and mbtiles="tmp",
        // the file path becomes /tmp/<name>.
        root: "/",
        mbtiles: "tmp"
      }
    },
    data: {
      // Exposes raw vector tiles at /data/zipcodes/{z}/{x}/{y}.pbf etc.
      zipcodes: { mbtiles: path.basename(LOCAL) }
    }
  };
  writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log("[startup] wrote config:", CFG);
}

async function main() {
  await ensureMbtiles();
  writeConfig();

  const args = ["-c", CFG, "-p", String(PORT), "-b", "0.0.0.0", "--verbose"];
  console.log("[startup] starting tileserver-gl-light", args.join(" "));
  const ps = spawn("tileserver-gl-light", args, { stdio: "inherit" });
  ps.on("exit", (code) => process.exit(code ?? 1));
}

main().catch((e) => { console.error("[startup error]", e); process.exit(1); });
