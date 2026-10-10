import { db } from "@/lib/server/live";

export const runtime = "nodejs";

export async function GET() {
  if (!process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS || !process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return Response.json({ calls: [], configured: false });
  try {
    const calls = await db<unknown[]>("hive_calls", "?select=id,content_id,chain_call_id,baseline_views,target_views,horizon_hours,opened_at,scheduled_closes_at,evaluation_at,reveal_deadline,status,result_views,result_snapshot_hash,create_tx_hash,resolve_tx_hash,void_reason,content:hive_contents(title,creator)&order=created_at.desc&limit=30");
    return Response.json({ calls, configured: true });
  } catch { return Response.json({ error: "Live Calls unavailable" }, { status: 503 }); }
}
