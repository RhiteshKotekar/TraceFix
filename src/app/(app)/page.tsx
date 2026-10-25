import { Suspense } from "react";
import Link from "next/link";
import { getIncidents, type Incident } from "@/lib/data";
import { Pill, Score, Stat, StageBar, bucketOf, statusOf, when, type Bucket } from "@/components/ui";
import { SetupBanner } from "@/components/ProjectStatus";
import { getSettings } from "@/lib/incidents";

const VIEWS: { id: Bucket | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "awaiting", label: "Awaiting approval" },
  { id: "running", label: "Running" },
  { id: "pr", label: "PR opened" },
  { id: "attention", label: "Needs attention" },
  { id: "rejected", label: "Rejected" },
];

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Incidents</h1>
          <p className="mt-0.5 text-sm text-muted">Every Grafana report of the same problem is grouped into one incident. Triage, the fix and the PR happen once per incident.</p>
        </div>
        <Suspense>
          <ModeChip />
        </Suspense>
      </div>
      <SetupBanner />

      <Suspense fallback={<div className="mt-5 grid h-[88px] grid-cols-2 gap-3 lg:grid-cols-4" />}>
        <Summary />
      </Suspense>

      <Suspense fallback={<ListSkeleton />}>
        <IncidentTable searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Summary() {
  const incidents = await getIncidents();
  const count = (b: Bucket) => incidents.filter((i) => bucketOf(i) === b).length;
  const gains = incidents
    .map((i) => i.job)
    .filter((j) => j?.status === "PR_CREATED" && j.baseline?.k6.p95 && j.candidate?.k6.p95 != null)
    .map((j) => 1 - j!.candidate!.k6.p95! / j!.baseline!.k6.p95!);
  return (
    <dl className="mt-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Awaiting approval" value={count("awaiting")} tone="warn" hint="Needs a human decision" />
      <Stat label="Running" value={count("running")} tone="info" hint="Jobs in the pipeline" />
      <Stat label="Needs attention" value={count("attention")} tone="bad" hint="Failed or inconclusive" />
      <Stat
        label="PRs opened"
        value={count("pr")}
        tone="ok"
        hint={gains.length ? `Best p95 gain −${Math.round(Math.max(...gains) * 100)}%` : "No verified fixes yet"}
      />
    </dl>
  );
}

async function IncidentTable({ searchParams }: Pick<PageProps<"/">, "searchParams">) {
  const { view: raw } = await searchParams;
  const view = VIEWS.some((v) => v.id === raw) ? (raw as Bucket | "all") : "all";
  const incidents = await getIncidents();
  const inView = (i: Incident, v: Bucket | "all") => v === "all" || bucketOf(i) === v;
  const shown = incidents.filter((i) => inView(i, view));

  return (
    <section aria-label="Incidents" className="mt-5 rounded-lg border border-line bg-surface">
      <nav aria-label="Filter incidents" className="overflow-x-auto border-b border-line px-2">
        <ul className="flex min-w-max">
          {VIEWS.map((v) => {
            const active = v.id === view;
            return (
              <li key={v.id}>
                <Link
                  href={v.id === "all" ? "/" : `/?view=${v.id}`}
                  aria-current={active ? "page" : undefined}
                  className={`-mb-px flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm ${
                    active ? "border-accent font-medium text-ink" : "border-transparent text-muted hover:text-ink"
                  }`}
                >
                  {v.label}
                  <span className="rounded bg-surface-muted px-1.5 font-mono text-xs tabular-nums">
                    {incidents.filter((i) => inView(i, v.id)).length}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {shown.length === 0 ? (
        <div role="status" className="px-6 py-14 text-center">
          <p className="font-medium">No incidents</p>
          <p className="mt-1 text-sm text-muted">
            {view === "all" ? "No alerts yet. Start the stack and put load on the shop (npm run load) to trip the Grafana rule." : "Nothing matches this filter."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="whitespace-nowrap border-b border-line text-left text-[11px] uppercase tracking-[0.08em] text-muted">
                <th scope="col" className="px-4 py-2 font-semibold">Incident</th>
                <th scope="col" className="px-4 py-2 font-semibold">Status</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Reports</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">p95 before → after</th>
                <th scope="col" className="px-4 py-2 font-semibold">AI score</th>
                <th scope="col" className="px-4 py-2 font-semibold">Fix pipeline</th>
                <th scope="col" className="px-4 py-2 text-right font-semibold">Last seen</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((incident) => {
                const st = statusOf(incident);
                return (
                  <tr key={incident.id} className="relative border-b border-line last:border-0 hover:bg-surface-muted">
                    <td className="px-4 py-3">
                      <Link href={`/incidents/${incident.id}`} className="font-medium after:absolute after:inset-0 hover:underline">
                        {incident.alertName}
                      </Link>
                      <p className="mt-0.5 font-mono text-xs text-muted">
                        {incident.service} · {incident.endpoint}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <Pill tone={st.tone}>{st.label}</Pill>
                        {incident.critical && <Pill tone="bad">Critical</Pill>}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-mono tabular-nums">{incident.reports.length}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs tabular-nums">
                      <P95 incident={incident} />
                    </td>
                    <td className="px-4 py-3">
                      <Score value={incident.triage?.score ?? null} />
                    </td>
                    <td className="w-44 px-4 py-3">
                      {incident.status === "AWAITING_APPROVAL" ? (
                        <span className={`text-xs font-medium ${incident.triage ? "text-warn" : "text-info"}`}>
                          {incident.triage ? "Awaiting decision" : "Triage running"}
                        </span>
                      ) : incident.status === "REJECTED" ? (
                        <span className="text-xs text-muted">Not run</span>
                      ) : (
                        <StageBar job={incident.job} compact />
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-muted">{when(incident.lastSeen)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

function P95({ incident }: { incident: Incident }) {
  const j = incident.job;
  const before = j?.baseline?.k6.p95 ?? Math.max(0, ...incident.reports.map((r) => r.valueMs ?? 0));
  const after = j?.candidate?.k6.p95 ?? null;
  if (!before) return <span className="text-muted">—</span>;
  if (after == null) return <span>{Math.round(before).toLocaleString("en-US")}ms</span>;
  return (
    <span className="inline-flex flex-col items-end">
      <span>
        <span className="text-muted line-through">{Math.round(before).toLocaleString("en-US")}</span>
        {" → "}
        <span className="font-semibold text-ok">{Math.round(after).toLocaleString("en-US")}ms</span>
      </span>
      <span className="text-[11px] text-ok">▼ {Math.round((1 - after / before) * 100)}%</span>
    </span>
  );
}

async function ModeChip() {
  const s = await getSettings();
  return (
    <Link
      href="/settings"
      className="inline-flex items-center gap-1.5 rounded border border-line bg-surface px-2 py-0.5 text-xs text-muted hover:text-ink"
    >
      <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${s.mode === "automatic" ? "bg-info" : "bg-warn"}`} />
      {s.mode === "automatic" ? `Automatic · auto-start ≥ ${s.autoThreshold}` : "Manual approval"}
    </Link>
  );
}

function ListSkeleton() {
  return (
    <div aria-busy className="mt-5 rounded-lg border border-line bg-surface">
      <div className="h-11 border-b border-line" />
      {[0, 1, 2].map((k) => (
        <div key={k} className="flex gap-4 border-b border-line px-4 py-4 last:border-0">
          <div className="h-4 w-40 animate-pulse rounded bg-surface-muted" />
          <div className="h-4 flex-1 animate-pulse rounded bg-surface-muted" />
        </div>
      ))}
    </div>
  );
}
