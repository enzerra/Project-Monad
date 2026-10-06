import { NextResponse } from "next/server";
import { db, privyUser } from "@/lib/server/live";

export async function POST(request: Request) {
  try {
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json({ message: "Supabase not configured" }, { status: 200 });
    }

    console.log("[API /api/auth/sync] Request received");
    const userId = await privyUser(request);
    console.log("[API /api/auth/sync] Verified Privy user ID:", userId);
    const body = await request.json().catch(() => ({}));
    const { email, name, avatarUrl, walletAddress } = body;

    const userData = {
      privy_user_id: userId,
      email: email || null,
      name: name || null,
      avatar_url: avatarUrl || null,
      wallet_address: walletAddress ? walletAddress.toLowerCase() : null,
      last_login_at: new Date().toISOString(),
    };

    console.log("[API /api/auth/sync] Menyimpan ke tabel hive_users di Supabase:", userData);
    const result = await db<unknown[]>(
      "hive_users",
      "?on_conflict=privy_user_id",
      {
        method: "POST",
        headers: {
          prefer: "resolution=merge-duplicates,return=representation",
        },
        body: JSON.stringify(userData),
      }
    );
    console.log("[API /api/auth/sync] Berhasil disimpan di Supabase:", result);

    return NextResponse.json({ success: true, user: result[0] ?? userData });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[API /api/auth/sync] Error:", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
