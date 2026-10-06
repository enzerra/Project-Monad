"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Choice } from "@/lib/demo-data";
import type { SourceAccountSnapshot } from "@/lib/source-calls";
import { virtualBalance, VIRTUAL_TOKEN, type ChoiceResult, type VirtualWallet } from "@/lib/virtual-token";

const empty: VirtualWallet = { version: 1, choices: [], entries: [] };

export function useVirtualWallet() {
  const [snapshot, setSnapshot] = useState<SourceAccountSnapshot>();
  const [walletError, setWalletError] = useState("");
  const revision = useRef(-1);
  const selecting = useRef(false);

  const publish = useCallback((next: SourceAccountSnapshot) => {
    if (!next.wallet || !Array.isArray(next.calls) || !Array.isArray(next.contents) || !Number.isSafeInteger(next.revision)) throw new Error("Invalid account response");
    if (next.revision >= revision.current) {
      revision.current = next.revision;
      setSnapshot(next);
      setWalletError("");
    }
  }, []);

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || controller) return;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12_000);
      try {
        const response = await fetch("/api/vibe", { cache: "no-store", signal: controller.signal });
        if (!response.ok) throw new Error("Unavailable");
        const next = await response.json();
        if (!disposed) publish(next);
      } catch {
        if (!disposed) setWalletError("Pembaruan saldo tertunda. Saldo dan pilihan terakhir tetap ditampilkan.");
      } finally { window.clearTimeout(timeout); controller = undefined; }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [publish]);

  const selectChoice = useCallback(async (callId: string, choice: Choice, amount: number = VIRTUAL_TOKEN.defaultAmount): Promise<ChoiceResult> => {
    if (revision.current < 0) return { ok: false, error: "Tunggu sampai saldo VIBE selesai dimuat." };
    if (selecting.current) return { ok: false, error: "Pilihan sedang dikonfirmasi." };
    selecting.current = true;
    try {
      const response = await fetch("/api/vibe", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ callId, choice, amount }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (result.account) publish(result.account);
      return response.ok && result.ok ? { ok: true } : { ok: false, error: result.error ?? "Pilihan belum berhasil dikonfirmasi." };
    } catch {
      return { ok: false, error: "Konfirmasi belum diterima. Periksa saldo dan riwayat sebelum mencoba lagi; server mencegah potongan ganda." };
    } finally { selecting.current = false; }
  }, [publish]);

  const wallet = snapshot?.wallet ?? empty;
  return { choices: wallet.choices, wallet, balance: virtualBalance(wallet), walletReady: Boolean(snapshot), walletError, selectChoice, calls: snapshot?.calls ?? [], contents: snapshot?.contents ?? [], calibrationStartedAt: snapshot?.calibrationStartedAt, lastCheckedAt: snapshot?.lastCheckedAt, serverNow: snapshot?.serverNow };
}
