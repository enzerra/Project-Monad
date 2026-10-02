import fs from "node:fs";
import path from "node:path";
import { compileHiveCall } from "./contract-compiler.mjs";

const artifact = compileHiveCall();
const target = path.resolve("artifacts/HiveCallV2.json");
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(artifact, null, 2));
process.stdout.write(`Compiled HiveCallV2 → ${target}\n`);
