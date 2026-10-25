import type { Triage } from "@/lib/model";

export const P95_THRESHOLD_MS = Number(process.env.ALERT_P95_THRESHOLD_MS) || 200;

type Input = {
  reports: { valueMs: number | null; severity: string; deliveries: number }[];
  endpoint: string;
  errorRate: number | null; // from Prometheus; null when unavailable
};

const clamp = (n: number) => Math.min(1, Math.max(0, n));

// shortcut: deterministic heuristic standing in for the AI triage agent (not built yet).
// Same output shape, so swapping in the model later changes nothing downstream.
export function triage({ reports, endpoint, errorRate }: Input): Triage {
  const worst = Math.max(0, ...reports.map((r) => r.valueMs ?? 0));
  const deliveries = reports.reduce((n, r) => n + r.deliveries, 0);
  const critical = reports.some((r) => r.severity === "critical");

  // 10× over threshold (or worse) saturates the signal.
  const signal = worst > P95_THRESHOLD_MS ? clamp(Math.log10(worst / P95_THRESHOLD_MS) + (critical ? 0.2 : 0)) : 0;
  const recurrence = clamp((deliveries - 1) / 4);
  // Latency without errors points at slow code; heavy errors suggest an outage the agent can't fix in code.
  const errorImpact = errorRate == null ? 0.5 : clamp(1 - errorRate * 5);
  const code = /^\/api\//.test(endpoint) ? 0.85 : 0.4;

  const score = Math.round(100 * (0.4 * signal + 0.25 * recurrence + 0.15 * errorImpact + 0.2 * code));
  const verdict = score >= 70 ? "FIX" : score >= 40 ? "MONITOR" : "IGNORE";
  const ratio = worst / P95_THRESHOLD_MS;

  const parts = [
    worst ? `Worst p95 ${Math.round(worst).toLocaleString("en-US")} ms, ${ratio.toFixed(1)}× the ${P95_THRESHOLD_MS} ms threshold.` : "No latency value reported yet.",
    `${deliveries} Grafana ${deliveries === 1 ? "delivery" : "deliveries"} across ${reports.length} ${reports.length === 1 ? "report" : "reports"}.`,
    errorRate == null
      ? "Error rate unavailable from Prometheus."
      : errorRate > 0.05
        ? `Error rate ${(errorRate * 100).toFixed(1)}% suggests failures, not only slow code.`
        : "Errors are flat, so the cost is latency.",
  ];

  return {
    score,
    verdict,
    summary: parts.join(" "),
    factors: [
      { label: "Signal strength", value: signal, detail: "How far p95 is above the alert threshold" },
      { label: "Recurrence", value: recurrence, detail: "How often Grafana has re-reported it" },
      { label: "Error impact", value: errorImpact, detail: "Low errors point at slow code rather than an outage" },
      { label: "Code-attributable", value: code, detail: "Endpoint is an application API route" },
    ],
    model: "heuristic-v1",
    at: new Date().toISOString(),
  };
}
