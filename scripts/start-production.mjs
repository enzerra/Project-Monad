import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { deploymentErrors } from "./deployment-config.mjs";

const errors = deploymentErrors();
const [major, minor] = process.versions.node.split(".").map(Number);
if (major !== 22 || minor < 15) errors.push("Use Node.js 22.15 or newer in the Node 22 series");
const port = process.env.PORT ?? "3000";
if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) errors.push("PORT is invalid");
if (errors.length) {
  console.error("VIBE cannot start until deployment configuration is complete:\n" + errors.map((item) => `- ${item}`).join("\n"));
  process.exit(1);
}
const require = createRequire(import.meta.url);
const child = spawn(process.execPath, [require.resolve("next/dist/bin/next"), "start", "--hostname", "0.0.0.0", "--port", port], { stdio: "inherit", env: process.env });
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", () => { console.error("VIBE server failed to start."); process.exit(1); });
child.on("exit", (code) => process.exit(code ?? 1));
