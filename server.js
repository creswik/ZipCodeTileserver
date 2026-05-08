import { Storage } from "@google-cloud/storage";
import { createWriteStream, statSync, writeFileSync } from "fs";
import { spawn } from "child_process";
import path from "path";
import { createRequire } from "module";
const require = createRequire(import.meta.url);

const PORT   = process.env.PORT || 8080;
const BUCKET = process.env.BUCKET || "zipcodetiles";
const CFG    = "/tmp/config.json";

const DATASETS = [
  {
    id: "counties",
    object: process.env.COUNTY_OBJECT || "counties.mbtiles",
    local:  process.env.COUNTY_LOCAL  || "/tmp/counties.mbtiles",
  },
  {
    id: "zcta",
    object: process.env.ZCTA_OBJECT || "zcta.mbtiles",
    local:  process.env.ZCTA_LOCAL  || "/tmp/zcta.mbtiles",
  },
];

const storage = new Storage();

async function downloadOne({ id, object, local }) {
  try {
    const s = statSync(local);
    if (s.size > 0) {
      console.log(`[startup] ${id}: ${local} already present (${s.size} bytes)`);
      return;
    }
  } catch {}
  console.log(`[startup] ${id}: downloading gs://${BUCKET}/${object} -> ${local}`);
  await new Promise((res, rej) =>
    storage.bucket(BUCKET).file(object)
      .createReadStream().on("error", rej)
      .pipe(createWriteStream(local)).on("error", rej).on("finish", res)
  );
  console.log(`[startup] ${id}: download complete`);
}

async function ensureMbtiles() {
  await Promise.all(DATASETS.map(downloadOne));
}

function writeConfig() {
  const stylesRoot = require.resolve("tileserver-gl-styles/package.json")
    .replace(/\/package\.json$/, "");

  const data = {};
  for (const d of DATASETS) {
    data[d.id] = { mbtiles: path.basename(d.local) };
  }

  const cfg = {
    options: {
      frontPage: true,
      paths: {
        root: stylesRoot,
        styles: "styles",
        fonts: "fonts",
        mbtiles: "/tmp",
      },
    },
    data,
  };

  writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log("[startup] wrote config:", CFG, "datasets=", Object.keys(data).join(","));
}

function resolveTileserverBin() {
  const pkgPath = require.resolve("tileserver-gl-light/package.json");
  const pkgRoot = path.dirname(pkgPath);
  const pkg = require("tileserver-gl-light/package.json");
  const binRel = typeof pkg.bin === "string" ? pkg.bin : pkg.bin["tileserver-gl-light"];
  return path.join(pkgRoot, binRel);
}

(async () => {
  await ensureMbtiles();
  writeConfig();

  const binPath = resolveTileserverBin();
  const args = [binPath, "--config", CFG, "-p", String(PORT), "-b", "0.0.0.0", "--verbose"];
  console.log("[startup] starting", process.execPath, args.join(" "));
  const ps = spawn(process.execPath, args, { stdio: "inherit" });
  ps.on("exit", (code) => process.exit(code ?? 1));
})().catch((e) => {
  console.error("[startup error]", e);
  process.exit(1);
});
