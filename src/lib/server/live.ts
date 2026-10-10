import "server-only";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { createPublicClient, createWalletClient, http, isAddress, verifyMessage, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { configuredContractAddress, hiveCallAbi, monadTestnet } from "@/lib/chain";
import { required } from "@/lib/server/database";
import { serializeOperator } from "@/lib/server/operator-queue";
export { required, db } from "@/lib/server/database";
export { privyUser } from "@/lib/server/auth";

export function seal(value: unknown) {
  const key = Buffer.from(required("CHOICE_ENCRYPTION_KEY"), "base64");
  if (key.length !== 32) throw new Error("CHOICE_ENCRYPTION_KEY must be 32 bytes, base64 encoded");
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(JSON.stringify(value)), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), encrypted]).toString("base64");
}

export function unseal<T>(value: string): T {
  const data = Buffer.from(value, "base64");
  const key = Buffer.from(required("CHOICE_ENCRYPTION_KEY"), "base64");
  const cipher = createDecipheriv("aes-256-gcm", key, data.subarray(0, 12));
  cipher.setAuthTag(data.subarray(12, 28));
  return JSON.parse(Buffer.concat([cipher.update(data.subarray(28)), cipher.final()]).toString()) as T;
}

export const publicClient = createPublicClient({ chain: monadTestnet, transport: http() });

export function operatorWallet() {
  const account = privateKeyToAccount(required("RELAYER_PRIVATE_KEY") as Hex);
  return createWalletClient({ account, chain: monadTestnet, transport: http() });
}

export function operatorTransaction(functionName: "commit" | "closeEarly" | "reveal" | "resolve" | "voidCall", args: readonly unknown[], submitted?: (hash: Hex) => Promise<void>) {
  return serializeOperator(async () => {
    const wallet = operatorWallet();
    const hash = await wallet.writeContract({ ...contractConfig(), functionName, args } as Parameters<typeof wallet.writeContract>[0]);
    // Persist the hash before waiting, so a timeout can be reconciled on the next tick.
    if (submitted) await submitted(hash);
    const receipt = await publicClient.waitForTransactionReceipt({ hash, timeout: 60_000 });
    if (receipt.status !== "success") throw new Error("Operator transaction reverted");
    return hash;
  });
}

export async function verifyCommitSignature(digest: Hex, address: string, signature: Hex) {
  if (!isAddress(address)) return false;
  return verifyMessage({ address, message: { raw: digest }, signature });
}

export function sha256Hex(value: string) { return `0x${createHash("sha256").update(value).digest("hex")}` as Hex; }

export function contractConfig() { return { address: configuredContractAddress(), abi: hiveCallAbi } as const; }
