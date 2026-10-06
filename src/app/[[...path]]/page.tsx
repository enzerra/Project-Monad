import { HiveApp } from "@/components/hive-app";
import { getYoutubeFeed } from "@/lib/server/youtube";
import { orderFeedForCalls } from "@/lib/server/vibe";

export default async function Page({ searchParams }: { searchParams: Promise<{ video?: string | string[] }> }) {
  const query = await searchParams;
  const initialVideoId = Array.isArray(query.video) ? query.video[0] : query.video;
  const youtubeFeed = orderFeedForCalls(await getYoutubeFeed());
  return <HiveApp initialVideoId={initialVideoId} youtubeFeed={youtubeFeed} />;
}
