import { createHash } from "node:crypto";
import { createPublicClient, createWalletClient, http, keccak256, toHex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { compileHiveCall } from "./contract-compiler.mjs";

const [videoId, targetText, horizonText, title = "Gaming Short", creator = "Creator"] = process.argv.slice(2);
const target = Number(targetText);
const horizon = Number(horizonText);
if (!/^[A-Za-z0-9_-]{11}$/.test(videoId ?? "") || !Number.isSafeInteger(target) || ![6, 24].includes(horizon)) throw new Error("Usage: npm run create:call -- VIDEO_ID TARGET_VIEWS 6|24 TITLE CREATOR");
for (const name of ["YOUTUBE_API_KEY", "RELAYER_PRIVATE_KEY", "NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS", "SUPABASE_URL", "SUPABASE_SERVICE_ROLE_KEY"]) if (!process.env[name]) throw new Error(`${name} is required`);

const api = new URL("https://www.googleapis.com/youtube/v3/videos");
api.searchParams.set("part", "statistics,status,snippet,contentDetails");
api.searchParams.set("id", videoId);
api.searchParams.set("key", process.env.YOUTUBE_API_KEY);
const response = await fetch(api);
if (!response.ok) throw new Error(`YouTube API ${response.status}`);
const video = (await response.json()).items?.[0];
if (!video || video.status?.privacyStatus !== "public") throw new Error("Video unavailable or private");
const baseline = Number(video.statistics?.viewCount);
if (!Number.isSafeInteger(baseline) || target <= baseline) throw new Error("Target must exceed current views");
const duration = video.contentDetails?.duration ?? "";
const durationMatch = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/.exec(duration);
const seconds = durationMatch ? Number(durationMatch[1] ?? 0) * 3600 + Number(durationMatch[2] ?? 0) * 60 + Number(durationMatch[3] ?? 0) : Infinity;
if (seconds > 180) throw new Error(`Duration ${duration} exceeds 3 minutes; curate a Short manually`);

const account = privateKeyToAccount(process.env.RELAYER_PRIVATE_KEY);
const chain = { id: 10143, name: "Monad Testnet", nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 }, rpcUrls: { default: { http: ["https://testnet-rpc.monad.xyz"] } }, blockExplorers: { default: { name: "Monadscan", url: "https://testnet.monadscan.com" } }, testnet: true };
const wallet = createWalletClient({ account, chain, transport: http() });
const client = createPublicClient({ chain, transport: http() });
const address = process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS;
const abi = compileHiveCall().abi;
const now = Number((await client.getBlock()).timestamp);
const closesAt = now + Math.floor(horizon * 3600 / 4);
const evaluationAt = now + horizon * 3600;
const revealDeadline = closesAt + 60 * 60;
const callId = keccak256(toHex(`${videoId}:${now}:${target}`));
const sourceUrl = `https://www.youtube.com/shorts/${videoId}`;
const sourceHash = `0x${createHash("sha256").update(JSON.stringify({ videoId, sourceUrl, api: "YouTube Data API v3" })).digest("hex")}`;
const rulesHash = `0x${createHash("sha256").update(JSON.stringify({ baseline, target, horizon, closesAt, evaluationAt, revealDeadline, earlyClose: "halfway from baseline to target", evaluationWindowMinutes: 30 })).digest("hex")}`;
const hash = await wallet.writeContract({ address, abi, functionName: "createCall", args: [callId, sourceHash, rulesHash, BigInt(now), BigInt(closesAt), BigInt(evaluationAt), BigInt(revealDeadline), BigInt(baseline), BigInt(target)] });
const receipt = await client.waitForTransactionReceipt({ hash });
if (receipt.status !== "success") throw new Error(`CreateCall failed ${hash}`);

async function db(table, body) {
  const result = await fetch(`${process.env.SUPABASE_URL}/rest/v1/${table}`, { method: "POST", headers: { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "content-type": "application/json", prefer: "return=representation" }, body: JSON.stringify(body) });
  if (!result.ok) throw new Error(`Database ${table}: ${await result.text()}`);
  return (await result.json())[0];
}
const content = await db("hive_contents", { video_id: videoId, title, creator, source_url: sourceUrl, summary: "Gaming Short terkurasi", kind: "predictable" });
const call = await db("hive_calls", { content_id: content.id, chain_call_id: callId, baseline_views: baseline, target_views: target, horizon_hours: horizon, opened_at: new Date(now * 1000).toISOString(), scheduled_closes_at: new Date(closesAt * 1000).toISOString(), evaluation_at: new Date(evaluationAt * 1000).toISOString(), reveal_deadline: new Date(revealDeadline * 1000).toISOString(), rules_hash: rulesHash, source_hash: sourceHash, status: "open", create_tx_hash: hash });
await db("hive_snapshots", { call_id: call.id, views: baseline, snapshot_hash: `0x${createHash("sha256").update(JSON.stringify({ videoId, views: baseline, observedAt: new Date(now * 1000).toISOString(), source: "YouTube Data API" })).digest("hex")}`, purpose: "baseline" });
process.stdout.write(`Call: ${call.id}\nChain ID: ${callId}\nCreate tx: https://testnet.monadscan.com/tx/${hash}\n`);
