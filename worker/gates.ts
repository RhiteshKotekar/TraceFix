import type { Gate } from "../src/lib/model.ts";

export type K6 = { p50: number | null; p95: number | null; rps: number | null; errorRate: number | null; requests: number; durationS: number };
export type Measured = { tests: { passed: boolean }; k6: K6 | null };
export type Decision = "PASS" | "FAIL" | "INCONCLUSIVE";

const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const msf = (v: number | null) => (v == null ? "n/a" : `${Math.round(v)} ms`);

// The worker, not the model, decides. Invalid measurements are INCONCLUSIVE; real regressions are FAIL.
export function evaluateGates(
  baseline: Measured,
  candidate: Measured,
  opts: { minP95Improvement: number; minRequests: number },
): { decision: Decision; gates: Gate[] } {
  const gates: Gate[] = [];
  const b = baseline.k6;
  const c = candidate.k6;

  gates.push({ name: "Tests pass", passed: candidate.tests.passed, detail: candidate.tests.passed ? "Candidate tests passed" : "Candidate tests failed" });

  const enough = Boolean(b && c && b.requests >= opts.minRequests && c.requests >= opts.minRequests && b.p95 != null && c.p95 != null);
  gates.push({ name: "Enough requests", passed: enough, detail: `${b?.requests ?? 0} / ${c?.requests ?? 0} ≥ ${opts.minRequests}` });

  const baselineErr = b?.errorRate ?? 1;
  const baselineValid = baselineErr <= 0.05;
  gates.push({ name: "Baseline is valid", passed: baselineValid, detail: `Baseline error rate ${pct(baselineErr)} (≤ 5%)` });

  const errOk = c != null && (c.errorRate ?? 1) <= baselineErr + 0.01;
  gates.push({ name: "Error rate not worse", passed: errOk, detail: `${pct(baselineErr)} → ${pct(c?.errorRate ?? 1)}` });

  const rpsOk = b?.rps != null && c?.rps != null && c.rps >= b.rps * 0.9;
  gates.push({ name: "Throughput not worse", passed: rpsOk, detail: `${b?.rps?.toFixed(1) ?? "n/a"}/s → ${c?.rps?.toFixed(1) ?? "n/a"}/s` });

  const improvement = b?.p95 && c?.p95 != null ? 1 - c.p95 / b.p95 : null;
  const p95Ok = improvement != null && improvement >= opts.minP95Improvement;
  gates.push({
    name: `p95 improves ≥ ${Math.round(opts.minP95Improvement * 100)}%`,
    passed: p95Ok,
    detail: `${msf(b?.p95 ?? null)} → ${msf(c?.p95 ?? null)}${improvement == null ? "" : ` (${improvement >= 0 ? "−" : "+"}${pct(Math.abs(improvement))})`}`,
  });

  let decision: Decision;
  if (!enough || !baselineValid) decision = "INCONCLUSIVE";
  else if (gates.every((g) => g.passed)) decision = "PASS";
  else decision = "FAIL";
  return { decision, gates };
}
