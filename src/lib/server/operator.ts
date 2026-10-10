import "server-only";
import { type Hex } from "viem";
import { contractConfig, db, operatorTransaction, publicClient, required, sha256Hex, unseal } from "@/lib/server/live";


type DbCall = { id: string; content_id: string; chain_call_id: Hex; baseline_views: number; target_views: number; opened_at: string; scheduled_closes_at: string; reveal_deadline: string; evaluation_at: string; status: string };
type DbContent = { video_id: string };
type Intent = { id: string; wallet_address: Hex; sealed_choice: string; status: string; commit_tx_hash?: Hex; commitment_hash: Hex };
type ResultSnapshot = { views: number; snapshot_hash: Hex; observed_at: string };
type PeakSnapshot = { views: number };

async function sampleYoutube(call: DbCall, purpose: "poll" | "result") {
  const content = (await db<DbContent[]>("hive_contents", `?id=eq.${call.content_id}&select=video_id`))[0];
  if (!content) throw new Error("Source content missing");
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics,status");
  url.searchParams.set("id", content.video_id);
  url.searchParams.set("key", required("YOUTUBE_API_KEY"));
  const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`YouTube API ${response.status}`);
  const payload = await response.json() as { items?: Array<{ id: string; statistics?: { viewCount?: string }; status?: { privacyStatus?: string } }> };
  const item = payload.items?.[0];
  if (!item || item.status?.privacyStatus !== "public" || !item.statistics?.viewCount) throw new Error("Source unavailable or private");
  const views = Number(item.statistics.viewCount);
  if (!Number.isSafeInteger(views) || views < 0) throw new Error("Invalid view count");
  const observedAt = new Date().toISOString();
  if (purpose === "result" && (Date.parse(observedAt) < Date.parse(call.evaluation_at) || Date.parse(observedAt) > Date.parse(call.evaluation_at) + 30 * 60_000)) throw new Error("Outside result observation window");
  const snapshotHash = sha256Hex(JSON.stringify({ videoId: content.video_id, views, observedAt, source: "YouTube Data API" }));
  await db("hive_snapshots", "", { method: "POST", body: JSON.stringify({ call_id: call.id, views, snapshot_hash: snapshotHash, observed_at: observedAt, purpose }) });
  return { views, snapshotHash, observedAt };
}

const transaction = operatorTransaction;

async function processCall(call: DbCall) {
  const now = Number((await publicClient.getBlock()).timestamp) * 1000;
  const chainCall = await publicClient.readContract({ ...contractConfig(), functionName: "calls", args: [call.chain_call_id] });
  // A mined transaction can outlive a database outage. Restore terminal state first.
  if (chainCall[11] === 2 || chainCall[11] === 3 || chainCall[11] === 4) {
    const status = chainCall[11] === 2 ? "resolved" : chainCall[11] === 3 ? "void" : "cancelled";
    await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status, ...(status === "resolved" ? { result_views: Number(chainCall[13]), result_snapshot_hash: chainCall[14] } : {}) }) });
    return `reconciled ${status}`;
  }
  const pending = await db<Intent[]>("hive_choice_intents", `?call_id=eq.${call.id}&status=eq.submitting&select=id,wallet_address,commitment_hash,commit_tx_hash,status`);
  for (const intent of pending) {
    const proof = await publicClient.readContract({ ...contractConfig(), functionName: "commitments", args: [call.chain_call_id, intent.wallet_address] });
    if (proof[0] === intent.commitment_hash) {
      await db("hive_choice_intents", `?id=eq.${intent.id}`, { method: "PATCH", body: JSON.stringify({ status: proof[3] ? "revealed" : "locked" }) });
    } else if (intent.commit_tx_hash) {
      const receipt = await publicClient.getTransactionReceipt({ hash: intent.commit_tx_hash }).catch(() => null);
      if (receipt?.status === "reverted") await db("hive_choice_intents", `?id=eq.${intent.id}`, { method: "PATCH", body: JSON.stringify({ status: "failed" }) });
    }
  }
  const closeAt = await publicClient.readContract({ ...contractConfig(), functionName: "effectiveClosesAt", args: [call.chain_call_id] });
  const closeMs = Number(closeAt) * 1000;
  if (now < closeMs && now < Date.parse(call.scheduled_closes_at)) {
    const sample = await sampleYoutube(call, "poll");
    const threshold = call.baseline_views + Math.ceil((call.target_views - call.baseline_views) / 2);
    if (sample.views >= threshold) {
      const hash = await transaction("closeEarly", [call.chain_call_id, BigInt(sample.views), sample.snapshotHash]);
      await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "revealing", close_tx_hash: hash }) });
      return "closed early";
    }
    return "polled";
  }

  if (now >= closeMs && now <= Date.parse(call.reveal_deadline)) {
    const intents = await db<Intent[]>("hive_choice_intents", `?call_id=eq.${call.id}&status=eq.locked&select=id,wallet_address,sealed_choice,status`);
    for (const intent of intents) {
      const proof = await publicClient.readContract({ ...contractConfig(), functionName: "commitments", args: [call.chain_call_id, intent.wallet_address] });
      if (proof[3]) {
        await db("hive_choice_intents", `?id=eq.${intent.id}`, { method: "PATCH", body: JSON.stringify({ status: "revealed" }) });
        continue;
      }
      const { choice, salt } = unseal<{ choice: boolean; salt: Hex }>(intent.sealed_choice);
      const hash = await transaction("reveal", [call.chain_call_id, intent.wallet_address, choice, salt], async (hash) => {
        await db("hive_choice_intents", `?id=eq.${intent.id}`, { method: "PATCH", body: JSON.stringify({ reveal_tx_hash: hash }) });
      });
      await db("hive_choice_intents", `?id=eq.${intent.id}`, { method: "PATCH", body: JSON.stringify({ status: "revealed", reveal_tx_hash: hash }) });
    }
    await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "revealing" }) });
    return `revealed ${intents.length}`;
  }

  if (now > Date.parse(call.reveal_deadline) && now < Date.parse(call.evaluation_at)) {
    await db("hive_choice_intents", `?call_id=eq.${call.id}&status=eq.locked`, { method: "PATCH", body: JSON.stringify({ status: "unrevealed" }) });
    await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "pending_result" }) });
    return "pending result";
  }

  if (now >= Date.parse(call.evaluation_at)) {
    const windowEnd = Date.parse(call.evaluation_at) + 30 * 60_000;
    const saved = await db<ResultSnapshot[]>("hive_snapshots", `?call_id=eq.${call.id}&purpose=eq.result&observed_at=gte.${encodeURIComponent(call.evaluation_at)}&observed_at=lte.${encodeURIComponent(new Date(windowEnd).toISOString())}&select=views,snapshot_hash,observed_at&order=observed_at.asc&limit=1`);
    if (now > windowEnd && !saved.length) {
      const reason = "source_unavailable";
      const hash = await transaction("voidCall", [call.chain_call_id, sha256Hex(reason)]);
      await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "void", void_reason: reason, resolve_tx_hash: hash }) });
      return "void";
    }
    let sample: Awaited<ReturnType<typeof sampleYoutube>>;
    if (saved.length) {
      sample = { views: saved[0].views, snapshotHash: saved[0].snapshot_hash, observedAt: saved[0].observed_at };
    } else {
      try {
        sample = await sampleYoutube(call, "result");
      } catch {
        return "source retry pending";
      }
    }
    const peak = await db<PeakSnapshot[]>("hive_snapshots", `?call_id=eq.${call.id}&select=views&order=views.desc&limit=1`);
    if (sample.views < call.baseline_views || (peak[0] && sample.views < peak[0].views)) {
      const reason = "metric_correction";
      const reasonHash = sha256Hex(JSON.stringify({ reason, previousPeak: peak[0]?.views ?? call.baseline_views, resultSnapshotHash: sample.snapshotHash }));
      const hash = await transaction("voidCall", [call.chain_call_id, reasonHash]);
      await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "void", void_reason: reason, result_views: sample.views, result_snapshot_hash: sample.snapshotHash, resolve_tx_hash: hash }) });
      return "void metric correction";
    }
    const hash = await transaction("resolve", [call.chain_call_id, BigInt(sample.views), BigInt(Math.floor(Date.parse(sample.observedAt) / 1000)), sample.snapshotHash]);
    await db("hive_calls", `?id=eq.${call.id}`, { method: "PATCH", body: JSON.stringify({ status: "resolved", result_views: sample.views, result_snapshot_hash: sample.snapshotHash, resolve_tx_hash: hash }) });
    return "resolved";
  }
  return "waiting";
}

const shared = globalThis as typeof globalThis & { vibeOperatorTick?: Promise<{ results: Array<{ callId: string; result?: string; error?: string }> }>; vibeOperatorWorker?: ReturnType<typeof setInterval> };

export function runOperatorTick() {
  if (shared.vibeOperatorTick) return shared.vibeOperatorTick;
  shared.vibeOperatorTick = (async () => {
    const calls = await db<DbCall[]>("hive_calls", "?status=in.(open,closed,revealing,pending_result)&select=*&order=evaluation_at.asc&limit=20");
    const results: Array<{ callId: string; result?: string; error?: string }> = [];
    for (const call of calls) {
      try { results.push({ callId: call.id, result: await processCall(call) }); }
      catch { results.push({ callId: call.id, error: "Operator check failed; retry pending" }); }
    }
    return { results };
  })().finally(() => { shared.vibeOperatorTick = undefined; });
  return shared.vibeOperatorTick;
}

export function startOperatorWorker() {
  if (shared.vibeOperatorWorker) return;
  const tick = () => { void runOperatorTick().then(({ results }) => {
    if (results.some((item) => item.error)) console.error("VIBE Monad operator: a Call check needs retry.");
  }).catch(() => console.error("VIBE Monad operator unavailable; retry pending.")); };
  tick();
  shared.vibeOperatorWorker = setInterval(tick, 60_000);
  shared.vibeOperatorWorker.unref();
}
