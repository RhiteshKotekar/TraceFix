import { Pool, type PoolClient } from "pg";

// One pool per server process; cached on globalThis so dev hot-reloads don't leak connections.
const g = globalThis as { tracefixPool?: Pool };
export const pool = (g.tracefixPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));

export async function tx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    const out = await fn(c);
    await c.query("COMMIT");
    return out;
  } catch (e) {
    await c.query("ROLLBACK");
    throw e;
  } finally {
    c.release();
  }
}

export type EventLevel = "info" | "warn" | "error";
export type EventSource = "grafana" | "prometheus" | "tracefix";

export async function logEvent(
  source: EventSource,
  level: EventLevel,
  message: string,
  incidentId: string | null = null,
  db: Pick<Pool, "query"> = pool,
) {
  await db.query("INSERT INTO events (source, level, message, incident_id) VALUES ($1, $2, $3, $4)", [
    source,
    level,
    message,
    incidentId,
  ]);
}
