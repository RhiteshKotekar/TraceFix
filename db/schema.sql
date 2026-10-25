-- TraceFix schema. Loaded automatically by the compose Postgres on first start;
-- re-apply by hand with: psql "$DATABASE_URL" -f db/schema.sql (idempotent).

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
