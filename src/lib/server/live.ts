import "server-only";
import { randomBytes, createCipheriv, createDecipheriv, createHash } from "node:crypto";
import { createPublicClient, createWalletClient, http, isAddress, verifyMessage, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { importSPKI, jwtVerify } from "jose";
import { configuredContractAddress, hiveCallAbi, monadTestnet } from "@/lib/chain";

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}

export async function privyUser(request: Request) {
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ")) throw new Error("Login required");
  const key = await importSPKI(required("PRIVY_VERIFICATION_KEY").replaceAll("\\n", "\n"), "ES256");
  const { payload } = await jwtVerify(bearer.slice(7), key, {
    issuer: "privy.io", audience: required("NEXT_PUBLIC_PRIVY_APP_ID"), algorithms: ["ES256"],
  });
  if (!payload.sub) throw new Error("Invalid user token");
  return payload.sub;
}

export async function db<T>(table: string, query = "", init?: RequestInit): Promise<T> {
  if (!/^hive_[a-z_]+$/.test(table)) throw new Error("Invalid table");
  const url = `${required("SUPABASE_URL")}/rest/v1/${table}${query}`;
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(url, {
    ...init,
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation", ...init?.headers },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status}): ${await response.text()}`);
  return response.json() as Promise<T>;
}

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

export async function verifyCommitSignature(digest: Hex, address: string, signature: Hex) {
  if (!isAddress(address)) return false;
  return verifyMessage({ address, message: { raw: digest }, signature });
}

export function sha256Hex(value: string) { return `0x${createHash("sha256").update(value).digest("hex")}` as Hex; }

export function contractConfig() { return { address: configuredContractAddress(), abi: hiveCallAbi } as const; }
