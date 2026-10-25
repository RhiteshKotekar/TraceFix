import { timingSafeEqual } from "node:crypto";
import { ingestGrafana } from "@/lib/incidents";
import { logEvent } from "@/lib/db";

const MAX_BYTES = 256 * 1024;
const MAX_ALERTS = 200;

// shortcut: in-memory fixed-window limit (per process); move to a shared store if TraceFix runs more than one instance.
const LIMIT_PER_MIN = 120;
let windowStart = 0;
let windowCount = 0;
function rateLimited() {
  const now = Date.now();
  if (now - windowStart > 60_000) {
    windowStart = now;
    windowCount = 0;
  }
  return ++windowCount > LIMIT_PER_MIN;
}

const error = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

function authorized(header: string | null) {
  const secret = process.env.GRAFANA_WEBHOOK_SECRET;
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

// Receives Grafana unified-alerting webhook notifications (payload version "1").
// Records reports and groups them into incidents. Never starts a fix by itself.
// Responds 202: the alert is stored; triage and any fix happen from there.
export async function POST(req: Request) {
  if (rateLimited()) return error(429, "RATE_LIMITED", "Too many webhook requests; try again in a minute.");
  if (!process.env.GRAFANA_WEBHOOK_SECRET) return error(503, "NOT_CONFIGURED", "GRAFANA_WEBHOOK_SECRET is not set on the server.");
  if (!authorized(req.headers.get("authorization"))) {
    await logEvent("grafana", "error", "Rejected webhook: missing or wrong bearer secret").catch(() => {});
    return error(401, "UNAUTHORIZED", "Missing or invalid webhook secret.");
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return error(413, "PAYLOAD_TOO_LARGE", "Payload too large.");
  const text = await req.text();
  if (text.length > MAX_BYTES) return error(413, "PAYLOAD_TOO_LARGE", "Payload too large.");

  let body: { status?: unknown; alerts?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "BAD_REQUEST", "Body is not JSON.");
  }
  if (!body || typeof body !== "object" || typeof body.status !== "string" || !Array.isArray(body.alerts)) {
    return error(400, "BAD_REQUEST", "Expected a Grafana alert notification with status and an alerts array.");
  }
  if (body.alerts.length > MAX_ALERTS) return error(413, "PAYLOAD_TOO_LARGE", `At most ${MAX_ALERTS} alerts per notification.`);

  try {
    const result = await ingestGrafana(body as { alerts: unknown[] });
    return Response.json(
      { message: "Grafana alert received", status: body.status, alertCount: body.alerts.length, ...result },
      { status: 202 },
    );
  } catch (e) {
    console.error("Grafana webhook ingest failed:", e);
    return error(500, "INTERNAL", "Could not record the alert.");
  }
}
