// server.js
import { existsSync } from "fs";
import { spawn } from "child_process";

const PORT = process.env.PORT || "8080";
const TILESET_PATH = process.env.TILESET_PATH || "/data/zips.mbtiles";

if (!existsSync(TILESET_PATH)) {
  console.error(`[startup] MBTiles not found at ${TILESET_PATH}.
Did you mount the bucket to /data and is the object named 'zips.mbtiles'?`);
  process.exit(1);
}

console.log(`[startup] Found ${TILESET_PATH}. Starting TileServer on ${PORT}…`);

const child = spawn("tileserver-gl-light", ["-p", String(PORT), TILESET_PATH, "--verbose"], {
  stdio: "inherit",
});
child.on("exit", (code) => process.exit(code ?? 1));
