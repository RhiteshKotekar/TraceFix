import React from 'react';

interface MetricItem {
  id: string;
  label: string;
  count: number;
  subtext: string;
  variant: 'critical' | 'warning' | 'info' | 'success';
  icon: React.ReactNode;
}

interface MetricCardsProps {
  openCount: number;
  criticalCount: number;
  inProgressCount: number;
  awaitingReviewCount: number;
}

export function MetricCards({
  openCount,
  criticalCount,
  inProgressCount,
  awaitingReviewCount,
}: MetricCardsProps) {
  const metrics: MetricItem[] = [
    {
      id: 'open',
      label: 'Open Incidents',
      count: openCount,
      subtext: 'Across demo workspace',
      variant: 'info',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      id: 'critical',
      label: 'Critical Latency (P0)',
      count: criticalCount,
      subtext: 'Requires immediate action',
      variant: 'critical',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
    },
    {
      id: 'in-progress',
      label: 'Investigations Active',
      count: inProgressCount,
      subtext: 'Worker measuring baseline/k6',
      variant: 'warning',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
    },
    {
      id: 'awaiting-review',
      label: 'Fixes Awaiting Review',
      count: awaitingReviewCount,
      subtext: 'Deterministic gates passed',
      variant: 'success',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
  ];

  const getColorVars = (variant: MetricItem['variant']) => {
    switch (variant) {
      case 'critical':
        return { bg: 'var(--status-critical-bg)', color: 'var(--status-critical)' };
      case 'warning':
        return { bg: 'var(--status-warning-bg)', color: 'var(--status-warning)' };
      case 'success':
        return { bg: 'var(--status-success-bg)', color: 'var(--status-success)' };
      default:
        return { bg: 'var(--status-info-bg)', color: 'var(--status-info)' };
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {metrics.map((m) => {
        const { bg, color } = getColorVars(m.variant);
        return (
          <div
            key={m.id}
            className="p-5 rounded-[var(--radius-card)] border transition-all hover:translate-y-[-2px]"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-card)',
              boxShadow: 'var(--shadow-card)',
            }}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                {m.label}
              </span>
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                style={{ backgroundColor: bg, color }}
              >
                {m.icon}
              </div>
            </div>
            <div className="text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              {m.count}
            </div>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {m.subtext}
            </p>
          </div>
        );
      })}
    </div>
  );
}
