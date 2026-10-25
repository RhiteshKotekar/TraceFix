// Shared types and constants. No server-only imports here: client components import this file.

export type IncidentStatus = "AWAITING_APPROVAL" | "APPROVED" | "REJECTED";
export type JobStatus =
  | "QUEUED"
  | "RUNNING"
  | "PR_CREATED"
  | "VERIFICATION_FAILED"
  | "INCONCLUSIVE"
  | "FAILED";
export type Stage =
  | "CLONE"
  | "INSTALL"
  | "START"
  | "REPRODUCE"
  | "INVESTIGATING"
  | "PATCHING"
  | "VERIFYING"
  | "OPENING_PR";

export const STAGES: { id: Stage; label: string }[] = [
  { id: "CLONE", label: "Clone" },
  { id: "INSTALL", label: "Install" },
  { id: "START", label: "Start app" },
  { id: "REPRODUCE", label: "Reproduce" },
  { id: "INVESTIGATING", label: "Investigate" },
  { id: "PATCHING", label: "Patch" },
  { id: "VERIFYING", label: "Verify" },
  { id: "OPENING_PR", label: "Open PR" },
];

// What the repair agent returned, after schema validation. Facts and hypotheses are kept apart.
export type AgentOutput = {
  diagnosis: string;
  observedFacts: string[];
  hypotheses: string[];
  evidenceRefs: string[];
  uncertainty: { level: "low" | "medium" | "high"; reason: string };
  risks: string[];
  editedPaths: string[];
  // Back-compat with the first UI version.
  hypothesis?: string;
  evidence?: string[];
};

export type ModelMeta = {
  provider: "openai";
  model: string;
  responseIds: string[];
  inputTokens: number;
  outputTokens: number;
  toolCalls: number;
  durationMs: number;
};

// AI triage runs once per incident before any decision; it never executes code.
export type Triage = {
  score: number; // 0–100: how strongly a code fix is warranted
  verdict: "FIX" | "MONITOR" | "IGNORE";
  summary: string;
  factors: { label: string; value: number; detail: string }[]; // value 0–1
  model: string;
  at: string;
};

export type RunStep = {
  stage: Stage;
  status: "done" | "running" | "failed" | "pending";
  command: string | null;
  output: string | null;
  durationS: number | null;
};

export type Reproduction = {
  reproduced: boolean | null; // null = still measuring
  detail: string;
};

// Latency in ms, errorRate as a 0–1 fraction. null = metric unavailable.
export type Metrics = {
  p50: number | null;
  p95: number | null;
  rps: number | null;
  errorRate: number | null;
};

export type RunResult = {
  tests: { passed: boolean; outputTail: string };
  k6: Metrics & { requests: number; durationS: number };
};

export type Gate = { name: string; passed: boolean; detail: string };

export type Job = {
  id: string;
  status: JobStatus;
  stage: Stage | null;
  progressMessage: string | null;
  commitSha: string | null;
  evidence: Metrics | null;
  baseline: RunResult | null;
  candidate: RunResult | null;
  agentOutput: AgentOutput | null;
  diff: string | null;
  decision: "PASS" | "FAIL" | "INCONCLUSIVE" | null;
  gateResults: Gate[] | null;
  prUrl: string | null;
  prRepo: string | null;
  prNumber: number | null;
  prBranch: string | null;
  prState: "open" | "closed" | "merged" | null;
  prReview: "approved" | "changes_requested" | "commented" | null;
  prUpdatedAt: string | null;
  modelMeta: ModelMeta | null;
  attempts: number;
  error: string | null;
  runLog: RunStep[];
  reproduction: Reproduction | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  updatedAt: string;
};

// One Grafana alert instance firing (Grafana re-sends it while it keeps firing: `deliveries`).
// Evidence only: reports never get their own triage, job or PR.
export type Report = {
  id: string;
  fingerprint: string;
  startsAt: string;
  receivedAt: string;
  lastReceivedAt: string;
  deliveries: number;
  status: "firing" | "resolved";
  severity: "warning" | "critical";
  summary: string;
  valueMs: number | null; // p95 at the moment the alert fired
};

// The unit of work: every report of the same problem. Triage, approval, the fix pipeline and the PR happen once here.
export type Incident = {
  id: string;
  key: string;
  alertName: string;
  service: string;
  endpoint: string;
  status: IncidentStatus;
  resolvedAt: string | null; // every report resolved in Grafana; independent of the repair
  decidedBy: string | null;
  decisionReason: string | null;
  decidedAt: string | null;
  triage: Triage | null; // null = AI triage still running
  job: Job | null;
  reports: Report[]; // newest first
  firstSeen: string;
  lastSeen: string;
  critical: boolean;
};

// Webhook grouping rule: same alert + service + endpoint is the same incident.
// Severity and startsAt are left out on purpose: re-fires and escalations belong to the same incident.
export const incidentKey = (i: Pick<Incident, "alertName" | "service" | "endpoint">) =>
  `${i.alertName}|${i.service}|${i.endpoint}`;

// The monitored service and how to run it. Stored server-side (table `project`); secrets stay in .env.
export type Project = {
  repoUrl: string;
  branch: string;
  subdir: string;
  ghOwnerType: "user" | "org";
  ghOrg: string;
  ghAppId: string;
  ghAppSlug: string;
  ghInstallationId: string;
  installCommand: string;
  testCommand: string;
  startCommand: string;
  port: string;
  healthPath: string;
  versionPath: string;
  service: string; // must equal the Prometheus job name and the Grafana `service` label
  endpoint: string;
  baseUrl: string;
  metricsPath: string;
  p95ThresholdMs: string;
  editablePaths: string; // comma-separated path prefixes the agent may edit, relative to the app subdirectory
  completedAt: string | null;
};

// Form starting values: only conventions, nothing that names a specific service.
export const EMPTY_PROJECT: Project = {
  repoUrl: "",
  branch: "main",
  subdir: "",
  ghOwnerType: "user",
  ghOrg: "",
  ghAppId: "",
  ghAppSlug: "",
  ghInstallationId: "",
  installCommand: "npm ci",
  testCommand: "npm test",
  startCommand: "npm start",
  port: "",
  healthPath: "/api/health",
  versionPath: "/api/version",
  service: "",
  endpoint: "",
  baseUrl: "",
  metricsPath: "/metrics",
  p95ThresholdMs: "200",
  editablePaths: "",
  completedAt: null,
};

export type ProjectState = { project: Project | null; ghKeyConfigured: boolean };
