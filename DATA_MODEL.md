# Data Model

Two tables. Service/repo configuration lives in `.env` (one target in v1). Evidence, run results, and the report are JSONB/text on the job.

## `incidents`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | `gen_random_uuid()` |
| `fingerprint` | text | Grafana alert fingerprint |
| `starts_at` | timestamptz | from alert |
| `alert_name`, `service`, `endpoint`, `severity`, `summary` | text | normalized labels/annotations |
| `raw_alert` | jsonb | the single alert object (no headers) |
| `status` | text | `AWAITING_APPROVAL` / `APPROVED` / `REJECTED` |
| `decided_by`, `decision_reason` | text | from approve/reject |
| `decided_at`, `received_at` | timestamptz | |

`UNIQUE (fingerprint, starts_at)` — dedup key. Index on `(status, received_at)`.

## `jobs`
| column | type | notes |
|---|---|---|
| `id` | uuid pk | |
| `incident_id` | uuid fk | |
| `status` | text | see `WORKFLOWS.md` |
| `stage`, `progress_message` | text | |
| `commit_sha` | text | deployed commit actually tested |
| `evidence` | jsonb | Prometheus snapshot |
| `baseline`, `candidate` | jsonb | `{tests:{passed,output_tail}, k6:{p50,p95,rps,error_rate,requests,duration_s}}` |
| `agent_output` | jsonb | hypothesis, evidence, risks, edited paths |
| `diff` | text | `git diff` of candidate |
| `decision` | text | `PASS` / `FAIL` / `INCONCLUSIVE` |
| `gate_results` | jsonb | per-gate pass/fail + values |
| `report_md` | text | same text as PR body |
| `pr_url` | text | |
| `error` | text | sanitized |
| `created_at`, `started_at`, `finished_at`, `updated_at` | timestamptz | |

Index on `(status, created_at)`. Partial unique index `ON jobs(incident_id) WHERE status IN ('QUEUED','RUNNING')` prevents two active jobs per incident.

All times UTC. Never store credentials or env dumps.
