import { Storage } from "@google-cloud/storage";
import { createWriteStream, statSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const PORT   = process.env.PORT || 8080;
const BUCKET = process.env.BUCKET || "zipcodetiles";
const OBJECT = process.env.OBJECT || "zips.mbtiles";
const LOCAL  = process.env.LOCAL_TILESET || "/tmp/zips.mbtiles";
const CFG    = "/tmp/config.json"; // <-- important

async function ensureMbtiles() {
  try {
    const s = statSync(LOCAL);
    if (s.size > 0) return;
  } catch {}
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
  // Resolve the installed preview styles bundle so the default front page works.
  const stylesRoot = require.resolve("tileserver-gl-styles/package.json")
    .replace(/\/package\.json$/, "");

  const cfg = {
    options: {
      // Serve the built-in landing page (list of data/styles)
      frontPage: true,
      paths: {
        root: stylesRoot,  // where styles/fonts live
        styles: "styles",
        fonts: "fonts",
        // our mbtiles is downloaded to /tmp
        mbtiles: "/tmp"
      }
    },
    data: {
      // exposes: /data/zipcodes.json and /data/zipcodes/{z}/{x}/{y}.pbf
      zipcodes: { mbtiles: path.basename(LOCAL) }
    }
  };

  writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log("[startup] wrote config:", CFG, "root=", stylesRoot);
}

(async () => {
  await ensureMbtiles();
  writeConfig();

  // Use --config (don’t pass a positional .mbtiles; that caused the “too many arguments” error)
  const args = ["--config", CFG, "-p", String(PORT), "-b", "0.0.0.0", "--verbose"];
  console.log("[startup] starting tileserver-gl-light", args.join(" "));
  const ps = spawn("tileserver-gl-light", args, { stdio: "inherit" });
  ps.on("exit", (code) => process.exit(code ?? 1));
})().catch((e) => {
  console.error("[startup error]", e);
  process.exit(1);
});
