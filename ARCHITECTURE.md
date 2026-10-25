# Architecture

## Components
- **Web** (Next.js 16 at repo root): UI pages + short Route Handlers (webhook, incidents, approve/reject, job status).
- **Worker** (`worker/`, TypeScript, separate long-running Node process): evidence, git, target runs, k6, agent, gates, PR.
- **PostgreSQL**: incidents and jobs (source of truth).
- **Prometheus**: scrapes the target's `/metrics`; queried by the worker for evidence.
- **Grafana**: p95 alert rule → webhook contact point.
- **k6** (Docker image): identical workload for baseline and candidate.
- **OpenAI Agents SDK (JS)**: bounded investigation with read-only file tools.
- **GitHub REST API**: open PR.

The target app is a separate repository, cloned per job.

## Flow
```text
Target app /metrics ──> Prometheus ──> Grafana alert
                                         │ webhook (Bearer secret)
                                         v
                   Next.js /api/webhooks/grafana ──> incidents (AWAITING_APPROVAL)
                                                        │ human approves (basic auth)
                                                        v
                                                     jobs (QUEUED)
                                                        │ worker claims (SKIP LOCKED)
                                                        v
   evidence (Prometheus) → resolve SHA (/api/version) → clone @ SHA
   → baseline: npm test + k6 → agent edits (allowlisted paths)
   → candidate: npm test + same k6 → evaluateGates() → PR if PASS → report
```

## Layout
```text
waymark/
├── src/app/
│   ├── page.tsx                         # incident list
│   ├── incidents/[id]/page.tsx          # detail, evidence, job, report
│   └── api/
│       ├── webhooks/grafana/route.ts
│       ├── incidents/route.ts
│       ├── incidents/[id]/route.ts
│       ├── incidents/[id]/approve/route.ts
│       ├── incidents/[id]/reject/route.ts
│       └── jobs/[id]/route.ts
├── src/lib/db.ts                        # pg Pool + queries used by the web app
├── src/proxy.ts                         # basic auth (not on webhook route)
├── worker/
│   ├── index.ts                         # poll loop + stage runner
│   ├── evidence.ts  target.ts  loadtest.ts  agent.ts  gates.ts  github.ts
│   └── gates.test.ts
├── loadtest/products.js                 # k6 workload (owned by Waymark, not the target)
├── db/schema.sql
├── infra/docker-compose.yml
├── infra/prometheus/prometheus.yml
├── infra/grafana/provisioning/{datasources,alerting}/
├── scripts/send-sample-alert.sh
└── .env.example
```

The worker is standalone (its own `pg` Pool) to avoid TS import plumbing between Next and Node's type stripping. Only `db/schema.sql` is shared.

## Why no Python / separate API / queue
One language saves the most time. Route Handlers cover HTTP. One worker polling Postgres with `FOR UPDATE SKIP LOCKED` is enough.

## Constraints
- Never run git, target code, k6, or the agent inside a Route Handler.
- Job status persists in Postgres so the UI survives restarts (job recovery after a worker crash is P1).
- Credentials never go into prompts, logs, reports, or the target process env (start the target with an explicit minimal env).
- Clean up `.workspaces/<jobId>` and stop the target process on every exit path.
