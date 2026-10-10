import "server-only";
import type { Content } from "@/lib/demo-data";

// Curated Shorts, reviewed by topic on 10 Oct 2026. Search results never flow
// directly into the feed. Public status, embedding, duration and portrait ratio
// are checked again from YouTube on each batch refresh.
const archivedVideos = [
  { id: "lQ2Q92QOK28", category: "Gaming" },
  { id: "Tqu4sAPVJ28", category: "Gaming" },
  { id: "XzKHvOVIviE", category: "Gaming" },
  { id: "3OQndqwcy4s", category: "Gaming" },
  { id: "0LK_pAFG1OA", category: "Gaming" },
  { id: "X15bum3zQII", category: "Gaming" },
  { id: "fDYgu-WRWSI", category: "Gaming" },
  { id: "rvIXz9uwquM", category: "Sports" },
  { id: "imgdpOw4zCk", category: "Sports" },
  { id: "hCzwv9RPLkE", category: "Sports" },
  { id: "t0O444z760w", category: "Sports" },
  { id: "2PjKQgzoKcM", category: "Sports" },
  { id: "k_MX7XMNgnE", category: "Sports" },
  { id: "hgbJPA86zD4", category: "Sports" },
  { id: "Fl58CntwZ7E", category: "Crypto" },
  { id: "mdwBl4YrR9g", category: "Crypto" },
  { id: "WWzksrd21UQ", category: "Crypto" },
  { id: "_XXbjxLjW-E", category: "Crypto" },
  { id: "Y1JDo0idA7I", category: "Crypto" },
  { id: "R-1x0DPMgkE", category: "Crypto" },
] as const;

export const curatedVideos = [
  {
    "id": "8Vfwbvbrc7Q",
    "category": "Gaming"
  },
  {
    "id": "8RIlUZrGUBk",
    "category": "Gaming"
  },
  {
    "id": "nwlSVobPYsI",
    "category": "Gaming"
  },
  {
    "id": "Cm3ct-lwtTg",
    "category": "Gaming"
  },
  {
    "id": "sohv0uEmyDQ",
    "category": "Gaming"
  },
  {
    "id": "Qz0Cgu4K1NQ",
    "category": "Gaming"
  },
  {
    "id": "o-rr1gLpCoQ",
    "category": "Gaming"
  },
  {
    "id": "eHhWGCgcQPY",
    "category": "Sports"
  },
  {
    "id": "77igIAgeIEU",
    "category": "Sports"
  },
  {
    "id": "FGuPztow5XM",
    "category": "Sports"
  },
  {
    "id": "EPtfUG6KSIA",
    "category": "Sports"
  },
  {
    "id": "jFCnv8DnC8k",
    "category": "Sports"
  },
  {
    "id": "p9WgPWt_L9Y",
    "category": "Sports"
  },
  {
    "id": "Byvn9vLHwEg",
    "category": "Sports"
  },
  {
    "id": "9sakjIQBdrw",
    "category": "Crypto"
  },
  {
    "id": "riutrRkRdjg",
    "category": "Crypto"
  },
  {
    "id": "8Kc98IZonCM",
    "category": "Crypto"
  },
  {
    "id": "IcbtqlJp2wY",
    "category": "Crypto"
  },
  {
    "id": "2GACq4HKrXA",
    "category": "Crypto"
  },
  {
    "id": "d26Jfj-3X0k",
    "category": "Crypto"
  }
] as const;
const trackedVideos = [...curatedVideos, ...archivedVideos];

type YoutubeItem = {
  id: string;
  snippet?: { publishedAt?: string; title?: string; channelTitle?: string; channelId?: string; description?: string };
  status?: { embeddable?: boolean; privacyStatus?: string };
  contentDetails?: { duration?: string };
  player?: { embedWidth?: string | number; embedHeight?: string | number };
  statistics?: { viewCount?: string };
};

export type YoutubeFeedItem = Content & {
  video: { provider: "youtube"; videoId: string; sourceUrl: string; hasAudio: true };
  youtubeViews: number;
  observedAt: string;
};

export function isCuratedYoutubeVideo(id: string): boolean {
  return curatedVideos.some((video) => video.id === id);
}

// One batch serves all viewers; polling must not spend one API request per clip.
type SharedFeed = { cache?: { items: YoutubeFeedItem[]; expiresAt: number }; request?: Promise<YoutubeFeedItem[]> };
// Instrumentation, route handlers and server pages can have separate webpack
// module instances. Share one batch/cache across those instances on the Node host.
const sharedHost = globalThis as typeof globalThis & { __vibeYoutubeFeedCache?: SharedFeed };

export async function getYoutubeFeed(): Promise<YoutubeFeedItem[]> {
  return (await getYoutubeCallObservations()).filter(item => isCuratedYoutubeVideo(item.video.videoId));
}

export async function getYoutubeCallObservations(): Promise<YoutubeFeedItem[]> {
  const shared = sharedHost.__vibeYoutubeFeedCache ??= {};
  if (shared.cache && Date.now() < shared.cache.expiresAt) return shared.cache.items;
  if (shared.request) return shared.request;
  const startedAt = Date.now();
  shared.request = fetchYoutubeFeed().then((items) => {
    shared.cache = { items, expiresAt: items.length ? startedAt + 30_000 : Date.now() + 5_000 };
    return items;
  }).finally(() => { shared.request = undefined; });
  return shared.request;
}

async function fetchYoutubeFeed(): Promise<YoutubeFeedItem[]> {
  const key = process.env.YOUTUBE_API_KEY;
  if (!key) return [];

  try {
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,status,contentDetails,statistics,player");
    url.searchParams.set("maxWidth", "1080");
    url.searchParams.set("id", trackedVideos.map((video) => video.id).join(","));
    const response = await fetch(url, {
      headers: { "x-goog-api-key": key },
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    if (!response.ok) return [];
    const payload = (await response.json()) as { items?: YoutubeItem[] };
    const observedAt = new Date().toISOString();
    const byId = new Map((payload.items ?? []).map((item) => [item.id, item]));

    return trackedVideos.flatMap(({ id, category }) => {
      const item = byId.get(id);
      const views = Number(item?.statistics?.viewCount);
      const duration = item?.contentDetails?.duration?.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/);
      const seconds = duration ? Number(duration[1] ?? 0) * 3600 + Number(duration[2] ?? 0) * 60 + Number(duration[3] ?? 0) : 0;
      const width = Number(item?.player?.embedWidth);
      const height = Number(item?.player?.embedHeight);
      if (!item?.snippet?.title || !item.snippet.channelTitle ||
          item.status?.embeddable !== true || item.status?.privacyStatus !== "public" ||
          seconds <= 0 || seconds > 180 || !Number.isFinite(width) || !Number.isFinite(height) ||
          width <= 0 || height / width < 1.5 ||
          !Number.isSafeInteger(views) || views < 0) return [];

      const sourceUrl = `https://www.youtube.com/shorts/${id}`;
      return [{
        id: `youtube-${id}`,
        creator: item.snippet.channelTitle,
        handle: "YouTube Shorts",
        title: item.snippet.title,
        description: `${category} Shorts by ${item.snippet.channelTitle}. Views from YouTube.`,
        category: `${category} · YouTube Shorts`,
        kind: "insight" as const,
        visual: category === "Sports" ? "blue" as const : category === "Crypto" ? "green" as const : "purple" as const,
        minutes: 0,
        video: { provider: "youtube" as const, videoId: id, sourceUrl, hasAudio: true as const },
        youtubeViews: views,
        observedAt,
      }];
    });
  } catch {
    return [];
  }
}
