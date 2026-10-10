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
import type { FootballCall } from "@/lib/football-calls";
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
  footballCalls?: FootballCall[];
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
  if (auth.configured && !auth.authenticated) return <section className="virtual-wallet-panel" aria-label="Sign in to VIBE"><h2>Your next Call starts here.</h2><p className="virtual-wallet-note">Sign in with Google. Start with 1,000 free VIBE.</p><AuthControl /></section>;
  return <section className="virtual-wallet-panel" aria-label="VIBE balance and history">
    <span className="virtual-eyebrow">YOUR VIBE</span>
    <div className="virtual-wallet-total"><TokenCoin /><strong>{account.walletReady ? formatCount(account.balance) : "—"}</strong><span>VIBE</span></div>
    <p className="virtual-wallet-note">Free prediction credits. No purchases, transfers or cash-out.</p>
    {account.walletError && <p className="virtual-error" role="alert">{account.walletError}</p>}
    {account.loginRequired && <AuthControl />}
    <dl className="virtual-wallet-rules"><div><dt>Starting balance</dt><dd>1,000 VIBE / {auth.configured ? "account" : "session"}</dd></div><div><dt>Per Call</dt><dd>10–500 VIBE</dd></div><div><dt>Correct Call</dt><dd>2× return</dd></div><div><dt>Cancelled Call</dt><dd>Full refund</dd></div></dl>
    <div className="virtual-history-head"><h3>Balance history</h3><span>ACCOUNT HISTORY</span></div>
    <ul className="virtual-ledger">{[...account.wallet.entries].reverse().map((entry) => <li key={entry.id}>
      <span className={`virtual-ledger-icon ${entry.amount > 0 ? "is-credit" : ""}`}>{entry.amount > 0 ? <ArrowDownLeft size={17} /> : <ArrowUpRight size={17} />}</span>
      <div><strong>{entry.kind === "welcome" ? "Welcome credits" : entry.kind === "reward" ? "Correct Call · 2× return" : entry.kind === "refund" ? "Cancelled Call refund" : "Call confirmed"}</strong>{entry.callId ? <Link href={`/calls/${entry.callId}`}>{account.calls?.find((call) => call.id === entry.callId)?.question ?? account.footballCalls?.find(call => call.id === entry.callId)?.question ?? findCall(entry.callId)?.question ?? entry.callId}</Link> : <span>One welcome grant per account</span>}<time dateTime={entry.createdAt}>{new Date(entry.createdAt).toLocaleString("en-US", { timeZone: "Asia/Jakarta", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })} GMT+7</time></div>
      <strong className={entry.amount > 0 ? "is-credit" : ""}>{entry.amount > 0 ? "+" : "−"}{formatCount(Math.abs(entry.amount))}<small> VIBE</small></strong>
    </li>)}</ul>
    <p className="virtual-wallet-note">A correct Call returns 2×, including your original amount. {auth.configured ? "Your balance follows your Google account across devices." : "This session is linked to your browser cookie."}</p>
  </section>;
}

export function VirtualBalance({ account }: { account: VirtualAccount }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const reduceMotion = useReducedMotion();
  const auth = useAccountAuth();
  const displayedBalance = account.walletReady ? formatCount(account.balance) : "—";
  if (auth.configured && (!auth.ready || !auth.authenticated)) return null;
  return <><button type="button" className="virtual-balance" onClick={() => dialog.current?.showModal()} aria-label={`Open VIBE balance, ${account.walletReady ? displayedBalance : "loading"} VIBE`}><TokenCoin /><span className="token-balance-value" role="status" aria-atomic="true"><span className="token-balance-number"><AnimatePresence initial={false} mode="popLayout"><motion.strong key={displayedBalance} initial={reduceMotion ? false : { opacity: 0, y: 7, filter: "blur(3px)" }} animate={{ opacity: 1, y: 0, filter: "blur(0px)" }} exit={reduceMotion ? undefined : { opacity: 0, y: -7, filter: "blur(3px)" }} transition={{ duration: reduceMotion ? 0 : .32, ease: [.22, 1, .36, 1] }}>{displayedBalance}</motion.strong></AnimatePresence></span><span className="token-balance-name">VIBE</span></span></button><dialog className="virtual-wallet-dialog" ref={dialog} aria-labelledby="virtual-wallet-title"><div className="virtual-dialog-top"><h2 id="virtual-wallet-title">VIBE balance</h2><button type="button" onClick={() => dialog.current?.close()} aria-label="Close VIBE balance"><X size={20} /></button></div><VirtualWalletPanel account={account} /></dialog></>;
}

export function VirtualAmount({ account, amount, onChange, disabled = false }: { account: VirtualAccount; amount: number; onChange: (amount: number) => void; disabled?: boolean }) {
  const error = account.loginRequired ? "Sign in with Google to make your Call." : account.walletReady ? validateVirtualAmount(amount, account.balance) : "Loading balance…";
  return <fieldset className="virtual-amount" disabled={disabled || !account.walletReady}>
    <legend>Your amount</legend><div className="virtual-amount-top"><label><span>Your amount</span><div><input type="number" inputMode="numeric" min={VIRTUAL_TOKEN.minAmount} max={Math.min(VIRTUAL_TOKEN.maxAmount, account.balance)} step="1" value={Number.isFinite(amount) ? amount : ""} onChange={(event) => onChange(event.target.value === "" ? Number.NaN : Number(event.target.value))} aria-label="VIBE amount for your Call" aria-invalid={Boolean(error && account.walletReady)} /><strong>VIBE</strong></div></label><span>Balance <strong>{account.walletReady ? formatCount(account.balance) : "—"}</strong> VIBE</span></div>
    <div className="virtual-amount-presets" aria-label="Quick amounts">{[25, 50, 100, 250].map((value) => <button key={value} type="button" aria-pressed={amount === value} onClick={() => onChange(value)} disabled={disabled || value > account.balance}>{value}</button>)}</div>
    <p className={error ? "virtual-error" : "virtual-amount-hint"} role={error && account.walletReady ? "status" : undefined}>{error ?? "Spent on confirmation. Free credits, no cash value."}</p>
    {!error && <p className="virtual-amount-hint">If correct: <strong>{formatCount(amount * 2)} VIBE returned</strong> · net gain {formatCount(amount)} VIBE.</p>}
  </fieldset>;
}
