import { afterEach, beforeEach, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ db: vi.fn(), user: vi.fn(), read: vi.fn(), seal: vi.fn(), transaction: vi.fn() }));
vi.mock("@/lib/server/live", () => ({ db: mock.db, privyUser: mock.user, publicClient: { readContract: mock.read }, contractConfig: () => ({ address: "0x" + "1".repeat(40) }), seal: mock.seal, operatorTransaction: mock.transaction, verifyCommitSignature: async () => true }));
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://vibe.example"); mock.user.mockResolvedValue("did:privy:a"); mock.seal.mockReturnValue("encrypted"); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });
const context = { params: Promise.resolve({ id: "call" }) };

it("keeps another user's choice private and never returns encrypted choices", async () => {
  mock.db.mockResolvedValueOnce([{ id: "call", content_id: "content" }]).mockResolvedValueOnce([{ title: "Short" }]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "intent", status: "locked", commit_tx_hash: "0xtx" }]);
  const { GET } = await import("@/app/api/live/calls/[id]/route");
  const response = await GET(new Request("https://vibe.example/api/live/calls/call", { headers: { authorization: "Bearer token" } }), context);
  expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("private, no-store");
  expect(mock.db.mock.calls[3][1]).toContain("privy_user_id=eq.did%3Aprivy%3Aa");
  expect(mock.db.mock.calls[3][1]).not.toContain("sealed_choice");
});

it("rejects foreign origins before preparing a sponsored transaction", async () => {
  const { POST } = await import("@/app/api/live/calls/[id]/prepare/route");
  const response = await POST(new Request("https://vibe.example/api/live/calls/call/prepare", { method: "POST", headers: { origin: "https://foreign.example" } }), context);
  expect(response.status).toBe(403); expect(mock.user).not.toHaveBeenCalled(); expect(mock.db).not.toHaveBeenCalled();
});

it("lets a cancelled wallet signature be prepared again without another intent", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T01:00:00Z"));
  const wallet = "0x" + "2".repeat(40);
  mock.db.mockResolvedValueOnce([{ id: "call", status: "open", chain_call_id: "0x" + "3".repeat(64), opened_at: "2026-10-10T00:00:00Z" }]).mockResolvedValueOnce([{ id: "existing", status: "prepared", privy_user_id: "did:privy:a", wallet_address: wallet }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]).mockResolvedValueOnce([{ id: "existing" }]);
  mock.read.mockResolvedValueOnce(BigInt(Date.parse("2026-10-10T01:30:00Z") / 1000)).mockResolvedValueOnce(0n).mockResolvedValueOnce("0xdigest");
  const { POST } = await import("@/app/api/live/calls/[id]/prepare/route");
  const response = await POST(new Request("https://vibe.example/api/live/calls/call/prepare", { method: "POST", headers: { origin: "https://vibe.example", "content-type": "application/json" }, body: JSON.stringify({ wallet, choice: false }) }), context);
  expect(response.status).toBe(200); expect((await response.json()).intentId).toBe("existing");
  expect(mock.db.mock.calls[4][1]).toContain("id=eq.existing&status=eq.prepared");
  expect(mock.db.mock.calls[4][2].method).toBe("PATCH");
});

it("does not broadcast an old signature when another tab replaces the prepared choice", async () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-10T01:00:00Z"));
  mock.db.mockResolvedValueOnce([{ id: "intent", call_id: "call", privy_user_id: "did:privy:a", wallet_address: "0x" + "2".repeat(40), status: "prepared", commitment_hash: "0xold", authorization_digest: "0xdigest" }]).mockResolvedValueOnce([{ chain_call_id: "0xcall" }]).mockResolvedValueOnce([]).mockResolvedValueOnce([]);
  mock.read.mockResolvedValueOnce(BigInt(Date.parse("2026-10-10T01:30:00Z") / 1000));
  const { POST } = await import("@/app/api/live/intents/[id]/submit/route");
  const response = await POST(new Request("https://vibe.example/api/live/intents/intent/submit", { method: "POST", headers: { origin: "https://vibe.example", "content-type": "application/json" }, body: JSON.stringify({ signature: "0x" + "1".repeat(130) }) }), context);
  expect(response.status).toBe(409); expect(mock.db.mock.calls[3][1]).toContain("commitment_hash=eq.0xold"); expect(mock.transaction).not.toHaveBeenCalled();
});
