import { test } from "node:test";
import assert from "node:assert/strict";
import { evaluateGates, type Measured } from "./gates.ts";

const m = (p95: number, requests = 300, errorRate = 0, rps = 20, passed = true): Measured => ({
  tests: { passed },
  k6: { p50: p95 / 2, p95, rps, errorRate, requests, durationS: 20 },
});
const opts = { minP95Improvement: 0.2, minRequests: 100 };

test("big p95 drop with passing tests is PASS", () => assert.equal(evaluateGates(m(2000), m(200, 300, 0, 60), opts).decision, "PASS"));
test("too little improvement is FAIL", () => assert.equal(evaluateGates(m(1000), m(900), opts).decision, "FAIL"));
test("failing candidate tests is FAIL even if faster", () => assert.equal(evaluateGates(m(2000), m(100, 300, 0, 20, false), opts).decision, "FAIL"));
test("worse error rate is FAIL", () => assert.equal(evaluateGates(m(2000), m(100, 300, 0.2), opts).decision, "FAIL"));
test("too few requests is INCONCLUSIVE", () => assert.equal(evaluateGates(m(2000, 50), m(100, 50), opts).decision, "INCONCLUSIVE"));
test("noisy baseline (errors) is INCONCLUSIVE", () => assert.equal(evaluateGates(m(2000, 300, 0.2), m(100, 300, 0.2), opts).decision, "INCONCLUSIVE"));
test("missing candidate measurement is INCONCLUSIVE", () =>
  assert.equal(evaluateGates(m(2000), { tests: { passed: true }, k6: null }, opts).decision, "INCONCLUSIVE"));
