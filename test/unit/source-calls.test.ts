import { describe, expect, it } from "vitest";
import { CALIBRATION_MS, RESULT_WINDOW_MS, emptySourceState, observeSource, placeSourceChoice, sourceAccount, type ObservedContent, type SourceCall } from "../../src/lib/source-calls";
import { readVirtualWallet, virtualBalance } from "../../src/lib/virtual-token";

const START = Date.parse("2026-10-05T00:00:00Z");
const hash = (text: string) => `hash:${text}`;
export const clip = (views: number, now: number, id = "a", category = "Gaming"): ObservedContent => ({
  id: `youtube-${id}`, creator: "Creator", handle: "YouTube Shorts", title: "Shorts", description: "Source", category,
  kind: "insight", visual: "purple", minutes: 0,
  video: { provider: "youtube", videoId: id, sourceUrl: `https://www.youtube.com/shorts/${id}`, hasAudio: true }, youtubeViews: views, observedAt: new Date(now).toISOString(),
});
function prepared() {
  const state = emptySourceState();
  observeSource(state, [clip(1000, START)], START, hash);
  const now = START + CALIBRATION_MS;
  observeSource(state, [clip(1100, now)], now, hash);
  sourceAccount(state, "account", now);
  return { state, call: state.calls[0], now };
}
function result(call: SourceCall, views: number, observed: number) { return clip(views, observed, call.videoId); }

describe("Calls with observed YouTube views and server credits", () => {
  it("waits for two observations >=30 minutes apart, uses real growth and freezes the target", () => {
    const state = emptySourceState();
    observeSource(state, [clip(1000, START)], START, hash);
    observeSource(state, [clip(1100, START + CALIBRATION_MS - 1)], START + CALIBRATION_MS - 1, hash);
    expect(state.calls).toHaveLength(0);
    observeSource(state, [clip(1100, START + CALIBRATION_MS)], START + CALIBRATION_MS, hash);
    const call = state.calls[0];
    expect(call.targetViews).toBe(2300); // +100 in 30m -> +1200 in 6h
    expect(call.baselineViews).toBe(1100);
    expect(Date.parse(call.scheduledClosesAt) - Date.parse(call.openedAt)).toBe(90 * 60_000);
    observeSource(state, [clip(1200, START + CALIBRATION_MS + 30_000)], START + CALIBRATION_MS + 30_000, hash);
    expect(call.targetViews).toBe(2300);
    expect(state.calls).toHaveLength(1);
  });
  it("does not publish stale, decreasing, unchanged or invalid metrics", () => {
    const state = emptySourceState();
    observeSource(state, [clip(1000, START)], START, hash);
    observeSource(state, [clip(1000, START + CALIBRATION_MS)], START + CALIBRATION_MS, hash);
    observeSource(state, [clip(999, START + CALIBRATION_MS + 30_000)], START + CALIBRATION_MS + 30_000, hash);
    observeSource(state, [clip(1500, START)], START + CALIBRATION_MS * 2, hash);
    observeSource(state, [clip(NaN, START + CALIBRATION_MS * 2)], START + CALIBRATION_MS * 2, hash);
    expect(state.calls).toHaveLength(0);
  });
  it("limits Calls to one active per category, selecting the strongest observed growth", () => {
    const state = emptySourceState();
    observeSource(state, [clip(1000, START, "a"), clip(1000, START, "b"), clip(1000, START, "c", "Sports")], START, hash);
    const now = START + CALIBRATION_MS;
    observeSource(state, [clip(1010, now, "a"), clip(1200, now, "b"), clip(1100, now, "c", "Sports")], now, hash);
    expect(state.calls.map((call) => call.videoId)).toEqual(["b", "c"]);
  });
  it("debits 50 once, rejects duplicate/unknown/stale/late choices", () => {
    const { state, call, now } = prepared();
    expect(placeSourceChoice(state, "account", call.id, "yes", 50, now).ok).toBe(true);
    expect(virtualBalance(state.wallets.account)).toBe(950);
    expect(placeSourceChoice(state, "account", call.id, "no", 50, now).ok).toBe(false);
    expect(placeSourceChoice(state, "account", "rush-views", "yes", 50, now).ok).toBe(false);
    expect(placeSourceChoice(state, "other", call.id, "yes", 50, now + 90_001).ok).toBe(false);
    expect(placeSourceChoice(state, "other", call.id, "yes", 50, Date.parse(call.closesAt)).ok).toBe(false);
    expect(virtualBalance(state.wallets.account)).toBe(950);
  });
  it("closes early at half the gain, not half the absolute target; does not pay early", () => {
    const { state, call, now } = prepared();
    placeSourceChoice(state, "account", call.id, "yes", 50, now);
    observeSource(state, [clip(1699, now + 30_000)], now + 30_000, hash);
    expect(call.status).toBe("open");
    observeSource(state, [clip(1700, now + 60_000)], now + 60_000, hash);
    expect(call.status).toBe("closed");
    expect(virtualBalance(state.wallets.account)).toBe(950);
    expect(placeSourceChoice(state, "other", call.id, "no", 50, now + 60_000).ok).toBe(false);
  });
  it.each([["yes", 2300, "won", 1050], ["yes", 2299, "lost", 950], ["no", 2299, "won", 1050], ["no", 2300, "lost", 950]] as const)("settles %s at %s as %s exactly once", (choice, views, settlement, balance) => {
    const { state, call, now } = prepared();
    placeSourceChoice(state, "account", call.id, choice, 50, now);
    const evaluation = Date.parse(call.evaluationAt);
    observeSource(state, [result(call, views, evaluation)], evaluation, hash);
    expect(call.status).toBe("resolved");
    expect(state.wallets.account.choices[0].settlement).toBe(settlement);
    expect(virtualBalance(state.wallets.account)).toBe(balance);
    const proof = call.proof;
    observeSource(state, [result(call, views + 500, evaluation + 30_000)], evaluation + 30_000, hash);
    expect(call.proof).toEqual(proof);
    expect(virtualBalance(state.wallets.account)).toBe(balance);
    expect(readVirtualWallet(JSON.stringify(state.wallets.account), null, new Date(evaluation).toISOString())).toEqual(state.wallets.account);
  });
  it("waits for a fresh post-evaluation observation and never uses a cached pre-deadline count", () => {
    const { state, call, now } = prepared();
    placeSourceChoice(state, "account", call.id, "yes", 50, now);
    const evaluation = Date.parse(call.evaluationAt);
    observeSource(state, [result(call, 2500, evaluation - 1)], evaluation, hash);
    expect(call.status).toBe("closed");
    expect(call.proof).toBeUndefined();
    expect(virtualBalance(state.wallets.account)).toBe(950);
    observeSource(state, [result(call, 2500, evaluation + 30_000)], evaluation + 30_000, hash);
    expect(virtualBalance(state.wallets.account)).toBe(1050);
  });
  it("keeps a late retry pending; refunds once if the entire result window is missed", () => {
    const { state, call, now } = prepared();
    placeSourceChoice(state, "account", call.id, "yes", 50, now);
    const evaluation = Date.parse(call.evaluationAt);
    observeSource(state, [], evaluation + RESULT_WINDOW_MS, hash);
    expect(call.status).toBe("closed");
    expect(virtualBalance(state.wallets.account)).toBe(950);
    observeSource(state, [result(call, 3000, evaluation + RESULT_WINDOW_MS + 1)], evaluation + RESULT_WINDOW_MS + 1, hash);
    expect(call.status).toBe("void");
    expect(call.voidReason).toBe("source_unavailable");
    expect(virtualBalance(state.wallets.account)).toBe(1000);
    observeSource(state, [], evaluation + RESULT_WINDOW_MS + 60_000, hash);
    expect(state.wallets.account.entries.filter((entry) => entry.kind === "refund")).toHaveLength(1);
  });
  it("refunds a corrected-down metric rather than paying an unreliable result", () => {
    const { state, call, now } = prepared();
    placeSourceChoice(state, "account", call.id, "yes", 50, now);
    observeSource(state, [clip(3000, now + 30_000)], now + 30_000, hash);
    const evaluation = Date.parse(call.evaluationAt);
    observeSource(state, [result(call, 2500, evaluation)], evaluation, hash);
    expect(call.status).toBe("void");
    expect(call.voidReason).toBe("metric_correction");
    expect(virtualBalance(state.wallets.account)).toBe(1000);
  });
});
