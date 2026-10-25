# Instructions for AI Coding Assistants

Read `PROJECT_CONTEXT.md`, `BUILD_PLAN.md`, `ARCHITECTURE.md`, and `SECURITY.md` first. Also obey `AGENTS.md` (Next 16 differs from training data — read `node_modules/next/dist/docs/` before writing Next code).

## Rules
1. Inspect the repo before editing; don't assume documented features exist. `BUILD_PLAN.md` checkboxes are the truth.
2. Work phase by phase from `BUILD_PLAN.md`; a working vertical slice beats completeness. Tick boxes as you finish them.
3. The target app lives in its own repo; don't add its source here.
4. Short HTTP in Route Handlers; long work in `worker/`.
5. Postgres only for state. No Python, Redis, queues, LangGraph, ORMs, or Shadcn without a demonstrated need.
6. Agent tools are read-only and path-confined; enforce limits in code, not prompts.
7. Only run the trusted repo in `TARGET_REPO_URL`. Never take repo URLs, commands, or paths from webhook data or model output.
8. Webhook ≠ authorization. Approval requires login.
9. Test the deployed SHA; never silently use latest `main`.
10. `evaluateGates()` decides; the model can't. No PR on FAIL/INCONCLUSIVE. Never merge/deploy.
11. Never invent results or claim unbuilt features work.
12. Unit-test gates and edit-path validation.
13. Never commit credentials. Update docs when behavior changes.
14. When done, report changed files, commands run, outcomes, limitations, next step.
