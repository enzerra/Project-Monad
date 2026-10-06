"use client";

import { useAccountAuth } from "@/components/auth-provider";

export function AuthControl() {
  const auth = useAccountAuth();
  if (!auth.configured) return null;
  if (!auth.ready) return <span className="auth-control" aria-live="polite">Memuat akun…</span>;
  if (!auth.authenticated) return <button type="button" className="auth-control" onClick={(event) => { event.currentTarget.closest("dialog")?.close(); auth.login(); }}>Masuk Google</button>;
  return <button type="button" className="auth-control" onClick={() => void auth.logout()} title="Keluar dari VIBE">{auth.name === "Akun VIBE" && auth.walletAddress ? `${auth.walletAddress.slice(0, 6)}…${auth.walletAddress.slice(-4)}` : auth.name.split(" ")[0]}</button>;
}
