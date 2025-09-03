import { createRequire } from "module";
const require = createRequire(import.meta.url);

function writeConfig() {
  // Resolve the installed 'tileserver-gl-styles' directory robustly
  const stylesRoot = require.resolve("tileserver-gl-styles/package.json")
    .replace(/\/package\.json$/, "");

  const cfg = {
    options: {
      // Serve the default landing page
      frontPage: true,
      // Tell TileServer where to find styles/fonts (+ our mbtiles under /tmp)
      paths: {
        root: stylesRoot,
        styles: "styles",
        fonts: "fonts",
        mbtiles: "/tmp"
      }
    },
    data: {
      // exposes /data/zipcodes.json and /data/zipcodes/{z}/{x}/{y}.pbf
      zipcodes: { mbtiles: "zips.mbtiles" }
    }
  };
  writeFileSync(CFG, JSON.stringify(cfg, null, 2));
  console.log("[startup] wrote config:", CFG, "root=", stylesRoot);
}

// …later when starting tileserver:
const args = ["--config", CFG, "-p", String(PORT), "-b", "0.0.0.0", "--verbose"];
