"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { callQuestion, type Choice } from "@/lib/demo-data";
import type { SourceAccountSnapshot } from "@/lib/source-calls";
import { virtualBalance, VIRTUAL_TOKEN, type ChoiceResult, type VirtualWallet } from "@/lib/virtual-token";
import { useAccountAuth } from "@/components/auth-provider";

const empty: VirtualWallet = { version: 1, choices: [], entries: [] };

export function useVirtualWallet() {
  const auth = useAccountAuth();
  const { ready: authReady, requestHeaders } = auth;
  const identity = auth.configured ? auth.accountId ?? "guest" : "local";
  const [saved, setSnapshot] = useState<{ identity: string; snapshot: SourceAccountSnapshot }>();
  const snapshot = saved?.identity === identity ? saved.snapshot : undefined;
  const [failure, setFailure] = useState({ identity, message: "" });
  const walletError = failure.identity === identity ? failure.message : "";
  const activeIdentity = useRef(identity);
  useLayoutEffect(() => { activeIdentity.current = identity; }, [identity]);
  const revision = useRef({ identity, value: -1 });
  const selecting = useRef(false);

  const publish = useCallback((next: SourceAccountSnapshot) => {
    if (activeIdentity.current !== identity) return;
    if (!next.wallet || !Array.isArray(next.calls) || !Array.isArray(next.contents) || !Number.isSafeInteger(next.revision)) throw new Error("Invalid account response");
    if (auth.configured && next.accountId !== auth.accountId) throw new Error("Account identity mismatch");
    if (revision.current.identity !== identity || next.revision >= revision.current.value) {
      revision.current = { identity, value: next.revision };
      setSnapshot({ identity, snapshot: { ...next, calls: next.calls.map(call => ({ ...call, question: callQuestion(call) })) } });
      setFailure({ identity, message: "" });
    }
  }, [identity, auth.configured, auth.accountId]);

  useEffect(() => {
    if (!authReady) return;
    let disposed = false;
    let controller: AbortController | undefined;
    const refresh = async () => {
      if (document.hidden || controller) return;
      controller = new AbortController();
      const timeout = window.setTimeout(() => controller?.abort(), 12_000);
      try {
        const response = await fetch("/api/vibe", { cache: "no-store", headers: await requestHeaders(), signal: controller.signal });
        if (!response.ok) throw new Error(response.status === 401 ? "Sign in with Google to load your balance." : "Balance update delayed. Showing your last saved state.");
        const next = await response.json();
        if (!disposed) publish(next);
      } catch (error) {
        if (!disposed) setFailure({ identity, message: error instanceof Error ? error.message : "Balance update delayed." });
      } finally { window.clearTimeout(timeout); controller = undefined; }
    };
    void refresh();
    const interval = window.setInterval(() => void refresh(), 15_000);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange", visible);
    window.addEventListener("focus", visible);
    return () => { disposed = true; controller?.abort(); window.clearInterval(interval); document.removeEventListener("visibilitychange", visible); window.removeEventListener("focus", visible); };
  }, [publish, authReady, requestHeaders, identity]);

  const selectChoice = useCallback(async (callId: string, choice: Choice, amount: number = VIRTUAL_TOKEN.defaultAmount): Promise<ChoiceResult> => {
    if (auth.configured && !auth.authenticated) { auth.login(); return { ok: false, error: "Sign in with Google to make your Call." }; }
    if (!snapshot) return { ok: false, error: "Wait for your balance to load." };
    if (selecting.current) return { ok: false, error: "Confirming your Call." };
    selecting.current = true;
    try {
      const response = await fetch("/api/vibe", { method: "POST", headers: { "Content-Type": "application/json", ...await auth.requestHeaders() }, body: JSON.stringify({ callId, choice, amount }), signal: AbortSignal.timeout(15_000) });
      const result = await response.json();
      if (result.account) publish(result.account);
      return response.ok && result.ok ? { ok: true } : { ok: false, error: result.error ?? "Your Call could not be confirmed." };
    } catch {
      return { ok: false, error: "Confirmation pending. Check your balance and history before retrying." };
    } finally { selecting.current = false; }
  }, [publish, snapshot, auth]);

  const wallet = snapshot?.wallet ?? empty;
  const loginRequired = auth.configured && !auth.authenticated;
  return { choices: wallet.choices, wallet, balance: virtualBalance(wallet), walletReady: Boolean(snapshot) && !loginRequired, feedReady: Boolean(snapshot), loginRequired, walletError: loginRequired ? "Sign in with Google to get VIBE and make Calls." : walletError, selectChoice, calls: snapshot?.calls ?? [], contents: snapshot?.contents ?? [], calibrationStartedAt: snapshot?.calibrationStartedAt, lastCheckedAt: snapshot?.lastCheckedAt, serverNow: snapshot?.serverNow };
}
