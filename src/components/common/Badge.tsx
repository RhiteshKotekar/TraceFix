import React from 'react';
import { IncidentSeverity, IncidentStatus, JobStatus, GateDecision } from '@/types';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'critical' | 'warning' | 'success' | 'info' | 'neutral' | 'ai';
  size?: 'sm' | 'md';
  dot?: boolean;
}

export function Badge({ children, variant = 'neutral', size = 'sm', dot = false }: BadgeProps) {
  const getColors = () => {
    switch (variant) {
      case 'critical':
        return {
          bg: 'var(--status-critical-bg)',
          border: 'var(--status-critical-border)',
          text: 'var(--status-critical-text)',
          dotColor: 'var(--status-critical)',
        };
      case 'warning':
        return {
          bg: 'var(--status-warning-bg)',
          border: 'var(--status-warning-border)',
          text: 'var(--status-warning-text)',
          dotColor: 'var(--status-warning)',
        };
      case 'success':
        return {
          bg: 'var(--status-success-bg)',
          border: 'var(--status-success-border)',
          text: 'var(--status-success-text)',
          dotColor: 'var(--status-success)',
        };
      case 'info':
        return {
          bg: 'var(--status-info-bg)',
          border: 'var(--status-info-border)',
          text: 'var(--status-info-text)',
          dotColor: 'var(--status-info)',
        };
      case 'ai':
        return {
          bg: 'var(--ai-accent-bg)',
          border: 'var(--ai-accent-border)',
          text: 'var(--ai-accent-text)',
          dotColor: 'var(--ai-accent)',
        };
      default:
        return {
          bg: 'var(--status-neutral-bg)',
          border: 'var(--status-neutral-border)',
          text: 'var(--status-neutral-text)',
          dotColor: 'var(--status-neutral)',
        };
    }
  };

  const colors = getColors();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full transition-colors ${padding}`}
      style={{
        backgroundColor: colors.bg,
        borderColor: colors.border,
        borderWidth: '1px',
        color: colors.text,
      }}
    >
      {dot && (
        <span
          className="w-1.5 h-1.5 rounded-full shrink-0"
          style={{ backgroundColor: colors.dotColor }}
          aria-hidden="true"
        />
      )}
      {children}
    </span>
  );
}

export function SeverityBadge({ severity }: { severity: IncidentSeverity }) {
  switch (severity) {
    case 'CRITICAL':
      return <Badge variant="critical" dot>Critical (P0)</Badge>;
    case 'HIGH':
      return <Badge variant="warning" dot>High Priority</Badge>;
    case 'MEDIUM':
      return <Badge variant="info" dot>Medium</Badge>;
    case 'LOW':
      return <Badge variant="neutral" dot>Low (Can Wait)</Badge>;
  }
}

export function GateBadge({ decision }: { decision?: GateDecision }) {
  if (!decision) return null;
  switch (decision) {
    case 'PASS':
      return <Badge variant="success" dot>GATES PASS</Badge>;
    case 'FAIL':
      return <Badge variant="critical" dot>GATES FAIL</Badge>;
    case 'INCONCLUSIVE':
      return <Badge variant="warning" dot>INCONCLUSIVE</Badge>;
  }
}
