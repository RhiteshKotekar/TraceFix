# Build Plan (3 hours)

Build one end-to-end vertical slice. Order is by risk: get the unknowns (target app, PR) proven early. If a phase overruns by more than 10 minutes, take its listed cut and move on.

## Phase 0 — Setup (0:00–0:20)
- [ ] `npm install`; read `node_modules/next/dist/docs/` for Route Handlers and `proxy.ts` (Next 16 renamed middleware).
- [ ] `infra/docker-compose.yml`: postgres (`:5433`, DBs `tracefix` + `shop`), prometheus (`:9090`), grafana (`:3001`).
- [ ] `infra/prometheus/prometheus.yml` scraping the target on `host.docker.internal:5002`.
- [ ] `db/schema.sql` (see `DATA_MODEL.md`); `.env` from `.env.example`.
- [ ] `npm run worker` script → `node --env-file=.env worker/index.ts` (Node 24 runs TS natively).

**Done when:** `npm run dev`, the worker, and Compose services all start.

## Phase 1 — Target repo prep (0:20–0:45)
Do this in the **separate target repo** (moved out of `Temp/Demo-App`).
- [ ] Create GitHub repo, push `backend/` (frontend optional), delete `Temp/` from this repo.
- [ ] Add `prom-client`: `http_request_duration_seconds` histogram labelled `method, route, status`; `GET /metrics`.
- [ ] `GET /api/version` → `{ "sha": "<git rev-parse HEAD at startup>" }`.
- [ ] Seed ~300 products + reviews table so N+1 is measurable.
- [ ] Plant N+1 in `GET /api/products` (per-product reviews query); keep `npm test` passing.
- [ ] `loadtest/products.js` k6 script (fixed VUs, duration, `GET /api/products`). Lives in **TraceFix**, not the target, so the agent cannot change it.

**Done when:** k6 against the target shows clearly elevated p95 in Prometheus.

## Phase 2 — Alert intake + UI (0:45–1:15)
- [ ] `POST /api/webhooks/grafana`: bearer-secret check, size limit, normalize, dedupe on `(fingerprint, startsAt)`, insert incident.
- [ ] `scripts/send-sample-alert.sh` posting a captured Grafana payload.
- [ ] `/` incident list, `/incidents/[id]` detail with evidence + job status (polling every 2s).
- [ ] Basic-auth gate on UI + approve/reject (`ADMIN_USER`/`ADMIN_PASSWORD`); webhook route excluded.
- [ ] Approve → insert approval fields + job in one transaction; reject → status only.

**Cut:** skip Grafana alert provisioning, demo with the sample-alert script.
**Done when:** sample alert shows in UI; duplicate post doesn't create a second incident; approve creates exactly one job.

## Phase 3 — Worker skeleton + evidence (1:15–1:35)
- [ ] Poll loop: claim with `UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED LIMIT 1) RETURNING *`.
- [ ] Stage + progress message written at each step; any throw → `FAILED` with sanitized message.
- [ ] Evidence: Prometheus p50/p95/rate/error-rate for the endpoint over the alert window; `null` = "unavailable".
- [ ] Resolve SHA from target `/api/version`; fail job if unavailable.

## Phase 4 — Baseline (1:35–1:55)
- [ ] Clone target into `.workspaces/<jobId>` at the SHA; `npm ci`; `npm test`.
- [ ] Start target on `TARGET_RUN_PORT` with timeout; wait for `/api/health`.
- [ ] `docker run --rm --network host -v ./loadtest:/s grafana/k6 run --summary-export=/s/out.json …`; parse p50/p95/rps/error rate; stop target.

## Phase 5 — Agent + patch (1:55–2:20)
- [ ] `@openai/agents` agent, tools: `list_files`, `read_file` (both confined to workspace).
- [ ] Input: evidence JSON, endpoint, route file hint. Output (zod): `hypothesis, evidence[], edits[{path, content}], risks[]`.
- [ ] Worker rejects edits outside `TARGET_EDITABLE_PATHS`, `..`, or to tests/package files; writes files; `git diff` saved.

**Cut:** if structured output fights you, ask for JSON in a plain `responses.create` call and zod-parse it.

## Phase 6 — Verify + gates (2:20–2:35)
- [ ] Re-run `npm test` + identical k6 against candidate.
- [ ] `evaluateGates(baseline, candidate)` pure function + unit test (see `TESTING_AND_VALIDATION.md`).

## Phase 7 — PR + report (2:35–2:50)
- [ ] On `PASS`: branch `tracefix/<jobId>`, commit, push (token over HTTPS), `POST /repos/{owner}/{repo}/pulls` with markdown report.
- [ ] Report (also stored on job, shown in UI): evidence, hypothesis, diff, before/after table, gate results, limitations.

## Phase 8 — Rehearse (2:50–3:00)
- [ ] Full run twice; reset target repo state between runs (close PR, delete branch).
- [ ] Record a backup screen capture of a successful run.

## Definition of done
Alert → incident → human approval → worker measures deployed commit → agent patch → same workload re-measured → gates evaluated in code → PR only on PASS. No auto-merge, no deploy, no fabricated numbers.
