import "server-only";
import { importSPKI, jwtVerify } from "jose";

export class AuthError extends Error {
  constructor(message: string, public status: 401 | 503 = 401) { super(message); }
}

export function privyConfigured() { return Boolean(process.env.NEXT_PUBLIC_PRIVY_APP_ID); }
export async function privyUser(request: Request): Promise<string> {
  const appId = process.env.NEXT_PUBLIC_PRIVY_APP_ID;
  const pem = process.env.PRIVY_VERIFICATION_KEY;
  if (!appId || !pem) throw new AuthError("Konfigurasi verifikasi akun belum lengkap.", 503);
  const bearer = request.headers.get("authorization");
  if (!bearer?.startsWith("Bearer ") || bearer.length > 16384) throw new AuthError("Masuk Google untuk melanjutkan.");
  let key;
  try { key = await importSPKI(pem.replaceAll("\\n", "\n"), "ES256"); }
  catch { throw new AuthError("Konfigurasi verifikasi akun belum valid.", 503); }
  try {
    const { payload } = await jwtVerify(bearer.slice(7), key, { issuer: "privy.io", audience: appId, algorithms: ["ES256"], requiredClaims: ["sub", "exp", "iat"] });
    if (!payload.sub?.startsWith("did:privy:") || payload.sub.length > 200) throw new Error("Invalid subject");
    return payload.sub;
  } catch { throw new AuthError("Sesi login berakhir atau tidak valid. Masuk lagi."); }
}
