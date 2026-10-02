import fs from "node:fs";
import path from "node:path";
import solc from "solc";

export function compileHiveCall() {
  const source = fs.readFileSync(path.resolve("contracts/HiveCallV2.sol"), "utf8");
  const input = {
    language: "Solidity",
    sources: { "HiveCallV2.sol": { content: source } },
    settings: {
      optimizer: { enabled: true, runs: 200 },
      viaIR: true,
      outputSelection: { "*": { "*": ["abi", "evm.bytecode.object"] } },
    },
  };
  const output = JSON.parse(solc.compile(JSON.stringify(input)));
  const errors = (output.errors ?? []).filter((item) => item.severity === "error");
  if (errors.length) throw new Error(errors.map((item) => item.formattedMessage).join("\n"));
  const compiled = output.contracts["HiveCallV2.sol"].HiveCallV2;
  return { abi: compiled.abi, bytecode: `0x${compiled.evm.bytecode.object}` };
}
