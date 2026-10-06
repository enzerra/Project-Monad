import { z } from "zod";
import { type Hex } from "viem";
import { contractConfig, db, operatorWallet, privyUser, publicClient, verifyCommitSignature } from "@/lib/server/live";

export const runtime = "nodejs";
type Intent = { id: string; call_id: string; privy_user_id: string; wallet_address: Hex; commitment_hash: Hex; authorization_digest: Hex; nonce: string; authorization_deadline: string; status: string };
type DbCall = { chain_call_id: Hex };

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const userId = await privyUser(request);
    const { id } = await context.params;
    const { signature } = z.object({ signature: z.string().regex(/^0x[a-fA-F0-9]{130}$/) }).parse(await request.json());
    const intents = await db<Intent[]>("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}&select=*`);
    const intent = intents[0];
    if (!intent || intent.privy_user_id !== userId || intent.status !== "prepared") return Response.json({ error: "Intent tidak tersedia" }, { status: 409 });
    if (!(await verifyCommitSignature(intent.authorization_digest, intent.wallet_address, signature as Hex))) return Response.json({ error: "Tanda tangan wallet tidak valid" }, { status: 400 });
    const calls = await db<DbCall[]>("hive_calls", `?id=eq.${encodeURIComponent(intent.call_id)}&select=chain_call_id`);
    const contract = contractConfig();
    const closesAt = await publicClient.readContract({ ...contract, functionName: "effectiveClosesAt", args: [calls[0].chain_call_id] });
    if (Date.now() >= Number(closesAt) * 1000) return Response.json({ error: "Jendela pilihan telah tutup" }, { status: 409 });
    const dayAgo = new Date(Date.now() - 24 * 60 * 60_000).toISOString();
    const daily = await db<Intent[]>("hive_choice_intents", `?status=in.(submitting,locked,revealed,unrevealed)&created_at=gte.${encodeURIComponent(dayAgo)}&select=id`);
    if (daily.length >= Number(process.env.MAX_DAILY_COMMITS ?? 50)) return Response.json({ error: "Plafon gas harian VIBE tercapai" }, { status: 429 });
    const claimed = await db<Intent[]>("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}&status=eq.prepared`, { method: "PATCH", body: JSON.stringify({ status: "submitting" }) });
    if (claimed.length !== 1) return Response.json({ error: "Pilihan sedang diproses" }, { status: 409 });
    const wallet = operatorWallet();
    const hash = await wallet.writeContract({ ...contract, functionName: "commit", args: [calls[0].chain_call_id, intent.commitment_hash, intent.wallet_address, BigInt(intent.nonce), BigInt(intent.authorization_deadline), signature as Hex], gas: BigInt(200000) });
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    await db("hive_choice_intents", `?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify({ status: receipt.status === "success" ? "locked" : "failed", commit_tx_hash: hash }) });
    if (receipt.status !== "success") throw new Error("Commit ditolak oleh kontrak");
    return Response.json({ status: "locked", txHash: hash, explorerUrl: `https://testnet.monadscan.com/tx/${hash}` });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Commit gagal" }, { status: 400 });
  }
}
