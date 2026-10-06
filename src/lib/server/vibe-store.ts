import "server-only";
import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { emptySourceState, type SourceState } from "@/lib/source-calls";
import { readVirtualWallet } from "@/lib/virtual-token";

// SQLite serializes independent Next processes as well as concurrent requests.
// Keep the whole transition (close/result/debit/reward) inside one transaction.
export class VibeStore {
  private database: DatabaseSync;
  constructor(filename: string) {
    if (filename !== ":memory:") mkdirSync(path.dirname(filename), { recursive: true });
    this.database = new DatabaseSync(filename);
    this.database.exec("PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS vibe_state (id INTEGER PRIMARY KEY CHECK(id=1), payload TEXT NOT NULL)");
  }
  transaction<T>(transition: (state: SourceState) => T): T {
    this.database.exec("BEGIN IMMEDIATE");
    try {
      const row = this.database.prepare("SELECT payload FROM vibe_state WHERE id=1").get() as { payload: string } | undefined;
      const state: SourceState = row ? JSON.parse(row.payload) : emptySourceState();
      if (state.version !== 1 || !Array.isArray(state.calls) || !Array.isArray(state.contents) || !state.calibration || !state.wallets) throw new Error("Invalid VIBE store");
      // Never reset a corrupt account or grant it another initial balance.
      for (const wallet of Object.values(state.wallets)) readVirtualWallet(JSON.stringify(wallet), null, new Date().toISOString());
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

let singleton: VibeStore | undefined;
export function vibeStore(): VibeStore {
  if (!singleton) {
    if (process.env.NODE_ENV === "production" && !process.env.VIBE_STORE_PATH) throw new Error("Persistent VIBE_STORE_PATH is required in production");
    singleton = new VibeStore(process.env.VIBE_STORE_PATH ?? path.join(process.cwd(), ".vibe-data", "vibe.sqlite"));
  }
  return singleton;
}
