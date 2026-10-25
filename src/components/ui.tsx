import type { ReactNode } from "react";
import { STAGES, type Incident, type Job } from "@/lib/model";

export type Tone = "ok" | "warn" | "bad" | "info" | "neutral";

const TONE: Record<Tone, string> = {
  ok: "bg-ok-bg text-ok",
  warn: "bg-warn-bg text-warn",
  bad: "bg-bad-bg text-bad",
  info: "bg-info-bg text-info",
  neutral: "bg-neutral-bg text-neutral",
};

const DOT: Record<Tone, string> = {
  ok: "bg-ok",
  warn: "bg-warn",
  bad: "bg-bad",
  info: "bg-info",
  neutral: "bg-neutral",
};

export function Pill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded px-2 py-0.5 text-xs font-medium ${TONE[tone]}`}>
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${DOT[tone]}`} />
      {children}
    </span>
  );
}

export function Tag({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center rounded border border-line bg-surface-muted px-1.5 py-0.5 text-xs text-muted">
      {children}
    </span>
  );
}

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-line bg-surface p-4 shadow-[0_1px_0_rgba(16,24,20,0.03)] ${className}`}>
      {children}
    </section>
  );
}

export function CardTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="-mx-4 -mt-4 mb-4 flex min-h-10 items-center justify-between gap-3 border-b border-line bg-surface-muted/60 px-4 py-2 rounded-t-lg">
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{children}</h2>
      {aside}
    </div>
  );
}

export function Stat({ label, value, tone, hint }: { label: string; value: ReactNode; tone: Tone; hint?: ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-line bg-surface px-4 py-3">
      <span aria-hidden className={`absolute inset-y-0 left-0 w-1 ${DOT[tone]}`} />
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className="mt-1 font-mono text-2xl font-semibold tabular-nums">{value}</dd>
      {hint && <dd className="mt-0.5 text-xs text-muted">{hint}</dd>}
    </div>
  );
}

export type Bucket = "awaiting" | "running" | "pr" | "attention" | "rejected";

export function bucketOf(i: Incident): Bucket {
  if (i.status === "AWAITING_APPROVAL") return "awaiting";
  if (i.status === "REJECTED") return "rejected";
  const s = i.job?.status;
  if (s === "PR_CREATED") return "pr";
  if (s === "QUEUED" || s === "RUNNING") return "running";
  return "attention";
}

export function statusOf(i: Incident): { label: string; tone: Tone } {
  if (i.status === "AWAITING_APPROVAL" && !i.triage) return { label: "AI triaging", tone: "info" };
  if (i.status === "AWAITING_APPROVAL") return { label: "Awaiting approval", tone: "warn" };
  if (i.status === "REJECTED") return { label: "Rejected", tone: "neutral" };
  switch (i.job?.status) {
    case "QUEUED":
      return { label: "Queued", tone: "info" };
    case "RUNNING":
      return { label: "Running", tone: "info" };
    case "PR_CREATED":
      return { label: "PR opened", tone: "ok" };
    case "VERIFICATION_FAILED":
      return { label: "Verification failed", tone: "bad" };
    case "INCONCLUSIVE":
      return { label: "Inconclusive", tone: "neutral" };
    case "FAILED":
      return { label: "Failed", tone: "bad" };
    default:
      return { label: "Approved", tone: "info" };
  }
}

// Index of the stage the job reached; finished-with-PR counts as all stages done.
export function stageIndex(job: Job | null): number {
  if (!job) return -1;
  if (job.status === "PR_CREATED") return STAGES.length;
  if (job.status === "QUEUED") return -1;
  return STAGES.findIndex((s) => s.id === job.stage);
}

export function StageBar({ job, compact = false }: { job: Job | null; compact?: boolean }) {
  const reached = stageIndex(job);
  const failed = job && !["QUEUED", "RUNNING", "PR_CREATED"].includes(job.status);
  const label = !job
    ? "Not started"
    : reached >= STAGES.length
      ? "All stages complete"
      : reached < 0
        ? "Queued"
        : `Stage ${reached + 1} of ${STAGES.length}: ${STAGES[reached].label}`;
  return (
    <div>
      <div className="flex gap-1" role="img" aria-label={label}>
        {STAGES.map((s, i) => {
          const color =
            i < reached
              ? "bg-accent"
              : i === reached
                ? failed
                  ? "bg-bad"
                  : "bg-warn"
                : "bg-line";
          return <span key={s.id} className={`h-1.5 flex-1 rounded-sm ${color}`} />;
        })}
      </div>
      <p className={`mt-1.5 text-xs text-muted ${compact ? "truncate" : ""}`}>
        {compact && reached >= 0 && reached < STAGES.length ? STAGES[reached].label : label}
      </p>
    </div>
  );
}

export const ms = (v: number | null) => (v == null ? null : `${Math.round(v).toLocaleString("en-US")} ms`);
export const pct = (v: number | null) => (v == null ? null : `${(v * 100).toFixed(1)}%`);
export const rps = (v: number | null) => (v == null ? null : `${v.toFixed(1)}/s`);

export function when(iso: string) {
  return (
    new Date(iso).toLocaleString("en-GB", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "UTC",
    }) + " UTC"
  );
}

export function Score({ value }: { value: number | null }) {
  if (value == null) return <span className="text-xs text-info">Scoring…</span>;
  const tone = value >= 70 ? "bg-ok-bg text-ok" : value >= 40 ? "bg-warn-bg text-warn" : "bg-neutral-bg text-neutral";
  return (
    <span className={`inline-block min-w-9 rounded px-1.5 py-0.5 text-center font-mono text-xs font-semibold tabular-nums ${tone}`}>
      {value}
    </span>
  );
}

export function Unavailable() {
  return <span className="text-sm font-normal text-muted">Unavailable</span>;
}
