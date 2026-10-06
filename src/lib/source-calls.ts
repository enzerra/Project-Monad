import type { Call, Content, Choice, PredictionCategory } from "./demo-data";
import { createVirtualWallet, placeVirtualChoice, type ChoiceResult, type VirtualWallet } from "./virtual-token";

export const SOURCE_RULE = "youtube-views-6h-fixed2x-v1";
export const SAMPLE_INTERVAL_MS = 30_000;
export const CALIBRATION_MS = 30 * 60_000;
export const RESULT_WINDOW_MS = 30 * 60_000;
const HORIZON_MS = 6 * 60 * 60_000;
const FRESH_MS = 90_000;

export type ViewObservation = { videoId: string; views: number; observedAt: string };
export type SourceCall = Call & {
  videoId: string; openedAt: string; observedAt: string; closesAt: string;
  sourceUrl: string; ruleVersion: typeof SOURCE_RULE; multiplier: 2;
  calibration: [ViewObservation, ViewObservation]; peakViews: number;
  proof?: ViewObservation & { hash: string; source: "YouTube Data API" };
};
export type ObservedContent = Content & { youtubeViews: number; observedAt: string; video: { provider: "youtube"; videoId: string; sourceUrl: string; hasAudio: true } };
export type SourceState = {
  version: 1; revision: number; calls: SourceCall[]; contents: ObservedContent[];
  calibration: Record<string, { first: ViewObservation; last: ViewObservation }>;
  wallets: Record<string, VirtualWallet>; lastCheckedAt?: string;
};
export type SourceAccountSnapshot = {
  revision: number; wallet: VirtualWallet; calls: SourceCall[]; contents: ObservedContent[];
  calibrationStartedAt?: string; lastCheckedAt?: string; serverNow: string;
};

export function emptySourceState(): SourceState {
  return { version: 1, revision: 0, calls: [], contents: [], calibration: {}, wallets: {} };
}

const fresh = (at: string, now: number) => Number.isFinite(Date.parse(at)) && Date.parse(at) <= now && now - Date.parse(at) <= FRESH_MS;
const categoryOf = (item: Content): PredictionCategory => item.category.startsWith("Sports") ? "sport" : item.category.startsWith("Crypto") ? "crypto" : "gaming";

/** Pure transition: only observed API data can create/resolve Calls. Never uses fixture views. */
export function observeSource(state: SourceState, feed: ObservedContent[], now: number, hash: (value: string) => string): void {
  const eligible = feed.filter((item) => Number.isSafeInteger(item.youtubeViews) && item.youtubeViews >= 0 && fresh(item.observedAt, now));
  const byVideo = new Map(eligible.map((item) => [item.video.videoId, item]));
  for (const item of eligible) {
    const observation = { videoId: item.video.videoId, views: item.youtubeViews, observedAt: item.observedAt };
    const prior = state.calibration[observation.videoId];
    if (!prior || observation.views < prior.last.views) state.calibration[observation.videoId] = { first: observation, last: observation };
    else if (Date.parse(observation.observedAt) > Date.parse(prior.last.observedAt)) prior.last = observation;
    const index = state.contents.findIndex((content) => content.id === item.id);
    if (index < 0) state.contents.push(item);
    else state.contents[index] = item;
  }
  if (eligible.length) state.lastCheckedAt = eligible.reduce((latest, item) => Date.parse(item.observedAt) > Date.parse(latest) ? item.observedAt : latest, eligible[0].observedAt);

  for (const call of state.calls) {
    if (call.status === "resolved" || call.status === "void") continue;
    const item = byVideo.get(call.videoId);
    if (item && Date.parse(item.observedAt) > Date.parse(call.observedAt)) {
      call.currentViews = item.youtubeViews;
      call.observedAt = item.observedAt;
    }
    const evaluation = Date.parse(call.evaluationAt);
    if (now >= evaluation) {
      const observed = item ? Date.parse(item.observedAt) : 0;
      // A cached pre-deadline count can never resolve a Call.
      if (item && observed >= evaluation && observed <= evaluation + RESULT_WINDOW_MS) {
        const proof = { videoId: call.videoId, views: item.youtubeViews, observedAt: item.observedAt, source: "YouTube Data API" as const };
        call.proof = { ...proof, hash: hash(JSON.stringify({ ...proof, callId: call.id, targetViews: call.targetViews, ruleVersion: call.ruleVersion })) };
        if (item.youtubeViews < call.peakViews) {
          call.status = "void";
          call.voidReason = "metric_correction";
        } else {
          call.status = "resolved";
          call.result = item.youtubeViews >= call.targetViews ? "yes" : "no";
        }
      } else if (now > evaluation + RESULT_WINDOW_MS) {
        call.status = "void";
        call.voidReason = "source_unavailable";
      } else call.status = "closed";
    } else {
      if (item) call.peakViews = Math.max(call.peakViews, item.youtubeViews);
      const threshold = call.baselineViews + Math.ceil((call.targetViews - call.baselineViews) / 2);
      if (call.status === "open" && item && item.youtubeViews >= threshold) {
        call.closesAt = new Date(Math.min(now, Date.parse(call.closesAt))).toISOString();
        call.status = "closed";
      }
      if (now >= Date.parse(call.closesAt)) call.status = "closed";
    }
  }

  // At most one active Call per category; targets use two real observations >=30 min apart.
  for (const category of ["gaming", "sport", "crypto"] as const) {
    if (state.calls.some((call) => call.predictionCategory === category && call.status !== "resolved" && call.status !== "void")) continue;
    const candidates = eligible.filter((item) => categoryOf(item) === category).flatMap((item) => {
      const calibration = state.calibration[item.video.videoId];
      const elapsed = Date.parse(calibration.last.observedAt) - Date.parse(calibration.first.observedAt);
      const growth = calibration.last.views - calibration.first.views;
      if (elapsed < CALIBRATION_MS || growth <= 0 || state.calls.some((call) => call.videoId === item.video.videoId && call.status !== "resolved" && call.status !== "void")) return [];
      return [{ item, calibration, projected: Math.ceil(growth * HORIZON_MS / elapsed) }];
    }).sort((a, b) => b.projected - a.projected);
    const candidate = candidates[0];
    if (!candidate) continue;
    const { item, calibration } = candidate;
    const target = item.youtubeViews + Math.max(100, candidate.projected);
    if (!Number.isSafeInteger(target)) continue;
    const openedAt = new Date(now).toISOString();
    const closesAt = new Date(now + HORIZON_MS / 4).toISOString();
    state.calls.push({
      id: `shorts-${item.video.videoId}-${now}`, contentId: item.id, videoId: item.video.videoId,
      predictionCategory: category, question: `Shorts ini mencapai ${target.toLocaleString("id-ID")} views dalam 6 jam?`,
      baselineViews: item.youtubeViews, currentViews: item.youtubeViews, peakViews: item.youtubeViews,
      targetViews: target, horizonHours: 6, openedAt, scheduledClosesAt: closesAt, closesAt,
      evaluationAt: new Date(now + HORIZON_MS).toISOString(), observedAt: item.observedAt,
      status: "open", sourceUrl: item.video.sourceUrl, multiplier: 2, ruleVersion: SOURCE_RULE,
      calibration: [{ ...calibration.first }, { ...calibration.last }],
    });
    state.calibration[item.video.videoId] = { first: calibration.last, last: calibration.last };
  }
  for (const wallet of Object.values(state.wallets)) settleSourceWallet(wallet, state.calls, new Date(now).toISOString());
}

export function settleSourceWallet(wallet: VirtualWallet, calls: SourceCall[], now: string): void {
  for (const choice of wallet.choices) {
    if (choice.settlement) continue;
    const call = calls.find((call) => call.id === choice.callId);
    if (!call || (call.status !== "void" && !(call.status === "resolved" && call.proof && call.result))) continue;
    choice.settlement = call.status === "void" ? "refunded" : choice.choice === call.result ? "won" : "lost";
    choice.settledAt = now;
    const kind = choice.settlement === "won" ? "reward" : choice.settlement === "refunded" ? "refund" : undefined;
    if (kind && !wallet.entries.some((entry) => entry.callId === call.id && (entry.kind === "reward" || entry.kind === "refund"))) {
      wallet.entries.push({ id: `${kind}:${call.id}`, kind, amount: choice.amount * (kind === "reward" ? 2 : 1), callId: call.id, createdAt: now });
    }
  }
}

export function sourceAccount(state: SourceState, accountId: string, now: number): SourceAccountSnapshot {
  const wallet = state.wallets[accountId] ??= createVirtualWallet(new Date(now).toISOString());
  const starts = Object.values(state.calibration).map((item) => item.first.observedAt).sort();
  return { revision: state.revision, wallet, calls: state.calls, contents: state.contents, calibrationStartedAt: starts[0], lastCheckedAt: state.lastCheckedAt, serverNow: new Date(now).toISOString() };
}

export function placeSourceChoice(state: SourceState, accountId: string, callId: string, choice: Choice, amount: number, now: number): ChoiceResult {
  const call = state.calls.find((item) => item.id === callId);
  if (!call || call.status !== "open" || now >= Date.parse(call.closesAt)) return { ok: false, error: "Pilihan Call ini sudah ditutup." };
  if (!fresh(call.observedAt, now)) return { ok: false, error: "Menunggu pembaruan views YouTube. Saldo belum dipotong." };
  const wallet = sourceAccount(state, accountId, now).wallet;
  const result = placeVirtualChoice(wallet, call, choice, amount, new Date(now).toISOString());
  if (result.result.ok) {
    result.wallet.choices[result.wallet.choices.length - 1].status = "locked";
    state.wallets[accountId] = result.wallet;
  }
  return result.result;
}
