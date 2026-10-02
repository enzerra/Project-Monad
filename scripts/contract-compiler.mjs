import fs from "node:fs";
import path from "node:path";

export function compileHiveCall() {
  const artifactPath = path.resolve("out/HiveCallV2.sol/HiveCallV2.json");
  if (!fs.existsSync(artifactPath)) throw new Error("Foundry artifact missing. Run npm run compile:contract first.");
  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const bytecode = artifact.bytecode?.object;
  if (!artifact.abi || !bytecode || bytecode === "0x") throw new Error("Foundry artifact has no deployable bytecode");
  return { abi: artifact.abi, bytecode };
}
