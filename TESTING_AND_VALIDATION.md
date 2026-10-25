# Testing and Performance Validation

The agent's claim is not proof. The worker measures and decides.

## Metrics per run (baseline and candidate)
From k6 `--summary-export`: p50, p95 (`http_req_duration`), rps (`http_reqs.rate`), error rate (`http_req_failed.rate`), request count, duration. Plus `npm test` pass/fail and output tail, commit SHA, k6 script hash, timestamps.

## Fair comparison
Same machine, same DB/seed data, same k6 script (hash recorded), same VUs/duration, same target port and env, one warm-up request batch before each run. Baseline and candidate run back-to-back in the same job.

## Gates (in `worker/gates.ts`, pure function, unit-tested)
| gate | rule | failing outcome |
|---|---|---|
| baseline valid | baseline tests pass, k6 completed, requests ≥ `GATE_MIN_REQUESTS` | `INCONCLUSIVE` |
| candidate tests | `npm test` passes | `FAIL` |
| errors | candidate error rate ≤ baseline + 0.01 | `FAIL` |
| p95 | candidate p95 ≤ baseline p95 × (1 − `GATE_MIN_P95_IMPROVEMENT`) | `FAIL` |
| throughput | candidate rps ≥ baseline rps × 0.9 | `FAIL` |
| sample | candidate requests ≥ `GATE_MIN_REQUESTS` | `INCONCLUSIVE` |

Decision: any `INCONCLUSIVE` → `INCONCLUSIVE`; else any `FAIL` → `FAIL`; else `PASS`. Defaults: `GATE_MIN_P95_IMPROVEMENT=0.2`, `GATE_MIN_REQUESTS=200`. Tune after the first real baseline; never hardcode expected results.

## Required unit tests (`node --test`)
- `evaluateGates`: PASS, each FAIL gate, INCONCLUSIVE on bad baseline / low sample.
- Edit path validation: rejects `../`, absolute paths, tests, `package.json`, paths outside allowlist.
- Webhook normalization + dedup (sending the fixture twice yields 1 incident) — manual check is acceptable in 3h.

## Demo failure path
Show at least one non-PASS outcome (e.g., set `GATE_MIN_P95_IMPROVEMENT=0.99`) to prove no PR is created.

## N+1 demo
`GET /api/products` runs 1 + N queries (reviews per product). Expected fix: a single join/aggregate or `WHERE product_id = ANY($1)`. Measure; don't assume.
