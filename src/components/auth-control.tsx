"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";

export function AuthControl() {
  const { ready, authenticated, login, logout } = usePrivy();
  const { wallets } = useWallets();
  if (!ready) return <span className="auth-control" aria-live="polite">Memuat akun…</span>;
  if (!authenticated) return <button type="button" className="auth-control" onClick={() => login()}>Masuk Google</button>;
  const wallet = wallets.find((item) => item.walletClientType === "privy") ?? wallets[0];
  return <button type="button" className="auth-control" onClick={() => logout()} title="Keluar dari VIBE">{wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "Akun aktif"}</button>;
}
