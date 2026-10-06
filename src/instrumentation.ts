export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.YOUTUBE_API_KEY && process.env.NEXT_PHASE !== "phase-production-build" && (process.env.NODE_ENV !== "production" || process.env.VIBE_STORE_PATH)) {
    const { startSourceWorker } = await import("./lib/server/vibe");
    startSourceWorker();
  }
}
