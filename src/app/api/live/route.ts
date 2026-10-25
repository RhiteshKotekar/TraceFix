import { connection } from "next/server";
import { pool } from "@/lib/db";
import { slowestRoute, targetUp } from "@/lib/prometheus";
import { P95_THRESHOLD_MS } from "@/lib/triage";
import { serviceJob } from "@/lib/projectStore";

export type LiveEvent = {
  id: string;
  at: string;
  source: "prometheus" | "grafana" | "tracefix";
  level: "info" | "warn" | "error";
  message: string;
  incidentId: string | null;
};

export type LiveSnapshot = {
  prometheus: "live" | "unreachable";
  route: string | null; // slowest route right now
  metrics: { p95Ms: number | null; rps: number | null; errorRate: number | null; up: boolean | null };
  events: LiveEvent[];
  cursor: number; // pass back as ?after= to receive only newer stored events
};

export async function GET(req: Request) {
  await connection();
  const after = Number(new URL(req.url).searchParams.get("after"));
  const now = new Date().toISOString();

  // Stored events: webhooks, triage, decisions. First call returns the latest 50; then only newer ones.
  const stored = Number.isInteger(after) && after > 0
    ? await pool.query("SELECT * FROM events WHERE id > $1 ORDER BY id LIMIT 200", [after])
    : await pool.query("SELECT * FROM (SELECT * FROM events ORDER BY id DESC LIMIT 50) e ORDER BY id");
  const events: LiveEvent[] = stored.rows.map((r) => ({
    id: `db-${r.id}`,
    at: r.at.toISOString(),
    source: r.source,
    level: r.level,
    message: r.message,
    incidentId: r.incident_id,
  }));
  const cursor = stored.rows.length ? Number(stored.rows[stored.rows.length - 1].id) : Math.max(after || 0, 0);

  // A live Prometheus sample on every poll (not stored).
  let prometheus: LiveSnapshot["prometheus"] = "live";
  let route: string | null = null;
  let metrics: LiveSnapshot["metrics"] = { p95Ms: null, rps: null, errorRate: null, up: null };
  const job = await serviceJob().catch(() => null);
  if (!job) {
    events.push({ id: `prometheus-${now}`, at: now, source: "prometheus", level: "warn", message: "No project configured yet; finish setup to watch a service", incidentId: null });
    return Response.json({ prometheus, route, metrics, events, cursor } satisfies LiveSnapshot, { headers: { "Cache-Control": "no-store" } });
  }
  try {
    const [m, up] = await Promise.all([slowestRoute(job), targetUp(job)]);
    route = m.route;
    metrics = { p95Ms: m.p95Ms, rps: m.rps, errorRate: m.errorRate, up };
    const f = (v: number | null, fmt: (n: number) => string) => (v == null ? "n/a" : fmt(v));
    events.push({
      id: `prometheus-${now}`,
      at: now,
      source: "prometheus",
      level: up === false ? "error" : m.p95Ms != null && m.p95Ms > P95_THRESHOLD_MS ? "warn" : "info",
      message:
        up === false
          ? `Target ${job} is down (up=0)`
          : up == null
            ? `No scrape data for job "${job}" yet. Is the service running and is Prometheus scraping it?`
            : `slowest ${m.route ?? "route"} p95=${f(m.p95Ms, (n) => `${Math.round(n)}ms`)} · all routes rate=${f(m.rps, (n) => `${n.toFixed(1)}/s`)} errors=${f(m.errorRate, (n) => `${(n * 100).toFixed(2)}%`)}`,
      incidentId: null,
    });
  } catch {
    prometheus = "unreachable";
    events.push({ id: `prometheus-${now}`, at: now, source: "prometheus", level: "error", message: "Prometheus unreachable at PROMETHEUS_URL", incidentId: null });
  }

  const body: LiveSnapshot = { prometheus, route, metrics, events, cursor };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
