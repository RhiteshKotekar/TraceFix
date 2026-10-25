# Security and Trust Boundaries

TraceFix executes target repository code and applies AI-generated changes. Treat repo content and model output as untrusted.

## v1 prototype boundary (3-hour build)
**TraceFix only runs the single fixed, trusted demo repository named in `TARGET_REPO_URL`.** Target code runs as a local child process (not sandboxed). This is acceptable only because we own that repo. Running arbitrary user repositories requires a Docker/VM sandbox (P1) and must not be enabled before then.

## Mandatory safeguards (v1)
- An alert creates an incident; it never authorizes execution. Approval requires login.
- Webhook: bearer secret (constant-time compare), size limit, schema check, dedup.
- Repo URL, commands, ports, and editable paths come from server config (`.env`), never from webhook data or model output.
- Agent tools are read-only and confined to the workspace (resolve path, verify it starts with the workspace root).
- Agent edits are accepted only under `TARGET_EDITABLE_PATHS`; edits to tests, `package*.json`, lockfiles, CI, `.env*`, or the k6 script are rejected.
- The k6 script lives in TraceFix, so the agent cannot change the benchmark.
- Target process started with a minimal explicit env (`PORT`, DB vars) — no `OPENAI_API_KEY` / `GITHUB_TOKEN`.
- Wall-clock timeouts on `npm ci`, tests, target start, k6, and agent calls.
- GitHub token: fine-grained, target repo only, `contents:write` + `pull_requests:write`.
- Never auto-merge or deploy. PR only on `PASS`.
- Secrets never in prompts, logs, DB rows, reports, or browser responses.
- API errors return `{error:{code,message}}` — no stack traces or internal paths.

## Known v1 gaps (state these in the demo)
- No process sandbox for target code (trusted repo only).
- Single shared admin login, no per-user identities.
- No job lease recovery if the worker crashes mid-job.
- The target demo app is intentionally vulnerable (SQLi/BOLA demo routes from another project) — never expose it beyond localhost.
