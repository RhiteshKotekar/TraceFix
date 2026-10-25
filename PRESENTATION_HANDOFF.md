# Waymark — Handoff for building the presentation

Paste this whole file into ChatGPT (or read it yourself) to build the slide deck. It is standalone: no other file is needed.

## One-line pitch
**Waymark turns a slow-endpoint alert into a verified pull request: an AI proposes the fix, but deterministic code proves it works before anything is opened for human review.**

## The problem
Performance work is fragmented. Someone notices latency in a dashboard, digs through metrics, finds the repo and the deployed commit, reproduces the issue, writes a fix, benchmarks it and writes it up. Each step happens in a different tool, and the evidence gets lost. AI coding tools can write a "fix", but nobody can trust one that hasn't been measured.

## What Waymark does (the flow)
1. **Detect:** the monitored app exposes metrics to Prometheus. A Grafana alert fires when p95 latency on an endpoint is too high and sends a webhook to Waymark.
2. **Record:** Waymark validates and deduplicates the alert and stores it as an *incident* awaiting approval.
3. **Approve:** a human reviews the evidence on the incident page and clicks Approve or Reject. Nothing runs before approval.
4. **Investigate:** a background worker pulls latency, request-rate and error-rate evidence from Prometheus. It reads the deployed commit from the app's `/api/version` and checks out exactly that commit. It never silently uses the latest `main`.
5. **Baseline:** it runs the repo's tests and a fixed k6 load test against the *unchanged* code.
6. **Fix:** an OpenAI agent with read-only file tools inspects the code and returns a structured patch (hypothesis, evidence, edits, risks). The worker only accepts edits to allowlisted paths.
7. **Verify:** it runs the same tests and the **identical** k6 workload against the patched code.
8. **Decide:** a pure function, not the model, compares before and after and returns `PASS`, `FAIL` or `INCONCLUSIVE`.
9. **Deliver:** only on `PASS` does it open a GitHub pull request, with a report (evidence, hypothesis, diff, before/after table, gate results, limitations). It **never auto-merges or deploys**.

## Demo scenario
- Target app: a small e-commerce backend (Express + PostgreSQL) in its own repo, `waymark-target-shop`.
- Planted bug: an **N+1 query** on `GET /api/products` (one extra query per product for its reviews).
- Under load, p95 latency spikes, the alert fires, and Waymark runs the flow above. The agent should fix it by batching the queries (a join or a single `WHERE product_id = ANY(...)`). The PR shows p95 dropping.
- If the Grafana alert is flaky on stage, a script posts a sample alert instead. The rest of the flow is identical.

## Key ideas to emphasise (what makes it different)
- **Human in the loop:** an alert is not permission to run code. A person approves first.
- **The model doesn't grade its own homework:** pass/fail is decided in code from measured numbers.
- **Same workload, same conditions:** the baseline and the candidate use the identical k6 script, which lives in Waymark so the agent cannot edit it.
- **Pinned to the deployed commit:** the fix is built against what is actually running.
- **Honest failure modes:** noisy or invalid comparisons are labelled `INCONCLUSIVE`, missing metrics are shown as missing, and results are never fabricated.
- **Bounded agent:** read-only tools, a path allowlist, no changes to tests or package files.

## Pass/fail gates (for a "how we verify" slide)
- Tests pass on the candidate.
- Enough requests were measured (≥ 200 by default).
- Error rate does not get worse.
- p95 improves by at least 20% (the threshold is configurable and will be tuned after the first baseline run).
- If any measurement is invalid: `INCONCLUSIVE`, no PR.

## Architecture (for a diagram slide)
```
Target app /metrics -> Prometheus -> Grafana alert
        -> (webhook, bearer secret) Next.js API -> PostgreSQL: incident (awaiting approval)
        -> human approves in the UI -> PostgreSQL: job (queued)
        -> TypeScript worker claims job
             evidence -> checkout deployed commit -> baseline (tests + k6)
             -> OpenAI agent patch -> candidate (tests + k6)
             -> gates in code -> PR on PASS (GitHub API) -> report
```
Components: Next.js 16 (UI + API routes), a standalone TypeScript worker, PostgreSQL (incidents and jobs), Prometheus, Grafana, k6 (Docker image), OpenAI Agents SDK, GitHub REST API.

## Tech stack (one slide)
Next.js 16 / React 19 / Tailwind 4 · Node 24 + TypeScript worker · PostgreSQL 16 · Prometheus + Grafana · k6 · `@openai/agents` + zod · GitHub REST API · Docker Compose.

## Safety and trust (one slide)
- Webhook is authenticated with a bearer secret and has a size limit.
- UI approval is behind a login.
- The demo runs one fixed, trusted target repo, so there is no sandbox for arbitrary code. This is a stated limitation, and a Docker sandbox is future work.
- Agent output is untrusted: paths are validated, edits are confined to allowlisted directories, and secrets never enter prompts, logs or reports.
- The GitHub token is scoped to the target repo only.

## Status — be honest on the slides
This was a 3-hour hackathon build. At the time of writing, the **design and docs are done, the demo target app exists, and the Waymark pipeline itself is still being built**. Update this section before presenting. Suggested wording for the final deck: list what is working live and what is shown as a recorded run.

Planned build order: setup → target app instrumentation and planted bug → alert intake and UI → worker and evidence → baseline → agent patch → verify and gates → PR → rehearsal.

## Explicitly out of scope (for a "future work" slide)
Docker sandbox for untrusted repos, multi-service and multi-repo support, job leases and crash recovery, multiple workers, email notifications, other monitoring providers, other languages, multi-tenancy and RBAC.

## Suggested slide outline (about 8 slides)
1. Title and pitch
2. The problem
3. How Waymark works (the 9-step flow as a diagram)
4. Live demo or recorded demo (N+1 on `/api/products`)
5. Why you can trust the fix (gates, human approval, same workload)
6. Architecture and stack
7. Safety, limitations and what's next
8. Results (before/after p95 chart, PR screenshot) and ask or closing

## Visuals to capture for the deck
- Grafana panel showing the p95 spike
- Waymark incident page with the Approve button
- Job progress through the stages (`EVIDENCE` → `CHECKOUT` → `BASELINE` → `INVESTIGATING` → `PATCHING` → `VERIFYING` → `OPENING_PR`)
- Before/after table from the report
- The opened GitHub PR
