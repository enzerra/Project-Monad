"use client";

import { useAccountAuth } from "@/components/auth-provider";

export function AuthControl() {
  const auth = useAccountAuth();
  if (!auth.configured) return null;
  if (!auth.ready) return <span className="auth-control" aria-live="polite">Loading account…</span>;
  if (!auth.authenticated) return <button type="button" className="auth-control" onClick={(event) => { event.currentTarget.closest("dialog")?.close(); auth.login(); }}>Sign in with Google</button>;
  return <button type="button" className="auth-control" onClick={() => void auth.logout()} title="Sign out of VIBE">{auth.name === "VIBE account" && auth.walletAddress ? `${auth.walletAddress.slice(0, 6)}…${auth.walletAddress.slice(-4)}` : auth.name.split(" ")[0]}</button>;
}
