import { randomBytes } from "node:crypto";
import { encodeAbiParameters, keccak256, parseAbiParameters, type Hex } from "viem";
import { z } from "zod";
import { contractConfig, db, privyUser, publicClient, seal } from "@/lib/server/live";
import { AuthError } from "@/lib/server/auth";
import { trustedOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
const bodySchema = z.object({ wallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/), choice: z.boolean() });
type DbCall = { id: string; chain_call_id: Hex; status: string; opened_at: string; scheduled_closes_at: string; };
type Intent = { id: string; status: string; privy_user_id: string; wallet_address: string };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!trustedOrigin(request)) return Response.json({ error: "Origin forbidden" }, { status: 403 });
  try {
    const userId = await privyUser(request);
    const { id } = await context.params;
    const { wallet, choice } = bodySchema.parse(await request.json());
    const calls = await db<DbCall[]>("hive_calls", `?id=eq.${encodeURIComponent(id)}&select=id,chain_call_id,status,opened_at,scheduled_closes_at`);
    const call = calls[0];
    if (!call || call.status !== "open") return Response.json({ error: "Call tidak terbuka" }, { status: 409 });
    const contract = contractConfig();
    const now = Date.now();
    const closesAt = await publicClient.readContract({ ...contract, functionName: "effectiveClosesAt", args: [call.chain_call_id] });
    if (now < Date.parse(call.opened_at) || now >= Number(closesAt) * 1000) return Response.json({ error: "Jendela pilihan telah tutup" }, { status: 409 });
    const prior = await db<Intent[]>("hive_choice_intents", `?call_id=eq.${encodeURIComponent(id)}&or=(privy_user_id.eq.${encodeURIComponent(userId)},wallet_address.eq.${wallet.toLowerCase()})&select=id,status,privy_user_id,wallet_address`);
    const retry = prior.length === 1 && prior[0].status === "prepared" && prior[0].privy_user_id === userId && prior[0].wallet_address === wallet.toLowerCase();
    if (prior.length && !retry) return Response.json({ error: "Satu akun atau wallet hanya boleh memilih sekali" }, { status: 409 });
    const dayAgo = new Date(now - 24 * 60 * 60_000).toISOString();
    const userRecent = await db<Intent[]>("hive_choice_intents", `?privy_user_id=eq.${encodeURIComponent(userId)}&created_at=gte.${encodeURIComponent(dayAgo)}&select=id`);
    if (!retry && userRecent.length >= 5) return Response.json({ error: "Batas 5 pilihan per akun per 24 jam" }, { status: 429 });
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
    const ipRecent = await db<Intent[]>("hive_choice_intents", `?client_ip=eq.${encodeURIComponent(ip)}&created_at=gte.${encodeURIComponent(dayAgo)}&select=id`);
    if (!retry && ipRecent.length >= 20) return Response.json({ error: "Batas pilihan dari jaringan ini tercapai" }, { status: 429 });
    const nonce = await publicClient.readContract({ ...contract, functionName: "nonces", args: [wallet as Hex] });
    const salt = `0x${randomBytes(32).toString("hex")}` as Hex;
    const commitment = keccak256(encodeAbiParameters(parseAbiParameters("string,uint256,address,bytes32,address,bool,uint256,bytes32"), ["HIVE_CHOICE_V2", BigInt(10143), contract.address, call.chain_call_id, wallet as Hex, choice, nonce, salt]));
    const authorizationDeadline = BigInt(Math.min(Number(closesAt), Math.floor(now / 1000) + 10 * 60));
    const digest = await publicClient.readContract({ ...contract, functionName: "authorizationDigest", args: [call.chain_call_id, commitment, wallet as Hex, nonce, authorizationDeadline] });
    const sealed = seal({ choice, salt });
    const inserted = await db<Intent[]>("hive_choice_intents", retry ? `?id=eq.${prior[0].id}&status=eq.prepared` : "", { method: retry ? "PATCH" : "POST", body: JSON.stringify({ call_id: id, privy_user_id: userId, wallet_address: wallet.toLowerCase(), client_ip: ip, sealed_choice: sealed, commitment_hash: commitment, authorization_digest: digest, nonce: nonce.toString(), authorization_deadline: authorizationDeadline.toString(), status: "prepared" }) });
    if (inserted.length !== 1) return Response.json({ error: "Pilihan sedang diproses" }, { status: 409 });
    return Response.json({ intentId: inserted[0].id, digest, commitment, chainId: 10143 });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return Response.json({ error: "Pilihan tidak valid" }, { status: 400 });
    return Response.json({ error: "Pilihan belum dapat disiapkan. Coba lagi." }, { status: 503 });
  }
}
