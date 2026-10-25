import pg from "pg";
import type { Pool as PgPool, PoolClient } from "pg";

// Default import: the worker and tests run this file under plain Node, where pg's CJS named exports don't resolve.
const { Pool } = pg;

// One pool per process; cached on globalThis so dev hot-reloads don't leak connections.
const g = globalThis as { tracefixPool?: PgPool };
export const pool: PgPool = (g.tracefixPool ??= new Pool({ connectionString: process.env.DATABASE_URL, max: 5 }));

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
export type EventSource = "grafana" | "prometheus" | "tracefix" | "worker" | "github";
export type Queryable = Pick<PgPool, "query">;

// Audit/event log shown in the live feed. `actor` records who caused it (user email, "worker", "github"...).
export async function logEvent(
  source: EventSource,
  level: EventLevel,
  message: string,
  incidentId: string | null = null,
  db: Queryable = pool,
  actor: string | null = null,
) {
  await db.query("INSERT INTO events (source, level, message, incident_id, actor) VALUES ($1, $2, $3, $4, $5)", [
    source,
    level,
    message.slice(0, 1000),
    incidentId,
    actor,
  ]);
}
