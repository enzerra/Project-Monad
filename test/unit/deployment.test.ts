import { afterEach, describe, expect, it, vi } from "vitest";
import { generateKeyPairSync } from "node:crypto";
import { deploymentErrors } from "../../scripts/deployment-config.mjs";

vi.mock("server-only", () => ({}));
afterEach(() => vi.unstubAllEnvs());

describe("deployment configuration", () => {
  const key = generateKeyPairSync("ec", { namedCurve: "prime256v1" }).publicKey.export({ format: "pem", type: "spki" }).toString();
  const env = { NEXT_PUBLIC_PRIVY_APP_ID: "app", PRIVY_VERIFICATION_KEY: key, YOUTUBE_API_KEY: "youtube", SUPABASE_URL: "https://test.supabase.co", SUPABASE_SERVICE_ROLE_KEY: "private-key", NEXT_PUBLIC_APP_ORIGIN: "https://vibe.up.railway.app" };
  it("accepts complete website configuration and rejects localhost in production", () => {
    expect(deploymentErrors(env)).toEqual([]);
    expect(deploymentErrors({ ...env, NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000" })).not.toEqual([]);
    expect(deploymentErrors({ ...env, NEXT_PUBLIC_APP_ORIGIN: "http://localhost:3000" }, { local: true })).toEqual([]);
    expect(deploymentErrors({ ...env, PRIVY_VERIFICATION_KEY: "not-a-key" })).not.toEqual([]);
  });
  it("rejects partially enabled onchain mode", () => {
    expect(deploymentErrors({ ...env, NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS: "0x" + "a".repeat(40) })).toEqual(expect.arrayContaining([expect.stringContaining("RELAYER_PRIVATE_KEY"), expect.stringContaining("CHOICE_ENCRYPTION_KEY")]));
  });
});

describe("reverse proxy origin and upload limits", () => {
  it("accepts the configured public origin behind a proxy and rejects a spoofed origin", async () => {
    vi.stubEnv("NODE_ENV", "production"); vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "https://vibe.up.railway.app");
    const { trustedOrigin } = await import("../../src/lib/server/request");
    const internal = "http://0.0.0.0:8080/api/vibe";
    expect(trustedOrigin(new Request(internal, { headers: { origin: "https://vibe.up.railway.app" } }))).toBe(true);
    expect(trustedOrigin(new Request(internal, { headers: { origin: "https://attacker.test", "x-forwarded-host": "vibe.up.railway.app" } }))).toBe(false);
    expect(trustedOrigin(new Request(internal))).toBe(false);
    vi.stubEnv("NEXT_PUBLIC_APP_ORIGIN", "");
    expect(trustedOrigin(new Request(internal, { headers: { origin: "http://0.0.0.0:8080" } }))).toBe(false);
  });
  it("limits actual bytes of a body that omits Content-Length", async () => {
    const { limitedFormData, BodyLimitError } = await import("../../src/lib/server/request");
    const request = new Request("http://localhost/upload", { method: "POST", body: new Uint8Array(33), headers: { "content-type": "multipart/form-data; boundary=test" } });
    expect(request.headers.has("content-length")).toBe(false);
    await expect(limitedFormData(request, 32)).rejects.toBeInstanceOf(BodyLimitError);
  });
});
