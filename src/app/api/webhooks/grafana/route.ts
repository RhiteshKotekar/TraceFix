import { timingSafeEqual } from "node:crypto";
import { ingestGrafana } from "@/lib/incidents";
import { logEvent } from "@/lib/db";

const MAX_BYTES = 256 * 1024;

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
export async function POST(req: Request) {
  if (!authorized(req.headers.get("authorization"))) {
    await logEvent("grafana", "error", "Rejected webhook: missing or wrong bearer secret").catch(() => {});
    return error(401, "UNAUTHORIZED", "Missing or invalid webhook secret.");
  }
  if (Number(req.headers.get("content-length") ?? 0) > MAX_BYTES) return error(413, "PAYLOAD_TOO_LARGE", "Payload too large.");
  const text = await req.text();
  if (text.length > MAX_BYTES) return error(413, "PAYLOAD_TOO_LARGE", "Payload too large.");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return error(400, "BAD_REQUEST", "Body is not JSON.");
  }
  if (!body || typeof body !== "object" || !Array.isArray((body as { alerts?: unknown }).alerts)) {
    return error(400, "BAD_REQUEST", "Expected a Grafana alert notification with an alerts array.");
  }

  try {
    const result = await ingestGrafana(body as { alerts: unknown[] });
    return Response.json(result);
  } catch (e) {
    console.error("Grafana webhook ingest failed:", e);
    return error(500, "INTERNAL", "Could not record the alert.");
  }
}
