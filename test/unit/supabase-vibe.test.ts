import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptySourceState, sourceAccount, type SourceState } from "../../src/lib/source-calls";
import { virtualBalance } from "../../src/lib/virtual-token";
vi.mock("server-only", () => ({}));

let state: SourceState | undefined;
let outage: boolean;
beforeEach(() => {
  vi.resetModules(); state = undefined; outage = false;
  vi.stubEnv("SUPABASE_URL", "https://test.supabase.co");
  vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "only-on-server");
  vi.stubGlobal("fetch", vi.fn(async (url: string, init: RequestInit) => {
    expect(new Headers(init.headers).get("apikey")).toBe("only-on-server");
    if (outage) return new Response("private database details", { status: 500 });
    if (url.includes("/rpc/")) {
      const input = JSON.parse(init.body as string);
      if (input.p_expected_revision !== (state?.revision ?? 0)) return Response.json(false);
      state = structuredClone(input.p_payload);
      return Response.json(true);
    }
    return Response.json(state ? [{ revision: state.revision, payload: structuredClone(state) }] : []);
  }));
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
describe("Supabase VIBE persistence", () => {
  it("retries concurrent transitions without losing either account or duplicating welcome", async () => {
    const { SupabaseVibeStore } = await import("../../src/lib/server/vibe-store");
    const first = new SupabaseVibeStore(), second = new SupabaseVibeStore();
    await Promise.all([first.transaction((value) => sourceAccount(value, "a", Date.now())), second.transaction((value) => sourceAccount(value, "b", Date.now()))]);
    expect(Object.keys(state!.wallets).sort()).toEqual(["a", "b"]);
    await second.transaction((value) => sourceAccount(value, "a", Date.now()));
    expect(state!.wallets.a.entries).toHaveLength(1); expect(virtualBalance(state!.wallets.a)).toBe(1000);
    expect((await new SupabaseVibeStore().read()).wallets.a).toEqual(state!.wallets.a);
  });
  it("does not commit a failed transition or fall back to SQLite during an outage", async () => {
    const { vibeStore, SupabaseVibeStore } = await import("../../src/lib/server/vibe-store");
    expect(vibeStore()).toBeInstanceOf(SupabaseVibeStore);
    await vibeStore().transaction((value) => { value.lastCheckedAt = "preserved"; });
    const previous = structuredClone(state);
    await expect(vibeStore().transaction((value) => { value.lastCheckedAt = "broken"; throw new Error("abort"); })).rejects.toThrow("abort");
    expect(state).toEqual(previous);
    outage = true;
    await expect(vibeStore().transaction(() => {})).rejects.toThrow("Database request failed (500)");
    expect(state).toEqual(previous);
  });
  it("rejects a corrupt ledger rather than granting a replacement balance", async () => {
    const { SupabaseVibeStore } = await import("../../src/lib/server/vibe-store");
    state = emptySourceState(); sourceAccount(state, "a", Date.now());
    state.wallets.a.entries[0].amount = 5000;
    await expect(new SupabaseVibeStore().read()).rejects.toThrow();
  });
  it("rejects partial Supabase configuration without choosing a local store", async () => {
    const { vibeStore } = await import("../../src/lib/server/vibe-store");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "");
    expect(() => vibeStore()).toThrow("complete Supabase configuration");
  });
});
