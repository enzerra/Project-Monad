"use client";
import Link from "next/link";
import { useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, ArrowUpRight, Check, Clock3, ExternalLink, X } from "lucide-react";
import { findCall, findContent, formatCount, formatTime, type Choice } from "@/lib/demo-data";
import { VirtualAmount, type VirtualAccount } from "@/components/virtual-wallet";
import { SourceCallOutcome } from "@/components/source-call-progress";
import { useAccountAuth } from "@/components/auth-provider";
import { AuthControl } from "@/components/auth-control";
import { validateVirtualAmount, VIRTUAL_TOKEN } from "@/lib/virtual-token";
import "./call-detail-clean.css";

type Props = { id: string; state: VirtualAccount & { shareCall: (id: string) => void } };
export function CallDetailSimple({ id, state }: Props) {
  const auth = useAccountAuth(); const router = useRouter(); const reduceMotion = useReducedMotion();
  const [amount, setAmount] = useState<number>(VIRTUAL_TOKEN.defaultAmount);
  const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const source = state.calls?.find((item) => item.id === id);
  const call = source ?? findCall(id);
  if (!call) return <main className="call-clean-empty"><h1>{state.feedReady ? "Call not found" : "Loading Call…"}</h1><Link href="/predictions">Back to Calls</Link></main>;
  const content = state.contents?.find((item) => item.id === call.contentId) ?? findContent(call.contentId);
  if (!content) return <main className="call-clean-empty"><h1>Video unavailable</h1><Link href="/predictions">Back to Calls</Link></main>;
  const chosen = state.choices.find((item) => item.callId === id);
  const open = Boolean(source && call.status === "open" && !chosen);
  const percent = Math.max(0, Math.min(100, (call.currentViews - call.baselineViews) / (call.targetViews - call.baselineViews) * 100));
  const pick = async (choice: Choice) => { if (busy) return; if (state.loginRequired) { auth.login(); return; } setBusy(true); setError(""); const result = await state.selectChoice(id, choice, amount); if (!result.ok) setError(result.error); setBusy(false); };
  return <main className="call-clean"><Link href="/predictions" className="call-clean-back"><ArrowLeft size={17} /> Calls</Link>
    <motion.div className="call-clean-layout" initial={reduceMotion ? false : { opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .4 }}>
      <section className="call-clean-main"><div className="call-clean-meta"><span>{content.category.split(" · ")[0]} · {call.horizonHours} h</span><span>{open ? "Open" : chosen ? "Choice saved" : call.status === "resolved" ? "Result ready" : "Closed"}</span></div>
        <h1>{source ? `Will this Short reach ${formatCount(call.targetViews)} views in ${call.horizonHours}h?` : call.question}</h1><Link className="call-clean-video" href={source ? `/discover?video=${content.id}` : `/content/${content.id}`}><span className="call-clean-play">▶</span><span><strong>{content.title}</strong><small>{content.creator} · Watch video</small></span><ArrowUpRight size={19} /></Link>
        {source && <SourceCallOutcome call={source} chosen={chosen} />}
        <section className="call-clean-pick"><h2>{chosen ? "Your Calls" : open ? "Will it get there?" : "Call status"}</h2>
          {open && !state.loginRequired && <VirtualAmount account={state} amount={amount} onChange={setAmount} disabled={busy} />}
          {open ? <div className="call-clean-options">{(["yes", "no"] as const).map((choice) => <button type="button" key={choice} onClick={() => void pick(choice)} disabled={busy || !auth.ready || (!state.loginRequired && (!state.walletReady || Boolean(validateVirtualAmount(amount, state.balance))))}><span>{choice === "yes" ? <Check size={21} /> : <X size={21} />}</span><strong>{choice === "yes" ? "Yes, it will" : "No, it will not"}</strong><ArrowRight size={18} /></button>)}</div> : chosen ? <div className="call-clean-choice"><Check size={20} /><div><strong>{chosen.choice === "yes" ? "Yes, it will" : "No, it will not"}</strong><span>{formatCount(chosen.amount)} VIBE · {chosen.settlement === "won" ? "Won" : chosen.settlement === "lost" ? "Not this time" : chosen.settlement === "refunded" ? "Refunded" : "Awaiting result"}</span></div></div> : <div className="call-clean-choice"><Clock3 size={20} /><strong>{call.status === "resolved" ? `Result: ${call.result === "yes" ? "Yes" : "No"}` : call.status === "void" ? "Call cancelled" : "Awaiting result"}</strong></div>}
          {state.loginRequired && open && <div className="call-clean-login"><span>Sign in to make your Call.</span><AuthControl /></div>}
          {(error || (open && !state.loginRequired && state.walletError)) && <p role="alert" className="call-clean-error">{error || state.walletError}</p>}
        </section></section>
      <aside className="call-clean-side"><div className="call-clean-progress"><div className="call-clean-side-top"><span>VIEW MOMENTUM</span><span>{Math.round(percent)}%</span></div><strong>{formatCount(call.currentViews)}</strong><span className="call-clean-target">of {formatCount(call.targetViews)} views</span><div className="call-clean-track"><motion.div initial={reduceMotion ? false : { width: 0 }} animate={{ width: `${percent}%` }} transition={{ duration: reduceMotion ? 0 : .8 }} /></div><div className="call-clean-side-bottom"><span>Start {formatCount(call.baselineViews)}</span><span>Target {formatCount(call.targetViews)}</span></div></div>
        <div className="call-clean-deadline"><Clock3 size={19} /><div><span>Evaluation</span><strong>{formatTime(call.evaluationAt)}</strong></div></div>
        <details className="call-clean-rules"><summary>Rules & source <span>⌄</span></summary><p>One choice per Call. Correct: 2× return. Cancelled: full refund. VIBE has no cash value.</p><p>Entries close early at 50% of the required growth. The result uses a valid YouTube snapshot after the evaluation time.</p><a href={source?.sourceUrl ?? `/content/${content.id}`} target={source ? "_blank" : undefined} rel={source ? "noreferrer" : undefined}>Video source <ExternalLink size={14} /></a></details>
        <button type="button" className="call-clean-discuss" onClick={() => { state.shareCall(id); router.push(`/community?call=${id}`); }}>Discuss in Community <ArrowUpRight size={17} /></button>
      </aside>
    </motion.div></main>;
}
