import React from 'react';
import { Incident } from '@/types';
import { SeverityBadge, Badge } from '@/components/common/Badge';

interface RecentIncidentsCardProps {
  incidents: Incident[];
  onSelectIncident: (incident: Incident) => void;
  onOpenReport: (incident: Incident) => void;
  onOpenAi: (incident: Incident) => void;
}

export function RecentIncidentsCard({
  incidents,
  onSelectIncident,
  onOpenReport,
  onOpenAi,
}: RecentIncidentsCardProps) {
  return (
    <div
      className="p-6 rounded-[var(--radius-card)] border flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Active Incidents & Alerts
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Observed by Prometheus & Grafana Webhook
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {incidents.length} Active
          </span>
        </div>

        <div className="divide-y mt-2" style={{ borderColor: 'var(--border-subtle)' }}>
          {incidents.slice(0, 4).map((inc) => (
            <div
              key={inc.id}
              className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 group transition-colors hover:bg-[var(--bg-card-subtle)] -mx-2 px-2 rounded-xl"
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                {/* Status Indicator Icon */}
                <div
                  className="w-5 h-5 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 cursor-pointer"
                  style={{
                    borderColor:
                      inc.workflowStage === 'RESOLVED' || inc.workflowStage === 'PR_READY'
                        ? 'var(--status-success)'
                        : 'var(--border-strong)',
                  }}
                  onClick={() => onSelectIncident(inc)}
                  title="View Incident Detail"
                >
                  {(inc.workflowStage === 'RESOLVED' || inc.workflowStage === 'PR_READY') && (
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: 'var(--status-success)' }} />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <button
                    onClick={() => onSelectIncident(inc)}
                    className="text-left font-semibold text-sm hover:underline truncate block w-full cursor-pointer"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {inc.summary}
                  </button>
                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    <span
                      className="px-2 py-0.5 rounded-md text-[11px] font-mono border"
                      style={{
                        backgroundColor: 'var(--bg-surface)',
                        color: 'var(--text-secondary)',
                        borderColor: 'var(--border-subtle)',
                      }}
                    >
                      {inc.service}: {inc.endpoint}
                    </span>
                    <SeverityBadge severity={inc.severity} />
                    {inc.latestJob?.decision && (
                      <Badge variant="success" size="sm">
                        Gate PASS
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Actions & Timestamp */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                <button
                  type="button"
                  onClick={() => onOpenReport(inc)}
                  className="text-xs px-2.5 py-1 rounded-full border font-medium cursor-pointer transition-colors hover:opacity-80"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  Report
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAi(inc)}
                  aria-label="Refine with AI Assistant"
                  title="Refine with AI"
                  className="w-7 h-7 rounded-full flex items-center justify-center border cursor-pointer transition-transform hover:scale-105 active:scale-95"
                  style={{
                    backgroundColor: 'var(--ai-accent-bg)',
                    borderColor: 'var(--ai-accent-border)',
                    color: 'var(--ai-accent-text)',
                  }}
                >
                  <span className="text-xs font-bold">✨</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t mt-4 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Showing top {Math.min(incidents.length, 4)} of {incidents.length} incidents
        </span>
        <a
          href="/issues"
          className="font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
          style={{ color: 'var(--mint-hero-text)' }}
        >
          View all issues &rarr;
        </a>
      </div>
    </div>
  );
}
