import { vibeStore } from "@/lib/server/vibe-store";

export const runtime = "nodejs";
export async function GET() {
  const headers = { "Cache-Control": "no-store" };
  try {
    const state = await vibeStore().read();
    const age = state.lastCheckedAt ? Date.now() - Date.parse(state.lastCheckedAt) : Infinity;
    return Response.json({ status: "ready", storage: "connected", source: age <= 90_000 ? "fresh" : "waiting", lastObservedAt: state.lastCheckedAt ?? null }, { headers });
  } catch { return Response.json({ status: "unavailable", storage: "unavailable" }, { status: 503, headers }); }
}
