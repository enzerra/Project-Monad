import { z } from "zod";
import type { Call, Choice } from "./demo-data";

export const VIRTUAL_TOKEN = { symbol: "VIBE", initialBalance: 1_000, defaultAmount: 50, minAmount: 10, maxAmount: 500 } as const;
export const VIRTUAL_WALLET_KEY = "vibe-virtual-wallet-v1";

const choiceSchema = z.object({ callId: z.string(), choice: z.enum(["yes", "no"]), status: z.enum(["pending", "locked"]), amount: z.number().int().min(0).max(VIRTUAL_TOKEN.maxAmount), createdAt: z.string(), settlement: z.enum(["won", "lost", "refunded"]).optional(), settledAt: z.string().optional() });
const entrySchema = z.object({ id: z.string(), kind: z.enum(["welcome", "choice", "refund", "reward"]), amount: z.number().int(), callId: z.string().optional(), createdAt: z.string() });
const walletSchema = z.object({ version: z.literal(1), choices: z.array(choiceSchema), entries: z.array(entrySchema) });
export type VirtualChoice = z.infer<typeof choiceSchema>;
export type VirtualWallet = z.infer<typeof walletSchema>;
export type ChoiceResult = { ok: true } | { ok: false; error: string };

export function createVirtualWallet(now: string): VirtualWallet {
  return { version: 1, choices: [], entries: [{ id: "welcome", kind: "welcome", amount: VIRTUAL_TOKEN.initialBalance, createdAt: now }] };
}

export function virtualBalance(wallet: VirtualWallet): number {
  return wallet.entries.reduce((sum, entry) => sum + entry.amount, 0);
}

export function readVirtualWallet(raw: string | null, legacy: string | null, now: string): VirtualWallet {
  if (raw) {
    const parsed = walletSchema.parse(JSON.parse(raw));
    // Reject inconsistent ledgers instead of silently granting a fresh balance.
    const ids = parsed.entries.map((entry) => entry.id);
    const calls = parsed.choices.map((choice) => choice.callId);
    if (new Set(ids).size !== ids.length || new Set(calls).size !== calls.length || parsed.entries[0]?.id !== "welcome" || parsed.entries[0]?.kind !== "welcome" || parsed.entries[0]?.amount !== VIRTUAL_TOKEN.initialBalance) throw new Error("Invalid virtual wallet");
    for (const choice of parsed.choices) {
      if (choice.amount > 0 && !parsed.entries.some((entry) => entry.id === `choice:${choice.callId}` && entry.kind === "choice" && entry.callId === choice.callId && entry.amount === -choice.amount)) throw new Error("Invalid choice debit");
    }
    let runningBalance = 0;
    for (const entry of parsed.entries) {
      if (entry.kind === "welcome" && entry.id !== "welcome") throw new Error("Duplicate initial credit");
      if (entry.kind !== "welcome") {
        const choice = parsed.choices.find((item) => item.callId === entry.callId);
        if (!choice || choice.amount === 0 || entry.id !== `${entry.kind}:${entry.callId}` || entry.amount !== (entry.kind === "choice" ? -choice.amount : entry.kind === "reward" ? choice.amount * 2 : choice.amount)) throw new Error("Invalid ledger entry");
        if (entry.kind === "reward" && parsed.entries.some((item) => item.kind === "refund" && item.callId === entry.callId)) throw new Error("Conflicting settlement");
      }
      runningBalance += entry.amount;
      if (runningBalance < 0) throw new Error("Negative balance");
    }
    return { ...parsed, choices: parsed.choices.map((choice) => ({ ...choice, status: "locked" })) };
  }
  const wallet = createVirtualWallet(now);
  if (legacy) {
    const previous = z.array(z.object({ callId: z.string(), choice: z.enum(["yes", "no"]), status: z.enum(["pending", "locked"]) })).parse(JSON.parse(legacy));
    wallet.choices = previous.filter((choice, index) => previous.findIndex((item) => item.callId === choice.callId) === index).map((choice) => ({ ...choice, status: "locked", amount: 0, createdAt: now }));
  }
  return wallet;
}

export function validateVirtualAmount(amount: number, balance: number): string | null {
  if (!Number.isSafeInteger(amount) || amount < VIRTUAL_TOKEN.minAmount || amount > VIRTUAL_TOKEN.maxAmount) return `Gunakan ${VIRTUAL_TOKEN.minAmount}–${VIRTUAL_TOKEN.maxAmount} VIBE, tanpa desimal.`;
  if (amount > balance) return "Saldo VIBE tidak cukup untuk nominal ini.";
  return null;
}

export function placeVirtualChoice(wallet: VirtualWallet, call: Call | undefined, choice: Choice, amount: number, now: string): { wallet: VirtualWallet; result: ChoiceResult } {
  const fail = (error: string) => ({ wallet, result: { ok: false, error } as ChoiceResult });
  if (!call || call.status !== "open") return fail("Call ini tidak menerima pilihan baru.");
  if (choice !== "yes" && choice !== "no") return fail("Pilihan tidak valid.");
  if (wallet.choices.some((item) => item.callId === call.id)) return fail("Kamu sudah memilih pada Call ini.");
  const error = validateVirtualAmount(amount, virtualBalance(wallet));
  if (error) return fail(error);
  return {
    wallet: {
      ...wallet,
      choices: [...wallet.choices, { callId: call.id, choice, amount, status: "pending", createdAt: now }],
      entries: [...wallet.entries, { id: `choice:${call.id}`, kind: "choice", amount: -amount, callId: call.id, createdAt: now }],
    },
    result: { ok: true },
  };
}

// Participation credits are returned for void Calls. Correct answers do not mint rewards.
export function refundVoidChoices(wallet: VirtualWallet, calls: Call[], now: string): VirtualWallet {
  const refunds = wallet.choices.filter((choice) => choice.amount > 0 && calls.some((call) => call.id === choice.callId && call.status === "void") && !wallet.entries.some((entry) => entry.id === `refund:${choice.callId}`)).map((choice) => ({ id: `refund:${choice.callId}`, kind: "refund" as const, amount: choice.amount, callId: choice.callId, createdAt: now }));
  return refunds.length ? { ...wallet, entries: [...wallet.entries, ...refunds] } : wallet;
}
