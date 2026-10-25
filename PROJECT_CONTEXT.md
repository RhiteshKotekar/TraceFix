# TraceFix Project Context

## Summary
TraceFix connects a performance alert to a verified fix: detect a slow endpoint, gather evidence, require human approval, let an AI agent propose a targeted patch, measure before/after under the same workload, and open a human-reviewable GitHub PR only when independent checks pass.

## Problem
Performance work is fragmented: someone notices latency in monitoring, digs through metrics, finds the repo and deployed commit, reproduces, fixes, benchmarks, and writes it up. TraceFix links those steps with traceable evidence.

## Hackathon constraint
**3 hours, one person/team, one demo.** Everything below is scoped to one target service, one endpoint, one seeded bug.

## Core demo
The target app (Express + PostgreSQL shop backend, own GitHub repo) has a planted **N+1 query** on `GET /api/products` (one query per product for its reviews). It exposes Prometheus metrics. Under k6 load, Grafana's p95 alert fires and posts a webhook to TraceFix. The incident shows evidence; a user approves. The worker checks out the deployed commit, runs tests + k6 baseline, asks the agent for a fix, applies it in a git worktree, runs tests + the same k6 workload, compares, and opens a PR only on `PASS`.

## Goals (P0 — must work for the demo)
- Grafana webhook → validated, deduplicated incident in PostgreSQL.
- Incident list + detail page; approve/reject behind a login.
- Worker (TypeScript, separate process) claims jobs from PostgreSQL.
- Evidence: p50/p95 latency, request rate, error rate from Prometheus; missing values labelled missing.
- Deployed commit read from the target's `/api/version`; never silently uses latest `main`.
- Baseline and candidate: `npm test` + identical k6 run.
- OpenAI agent with read-only file tools and structured output (full-file edits, path allowlist).
- Deterministic gates decide `PASS` / `FAIL` / `INCONCLUSIVE`; the model cannot.
- PR via GitHub API only on `PASS`, with a results report in the body.
- Errors and limitations shown clearly in the UI.

## Explicitly cut (do not build in 3h)
Docker sandbox for target code (we run only the fixed trusted demo repo — see `SECURITY.md`), multi-service/multi-repo registration UI, email, retries, Shadcn, job leases/restart recovery, multiple workers, LangGraph, Python, Redis/queues, multi-tenancy, RBAC.

## P1 if time remains
Job timeline UI, Grafana alert fully provisioned (vs. sample-alert script), lease + restart recovery, Docker-sandboxed target runs.

## Principles
- Evidence before edits.
- A webhook is not authorization to execute code.
- Target repo content and model output are untrusted; enforce limits in code.
- Same workload, same conditions; noisy or invalid comparisons are `INCONCLUSIVE`.
- The worker, not the LLM, decides whether gates pass.
- PRs are for human review; never auto-merge or deploy.
- Never fabricate results.

## Assumptions
- PostgreSQL (Docker Compose) is the source of truth for incidents and jobs.
- Grafana + Prometheus run locally via Compose; the worker reaches Prometheus at `PROMETHEUS_URL`.
- k6 runs via the `grafana/k6` Docker image (k6 is not installed locally).
- GitHub PR creation uses a fine-grained token scoped to the target repo only (`gh` CLI is not installed; use the REST API).

## Open questions
- Exact Grafana webhook payload for the installed version (capture one real delivery and save it as a fixture).
- Gate threshold: start at p95 improvement ≥ 20%; tune after the first baseline run.
