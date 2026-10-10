import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

const clip = (id = "8Vfwbvbrc7Q", views = "1234") => ({
  id, snippet: { title: "Clip", channelTitle: "Creator" },
  status: { embeddable: true, privacyStatus: "public" }, statistics: { viewCount: views },
  contentDetails: { duration: "PT25S" }, player: { embedWidth: "1080", embedHeight: "1920" },
});

describe("YouTube views", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubGlobal("__vibeYoutubeFeedCache", undefined);
    vi.stubEnv("YOUTUBE_API_KEY", "test-only-key");
  });
  afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

  it("keeps archived views observable for existing Calls without returning old videos in Discover", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({items:[clip(),clip("lQ2Q92QOK28")]})));
    const {getYoutubeFeed,getYoutubeCallObservations}=await import("../../src/lib/server/youtube");
    expect((await getYoutubeFeed()).map(item=>item.video.videoId)).toEqual(["8Vfwbvbrc7Q"]);
    expect((await getYoutubeCallObservations()).map(item=>item.video.videoId)).toEqual(["8Vfwbvbrc7Q","lQ2Q92QOK28"]);
  });

  it("batches concurrent requests and preserves the observation time within the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({ items: [clip()] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getYoutubeFeed } = await import("../../src/lib/server/youtube");
    const [first, second] = await Promise.all([getYoutubeFeed(), getYoutubeFeed()]);
    expect(first[0].youtubeViews).toBe(1234);
    expect(second).toEqual(first);
    expect(await getYoutubeFeed()).toEqual(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refreshes actual counts after the shared cache expires", async () => {
    let now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json({ items: [clip()] }))
      .mockResolvedValueOnce(Response.json({ items: [clip("8Vfwbvbrc7Q", "1250")] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getYoutubeFeed } = await import("../../src/lib/server/youtube");
    await getYoutubeFeed();
    now += 30_001;
    expect((await getYoutubeFeed())[0].youtubeViews).toBe(1250);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("does not invent counts for unavailable or invalid videos", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [
      clip("8Vfwbvbrc7Q", "invalid"),
      { ...clip("8RIlUZrGUBk"), status: { embeddable: false, privacyStatus: "public" } },
    ] })));
    const { getYoutubeFeed } = await import("../../src/lib/server/youtube");
    expect(await getYoutubeFeed()).toEqual([]);
  });

  it("recovers after an API failure without caching a fabricated zero", async () => {
    let now = 1_800_000_000_000;
    vi.spyOn(Date, "now").mockImplementation(() => now);
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("offline"))
      .mockResolvedValueOnce(Response.json({ items: [clip()] }));
    vi.stubGlobal("fetch", fetchMock);
    const { getYoutubeFeed, isCuratedYoutubeVideo } = await import("../../src/lib/server/youtube");
    expect(isCuratedYoutubeVideo("invalid")).toBe(false);
    expect(await getYoutubeFeed()).toEqual([]);
    now += 5_001;
    expect((await getYoutubeFeed())[0].youtubeViews).toBe(1234);
  });

  it("rejects horizontal, square and long videos rather than treating every short clip as Shorts", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json({ items: [
      clip(),
      { ...clip("8RIlUZrGUBk"), player: { embedWidth: "1080", embedHeight: "608" } },
      { ...clip("nwlSVobPYsI"), player: { embedWidth: "1080", embedHeight: "1080" } },
      { ...clip("Cm3ct-lwtTg"), contentDetails: { duration: "PT3M1S" } },
      { ...clip("sohv0uEmyDQ"), player: undefined },
    ] })));
    const { getYoutubeFeed } = await import("../../src/lib/server/youtube");
    expect((await getYoutubeFeed()).map((video) => video.video.videoId)).toEqual(["8Vfwbvbrc7Q"]);
  });
});
