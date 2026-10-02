import { createPublicClient, createWalletClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileHiveCall } from "./contract-compiler.mjs";

const key = process.env.RELAYER_PRIVATE_KEY;
if (!key) throw new Error("RELAYER_PRIVATE_KEY is required");
const account = privateKeyToAccount(key);
const chain = { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: ["https://rpc.testnet.monad.xyz"] } }, blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } }, testnet: true };
const wallet = createWalletClient({ account, chain, transport: http() });
const client = createPublicClient({ chain, transport: http() });
const artifact = compileHiveCall();
const hash = await wallet.deployContract({ ...artifact, args: [account.address, account.address] });
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== "success" || !receipt.contractAddress) throw new Error(`Deployment failed: ${hash}`);
process.stdout.write(`Contract: ${receipt.contractAddress}\nTx: https://testnet.monadscan.com/tx/${hash}\nSet NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS=${receipt.contractAddress}\n`);
