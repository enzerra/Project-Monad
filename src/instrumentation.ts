export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.YOUTUBE_API_KEY && process.env.NEXT_PHASE !== "phase-production-build" && (process.env.NODE_ENV !== "production" || process.env.VIBE_STORE_PATH || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY))) {
    const { startSourceWorker } = await import("./lib/server/vibe");
    startSourceWorker();
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PUBLIC_MONAD_CONTRACT_ADDRESS && process.env.RELAYER_PRIVATE_KEY && process.env.CHOICE_ENCRYPTION_KEY && process.env.OPERATOR_API_KEY) {
      const { startOperatorWorker } = await import("./lib/server/operator");
      startOperatorWorker();
    }
  }
}
