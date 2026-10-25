// Reads the service's own /metrics endpoint (Prometheus text format) directly, without Prometheus.
// Counters are cumulative, so rates and p95 come from the difference between two scrapes.

export type Sample = { name: string; labels: Record<string, string>; value: number };

const LINE = /^([a-zA-Z_:][a-zA-Z0-9_:]*)(?:\{(.*)\})?\s+(\S+)/;
const LABEL = /([a-zA-Z_][a-zA-Z0-9_]*)="((?:[^"\\]|\\.)*)"/g;

export function parseMetrics(text: string): Sample[] {
  const out: Sample[] = [];
  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const m = LINE.exec(line);
    if (!m) continue;
    const value = m[3] === "+Inf" ? Infinity : Number(m[3]);
    if (Number.isNaN(value)) continue;
    const labels: Record<string, string> = {};
    for (const l of (m[2] ?? "").matchAll(LABEL)) labels[l[1]] = l[2].replace(/\\(.)/g, "$1");
    out.push({ name: m[1], labels, value });
  }
  return out;
}

// p-quantile from cumulative histogram buckets (le → count), linear within a bucket, like histogram_quantile().
export function quantile(p: number, buckets: { le: number; count: number }[]): number | null {
  const sorted = [...buckets].sort((a, b) => a.le - b.le);
  const total = sorted[sorted.length - 1]?.count ?? 0;
  if (!total) return null;
  const rank = p * total;
  let prevLe = 0;
  let prevCount = 0;
  for (const b of sorted) {
    if (b.count >= rank) {
      if (b.le === Infinity) return prevLe; // above the highest finite bucket: best known bound
      const inBucket = b.count - prevCount;
      return inBucket ? prevLe + ((b.le - prevLe) * (rank - prevCount)) / inBucket : b.le;
    }
    prevLe = b.le;
    prevCount = b.count;
  }
  return null;
}

export type RouteStats = { route: string; rps: number; p95Ms: number | null; errorRate: number; requests: number };
export type DirectMetrics = {
  url: string;
  windowS: number | null; // null until two scrapes exist
  routes: RouteStats[]; // busiest first; excludes /metrics and unmatched
  memoryMb: number | null;
  heapUsedMb: number | null;
  cpuPercent: number | null;
  eventLoopLagMs: number | null;
};

type Snapshot = { t: number; samples: Sample[] };
const g = globalThis as { tracefixScrapes?: Map<string, Snapshot[]> };
const history: Map<string, Snapshot[]> = (g.tracefixScrapes ??= new Map());
const WINDOW_MS = 60_000;
const MIN_GAP_MS = 2_000;

const ignoredRoute = (r: string) => r === "/metrics" || r === "unmatched";

function one(samples: Sample[], name: string) {
  return samples.find((s) => s.name === name)?.value ?? null;
}

// Compare the newest scrape with the oldest one in the last minute.
export function diff(url: string, older: Snapshot | undefined, newer: Snapshot): DirectMetrics {
  const mb = (v: number | null) => (v == null ? null : Math.round((v / 1024 / 1024) * 10) / 10);
  const base: DirectMetrics = {
    url,
    windowS: null,
    routes: [],
    memoryMb: mb(one(newer.samples, "process_resident_memory_bytes")),
    heapUsedMb: mb(one(newer.samples, "nodejs_heap_size_used_bytes")),
    cpuPercent: null,
    eventLoopLagMs: (() => {
      const v = one(newer.samples, "nodejs_eventloop_lag_p99_seconds") ?? one(newer.samples, "nodejs_eventloop_lag_seconds");
      return v == null ? null : Math.round(v * 1000 * 10) / 10;
    })(),
  };
  if (!older || newer.t - older.t < MIN_GAP_MS) return base;
  const dt = (newer.t - older.t) / 1000;

  const cpuNew = one(newer.samples, "process_cpu_seconds_total");
  const cpuOld = one(older.samples, "process_cpu_seconds_total");
  const cpuPercent = cpuNew != null && cpuOld != null ? Math.max(0, ((cpuNew - cpuOld) / dt) * 100) : null;

  // Per (route, le) and per (route, status) deltas between the two scrapes.
  const key = (s: Sample) => JSON.stringify(s.labels);
  const before = new Map(older.samples.map((s) => [s.name + key(s), s.value]));
  const delta = (s: Sample) => Math.max(0, s.value - (before.get(s.name + key(s)) ?? 0));

  const routes = new Map<string, { buckets: Map<number, number>; requests: number; errors: number }>();
  const route = (r: string) => {
    if (!routes.has(r)) routes.set(r, { buckets: new Map(), requests: 0, errors: 0 });
    return routes.get(r)!;
  };
  for (const s of newer.samples) {
    const r = s.labels.route;
    if (!r || ignoredRoute(r)) continue;
    const status = s.labels.status_code ?? s.labels.status ?? "";
    if (s.name === "http_request_duration_seconds_bucket") {
      const le = s.labels.le === "+Inf" ? Infinity : Number(s.labels.le);
      const b = route(r).buckets;
      b.set(le, (b.get(le) ?? 0) + delta(s));
    } else if (s.name === "http_request_duration_seconds_count") {
      const d = delta(s);
      route(r).requests += d;
      if (status.startsWith("5")) route(r).errors += d;
    }
  }

  const stats: RouteStats[] = [...routes.entries()]
    .filter(([, v]) => v.requests > 0)
    .map(([r, v]) => {
      const p95 = quantile(0.95, [...v.buckets.entries()].map(([le, count]) => ({ le, count })));
      return {
        route: r,
        requests: v.requests,
        rps: Math.round((v.requests / dt) * 100) / 100,
        p95Ms: p95 == null ? null : Math.round(p95 * 1000),
        errorRate: v.errors / v.requests,
      };
    })
    .sort((a, b) => b.requests - a.requests);

  return { ...base, windowS: Math.round(dt), routes: stats, cpuPercent: cpuPercent == null ? null : Math.round(cpuPercent * 10) / 10 };
}

// Scrape now (at most every 2s per URL) and return stats over the last minute.
export async function scrapeService(url: string): Promise<DirectMetrics> {
  const list: Snapshot[] = history.get(url) ?? [];
  const last = list[list.length - 1];
  const now = Date.now();
  if (!last || now - last.t >= MIN_GAP_MS) {
    const res = await fetch(url, { signal: AbortSignal.timeout(1500), cache: "no-store" });
    if (!res.ok) throw new Error(`${url} responded ${res.status}`);
    list.push({ t: now, samples: parseMetrics(await res.text()) });
  }
  const fresh = list.filter((s) => now - s.t <= WINDOW_MS);
  history.set(url, fresh);
  return diff(url, fresh.length > 1 ? fresh[0] : undefined, fresh[fresh.length - 1]);
}
