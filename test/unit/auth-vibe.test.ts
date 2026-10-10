import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateKeyPair, exportSPKI, SignJWT } from "jose";
import { NextRequest } from "next/server";
import { CALIBRATION_MS } from "../../src/lib/source-calls";

vi.mock("server-only", () => ({}));
vi.mock("../../src/lib/server/football", () => ({ getFootballObservations: async () => [] }));
const source = vi.hoisted(() => ({ views: 1000 }));
const writeProfile = vi.hoisted(() => vi.fn(async () => []));
vi.mock("../../src/lib/server/database", () => ({ db: writeProfile, supabaseConfigured: () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY) }));
vi.mock("../../src/lib/server/youtube", () => ({ curatedVideos: [{ id: "test", category: "Gaming" }], getYoutubeCallObservations: async () => [{ id: "youtube-test", creator: "Creator", title: "Shorts", handle: "YouTube", description: "Source", category: "Gaming", kind: "insight", visual: "purple", minutes: 0, video: { provider: "youtube", videoId: "test", sourceUrl: "https://www.youtube.com/shorts/test", hasAudio: true }, youtubeViews: source.views, observedAt: new Date().toISOString() }] }));
vi.mock("../../src/lib/server/vibe-store", async (original) => {
  const { VibeStore } = await original<typeof import("../../src/lib/server/vibe-store")>();
  let store: InstanceType<typeof VibeStore>;
  return { vibeStore: () => store, resetStore: () => { store = new VibeStore(":memory:"); } };
});

let keys: Awaited<ReturnType<typeof generateKeyPair>>;
beforeEach(async () => {
  vi.resetModules(); vi.clearAllMocks(); vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-06T00:00:00Z"));
  source.views = 1000;
  keys = await generateKeyPair("ES256", { extractable: true });
  vi.stubEnv("NEXT_PUBLIC_PRIVY_APP_ID", "test-app");
  vi.stubEnv("PRIVY_VERIFICATION_KEY", await exportSPKI(keys.publicKey));
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "test-server-key");
  const backend = await import("../../src/lib/server/vibe-store") as unknown as { resetStore(): void };
  backend.resetStore();
});
afterEach(async () => {
  const { vibeStore } = await import("../../src/lib/server/vibe-store"); vibeStore().close();
  vi.useRealTimers(); vi.unstubAllEnvs();
});
const token = (user: string, overrides: { audience?: string; expires?: number } = {}) => new SignJWT({}).setProtectedHeader({ alg: "ES256" }).setSubject(`did:privy:${user}`).setIssuer("privy.io").setAudience(overrides.audience ?? "test-app").setIssuedAt().setExpirationTime(overrides.expires ?? Math.floor(Date.now() / 1000) + 3600).sign(keys.privateKey);
function request(method: string, accessToken = "", body?: unknown, cookie = "") {
  return new NextRequest("http://localhost:3000/api/vibe", { method, headers: { origin: "http://localhost:3000", cookie, ...(accessToken ? { authorization: `Bearer ${accessToken}` } : {}), "content-type": "application/json" }, ...(body ? { body: JSON.stringify(body) } : {}) });
}

describe("Privy account integration", () => {
  it("allows public browsing without minting credits; rejects anonymous and invalid-token choices", async () => {
    const { GET, POST } = await import("../../src/app/api/vibe/route");
    const guest = await GET(request("GET")); const data = await guest.json();
    expect(data.wallet.entries).toEqual([]); expect(data.accountId).toBeNull();
    expect(guest.headers.get("set-cookie")).toBeNull();
    expect((await POST(request("POST", "", { callId: "call", choice: "yes", amount: 50 }, `vibe-session=${"a".repeat(64)}`))).status).toBe(401);
    for (const invalid of ["forged", await token("a", { audience: "other-app" }), await token("a", { expires: Math.floor(Date.now() / 1000) - 60 })]) {
      expect((await GET(request("GET", invalid))).status).toBe(401);
    }
  });
  it("uses the verified DID across devices and isolates a second user's balance", async () => {
    const { GET, POST } = await import("../../src/app/api/vibe/route");
    const a = await token("a"); const b = await token("b");
    await GET(request("GET", a));
    vi.setSystemTime(Date.now() + CALIBRATION_MS); source.views = 1100;
    const account = await (await GET(request("GET", a))).json();
    const choice = { callId: account.calls[0].id, choice: "yes", amount: 50 };
    const attempts = await Promise.all([POST(request("POST", a, choice)), POST(request("POST", a, choice))]);
    expect(attempts.map((item) => item.status).sort()).toEqual([200, 409]);
    const deviceB = await (await GET(request("GET", a, undefined, "vibe-session=different-device"))).json();
    expect(deviceB.accountId).toBe("did:privy:a");
    expect(deviceB.wallet.entries.reduce((total: number, entry: { amount: number }) => total + entry.amount, 0)).toBe(950);
    expect(deviceB.wallet.choices).toHaveLength(1);
    const other = await (await GET(request("GET", b))).json();
    expect(other.wallet.entries).toHaveLength(1); expect(other.wallet.choices).toHaveLength(0);
    const repeat = await (await GET(request("GET", a))).json();
    expect(repeat.wallet.entries.filter((entry: { kind: string }) => entry.kind === "welcome")).toHaveLength(1);
  });
  it("syncs only the verified user, validates metadata, and hides database errors", async () => {
    const { POST } = await import("../../src/app/api/auth/sync/route");
    const a = await token("a");
    expect((await POST(request("POST", "", { name: "Name" }))).status).toBe(401);
    expect((await POST(request("POST", a, { name: "Name", privy_user_id: "did:privy:victim" }))).status).toBe(400);
    const result = await POST(request("POST", a, { email: "a@example.com", name: "Name", walletAddress: "0x" + "A".repeat(40) }));
    expect(result.status).toBe(200);
    expect(await result.json()).toEqual({ success: true, userId: "did:privy:a" });
    expect(writeProfile).toHaveBeenCalledTimes(1);
    const saved = JSON.parse((writeProfile.mock.calls[0] as unknown as [string, string, RequestInit])[2].body as string);
    expect(saved.privy_user_id).toBe("did:privy:a"); expect(saved.wallet_address).toBe("0x" + "a".repeat(40));
    writeProfile.mockRejectedValueOnce(new Error("sensitive-service-key-and-db-details"));
    const failed = await POST(request("POST", a, { name: "Name" }));
    expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("sensitive");
    vi.stubEnv("SUPABASE_URL", "");
    expect((await POST(request("POST", a, {}))).status).toBe(503);
  });
  it("reports incomplete verification config instead of accepting a forged identity", async () => {
    const { GET } = await import("../../src/app/api/vibe/route");
    vi.stubEnv("PRIVY_VERIFICATION_KEY", "");
    expect((await GET(request("GET", "forged"))).status).toBe(503);
  });
});
