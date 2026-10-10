"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ArrowUpRight, Trophy } from "lucide-react";
import type { FootballCall } from "@/lib/football-calls";
import type { Choice } from "@/lib/demo-data";
import { formatTime } from "@/lib/demo-data";
import { validateVirtualAmount } from "@/lib/virtual-token";
import { AuthControl } from "./auth-control";
import { VirtualAmount, type VirtualAccount } from "./virtual-wallet";
import "./football-calls.css";

function MatchScore({ call }: { call: FootballCall }) {
  return <div className="football-score" aria-label={`${call.home} ${call.homeScore ?? "versus"} ${call.awayScore ?? ""} ${call.away}`}>
    <div><span className="football-crest" aria-hidden="true">{call.home === "Barcelona" ? "FCB" : "HIL"}</span><strong>{call.home}</strong></div>
    <span className="football-scoreline">{call.homeScore === undefined ? "vs" : `${call.homeScore} – ${call.awayScore}`}</span>
    <div><span className="football-crest" aria-hidden="true">{call.away === "Getafe" ? "GET" : "ITT"}</span><strong>{call.away}</strong></div>
  </div>;
}
const statusLabel = (call: FootballCall) => call.status === "resolved" ? "Full time" : call.status === "void" ? "Refunded" : call.matchState === "live" ? `Live · ${call.statusText}` : call.status === "open" ? "Open until kickoff" : "Entries closed";

export function FootballCards({ calls }: { calls: FootballCall[] }) {
  const reduced = useReducedMotion();
  if (!calls.length) return null;
  return <section className="football-section" aria-label="Football match Calls"><div className="football-section-heading"><Trophy size={18} /><h3>Matchday Calls</h3><span>90 minutes + stoppage time</span></div><div className="football-grid">{calls.map(call => <motion.article key={call.id} className="football-card" initial={reduced ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}>
    <div className="football-topline"><span>{call.competition}</span><span className={call.matchState === "live" ? "football-live" : ""}>{statusLabel(call)}</span></div>
    <MatchScore call={call} />
    <p className="football-kickoff">{formatTime(call.kickoff)}</p>
    <Link className="football-card-link" href={`/calls/${call.id}`}><strong>{call.status === "resolved" ? `${call.result === "yes" ? "Yes" : "No"} · ${call.question}` : call.question}</strong><ArrowUpRight size={20} /></Link>
  </motion.article>)}</div></section>;
}

export function FootballDetail({ id, account }: { id: string; account: VirtualAccount }) {
  const call = account.footballCalls?.find(item => item.id === id);
  const [choice, setChoice] = useState<Choice | null>(null);
  const [amount, setAmount] = useState(50);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const timer = setInterval(tick,1000); return () => clearInterval(timer); }, []);
  if (!call) return <section className="football-detail" role="status"><h1>{account.feedReady ? "Match not found" : "Loading match…"}</h1><Link href="/predictions">Back to Calls</Link></section>;
  const saved = account.choices.find(item => item.callId === id);
  const fresh = now !== null && Boolean(call.observedAt) && now - Date.parse(call.observedAt!) <= 90_000;
  const open = now !== null && call.status === "open" && now < Date.parse(call.closesAt);
  const validAmount = !validateVirtualAmount(amount, account.balance);
  const confirm = async () => {
    if (!choice || pending || !open || !fresh || !validAmount) return;
    setPending(true); setFeedback("");
    try { const result = await account.selectChoice(call.id, choice, amount); setFeedback(result.ok ? "Your Call is confirmed." : result.error); }
    finally { setPending(false); }
  };
  return <main className="football-detail">
    <Link href="/predictions" className="back-link"><ArrowLeft size={17} /> Back to Calls</Link>
    <div className="football-topline"><span>{call.competition}</span><span className={call.matchState === "live" ? "football-live" : ""}>{statusLabel(call)}</span></div>
    <MatchScore call={call} />
    <p className="football-kickoff">Kickoff · {formatTime(call.kickoff)}</p>
    <h1>{call.question}</h1><p className="football-explainer">Yes: {call.home} win. No: draw or {call.away} win.</p>
    {call.status === "resolved" ? <div className="football-result" role="status"><span>Final result</span><strong>{call.result === "yes" ? "Yes" : "No"}</strong><p>{call.home} {call.homeScore} – {call.awayScore} {call.away}</p></div>
      : call.status === "void" ? <p className="football-result">{call.voidReason}. Entries refunded.</p>
      : saved ? <div className="football-result"><span>Your Call</span><strong>{saved.choice === "yes" ? "Yes" : "No"} · {saved.amount} VIBE</strong><p>Locked. Settles after verified full time.</p></div>
      : !open ? <p className="football-result">Entries are closed. Follow the score here.</p>
      : account.loginRequired ? <div className="football-entry"><p>Sign in to make your Call.</p><AuthControl /></div>
      : <div className="football-entry"><div className="football-outcomes">{(["yes","no"] as const).map(option => <button type="button" key={option} aria-pressed={choice === option} disabled={pending} onClick={() => {setChoice(option);setFeedback("");}}>{option === "yes" ? "Yes" : "No"}<small>{option === "yes" ? `${call.home} win` : "Draw or away win"}</small></button>)}</div>
        <VirtualAmount account={account} amount={amount} onChange={setAmount} disabled={pending} />
        {!fresh && <p role="status">Waiting for fresh match data…</p>}
        <button className="football-confirm" type="button" disabled={!choice || !account.walletReady || !validAmount || pending || !fresh} onClick={() => void confirm()}>{pending ? "Confirming…" : choice ? `Confirm ${choice === "yes" ? "Yes" : "No"} · ${amount} VIBE` : "Choose Yes or No"}</button>
      </div>}
    {saved && (call.status === "resolved" || call.status === "void") && <p className="football-settlement" role="status">{saved.settlement === "won" ? `Correct Call · ${saved.amount * 2} VIBE returned` : saved.settlement === "lost" ? `Incorrect Call · ${saved.amount} VIBE spent` : saved.settlement === "refunded" ? `${saved.amount} VIBE refunded` : "Settling your balance…"}</p>}
    {feedback && <p role="status">{feedback}</p>}
    <div className="football-source"><a href={call.sourceUrl} target="_blank" rel="noreferrer">ESPN match centre <ArrowUpRight size={15} /></a><span>{call.observedAt ? `Checked ${formatTime(call.observedAt)}` : "Awaiting source"}</span></div>
    <details className="football-rules"><summary>Rules & result proof</summary><p>Entries close at kickoff. League result after 90 minutes plus stoppage time; extra time and penalties are excluded. A correct Call returns 2× including your original amount. Scores are checked every 30 seconds; results wait for verified full time. Postponed, abandoned or cancelled matches, or no verified result within 24 hours, refund your amount.</p><p>Free VIBE credits. No cash value.</p>{call.proof && <><p>Full-time score: {call.proof.homeScore}–{call.proof.awayScore} · {formatTime(call.proof.observedAt)}</p><code>{call.proof.hash}</code></>}</details>
  </main>;
}
