"use client";

import { useEffect, useState } from "react";
import type { StackStatus } from "@/app/api/status/route";
import { when } from "@/components/ui";

type Check = { key: keyof StackStatus; label: string | ((s: StackStatus | null) => string); fix: string };

const CHECKS: Check[] = [
  { key: "database", label: "TraceFix database (DATABASE_URL)", fix: "Run npm run db:up and check DATABASE_URL." },
  { key: "prometheus", label: "Prometheus (PROMETHEUS_URL)", fix: "Start your Prometheus and check PROMETHEUS_URL in .env." },
  {
    key: "target",
    label: (s) => (s?.service ? `Prometheus is scraping job "${s.service}"` : "Prometheus is scraping your service (save the Service step first)"),
    fix: "Start the service, and make sure the project's service name equals its Prometheus job name.",
  },
  {
    key: "metricsEndpoint",
    label: (s) => (s?.metricsUrl ? `Service metrics URL answers (${s.metricsUrl})` : "Service metrics URL (save the Service step first)"),
    fix: "Start the service and check the base URL and metrics path in the Service step.",
  },
  { key: "grafana", label: "Grafana (GRAFANA_URL)", fix: "Start your Grafana and check GRAFANA_URL in .env." },
  { key: "lastWebhookAt", label: "First alert webhook received from Grafana", fix: "Set up the contact point (step 2), then wait for the rule to fire." },
];

// Polls /api/status so each item turns green as the local stack comes up.
export function StackChecklist() {
  const [s, setS] = useState<StackStatus | null>(null);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const poll = () =>
      fetch("/api/status", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((d) => {
          setS(d);
          setOffline(false);
        })
        .catch(() => setOffline(true));
    poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  return (
    <ul className="divide-y divide-line rounded-md border border-line" aria-live="polite">
      {CHECKS.map((c) => {
        const v = s?.[c.key];
        const ok = Boolean(v);
        return (
          <li key={c.key} className="flex items-start gap-3 px-3 py-2.5 text-sm">
            <span
              aria-hidden
              className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-bold ${
                !s ? "bg-surface-muted text-muted" : ok ? "bg-ok-bg text-ok" : "bg-warn-bg text-warn"
              }`}
            >
              {!s ? "…" : ok ? "✓" : "!"}
            </span>
            <span className="min-w-0">
              <span className="block">
                {typeof c.label === "function" ? c.label(s) : c.label}
                <span className="sr-only">{!s ? ": checking" : ok ? ": ok" : ": not yet"}</span>
              </span>
              {s && !ok && <span className="block text-xs text-muted">{c.fix}</span>}
              {c.key === "lastWebhookAt" && typeof v === "string" && <span className="block text-xs text-muted">Last at {when(v)}</span>}
            </span>
          </li>
        );
      })}
      {offline && <li className="px-3 py-2.5 text-xs text-bad">TraceFix API unreachable. Is npm run dev running?</li>}
    </ul>
  );
}
