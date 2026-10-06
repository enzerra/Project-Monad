import { describe, expect, it } from "vitest";
import { calls } from "../../src/lib/demo-data";
import { createVirtualWallet, placeVirtualChoice, readVirtualWallet, refundVoidChoices, validateVirtualAmount, virtualBalance } from "../../src/lib/virtual-token";

const now = "2026-10-04T10:00:00.000Z";
const call = { ...calls[0], status: "open" as const };

describe("virtual participation credits", () => {
  it("grants once and preserves balance after reload", () => {
    const initial = createVirtualWallet(now);
    const placed = placeVirtualChoice(initial, call, "yes", 100, now);
    expect(placed.result.ok).toBe(true);
    const restored = readVirtualWallet(JSON.stringify(placed.wallet), null, now);
    expect(virtualBalance(restored)).toBe(900);
    expect(restored.entries.filter((entry) => entry.kind === "welcome")).toHaveLength(1);
    expect(restored.choices[0].status).toBe("locked");
  });
  it("does not charge a duplicate choice", () => {
    const first = placeVirtualChoice(createVirtualWallet(now), call, "yes", 50, now);
    const duplicate = placeVirtualChoice(first.wallet, call, "no", 100, now);
    expect(duplicate.result.ok).toBe(false);
    expect(duplicate.wallet).toBe(first.wallet);
    expect(virtualBalance(duplicate.wallet)).toBe(950);
  });
  it.each([0, -10, 9, 501, 10.5, NaN, Infinity])("rejects invalid amount %s", (amount) => {
    expect(validateVirtualAmount(amount, 1000)).not.toBeNull();
    const initial = createVirtualWallet(now);
    expect(placeVirtualChoice(initial, call, "yes", amount, now).wallet).toBe(initial);
  });
  it("cannot spend beyond the balance", () => {
    let wallet = createVirtualWallet(now);
    for (const id of ["a", "b"]) wallet = placeVirtualChoice(wallet, { ...call, id }, "yes", 500, now).wallet;
    expect(virtualBalance(wallet)).toBe(0);
    const attempt = placeVirtualChoice(wallet, { ...call, id: "c" }, "yes", 10, now);
    expect(attempt.result.ok).toBe(false);
    expect(attempt.wallet).toBe(wallet);
  });
  it.each(["resolved", "void", "closed", "locked"] as const)("does not charge %s Calls", (status) => {
    expect(placeVirtualChoice(createVirtualWallet(now), { ...call, status }, "yes", 50, now).result.ok).toBe(false);
  });
  it("migrates existing choices without retroactive charges", () => {
    const legacy = JSON.stringify([{ callId: call.id, choice: "yes", status: "pending" }]);
    const wallet = readVirtualWallet(null, legacy, now);
    expect(virtualBalance(wallet)).toBe(1000);
    expect(wallet.choices[0]).toMatchObject({ amount: 0, status: "locked" });
    expect(placeVirtualChoice(wallet, call, "no", 50, now).result.ok).toBe(false);
  });
  it("refunds void once and never rewards a winning choice", () => {
    const placed = placeVirtualChoice(createVirtualWallet(now), call, "yes", 100, now).wallet;
    expect(virtualBalance(refundVoidChoices(placed, [{ ...call, status: "resolved", result: "yes" }], now))).toBe(900);
    const refunded = refundVoidChoices(placed, [{ ...call, status: "void" }], now);
    expect(virtualBalance(refunded)).toBe(1000);
    expect(refundVoidChoices(refunded, [{ ...call, status: "void" }], now)).toBe(refunded);
    expect(readVirtualWallet(JSON.stringify(refunded), null, now)).toEqual({ ...refunded, choices: refunded.choices.map((choice) => ({ ...choice, status: "locked" })) });
  });
  it("rejects corrupt ledgers instead of resetting the balance", () => {
    const initial = createVirtualWallet(now);
    expect(() => readVirtualWallet("{invalid", null, now)).toThrow();
    expect(() => readVirtualWallet(JSON.stringify({ ...initial, entries: [...initial.entries, initial.entries[0]] }), null, now)).toThrow();
    expect(() => readVirtualWallet(JSON.stringify({ ...initial, entries: [{ ...initial.entries[0], amount: 2000 }] }), null, now)).toThrow();
    const placed = placeVirtualChoice(initial, call, "yes", 50, now).wallet;
    expect(() => readVirtualWallet(JSON.stringify({ ...placed, entries: initial.entries }), null, now)).toThrow();
  });
});
