"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { LiveEvent, LiveSnapshot } from "@/app/api/live/route";

const POLL_MS = 2000;
const MAX_EVENTS = 300;

const SOURCES: { id: LiveEvent["source"]; label: string; cls: string }[] = [
  { id: "prometheus", label: "Prometheus", cls: "bg-warn-bg text-warn" },
  { id: "grafana", label: "Grafana", cls: "bg-info-bg text-info" },
  { id: "tracefix", label: "TraceFix", cls: "bg-ok-bg text-ok" },
];

const LEVEL = { info: "text-[#aebdb6]", warn: "text-[#f0c060]", error: "text-[#ff9b8f]" } as const;

export function LiveFeed() {
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [snap, setSnap] = useState<LiveSnapshot | null>(null);
  const [paused, setPaused] = useState(false);
  const [offline, setOffline] = useState(false);
  const [shown, setShown] = useState<Record<LiveEvent["source"], boolean>>({ prometheus: true, grafana: true, tracefix: true });
  const seen = useRef(new Set<string>());
  // Last logged Prometheus state: a sample is logged only when this changes, or once a minute as a heartbeat.
  const lastProm = useRef({ key: "", at: 0 });
  const cursor = useRef(0);

  useEffect(() => {
    if (paused) return;
    let busy = false;
    async function poll() {
      if (busy) return;
      busy = true;
      try {
        const res = await fetch(`/api/live?after=${cursor.current}`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data: LiveSnapshot = await res.json();
        cursor.current = data.cursor;
        const fresh = data.events.filter((e) => {
          if (seen.current.has(e.id)) return false;
          if (e.source !== "prometheus") return true;
          const m = data.metrics;
          const key = [e.level, data.prometheus, data.route ?? "", m.up, m.p95Ms != null && m.p95Ms > 200].join("|");
          const now = Date.now();
          if (key === lastProm.current.key && now - lastProm.current.at < 60_000) return false;
          lastProm.current = { key, at: now };
          return true;
        });
        fresh.forEach((e) => seen.current.add(e.id));
        setSnap(data);
        setOffline(false);
        if (fresh.length) {
          setEvents((prev) => [...fresh.sort((a, b) => b.at.localeCompare(a.at)), ...prev].slice(0, MAX_EVENTS));
        }
      } catch {
        setOffline(true);
      } finally {
        busy = false;
      }
    }
    poll();
    const t = setInterval(poll, POLL_MS);
    return () => clearInterval(t);
  }, [paused]);

  const visible = events.filter((e) => shown[e.source]);
  const m = snap?.metrics;

  return (
    <div className="mt-5 space-y-5">
      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Metric label={`p95 · ${snap?.route ?? "slowest route"}`} value={m?.p95Ms == null ? null : `${Math.round(m.p95Ms)} ms`} alert={m?.p95Ms != null && m.p95Ms > 200} />
        <Metric label="Request rate (all)" value={m?.rps == null ? null : `${m.rps.toFixed(1)}/s`} />
        <Metric label="Error rate (all)" value={m?.errorRate == null ? null : `${(m.errorRate * 100).toFixed(2)}%`} alert={(m?.errorRate ?? 0) > 0.01} />
        <Metric label="Target" value={m?.up == null ? null : m.up ? "Up" : "Down"} alert={m?.up === false} />
      </dl>

      <DirectPanel snap={snap} />

      <section aria-label="Event log" className="rounded-lg border border-line bg-surface">
        <div className="flex flex-wrap items-center gap-3 border-b border-line px-4 py-2.5">
          <span className="flex items-center gap-1.5 text-xs font-medium">
            <span
              aria-hidden
              className={`h-2 w-2 rounded-full ${offline ? "bg-bad" : paused ? "bg-neutral" : "animate-pulse bg-ok"}`}
            />
            {offline ? "Connection lost, retrying…" : paused ? "Paused" : `Live · polling every ${POLL_MS / 1000}s`}
          </span>
          {snap && (
            <span className="rounded bg-surface-muted px-1.5 py-0.5 text-xs text-muted">
              Prometheus: {snap.prometheus === "live" ? "connected" : "unreachable"} · slowest route {snap.route ?? "—"}
            </span>
          )}
          <fieldset className="ml-auto flex flex-wrap items-center gap-1.5">
            <legend className="sr-only">Show sources</legend>
            {SOURCES.map((s) => (
              <label
                key={s.id}
                className={`cursor-pointer rounded px-2 py-0.5 text-xs font-medium ${shown[s.id] ? s.cls : "bg-surface-muted text-muted line-through"}`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={shown[s.id]}
                  onChange={() => setShown((p) => ({ ...p, [s.id]: !p[s.id] }))}
                />
                {s.label}
              </label>
            ))}
          </fieldset>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface-muted"
          >
            {paused ? "Resume" : "Pause"}
          </button>
          <button
            type="button"
            onClick={() => setEvents([])}
            className="rounded-md border border-line px-2.5 py-1 text-xs font-medium hover:bg-surface-muted"
          >
            Clear
          </button>
        </div>

        <ol role="log" aria-live="off" className="h-[520px] overflow-y-auto rounded-b-lg bg-[#0f1512] py-1 font-mono text-xs">
          {visible.length === 0 ? (
            <li className="px-4 py-3 text-[#8fa39a]">Waiting for events…</li>
          ) : (
            visible.map((e) => (
              <li key={e.id} className="flex gap-3 px-4 py-1 hover:bg-white/5">
                <time dateTime={e.at} className="shrink-0 text-[#8fa39a]">
                  {new Date(e.at).toLocaleTimeString("en-GB", { hour12: false })}
                </time>
                <span className="w-20 shrink-0 text-[#7fd1a6]">{e.source}</span>
                <span className={`w-11 shrink-0 uppercase ${LEVEL[e.level]}`}>{e.level}</span>
                <span className={`min-w-0 break-words ${LEVEL[e.level]}`}>
                  {e.message}
                  {e.incidentId && (
                    <Link href={`/incidents/${e.incidentId}`} className="ml-2 text-[#7fd1a6] underline-offset-2 hover:underline">
                      open incident
                    </Link>
                  )}
                </span>
              </li>
            ))
          )}
        </ol>
      </section>
    </div>
  );
}

function Metric({ label, value, alert = false }: { label: string; value: string | null; alert?: boolean }) {
  return (
    <div className={`rounded-lg border bg-surface px-4 py-3 ${alert ? "border-bad/40" : "border-line"}`}>
      <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</dt>
      <dd className={`mt-1 font-mono text-2xl font-semibold tabular-nums ${alert ? "text-bad" : ""}`}>
        {value ?? <span className="text-base font-normal text-muted">—</span>}
      </dd>
    </div>
  );
}

// Read straight from the service's own metrics URL (no Prometheus involved).
function DirectPanel({ snap }: { snap: LiveSnapshot | null }) {
  const d = snap?.direct;
  const num = (v: number | null, unit: string) => (v == null ? "—" : `${v.toLocaleString("en-US")}${unit}`);
  return (
    <section aria-labelledby="direct-title" className="rounded-lg border border-line bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-muted/60 px-4 py-2">
        <h2 id="direct-title" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">
          Service metrics (direct)
        </h2>
        <span className="truncate font-mono text-xs text-muted">
          {d ? `${d.url}${d.windowS ? ` · last ${d.windowS}s` : " · collecting…"}` : (snap?.directError ?? "Loading…")}
        </span>
      </div>
      {!d ? (
        <p className="px-4 py-6 text-sm text-muted">{snap?.directError ?? "Loading…"}</p>
      ) : (
        <div className="space-y-4 p-4">
          <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {[
              ["Memory (RSS)", num(d.memoryMb, " MB")],
              ["Heap used", num(d.heapUsedMb, " MB")],
              ["CPU", num(d.cpuPercent, "%")],
              ["Event loop lag p99", num(d.eventLoopLagMs, " ms")],
            ].map(([k, v]) => (
              <div key={k} className="rounded-md border border-line px-3 py-2">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{k}</dt>
                <dd className="mt-0.5 font-mono text-sm font-semibold tabular-nums">{v}</dd>
              </div>
            ))}
          </dl>
          <div className="overflow-x-auto">
            {d.routes.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted">
                {d.windowS ? "No requests in the last minute." : "Collecting a second sample to compute rates…"}
              </p>
            ) : (
              <table className="w-full font-mono text-xs tabular-nums">
                <caption className="sr-only">Requests per route over the last minute</caption>
                <thead>
                  <tr className="border-b border-line text-left text-muted">
                    <th scope="col" className="py-2 pr-4 font-medium">Route</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">Req/s</th>
                    <th scope="col" className="py-2 pr-4 text-right font-medium">p95</th>
                    <th scope="col" className="py-2 text-right font-medium">Errors</th>
                  </tr>
                </thead>
                <tbody>
                  {d.routes.slice(0, 10).map((r) => (
                    <tr key={r.route} className="border-b border-line last:border-0">
                      <th scope="row" className="max-w-[260px] truncate py-1.5 pr-4 text-left font-normal">{r.route}</th>
                      <td className="py-1.5 pr-4 text-right">{r.rps.toFixed(2)}</td>
                      <td className={`py-1.5 pr-4 text-right ${r.p95Ms != null && r.p95Ms > 200 ? "font-semibold text-bad" : ""}`}>
                        {r.p95Ms == null ? "—" : `${r.p95Ms} ms`}
                      </td>
                      <td className={`py-1.5 text-right ${r.errorRate > 0 ? "text-bad" : ""}`}>{(r.errorRate * 100).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
