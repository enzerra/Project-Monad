import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { createPublicClient, createWalletClient, defineChain, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";

// The key is read from the environment, never passed on the command line.
const chain = defineChain({ id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } } });
const client = createPublicClient({ chain, transport: http() });
if (await client.getChainId() !== 10143) throw new Error("Deployment is restricted to Monad Testnet");
const key = process.env.RELAYER_PRIVATE_KEY;
if (!/^0x[a-fA-F0-9]{64}$/.test(key ?? "")) throw new Error("RELAYER_PRIVATE_KEY is missing or invalid");
const account = privateKeyToAccount(key);
const artifact = JSON.parse(readFileSync("out/HiveCallV2.sol/HiveCallV2.json", "utf8"));
mkdirSync(".vibe-data", { recursive: true });
const evidencePath = ".vibe-data/monad-deployment.json";
let evidence = existsSync(evidencePath) ? JSON.parse(readFileSync(evidencePath, "utf8")) : null;
if (evidence && evidence.operator.toLowerCase() !== account.address.toLowerCase()) throw new Error("Existing deployment uses a different operator; inspect evidence before proceeding");
if (!evidence) {
  const wallet = createWalletClient({ account, chain, transport: http() });
  const hash = await wallet.deployContract({ abi: artifact.abi, bytecode: artifact.bytecode.object, args: [account.address, account.address] });
  evidence = { chainId: chain.id, operator: account.address, transaction: hash, submittedAt: new Date().toISOString() };
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
  console.log("Deployment submitted:", hash);
}
const receipt = await client.waitForTransactionReceipt({ hash: evidence.transaction });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error("Deployment failed; inspect the saved transaction");
const address = receipt.contractAddress;
if (!(await client.getCode({ address }))) throw new Error("Deployed bytecode missing");
for (const functionName of ["owner", "keeper", "resolver"]) {
  const role = await client.readContract({ address, abi: artifact.abi, functionName });
  if (role.toLowerCase() !== account.address.toLowerCase()) throw new Error(`Unexpected ${functionName}`);
}
evidence = { ...evidence, address, blockNumber: receipt.blockNumber.toString(), verifiedAt: new Date().toISOString() };
writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
let env = readFileSync(".env.local", "utf8");
const line = `NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS=${address}`;
env = /^NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS=.*$/m.test(env) ? env.replace(/^NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS=.*$/m, line) : `${env.trimEnd()}\n${line}\n`;
writeFileSync(".env.local", env);
console.log(JSON.stringify(evidence, null, 2));
