"use client";

import { PrivyProvider, usePrivy, useWallets } from "@privy-io/react-auth";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

type AccountAuth = {
  configured: boolean; ready: boolean; authenticated: boolean; accountId: string | null;
  name: string; walletAddress?: string; syncError: string;
  login: () => void; logout: () => Promise<void>; requestHeaders: () => Promise<Record<string, string>>;
};
const localAuth: AccountAuth = { configured: false, ready: true, authenticated: false, accountId: null, name: "VIBE explorer", syncError: "", login: () => {}, logout: async () => {}, requestHeaders: async () => ({}) };
const AccountContext = createContext<AccountAuth>(localAuth);
export const useAccountAuth = () => useContext(AccountContext);

function AccountBridge({ children }: { children: React.ReactNode }) {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const walletAddress = (wallets.find((item) => item.walletClientType === "privy") ?? wallets[0])?.address ?? user?.wallet?.address;
  const accountId = authenticated ? user?.id ?? null : null;
  const name = user?.google?.name ?? "VIBE account";
  const email = user?.google?.email ?? user?.email?.address ?? null;
  const [sync, setSync] = useState({ id: "", error: "" });

  const requestHeaders = useCallback(async (): Promise<Record<string, string>> => {
    if (!authenticated || !accountId) return {};
    const token = await getAccessToken();
    if (!token) throw new Error("Your session expired. Sign in again.");
    return { Authorization: `Bearer ${token}` };
  }, [authenticated, accountId, getAccessToken]);

  // Sync once per identity/profile change from the root provider, on every page.
  // Failed writes retry; a later embedded-wallet creation also updates the row.
  useEffect(() => {
    if (!ready || !accountId) return;
    let disposed = false;
    let retry: ReturnType<typeof setTimeout>;
    const controller = new AbortController();
    async function syncProfile() {
      try {
        const response = await fetch("/api/auth/sync", { method: "POST", headers: { "Content-Type": "application/json", ...await requestHeaders() }, body: JSON.stringify({ email, name, walletAddress: walletAddress ?? null }), signal: AbortSignal.any([controller.signal, AbortSignal.timeout(12_000)]) });
        if (!response.ok) throw new Error("Account sync delayed. Retrying shortly.");
        const result = await response.json();
        if (!result.success || result.userId !== accountId) throw new Error("Account sync pending.");
        if (!disposed) setSync({ id: accountId!, error: "" });
      } catch {
        if (!disposed) {
          setSync({ id: accountId!, error: "Account sync delayed. Retrying shortly." });
          retry = setTimeout(() => void syncProfile(), 30_000);
        }
      }
    }
    void syncProfile();
    return () => { disposed = true; controller.abort(); clearTimeout(retry); };
  }, [ready, accountId, email, name, walletAddress, requestHeaders]);

  const value = useMemo<AccountAuth>(() => ({ configured: true, ready, authenticated, accountId, name, walletAddress, syncError: sync.id === accountId ? sync.error : "", login, logout, requestHeaders }), [ready, authenticated, accountId, name, walletAddress, sync, login, logout, requestHeaders]);
  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  if (!appId) return <>{children}</>;
  return (
    <PrivyProvider appId={appId} config={{ appearance: { theme: "light", accentColor: "#267d76" }, loginMethods: ["google"], embeddedWallets: { ethereum: { createOnLogin: "users-without-wallets" } } }}>
      <AccountBridge>{children}</AccountBridge>
    </PrivyProvider>
  );
}
