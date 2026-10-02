import { type Hex } from "viem";
import { contractConfig, db, operatorWallet, publicClient, required, sha256Hex, unseal } from "@/lib/server/live";

export const runtime = "nodejs";
type DbCall = { id: string; content_id: string; chain_call_id: Hex; baseline_views: number; target_views: number; opened_at: string; scheduled_closes_at: string; reveal_deadline: string; evaluation_at: string; status: string };
type DbContent = { video_id: string };
type Intent = { id: string; wallet_address: Hex; sealed_choice: string; status: string };
type ResultSnapshot = { views: number; snapshot_hash: Hex; observed_at: string };
type PeakSnapshot = { views: number };

async function sampleYoutube(call: DbCall, purpose: "poll" | "result") {
  const content = (await db<DbContent[]>("hive_contents", `?id=eq.${call.content_id}&select=video_id`))[0];
  if (!content) throw new Error("Source content missing");
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "statistics,status");
  url.searchParams.set("id", content.video_id);
  url.searchParams.set("key", required("YOUTUBE_API_KEY"));
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) throw new Error(`YouTube API ${response.status}`);
  const payload = await response.json() as { items?: Array<{ id: string; statistics?: { viewCount?: string }; status?: { privacyStatus?: string } }> };
  const item = payload.items?.[0];
  if (!item || item.status?.privacyStatus !== "public" || !item.statistics?.viewCount) throw new Error("Source unavailable or private");
  const views = Number(item.statistics.viewCount);
  if (!Number.isSafeInteger(views) || views < 0) throw new Error("Invalid view count");
  const observedAt = new Date().toISOString();
  const snapshotHash = sha256Hex(JSON.stringify({ videoId: content.video_id, views, observedAt, source: "YouTube Data API" }));
  await db("hive_snapshots", "", { method: "POST", body: JSON.stringify({ call_id: call.id, views, snapshot_hash: snapshotHash, observed_at: observedAt, purpose }) });
  return { views, snapshotHash, observedAt };
}

async function transaction(functionName: "closeEarly" | "reveal" | "resolve" | "voidCall", args: readonly unknown[]) {
  const wallet = operatorWallet();
  // Runtime args are checked by the contract ABI. The endpoint is authenticated as operator.
  const hash = await wallet.writeContract({ ...contractConfig(), functionName, args } as Parameters<typeof wallet.writeContract>[0]);
  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error(`Transaction failed: ${hash}`);
  return hash;
}

async function processCall(call: DbCall) {
  const now = Date.now();
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
      const { choice, salt } = unseal<{ choice: boolean; salt: Hex }>(intent.sealed_choice);
      const hash = await transaction("reveal", [call.chain_call_id, intent.wallet_address, choice, salt]);
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

export async function POST(request: Request) {
  if (request.headers.get("authorization") !== `Bearer ${process.env.OPERATOR_API_KEY}` || !process.env.OPERATOR_API_KEY) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const calls = await db<DbCall[]>("hive_calls", "?status=in.(open,revealing,pending_result)&select=*&order=evaluation_at.asc&limit=20");
    const results = [];
    for (const call of calls) {
      try { results.push({ callId: call.id, result: await processCall(call) }); }
      catch (error) { results.push({ callId: call.id, error: error instanceof Error ? error.message : "Unknown error" }); }
    }
    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "Operator tick failed" }, { status: 500 });
  }
}
