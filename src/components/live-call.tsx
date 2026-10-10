"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken, usePrivy, useWallets } from "@privy-io/react-auth";

import { AnimatedViewCount } from "@/components/animated-view-count";
import { useAccountAuth } from "@/components/auth-provider";
import "./live-call.css";

type LiveData = {
  intent?: { status: string; commit_tx_hash?: string; reveal_tx_hash?: string };
  call: { id: string; chain_call_id: string; baseline_views: number; target_views: number; scheduled_closes_at: string; evaluation_at: string; status: string; result_views?: number; create_tx_hash?: string; close_tx_hash?: string; resolve_tx_hash?: string; source_hash?: string; rules_hash?: string; void_reason?: string };
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
        if (!response.ok) throw new Error("Call belum dapat dimuat. Mencoba lagi…");
        const result = await response.json();
        if (!stopped) { setData(result); setNow(Date.now()); }
      } catch { if (!stopped) setError("Pembaruan tertunda. Mencoba lagi…"); }
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
      if (!wallet) throw new Error("Wallet belum siap. Tunggu sebentar lalu coba lagi.");
      const token = await getAccessToken();
      if (!token) throw new Error("Sesi berakhir. Masuk lagi.");
      const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
      const prepared = await fetch(`/api/live/calls/${id}/prepare`, { method: "POST", headers, body: JSON.stringify({ wallet: wallet.address, choice }) });
      const prep = await prepared.json();
      if (!prepared.ok) throw new Error(prep.error);
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: "personal_sign", params: [prep.digest, wallet.address] });
      if (typeof signature !== "string") throw new Error("Tanda tangan dibatalkan");
      const submitted = await fetch(`/api/live/intents/${prep.intentId}/submit`, { method: "POST", headers, body: JSON.stringify({ signature }) });
      const result = await submitted.json();
      if (!submitted.ok) throw new Error(result.error);
      setTx(result.txHash);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pilihan belum terkonfirmasi"); }
    finally { setBusy(false); }
  }

  const latest = data?.snapshots.at(-1);
  const views = latest?.views ?? data?.call.baseline_views ?? 0;
  const confirmedTx = tx || data?.intent?.commit_tx_hash;
  const closesAt = data ? Date.parse(data.call.scheduled_closes_at) : 0;
  const canChoose = data?.call.status === "open" && now < closesAt && !confirmedTx && !["submitting", "locked", "revealed", "unrevealed"].includes(data.intent?.status ?? "");
  const progress = data ? Math.max(0, Math.min(100, (views - data.call.baseline_views) / (data.call.target_views - data.call.baseline_views) * 100)) : 0;
  const format = (value: number) => value.toLocaleString("id-ID");
  const time = (value: string) => new Date(value).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
  const txLink = (hash: string, label: string) => <a href={`https://testnet.monadscan.com/tx/${hash}`} target="_blank" rel="noreferrer">{label} ↗</a>;
  return <main className="live-proof-page">
    <Link href="/predictions" className="back-link">← Prediksi</Link>
    <header><span className="overline">MONAD TESTNET</span><h1>{data?.content?.title ?? "Memuat Call…"}</h1><p>{data?.content?.creator}</p></header>
    {error && <p role="alert" className="choice-feedback">{error}</p>}
    {data && <section className="live-proof-card">
      <div className="live-proof-status"><span>{data.call.status === "open" && now < closesAt ? "Pilihan terbuka" : data.call.status === "resolved" ? "Hasil tersedia" : data.call.status === "void" ? "Dibatalkan" : "Pilihan ditutup"}</span><span>6 jam</span></div>
      <h2>Tembus {format(data.call.target_views)} views?</h2>
      <div className="live-proof-metrics"><div><small>Views YouTube</small><strong><AnimatedViewCount value={views} /></strong></div><div><small>Target</small><strong>{format(data.call.target_views)}</strong></div></div>
      <div className="live-proof-track" role="progressbar" aria-label="Kemajuan menuju target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><span style={{ transform: `scaleX(${progress / 100})` }} /></div>
      <div className="live-proof-time"><span>Evaluasi {time(data.call.evaluation_at)} WIB</span>{latest && <small>Diperiksa {time(latest.observed_at)} WIB</small>}</div>
      {canChoose && <div className="choice-section"><p>Pilihan tanpa stake. Gas ditanggung VIBE.</p>{!authenticated ? <button className="button button-primary" disabled={!ready} onClick={login}>Masuk dengan Google</button> : <div className="choice-buttons"><button className="choice-button" disabled={busy || !ready} onClick={() => commit(true)}>{busy ? "Memproses…" : "Ya, tercapai"}</button><button className="choice-button" disabled={busy || !ready} onClick={() => commit(false)}>Tidak</button></div>}</div>}
      {confirmedTx && <div className="choice-feedback locked"><strong>Pilihan tercatat.</strong><p>{txLink(confirmedTx, "Bukti pilihan")}{data.intent?.reveal_tx_hash && <> · {txLink(data.intent.reveal_tx_hash, "Bukti reveal")}</>}</p></div>}
      {data.intent?.status === "submitting" && !confirmedTx && <p role="status">Menunggu konfirmasi Monad…</p>}
      {data.call.status === "resolved" && <div className="choice-feedback locked"><strong>{Number(data.call.result_views) >= data.call.target_views ? "Target tercapai" : "Target tidak tercapai"}</strong><p>{format(data.call.result_views ?? 0)} views{data.call.resolve_tx_hash && <> · {txLink(data.call.resolve_tx_hash, "Bukti hasil")}</>}</p></div>}
      {data.call.status === "void" && <p className="choice-feedback">Call dibatalkan: {data.call.void_reason ?? "Lihat bukti di kontrak"}.</p>}
      <a className="back-link" href={data.content?.source_url} target="_blank" rel="noreferrer">Tonton Short ↗</a>
      <details className="live-proof-details"><summary>Bukti & aturan</summary><p>Pilihan ditandatangani wallet lalu direveal operator setelah jendela tutup. Hasil memakai pengamatan YouTube dalam 30 menit setelah evaluasi; data hilang atau koreksi views membatalkan Call. Operator membaca dan mengirim data sumber ke kontrak.</p><p>Mode ini mencatat bukti pilihan. Saldo dan pengembalian VIBE di Call biasa dikelola terpisah di server.</p>{data.call.create_tx_hash && <p>{txLink(data.call.create_tx_hash, "Pembuatan Call")}</p>}{data.call.close_tx_hash && <p>{txLink(data.call.close_tx_hash, "Penutupan dini")}</p>}{data.call.resolve_tx_hash && <p>{txLink(data.call.resolve_tx_hash, "Hasil / pembatalan")}</p>}<p>Tutup {time(data.call.scheduled_closes_at)} WIB</p><p>Rules <code>{data.call.rules_hash}</code></p><p>Source <code>{data.call.source_hash}</code></p><p>Pengamatan terakhir: {latest ? format(latest.views) : "—"} views · YouTube Data API</p></details>
    </section>}
  </main>;
}
