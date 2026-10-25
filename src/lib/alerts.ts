// Pure normalization of one Grafana unified-alerting alert (webhook payload version "1").

export type NormalizedAlert =
  | { kind: "test" }
  | { kind: "invalid"; alertName: string | null; reason: string }
  | {
      kind: "alert";
      status: "firing" | "resolved";
      alertName: string;
      service: string;
      endpoint: string;
      route: string | null; // set only for route-level (latency) alerts
      fingerprint: string;
      startsAt: Date;
      endsAt: Date | null;
      severity: "warning" | "critical";
      summary: string | null;
      description: string | null;
      valueMs: number | null;
      raw: Record<string, unknown>; // bounded copy of the original alert
    };

const MAX_RAW_BYTES = 16 * 1024;
const str = (v: unknown, max = 500) => (typeof v === "string" && v.trim() ? v.trim().slice(0, max) : null);

function labelsOf(v: unknown): Record<string, string> {
  if (!v || typeof v !== "object") return {};
  const out: Record<string, string> = {};
  for (const [k, val] of Object.entries(v as Record<string, unknown>)) if (typeof val === "string") out[k] = val.slice(0, 500);
  return out;
}

function bounded(a: Record<string, unknown>, labels: Record<string, string>, annotations: Record<string, string>) {
  const json = JSON.stringify(a);
  if (json.length <= MAX_RAW_BYTES) return a;
  // Keep what investigation needs; drop the rest (e.g. huge annotations or image URLs).
  return { truncated: true, labels, annotations, startsAt: a.startsAt, endsAt: a.endsAt, fingerprint: a.fingerprint, values: a.values };
}

const date = (v: unknown) => {
  if (typeof v !== "string") return null;
  const d = new Date(v);
  // Grafana sends 0001-01-01 as "no end time".
  return Number.isNaN(+d) || d.getUTCFullYear() < 1970 ? null : d;
};

export function normalizeAlert(input: unknown, fallbackService: string | null): NormalizedAlert {
  if (!input || typeof input !== "object") return { kind: "invalid", alertName: null, reason: "not an object" };
  const a = input as Record<string, unknown>;
  const labels = labelsOf(a.labels);
  const annotations = labelsOf(a.annotations);
  const alertName = str(labels.alertname, 200);

  // Grafana's "Test" button on a contact point sends alertname TestAlert with no real labels.
  if (alertName === "TestAlert") return { kind: "test" };
  if (!alertName) return { kind: "invalid", alertName: null, reason: "missing alertname label" };

  const service = str(labels.service, 200) ?? str(labels.job, 200) ?? fallbackService;
  if (!service) return { kind: "invalid", alertName, reason: "needs a service or job label (or a configured project)" };
  const route = str(labels.endpoint, 300) ?? str(labels.route, 300) ?? str(labels.handler, 300) ?? str(labels.path, 300);
  // Alerts without a route (CPU, memory, a whole instance) are still incidents, keyed on the instance.
  const endpoint = route ?? str(labels.instance, 300) ?? "service-wide";

  const fingerprint = str(a.fingerprint, 128);
  const startsAt = date(a.startsAt);
  if (!fingerprint || !startsAt) return { kind: "invalid", alertName, reason: "needs fingerprint and startsAt" };
  const status = a.status === "resolved" ? "resolved" : "firing";

  // Only route-level alerts are latency (seconds); a memory or CPU alert's value is in another unit.
  const values = a.values && typeof a.values === "object" ? (a.values as Record<string, unknown>) : {};
  const raw = values.B ?? values.A;
  const valueMs = route && typeof raw === "number" && Number.isFinite(raw) ? raw * 1000 : null;

  return {
    kind: "alert",
    status,
    alertName,
    service,
    endpoint,
    route,
    fingerprint,
    startsAt,
    endsAt: date(a.endsAt),
    severity: labels.severity === "critical" ? "critical" : "warning",
    summary: str(annotations.summary, 1000),
    description: str(annotations.description, 2000),
    valueMs,
    raw: bounded(a, labels, annotations),
  };
}
