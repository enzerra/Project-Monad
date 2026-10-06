import { getYoutubeFeed, isCuratedYoutubeVideo } from "@/lib/server/youtube";

export const runtime = "nodejs";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const headers = { "Cache-Control": "no-store" };
  if (!isCuratedYoutubeVideo(id)) {
    return Response.json({ error: "Video not found" }, { status: 404, headers });
  }
  const video = (await getYoutubeFeed()).find((item) => item.video.videoId === id);
  if (!video) {
    return Response.json({ error: "Views unavailable" }, { status: 503, headers });
  }
  return Response.json({ videoId: id, views: video.youtubeViews, observedAt: video.observedAt }, { headers });
}
