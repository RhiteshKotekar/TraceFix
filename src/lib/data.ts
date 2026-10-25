import { connection } from "next/server";
import { pool } from "@/lib/db";

export * from "@/lib/model";
import type { Incident, Job, Report } from "@/lib/model";

const iso = (d: Date | null) => (d ? d.toISOString() : null);

/* eslint-disable @typescript-eslint/no-explicit-any -- pg rows are untyped; mapped field by field below */
function toJob(r: any): Job {
  return {
    id: r.id,
    status: r.status,
    stage: r.stage,
    progressMessage: r.progress_message,
    commitSha: r.commit_sha,
    evidence: r.evidence,
    baseline: r.baseline,
    candidate: r.candidate,
    agentOutput: r.agent_output,
    diff: r.diff,
    decision: r.decision,
    gateResults: r.gate_results,
    prUrl: r.pr_url,
    error: r.error,
    runLog: r.run_log ?? [],
    reproduction: r.reproduction,
    createdAt: iso(r.created_at)!,
    startedAt: iso(r.started_at),
    finishedAt: iso(r.finished_at),
    updatedAt: iso(r.updated_at)!,
  };
}

function toReport(r: any): Report {
  return {
    id: r.id,
    fingerprint: r.fingerprint,
    startsAt: iso(r.starts_at)!,
    receivedAt: iso(r.received_at)!,
    lastReceivedAt: iso(r.last_received_at)!,
    deliveries: r.deliveries,
    status: r.status,
    severity: r.severity,
    summary: r.summary ?? "",
    valueMs: r.value_ms,
  };
}

async function load(where: string, params: unknown[]): Promise<Incident[]> {
  await connection();
  const { rows } = await pool.query(`SELECT * FROM incidents ${where}`, params);
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [reports, jobs] = await Promise.all([
    pool.query("SELECT * FROM reports WHERE incident_id = ANY($1) ORDER BY last_received_at DESC", [ids]),
    pool.query("SELECT DISTINCT ON (incident_id) * FROM jobs WHERE incident_id = ANY($1) ORDER BY incident_id, created_at DESC", [ids]),
  ]);
  return rows
    .map((r: any): Incident => {
      const reps = reports.rows.filter((x) => x.incident_id === r.id).map(toReport);
      const job = jobs.rows.find((x) => x.incident_id === r.id);
      const times = reps.flatMap((x) => [x.receivedAt, x.lastReceivedAt]).sort();
      return {
        id: r.id,
        key: r.key,
        alertName: r.alert_name,
        service: r.service,
        endpoint: r.endpoint,
        status: r.status,
        decidedBy: r.decided_by,
        decisionReason: r.decision_reason,
        decidedAt: iso(r.decided_at),
        triage: r.triage,
        job: job ? toJob(job) : null,
        reports: reps,
        firstSeen: times[0] ?? iso(r.created_at)!,
        lastSeen: times[times.length - 1] ?? iso(r.updated_at)!,
        critical: reps.some((x) => x.severity === "critical"),
      };
    })
    .sort((a, b) => b.lastSeen.localeCompare(a.lastSeen));
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function getIncidents(): Promise<Incident[]> {
  return load("", []);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function getIncident(id: string): Promise<Incident | null> {
  if (!UUID.test(id)) return null;
  return (await load("WHERE id = $1", [id]))[0] ?? null;
}
