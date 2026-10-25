# Waymark

AI-assisted performance investigation with verified fixes.

A Grafana latency alert becomes an incident. A human approves it. A worker gathers evidence, checks out the deployed commit of the target app, measures a baseline, asks an OpenAI agent for a bounded patch, re-measures with the identical k6 workload, and opens a GitHub PR **only** if deterministic gates pass. Never auto-merges or deploys.

The monitored ("slow") app lives in its own repository — see `TARGET_REPO_URL` in `.env.example`.

## Quick start
```bash
cp .env.example .env            # fill in OPENAI_API_KEY, GITHUB_TOKEN, ADMIN_PASSWORD
npm install
docker compose -f infra/docker-compose.yml up -d   # postgres, prometheus, grafana
psql "$DATABASE_URL" -f db/schema.sql
npm run dev                     # web UI on :3000
npm run worker                  # worker loop (separate terminal)
./scripts/send-sample-alert.sh  # fallback if Grafana alert hasn't fired
```

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
