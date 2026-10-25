# Workflows and States

## Incident status
`AWAITING_APPROVAL` → `APPROVED` | `REJECTED`

## Job status
`QUEUED` → `RUNNING` → `PR_CREATED` | `VERIFICATION_FAILED` | `INCONCLUSIVE` | `FAILED`

While `RUNNING`, `stage` is one of: `EVIDENCE`, `CHECKOUT`, `BASELINE`, `INVESTIGATING`, `PATCHING`, `VERIFYING`, `OPENING_PR`. `progress_message` holds a human-readable line.

## Alert intake
1. Check `Authorization: Bearer $GRAFANA_WEBHOOK_SECRET` (constant-time compare) and body size (≤ 256 KB).
2. Validate shape; ignore `status: resolved` alerts.
3. Normalize labels (`service`, `endpoint`); service must match `TARGET_SERVICE` from config, else ignore.
4. Insert with `ON CONFLICT (fingerprint, starts_at) DO NOTHING`.
5. Return 200 immediately. No execution.

## Approval
1. Logged-in user clicks approve/reject on the detail page.
2. In one transaction: `UPDATE incidents SET status='APPROVED' … WHERE id=$1 AND status='AWAITING_APPROVAL'`; if 0 rows → `409 INVALID_STATE`; else insert job.
3. Double-clicks are safe because of the conditional update.

## Worker job
1. Claim one `QUEUED` job atomically; set `RUNNING`.
2. **EVIDENCE**: Prometheus queries over `[startsAt − 10m, now]`; store JSON; nulls labelled unavailable.
3. **CHECKOUT**: SHA from `$TARGET_BASE_URL/api/version`; clone `TARGET_REPO_URL`, `git checkout <sha>`. No SHA → `FAILED`.
4. **BASELINE**: `npm ci`, `npm test`, start target, k6, stop. Tests failing or k6 errors → `INCONCLUSIVE` (no valid baseline).
5. **INVESTIGATING**: agent call with evidence + endpoint; structured output.
6. **PATCHING**: validate and write edits; empty or rejected edits → `FAILED` with reason.
7. **VERIFYING**: `npm test`, start candidate, identical k6, stop; `evaluateGates()`.
8. **OPENING_PR**: only if decision is `PASS`. Otherwise status = `VERIFICATION_FAILED` / `INCONCLUSIVE`, report still saved.
9. Always: kill target process, remove workspace.

## Failures
Every stage has a timeout. Any exception → `FAILED` with a sanitized message (no stack traces, tokens, or absolute paths). No automatic retries in v1; a user may re-approve by creating a new job (P1).
