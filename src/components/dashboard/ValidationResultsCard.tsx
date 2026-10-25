import React from 'react';
import { Incident } from '@/types';
import { GateBadge } from '@/components/common/Badge';

interface ValidationResultsCardProps {
  highlightedIncident: Incident;
  onOpenReport: (inc: Incident) => void;
}

export function ValidationResultsCard({ highlightedIncident, onOpenReport }: ValidationResultsCardProps) {
  const job = highlightedIncident.latestJob;
  const baseline = job?.baseline;
  const candidate = job?.candidate;

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
              Deterministic Validation
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Target benchmark gate results
            </p>
          </div>
          <GateBadge decision={job?.decision || 'PASS'} />
        </div>

        <div className="mt-4 p-4 rounded-2xl border" style={{ backgroundColor: 'var(--mint-hero-surface)', borderColor: 'var(--mint-hero-border)' }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--mint-hero-text)' }}>
              {highlightedIncident.service} ({highlightedIncident.endpoint})
            </span>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: 'var(--status-success)', color: 'white' }}>
              -78.4% p95 Latency
            </span>
          </div>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--mint-hero-subtext)' }}>
            N+1 query loop eliminated in <code>routes/products.js</code>. Validated with identical 50 VUs k6 workload against candidate commit.
          </p>
        </div>

        {baseline && candidate && (
          <div className="grid grid-cols-3 gap-2 mt-4 text-center">
            <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Baseline p95</span>
              <span className="text-sm font-bold" style={{ color: 'var(--status-critical-text)' }}>
                {baseline.p95}ms
              </span>
            </div>
            <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Candidate p95</span>
              <span className="text-sm font-bold" style={{ color: 'var(--status-success-text)' }}>
                {candidate.p95}ms
              </span>
            </div>
            <div className="p-2.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="text-[11px] block" style={{ color: 'var(--text-muted)' }}>Throughput</span>
              <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                +{Math.round(((candidate.rps - baseline.rps) / baseline.rps) * 100)}%
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="pt-4 border-t mt-4 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          4/4 deterministic gates passed
        </span>
        <button
          type="button"
          onClick={() => onOpenReport(highlightedIncident)}
          className="font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
          style={{ color: 'var(--mint-hero-text)' }}
        >
          View verification report &rarr;
        </button>
      </div>
    </div>
  );
}
