import { createPublicKey } from "node:crypto";

/** Return configuration errors without exposing credential values. */
export function deploymentErrors(env = process.env, { local = false } = {}) {
  const errors = [];
  const required = ["NEXT_PUBLIC_PRIVY_APP_ID", "PRIVY_VERIFICATION_KEY", "YOUTUBE_API_KEY", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_APP_ORIGIN"];
  for (const name of required) if (!env[name]?.trim()) errors.push(`${name} is required`);
  if (env.NEXT_PUBLIC_APP_ORIGIN) {
    try {
      const url = new URL(env.NEXT_PUBLIC_APP_ORIGIN);
      if ((!local && url.protocol !== "https:") || url.username || url.password || url.search || url.hash || url.pathname !== "/") errors.push("NEXT_PUBLIC_APP_ORIGIN must be a public HTTPS origin without a path");
      if (!local && ["localhost", "127.0.0.1", "0.0.0.0"].includes(url.hostname)) errors.push("NEXT_PUBLIC_APP_ORIGIN must use the deployed hostname");
    } catch { errors.push("NEXT_PUBLIC_APP_ORIGIN is invalid"); }
  }
  if (env.SUPABASE_URL) {
    try { const url = new URL(env.SUPABASE_URL); if (url.protocol !== "https:" || url.username || url.password) errors.push("SUPABASE_URL must use HTTPS"); }
    catch { errors.push("SUPABASE_URL is invalid"); }
  }
  if (env.PRIVY_VERIFICATION_KEY) {
    try { const key = createPublicKey(env.PRIVY_VERIFICATION_KEY.replaceAll("\\n", "\n")); if (key.asymmetricKeyType !== "ec" || key.asymmetricKeyDetails?.namedCurve !== "prime256v1") errors.push("PRIVY_VERIFICATION_KEY must be the Privy ES256 public key"); }
    catch { errors.push("PRIVY_VERIFICATION_KEY is not a valid public key"); }
  }
  if (env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS) {
    if (!/^0x[a-fA-F0-9]{40}$/.test(env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS)) errors.push("NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS is invalid");
    if (!/^0x[a-fA-F0-9]{64}$/.test(env.RELAYER_PRIVATE_KEY ?? "")) errors.push("A configured Monad contract requires RELAYER_PRIVATE_KEY");
    if (Buffer.from(env.CHOICE_ENCRYPTION_KEY ?? "", "base64").length !== 32) errors.push("A configured Monad contract requires a 32-byte CHOICE_ENCRYPTION_KEY");
    if ((env.OPERATOR_API_KEY?.length ?? 0) < 32) errors.push("A configured Monad contract requires OPERATOR_API_KEY of at least 32 characters");
  }
  return errors;
}
