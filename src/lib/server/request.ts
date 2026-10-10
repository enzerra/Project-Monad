import "server-only";

export function trustedOrigin(request: Request): boolean {
  try {
    const configured = process.env.NEXT_PUBLIC_APP_ORIGIN;
    if (!configured && process.env.NODE_ENV === "production") return false;
    return request.headers.get("origin") === new URL(configured || request.url).origin;
  } catch { return false; }
}

export class BodyLimitError extends Error {}

// Content-Length alone is insufficient: chunked uploads may omit it.
export async function limitedFormData(request: Request, limit: number): Promise<FormData> {
  if (Number(request.headers.get("content-length") ?? 0) > limit) throw new BodyLimitError();
  const reader = request.body?.getReader();
  if (!reader) throw new Error("Missing request body");
  let size = 0;
  const chunks: Uint8Array[] = [];
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new BodyLimitError(); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new Response(bytes, { headers: { "Content-Type": request.headers.get("content-type") ?? "" } }).formData();
}
