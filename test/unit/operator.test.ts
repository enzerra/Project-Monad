import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
vi.mock("server-only", () => ({}));
const mock = vi.hoisted(() => ({ db: vi.fn(), read: vi.fn(), transaction: vi.fn(), block: vi.fn() }));
vi.mock("@/lib/server/live", () => ({ db: mock.db, publicClient: { readContract: mock.read, getBlock: mock.block }, contractConfig: () => ({}), operatorTransaction: mock.transaction, required: () => "test", sha256Hex: () => "0xhash", unseal: () => ({ choice: true, salt: "0xsalt" }) }));
const call = { id: "call", chain_call_id: "0xcall", content_id: "content", baseline_views: 100, target_views: 200, scheduled_closes_at: "2026-10-10T01:30:00Z", reveal_deadline: "2026-10-10T02:30:00Z", evaluation_at: "2026-10-10T06:00:00Z" };
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mock.db.mockResolvedValue([]); mock.block.mockResolvedValue({ timestamp: BigInt(Date.parse("2026-10-10T02:00:00Z") / 1000) }); });
afterEach(() => { vi.unstubAllGlobals(); });

describe("Monad keeper", () => {
  it("shares an overlapping tick instead of sending duplicate transactions", async () => {
    let release!: (value: unknown[]) => void;
    mock.db.mockImplementationOnce(() => new Promise((resolve) => { release = resolve; }));
    const { runOperatorTick } = await import("@/lib/server/operator");
    const first = runOperatorTick(); const second = runOperatorTick();
    expect(second).toBe(first); release([]); await first;
    expect(mock.db).toHaveBeenCalledTimes(1);
  });
  it("recovers a reveal mined before a database outage without revealing twice", async () => {
    mock.db.mockImplementation(async (table, query) => table === "hive_calls" && query.includes("select=*") ? [call] : table === "hive_choice_intents" && query.includes("status=eq.locked") ? [{ id: "intent", wallet_address: "0xwallet", sealed_choice: "sealed" }] : []);
    mock.read.mockImplementation(async ({ functionName }) => functionName === "calls" ? Array(16).fill(0) : functionName === "effectiveClosesAt" ? BigInt(Date.parse(call.scheduled_closes_at) / 1000) : ["0xcommitment", 0, 0, true, true]);
    const { runOperatorTick } = await import("@/lib/server/operator");
    expect((await runOperatorTick()).results[0].result).toBe("revealed 1");
    expect(mock.transaction).not.toHaveBeenCalled();
    expect(mock.db.mock.calls.some(([, , init]) => init?.body === JSON.stringify({ status: "revealed" }))).toBe(true);
  });
  it("restores a resolved Call from chain without sending another result", async () => {
    mock.db.mockResolvedValueOnce([call]);
    const chainCall = Array(16).fill(0); chainCall[11] = 2; chainCall[13] = 230n; chainCall[14] = "0xresult";
    mock.read.mockResolvedValue(chainCall);
    const { runOperatorTick } = await import("@/lib/server/operator");
    expect((await runOperatorTick()).results[0].result).toBe("reconciled resolved");
    expect(mock.transaction).not.toHaveBeenCalled();
    expect(mock.db.mock.calls[1][2].body).toContain('"result_views":230');
  });
  it("voids a missed observation window instead of using late views", async () => {
    mock.block.mockResolvedValue({ timestamp: BigInt(Date.parse("2026-10-10T06:31:00Z") / 1000) });
    mock.db.mockResolvedValueOnce([call]); mock.read.mockImplementation(async ({ functionName }) => functionName === "calls" ? Array(16).fill(0) : BigInt(Date.parse(call.scheduled_closes_at) / 1000));
    mock.transaction.mockResolvedValue("0xtx");
    const { runOperatorTick } = await import("@/lib/server/operator");
    expect((await runOperatorTick()).results[0].result).toBe("void");
    expect(mock.transaction.mock.calls[0][0]).toBe("voidCall");
  });
});

it("serializes commits and keeper transactions and continues after failure", async () => {
  const { serializeOperator } = await import("@/lib/server/operator-queue");
  let release!: () => void; const order: string[] = [];
  const first = serializeOperator(async () => { order.push("commit"); await new Promise<void>((resolve) => { release = resolve; }); throw new Error("failed"); });
  const rejected = first.catch(() => undefined);
  const next = serializeOperator(async () => { order.push("reveal"); });
  await vi.waitFor(() => expect(order).toEqual(["commit"])); release(); await Promise.all([rejected, next]);
  expect(order).toEqual(["commit", "reveal"]);
});
