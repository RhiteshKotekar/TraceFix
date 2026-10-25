"use client";

import { useEffect, useState } from "react";
import type { StackStatus } from "@/app/api/status/route";

const POLL_MS = 10_000;

// Top-bar health of the monitoring stack, from /api/status.
export function StackStatusPills() {
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
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, []);

  const prom: Item = !s
    ? { state: "unknown", detail: "Checking…" }
    : !s.prometheus
      ? { state: "down", detail: "Not reachable at PROMETHEUS_URL" }
      : !s.service
        ? { state: "warn", detail: "Connected · no project configured yet" }
        : s.target
          ? { state: "ok", detail: `Connected · scraping ${s.service}` }
          : { state: "warn", detail: `Connected · job "${s.service}" is not being scraped` };
  const graf: Item = !s
    ? { state: "unknown", detail: "Checking…" }
    : !s.grafana
      ? { state: "down", detail: "Not reachable at GRAFANA_URL" }
      : { state: "ok", detail: s.lastWebhookAt ? `Connected · last alert ${new Date(s.lastWebhookAt).toLocaleTimeString("en-GB")}` : "Connected · no alerts received yet" };

  const direct: Item = !s
    ? { state: "unknown", detail: "Checking…" }
    : !s.metricsUrl
      ? { state: "warn", detail: "No metrics URL yet: set the base URL in project setup" }
      : s.metricsEndpoint
        ? { state: "ok", detail: `Reading ${s.metricsUrl}` }
        : { state: "down", detail: `${s.metricsUrl} is not reachable or not Prometheus text` };

  if (offline) return <Pill name="TraceFix API" item={{ state: "down", detail: "Status check failed" }} />;
  return (
    <div className="flex items-center gap-1.5" aria-live="polite">
      <Pill name="Prometheus" item={prom} />
      <Pill name="Grafana" item={graf} />
      <Pill name="Metrics URL" item={direct} />
    </div>
  );
}

type Item = { state: "ok" | "warn" | "down" | "unknown"; detail: string };

const STYLE = {
  ok: { dot: "bg-ok", text: "text-ok", word: "Connected" },
  warn: { dot: "bg-warn", text: "text-warn", word: "Partial" },
  down: { dot: "bg-bad", text: "text-bad", word: "Down" },
  unknown: { dot: "bg-line", text: "text-muted", word: "…" },
} as const;

function Pill({ name, item }: { name: string; item: Item }) {
  const st = STYLE[item.state];
  return (
    <span
      title={`${name}: ${item.detail}`}
      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-0.5 text-xs"
    >
      <span aria-hidden className={`h-2 w-2 rounded-full ${st.dot} ${item.state === "ok" ? "" : item.state === "unknown" ? "" : "animate-pulse"}`} />
      <span className="font-medium">{name}</span>
      <span className={`hidden sm:inline ${st.text}`}>{st.word}</span>
      <span className="sr-only">: {item.detail}</span>
    </span>
  );
}
