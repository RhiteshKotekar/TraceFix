# Technology Stack

| Area | Choice | Notes |
|---|---|---|
| UI + HTTP | Next.js 16.4, React 19, TypeScript, Tailwind 4 | Already scaffolded at repo root; `cacheComponents` on |
| Auth | Basic auth in `src/proxy.ts` | Single admin from env |
| DB | PostgreSQL 16 (Compose, port 5433) + `pg` | Raw SQL, `db/schema.sql`; no ORM |
| Worker | Node 24 + TypeScript (native type stripping) | `node --env-file=.env worker/index.ts` |
| Agent | `@openai/agents` (JS) + `zod` | Model from `OPENAI_MODEL` |
| Metrics | Prometheus (Compose, :9090) | Target exposes `/metrics` via `prom-client` |
| Alerts | Grafana (Compose, :3001) | Provisioned alert rule + webhook contact point; sample-alert script fallback |
| Load test | k6 via `grafana/k6` Docker image | Not installed locally |
| Git | `git` CLI via `child_process.execFile` | Clone per job into `.workspaces/` |
| PR | GitHub REST API via `fetch` | `gh` not installed |

## New dependencies (Waymark)
`pg`, `@types/pg`, `@openai/agents`, `zod`. Nothing else.

## Not used
Python, FastAPI, LangGraph, Redis/Celery/Kafka, Kubernetes, Shadcn, ORMs, email.
