# Claude brief: finish the TraceFix backend

## Mission

Build the real, end-to-end backend for this TraceFix project in the existing repository. Preserve the current Next.js dashboard and connect it to working services. The outcome must accept a Grafana alert, persist and investigate the incident, use the configured OpenAI API for a bounded repair proposal, validate that proposal, and open a real GitHub pull request only when deterministic checks pass.

This file is a product and architecture brief, not a sequence of coding steps. Inspect the current code and the project docs before changing anything. Treat `PROJECT_CONTEXT.md`, `ARCHITECTURE.md`, `WORKFLOWS.md`, `SECURITY.md`, `DATA_MODEL.md`, `API_CONTRACTS.md`, and `TESTING_AND_VALIDATION.md` as the detailed project context; reconcile contradictions with this brief and update stale docs when implementation changes. Follow `AGENTS.md`, including reading the installed Next.js 16 documentation before editing Next.js server code. Do not replace the dashboard or create a competing backend framework.

## Current project and implementation boundary

The project is a Next.js 16 / React 19 / TypeScript dashboard, PostgreSQL database, Prometheus and Grafana Compose stack, plus a planned separate TypeScript worker and k6-based target validation. Existing code includes Grafana alert ingestion, incident/report persistence, Prometheus queries, deterministic heuristic triage, settings, and project setup UI.

The backend is incomplete. There is no `worker/` implementation; approved jobs remain queued. The displayed sign-in currently only writes a browser `localStorage` value and is not authentication. GitHub App fields are configuration UI only, and the setup UI currently creates an app with its webhook disabled. OpenAI is listed in `.env.example`, but there is no repair agent yet. Do not describe any of these as connected until a real integration has been exercised.

Keep the monitored shop as a separate target repository. `Temp/Demo-App` is a local fixture, not the TraceFix backend and not automatically an authorized GitHub target. Target repository identity, editable paths, and validation commands must come from trusted server-side project configuration and be verified before a worker uses them.

## Intended system shape

- **Next.js application:** retain the existing pages and Route Handlers for short HTTP work, authentication, settings, integration status, incident decisions, and webhook intake.
- **PostgreSQL:** remain the source of truth for project settings, alerts/reports, incidents, approvals, queued jobs, stage progress, evidence, validation results, pull requests, and audit events. Use transactions and database constraints for idempotency.
- **Dedicated TypeScript worker:** implement the missing long-running workflow outside Route Handlers. Claim queued work safely from PostgreSQL, persist progress and failures, and recover or clearly mark interrupted jobs after restarts. Do not introduce Redis or another queue unless the existing design proves inadequate.
- **Monitoring:** preserve Grafana alert intake and enrich with bounded Prometheus queries. Grafana is not a log store. Record unavailable evidence as unavailable; never invent measurements.
- **GitHub App:** replace any personal-token assumption with GitHub App authentication and installation-scoped permissions. Use the existing project setup flow as the starting point, but finish and verify its server-side behavior.
- **OpenAI:** use the existing `OPENAI_API_KEY` configuration from server-side code only. Prefer the official OpenAI SDK and a structured response contract that the backend validates. Keep model choice configurable. Read current official OpenAI API documentation rather than relying on remembered SDK signatures.

## Incident and repair behavior

Grafana firing notifications should be authenticated, size-limited, validated, and stored promptly. Normalize alert name, fingerprint, service, endpoint, severity, timestamps, annotations, and the original bounded payload. Group repeat notifications into the existing incident identity and update delivery counts. A resolved notification updates the report/incident without erasing repair history. Duplicate webhook deliveries must not create duplicate incidents, jobs, or PRs.

Keep manual and automatic response modes distinct. Manual mode requires an authenticated human decision before repair work is queued. Automatic mode may queue work under the configured policy, but it never approves a merge or deploy. The existing heuristic triage must be labelled as deterministic triage unless a real model supplied the result.

For an approved repair job, collect actual Prometheus evidence, resolve the deployed commit from the configured target's version endpoint, and check out that exact SHA. Do not silently substitute the default branch. Capture a baseline using the repository's configured, allowlisted checks and the same fixed k6 workload later used for the candidate. Run the OpenAI agent with incident evidence and only the repository context it needs. Its validated output should include a factual diagnosis, evidence references, uncertainty, proposed file edits, and risks. Treat source files and model output as untrusted input.

The worker—not the model—applies policy and computes PASS, FAIL, or INCONCLUSIVE from test outcomes, measurement validity, error rate, p95 change, throughput, and sample size. Create a PR only after a PASS. Failed or inconclusive validation must leave a useful report and must never create a normal repair PR. Persist the baseline, candidate, patch/diff, test output, gate results, deployed SHA, model/provider metadata, PR URL, and sanitized error details. Never auto-merge, deploy, or claim production recovery from a PR event.

Use explicit persisted states for incident decisions, job stages, validation, and GitHub PR review lifecycle. Keep incident resolution separate from repair completion. Make approval and job creation atomic and idempotent. Avoid duplicate active work for an incident.

## OpenAI agent requirements

- Use the configured API key from a server-side environment variable (normally `OPENAI_API_KEY`); never put it in client bundles, browser storage, prompts, child-process environments, database records, logs, PRs, or returned API payloads. Do not write a real key into this file or any committed file.
- Keep model calls in the worker, with request timeouts, bounded input/output, usage/cost visibility, and actionable handling for missing credentials, rate limits, invalid output, and provider errors.
- Use a typed/schema-validated output. The model may propose edits; ordinary code enforces path policy, patch limits, validation commands, and PR gates.
- Restrict agent file tools to read-only access inside the checked-out workspace. Accept edits only to server-configured allowlisted source paths. Reject traversal, absolute paths, symlinks escaping the workspace, secret/config files, CI/workflow files, dependency manifests/lockfiles, tests, and the TraceFix-owned k6 workload unless the project explicitly changes policy.
- Never let the model or webhook select shell commands, URLs, repositories, branches outside policy, credentials, or execution permissions. Do not run arbitrary model-generated commands. The worker runs only configured install/test/start commands with limits and a minimal environment.
- Distinguish observed facts from hypotheses. Persist the actual model, response, evidence references, and validated patch metadata needed to audit the result. A missing/failed OpenAI integration must become an explicit recoverable job error, never fabricated analysis or success.

## GitHub App requirements

Complete the GitHub App lifecycle: create/install through the setup experience, validate the callback state, verify the installation and selected repository through GitHub's API, and associate only verified installation/repository IDs with the configured project. Do not trust an installation ID supplied by a browser. Keep the App private key and webhook secret server-side; generate short-lived installation access tokens when needed and avoid persisting them.

Use the minimum permissions needed for the workflow: repository **Contents: read/write**, **Pull requests: read/write**, and required **Metadata: read**. Enable the App webhook and subscribe to the PR and installation events actually handled by the backend, including `pull_request`, `pull_request_review`, `installation`, and `installation_repositories`. Verify `X-Hub-Signature-256` against the exact raw request body using constant-time comparison. Deduplicate deliveries and handle out-of-order events without allowing an older event to overwrite a merged state. Reflect opened, approved, changes requested, closed, and merged states accurately; an open PR is not an approval.

Create a dedicated branch and commit through GitHub's API or a tightly controlled Git client using the App installation token. The branch must identify its TraceFix job. Open a PR against the configured base branch with the evidence, actual validation results, diff summary, and limitations. Store and display the real repository, branch, PR number, URL, and status. Handle missing permissions, revoked installations, inaccessible repositories, rate limits, and webhook misconfiguration as visible integration/job errors.

GitHub cannot deliver webhooks to a private localhost URL. Document the HTTPS callback/tunnel required for local testing and distinguish tunnel testing from a deployed webhook URL. Keep the GitHub App permissions/events shown in the setup UI consistent with the implementation. Official references: [GitHub App authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/about-authentication-with-a-github-app), [installation authentication](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-as-a-github-app-installation), [GitHub App registration parameters](https://docs.github.com/en/apps/sharing-github-apps/registering-a-github-app-using-url-parameters), and [webhook events](https://docs.github.com/en/webhooks/webhook-events-and-payloads).

## Authentication, APIs, and operational safety

Replace the current client-only sign-in shortcut with real server-verified authentication for the dashboard and every decision, settings, repository, and test-PR endpoint. A small single-admin setup is acceptable for this demo; it must still use a secure server-side session, protected credentials, and secure cookie settings. The Grafana and GitHub webhook endpoints are public integrations but require their own signature/secret validation. Do not accept a browser-supplied username as proof of identity.

Keep the existing API conventions where practical: health/integration readiness, settings, project configuration, incident list/detail, approve/reject, job progress, Grafana webhook, GitHub setup/callback/webhook, repository verification, and a restricted PR test endpoint. Return consistent safe errors, never stack traces, private keys, OpenAI keys, installation tokens, or absolute local paths. Add request limits, timeouts, structured redacted logs, and audit events for decisions and integration changes. Validate all URLs and repository identifiers against server-side configuration to prevent SSRF and cross-repository writes.

Maintain the current Next.js + TypeScript + PostgreSQL + separate worker architecture and Compose monitoring stack. Add only necessary dependencies. Keep migrations/schema changes repeatable, document environment variables in `.env.example` with placeholders only, and keep local secrets in ignored `.env`. Never pass `OPENAI_API_KEY`, GitHub private keys, or webhook secrets to target code.

## Completion bar

The work is done only when the existing UI is backed by real persistence and real authentication; the stack and worker start from documented commands; Grafana alerts are deduplicated and visible; approval queues one durable job; the worker measures the configured deployed commit, obtains a real OpenAI proposal, applies code-policy checks, runs baseline and candidate validation, and opens a real GitHub App-authored PR only on PASS; and GitHub events update the actual PR state in the dashboard. Include automated tests for alert normalization/deduplication, auth and authorization, job idempotency/recovery, edit-path validation, gate decisions, webhook signatures/idempotency, and PR state transitions.

Run formatting/lint, type checks, unit/integration tests, and production build. Report exactly which external integrations were exercised with real credentials and which could not be exercised. Do not call a mocked GitHub response, fake PR URL, fixture model response, or successful build an end-to-end integration test. Continue implementation to a working result; if GitHub/OpenAI/monitoring credentials or accessible external services are not configured, complete all independently testable work and state the remaining live-integration blocker honestly.

## End-to-end test: prove that a real PR is raised

Use a dedicated private test repository with disposable data, install the TraceFix GitHub App on only that repository, configure a reachable HTTPS webhook URL, and provide valid server-side GitHub App, webhook, Grafana, and OpenAI credentials. Never use the production repository for the first live run. The test repository must expose the configured health/version/metrics endpoints and support the configured test and start commands.

Exercise the complete real path: deliver a valid Grafana firing alert; verify one persisted incident and no duplicate on replay; authenticate to the dashboard; approve it in manual mode; observe durable worker progress through evidence, exact-SHA checkout, baseline, OpenAI proposal, candidate tests and k6, and deterministic gate evaluation. On PASS, verify in GitHub itself (and by querying the GitHub API with the installation token) that a new `tracefix/<job>` branch has a commit, a real pull request exists in the intended repository, the PR head/base and diff match the saved job, the author is the GitHub App, and the saved PR number/URL point to that PR. Verify the dashboard shows the same current PR state. A local database row or printed URL alone is not proof that a PR was raised.

Also run a controlled negative case where a deterministic gate fails or is inconclusive; verify that the job stores the results and **no PR or pushed repair branch is created**. Replay webhook deliveries and repeat approval requests to prove they do not create duplicate jobs or PRs. Deliver real GitHub review/close events and verify the UI follows the actual PR lifecycle. Close the disposable PR and remove its test branch only after recording the run. Keep any test-only endpoint authenticated, disabled outside a test environment, and restricted to an explicit repository allowlist; it must not accept arbitrary repository names, file paths, or commands.

OpenAI's official [API documentation](https://platform.openai.com/docs/api-reference) and [API key safety guidance](https://help.openai.com/en/articles/5112595-best-practices-for-api-key-safety) are the source of truth for current SDK/API usage and key handling. The API key is a secret: use it only from TraceFix server/worker code.
