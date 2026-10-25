import { connection } from "next/server";
import { pool } from "@/lib/db";
import { promQuery, targetUp } from "@/lib/prometheus";
import { serviceJob } from "@/lib/projectStore";

export type StackStatus = {
  service: string | null; // the configured project's service (= Prometheus job); null until setup saves it
  database: boolean;
  prometheus: boolean;
  target: boolean | null; // null = no project configured, or Prometheus has no data for that job yet
  grafana: boolean;
  lastWebhookAt: string | null;
};


// Health of each piece of the local stack, for the setup checklist.
export async function GET() {
  await connection();
  const service = await serviceJob().catch(() => null);
  const [db, prom, target, grafana] = await Promise.allSettled([
    pool.query("SELECT max(at) AS at FROM events WHERE source = 'grafana'"),
    promQuery("vector(1)"),
    service ? targetUp(service) : Promise.resolve(null),
    process.env.GRAFANA_URL
      ? fetch(`${process.env.GRAFANA_URL}/api/health`, { signal: AbortSignal.timeout(1000), cache: "no-store" })
      : Promise.reject(new Error("GRAFANA_URL is not set")),
  ]);
  const body: StackStatus = {
    service,
    database: db.status === "fulfilled",
    prometheus: prom.status === "fulfilled",
    target: target.status === "fulfilled" ? target.value : null,
    grafana: grafana.status === "fulfilled" && grafana.value.ok,
    lastWebhookAt: db.status === "fulfilled" ? (db.value.rows[0]?.at?.toISOString() ?? null) : null,
  };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}
