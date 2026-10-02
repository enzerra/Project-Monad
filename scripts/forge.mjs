import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const localBinary = path.join(os.homedir(), ".foundry", "bin", process.platform === "win32" ? "forge.exe" : "forge");
const binary = process.env.FOUNDRY_FORGE_BIN || (fs.existsSync(localBinary) ? localBinary : "forge");
const result = spawnSync(binary, process.argv.slice(2), { stdio: "inherit", env: process.env });
if (result.error) {
  process.stderr.write(`Foundry Forge is unavailable: ${result.error.message}\nInstall it from https://getfoundry.sh/getting-started/installation/\n`);
  process.exit(1);
}
process.exit(result.status ?? 1);
