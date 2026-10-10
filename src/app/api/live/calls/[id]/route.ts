import { db, privyUser } from "@/lib/server/live";
import { AuthError } from "@/lib/server/auth";

export const runtime = "nodejs";
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const calls = await db<Record<string, unknown>[]>("hive_calls", `?id=eq.${encodeURIComponent(id)}&select=*`);
    if (!calls[0]) return Response.json({ error: "Call not found" }, { status: 404 });
    const call = calls[0];
    const contents = await db<Record<string, unknown>[]>("hive_contents", `?id=eq.${encodeURIComponent(String(call.content_id))}&select=id,video_id,title,creator,summary,source_url,kind`);
    const snapshots = await db<Record<string, unknown>[]>("hive_snapshots", `?call_id=eq.${encodeURIComponent(id)}&select=views,snapshot_hash,source,observed_at,purpose&order=observed_at.desc&limit=100`);
    let intent = null;
    if (request.headers.has("authorization")) {
      const userId = await privyUser(request);
      intent = (await db<Record<string, unknown>[]>("hive_choice_intents", `?call_id=eq.${encodeURIComponent(id)}&privy_user_id=eq.${encodeURIComponent(userId)}&select=id,status,commit_tx_hash,reveal_tx_hash`))[0] ?? null;
    }
    return Response.json({ call, content: contents[0], snapshots: snapshots.reverse(), intent }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof AuthError) return Response.json({ error: error.message }, { status: error.status });
    return Response.json({ error: "Live Call unavailable" }, { status: 503 });
  }
}
