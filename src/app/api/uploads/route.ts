import { privyUser, AuthError } from "@/lib/server/auth";
import { required, supabaseConfigured } from "@/lib/server/database";
import { vibeStore } from "@/lib/server/vibe-store";
import type { UploadedContent } from "@/lib/source-calls";
import { BodyLimitError, limitedFormData, trustedOrigin } from "@/lib/server/request";

export const runtime = "nodejs";
const bucket = "vibe-uploads";
const maxBytes = 40 * 1024 * 1024;
const types: Record<string, string> = { "video/mp4": "mp4", "video/webm": "webm" };

function storageBase() { return `${required("SUPABASE_URL").replace(/\/$/, "")}/storage/v1`; }
function storageHeaders() { const key = required("SUPABASE_SERVICE_ROLE_KEY"); return { apikey: key, Authorization: `Bearer ${key}` }; }
function reply(error: string, status: number) { return Response.json({ error }, { status }); }

async function ensureBucket() {
  const base = storageBase();
  const lookup = await fetch(`${base}/bucket/${bucket}`, { headers: storageHeaders(), cache: "no-store" });
  if (lookup.ok) return;
  const error = await lookup.json().catch(() => ({})) as { message?: string; error?: string };
  if (lookup.status !== 404 && !((lookup.status === 400) && /bucket not found/i.test(error.message ?? error.error ?? ""))) throw new Error(`Storage bucket check failed (${lookup.status})`);
  const created = await fetch(`${base}/bucket`, {
    method: "POST", headers: { ...storageHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, allowed_mime_types: Object.keys(types), file_size_limit: maxBytes }),
  });
  if (!created.ok && created.status !== 409) throw new Error(`Storage bucket creation failed (${created.status})`);
}

export async function GET() {
  try {
    const state = await vibeStore().read();
    return Response.json({ uploads: [...(state.uploads ?? [])].reverse().slice(0, 100) }, { headers: { "Cache-Control": "no-store" } });
  } catch { return reply("Could not load content. Try again.", 503); }
}

export async function POST(request: Request) {
  if (!trustedOrigin(request)) return reply("Invalid request origin.", 403);
  let objectPath = "";
  try {
    if (!supabaseConfigured()) return reply("Video uploads are temporarily unavailable.", 503);
    const ownerId = await privyUser(request);
    const size = Number(request.headers.get("content-length") ?? 0);
    if (size > maxBytes + 100_000) return reply("Keep your video under 40 MB.", 413);
    const form = await limitedFormData(request, maxBytes + 100_000);
    const file = form.get("video");
    const title = String(form.get("title") ?? "").trim();
    const category = String(form.get("category") ?? "");
    const creator = String(form.get("creator") ?? "").trim().slice(0, 60) || "Kreator VIBE";
    const caption = String(form.get("caption") ?? "").trim();
    const hashtags = String(form.get("hashtags") ?? "").split(/[\s,]+/).filter(Boolean).map((tag) => tag.replace(/^#+/, "").toLocaleLowerCase("en-US"));
    if (!(file instanceof File) || !types[file.type] || !file.size || file.size > maxBytes) return reply("Choose an MP4 or WebM video under 40 MB.", 400);
    if (title.length < 3 || title.length > 100) return reply("Use a title between 3 and 100 characters.", 400);
    if (caption.length > 500) return reply("Caption maksimal 500 karakter.", 400);
    if (hashtags.length > 5 || hashtags.some((tag) => !/^[\p{L}\p{N}_]{2,24}$/u.test(tag)) || new Set(hashtags).size !== hashtags.length) return reply("Use up to 5 unique hashtags, 2–24 characters each.", 400);
    if (!["Gaming", "Sports", "Crypto"].includes(category)) return reply("Choose a video category.", 400);
    const bytes = new Uint8Array(await file.arrayBuffer());
    const mp4 = file.type === "video/mp4" && String.fromCharCode(...bytes.slice(4, 8)) === "ftyp";
    const webm = file.type === "video/webm" && bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3;
    if (!mp4 && !webm) return reply("Invalid video format.", 400);
    await ensureBucket();
    const id = `upload-${crypto.randomUUID()}`;
    objectPath = `${encodeURIComponent(ownerId)}/${id}.${types[file.type]}`;
    const upload = await fetch(`${storageBase()}/object/${bucket}/${objectPath}`, {
      method: "POST", headers: { ...storageHeaders(), "Content-Type": file.type, "Cache-Control": "3600", "x-upsert": "false" }, body: bytes,
    });
    if (!upload.ok) throw new Error(`Storage upload failed (${upload.status})`);
    const src = `${storageBase()}/object/public/${bucket}/${objectPath}`;
    const item: UploadedContent = {
      id, ownerId, uploadedAt: new Date().toISOString(), title, creator, handle: "@vibe", description: caption, hashtags,
      category, kind: "insight", visual: category === "Crypto" ? "orange" : category === "Sports" ? "green" : "purple", minutes: 0,
      video: { provider: "upload", src, sourceUrl: src, cropPosition: "50% 50%", hasAudio: true },
    };
    await vibeStore().transaction((state) => { state.uploads ??= []; state.uploads.push(item); });
    return Response.json({ upload: item }, { status: 201 });
  } catch (error) {
    if (objectPath) await fetch(`${storageBase()}/object/${bucket}/${objectPath}`, { method: "DELETE", headers: storageHeaders() }).catch(() => {});
    if (error instanceof AuthError) return reply(error.message, error.status);
    if (error instanceof BodyLimitError) return reply("Keep your video under 40 MB.", 413);
    return reply("Upload failed. Try again.", 503);
  }
}
