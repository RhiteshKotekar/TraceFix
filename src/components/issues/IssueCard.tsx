'use client';

import React from 'react';
import { Incident } from '@/types';
import { SeverityBadge } from '@/components/common/Badge';

interface IssueCardProps {
  incident: Incident;
  isSelected?: boolean;
  onSelect: (incident: Incident) => void;
  onOpenReport: (incident: Incident) => void;
  onOpenAi: (incident: Incident) => void;
  onApproveFix?: (incident: Incident) => void;
}

export function IssueCard({
  incident,
  isSelected = false,
  onSelect,
  onOpenReport,
  onOpenAi,
  onApproveFix,
}: IssueCardProps) {
  const getStatusBarColor = () => {
    switch (incident.workflowStage) {
      case 'PR_READY':
      case 'RESOLVED':
        return 'var(--status-success)';
      case 'NEEDS_REVIEW':
      case 'FIX_IN_PROGRESS':
        return 'var(--status-warning)';
      case 'INVESTIGATING':
        return 'var(--status-info)';
      case 'FAILED':
        return 'var(--status-critical)';
      default:
        return 'var(--status-neutral)';
    }
  };

  const getWorkflowStageLabel = () => {
    switch (incident.workflowStage) {
      case 'PR_READY':
        return 'PR Ready (Demo)';
      case 'NEEDS_REVIEW':
        return 'Needs Approval';
      case 'FIX_IN_PROGRESS':
        return 'Fix in Progress';
      case 'INVESTIGATING':
        return 'Investigating';
      case 'RESOLVED':
        return 'Resolved';
      case 'FAILED':
        return 'Gates Failed';
      default:
        return 'Detected';
    }
  };

  return (
    <div
      className={`relative flex flex-col justify-between p-5 rounded-[var(--radius-card)] border transition-all group ${
        isSelected ? 'ring-2 ring-offset-2' : 'hover:-translate-y-1'
      }`}
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: isSelected ? 'var(--mint-hero-text)' : 'var(--border-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Top Notification Dot if Critical or Needs Review */}
      {(incident.severity === 'CRITICAL' || incident.workflowStage === 'NEEDS_REVIEW') && (
        <span
          className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full ring-2"
          style={{ backgroundColor: 'var(--status-critical)', borderColor: 'var(--bg-card)' }}
          title="Attention required"
        />
      )}

      <div>
        {/* Top Header: Dashed circle + AI/Status action icon */}
        <div className="flex items-center justify-between mb-3">
          <div
            className="w-8 h-8 rounded-full border-2 border-dashed flex items-center justify-center text-xs font-semibold"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
          >
            +
          </div>

          <div className="flex items-center gap-1.5">
            {/* Circular AI Refinement Button */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onOpenAi(incident);
              }}
              aria-label="Refine fix with AI"
              title="Open AI refinement drawer"
              className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer transition-transform hover:scale-110 active:scale-95 shadow-xs"
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

        {/* Title */}
        <button
          onClick={() => onSelect(incident)}
          className="text-left font-bold text-base hover:underline block w-full mb-2 cursor-pointer line-clamp-2"
          style={{ color: 'var(--text-primary)' }}
        >
          {incident.summary}
        </button>

        {/* Metadata Pills */}
        <div className="flex flex-wrap items-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-secondary)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {incident.endpoint}
          </span>
          <SeverityBadge severity={incident.severity} />
          <span
            className="text-[11px] font-medium px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-muted)',
            }}
          >
            {incident.provenance === 'TRACEFIX_GENERATED' ? 'Demo: TraceFix' : 'Demo: External'}
          </span>
        </div>
      </div>

      {/* Bottom Area: Actions & Horizontal Status Line */}
      <div className="mt-2 pt-3 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-center justify-between gap-2 mb-3">
          <button
            type="button"
            onClick={() => onOpenReport(incident)}
            className="text-xs font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            View report &rarr;
          </button>

          {/* Conditional Action: Review PR / Approve / Status */}
          {incident.workflowStage === 'PR_READY' && (
            <button
              type="button"
              onClick={() => onSelect(incident)}
              className="px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--mint-hero-text)',
                color: 'var(--text-inverse)',
                borderColor: 'var(--mint-hero-text)',
              }}
            >
              Review PR (Demo)
            </button>
          )}

          {incident.workflowStage === 'NEEDS_REVIEW' && onApproveFix && (
            <button
              type="button"
              onClick={() => onApproveFix(incident)}
              className="px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-opacity hover:opacity-90"
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                color: 'var(--status-warning-text)',
                borderColor: 'var(--status-warning-border)',
              }}
            >
              Approve Fix
            </button>
          )}

          {incident.workflowStage === 'FIX_IN_PROGRESS' && (
            <span
              className="text-xs font-medium animate-pulse"
              style={{ color: 'var(--status-warning-text)' }}
            >
              Benchmarking...
            </span>
          )}

          {incident.workflowStage === 'INVESTIGATING' && (
            <span
              className="text-xs font-medium"
              style={{ color: 'var(--status-info-text)' }}
            >
              Analyzing trace...
            </span>
          )}
        </div>

        {/* Bottom Horizontal Workflow Status Bar */}
        <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--bg-surface)' }}>
          <div
            className="h-full rounded-full transition-all"
            style={{
              backgroundColor: getStatusBarColor(),
              width:
                incident.workflowStage === 'RESOLVED' || incident.workflowStage === 'PR_READY'
                  ? '100%'
                  : incident.workflowStage === 'FIX_IN_PROGRESS'
                  ? '65%'
                  : incident.workflowStage === 'NEEDS_REVIEW'
                  ? '40%'
                  : '20%',
            }}
          />
        </div>
      </div>
    </div>
  );
}
