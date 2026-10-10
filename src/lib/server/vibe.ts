import "server-only";
import { createHash } from "node:crypto";
import { observeSource, SAMPLE_INTERVAL_MS } from "@/lib/source-calls";
import { getYoutubeCallObservations, curatedVideos, type YoutubeFeedItem } from "@/lib/server/youtube";
import { getFootballObservations } from "@/lib/server/football";
import { observeFootball } from "@/lib/football-calls";
import { vibeStore } from "@/lib/server/vibe-store";

const hash = (value: string) => createHash("sha256").update(value).digest("hex");
let running: Promise<void> | undefined;
export async function refreshSourceCalls(): Promise<void> {
  if (running) return running;
  running = (async () => {
    const [feed, football] = await Promise.all([getYoutubeCallObservations(), getFootballObservations()]);
    const now = Date.now();
    await vibeStore().transaction((state) => {
      observeSource(state, feed, now, hash, new Set(curatedVideos.map(video => video.id)));
      observeFootball(state, football, now, hash);
    });
  })().finally(() => { running = undefined; });
  return running;
}

export function startSourceWorker() {
  // A persistent Node server collects and settles even when the browser is closed.
  // In production use a persistent volume and one Node host, not a serverless timer.
  const shared = globalThis as typeof globalThis & { vibeWorker?: ReturnType<typeof setInterval> };
  if (shared.vibeWorker) clearInterval(shared.vibeWorker);
  const tick = () => { void refreshSourceCalls().catch(() => console.error("VIBE source check failed; balances and last observations preserved.")); };
  tick();
  shared.vibeWorker = setInterval(tick, SAMPLE_INTERVAL_MS);
  shared.vibeWorker.unref();
}

export function sessionId(token: string) { return hash(token); }

export async function orderFeedForCalls(feed: YoutubeFeedItem[]): Promise<YoutubeFeedItem[]> {
  try {
    const active = (await vibeStore().read()).calls.filter((call) => call.status === "open").map((call) => call.contentId);
    return [...feed].sort((a, b) => Number(active.includes(b.id)) - Number(active.includes(a.id)));
  } catch { return feed; }
}
