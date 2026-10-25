"use client";

import Link from "next/link";
import { useProject } from "@/lib/project";

export function SetupBanner() {
  const project = useProject();
  if (project === undefined || project?.completedAt) return null;
  return (
    <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-accent/40 bg-ok-bg px-4 py-3">
      <div>
        <p className="text-sm font-semibold">Finish project setup</p>
        <p className="text-xs text-muted">Connect the GitHub repo, tell the agent how to run it, and point Grafana at TraceFix.</p>
      </div>
      <Link href="/setup" className="rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-accent-ink">
        {project ? "Continue setup" : "Start setup"}
      </Link>
    </div>
  );
}
