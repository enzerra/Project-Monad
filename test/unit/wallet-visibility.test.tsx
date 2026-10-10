import { beforeEach, describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { VirtualBalance, VirtualWalletPanel, type VirtualAccount } from "../../src/components/virtual-wallet";

const auth = vi.hoisted(() => ({ configured: true, ready: true, authenticated: false }));
vi.mock("../../src/components/auth-provider", () => ({ useAccountAuth: () => auth }));
vi.mock("../../src/components/auth-control", () => ({ AuthControl: () => createElement("button", null, "Masuk Google") }));

// A previous account's cached wallet must never appear for a signed-out visitor.
const account = { walletReady: true, balance: 1000, wallet: { version: 1, entries: [], choices: [] }, choices: [], walletError: "" } as unknown as VirtualAccount;
beforeEach(() => { auth.configured = true; auth.ready = true; auth.authenticated = false; });

describe("wallet visibility by account session", () => {
  it("hides balances even when stale wallet data is present after logout", () => {
    expect(renderToStaticMarkup(createElement(VirtualBalance, { account }))).toBe("");
    const panel = renderToStaticMarkup(createElement(VirtualWalletPanel, { account }));
    expect(panel).toContain("Masuk Google");
    expect(panel).not.toContain("virtual-wallet-total");
    expect(panel).not.toContain("Riwayat saldo");
  });
  it("does not flash a balance while authentication initializes", () => {
    auth.ready = false;
    expect(renderToStaticMarkup(createElement(VirtualBalance, { account }))).toBe("");
  });
  it("shows the account balance after authentication", () => {
    auth.authenticated = true;
    expect(renderToStaticMarkup(createElement(VirtualBalance, { account }))).toContain("Buka saldo token, 1.000 VIBE");
  });
});
