import { incidentKey } from "@/lib/model";
import { logEvent, pool, tx } from "@/lib/db";
import { endpointMetrics } from "@/lib/prometheus";
import { triage } from "@/lib/triage";

export type Settings = { mode: "manual" | "automatic"; autoThreshold: number };

export async function getSettings(): Promise<Settings> {
  const { rows } = await pool.query("SELECT mode, auto_threshold FROM settings WHERE id = 1");
  return { mode: rows[0]?.mode ?? "manual", autoThreshold: rows[0]?.auto_threshold ?? 70 };
}

export async function saveSettings(s: Settings) {
  await pool.query("UPDATE settings SET mode = $1, auto_threshold = $2, updated_at = now() WHERE id = 1", [s.mode, s.autoThreshold]);
  await logEvent("tracefix", "info", `Response mode set to ${s.mode}${s.mode === "automatic" ? ` (auto-start ≥ ${s.autoThreshold})` : ""}`);
}

// --- Grafana webhook ingestion -------------------------------------------------------------

type GrafanaAlert = {
  status?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  startsAt?: string;
  endsAt?: string;
  values?: Record<string, number> | null;
  fingerprint?: string;
};

export type IngestResult = { opened: number; added: number; repeats: number; resolved: number; ignored: number };

const ms = (n: number) => `${Math.round(n).toLocaleString("en-US")} ms`;

export async function ingestGrafana(payload: { alerts?: unknown }): Promise<IngestResult> {
  const out: IngestResult = { opened: 0, added: 0, repeats: 0, resolved: 0, ignored: 0 };
  const alerts = Array.isArray(payload.alerts) ? (payload.alerts as GrafanaAlert[]) : [];
  const toTriage = new Set<string>();

  for (const a of alerts) {
    const labels = a.labels ?? {};
    const alertName = labels.alertname;
    const service = labels.service;
    const endpoint = labels.endpoint || labels.route;
    const starts = a.startsAt ? new Date(a.startsAt) : null;
    if (!alertName || !service || !endpoint || !a.fingerprint || !starts || Number.isNaN(+starts)) {
      out.ignored++;
      await logEvent("grafana", "warn", `Ignored alert "${alertName ?? "unknown"}": needs alertname, service and endpoint labels`);
      continue;
    }
    // Grafana reports values in the query's unit (seconds here); prefer the reduced value B, then A.
    const raw = a.values?.B ?? a.values?.A;
    const valueMs = typeof raw === "number" && Number.isFinite(raw) ? raw * 1000 : null;
    const severity = labels.severity === "critical" ? "critical" : "warning";
    const where = `${alertName} on ${service} ${endpoint}`;

    if (a.status === "resolved") {
      const { rows } = await pool.query(
        `UPDATE reports SET status = 'resolved', ends_at = $3, last_received_at = now()
          WHERE fingerprint = $1 AND starts_at = $2 RETURNING incident_id`,
        [a.fingerprint, starts, a.endsAt ? new Date(a.endsAt) : new Date()],
      );
      out.resolved++;
      await logEvent("grafana", "info", `Resolved: ${where}`, rows[0]?.incident_id ?? null);
      continue;
    }

    await tx(async (c) => {
      const inc = await c.query(
        `INSERT INTO incidents (key, alert_name, service, endpoint) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET updated_at = now()
         RETURNING id, status, (xmax = 0) AS opened`,
        [incidentKey({ alertName, service, endpoint }), alertName, service, endpoint],
      );
      const incident = inc.rows[0];
      const rep = await c.query(
        `INSERT INTO reports (incident_id, fingerprint, starts_at, status, severity, summary, value_ms, raw)
         VALUES ($1, $2, $3, 'firing', $4, $5, $6, $7)
         ON CONFLICT (fingerprint, starts_at) DO UPDATE
           SET deliveries = reports.deliveries + 1, last_received_at = now(), status = 'firing',
               value_ms = COALESCE(EXCLUDED.value_ms, reports.value_ms), severity = EXCLUDED.severity
         RETURNING deliveries, (xmax = 0) AS added`,
        [incident.id, a.fingerprint, starts, severity, a.annotations?.summary ?? null, valueMs, JSON.stringify(a)],
      );
      const { deliveries, added } = rep.rows[0];
      const value = valueMs == null ? "" : ` (p95 ${ms(valueMs)})`;

      await logEvent("grafana", severity === "critical" ? "error" : "warn", `Firing: ${where}${value}`, incident.id, c);
      if (incident.opened) {
        out.opened++;
        await logEvent("tracefix", "info", `Opened a new incident for ${service} ${endpoint}`, incident.id, c);
      } else if (added) {
        out.added++;
        await logEvent("tracefix", "info", `Re-fire grouped into the existing incident for ${endpoint}`, incident.id, c);
      } else {
        out.repeats++;
        await logEvent("tracefix", "info", `Repeat delivery #${deliveries} for ${endpoint}; no new pipeline`, incident.id, c);
      }
      if (incident.status === "AWAITING_APPROVAL") toTriage.add(incident.id);
    });
  }

  // Outside the ingest transactions: triage queries Prometheus and must not hold row locks while it waits.
  for (const id of toTriage) await retriage(id);
  return out;
}

// --- Triage and automatic mode -------------------------------------------------------------

export async function retriage(incidentId: string) {
  const { rows: [incident] } = await pool.query("SELECT endpoint, status FROM incidents WHERE id = $1", [incidentId]);
  if (!incident || incident.status !== "AWAITING_APPROVAL") return;
  const { rows: reports } = await pool.query(
    "SELECT value_ms, severity, deliveries FROM reports WHERE incident_id = $1",
    [incidentId],
  );
  let errorRate: number | null = null;
  try {
    errorRate = (await endpointMetrics(incident.endpoint, "5m")).errorRate;
  } catch {}

  const t = triage({
    reports: reports.map((r) => ({ valueMs: r.value_ms, severity: r.severity, deliveries: r.deliveries })),
    endpoint: incident.endpoint,
    errorRate,
  });
  await pool.query("UPDATE incidents SET triage = $2, updated_at = now() WHERE id = $1", [incidentId, JSON.stringify(t)]);
  await logEvent("tracefix", "info", `Triage scored ${t.score}/100 (${t.verdict}) for ${incident.endpoint}`, incidentId);

  const s = await getSettings();
  if (s.mode === "automatic" && t.score >= s.autoThreshold) {
    await decide(incidentId, "approve", "automatic mode", `Triage score ${t.score} ≥ threshold ${s.autoThreshold}.`);
  }
}

// --- Human (or automatic) decision ---------------------------------------------------------

export class InvalidState extends Error {}

export async function decide(incidentId: string, action: "approve" | "reject", by: string, reason: string | null) {
  // Evidence snapshot first: a slow Prometheus must not hold the transaction open.
  let evidence = null;
  if (action === "approve") {
    const { rows } = await pool.query("SELECT endpoint FROM incidents WHERE id = $1", [incidentId]);
    if (rows[0]) evidence = await endpointMetrics(rows[0].endpoint, "10m").catch(() => null);
  }

  return tx(async (c) => {
    // Conditional update: a double click or a second worker can't decide twice.
    const upd = await c.query(
      `UPDATE incidents SET status = $2, decided_by = $3, decision_reason = $4, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'AWAITING_APPROVAL' RETURNING endpoint`,
      [incidentId, action === "approve" ? "APPROVED" : "REJECTED", by, reason],
    );
    if (!upd.rowCount) throw new InvalidState("This incident is not awaiting a decision.");
    const endpoint = upd.rows[0].endpoint;

    if (action === "reject") {
      await logEvent("tracefix", "info", `Rejected by ${by}: ${endpoint}`, incidentId, c);
      return { status: "REJECTED" as const, jobId: null };
    }
    const job = await c.query(
      `INSERT INTO jobs (incident_id, evidence, progress_message) VALUES ($1, $2, $3) RETURNING id`,
      [incidentId, evidence && JSON.stringify(evidence), "Queued. Waiting for the fix worker (agent not connected yet)."],
    );
    await logEvent("tracefix", "info", `Approved by ${by}: fix pipeline queued for ${endpoint}`, incidentId, c);
    return { status: "QUEUED" as const, jobId: job.rows[0].id as string };
  });
}
