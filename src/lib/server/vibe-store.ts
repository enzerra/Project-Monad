import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { emptySourceState, type SourceState } from "@/lib/source-calls";
import { readVirtualWallet } from "@/lib/virtual-token";
import { db, dbRpc, supabaseConfigured } from "@/lib/server/database";

function validateState(state: SourceState) {
  if (state.version !== 1 || !Array.isArray(state.calls) || !Array.isArray(state.contents) || !state.calibration || !state.wallets || !Number.isSafeInteger(state.revision) || state.revision < 0) throw new Error("Invalid VIBE store");
  for (const wallet of Object.values(state.wallets)) readVirtualWallet(JSON.stringify(wallet), null, new Date().toISOString());
}

// SQLite serializes independent Next processes as well as concurrent requests.
// Keep the whole transition (close/result/debit/reward) inside one transaction.
export class VibeStore {
  private database: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS vibe_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)");
  }
  read(): SourceState {
    const row = this.database.prepare("SELECT payload FROM vibe_state WHERE id=1").get() as { payload: string } | undefined;
    const state: SourceState = row ? JSON.parse(row.payload) : emptySourceState();
    validateState(state);
    return state;
  }
  transaction<T>(transition: (state: SourceState) => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const state = this.read();
      state.revision = (state.revision ?? 0) + 1;
      const result = transition(state);
      this.database.prepare("INSERT INTO vibe_state(id,payload) VALUES(1,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload").run(JSON.stringify(state));
      this.database.exec("COMMIT");
      return result;
    } catch (error) {
      this.database.exec("ROLLBACK");
      throw error;
    }
  }
  close() { this.database.close(); }
}

// A versioned PostgreSQL commit preserves the existing pure Call engine. The RPC
// locks the row and compares the revision, so independent hosts cannot lose writes.
export class SupabaseVibeStore {
  async read(): Promise<SourceState> {
    const rows = await db<{ revision: number; payload: SourceState }[]>("hive_vibe_state", "?id=eq.1&select=revision,payload");
    if (!rows.length) return emptySourceState();
    const state = rows[0].payload;
    validateState(state);
    if (state.revision !== rows[0].revision) throw new Error("Invalid VIBE revision");
    return state;
  }
  async transaction<T>(transition: (state: SourceState) => T): Promise<T> {
    for (let attempt = 0; attempt < 8; attempt++) {
      const state = await this.read();
      const previous = state.revision;
      state.revision++;
      const result = transition(state);
      const committed = await dbRpc<boolean>("hive_commit_vibe_state", { p_expected_revision: previous, p_payload: state });
      if (committed === true) return result;
      if (committed !== false) throw new Error("Invalid VIBE commit response");
    }
    throw new Error("VIBE store is busy. Retry after refreshing the account.");
  }
  close() { /* Remote connection uses stateless fetch. */ }
}

let singleton: VibeStore | SupabaseVibeStore | undefined;
export function vibeStore(): VibeStore | SupabaseVibeStore {
  if (!singleton) {
    if (supabaseConfigured()) { singleton = new SupabaseVibeStore(); return singleton; }
    if (process.env.NEXT_PUBLIC_PRIVY_APP_ID || process.env.SUPABASE_URL || process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("Privy mode requires complete Supabase configuration; local balances are preserved separately.");
    if (process.env.NODE_ENV === "production" && !process.env.VIBE_STORE_PATH) throw new Error("Persistent VIBE_STORE_PATH is required in production");
    singleton = new VibeStore(process.env.VIBE_STORE_PATH ?? path.join(process.cwd(), ".vibe-data", "vibe.sqlite"));
  }
  return singleton;
}
