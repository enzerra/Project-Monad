import { deploymentErrors } from "./deployment-config.mjs";

const errors = deploymentErrors(process.env, { local: process.argv.includes("--local") });
for (const error of errors) console.error(`FAIL: ${error}`);
if (errors.length) process.exit(1);
console.log("PASS: required configuration and verification key");

let failed = false;
async function check(label, run) {
  try { const result = await run(); console.log(`PASS: ${label}${result ? ` (${result})` : ""}`); }
  catch (error) { failed = true; console.error(`FAIL: ${label} (${error instanceof Error ? error.message : "unavailable"})`); }
}
const base = process.env.SUPABASE_URL.replace(/\/$/, "");
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
const dbHeaders = { apikey: key, Authorization: `Bearer ${key}` };
async function read(path) {
  const response = await fetch(`${base}${path}`, { headers: dbHeaders, signal: AbortSignal.timeout(12_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}; check configuration and migrations`);
  return response.json();
}
await check("Supabase profile schema", () => read("/rest/v1/hive_users?select=id&limit=0").then(() => "reachable"));
await check("Supabase Call/intent schema", async () => {
  await read("/rest/v1/hive_calls?select=id&limit=0");
  await read("/rest/v1/hive_choice_intents?select=id&limit=0");
  return "reachable";
});
await check("Supabase VIBE state", async () => {
  const rows = await read("/rest/v1/hive_vibe_state?id=eq.1&select=revision,payload");
  if (!rows.length || rows[0].payload?.version !== 1 || rows[0].revision !== rows[0].payload.revision) throw new Error("state is missing or invalid");
  return "valid revision";
});
await check("Supabase upload bucket", async () => {
  const bucket = await read("/storage/v1/bucket/vibe-uploads");
  if (bucket.public !== true || !bucket.allowed_mime_types?.includes("video/mp4") || !bucket.allowed_mime_types?.includes("video/webm") || bucket.file_size_limit !== 40 * 1024 * 1024) throw new Error("bucket must be public, limited to MP4/WebM and 40 MB");
  return "configured";
});
await check("YouTube Data API", async () => {
  const url = new URL("https://www.googleapis.com/youtube/v3/videos");
  url.searchParams.set("part", "status,statistics"); url.searchParams.set("id", "lQ2Q92QOK28");
  const response = await fetch(url, { headers: { "x-goog-api-key": process.env.YOUTUBE_API_KEY }, signal: AbortSignal.timeout(12_000) });
  const data = await response.json();
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${data.error?.errors?.[0]?.reason ?? "API unavailable"}`);
  if (data.items?.[0]?.status?.embeddable !== true || data.items[0].status.privacyStatus !== "public" || !data.items[0].statistics?.viewCount) throw new Error("sample Short or its metrics are unavailable");
  return "real views available";
});
console.log(process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS ? "CHECK: verify the Monad deployment and real transactions before submission" : "PENDING: Monad contract deployment and operator credentials; website deployment alone does not satisfy the hackathon requirements");
process.exitCode = failed ? 1 : 0;
