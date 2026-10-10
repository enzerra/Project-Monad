import { NextResponse } from "next/server";
import { z } from "zod";
import { AuthError, privyUser } from "@/lib/server/auth";
import { db, supabaseConfigured } from "@/lib/server/database";
import { trustedOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
const headers = { "Cache-Control": "private, no-store", Vary: "Authorization" };
// These self-reported fields are display metadata, never authorization inputs.
const profileBody = z.object({
  email: z.string().email().max(320).nullable().optional(),
  name: z.string().trim().min(1).max(120).nullable().optional(),
  avatarUrl: z.string().url().max(2048).refine((value) => value.startsWith("https://")).nullable().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/).nullable().optional(),
}).strict();

export async function POST(request: Request) {
  if (!trustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers });
  try {
    const userId = await privyUser(request);
    if (!supabaseConfigured()) return NextResponse.json({ error: "Account service is unavailable." }, { status: 503, headers });
    const raw = await request.text();
    if (raw.length > 4096) return NextResponse.json({ error: "Invalid profile." }, { status: 400, headers });
    const parsed = profileBody.safeParse(JSON.parse(raw));
    if (!parsed.success) return NextResponse.json({ error: "Invalid profile." }, { status: 400, headers });
    const body = parsed.data;
    await db("hive_users", "?on_conflict=privy_user_id", {
      method: "POST", headers: { prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify({ privy_user_id: userId, email: body.email ?? null, name: body.name ?? null, avatar_url: body.avatarUrl ?? null, wallet_address: body.walletAddress?.toLowerCase() ?? null, last_login_at: new Date().toISOString() }),
    });
    return NextResponse.json({ success: true, userId }, { headers });
  } catch (error) {
    const status = error instanceof AuthError ? error.status : error instanceof SyntaxError ? 400 : 503;
    return NextResponse.json({ error: error instanceof AuthError ? error.message : status === 400 ? "Invalid profile." : "Could not sync your account. Try again." }, { status, headers });
  }
}
