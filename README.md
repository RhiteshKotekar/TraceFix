# TraceFix

AI-assisted performance investigation with verified fixes.

A Grafana latency alert becomes an incident. A human approves it. A worker gathers evidence, checks out the deployed commit of the target app, measures a baseline, asks an OpenAI agent for a bounded patch, re-measures with the identical k6 workload, and opens a GitHub PR **only** if deterministic gates pass. Never auto-merges or deploys.

The monitored ("slow") app lives in its own repository — see `TARGET_REPO_URL` in `.env.example`.

## Quick start (everything on localhost)
TraceFix does not ship Prometheus or Grafana; it uses the ones you already run (by default the shop repo's
`docker compose`: Prometheus :9090, Grafana :3000).

```bash
cp .env.example .env            # set GRAFANA_WEBHOOK_SECRET (openssl rand -hex 24); check PROMETHEUS_URL / GRAFANA_URL
npm install
npm run db:up                   # TraceFix's Postgres on :5433 (schema auto-loaded)
npm run dev                     # TraceFix on :8100, then open /setup
```

### Connect your Grafana
1. **Contact point:** Alerting → Contact points → Webhook, URL `http://host.docker.internal:8100/api/webhooks/grafana`
   (Grafana in Docker) or `http://localhost:8100/api/webhooks/grafana`; Authorization header scheme `Bearer`,
   credentials = `GRAFANA_WEBHOOK_SECRET`.
2. **Alert rule labels:** an `endpoint` (or `route`) label, and `service` (falls back to `job`, then the project's
   service name). Alerts with the same alert name + service + endpoint are grouped into one incident.
3. **Notification policy:** route the rule to that contact point.
   Press **Test** on the contact point: TraceFix answers `202` and the Live feed shows "Contact point test received".
4. In `/setup`, set the service name to the **Prometheus job name** of the service (TraceFix queries `job="<service>"`).

TraceFix also reads the service's own metrics URL (project base URL + metrics path) directly, so `/live` shows per-route
traffic, p95, errors, memory, CPU and event-loop lag even when Prometheus is down.

`npm run sample-alert` posts a Grafana-shaped alert straight to the webhook to test without Grafana.
To wipe TraceFix data: `npm run db:down && docker volume rm tracefix_pgdata`.

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
