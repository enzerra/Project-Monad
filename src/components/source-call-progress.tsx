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
  if (compact) return <section className="source-call-progress source-progress-compact" aria-label="YouTube view progress">
    <div className="source-compact-label"><span>Current views</span><span className="source-freshness" title={`Checked ${formatTime(call.observedAt)}`}><span className={stale ? "source-dot is-stale" : "source-dot"} />{stale ? "Delayed" : "YouTube"}</span></div>
    <strong className="source-compact-number"><AnimatedViewCount key={call.id} value={call.currentViews} /></strong>
    <div className="source-progress-track" role="progressbar" aria-label="View growth from opening to target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)} aria-valuetext={`${formatCount(call.currentViews)} of target ${formatCount(call.targetViews)} views`}><motion.span initial={false} animate={{ scaleX: progress / 100 }} transition={{ duration: reduceMotion ? 0 : .65, ease: [0.22, 1, 0.36, 1] }} /></div>
    <div className="source-compact-gap"><ArrowUpRight size={14} aria-hidden="true" /><span>{call.currentViews >= call.targetViews ? "Target reached" : `${formatCount(call.targetViews - call.currentViews)} views to go`}</span></div>
    <div className="source-compact-time"><Clock3 size={16} aria-hidden="true" /><span>{finished ? "Evaluated" : remaining ? "Result in" : "Evaluation"}</span><strong>{finished ? formatTime(call.evaluationAt) : remaining ? countdown : "Awaiting data"}</strong></div>
  </section>;
  return <section className="source-call-progress" aria-label="YouTube view progress">
    <div className="source-view-row"><div><span>YOUTUBE VIEWS</span><strong><AnimatedViewCount key={call.id} value={call.currentViews} /></strong></div><div><span>TARGET</span><strong>{formatCount(call.targetViews)}</strong></div></div>
    <div className="source-progress-track" role="progressbar" aria-label="View growth toward target" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress)}><motion.span initial={false} animate={{ scaleX: progress / 100 }} transition={{ duration: reduceMotion ? 0 : .35 }} /></div>
    <p className="source-observed"><span className={stale ? "source-dot is-stale" : "source-dot"} />{stale ? "Update delayed · " : "YouTube · "}<time dateTime={call.observedAt}>checked {new Date(call.observedAt).toLocaleTimeString("en-US", { timeZone: "Asia/Jakarta" })} GMT+7</time></p>
    <div className="source-countdown"><span>{finished ? "Evaluation" : remaining ? "Result in" : "Result status"}</span><strong>{finished ? formatTime(call.evaluationAt) : remaining ? `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}` : "Waiting for YouTube"}</strong></div>
  </section>;
}

export function SourceCallOutcome({ call, chosen, compact = false }: { call: SourceCall; chosen?: VirtualChoice; compact?: boolean }) {
  if (call.status !== "resolved" && call.status !== "void") return null;
  if (compact) return <section className="source-outcome source-outcome-compact" role="status">
    {call.status === "void" ? <RotateCcw size={20} aria-hidden="true" /> : <Check size={20} aria-hidden="true" />}
    <div><strong>{call.status === "void" ? "Call cancelled" : chosen?.settlement === "won" ? "Great Call" : chosen?.settlement === "lost" ? "Not this time" : `Result: ${call.result === "yes" ? "Yes" : "No"}`}</strong>
    <p>{chosen?.settlement === "won" ? `+${formatCount(chosen.amount * 2)} VIBE · includes your initial amount` : chosen?.settlement === "refunded" ? `${formatCount(chosen.amount)} VIBE refunded` : chosen?.settlement === "lost" ? "No additional deduction" : call.status === "void" ? "No valid result" : "Proof in Call details"}</p></div>
  </section>;
  return <section className={`source-outcome ${chosen?.settlement === "won" ? "is-win" : ""}`} role="status">
    <span>{call.status === "void" ? "CALL CANCELLED" : `RESULT · ${call.result === "yes" ? "YES" : "NO"}`}</span>
    <h3>{call.status === "void" ? "Full refund" : chosen?.settlement === "won" ? "Great Call" : chosen?.settlement === "lost" ? "Not this time" : "Result verified"}</h3>
    {chosen && <p>{chosen.settlement === "won" ? `+${formatCount(chosen.amount * 2)} VIBE returned, including your initial amount. Net gain ${formatCount(chosen.amount)} VIBE.` : chosen.settlement === "refunded" ? `${formatCount(chosen.amount)} VIBE refunded.` : chosen.settlement === "lost" ? "No additional balance deduction." : "Checking your balance update."}</p>}
    {call.status === "void" && <p>{call.voidReason === "metric_correction" ? "YouTube corrected its view count at evaluation." : "No valid snapshot within 30 minutes of evaluation."}</p>}
    {call.proof && <details><summary>View snapshot proof</summary><p>{formatCount(call.proof.views)} views · {formatTime(call.proof.observedAt)}</p><a href={call.sourceUrl} target="_blank" rel="noreferrer">YouTube Shorts source</a><code>{call.proof.hash}</code><small>{call.ruleVersion} · YouTube Data API</small></details>}
  </section>;
}
