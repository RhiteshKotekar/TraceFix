"use client";

import Link from "next/link";
import { resetProject, useProjectState } from "@/lib/project";
import { Card, CardTitle, Pill } from "@/components/ui";
import { ResponseMode } from "@/components/ResponseMode";

export function ProjectSettings() {
  const state = useProjectState();
  const project = state?.project;
  if (state === undefined) return <div className="mt-5 h-64 animate-pulse rounded-lg bg-surface" />;

  if (!project?.completedAt) {
    return (
      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardTitle aside={<span className="text-xs text-muted">Saved on the server</span>}>Response mode</CardTitle>
          <ResponseMode />
        </Card>
        <Card>
          <CardTitle>Project</CardTitle>
          <p className="text-sm text-muted">No project is set up yet.</p>
          <Link href="/setup" className="mt-3 inline-block rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
            Start setup
          </Link>
        </Card>
      </div>
    );
  }

  const rows: [string, string][] = [
    ["Repository", project.repoUrl],
    ["Branch / subdirectory", `${project.branch} / ${project.subdir || "."}`],
    ["Install · test · start", `${project.installCommand} · ${project.testCommand} · ${project.startCommand}`],
    ["Watching", `${project.service} ${project.endpoint} (p95 > ${project.p95ThresholdMs} ms)`],
  ];

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle aside={<span className="text-xs text-muted">Saved on the server</span>}>Response mode</CardTitle>
        <ResponseMode />
      </Card>

      <Card>
        <CardTitle
          aside={
            <Link href="/setup" className="text-xs font-medium text-accent">
              Edit setup
            </Link>
          }
        >
          Project
        </CardTitle>
        <dl className="divide-y divide-line">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-4 py-2 text-sm">
              <dt className="shrink-0 text-muted">{k}</dt>
              <dd className="min-w-0 truncate text-right font-mono text-xs">{v}</dd>
            </div>
          ))}
          <div className="flex items-baseline justify-between gap-4 py-2 text-sm">
            <dt className="shrink-0 text-muted">GitHub App</dt>
            <dd className="min-w-0 truncate text-right font-mono text-xs">
              {project.ghAppSlug || "—"} · app {project.ghAppId || "—"} · install {project.ghInstallationId || "—"}
            </dd>
          </div>
          <div className="flex items-center justify-between py-2 text-sm">
            <dt className="text-muted">App private key</dt>
            <dd>
              <Pill tone={state.ghKeyConfigured ? "ok" : "warn"}>{state.ghKeyConfigured ? "Configured (.env)" : "Not set in .env"}</Pill>
            </dd>
          </div>
        </dl>
        <button
          type="button"
          onClick={() => confirm("Delete the saved project setup? Incidents are kept.") && resetProject()}
          className="mt-3 text-xs font-medium text-bad hover:underline"
        >
          Reset setup
        </button>
      </Card>
    </div>
  );
}
