CREATE TABLE IF NOT EXISTS incidents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fingerprint text NOT NULL,
  starts_at timestamptz NOT NULL,
  alert_name text, service text, endpoint text, severity text, summary text,
  raw_alert jsonb NOT NULL,
  status text NOT NULL DEFAULT 'AWAITING_APPROVAL'
    CHECK (status IN ('AWAITING_APPROVAL','APPROVED','REJECTED')),
  decided_by text, decision_reason text, decided_at timestamptz,
  received_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (fingerprint, starts_at)
);
CREATE INDEX IF NOT EXISTS incidents_status_idx ON incidents (status, received_at);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  incident_id uuid NOT NULL REFERENCES incidents(id),
  status text NOT NULL DEFAULT 'QUEUED'
    CHECK (status IN ('QUEUED','RUNNING','PR_CREATED','VERIFICATION_FAILED','INCONCLUSIVE','FAILED')),
  stage text, progress_message text, commit_sha text,
  evidence jsonb, baseline jsonb, candidate jsonb, agent_output jsonb,
  diff text, decision text, gate_results jsonb, report_md text, pr_url text, error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz, finished_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS jobs_status_idx ON jobs (status, created_at);
CREATE UNIQUE INDEX IF NOT EXISTS jobs_one_active_per_incident
  ON jobs (incident_id) WHERE status IN ('QUEUED','RUNNING');
