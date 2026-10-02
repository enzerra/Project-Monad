import { db } from "@/lib/server/live";

export const runtime = "nodejs";
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params;
    const calls = await db<Record<string, unknown>[]>("hive_calls", `?id=eq.${encodeURIComponent(id)}&select=*`);
    if (!calls[0]) return Response.json({ error: "Call tidak ditemukan" }, { status: 404 });
    const call = calls[0];
    const contents = await db<Record<string, unknown>[]>("hive_contents", `?id=eq.${encodeURIComponent(String(call.content_id))}&select=id,video_id,title,creator,summary,source_url,kind`);
    const snapshots = await db<Record<string, unknown>[]>("hive_snapshots", `?call_id=eq.${encodeURIComponent(id)}&select=views,snapshot_hash,source,observed_at,purpose&order=observed_at.asc`);
    return Response.json({ call, content: contents[0], snapshots });
  } catch { return Response.json({ error: "Live Call unavailable" }, { status: 503 }); }
}
