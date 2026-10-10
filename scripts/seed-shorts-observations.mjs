// One-time, revision-safe import of the actual first observations from this refresh.
// Does not create Calls, change existing calibration, or modify any wallet.
import { readFile } from "node:fs/promises";
const observations = JSON.parse(await readFile(new URL("../docs/shorts-observations-2026-10-10.json", import.meta.url), "utf8"));
const dbUrl = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!dbUrl || !key || !process.env.YOUTUBE_API_KEY) throw new Error("Server environment is required");
const headers = { apikey:key, authorization:`Bearer ${key}`, "content-type":"application/json" };
const url = new URL("https://www.googleapis.com/youtube/v3/videos");
url.searchParams.set("part","statistics,status");url.searchParams.set("id",observations.map(item=>item.videoId).join(","));
const response = await fetch(url,{headers:{"x-goog-api-key":process.env.YOUTUBE_API_KEY}});
if (!response.ok) throw new Error(`YouTube verification failed (${response.status})`);
const latest = new Map((await response.json()).items.map(item=>[item.id,item]));
for (const item of observations) {
  const current=latest.get(item.videoId);
  if (!/^[\w-]{11}$/.test(item.videoId) || !Number.isSafeInteger(item.views) || item.views<0 || !Number.isFinite(Date.parse(item.observedAt)) || Date.parse(item.observedAt)>Date.now() || Date.now()-Date.parse(item.observedAt)>2*3600000 || Number(current?.statistics?.viewCount)<item.views || !current?.status?.embeddable || current.status.privacyStatus!=="public") throw new Error("First observation could not be verified");
}
for (let attempt=0;attempt<8;attempt++) {
  const read=await fetch(`${dbUrl}/rest/v1/hive_vibe_state?id=eq.1&select=revision,payload`,{headers});
  if(!read.ok)throw new Error(`State read failed (${read.status})`);
  const [row]=await read.json();if(!row||row.payload.revision!==row.revision)throw new Error("Invalid state revision");
  let added=0;
  for (const item of observations) if (!row.payload.calibration[item.videoId]) {row.payload.calibration[item.videoId]={first:item,last:item};added++;}
  if(!added){console.log("Observations already present; no changes.");break;}
  row.payload.revision++;
  const result=await fetch(`${dbUrl}/rest/v1/rpc/hive_commit_vibe_state`,{method:"POST",headers,body:JSON.stringify({p_expected_revision:row.revision,p_payload:row.payload})});
  if(!result.ok)throw new Error(`Commit failed (${result.status})`);
  if(await result.json()===true){console.log(`Imported ${added} verified first observations; wallets unchanged.`);break;}
  if(attempt===7)throw new Error("State busy; retry later");
}
