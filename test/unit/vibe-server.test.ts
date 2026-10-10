import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { NextRequest } from "next/server";
import { CALIBRATION_MS } from "../../src/lib/source-calls";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/server/football", () => ({ getFootballObservations: async () => [] }));
const source = vi.hoisted(() => ({ views: 1000, available: true }));
vi.mock("../../src/lib/server/youtube", () => ({ curatedVideos: [{ id: "test", category: "Gaming" }], getYoutubeCallObservations: async () => source.available ? [{ id: "youtube-test", creator: "Creator", title: "Shorts", handle: "YouTube Shorts", description: "Source", category: "Gaming", kind: "insight", visual: "purple", minutes: 0, video: { provider: "youtube", videoId: "test", sourceUrl: "https://www.youtube.com/shorts/test", hasAudio: true }, youtubeViews: source.views, observedAt: new Date().toISOString() }] : [] }));

let directory: string;
beforeEach(() => {
  vi.resetModules();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-05T00:00:00Z"));
  source.views = 1000; source.available = true;
  directory = mkdtempSync(path.join(tmpdir(), "vibe-test-"));
  vi.stubEnv("VIBE_STORE_PATH", path.join(directory, "wallet.sqlite"));
});
afterEach(async () => {
  const { vibeStore } = await import("../../src/lib/server/vibe-store");
  vibeStore().close();
  vi.useRealTimers(); vi.unstubAllEnvs();
  rmSync(directory, { recursive: true, force: true });
});
const getRequest = (cookie = "") => new NextRequest("http://localhost:3000/api/vibe", { headers: { cookie } });
const postRequest = (cookie: string, body: unknown, origin = "http://localhost:3000") => new NextRequest("http://localhost:3000/api/vibe", { method: "POST", headers: { cookie, origin, "content-type": "application/json" }, body: JSON.stringify(body) });

describe("persistent server wallet API", () => {
  it("grants once, rejects untrusted input, and atomically charges concurrent duplicate posts", async () => {
    const { GET, POST } = await import("../../src/app/api/vibe/route");
    const initial = await GET(getRequest());
    const cookie = initial.headers.get("set-cookie")!.split(";")[0];
    expect(initial.headers.get("set-cookie")).toContain("HttpOnly");
    expect(initial.headers.get("cache-control")).toContain("no-store");
    expect((await initial.json()).wallet.entries).toHaveLength(1);
    vi.setSystemTime(Date.now() + CALIBRATION_MS);
    source.views = 1100;
    const account = await (await GET(getRequest(cookie))).json();
    const body = { callId: account.calls[0].id, choice: "yes", amount: 50 };
    expect((await POST(postRequest(cookie, body, "http://evil.test"))).status).toBe(403);
    expect((await POST(postRequest(cookie, { ...body, amount: 50.5 }))).status).toBe(400);
    expect((await POST(postRequest(cookie, { ...body, balance: 9000 }))).status).toBe(400);
    const attempts = await Promise.all([POST(postRequest(cookie, body)), POST(postRequest(cookie, body))]);
    expect(attempts.map((item) => item.status).sort()).toEqual([200, 409]);
    const current = await (await GET(getRequest(cookie))).json();
    expect(current.wallet.entries.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)).toBe(950);
    expect(current.wallet.choices).toHaveLength(1);
    expect(current.wallet.choices[0].status).toBe("locked");
    vi.setSystemTime(new Date(current.calls[0].evaluationAt)); source.views = current.calls[0].targetViews;
    const winner = await (await GET(getRequest(cookie))).json();
    const again = await (await GET(getRequest(cookie))).json();
    expect(winner.wallet.entries.reduce((sum: number, item: { amount: number }) => sum + item.amount, 0)).toBe(1050);
    expect(again.wallet.entries.filter((entry: { kind: string }) => entry.kind === "reward")).toHaveLength(1);
  });
  it("keeps independent sessions isolated and cannot place without an initialized session", async () => {
    const { GET, POST } = await import("../../src/app/api/vibe/route");
    expect((await POST(postRequest("", { callId: "anything", choice: "yes", amount: 50 }))).status).toBe(401);
    const first = await GET(getRequest()); const second = await GET(getRequest());
    expect(first.headers.get("set-cookie")).not.toBe(second.headers.get("set-cookie"));
    expect((await second.json()).wallet.choices).toHaveLength(0);
  });
  it("preserves balances on a source outage and rejects choices while views are stale", async () => {
    const { GET, POST } = await import("../../src/app/api/vibe/route");
    const initial = await GET(getRequest()); const cookie = initial.headers.get("set-cookie")!.split(";")[0];
    vi.setSystemTime(Date.now() + CALIBRATION_MS); source.views = 1100;
    const account = await (await GET(getRequest(cookie))).json();
    source.available = false; vi.setSystemTime(Date.now() + 90_001);
    const denied = await POST(postRequest(cookie, { callId: account.calls[0].id, choice: "yes", amount: 50 }));
    expect(denied.status).toBe(409);
    const current = await (await GET(getRequest(cookie))).json();
    expect(current.wallet.entries).toHaveLength(1);
    expect(current.calls[0].currentViews).toBe(1100);
  });
  it("persists across store reopen and rolls back failed transitions", async () => {
    const { VibeStore } = await import("../../src/lib/server/vibe-store");
    const filename = path.join(directory, "restart.sqlite");
    const first = new VibeStore(filename);
    first.transaction((state) => { state.lastCheckedAt = "saved"; });
    expect(() => first.transaction((state) => { state.lastCheckedAt = "broken"; throw new Error("failed write"); })).toThrow();
    first.close();
    const second = new VibeStore(filename);
    expect(second.transaction((state) => state.lastCheckedAt)).toBe("saved");
    second.close();
  });
});
