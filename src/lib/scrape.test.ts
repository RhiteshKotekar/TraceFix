import { test } from "node:test";
import assert from "node:assert/strict";
import { diff, parseMetrics, quantile } from "./scrape.ts";

const exposition = (n: number, slow: number) => `
# HELP http_request_duration_seconds HTTP request duration in seconds
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.1",method="GET",route="/api/products",status_code="200"} ${n - slow}
http_request_duration_seconds_bucket{le="1",method="GET",route="/api/products",status_code="200"} ${n}
http_request_duration_seconds_bucket{le="+Inf",method="GET",route="/api/products",status_code="200"} ${n}
http_request_duration_seconds_count{method="GET",route="/api/products",status_code="200"} ${n}
http_request_duration_seconds_count{method="GET",route="/metrics",status_code="200"} ${n}
process_resident_memory_bytes 104857600
process_cpu_seconds_total ${n / 100}
`;

test("parses names, labels and +Inf", () => {
  const s = parseMetrics(exposition(10, 0));
  const inf = s.find((x) => x.labels.le === "+Inf");
  assert.equal(inf?.labels.route, "/api/products");
  assert.equal(inf?.value, 10);
  assert.equal(s.find((x) => x.name === "process_resident_memory_bytes")?.value, 104857600);
});

test("quantile interpolates inside the bucket that holds the rank", () => {
  // 50 fast (<0.1s), 50 between 0.1s and 1s: p95 rank 95 → 0.1 + 0.9 * (45/50)
  const q = quantile(0.95, [
    { le: 0.1, count: 50 },
    { le: 1, count: 100 },
    { le: Infinity, count: 100 },
  ]);
  assert.ok(Math.abs(q! - 0.91) < 1e-9, String(q));
  assert.equal(quantile(0.95, []), null);
});

test("rates and p95 come from the difference between two scrapes", () => {
  const older = { t: 0, samples: parseMetrics(exposition(100, 0)) };
  const newer = { t: 10_000, samples: parseMetrics(exposition(200, 50)) }; // +100 requests, 50 of them slow
  const m = diff("u", older, newer);
  assert.equal(m.windowS, 10);
  assert.equal(m.routes.length, 1, "/metrics is excluded");
  assert.equal(m.routes[0].rps, 10);
  assert.ok(m.routes[0].p95Ms! > 100, `p95 ${m.routes[0].p95Ms}`);
  assert.equal(m.memoryMb, 100);
});

test("a single scrape has no rates yet", () => {
  const m = diff("u", undefined, { t: 0, samples: parseMetrics(exposition(5, 0)) });
  assert.equal(m.windowS, null);
  assert.deepEqual(m.routes, []);
});
