"use client";

import { useEffect, useRef } from "react";
import { usePrivy, useWallets } from "@privy-io/react-auth";

export function AuthControl() {
  const { ready, authenticated, user, login, logout, getAccessToken } = usePrivy();
  const { wallets } = useWallets();
  const syncedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!authenticated || !user) return;
    const currentUser = user;
    if (syncedRef.current === currentUser.id) return;

    async function syncUser() {
      try {
        console.log("[AuthControl] Mengambil token untuk sinkronisasi ke Supabase...", currentUser.id);
        const token = await getAccessToken();
        if (!token) {
          console.warn("[AuthControl] Token tidak ditemukan");
          return;
        }

        const wallet = wallets.find((item) => item.walletClientType === "privy") ?? wallets[0];
        const payload = {
          email: currentUser.google?.email || currentUser.email?.address || null,
          name: currentUser.google?.name || null,
          walletAddress: wallet?.address || currentUser.wallet?.address || null,
        };

        console.log("[AuthControl] Mengirim data ke /api/auth/sync:", payload);
        const res = await fetch("/api/auth/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        });

        const data = await res.json();
        console.log("[AuthControl] Respon dari /api/auth/sync:", data);
        if (res.ok) {
          syncedRef.current = currentUser.id;
        }
      } catch (err) {
        console.error("[AuthControl] Gagal sinkronisasi akun ke Supabase:", err);
      }
    }

    syncUser();
  }, [authenticated, user, wallets, getAccessToken]);

  if (!ready) return <span className="auth-control" aria-live="polite">Memuat akun…</span>;
  if (!authenticated) return <button type="button" className="auth-control" onClick={() => login()}>Masuk Google</button>;
  const wallet = wallets.find((item) => item.walletClientType === "privy") ?? wallets[0];
  return (
    <button type="button" className="auth-control" onClick={() => logout()} title="Keluar dari VIBE">
      {user?.google?.name ? user.google.name.split(" ")[0] : wallet ? `${wallet.address.slice(0, 6)}…${wallet.address.slice(-4)}` : "Akun aktif"}
    </button>
  );
}
