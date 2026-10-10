import { HiveApp } from "@/components/hive-app";
import { getYoutubeFeed } from "@/lib/server/youtube";
import { orderFeedForCalls } from "@/lib/server/vibe";
import { vibeStore } from "@/lib/server/vibe-store";

export default async function Page({ searchParams }: { searchParams: Promise<{ video?: string | string[] }> }) {
  const query = await searchParams;
  const initialVideoId = Array.isArray(query.video) ? query.video[0] : query.video;
  const youtubeFeed = await orderFeedForCalls(await getYoutubeFeed());
  let uploads: import("@/lib/source-calls").UploadedContent[] = [];
  try { uploads = [...((await vibeStore().read()).uploads ?? [])].reverse().slice(0, 100); } catch { /* Keep the curated feed available while storage is offline. */ }
  return <HiveApp initialVideoId={initialVideoId} youtubeFeed={youtubeFeed} uploads={uploads} />;
}
