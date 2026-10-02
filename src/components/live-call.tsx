"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { getAccessToken, usePrivy, useWallets } from "@privy-io/react-auth";

type LiveData = {
  call: { id: string; chain_call_id: string; baseline_views: number; target_views: number; scheduled_closes_at: string; evaluation_at: string; status: string; result_views?: number; create_tx_hash?: string; close_tx_hash?: string; resolve_tx_hash?: string; source_hash?: string; rules_hash?: string; void_reason?: string };
  content?: { title: string; creator: string; source_url: string };
  snapshots: Array<{ views: number; snapshot_hash: string; observed_at: string; purpose: string; source: string }>;
};

export function LiveCall({ id }: { id: string }) {
  const { ready, authenticated, login } = usePrivy();
  const { wallets } = useWallets();
  const [data, setData] = useState<LiveData | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [tx, setTx] = useState("");
  useEffect(() => { fetch(`/api/live/calls/${id}`).then(async (response) => { if (!response.ok) throw new Error("Call tidak tersedia"); return response.json(); }).then(setData).catch((cause) => setError(String(cause))); }, [id]);

  async function commit(choice: boolean) {
    setBusy(true); setError("");
    try {
      const wallet = wallets.find((item) => item.walletClientType === "privy");
      if (!wallet) throw new Error("Embedded wallet belum tersedia. Masuk dengan Google dahulu.");
      const token = await getAccessToken();
      if (!token) throw new Error("Sesi Privy berakhir. Masuk lagi.");
      const prepared = await fetch(`/api/live/calls/${id}/prepare`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ wallet: wallet.address, choice }) });
      const prep = await prepared.json();
      if (!prepared.ok) throw new Error(prep.error);
      const provider = await wallet.getEthereumProvider();
      const signature = await provider.request({ method: "personal_sign", params: [prep.digest, wallet.address] });
      if (typeof signature !== "string") throw new Error("Tanda tangan dibatalkan");
      const submitted = await fetch(`/api/live/intents/${prep.intentId}/submit`, { method: "POST", headers: { authorization: `Bearer ${token}`, "content-type": "application/json" }, body: JSON.stringify({ signature }) });
      const result = await submitted.json();
      if (!submitted.ok) throw new Error(result.error);
      setTx(result.txHash);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Pilihan gagal"); }
    finally { setBusy(false); }
  }

  return <main className="section-wrap page-main" style={{ maxWidth: 920 }}><Link href="/predictions" className="back-link">← Predictions</Link><div className="page-heading"><div><p className="overline">HIVE / MONAD TESTNET</p><h1>{data?.content?.title ?? "Live Call"}</h1><p>{data?.content?.creator ?? "Memuat sumber..."}</p></div></div>{error && <p role="alert" className="choice-feedback">{error}</p>}{data && <><div className="rules-data"><div><span>Status</span><strong>{data.call.status}</strong></div><div><span>Baseline</span><strong>{data.call.baseline_views.toLocaleString("id-ID")}</strong></div><div><span>Target</span><strong>{data.call.target_views.toLocaleString("id-ID")}</strong></div><div><span>Jendela tutup</span><strong>{new Date(data.call.scheduled_closes_at).toLocaleString("id-ID")}</strong></div></div><p><a href={data.content?.source_url} target="_blank" rel="noreferrer">Buka video sumber ↗</a></p>{data.call.status === "open" && !tx && <div className="choice-section"><h2>Ambil posisi</h2><p>Setiap pilihan meminta tanda tangan wallet. Operator melihat pilihan untuk melakukan reveal setelah jendela tutup.</p>{ready && !authenticated ? <button className="button button-primary" onClick={login}>Masuk dengan Google</button> : <div className="choice-buttons"><button className="choice-button" disabled={busy} onClick={() => commit(true)}>Ya, tercapai</button><button className="choice-button" disabled={busy} onClick={() => commit(false)}>Tidak tercapai</button></div>}</div>}{tx && <div className="choice-feedback locked"><strong>Pilihan terkunci di Monad Testnet.</strong><p><a href={`https://testnet.monadscan.com/tx/${tx}`} target="_blank" rel="noreferrer">Lihat transaksi commit ↗</a></p></div>}{data.call.status === "resolved" && <div className="choice-feedback locked"><strong>Hasil: {Number(data.call.result_views) >= Number(data.call.target_views) ? "Ya" : "Tidak"}</strong><p>Snapshot hasil: {data.call.result_views?.toLocaleString("id-ID")} views</p>{data.call.resolve_tx_hash && <a href={`https://testnet.monadscan.com/tx/${data.call.resolve_tx_hash}`} target="_blank" rel="noreferrer">Transaksi resolusi ↗</a>}</div>}{data.call.status === "void" && <div className="choice-feedback"><strong>Call void</strong><p>{data.call.void_reason}</p></div>}<div className="rules-panel"><p className="overline">JEJAK ONCHAIN</p>{data.call.create_tx_hash && <p><a href={`https://testnet.monadscan.com/tx/${data.call.create_tx_hash}`} target="_blank" rel="noreferrer">Transaksi pembuatan Call ↗</a></p>}{data.call.close_tx_hash && <p><a href={`https://testnet.monadscan.com/tx/${data.call.close_tx_hash}`} target="_blank" rel="noreferrer">Transaksi penutupan dini ↗</a></p>}{data.call.resolve_tx_hash && <p><a href={`https://testnet.monadscan.com/tx/${data.call.resolve_tx_hash}`} target="_blank" rel="noreferrer">Transaksi hasil / void ↗</a></p>}<p>Rules hash: <code>{data.call.rules_hash}</code></p><p>Source hash: <code>{data.call.source_hash}</code></p></div><div className="rules-panel"><p className="overline">SNAPSHOT SUMBER</p>{data.snapshots.length ? data.snapshots.map((item) => <p key={item.snapshot_hash}>{item.purpose}: {item.views.toLocaleString("id-ID")} views · {new Date(item.observed_at).toLocaleString("id-ID")}<br /><small>{item.source} · {item.snapshot_hash}</small></p>) : <p>Belum ada snapshot.</p>}</div></>}</main>;
}
