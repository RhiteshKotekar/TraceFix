// Small client for the Prometheus HTTP API (instant queries only).
const BASE = () => {
  if (!process.env.PROMETHEUS_URL) throw new Error("PROMETHEUS_URL is not set");
  return process.env.PROMETHEUS_URL;
};

export async function promQuery(query: string, timeoutMs = 1000): Promise<number | null> {
  const res = await fetch(`${BASE()}/api/v1/query?query=${encodeURIComponent(query)}`, {
    signal: AbortSignal.timeout(timeoutMs),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Prometheus responded ${res.status}`);
  const body = await res.json();
  const v = body?.data?.result?.[0]?.value?.[1];
  const n = v == null ? null : Number(v);
  return n == null || Number.isNaN(n) ? null : n;
}

export type EndpointMetrics = { p50: number | null; p95: number | null; rps: number | null; errorRate: number | null };

// `or vector(0)` below: no 5xx series means zero errors, not unknown.
// Latency in ms, error rate as a 0–1 fraction, over the last `window` (e.g. "1m", "10m").
export async function endpointMetrics(route: string, window = "1m"): Promise<EndpointMetrics> {
  const sel = `route="${route.replace(/"/g, "")}"`;
  const q = (p: number) =>
    `histogram_quantile(${p}, sum by (le) (rate(http_request_duration_seconds_bucket{${sel}}[${window}])))`;
  const total = `sum(rate(http_request_duration_seconds_count{${sel}}[${window}]))`;
  const [p50, p95, rps, err] = await Promise.all([
    promQuery(q(0.5)),
    promQuery(q(0.95)),
    promQuery(total),
    promQuery(`(sum(rate(http_request_duration_seconds_count{${sel},status_code=~"5.."}[${window}])) or vector(0)) / ${total}`),
  ]);
  return { p50: p50 == null ? null : p50 * 1000, p95: p95 == null ? null : p95 * 1000, rps, errorRate: err };
}

export async function targetUp(job: string): Promise<boolean | null> {
  const up = await promQuery(`up{job="${job}"}`);
  return up == null ? null : up === 1;
}

// The slowest route right now (p95 over 1m), plus overall request and error rates for the job.
export async function slowestRoute(job: string) {
  const res = await fetch(
    `${BASE()}/api/v1/query?query=${encodeURIComponent(
      `topk(1, histogram_quantile(0.95, sum by (le, route) (rate(http_request_duration_seconds_bucket{job="${job}", route!~"unmatched|/metrics"}[1m]))))`,
    )}`,
    { signal: AbortSignal.timeout(1000), cache: "no-store" },
  );
  if (!res.ok) throw new Error(`Prometheus responded ${res.status}`);
  const top = (await res.json())?.data?.result?.[0];
  const total = `sum(rate(http_request_duration_seconds_count{job="${job}"}[1m]))`;
  const [rps, err] = await Promise.all([
    promQuery(total),
    promQuery(`(sum(rate(http_request_duration_seconds_count{job="${job}",status_code=~"5.."}[1m])) or vector(0)) / ${total}`),
  ]);
  const p95 = top ? Number(top.value?.[1]) : NaN;
  return { route: (top?.metric?.route as string) ?? null, p95Ms: Number.isFinite(p95) ? p95 * 1000 : null, rps, errorRate: err };
}
