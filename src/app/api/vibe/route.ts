import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sourceAccount, placeSourceChoice } from "@/lib/source-calls";
import { refreshSourceCalls, sessionId } from "@/lib/server/vibe";
import { vibeStore } from "@/lib/server/vibe-store";

export const runtime = "nodejs";
const cookieName = "vibe-session";
const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie" };

function identity(request: NextRequest) {
  const previous = request.cookies.get(cookieName)?.value;
  const token = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  return { token, id: sessionId(token), fresh: token !== previous };
}
function response(data: unknown, session: ReturnType<typeof identity>, status = 200) {
  const result = NextResponse.json(data, { status, headers: privateHeaders });
  if (session.fresh) result.cookies.set(cookieName, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 24 * 60 * 60 });
  return result;
}

export async function GET(request: NextRequest) {
  const session = identity(request);
  try {
    await refreshSourceCalls();
    const account = vibeStore().transaction((state) => sourceAccount(state, session.id, Date.now()));
    return response(account, session);
  } catch {
    return NextResponse.json({ error: "Saldo server belum bisa dimuat. Data sebelumnya tetap tersimpan." }, { status: 503, headers: privateHeaders });
  }
}

const choiceBody = z.object({ callId: z.string().min(1).max(100), choice: z.enum(["yes", "no"]), amount: z.number().int().min(10).max(500) }).strict();
export async function POST(request: NextRequest) {
  if (request.headers.get("origin") !== new URL(request.url).origin) return NextResponse.json({ error: "Origin tidak valid." }, { status: 403, headers: privateHeaders });
  // POST cannot mint a session; initialize the account through GET first.
  const session = identity(request);
  if (session.fresh) return NextResponse.json({ error: "Muat saldo sebelum memilih." }, { status: 401, headers: privateHeaders });
  try {
    const raw = await request.text();
    if (raw.length > 1024) return response({ ok: false, error: "Permintaan tidak valid." }, session, 400);
    const parsed = choiceBody.safeParse(JSON.parse(raw));
    if (!parsed.success) return response({ ok: false, error: "Gunakan nominal bulat 10–500 VIBE." }, session, 400);
    await refreshSourceCalls();
    const result = vibeStore().transaction((state) => {
      if (!state.wallets[session.id]) return { ok: false as const, error: "Sesi saldo tidak ditemukan. Muat ulang halaman." };
      const { callId, choice, amount } = parsed.data;
      const placed = placeSourceChoice(state, session.id, callId, choice, amount, Date.now());
      return { ...placed, account: sourceAccount(state, session.id, Date.now()) };
    });
    return response(result, session, result.ok ? 200 : 409);
  } catch (error) {
    return response({ ok: false, error: error instanceof SyntaxError ? "Permintaan tidak valid." : "Pilihan belum berhasil dikonfirmasi. Periksa saldo dan riwayat sebelum mencoba lagi." }, session, error instanceof SyntaxError ? 400 : 503);
  }
}
