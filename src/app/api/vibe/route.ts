import { randomBytes } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sourceAccount, placeSourceChoice } from "@/lib/source-calls";
import { placeFootballChoice } from "@/lib/football-calls";
import { refreshSourceCalls, sessionId } from "@/lib/server/vibe";
import { vibeStore } from "@/lib/server/vibe-store";
import { AuthError, privyUser } from "@/lib/server/auth";
import type { SourceState } from "@/lib/source-calls";
import { trustedOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
const cookieName = "vibe-session";
const privateHeaders = { "Cache-Control": "private, no-store", Vary: "Cookie, Authorization" };
const usesAccounts = () => Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY);
type Session = { token?: string; id: string | null; fresh: boolean };

async function identity(request: NextRequest): Promise<Session> {
  if (usesAccounts()) {
    if (!request.headers.has("authorization")) return { id: null, fresh: false };
    return { id: await privyUser(request), fresh: false };
  }
  const previous = request.cookies.get(cookieName)?.value;
  const token = previous && /^[a-f0-9]{64}$/.test(previous) ? previous : randomBytes(32).toString("hex");
  return { token, id: sessionId(token), fresh: token !== previous };
}
function response(data: unknown, session: Session, status = 200) {
  const result = NextResponse.json(data, { status, headers: privateHeaders });
  if (session.fresh && session.token) result.cookies.set(cookieName, session.token, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 24 * 60 * 60 });
  return result;
}

function accountSnapshot(state: SourceState, session: Session, now: number) {
  if (session.id) return { ...sourceAccount(state, session.id, now), accountId: session.id };
  // Anyone can browse Calls; only a verified account gets an initial balance.
  return { revision: state.revision, accountId: null, wallet: { version: 1, choices: [], entries: [] }, calls: state.calls, footballCalls: state.footballCalls ?? [], contents: state.contents, calibrationStartedAt: Object.values(state.calibration).map((item) => item.first.observedAt).sort()[0], lastCheckedAt: state.lastCheckedAt, serverNow: new Date(now).toISOString() };
}

export async function GET(request: NextRequest) {
  try {
    const session = await identity(request);
    await refreshSourceCalls();
    const account = session.id ? await vibeStore().transaction((state) => accountSnapshot(state, session, Date.now())) : accountSnapshot(await vibeStore().read(), session, Date.now());
    return response(account, session);
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status, headers: privateHeaders });
    return NextResponse.json({ error: "Could not refresh your balance. Your saved data is safe." }, { status: 503, headers: privateHeaders });
  }
}

const choiceBody = z.object({ callId: z.string().min(1).max(100), choice: z.enum(["yes", "no"]), amount: z.number().int().min(10).max(500) }).strict();
export async function POST(request: NextRequest) {
  if (!trustedOrigin(request)) return NextResponse.json({ error: "Invalid request origin." }, { status: 403, headers: privateHeaders });
  // POST cannot mint a session; initialize the account through GET first.
  let session: Session;
  try { session = await identity(request); }
  catch (error) { return NextResponse.json({ error: error instanceof AuthError ? error.message : "Account verification failed." }, { status: error instanceof AuthError ? error.status : 503, headers: privateHeaders }); }
  if (!session.id || session.fresh) return NextResponse.json({ error: usesAccounts() ? "Sign in with Google to make your Call." : "Load your balance before entering a Call." }, { status: 401, headers: privateHeaders });
  const accountId = session.id;
  try {
    const raw = await request.text();
    if (raw.length > 1024) return response({ ok: false, error: "Invalid request." }, session, 400);
    const parsed = choiceBody.safeParse(JSON.parse(raw));
    if (!parsed.success) return response({ ok: false, error: "Choose a whole amount between 10 and 500 VIBE." }, session, 400);
    await refreshSourceCalls();
    const result = await vibeStore().transaction((state) => {
      if (!state.wallets[accountId]) return { ok: false as const, error: "Balance not loaded. Refresh the page." };
      const { callId, choice, amount } = parsed.data;
      const placed = callId.startsWith("football-") ? placeFootballChoice(state, accountId, callId, choice, amount, Date.now()) : placeSourceChoice(state, accountId, callId, choice, amount, Date.now());
      return { ...placed, account: accountSnapshot(state, session, Date.now()) };
    });
    return response(result, session, result.ok ? 200 : 409);
  } catch (error) {
    return response({ ok: false, error: error instanceof SyntaxError ? "Invalid request." : "Confirmation pending. Check your balance and history before retrying." }, session, error instanceof SyntaxError ? 400 : 503);
  }
}
