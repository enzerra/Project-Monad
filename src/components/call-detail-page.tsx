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

type CallDetailState = VirtualAccount & { shareCall: (callId: string) => void; };

export function CallDetailPage({ id, state }: { id: string; state: CallDetailState }) {
  const [amount, setAmount] = useState<number>(VIRTUAL_TOKEN.defaultAmount);
  const [submitting, setSubmitting] = useState(false);
  const [choiceError, setChoiceError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const sourceCall = state.calls?.find((call) => call.id === id);
  const call = sourceCall ?? findCall(id);
  if (!call) return <main className="section-wrap not-found"><h1>{(state.feedReady ?? state.walletReady) ? "Call tidak ditemukan." : "Memuat Call…"}</h1><Link href="/predictions">Kembali ke prediksi</Link></main>;
  const content = state.contents?.find((content) => content.id === call.contentId) ?? findContent(call.contentId);
  if (!content) return <main className="section-wrap not-found"><h1>Konten sumber belum tersedia.</h1><Link href="/predictions">Kembali ke prediksi</Link></main>;
  const chosen = state.choices.find((item) => item.callId === id);
  const suggestion = searchParams.get("choice");
  const earlyClose = call.baselineViews + Math.ceil((call.targetViews - call.baselineViews) / 2);
  const open = Boolean(sourceCall && call.status === "open");
  const status = chosen ? chosen.status === "pending" ? "Memproses pilihan" : "Pilihan tersimpan" : open ? "Pilihan terbuka" : call.status === "resolved" ? "Hasil tersedia" : "Pilihan ditutup";

  const amountError = validateVirtualAmount(amount, state.balance);
  const choose = async (choice: Choice) => {
    if (submitting) return;
    setSubmitting(true);
    setChoiceError("");
    const result = await state.selectChoice(id, choice, amount);
    if (!result.ok) setChoiceError(result.error);
    setSubmitting(false);
  };
  return <main className="section-wrap detail-main call-detail-standard">
    <Link href="/predictions" className="back-link"><ArrowLeft size={16} />Semua prediksi</Link>
    <div className="call-layout">
      <section className="call-main">
        <div className="call-header"><span className="overline">{predictionCategoryLabels[call.predictionCategory]} / {call.horizonHours} JAM</span><span className="call-state-chip"><span />{status}</span></div>
        <h1>{call.question}</h1>
        <p className="call-subtitle">Pilih hasil yang kamu perkirakan. Ikuti perkembangan video sampai waktu evaluasi.</p>
        <Link href={sourceCall ? `/discover?video=${content.id}` : `/content/${content.id}`} className="call-source-card reference-panel"><PredictionIdentity call={call} content={content} /><ArrowUpRight size={20} aria-hidden="true" /><span className="call-source-caption">Tonton konten sumber</span></Link>
        {sourceCall && <><SourceCallProgress call={sourceCall} serverNow={state.serverNow} /><SourceCallOutcome call={sourceCall} chosen={chosen} /></>}

        <section className="choice-section" aria-labelledby="choice-heading">
          <div className="section-label-row"><h2 id="choice-heading">Tentukan pilihanmu</h2><span>Satu pilihan per Call</span></div>
          {(suggestion === "yes" || suggestion === "no") && !chosen && open && <p className="choice-suggestion" id="choice-suggestion">Kamu memilih {suggestion === "yes" ? "Ya" : "Tidak"} dari katalog. Tekan kartunya untuk mengonfirmasi.</p>}
          {open && !chosen && <VirtualAmount account={state} amount={amount} onChange={setAmount} disabled={submitting} />}
          {choiceError && <p className="virtual-error" role="alert">{choiceError}</p>}
          {state.walletError && <p className="virtual-error" role="alert">{state.walletError}</p>}
          {state.loginRequired && <AuthControl />}
          {open && !chosen ? <div className="choice-buttons">
            {(["yes", "no"] as const).map((choice) => <button type="button" key={choice} disabled={submitting || !state.walletReady || Boolean(amountError)} onClick={() => void choose(choice)} className={`choice-button reference-panel ${suggestion === choice ? "is-suggested" : ""}`} aria-label={`Pilih ${choice === "yes" ? "Ya" : "Tidak"} untuk ${call.question}`}>
              <span className="choice-card-head"><span className="choice-mark">{choice === "yes" ? <Check size={24} /> : <X size={24} />}</span><span><strong>{choice === "yes" ? "Ya, tercapai" : "Tidak tercapai"}</strong><small>{predictionCategoryLabels[call.predictionCategory]} · {call.horizonHours} JAM</small></span></span>
              <span className="choice-card-description">{choice === "yes" ? "Video mencapai target views saat evaluasi." : "Views video masih di bawah target saat evaluasi."}</span>
              <span className="reference-tag">{choice === "yes" ? "TARGET TERCAPAI" : "DI BAWAH TARGET"}</span>
              <span className="virtual-choice-cost">{Number.isFinite(amount) ? formatCount(amount) : "—"} VIBE · konfirmasi pilihan</span><span className="choice-card-bottom"><strong>{choice === "yes" ? "≥" : "<"} {formatCount(call.targetViews)} <span>views</span></strong><ArrowUpRight size={18} /></span>
            </button>)}
          </div> : chosen ? <div className={`choice-feedback ${chosen.status}`} role="status"><span className="choice-feedback-icon"><Check size={23} /></span><div><strong>Pilihanmu: {chosen.choice === "yes" ? "Ya" : "Tidak"}</strong><p>Pilihan terkunci dan tersimpan di server.</p><span className="virtual-choice-cost">{formatCount(chosen.amount)} VIBE digunakan</span></div></div> : <div className="choice-feedback"><Clock3 size={22} /><div><strong>{sourceCall ? "Pilihan telah ditutup" : "Arsip demo"}</strong><p>{call.status === "resolved" ? "Hasil Call ini sudah tersedia." : sourceCall ? "Tunggu evaluasi untuk melihat hasilnya." : "Call lama ini memakai data contoh dan tidak menerima kredit."}</p></div></div>}
          <p className="choice-disclaimer"><ShieldCheck size={15} />{sourceCall ? "Views YouTube nyata · VIBE gratis tanpa nilai uang · benar mengembalikan 2× nominal." : "Data contoh, bukan hasil pemeriksaan YouTube."}</p>
        </section>

        <div className="share-strip"><div><strong>Diskusikan bersama komunitas</strong><p>Bawa Call ini ke channel {predictionCategoryLabels[call.predictionCategory]}.</p></div><button type="button" onClick={() => { state.shareCall(id); router.push(`/community?call=${id}`); }} className="button button-secondary"><Send size={16} />Bagikan Call</button></div>
      </section>

      <aside className="rules-panel reference-panel" aria-labelledby="rules-title">
        <p className="overline">ATURAN CALL</p><h2 id="rules-title">Target & waktu</h2>
        <div className="rules-target"><span>TARGET AKHIR</span><strong>{formatCount(call.targetViews)}<small> views</small></strong></div>
        <div className="rules-data">
          <div><span>Views awal</span><strong>{formatCount(call.baselineViews)}</strong></div>
          <div><span>Kenaikan perlu</span><strong>+{formatCount(call.targetViews - call.baselineViews)}</strong></div>
          <div><span>Penutupan dini</span><strong>{formatCount(earlyClose)}</strong></div>
          <div><span>Pilihan tutup</span><strong>{formatTime(sourceCall?.closesAt ?? call.scheduledClosesAt)}</strong></div>
          <div><span>Evaluasi</span><strong>{formatTime(call.evaluationAt)}</strong></div>
        </div>
        <p className="rules-explain">Pilihan tutup dini saat views mencapai 50% jarak dari angka awal ke target. {sourceCall ? "Hasil memakai pemeriksaan pertama yang valid setelah evaluasi, maksimum terlambat 30 menit. Jika data tidak tersedia atau views dikoreksi turun, Call dibatalkan dan nominal kembali." : "Angka di halaman ini adalah skenario demo."}</p>
        {sourceCall && <details className="rules-explain"><summary>Cara target ditentukan</summary><p>Kenaikan views dari dua pemeriksaan berjarak minimal 30 menit diproyeksikan ke 6 jam. Target = views awal + maksimum(100, proyeksi kenaikan). Target tetap setelah Call dibuka; proyeksi bukan jaminan atau peluang.</p><p>{formatCount(sourceCall.calibration[0].views)} → {formatCount(sourceCall.calibration[1].views)} views<br />{formatTime(sourceCall.calibration[0].observedAt)} → {formatTime(sourceCall.calibration[1].observedAt)}</p></details>}
        <a href={sourceCall?.sourceUrl ?? `/content/${content.id}`} className="subtle-link" target={sourceCall ? "_blank" : undefined} rel={sourceCall ? "noreferrer" : undefined}>Lihat sumber video<ArrowUpRight size={16} /></a>
      </aside>
    </div>
  </main>;
}
