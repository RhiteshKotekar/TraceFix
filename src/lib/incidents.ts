import { incidentKey } from "./model.ts";
import { logEvent, pool, tx } from "./db.ts";
import { endpointMetrics } from "./prometheus.ts";
import { triage } from "./triage.ts";
import { metricsUrl, serviceJob } from "./projectStore.ts";
import { scrapeService } from "./scrape.ts";
import { normalizeAlert } from "./alerts.ts";

export type Settings = { mode: "manual" | "automatic"; autoThreshold: number };

export async function getSettings(): Promise<Settings> {
  const { rows } = await pool.query("SELECT mode, auto_threshold FROM settings WHERE id = 1");
  return { mode: rows[0]?.mode ?? "manual", autoThreshold: rows[0]?.auto_threshold ?? 70 };
}

export async function saveSettings(s: Settings, actor: string) {
  await pool.query("UPDATE settings SET mode = $1, auto_threshold = $2, updated_at = now() WHERE id = 1", [s.mode, s.autoThreshold]);
  await logEvent(
    "tracefix",
    "info",
    `Response mode set to ${s.mode}${s.mode === "automatic" ? ` (auto-start ≥ ${s.autoThreshold})` : ""}`,
    null,
    pool,
    actor,
  );
}

// --- Grafana webhook ingestion -------------------------------------------------------------

export type IngestResult = { opened: number; added: number; repeats: number; resolved: number; ignored: number; tests: number };

const ms = (n: number) => `${Math.round(n).toLocaleString("en-US")} ms`;

export async function ingestGrafana(payload: { alerts?: unknown }): Promise<IngestResult> {
  const out: IngestResult = { opened: 0, added: 0, repeats: 0, resolved: 0, ignored: 0, tests: 0 };
  const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
  const fallbackService = await serviceJob().catch(() => null);
  const toTriage = new Set<string>();

  for (const input of alerts) {
    const a = normalizeAlert(input, fallbackService);
    if (a.kind === "test") {
      out.tests++;
      await logEvent("grafana", "info", "Contact point test received: Grafana can reach TraceFix", null, pool, "grafana");
      continue;
    }
    if (a.kind === "invalid") {
      out.ignored++;
      await logEvent("grafana", "warn", `Ignored alert "${a.alertName ?? "unknown"}": ${a.reason}`, null, pool, "grafana");
      continue;
    }
    const where = `${a.alertName} on ${a.service} ${a.endpoint}`;

    if (a.status === "resolved") {
      // Resolution updates the report and, once nothing is firing, the incident. Repair history is untouched.
      await tx(async (c) => {
        const { rows } = await c.query(
          `UPDATE reports SET status = 'resolved', ends_at = $3, last_received_at = now()
            WHERE fingerprint = $1 AND starts_at = $2 RETURNING incident_id`,
          [a.fingerprint, a.startsAt, a.endsAt ?? new Date()],
        );
        const incidentId = rows[0]?.incident_id ?? null;
        if (incidentId) {
          await c.query(
            `UPDATE incidents SET resolved_at = now(), updated_at = now()
              WHERE id = $1 AND NOT EXISTS (SELECT 1 FROM reports WHERE incident_id = $1 AND status = 'firing')`,
            [incidentId],
          );
        }
        await logEvent("grafana", "info", `Resolved: ${where}`, incidentId, c, "grafana");
      });
      out.resolved++;
      continue;
    }

    await tx(async (c) => {
      const inc = await c.query(
        `INSERT INTO incidents (key, alert_name, service, endpoint) VALUES ($1, $2, $3, $4)
         ON CONFLICT (key) DO UPDATE SET updated_at = now(), resolved_at = NULL
         RETURNING id, status, (xmax = 0) AS opened`,
        [incidentKey(a), a.alertName, a.service, a.endpoint],
      );
      const incident = inc.rows[0];
      const rep = await c.query(
        `INSERT INTO reports (incident_id, fingerprint, starts_at, status, severity, summary, value_ms, raw)
         VALUES ($1, $2, $3, 'firing', $4, $5, $6, $7)
         ON CONFLICT (fingerprint, starts_at) DO UPDATE
           SET deliveries = reports.deliveries + 1, last_received_at = now(), status = 'firing', ends_at = NULL,
               value_ms = COALESCE(EXCLUDED.value_ms, reports.value_ms), severity = EXCLUDED.severity
         RETURNING deliveries, (xmax = 0) AS added`,
        [incident.id, a.fingerprint, a.startsAt, a.severity, a.summary, a.valueMs, JSON.stringify(a.raw)],
      );
      const { deliveries, added } = rep.rows[0];
      const value = a.valueMs == null ? "" : ` (p95 ${ms(a.valueMs)})`;

      await logEvent("grafana", a.severity === "critical" ? "error" : "warn", `Firing: ${where}${value}`, incident.id, c, "grafana");
      if (incident.opened) {
        out.opened++;
        await logEvent("tracefix", "info", `Opened a new incident for ${a.service} ${a.endpoint}`, incident.id, c);
      } else if (added) {
        out.added++;
        await logEvent("tracefix", "info", `Re-fire grouped into the existing incident for ${a.endpoint}`, incident.id, c);
      } else {
        out.repeats++;
        await logEvent("tracefix", "info", `Repeat delivery #${deliveries} for ${a.endpoint}; no new pipeline`, incident.id, c);
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
  const {
    rows: [incident],
  } = await pool.query("SELECT endpoint, status FROM incidents WHERE id = $1", [incidentId]);
  if (!incident || incident.status !== "AWAITING_APPROVAL") return;
  const { rows: reports } = await pool.query("SELECT value_ms, severity, deliveries FROM reports WHERE incident_id = $1", [incidentId]);
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
  await logEvent("tracefix", "info", `Deterministic triage scored ${t.score}/100 (${t.verdict}) for ${incident.endpoint}`, incidentId);

  const s = await getSettings();
  if (s.mode === "automatic" && t.score >= s.autoThreshold) {
    await decide(incidentId, "approve", "automatic mode", `Triage score ${t.score} ≥ threshold ${s.autoThreshold}.`).catch((e) => {
      if (!(e instanceof InvalidState)) throw e;
    });
  }
}

// --- Human (or automatic) decision ---------------------------------------------------------

export class InvalidState extends Error {}

async function evidenceFor(endpoint: string) {
  // Prometheus first; the service's own /metrics if Prometheus has nothing. Unavailable stays null.
  let evidence = await endpointMetrics(endpoint, "10m").catch(() => null);
  if (!evidence || evidence.p95 == null) {
    const url = await metricsUrl().catch(() => null);
    const direct = url ? await scrapeService(url).catch(() => null) : null;
    const r = direct?.routes.find((x) => x.route === endpoint);
    if (r) evidence = { p50: null, p95: r.p95Ms, rps: r.rps, errorRate: r.errorRate };
  }
  return evidence;
}

const QUEUED_MESSAGE = "Queued. Waiting for the fix worker.";

// Approve or reject exactly once. Approval and job creation are one transaction.
export async function decide(incidentId: string, action: "approve" | "reject", by: string, reason: string | null) {
  let evidence = null;
  if (action === "approve") {
    const { rows } = await pool.query("SELECT endpoint FROM incidents WHERE id = $1", [incidentId]);
    if (rows[0]) evidence = await evidenceFor(rows[0].endpoint);
  }

  return tx(async (c) => {
    // Conditional update: a double click, a replayed request or automatic mode racing a human can't decide twice.
    const upd = await c.query(
      `UPDATE incidents SET status = $2, decided_by = $3, decision_reason = $4, decided_at = now(), updated_at = now()
        WHERE id = $1 AND status = 'AWAITING_APPROVAL' RETURNING endpoint`,
      [incidentId, action === "approve" ? "APPROVED" : "REJECTED", by, reason],
    );
    if (!upd.rowCount) throw new InvalidState("This incident is not awaiting a decision.");
    const endpoint = upd.rows[0].endpoint;

    if (action === "reject") {
      await logEvent("tracefix", "info", `Rejected: ${endpoint}`, incidentId, c, by);
      return { status: "REJECTED" as const, jobId: null };
    }
    const job = await c.query(`INSERT INTO jobs (incident_id, evidence, progress_message) VALUES ($1, $2, $3) RETURNING id`, [
      incidentId,
      evidence && JSON.stringify(evidence),
      QUEUED_MESSAGE,
    ]);
    await logEvent("tracefix", "info", `Approved: fix pipeline queued for ${endpoint}`, incidentId, c, by);
    return { status: "QUEUED" as const, jobId: job.rows[0].id as string };
  });
}

// Queue a fresh attempt after a failed or inconclusive run. Never while one is active or after a PR exists.
export async function retry(incidentId: string, by: string) {
  const { rows } = await pool.query("SELECT endpoint, status FROM incidents WHERE id = $1", [incidentId]);
  if (!rows[0] || rows[0].status !== "APPROVED") throw new InvalidState("Only approved incidents can be retried.");
  const evidence = await evidenceFor(rows[0].endpoint);
  return tx(async (c) => {
    const last = await c.query("SELECT status FROM jobs WHERE incident_id = $1 ORDER BY created_at DESC LIMIT 1 FOR UPDATE", [incidentId]);
    const s = last.rows[0]?.status;
    if (s === "QUEUED" || s === "RUNNING") throw new InvalidState("A fix pipeline is already running for this incident.");
    if (s === "PR_CREATED") throw new InvalidState("A pull request already exists for this incident.");
    // The partial unique index (one active job per incident) also guards concurrent retries.
    const job = await c.query(`INSERT INTO jobs (incident_id, evidence, progress_message) VALUES ($1, $2, $3) RETURNING id`, [
      incidentId,
      evidence && JSON.stringify(evidence),
      QUEUED_MESSAGE,
    ]);
    await logEvent("tracefix", "info", `Retry queued for ${rows[0].endpoint}`, incidentId, c, by);
    return { status: "QUEUED" as const, jobId: job.rows[0].id as string };
  });
}
