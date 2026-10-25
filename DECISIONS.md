# Architecture Decisions

- **ADR-001 Monorepo for Waymark; target app separate.** Web, worker, infra, and k6 script live here. The target is its own GitHub repo so the PR lands somewhere real.
- **ADR-002 Next.js Route Handlers for HTTP.** No long work in handlers.
- **ADR-003 TypeScript worker, not Python.** In 3 hours, one language and one toolchain beat the original Python plan. Revisit only if a Python-only library becomes essential.
- **ADR-004 OpenAI Agents SDK (JS), no LangGraph.** A linear stage runner is enough.
- **ADR-005 Postgres polling with `SKIP LOCKED`.** One worker; no queue.
- **ADR-006 Prometheus + Grafana, with a sample-alert fallback.** The demo must not depend on alert timing.
- **ADR-007 k6 in Docker; script owned by Waymark.** Identical, agent-proof workload.
- **ADR-008 Full-file edits from the agent, not unified diffs.** More reliable to apply; the worker produces the diff with `git diff`.
- **ADR-009 Trusted demo repo only, no sandbox in v1.** Explicit, documented gap (see `SECURITY.md`).
- **ADR-010 PR only, never merge/deploy.**
