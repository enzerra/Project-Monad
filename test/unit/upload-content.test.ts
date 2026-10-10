import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
const saved = vi.hoisted(() => ({ uploads: [] as unknown[] }));
vi.mock("../../src/lib/server/auth", () => ({ AuthError: class AuthError extends Error {}, privyUser: async () => "did:privy:creator" }));
vi.mock("../../src/lib/server/database", () => ({ required: (name: string) => name === "SUPABASE_URL" ? "https://test.supabase.co" : "test-key", supabaseConfigured: () => true }));
vi.mock("../../src/lib/server/vibe-store", () => ({ vibeStore: () => ({ read: async () => ({ uploads: saved.uploads }), transaction: async (transition: (state: { uploads: unknown[] }) => void) => transition(saved) }) }));

const mp4 = new Uint8Array([0, 0, 0, 8, 102, 116, 121, 112, 0, 0, 0, 0]);
function uploadRequest(hashtags: string) {
  const data = new FormData();
  data.append("video", new File([mp4], "clip.mp4", { type: "video/mp4" }));
  data.append("title", "Momen terakhir"); data.append("caption", "Cuplikan penentu kemenangan.");
  data.append("category", "Sports"); data.append("hashtags", hashtags); data.append("creator", "Nadia");
  return new Request("http://localhost:3000/api/uploads", { method: "POST", headers: { origin: "http://localhost:3000" }, body: data });
}

describe("unggahan video pengguna", () => {
  beforeEach(() => { saved.uploads = []; vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
    if (url.endsWith("/bucket/vibe-uploads")) return Response.json({ id: "vibe-uploads" });
    if (init?.method === "POST" && url.includes("/object/vibe-uploads/")) return Response.json({ Key: "clip.mp4" });
    return Response.json({}, { status: 404 });
  })); });
  it("menyimpan caption dan hashtag terkurasi bersama video untuk Discover", async () => {
    const { POST, GET } = await import("../../src/app/api/uploads/route");
    const response = await POST(uploadRequest("#Sports #Final"));
    expect(response.status).toBe(201);
    const { upload } = await response.json();
    expect(upload).toMatchObject({ ownerId: "did:privy:creator", description: "Cuplikan penentu kemenangan.", hashtags: ["sports", "final"], category: "Sports" });
    expect((await (await GET()).json()).uploads[0].id).toBe(upload.id);
  });
  it("menolak hashtag duplikat sebelum mengirim video ke Storage", async () => {
    const { POST } = await import("../../src/app/api/uploads/route");
    expect((await POST(uploadRequest("#sports #Sports"))).status).toBe(400);
    expect(saved.uploads).toHaveLength(0);
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).includes("/object/"))).toBe(false);
  });
});
