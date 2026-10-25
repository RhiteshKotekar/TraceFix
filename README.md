# TraceFix

AI-assisted performance investigation with verified fixes.

A Grafana latency alert becomes an incident. A human approves it. A worker gathers evidence, checks out the deployed commit of the target app, measures a baseline, asks an OpenAI agent for a bounded patch, re-measures with the identical k6 workload, and opens a GitHub PR **only** if deterministic gates pass. Never auto-merges or deploys.

The monitored ("slow") app lives in its own repository — see `TARGET_REPO_URL` in `.env.example`.

## Quick start (everything on localhost)
```bash
cp .env.example .env            # set GRAFANA_WEBHOOK_SECRET (openssl rand -hex 24)
npm install
npm run stack:up                # Postgres :5433 (schema auto-loaded), Prometheus :9090, Grafana :3001 (admin/admin)
npm run dev                     # TraceFix on :8100

# in ../waymark-target-shop/backend (uses the "shop" DB on :5433 via its .env)
npm install && npm start        # shop on :5002, exposes /metrics and /api/version

npm run load                    # make a route slow; Grafana's alert fires after ~30s and posts to TraceFix
npm run sample-alert            # alternative: post a Grafana-shaped alert straight to the webhook
```
Check progress at `/setup` (step 4 shows a live checklist of the stack) and `/live`.

### How the data flows
```text
shop /metrics ──scrape 5s──> Prometheus ──query──> Grafana rule HighEndpointLatency
  (p95 per route > 200 ms for 30s; one alert instance per route)
      └─ contact point "tracefix" ──POST + Bearer secret──> /api/webhooks/grafana
           └─ report stored → grouped into the incident for (alert, service, endpoint)
              → triage scored → manual approval, or auto-start in automatic mode → job QUEUED
```
Grafana is provisioned from `infra/grafana/provisioning/` (datasource, rule, contact point, policy); edit the
files and `docker restart tracefix-grafana-1`. While an alert keeps firing Grafana re-sends it every 2 minutes.
To wipe local data: `npm run stack:down && docker volume rm tracefix_pgdata`.

Not built yet: the fix worker (clone, agent, verify, PR). Approved incidents wait in `QUEUED`.

## Docs (read in this order)
1. `PROJECT_CONTEXT.md` — what and why, scope cuts.
2. `BUILD_PLAN.md` — 3-hour plan + checklist.
3. `ARCHITECTURE.md` — components, layout, flow.
4. `WORKFLOWS.md` — statuses and stages.
5. `SECURITY.md` — trust boundaries.
6. `DATA_MODEL.md`, `API_CONTRACTS.md`, `TESTING_AND_VALIDATION.md`.
7. `TECH_STACK.md`, `DECISIONS.md`.
8. `AGENT_INSTRUCTIONS.md` — rules for AI coding assistants.

These documents describe intended behavior; check `BUILD_PLAN.md` checkboxes for what actually exists.
