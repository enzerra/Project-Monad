"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken, usePrivy, useWallets } from "@privy-io/react-auth";

import { AnimatedViewCount } from "@/components/animated-view-count";
import { useAccountAuth } from "@/components/auth-provider";
import "./live-call.css";

type LiveData = {
  intent?: { status: string; commit_tx_hash?: string; reveal_tx_hash?: string };
  call: { id: string; chain_call_id: string; baseline_views: number; target_views: number; horizon_hours: number; scheduled_closes_at: string; evaluation_at: string; status: string; result_views?: number; create_tx_hash?: string; close_tx_hash?: string; resolve_tx_hash?: string; source_hash?: string; rules_hash?: string; void_reason?: string };
  content?: { title: string; creator: string; source_url: string };
  snapshots: Array<{ views: number; snapshot_hash: string; observed_at: string; purpose: string; source: string }>;
};

export function LiveCall({ id }: { id: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const auth = useAccountAuth();
  const { requestHeaders } = auth;
  const [now, setNow] = useState(0);
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  useEffect(() => {
    let stopped = false;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const response = await fetch(`/api/live/calls/${id}`, { headers: await requestHeaders(), cache: "no-store", signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) });
        if (!response.ok) throw new Error("Could not load this Call. Retrying…");
        const result = await response.json();
        if (!stopped) { setData(result); setNow(Date.now()); setError(""); }
      } catch { if (!stopped) setError("Update delayed. Retrying…"); }
      finally { if (!stopped) timer = setTimeout(() => void refresh(), 30_000); }
    }
    void refresh();
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => { stopped = true; controller.abort(); clearTimeout(timer); clearInterval(clock); };
  }, [id, requestHeaders]);

  async function commit(choice: boolean) {
    setBusy(true); setError("");
    try {
      const wallet = wallets.find((item) => item.walletClientType === "privy");
      if (!wallet) throw new Error("Your wallet is loading. Try again shortly.");
      const token = await getAccessToken();
      if (!token) throw new Error("Your session expired. Sign in again.");
      const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
      const prepared = await fetch(`/api/live/calls/${id}/prepare`, { method: "POST", headers, body: JSON.stringify({ wallet: wallet.address, choice }) });
      const prep = await prepared.json();
      if (!prepared.ok) throw new Error(prep.error);
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: "personal_sign", params: [prep.digest, wallet.address] });
      if (typeof signature !== "string") throw new Error("Signature cancelled");
      const submitted = await fetch(`/api/live/intents/${prep.intentId}/submit`, { method: "POST", headers, body: JSON.stringify({ signature }) });
      const result = await submitted.json();
      if (!submitted.ok) throw new Error(result.error);
      setTx(result.txHash);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Choice not confirmed"); }
    finally { setBusy(false); }
  }

  const latest = data?.snapshots.at(-1);
  const views = latest?.views ?? data?.call.baseline_views ?? 0;
  const confirmedTx = tx || data?.intent?.commit_tx_hash;
  const closesAt = data ? Date.parse(data.call.scheduled_closes_at) : 0;
  const canChoose = data?.call.status === "open" && now < closesAt && !confirmedTx && !["submitting", "locked", "revealed", "unrevealed"].includes(data.intent?.status ?? "");
  const progress = data ? Math.max(0, Math.min(100, (views - data.call.baseline_views) / (data.call.target_views - data.call.baseline_views) * 100)) : 0;
  const format = (value: number) => value.toLocaleString("en-US");
  const time = (value: string) => new Date(value).toLocaleString("en-US", { timeZone: "Asia/Jakarta" });
  const txLink = (hash: string, label: string) => <a href={`https://testnet.monadscan.com/tx/${hash}`} target="_blank" rel="noreferrer">{label} ↗</a>;
  return <main className="live-proof-page">
    <Link href="/predictions" className="back-link">← Calls</Link>
    <header><span className="overline">MONAD TESTNET</span><h1>{data?.content?.title ?? "Loading Call…"}</h1><p>{data?.content?.creator}</p></header>
    {error && <p role="alert" className="choice-feedback">{error}</p>}
    {data && <section className="live-proof-card">
      <div className="live-proof-status"><span>{data.call.status === "open" && now < closesAt ? "Open" : data.call.status === "resolved" ? "Result ready" : data.call.status === "void" ? "Cancelled" : "Closed"}</span><span>{data.call.horizon_hours}h</span></div>
      <h2>Will it reach {format(data.call.target_views)} views?</h2>
      <div className="live-proof-metrics"><div><small>YouTube views</small><strong><AnimatedViewCount value={views} /></strong></div><div><small>Target</small><strong>{format(data.call.target_views)}</strong></div></div>
      <div className="live-proof-track" role="progressbar" aria-label="Progress toward target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <div className="live-proof-time"><span>Evaluation {time(data.call.evaluation_at)} GMT+7</span>{latest && <small>Checked {time(latest.observed_at)} GMT+7</small>}</div>
      {canChoose && <div className="choice-section"><p>No stake. VIBE covers the gas.</p>{!authenticated ? <button className="button button-primary" disabled={!ready} onClick={login}>Sign in with Google</button> : <div className="choice-buttons"><button className="choice-button" disabled={busy || !ready} onClick={() => commit(true)}>{busy ? "Processing…" : "Yes, it will"}</button><button className="choice-button" disabled={busy || !ready} onClick={() => commit(false)}>No</button></div>}</div>}
      {confirmedTx && <div className="choice-feedback locked"><strong>Your choice is onchain.</strong><p>{txLink(confirmedTx, "View choice proof")}{data.intent?.reveal_tx_hash && <> · {txLink(data.intent.reveal_tx_hash, "View reveal proof")}</>}</p></div>}
      {data.intent?.status === "submitting" && !confirmedTx && <p role="status">Awaiting Monad confirmation…</p>}
      {data.call.status === "resolved" && <div className="choice-feedback locked"><strong>{Number(data.call.result_views) >= data.call.target_views ? "Target reached" : "Target not reached"}</strong><p>{format(data.call.result_views ?? 0)} views{data.call.resolve_tx_hash && <> · {txLink(data.call.resolve_tx_hash, "View result proof")}</>}</p></div>}
      {data.call.status === "void" && <p className="choice-feedback">Call cancelled. {data.call.void_reason === "metric_correction" ? "YouTube corrected its view count." : data.call.void_reason === "source_unavailable" ? "No valid YouTube result was available." : "View contract proof for details."}</p>}
      <a className="back-link" href={data.content?.source_url} target="_blank" rel="noreferrer">Watch Short ↗</a>
      <details className="live-proof-details"><summary>Proof & rules</summary><p>Sign with your wallet. The operator reveals your choice after entries close and submits a YouTube snapshot within 30 minutes of evaluation. Missing or corrected data voids the Call.</p><p>This mode records proof only. VIBE credit balances and rewards in regular Calls are handled separately on the server.</p>{data.call.create_tx_hash && <p>{txLink(data.call.create_tx_hash, "Call creation")}</p>}{data.call.close_tx_hash && <p>{txLink(data.call.close_tx_hash, "Early close")}</p>}{data.call.resolve_tx_hash && <p>{txLink(data.call.resolve_tx_hash, "Result / cancellation")}</p>}<p>Closes {time(data.call.scheduled_closes_at)} GMT+7</p><p>Rules <code>{data.call.rules_hash}</code></p><p>Source <code>{data.call.source_hash}</code></p><p>Last observation: {latest ? format(latest.views) : "—"} views · YouTube Data API</p></details>
    </section>}
  </main>;
}
