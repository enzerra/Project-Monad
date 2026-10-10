"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Check, Clock3, Send, ShieldCheck, X } from "lucide-react";
import { findCall, findContent, formatCount, formatTime, type Choice } from "@/lib/demo-data";
import { PredictionIdentity, predictionCategoryLabels } from "@/components/prediction-subject";
import { VirtualAmount, type VirtualAccount } from "@/components/virtual-wallet";
import { validateVirtualAmount, VIRTUAL_TOKEN } from "@/lib/virtual-token";
import { SourceCallProgress, SourceCallOutcome } from "@/components/source-call-progress";
import { AuthControl } from "@/components/auth-control";
import { useAccountAuth } from "@/components/auth-provider";

type CallDetailState = VirtualAccount & { shareCall: (callId: string) => void; };

export function CallDetailPage({ id, state }: { id: string; state: CallDetailState }) {
  const auth = useAccountAuth();
  const [amount, setAmount] = useState<number>(VIRTUAL_TOKEN.defaultAmount);
  const [submitting, setSubmitting] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceCall = state.calls?.find((call) => call.id === id);
  const call = sourceCall ?? findCall(id);
  if (!call) return <main className="section-wrap not-found"><h1>{(state.feedReady ?? state.walletReady) ? "Call not found." : "Loading Call…"}</h1><Link href="/predictions">Back to Calls</Link></main>;
  const content = state.contents?.find((content) => content.id === call.contentId) ?? findContent(call.contentId);
  if (!content) return <main className="section-wrap not-found"><h1>Source video unavailable.</h1><Link href="/predictions">Back to Calls</Link></main>;
  const chosen = state.choices.find((item) => item.callId === id);
  const suggestion = searchParams.get("choice");
  const earlyClose = call.baselineViews + Math.ceil((call.targetViews - call.baselineViews) / 2);
  const open = Boolean(sourceCall && call.status === "open");
  const status = chosen ? chosen.status === "pending" ? "Confirming choice" : "Choice saved" : open ? "Open" : call.status === "resolved" ? "Result ready" : "Closed";

  const amountError = validateVirtualAmount(amount, state.balance);
  const choose = async (choice: Choice) => {
    if (submitting) return;
    if (state.loginRequired) { auth.login(); return; }
    setSubmitting(true);
    setChoiceError("");
    const result = await state.selectChoice(id, choice, amount);
    if (!result.ok) setChoiceError(result.error);
    setSubmitting(false);
  };
  return <main className="section-wrap detail-main call-detail-standard">
    <Link href="/predictions" className="back-link"><ArrowLeft size={16} />All Calls</Link>
    <div className="call-layout">
      <section className="call-main">
        <div className="call-header"><span className="overline">{predictionCategoryLabels[call.predictionCategory]} / {call.horizonHours} HOURS</span><span className="call-state-chip"><span />{status}</span></div>
        <h1>{call.question}</h1>
        <p className="call-subtitle">Pick an outcome. Follow the views.</p>
        <Link href={sourceCall ? `/discover?video=${content.id}` : `/content/${content.id}`} className="call-source-card reference-panel"><PredictionIdentity call={call} content={content} /><ArrowUpRight size={20} aria-hidden="true" /><span className="call-source-caption">Watch source video</span></Link>
        {sourceCall && <><SourceCallProgress call={sourceCall} serverNow={state.serverNow} /><SourceCallOutcome call={sourceCall} chosen={chosen} /></>}

        <section className="choice-section" aria-labelledby="choice-heading">
          <div className="section-label-row"><h2 id="choice-heading">Make your Call</h2><span>One choice per Call</span></div>
          {(suggestion === "yes" || suggestion === "no") && !chosen && open && <p className="choice-suggestion" id="choice-suggestion">You picked {suggestion === "yes" ? "Yes" : "No"} from the catalog. Confirm below.</p>}
          {open && !chosen && !state.loginRequired && <VirtualAmount account={state} amount={amount} onChange={setAmount} disabled={submitting} />}
          {choiceError && <p className="virtual-error" role="alert">{choiceError}</p>}
          {state.walletError && <p className="virtual-error" role="alert">{state.walletError}</p>}
          {state.loginRequired && <AuthControl />}
          {open && !chosen ? <div className="choice-buttons">
            {(["yes", "no"] as const).map((choice) => <button type="button" key={choice} disabled={submitting || !auth.ready || (!state.loginRequired && (!state.walletReady || Boolean(amountError)))} onClick={() => void choose(choice)} className={`choice-button reference-panel ${suggestion === choice ? "is-suggested" : ""}`} aria-label={`Choose ${choice === "yes" ? "Yes" : "No"} for ${call.question}`}>
              <span className="choice-card-head"><span className="choice-mark">{choice === "yes" ? <Check size={24} /> : <X size={24} />}</span><span><strong>{choice === "yes" ? "Yes, it will" : "No, it will not"}</strong><small>{predictionCategoryLabels[call.predictionCategory]} · {call.horizonHours} HOURS</small></span></span>
              <span className="choice-card-description">{choice === "yes" ? "The target is reached at evaluation." : "Views stay below the target at evaluation."}</span>
              <span className="reference-tag">{choice === "yes" ? "TARGET REACHED" : "BELOW TARGET"}</span>
              <span className="virtual-choice-cost">{state.loginRequired ? "Sign in to choose" : `${Number.isFinite(amount) ? formatCount(amount) : "—"} VIBE · confirm choice`}</span><span className="choice-card-bottom"><strong>{choice === "yes" ? "≥" : "<"} {formatCount(call.targetViews)} <span>views</span></strong><ArrowUpRight size={18} /></span>
            </button>)}
          </div> : chosen ? <div className={`choice-feedback ${chosen.status}`} role="status"><span className="choice-feedback-icon"><Check size={23} /></span><div><strong>Your choice: {chosen.choice === "yes" ? "Yes" : "No"}</strong><p>Your choice is locked and saved.</p><span className="virtual-choice-cost">{formatCount(chosen.amount)} VIBE spent</span></div></div> : <div className="choice-feedback"><Clock3 size={22} /><div><strong>{sourceCall ? "Entries closed" : "Example archive"}</strong><p>{call.status === "resolved" ? "The result is ready." : sourceCall ? "Check back at evaluation." : "This example Call does not accept credits."}</p></div></div>}
          <p className="choice-disclaimer"><ShieldCheck size={15} />{sourceCall ? "Observed YouTube views · Free credits · Correct Calls return 2×" : "Example data, not an observed YouTube result."}</p>
        </section>

        <div className="share-strip"><div><strong>Talk it through</strong><p>Share this Call in {predictionCategoryLabels[call.predictionCategory]}.</p></div><button type="button" onClick={() => { state.shareCall(id); router.push(`/community?call=${id}`); }} className="button button-secondary"><Send size={16} />Share Call</button></div>
      </section>

      <aside className="rules-panel reference-panel" aria-labelledby="rules-title">
        <p className="overline">CALL RULES</p><h2 id="rules-title">Target & timing</h2>
        <div className="rules-target"><span>FINAL TARGET</span><strong>{formatCount(call.targetViews)}<small> views</small></strong></div>
        <div className="rules-data">
          <div><span>Views awal</span><strong>{formatCount(call.baselineViews)}</strong></div>
          <div><span>Growth needed</span><strong>+{formatCount(call.targetViews - call.baselineViews)}</strong></div>
          <div><span>Early close</span><strong>{formatCount(earlyClose)}</strong></div>
          <div><span>Entries close</span><strong>{formatTime(sourceCall?.closesAt ?? call.scheduledClosesAt)}</strong></div>
          <div><span>Evaluation</span><strong>{formatTime(call.evaluationAt)}</strong></div>
        </div>
        <p className="rules-explain">Entries close early at 50% of the required growth. {sourceCall ? "The first valid YouTube snapshot within 30 minutes after evaluation determines the result. Missing or corrected views void the Call and refund your credits." : "Angka di halaman ini adalah example scenario."}</p>
        {sourceCall && <details className="rules-explain"><summary>How the target is set</summary><p>Two snapshots at least 30 minutes apart project growth over 6 hours. Target = starting views + max(100, projected growth). The target stays fixed; the projection is not a probability or guarantee.</p><p>{formatCount(sourceCall.calibration[0].views)} → {formatCount(sourceCall.calibration[1].views)} views<br />{formatTime(sourceCall.calibration[0].observedAt)} → {formatTime(sourceCall.calibration[1].observedAt)}</p></details>}
        <a href={sourceCall?.sourceUrl ?? `/content/${content.id}`} className="subtle-link" target={sourceCall ? "_blank" : undefined} rel={sourceCall ? "noreferrer" : undefined}>Watch source video<ArrowUpRight size={16} /></a>
      </aside>
    </div>
  </main>;
}
