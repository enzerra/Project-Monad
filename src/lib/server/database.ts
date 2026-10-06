import "server-only";

export function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not configured`);
  return value;
}
export function supabaseConfigured() { return Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY); }

// Service-role access stays on the server. Never include raw DB errors/rows in logs.
async function databaseRequest<T>(resource: string, query: string, init?: RequestInit): Promise<T> {
  const key = required("SUPABASE_SERVICE_ROLE_KEY");
  const response = await fetch(`${required("SUPABASE_URL").replace(/\/$/, "")}/rest/v1/${resource}${query}`, {
    ...init, cache: "no-store", signal: init?.signal ?? AbortSignal.timeout(10_000),
    headers: { apikey: key, authorization: `Bearer ${key}`, "content-type": "application/json", prefer: "return=representation", ...init?.headers },
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status}). Check configuration and migrations.`);
  return response.json() as Promise<T>;
}
export function db<T>(table: string, query = "", init?: RequestInit): Promise<T> {
  if (!/^hive_[a-z_]+$/.test(table)) throw new Error("Invalid table");
  return databaseRequest<T>(table, query, init);
}
export function dbRpc<T>(name: string, body: unknown): Promise<T> {
  if (!/^hive_[a-z_]+$/.test(name)) throw new Error("Invalid function");
  return databaseRequest<T>(`rpc/${name}`, "", { method: "POST", body: JSON.stringify(body) });
}
