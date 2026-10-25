-- TraceFix schema. Loaded automatically by the compose Postgres on first start.
-- Idempotent: `npm run db:migrate` re-applies it (new columns use ADD COLUMN IF NOT EXISTS).

-- One incident per problem: every Grafana report with the same alert + service + endpoint lands here.
-- Triage, approval, the fix pipeline and the PR all happen once per incident.
CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  alert_name text NOT NULL,
  service text NOT NULL,
  endpoint text NOT NULL,
  status text NOT NULL DEFAULT 'AWAITING_APPROVAL'
    CHECK (status IN ('AWAITING_APPROVAL', 'APPROVED', 'REJECTED')),
  triage jsonb,
  decided_by text,
  decision_reason text,
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One row per Grafana alert instance firing. Evidence only.
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  fingerprint text NOT NULL,
  starts_at timestamptz NOT NULL,
  ends_at timestamptz,
  status text NOT NULL CHECK (status IN ('firing', 'resolved')),
  severity text NOT NULL DEFAULT 'warning',
  summary text,
  value_ms double precision,
  deliveries int NOT NULL DEFAULT 1,
  raw jsonb NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  last_received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, starts_at)
);
CREATE INDEX IF NOT EXISTS reports_incident_idx ON reports (incident_id, last_received_at DESC);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED', 'RUNNING', 'PR_CREATED', 'VERIFICATION_FAILED', 'INCONCLUSIVE', 'FAILED')),
  stage text,
  progress_message text,
  commit_sha text,
  evidence jsonb,
  baseline jsonb,
  candidate jsonb,
  agent_output jsonb,
  diff text,
  decision text,
  gate_results jsonb,
  pr_url text,
  error text,
  run_log jsonb NOT NULL DEFAULT '[]',
  reproduction jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status, created_at);
-- At most one active pipeline per incident.
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_per_incident
  ON jobs (incident_id) WHERE status IN ('QUEUED', 'RUNNING');

-- Everything the live feed shows (webhooks, decisions, triage). Prometheus samples are read live, not stored.
CREATE TABLE IF NOT EXISTS events (
  id bigserial PRIMARY KEY,
  at timestamptz NOT NULL DEFAULT now(),
  source text NOT NULL CHECK (source IN ('grafana', 'prometheus', 'tracefix')),
  level text NOT NULL CHECK (level IN ('info', 'warn', 'error')),
  message text NOT NULL,
  incident_id uuid REFERENCES incidents(id) ON DELETE SET NULL
);

-- Single-row settings.
CREATE TABLE IF NOT EXISTS settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  mode text NOT NULL DEFAULT 'manual' CHECK (mode IN ('manual', 'automatic')),
  auto_threshold int NOT NULL DEFAULT 70 CHECK (auto_threshold BETWEEN 0 AND 100),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO settings (id) VALUES (1) ON CONFLICT DO NOTHING;

-- The monitored project (single row). Secrets such as the GitHub App private key stay in .env.
CREATE TABLE IF NOT EXISTS project (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  config jsonb NOT NULL,
  completed_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------------------------
-- Additions for the worker, authentication and the GitHub App. Safe to re-run.
-- ---------------------------------------------------------------------------------------------

-- Incident resolution (all reports resolved in Grafana) is separate from repair completion.
ALTER TABLE incidents ADD COLUMN IF NOT EXISTS resolved_at timestamptz;

-- Worker lease: a RUNNING job whose lease expires was interrupted (worker crash or restart).
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS attempts int NOT NULL DEFAULT 0;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS worker_id text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS lease_until timestamptz;
-- Model/provider metadata for audit (model, response id, token usage). Never the API key.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS model_meta jsonb;
-- GitHub pull request lifecycle, updated from App webhooks.
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_repo text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_number int;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_branch text;
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_state text CHECK (pr_state IN ('open', 'closed', 'merged'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_review text CHECK (pr_review IN ('approved', 'changes_requested', 'commented'));
ALTER TABLE jobs ADD COLUMN IF NOT EXISTS pr_updated_at timestamptz;
CREATE UNIQUE INDEX IF NOT EXISTS jobs_pr_unique ON jobs (pr_repo, pr_number) WHERE pr_number IS NOT NULL;

-- Audit: who did it (user email, "automatic mode", "worker", "github").
ALTER TABLE events ADD COLUMN IF NOT EXISTS actor text;
ALTER TABLE events DROP CONSTRAINT IF EXISTS events_source_check;
ALTER TABLE events ADD CONSTRAINT events_source_check
  CHECK (source IN ('grafana', 'prometheus', 'tracefix', 'worker', 'github'));

-- Dashboard sessions. Only a SHA-256 of the cookie token is stored.
CREATE TABLE IF NOT EXISTS sessions (
  token_hash text PRIMARY KEY,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_expiry_idx ON sessions (expires_at);

-- GitHub App installations verified through GitHub's API (never trusted from the browser).
CREATE TABLE IF NOT EXISTS github_installations (
  installation_id bigint PRIMARY KEY,
  account text NOT NULL,
  repo_full_name text NOT NULL,
  repo_id bigint NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'deleted', 'repo_removed')),
  verified_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- One-time `state` values for the GitHub App install redirect.
CREATE TABLE IF NOT EXISTS github_setup_states (
  state_hash text PRIMARY KEY,
  email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

-- Webhook delivery ids, so a redelivered GitHub event is processed once.
CREATE TABLE IF NOT EXISTS github_deliveries (
  delivery_id text PRIMARY KEY,
  event text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now()
);

-- Worker liveness, shown in the dashboard.
CREATE TABLE IF NOT EXISTS worker_heartbeats (
  worker_id text PRIMARY KEY,
  seen_at timestamptz NOT NULL DEFAULT now(),
  current_job uuid
);
