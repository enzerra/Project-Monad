"use client";

import { useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { X, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { findCall, formatCount } from "@/lib/demo-data";
import { validateVirtualAmount, VIRTUAL_TOKEN, type ChoiceResult, type VirtualChoice, type VirtualWallet } from "@/lib/virtual-token";
import type { Choice } from "@/lib/demo-data";
import type { SourceCall, ObservedContent } from "@/lib/source-calls";
import { AuthControl } from "@/components/auth-control";
import { useAccountAuth } from "@/components/auth-provider";

export type VirtualAccount = {
  wallet: VirtualWallet;
  choices: VirtualChoice[];
  balance: number;
  walletReady: boolean;
  feedReady?: boolean;
  loginRequired?: boolean;
  walletError: string;
  selectChoice: (callId: string, choice: Choice, amount?: number) => Promise<ChoiceResult>;
  calls?: SourceCall[];
  contents?: ObservedContent[];
  calibrationStartedAt?: string;
  lastCheckedAt?: string;
  serverNow?: string;
};

function TokenCoin() {
  return <Image className="vibe-token-coin" src="/brand/vibe-token.png" alt="" width={64} height={64} sizes="40px" />;
}

export function VirtualWalletPanel({ account }: { account: VirtualAccount }) {
  const auth = useAccountAuth();
  if (auth.configured && !auth.authenticated) return <section className="virtual-wallet-panel" aria-label="Masuk ke VIBE"><h2>Mulai pilih Call.</h2><p className="virtual-wallet-note">Masuk Google untuk mendapatkan 1.000 VIBE gratis.</p><AuthControl /></section>;
  return <section className="virtual-wallet-panel" aria-label="Saldo dan riwayat token VIBE">
    <span className="virtual-eyebrow">VIBE / SALDO SIMULASI</span>
    <div className="virtual-wallet-total"><TokenCoin /><strong>{account.walletReady ? formatCount(account.balance) : "—"}</strong><span>VIBE</span></div>
    <p className="virtual-wallet-note">Kredit gratis untuk mencoba prediksi. Tidak memiliki nilai uang, tidak bisa dibeli, ditransfer, atau dicairkan.</p>
    {account.walletError && <p className="virtual-error" role="alert">{account.walletError}</p>}
    {account.loginRequired && <AuthControl />}
    <dl className="virtual-wallet-rules"><div><dt>Saldo awal</dt><dd>1.000 VIBE / {auth.configured ? "akun" : "sesi"}</dd></div><div><dt>Nominal per Call</dt><dd>10–500 VIBE</dd></div><div><dt>Prediksi benar</dt><dd>2× nominal kembali</dd></div><div><dt>Call dibatalkan / void</dt><dd>Kredit dikembalikan</dd></div></dl>
    <div className="virtual-history-head"><h3>Riwayat saldo</h3><span>TERSIMPAN DI SERVER</span></div>
    <ul className="virtual-ledger">{[...account.wallet.entries].reverse().map((entry) => <li key={entry.id}>
      <span className={`virtual-ledger-icon ${entry.amount > 0 ? "is-credit" : ""}`}>{entry.amount > 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
      <div><strong>{entry.kind === "welcome" ? "Saldo awal gratis" : entry.kind === "reward" ? "Prediksi benar · pengembalian 2×" : entry.kind === "refund" ? "Pengembalian Call void" : "Pilihan dikonfirmasi"}</strong>{entry.callId ? <Link href={`/calls/${entry.callId}`}>{account.calls?.find((call) => call.id === entry.callId)?.question ?? findCall(entry.callId)?.question ?? entry.callId}</Link> : <span>Satu kali saat membuat saldo simulasi</span>}<time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("id-ID", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} WIB</time></div>
      <strong className={entry.amount > 0 ? "is-credit" : ""}>{entry.amount > 0 ? "+" : "−"}{formatCount(Math.abs(entry.amount))}<small> VIBE</small></strong>
    </li>)}</ul>
    <p className="virtual-wallet-note">Menang menerima 2× nominal, termasuk kredit yang dipasang. {auth.configured ? "Saldo dan riwayat mengikuti akun Google kamu, termasuk saat masuk dari perangkat lain." : "Saldo tersimpan di server dan dikenali melalui cookie browser ini. Menghapus cookie memutus akses ke sesi lokal."}</p>
  </section>;
}

export function VirtualBalance({ account }: { account: VirtualAccount }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const auth = useAccountAuth();
  const displayedBalance = account.walletReady ? formatCount(account.balance) : "—";
  if (auth.configured && (!auth.ready || !auth.authenticated)) return null;
  return <><button type="button" className="virtual-balance" onClick={() => dialog.current?.showModal()} aria-label={`Buka saldo token, ${account.walletReady ? displayedBalance : "belum dimuat"} VIBE`}><TokenCoin /><span className="token-balance-value" role="status" aria-atomic="true"><span className="token-balance-number"><AnimatePresence initial={false} mode="popLayout"><motion.strong key={displayedBalance} initial={reduceMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduceMotion ? undefined : { opacity: 0, y: -7, filter: "blur(3px)" }} transition={{ duration: reduceMotion ? 0 : .32, ease: [.22, 1, .36, 1] }}>{displayedBalance}</motion.strong></AnimatePresence></span><span className="token-balance-name">VIBE</span></span></button><dialog className="virtual-wallet-dialog" ref={dialog} aria-labelledby="virtual-wallet-title"><div className="virtual-dialog-top"><h2 id="virtual-wallet-title">Saldo VIBE</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Tutup saldo VIBE"><X size={20} /></button></div><VirtualWalletPanel account={account} /></dialog></>;
}

export function VirtualAmount({ account, amount, onChange, disabled = false }: { account: VirtualAccount; amount: number; onChange: (amount: number) => void; disabled?: boolean }) {
  const error = account.loginRequired ? "Masuk Google untuk memilih Call." : account.walletReady ? validateVirtualAmount(amount, account.balance) : "Memuat saldo VIBE…";
  return <fieldset className="virtual-amount" disabled={disabled || !account.walletReady}>
    <legend>Nominal VIBE</legend><div className="virtual-amount-top"><label><span>Kredit partisipasi</span><div><input type="number" inputMode="numeric" min={VIRTUAL_TOKEN.minAmount} max={Math.min(VIRTUAL_TOKEN.maxAmount, account.balance)} step="1" value={Number.isFinite(amount) ? amount : ""} onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} aria-label="Nominal VIBE untuk prediksi" aria-invalid={Boolean(error && account.walletReady)} /><strong>VIBE</strong></div></label><span>Saldo <strong>{account.walletReady ? formatCount(account.balance) : "—"}</strong> VIBE</span></div>
    <div className="virtual-amount-presets" aria-label="Nominal cepat">{[25, 50, 100, 250].map((value) => <button key={value} type="button" aria-pressed={amount === value} onClick={() => onChange(value)} disabled={disabled || value > account.balance}>{value}</button>)}</div>
    <p className={error ? "virtual-error" : "virtual-amount-hint"} role={error && account.walletReady ? "status" : undefined}>{error ?? "Dipotong saat konfirmasi · gratis, tanpa nilai uang."}</p>
    {!error && <p className="virtual-amount-hint">Jika benar: <strong>{formatCount(amount * 2)} VIBE kembali</strong> · keuntungan {formatCount(amount)} VIBE.</p>}
  </fieldset>;
}
