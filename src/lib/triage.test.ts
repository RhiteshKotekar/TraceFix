import { test } from "node:test";
import assert from "node:assert/strict";
import { triage } from "./triage.ts";

const r = (valueMs: number | null, deliveries = 1, severity = "warning") => ({ valueMs, deliveries, severity });

test("a strong, repeated latency signal with no errors recommends a fix", () => {
  const t = triage({ reports: [r(1840, 5)], endpoint: "/api/products", errorRate: 0 });
  assert.equal(t.verdict, "FIX");
  assert.ok(t.score >= 70, `score ${t.score}`);
});

test("a single small blip is not actionable", () => {
  const t = triage({ reports: [r(210)], endpoint: "/metrics", errorRate: 0.5 });
  assert.equal(t.verdict, "IGNORE");
});

test("score is bounded and factors stay within 0–1", () => {
  const t = triage({ reports: [r(1e9, 1000, "critical")], endpoint: "/api/x", errorRate: null });
  assert.ok(t.score <= 100 && t.score >= 0);
  for (const f of t.factors) assert.ok(f.value >= 0 && f.value <= 1, f.label);
});

test("more deliveries never lower the score", () => {
  const one = triage({ reports: [r(900, 1)], endpoint: "/api/a", errorRate: 0 }).score;
  const many = triage({ reports: [r(900, 6)], endpoint: "/api/a", errorRate: 0 }).score;
  assert.ok(many >= one);
});
