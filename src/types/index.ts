export type IncidentStatus = 
  | 'AWAITING_APPROVAL' 
  | 'APPROVED' 
  | 'REJECTED' 
  | 'RESOLVED';

export type IncidentSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type JobStatus = 
  | 'QUEUED' 
  | 'RUNNING' 
  | 'PR_CREATED' 
  | 'VERIFICATION_FAILED' 
  | 'INCONCLUSIVE' 
  | 'FAILED';

export type JobStage = 
  | 'EVIDENCE' 
  | 'CHECKOUT' 
  | 'BASELINE' 
  | 'INVESTIGATING' 
  | 'PATCHING' 
  | 'VERIFYING' 
  | 'OPENING_PR';

export type GateDecision = 'PASS' | 'FAIL' | 'INCONCLUSIVE';

export interface GateResult {
  name: string;
  passed: boolean;
  baseline: string | number;
  candidate: string | number;
  threshold: string;
  notes?: string;
}

export interface MetricSnapshot {
  p50: number; // in ms
  p95: number; // in ms
  rps: number; // requests per sec
  errorRate: number; // percentage (0.0 to 1.0)
  requestsTotal?: number;
  durationSeconds?: number;
}

export interface TelemetryEvidence {
  p50Ms: number;
  p95Ms: number;
  requestRateRps: number;
  errorRatePercent: number;
  queryWindow: string;
  prometheusStatus: 'AVAILABLE' | 'PARTIAL' | 'UNAVAILABLE';
}

export interface IncidentJob {
  id: string;
  incidentId: string;
  status: JobStatus;
  stage: JobStage;
  progressMessage: string;
  commitSha: string;
  evidence: TelemetryEvidence;
  baseline?: MetricSnapshot;
  candidate?: MetricSnapshot;
  agentHypothesis?: string;
  agentRisks?: string[];
  diff?: string;
  decision?: GateDecision;
  gateResults?: GateResult[];
  reportMd?: string;
  prUrl?: string; // Demo placeholder or mock URL
  error?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Incident {
  id: string;
  fingerprint: string;
  startsAt: string;
  alertName: string;
  service: string;
  endpoint: string;
  severity: IncidentSeverity;
  summary: string;
  status: IncidentStatus;
  receivedAt: string;
  decidedBy?: string;
  decisionReason?: string;
  decidedAt?: string;
  // Workflow fields for UI presentation
  workflowStage: 'DETECTED' | 'INVESTIGATING' | 'NEEDS_REVIEW' | 'FIX_IN_PROGRESS' | 'PR_READY' | 'RESOLVED' | 'FAILED';
  provenance: 'TRACEFIX_GENERATED' | 'EXTERNAL_HUMAN';
  isDemo: boolean;
  latestJob?: IncidentJob;
  affectedFiles?: string[];
}

export interface DemoRepository {
  id: string;
  name: string;
  owner: string;
  defaultBranch: string;
  status: 'CONNECTED' | 'DEMO_READY' | 'DISCONNECTED';
  lastActivity: string;
  openIncidentsCount: number;
  openPrCount: number;
  repoUrl: string;
  isDemo: boolean;
}

export type OperatingMode = 'AUTOMATIC' | 'MANUAL';

export interface AiChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  timestamp: string;
  text: string;
  suggestedDiff?: string;
  status?: 'READY' | 'PENDING' | 'APPLIED';
}

export type FilterStatus = 
  | 'ALL' 
  | 'CRITICAL' 
  | 'INVESTIGATING' 
  | 'FIX_IN_PROGRESS' 
  | 'NEEDS_REVIEW' 
  | 'PR_READY' 
  | 'RESOLVED';
