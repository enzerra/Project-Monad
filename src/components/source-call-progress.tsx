"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { Clock3, ArrowUpRight, Check, RotateCcw } from "lucide-react";
import { formatCount, formatTime } from "@/lib/demo-data";
import type { SourceCall } from "@/lib/source-calls";
import type { VirtualChoice } from "@/lib/virtual-token";
import { AnimatedViewCount } from "./animated-view-count";
import "./source-call.css";

export function SourceCallProgress({ call, serverNow, compact = false }: { call: SourceCall; serverNow?: string; compact?: boolean }) {
  const [elapsed, setElapsed] = useState(0);
  const reduceMotion = useReducedMotion();
  useEffect(() => {
    let disposed = false;
    const started = Date.now();
    queueMicrotask(() => { if (!disposed) setElapsed(0); });
    const interval = window.setInterval(() => setElapsed(Date.now() - started), 1000);
    return () => { disposed = true; window.clearInterval(interval); };
  }, [serverNow]);
  const now = Date.parse(serverNow ?? call.observedAt) + elapsed;
  const remaining = Math.max(0, Date.parse(call.evaluationAt) - now);
  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor(remaining % 3_600_000 / 60_000);
  const seconds = Math.floor(remaining % 60_000 / 1000);
  const finished = call.status === "resolved" || call.status === "void";
  const stale = !finished && now - Date.parse(call.observedAt) > 90_000;
  const progress = Math.max(0, Math.min(100, (call.currentViews - call.baselineViews) / (call.targetViews - call.baselineViews) * 100));
  const countdown = `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  if (compact) return <section className="source-call-progress source-progress-compact" aria-label="Perkembangan views YouTube">
    <div className="source-compact-label"><span>Views saat ini</span><span className="source-freshness" title={`Diperiksa ${formatTime(call.observedAt)}`}><span className={stale ? "source-dot is-stale" : "source-dot"} />{stale ? "Tertunda" : "YouTube"}</span></div>
    <strong className="source-compact-number"><AnimatedViewCount key={call.id} value={call.currentViews} /></strong>
    <div className="source-progress-track" role="progressbar" aria-label="Kenaikan views sejak Call dibuka menuju target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${formatCount(call.currentViews)} dari target ${formatCount(call.targetViews)} views`}><motion.span initial={false} animate={{ scaleX: progress / 100 }} transition={{ duration: reduceMotion ? 0 : .65, ease: [0.22, 1, 0.36, 1] }} /></div>
    <div className="source-compact-gap"><ArrowUpRight size={14} aria-hidden="true" /><span>{call.currentViews >= call.targetViews ? "Target tercapai" : `${formatCount(call.targetViews - call.currentViews)} views lagi`}</span></div>
    <div className="source-compact-time"><Clock3 size={16} aria-hidden="true" /><span>{finished ? "Dievaluasi" : remaining ? "Evaluasi dalam" : "Evaluasi"}</span><strong>{finished ? formatTime(call.evaluationAt) : remaining ? countdown : "Menunggu data"}</strong></div>
  </section>;
  return <section className="source-call-progress" aria-label="Perkembangan views YouTube">
    <div className="source-view-row"><div><span>VIEWS YOUTUBE</span><strong><AnimatedViewCount key={call.id} value={call.currentViews} /></strong></div><div><span>TARGET</span><strong>{formatCount(call.targetViews)}</strong></div></div>
    <div className="source-progress-track" role="progressbar" aria-label="Kenaikan views menuju target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><motion.span initial={false} animate={{ scaleX: progress / 100 }} transition={{ duration: reduceMotion ? 0 : .35 }} /></div>
    <p className="source-observed"><span className={stale ? "source-dot is-stale" : "source-dot"} />{stale ? "Pembaruan tertunda · " : "YouTube · "}<time dateTime={call.observedAt}>diperiksa {new Date(call.observedAt).toLocaleTimeString("id-ID", { timeZone: "Asia/Jakarta" })} WIB</time></p>
    <div className="source-countdown"><span>{finished ? "Evaluasi" : remaining ? "Evaluasi dalam" : "Status evaluasi"}</span><strong>{finished ? formatTime(call.evaluationAt) : remaining ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}` : "Menunggu data YouTube"}</strong></div>
  </section>;
}

export function SourceCallOutcome({ call, chosen, compact = false }: { call: SourceCall; chosen?: VirtualChoice; compact?: boolean }) {
  if (call.status !== "resolved" && call.status !== "void") return null;
  if (compact) return <section className="source-outcome source-outcome-compact" role="status">
    {call.status === "void" ? <RotateCcw size={20} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}
    <div><strong>{call.status === "void" ? "Call dibatalkan" : chosen?.settlement === "won" ? "Prediksimu benar" : chosen?.settlement === "lost" ? "Prediksimu belum tepat" : `Hasil: ${call.result === "yes" ? "Ya" : "Tidak"}`}</strong>
    <p>{chosen?.settlement === "won" ? `+${formatCount(chosen.amount * 2)} VIBE · termasuk nominal awal` : chosen?.settlement === "refunded" ? `${formatCount(chosen.amount)} VIBE dikembalikan` : chosen?.settlement === "lost" ? "Tidak ada potongan tambahan" : call.status === "void" ? "Tidak ada hasil valid" : "Bukti tersedia di detail Call"}</p></div>
  </section>;
  return <section className={`source-outcome ${chosen?.settlement === "won" ? "is-win" : ""}`} role="status">
    <span>{call.status === "void" ? "CALL DIBATALKAN" : `HASIL · ${call.result === "yes" ? "YA" : "TIDAK"}`}</span>
    <h3>{call.status === "void" ? "Kredit dikembalikan" : chosen?.settlement === "won" ? "Prediksimu benar" : chosen?.settlement === "lost" ? "Prediksimu belum tepat" : "Hasil sudah diperiksa"}</h3>
    {chosen && <p>{chosen.settlement === "won" ? `+${formatCount(chosen.amount * 2)} VIBE masuk ke saldo, termasuk nominal awal. Keuntungan ${formatCount(chosen.amount)} VIBE.` : chosen.settlement === "refunded" ? `${formatCount(chosen.amount)} VIBE kembali ke saldo.` : chosen.settlement === "lost" ? "Tidak ada potongan tambahan dari saldo." : "Pembaruan saldo sedang diperiksa."}</p>}
    {call.status === "void" && <p>{call.voidReason === "metric_correction" ? "YouTube mengoreksi views saat evaluasi." : "Tidak ada pemeriksaan valid dalam 30 menit setelah waktu evaluasi."}</p>}
    {call.proof && <details><summary>Lihat bukti pemeriksaan</summary><p>{formatCount(call.proof.views)} views · {formatTime(call.proof.observedAt)}</p><a href={call.sourceUrl} target="_blank" rel="noreferrer">Sumber YouTube Shorts</a><code>{call.proof.hash}</code><small>{call.ruleVersion} · YouTube Data API</small></details>}
  </section>;
}
