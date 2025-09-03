import { existsSync } from "fs";
import { spawn } from "child_process";

const PORT = process.env.PORT || "8080";
const TILESET_PATH = process.env.TILESET_PATH || "/data/zips.mbtiles";

// Preflight: fail with a clear message if the mounted file isn't there.
if (!existsSync(TILESET_PATH)) {
  console.error(
    `[startup] MBTiles not found at ${TILESET_PATH}.
Did you mount your Cloud Storage bucket to /data and is the object named 'zips.mbtiles'?`
  );
  process.exit(1);
}

console.log(`[startup] Found ${TILESET_PATH}. Starting TileServer on port ${PORT}…`);

const args = ["-p", String(PORT), TILESET_PATH, "--verbose"];
const child = spawn("tileserver-gl-light", args, { stdio: "inherit" });

child.on("exit", (code) => {
  console.error(`[tileserver] exited with code ${code ?? "null"}`);
  process.exit(code ?? 1);
});
