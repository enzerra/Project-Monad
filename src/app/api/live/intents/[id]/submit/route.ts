import { z } from "zod";
import { type Hex } from "viem";
import { contractConfig, db, operatorTransaction, privyUser, publicClient, verifyCommitSignature } from "@/lib/server/live";
import { AuthError } from "@/lib/server/auth";
import { trustedOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
type Intent = { id: string; call_id: string; privy_user_id: string; wallet_address: Hex; commitment_hash: Hex; authorization_digest: Hex; nonce: string; authorization_deadline: string; status: string };
type DbCall = { chain_call_id: Hex };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  if (!trustedOrigin(request)) return Response.json({ error: "Origin forbidden" }, { status: 403 });
  try {
    const userId = await privyUser(request);
    const { id } = await context.params;
    const { signature } = z.object({ signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/) }).parse(await request.json());
    const intents = await db<Intent[]>("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}&select=*`);
    const intent = intents[0];
    if (!intent || intent.privy_user_id !== userId || intent.status !== "prepared") return Response.json({ error: "Choice intent unavailable" }, { status: 409 });
    if (!(await verifyCommitSignature(intent.authorization_digest, intent.wallet_address, signature as Hex))) return Response.json({ error: "Invalid wallet signature" }, { status: 400 });
    const calls = await db<DbCall[]>("hive_calls", `?id=eq.${encodeURIComponent(intent.call_id)}&select=chain_call_id`);
    if (!calls[0]) return Response.json({ error: "Call unavailable" }, { status: 404 });
    const contract = contractConfig();
    const closesAt = await publicClient.readContract({ ...contract, functionName: "effectiveClosesAt", args: [calls[0].chain_call_id] });
    if (Date.now() >= Number(closesAt) * 1000) return Response.json({ error: "The entry window has closed" }, { status: 409 });
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const daily = await db<Intent[]>("hive_choice_intents", `?status=in.(submitting,locked,revealed,unrevealed)&created_at=gte.${encodeURIComponent(dayAgo)}&select=id`);
    if (daily.length >= Number(process.env.MAX_DAILY_COMMITS ?? 50)) return Response.json({ error: "VIBE daily gas limit reached" }, { status: 429 });
    const claimed = await db<Intent[]>("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}&status=eq.prepared&commitment_hash=eq.${intent.commitment_hash}`, { method: "PATCH", body: JSON.stringify({ status: "submitting" }) });
    if (claimed.length !== 1) return Response.json({ error: "Your choice is being processed" }, { status: 409 });
    const hash = await operatorTransaction("commit", [calls[0].chain_call_id, intent.commitment_hash, intent.wallet_address, BigInt(intent.nonce), BigInt(intent.authorization_deadline), signature as Hex], async (hash) => {
      await db("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ commit_tx_hash: hash }) });
    });
    await db("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: "locked", commit_tx_hash: hash }) });
    return Response.json({ status: "locked", txHash: hash, explorerUrl: `https://testnet.monadscan.com/tx/${hash}` });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    if (error instanceof z.ZodError) return Response.json({ error: "Invalid signature" }, { status: 400 });
    return Response.json({ error: "Confirmation pending. Check your choice status." }, { status: 503 });
  }
}
