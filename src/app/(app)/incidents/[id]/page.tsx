import { Suspense } from "react";
import { notFound } from "next/navigation";
import { STAGES, getIncident, type Incident, type Job, type Metrics, type Report, type RunResult } from "@/lib/data";
import { Card, CardTitle, Pill, Tag, Unavailable, ms, pct, rps, stageIndex, statusOf, when } from "@/components/ui";
import { DecisionPanel } from "@/components/DecisionPanel";
import { AutoRefresh } from "@/components/AutoRefresh";
import { Tabs } from "@/components/Tabs";
import { getSettings } from "@/lib/incidents";

export default function IncidentPage({ params }: PageProps<"/incidents/[id]">) {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <Detail params={params} />
    </Suspense>
  );
}

async function Detail({ params }: Pick<PageProps<"/incidents/[id]">, "params">) {
  const { id } = await params;
  const incident = await getIncident(id);
  if (!incident) notFound();
  const job = incident.job;
  const n = incident.reports.length;
  const settings = await getSettings();
  const status = statusOf(incident);
  const active = job?.status === "QUEUED" || job?.status === "RUNNING";

  const worst = Math.max(0, ...incident.reports.map((r) => r.valueMs ?? 0));
  const b95 = job?.baseline?.k6.p95 ?? null;
  const c95 = job?.candidate?.k6.p95 ?? null;
  const codeTab = Boolean(job?.agentOutput || job?.diff);

  return (
    <div>
      <header className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-start justify-between gap-5 px-5 py-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Pill tone={status.tone}>{status.label}</Pill>
              {incident.critical && <Pill tone="bad">Escalated to critical</Pill>}
              {active && <AutoRefresh />}
            </div>
            <h1 className="mt-2 text-2xl font-semibold tracking-tight">{incident.alertName}</h1>
            <p className="mt-1 font-mono text-sm text-muted">
              {incident.service} · GET {incident.endpoint}
            </p>
          </div>
          {b95 != null && (
            <div className="rounded-lg border border-line bg-surface-muted px-4 py-3 sm:text-right">
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">p95 latency</p>
              <p className="mt-1 font-mono text-2xl font-semibold tabular-nums">
                {c95 != null ? (
                  <>
                    <span className="text-base font-normal text-muted line-through">{Math.round(b95).toLocaleString("en-US")}</span>{" "}
                    <span aria-hidden className="text-base text-muted">→</span>{" "}
                    <span className="text-ok">{Math.round(c95).toLocaleString("en-US")} ms</span>
                  </>
                ) : (
                  <>{Math.round(b95).toLocaleString("en-US")} ms</>
                )}
              </p>
              <div className="mt-1 sm:flex sm:justify-end">
                {c95 != null ? <Delta before={b95} after={c95} lowerIsBetter /> : <span className="text-xs text-muted">Baseline · fix pending</span>}
              </div>
            </div>
          )}
        </div>
        {job && <Stepper job={job} />}
        <dl className="grid grid-cols-2 border-t border-line text-xs sm:grid-cols-4">
          {[
            ["Grafana reports", String(n)],
            ["First seen", when(incident.firstSeen)],
            ["Last seen", when(incident.lastSeen)],
            ["Worst p95 in prod", worst ? `${worst.toLocaleString("en-US")} ms` : "—"],
          ].map(([k, v], i) => (
            <div key={k} className={`px-5 py-2.5 ${i > 0 ? "sm:border-l" : ""} ${i % 2 ? "border-l" : ""} ${i > 1 ? "border-t sm:border-t-0" : ""} border-line`}>
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{k}</dt>
              <dd className="mt-0.5 truncate font-mono">{v}</dd>
            </div>
          ))}
        </dl>
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex min-w-0 flex-col gap-6">
          {incident.status === "AWAITING_APPROVAL" && incident.triage && (
            <DecisionPanel incidentId={incident.id} score={incident.triage.score} mode={settings.mode} threshold={settings.autoThreshold} />
          )}
          {job?.error && (
            <section role="alert" className="rounded-lg border border-bad/30 bg-bad-bg p-4 text-sm">
              <h2 className="font-semibold text-bad">Fix pipeline failed</h2>
              <p className="mt-1">{job.error}</p>
            </section>
          )}
          <Tabs
            label="Incident sections"
            tabs={[
              {
                id: "overview",
                label: "Overview",
                content: (
                  <>
                    {job?.baseline && <Performance baseline={job.baseline} candidate={job.candidate} />}
                    <TriagePanel triage={incident.triage} />
                    {job?.gateResults && <Gates job={job} />}
                    <Evidence metrics={job?.evidence ?? null} />
                  </>
                ),
              },
              ...(job
                ? [
                    {
                      id: "agent",
                      label: "Agent run",
                      badge: active ? <span aria-label="running" className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" /> : undefined,
                      content: job.runLog.length ? <AgentRun job={job} /> : <Empty text="The agent has not started yet." />,
                    },
                  ]
                : []),
              ...(codeTab
                ? [
                    {
                      id: "code",
                      label: "Code change",
                      content: (
                        <>
                          {job?.agentOutput && <Findings out={job.agentOutput} />}
                          {job?.diff && <Diff diff={job.diff} />}
                        </>
                      ),
                    },
                  ]
                : []),
              {
                id: "reports",
                label: "Grafana reports",
                badge: <span className="rounded bg-surface-muted px-1.5 font-mono text-xs tabular-nums">{n}</span>,
                content: <Reports reports={incident.reports} />,
              },
            ]}
          />
        </div>

        <aside className="flex flex-col gap-6">
          {job?.prUrl && (
            <Card className="border-ok/40 bg-ok-bg">
              <h2 className="text-base font-semibold">Pull request opened</h2>
              <p className="mt-1 text-sm text-muted">One PR fixes all {n} reports. Ready for human review; TraceFix never merges or deploys.</p>
              <a
                href={job.prUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-block rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink"
              >
                View on GitHub <span className="sr-only">(opens in a new tab)</span>↗
              </a>
            </Card>
          )}
          {job && (
            <Card>
              <CardTitle>Run details</CardTitle>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-muted">Job</dt>
                <dd className="truncate font-mono text-xs leading-5">{job.id.slice(0, 8)}</dd>
                <dt className="text-muted">Commit</dt>
                <dd className="font-mono text-xs leading-5">
                  {job.commitSha ? job.commitSha.slice(0, 7) : <Unavailable />}
                </dd>
                <dt className="text-muted">Decision</dt>
                <dd>{job.decision ?? <Unavailable />}</dd>
              </dl>
            </Card>
          )}
          <Timeline incident={incident} />
        </aside>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="rounded-lg border border-dashed border-line bg-surface px-4 py-10 text-center text-sm text-muted">{text}</p>;
}

function Stepper({ job }: { job: Job }) {
  const reached = stageIndex(job);
  const stopped = !["QUEUED", "RUNNING", "PR_CREATED"].includes(job.status);
  return (
    <div className="border-t border-line px-5 py-4">
      <div className="overflow-x-auto">
        <ol className="flex min-w-[640px] items-start">
          {STAGES.map((s, i) => {
            const state = i < reached ? "done" : i === reached ? (stopped ? "stopped" : "current") : "todo";
            const dot = {
              done: "bg-accent text-accent-ink",
              current: "bg-warn-bg text-warn ring-2 ring-warn",
              stopped: "bg-bad text-white",
              todo: "border border-line bg-surface text-muted",
            }[state];
            return (
              <li key={s.id} aria-current={state === "current" ? "step" : undefined} className="relative flex flex-1 flex-col items-center">
                {i > 0 && (
                  <span aria-hidden className={`absolute right-1/2 top-3 h-0.5 w-full -translate-y-1/2 ${i <= reached ? "bg-accent" : "bg-line"}`} />
                )}
                <span className={`relative grid h-6 w-6 place-items-center rounded-full text-[11px] font-semibold ${dot}`}>
                  {state === "done" ? "✓" : state === "stopped" ? "✕" : state === "current" ? <span className="h-2 w-2 animate-pulse rounded-full bg-warn" /> : i + 1}
                </span>
                <span className={`mt-1.5 text-center text-xs ${state === "todo" ? "text-muted" : "font-medium"}`}>{s.label}</span>
                <span className="sr-only">{{ done: "complete", current: "in progress", stopped: "stopped here", todo: "not started" }[state]}</span>
              </li>
            );
          })}
        </ol>
      </div>
      {job.progressMessage && <p className="mt-3 text-center text-xs text-muted">{job.progressMessage}</p>}
    </div>
  );
}

const VERDICT = {
  FIX: { label: "Fix recommended", tone: "ok" },
  MONITOR: { label: "Monitor only", tone: "warn" },
  IGNORE: { label: "Not actionable", tone: "neutral" },
} as const;

function TriagePanel({ triage }: { triage: Incident["triage"] }) {
  if (!triage) {
    return (
      <Card>
        <CardTitle aside={<span className="flex items-center gap-1.5 text-xs text-muted"><span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />In progress</span>}>
          AI triage
        </CardTitle>
        <p role="status" className="text-sm text-muted">
          Reading the alert, Prometheus evidence and the repo&apos;s route map to score whether a code fix is warranted.
          Nothing is executed during triage.
        </p>
        <div aria-hidden className="mt-4 space-y-2">
          {[0, 1, 2].map((k) => <div key={k} className="h-3 animate-pulse rounded bg-surface-muted" style={{ width: `${90 - k * 20}%` }} />)}
        </div>
      </Card>
    );
  }
  const v = VERDICT[triage.verdict];
  const scoreTone = triage.score >= 70 ? "text-ok" : triage.score >= 40 ? "text-warn" : "text-muted";
  const barTone = triage.score >= 70 ? "bg-ok" : triage.score >= 40 ? "bg-warn" : "bg-neutral";
  return (
    <Card>
      <CardTitle aside={<span className="text-xs text-muted">{triage.model} · {when(triage.at)}</span>}>AI triage</CardTitle>
      <div className="grid gap-5 sm:grid-cols-[150px_1fr]">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Fix score</p>
          <p className={`mt-1 font-mono text-4xl font-semibold tabular-nums ${scoreTone}`}>
            {triage.score}
            <span className="text-base text-muted">/100</span>
          </p>
          <div className="mt-2 h-1.5 rounded-sm bg-surface-muted">
            <div className={`h-1.5 rounded-sm ${barTone}`} style={{ width: `${triage.score}%` }} />
          </div>
          <div className="mt-3">
            <Pill tone={v.tone}>{v.label}</Pill>
          </div>
        </div>
        <div className="min-w-0">
          <p className="text-sm">{triage.summary}</p>
          <dl className="mt-4 space-y-2.5">
            {triage.factors.map((f) => (
              <div key={f.label} className="grid grid-cols-[130px_1fr_2.5rem] items-center gap-3 text-xs">
                <dt className="font-medium" title={f.detail}>{f.label}</dt>
                <dd aria-hidden className="h-1.5 rounded-sm bg-surface-muted">
                  <div className="h-1.5 rounded-sm bg-ink/60" style={{ width: `${f.value * 100}%` }} />
                </dd>
                <dd className="text-right font-mono tabular-nums text-muted">{Math.round(f.value * 100)}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </Card>
  );
}

const STEP_STATE = {
  done: { icon: "✓", cls: "bg-ok-bg text-ok", label: "done" },
  running: { icon: "●", cls: "bg-info-bg text-info animate-pulse", label: "running" },
  failed: { icon: "✕", cls: "bg-bad-bg text-bad", label: "failed" },
  pending: { icon: "○", cls: "bg-surface-muted text-muted", label: "pending" },
} as const;

function AgentRun({ job }: { job: Job }) {
  const r = job.reproduction;
  return (
    <Card>
      <CardTitle aside={<span className="font-mono text-xs text-muted">.workspaces/{job.id.slice(0, 8)}</span>}>
        Agent workspace
      </CardTitle>
      {r && (
        <div
          role="status"
          className={`mb-4 flex items-start gap-2.5 rounded-md border px-3 py-2.5 text-sm ${
            r.reproduced === null ? "border-info/30 bg-info-bg" : r.reproduced ? "border-warn/40 bg-warn-bg" : "border-line bg-surface-muted"
          }`}
        >
          <span className="font-semibold">
            {r.reproduced === null ? "Reproducing…" : r.reproduced ? "Bug reproduced" : "Not reproduced"}
          </span>
          <span className="text-muted">{r.detail}</span>
        </div>
      )}
      <ol className="overflow-hidden rounded-md border border-line bg-[#0f1512] font-mono text-xs text-[#d6e2dc]">
        {job.runLog.map((s, i) => {
          const st = STEP_STATE[s.status];
          return (
            <li key={i} className="border-b border-white/10 last:border-0">
              <div className="flex items-center gap-2.5 px-3 py-2">
                <span aria-hidden className={`grid h-4 w-4 shrink-0 place-items-center rounded-full text-[10px] ${st.cls}`}>{st.icon}</span>
                <span className="font-semibold text-white">{STAGES.find((x) => x.id === s.stage)?.label}</span>
                <span className="sr-only">{st.label}</span>
                <span className="ml-auto text-[#8fa39a]">{s.durationS != null ? `${s.durationS.toFixed(1)}s` : st.label}</span>
              </div>
              {s.command && (
                <p className="overflow-x-auto whitespace-pre px-3 pb-1 text-[#7fd1a6]">
                  <span aria-hidden className="select-none text-[#8fa39a]">$ </span>
                  {s.command}
                </p>
              )}
              {s.output && <pre className={`overflow-x-auto px-3 pb-2.5 ${s.status === "failed" ? "text-[#ff9b8f]" : "text-[#aebdb6]"}`}>{s.output}</pre>}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-xs text-muted">
        The agent runs the project&apos;s own install, test and start commands in a disposable clone of the deployed commit, then
        replays the alert&apos;s traffic with k6 to confirm the slowdown before changing any code.
      </p>
    </Card>
  );
}

function Evidence({ metrics }: { metrics: Metrics | null }) {
  const items = [
    { label: "p50 latency", value: ms(metrics?.p50 ?? null) },
    { label: "p95 latency", value: ms(metrics?.p95 ?? null) },
    { label: "Request rate", value: rps(metrics?.rps ?? null) },
    { label: "Error rate", value: pct(metrics?.errorRate ?? null) },
  ];
  return (
    <Card>
      <CardTitle aside={<span className="text-xs text-muted">Prometheus, alert window</span>}>Evidence</CardTitle>
      {metrics ? (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {items.map((m) => (
            <div key={m.label} className="rounded-md border border-line bg-surface-muted px-3 py-2.5">
              <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{m.label}</dt>
              <dd className="mt-1 font-mono text-lg font-semibold tabular-nums">{m.value ?? <Unavailable />}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <p className="text-sm text-muted">Collected after approval, when the worker starts.</p>
      )}
    </Card>
  );
}

function Delta({ before, after, lowerIsBetter }: { before: number; after: number; lowerIsBetter: boolean }) {
  if (!before) return <span className="text-xs text-muted">—</span>;
  const d = (after - before) / before;
  if (Math.abs(d) < 0.005) return <span className="rounded bg-neutral-bg px-1.5 py-0.5 text-xs font-medium text-neutral">No change</span>;
  const good = lowerIsBetter ? d < 0 : d > 0;
  return (
    <span className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold tabular-nums ${good ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}>
      <span aria-hidden>{d < 0 ? "▼" : "▲"}</span>
      {Math.abs(d * 100).toFixed(1)}% {good ? "better" : "worse"}
    </span>
  );
}

type Row = { label: string; b: number | null; c: number | null; fmt: (v: number | null) => string | null; lowerIsBetter: boolean };

function Performance({ baseline, candidate }: { baseline: RunResult; candidate: RunResult | null }) {
  const rows: Row[] = [
    { label: "p95 latency", b: baseline.k6.p95, c: candidate?.k6.p95 ?? null, fmt: ms, lowerIsBetter: true },
    { label: "p50 latency", b: baseline.k6.p50, c: candidate?.k6.p50 ?? null, fmt: ms, lowerIsBetter: true },
    { label: "Throughput", b: baseline.k6.rps, c: candidate?.k6.rps ?? null, fmt: rps, lowerIsBetter: false },
    { label: "Error rate", b: baseline.k6.errorRate, c: candidate?.k6.errorRate ?? null, fmt: pct, lowerIsBetter: true },
  ];
  const count = (v: number | null) => v?.toLocaleString("en-US") ?? null;
  return (
    <Card>
      <CardTitle aside={<span className="text-xs text-muted">Same k6 workload · {baseline.k6.durationS}s, both runs</span>}>
        Performance: before vs after
      </CardTitle>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {rows.map((r) => (
          <div key={r.label} className="rounded-lg border border-line p-3">
            <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{r.label}</dt>
            <dd className="mt-1.5 font-mono text-xl font-semibold tabular-nums">
              {r.c != null ? r.fmt(r.c) : <span className="text-base font-normal text-muted">Pending fix</span>}
            </dd>
            <dd className="mt-0.5 text-xs text-muted">
              before <span className="font-mono tabular-nums">{r.fmt(r.b) ?? "—"}</span>
            </dd>
            <dd className="mt-2">{r.b != null && r.c != null ? <Delta before={r.b} after={r.c} lowerIsBetter={r.lowerIsBetter} /> : null}</dd>
          </div>
        ))}
      </dl>

      <LatencyChart baseline={baseline} candidate={candidate} />

      <details className="mt-4 border-t border-line pt-3">
        <summary className="cursor-pointer text-xs font-medium text-accent hover:underline">View as table</summary>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full font-mono text-xs tabular-nums">
            <thead>
              <tr className="border-b border-line text-left text-muted">
                <th scope="col" className="py-2 pr-4 font-medium">Metric</th>
                <th scope="col" className="py-2 pr-4 text-right font-medium">Before</th>
                <th scope="col" className="py-2 text-right font-medium">After</th>
              </tr>
            </thead>
            <tbody>
              {[...rows, { label: "Requests", b: baseline.k6.requests, c: candidate?.k6.requests ?? null, fmt: count, lowerIsBetter: false }].map((r) => (
                <tr key={r.label} className="border-b border-line">
                  <th scope="row" className="py-2 pr-4 text-left font-medium">{r.label}</th>
                  <td className="py-2 pr-4 text-right">{r.fmt(r.b) ?? "—"}</td>
                  <td className="py-2 text-right">{r.fmt(r.c) ?? "—"}</td>
                </tr>
              ))}
              <tr>
                <th scope="row" className="py-2 pr-4 text-left font-medium">Tests</th>
                <td className="py-2 pr-4 text-right">{baseline.tests.passed ? "Pass" : "Fail"}</td>
                <td className="py-2 text-right">{candidate ? (candidate.tests.passed ? "Pass" : "Fail") : "—"}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}

const PLOT = 85; // % of the row used by the axis; the rest holds value labels.

// Paired horizontal bars on one ms axis. Hover shows exact values; the table above carries them for screen readers.
function LatencyChart({ baseline, candidate }: { baseline: RunResult; candidate: RunResult | null }) {
  const series = (["p50", "p95"] as const).map((k) => ({ k, b: baseline.k6[k], c: candidate?.k6[k] ?? null }));
  const max = Math.max(...series.flatMap((s) => [s.b ?? 0, s.c ?? 0]), 1);
  const ticks = [0, 0.5, 1].map((f) => Math.round(max * f));
  return (
    <figure className="mt-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium">Latency (ms, lower is better)</span>
        <span className="flex gap-4 text-muted">
          <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-series-before" />Before fix</span>
          <span className="flex items-center gap-1.5"><span aria-hidden className="h-2.5 w-2.5 rounded-sm bg-series-after" />After fix</span>
        </span>
      </figcaption>
      <div aria-hidden className="mt-3 grid grid-cols-[2.5rem_1fr] gap-x-3">
        {series.map((s) => (
          <div key={s.k} className="col-span-2 grid grid-cols-subgrid items-center py-1.5">
            <span className="font-mono text-xs font-semibold uppercase text-muted">{s.k}</span>
            <div className="relative space-y-0.5">
              {[0, 0.5, 1].map((x) => (
                <span key={x} className="absolute inset-y-0 w-px bg-line" style={{ left: `${x * PLOT}%` }} />
              ))}
              {[
                { v: s.b, color: "bg-series-before", name: "Before" },
                { v: s.c, color: "bg-series-after", name: "After" },
              ].map((bar) => (
                <div key={bar.name} className="group relative flex h-4 items-center" title={bar.v == null ? `${bar.name}: pending` : `${bar.name} ${s.k}: ${Math.round(bar.v).toLocaleString("en-US")} ms`}>
                  {bar.v != null ? (
                    <>
                      <div className={`h-3 shrink-0 rounded-r-[4px] ${bar.color} group-hover:opacity-80`} style={{ width: `${Math.max((bar.v / max) * PLOT, 0.8)}%` }} />
                      <span className="ml-1.5 font-mono text-[11px] tabular-nums text-ink">{Math.round(bar.v).toLocaleString("en-US")}</span>
                    </>
                  ) : (
                    <span className="font-mono text-[11px] text-muted">pending</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
        <span />
        <div className="relative mt-1 h-4 font-mono text-[10px] text-muted">
          {ticks.map((t, i) => (
            <span key={i} className="absolute -translate-x-1/2" style={{ left: `${i * 0.5 * PLOT}%` }}>
              {t.toLocaleString("en-US")}
            </span>
          ))}
        </div>
      </div>
    </figure>
  );
}

function Gates({ job }: { job: Job }) {
  const tone = job.decision === "PASS" ? "ok" : job.decision === "FAIL" ? "bad" : "neutral";
  return (
    <Card>
      <CardTitle aside={job.decision && <Pill tone={tone}>{job.decision}</Pill>}>Verification gates</CardTitle>
      <p className="-mt-2 mb-3 text-xs text-muted">Decided in code from measured results, not by the model.</p>
      <ul className="divide-y divide-line">
        {job.gateResults!.map((g) => (
          <li key={g.name} className="flex items-center justify-between gap-4 py-2.5 text-sm">
            <span className="flex items-center gap-2">
              <span
                aria-hidden
                className={`grid h-5 w-5 place-items-center rounded-full text-xs font-bold ${g.passed ? "bg-ok-bg text-ok" : "bg-bad-bg text-bad"}`}
              >
                {g.passed ? "✓" : "✕"}
              </span>
              <span className="font-medium">{g.name}</span>
              <span className="sr-only">{g.passed ? "passed" : "failed"}</span>
            </span>
            <span className="text-right text-muted tabular-nums">{g.detail}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function Findings({ out }: { out: NonNullable<Job["agentOutput"]> }) {
  return (
    <Card>
      <CardTitle aside={<span className="text-xs text-muted">Untrusted until verified</span>}>Agent findings</CardTitle>
      <h3 className="text-sm font-semibold">Hypothesis</h3>
      <p className="mt-1 text-sm">{out.hypothesis}</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Evidence</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
            {out.evidence.map((e) => <li key={e}>{e}</li>)}
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-semibold">Risks</h3>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted">
            {out.risks.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-muted">Edited:</span>
        {out.editedPaths.map((p) => (
          <Tag key={p}>
            <span className="font-mono">{p}</span>
          </Tag>
        ))}
      </div>
    </Card>
  );
}

function Diff({ diff }: { diff: string }) {
  return (
    <Card>
      <CardTitle>Patch</CardTitle>
      <pre className="overflow-x-auto rounded-lg bg-surface-muted py-3 font-mono text-xs leading-5">
        {diff.split("\n").map((line, i) => {
          const cls = line.startsWith("+++") || line.startsWith("---")
            ? "text-muted"
            : line.startsWith("+")
              ? "bg-ok-bg text-ok"
              : line.startsWith("-")
                ? "bg-bad-bg text-bad"
                : line.startsWith("@@")
                  ? "text-info"
                  : "";
          return (
            <span key={i} className={`block px-4 ${cls}`}>
              {line || " "}
            </span>
          );
        })}
      </pre>
    </Card>
  );
}

const SHOW_REPORTS = 4;

function ReportItem({ r }: { r: Report }) {
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 py-2 text-xs">
      <span className="font-mono text-muted">{when(r.receivedAt)}</span>
      <span className="min-w-0 truncate">{r.summary || r.fingerprint}</span>
      <span className="flex items-center gap-2">
        {r.deliveries > 1 && <span className="font-mono text-muted" title={`Grafana re-sent this ${r.deliveries} times while it kept firing`}>×{r.deliveries}</span>}
        <Pill tone={r.status === "firing" ? "warn" : "neutral"}>{r.status}</Pill>
        {r.severity === "critical" && <Pill tone="bad">critical</Pill>}
        <span className="w-16 text-right font-mono tabular-nums">{r.valueMs == null ? "—" : `${r.valueMs.toLocaleString("en-US")}ms`}</span>
      </span>
    </li>
  );
}

// Every Grafana delivery grouped into this incident. They are evidence; the pipeline runs once for all of them.
function Reports({ reports }: { reports: Report[] }) {
  const rest = reports.slice(SHOW_REPORTS);
  return (
    <Card>
      <CardTitle aside={<span className="text-xs text-muted">Grouped by alert, service and endpoint</span>}>
        Grafana reports ({reports.length})
      </CardTitle>
      <ol className="divide-y divide-line">
        {reports.slice(0, SHOW_REPORTS).map((r) => (
          <ReportItem key={r.id} r={r} />
        ))}
      </ol>
      {rest.length > 0 && (
        <details className="group">
          <summary className="cursor-pointer list-none border-t border-line pt-2 text-xs font-medium text-accent hover:underline">
            <span className="group-open:hidden">Show {rest.length} earlier</span>
            <span className="hidden group-open:inline">Hide earlier</span>
          </summary>
          <ol className="divide-y divide-line">
            {rest.map((r) => (
              <ReportItem key={r.id} r={r} />
            ))}
          </ol>
        </details>
      )}
    </Card>
  );
}

function Timeline({ incident: i }: { incident: Incident }) {
  const job = i.job;
  const n = i.reports.length;
  const events = [
    { at: i.firstSeen, text: "First Grafana report opened this incident" },
    n > 1 && { at: i.lastSeen, text: `Latest report (${n} so far) grouped into this incident` },
    i.triage && { at: i.triage.at, text: `AI triage scored ${i.triage.score}/100 (${VERDICT[i.triage.verdict].label.toLowerCase()})` },
    i.decidedAt && {
      at: i.decidedAt,
      text: `${i.status === "REJECTED" ? "Rejected" : "Approved"} by ${i.decidedBy ?? "unknown"}`,
      note: i.decisionReason,
    },
    job?.startedAt && { at: job.startedAt, text: "Fix pipeline started for the whole incident" },
    job?.finishedAt && { at: job.finishedAt, text: `Job finished: ${statusOf(i).label}` },
  ].filter(Boolean) as { at: string; text: string; note?: string | null }[];
  events.sort((a, b) => a.at.localeCompare(b.at));

  return (
    <Card>
      <CardTitle>Activity</CardTitle>
      <ol className="space-y-4 border-l border-line pl-4">
        {events.map((e) => (
          <li key={e.at + e.text} className="relative text-sm">
            <span aria-hidden className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-accent" />
            <p className="font-medium">{e.text}</p>
            {e.note && <p className="mt-0.5 text-muted">“{e.note}”</p>}
            <time dateTime={e.at} className="text-xs text-muted">{when(e.at)}</time>
          </li>
        ))}
      </ol>
    </Card>
  );
}

function DetailSkeleton() {
  return (
    <div aria-busy className="mt-3">
      <div className="h-36 animate-pulse rounded-lg bg-surface" />
      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="h-64 animate-pulse rounded-lg bg-surface" />
        <div className="h-64 animate-pulse rounded-lg bg-surface" />
      </div>
    </div>
  );
}
