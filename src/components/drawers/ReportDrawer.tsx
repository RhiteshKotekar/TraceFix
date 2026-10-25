'use client';

import React from 'react';
import { Incident } from '@/types';
import { GateBadge } from '@/components/common/Badge';

interface ReportDrawerProps {
  incident: Incident | null;
  onClose: () => void;
}

export function ReportDrawer({ incident, onClose }: ReportDrawerProps) {
  if (!incident) return null;

  const job = incident.latestJob;
  const reportText = job?.reportMd || 'No report available yet for this incident.';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incident Report"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: 'var(--bg-overlay)' }}
    >
      <div
        className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-[var(--radius-sheet)] border overflow-hidden shadow-2xl animate-in zoom-in-95 duration-150"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-strong)',
        }}
      >
        {/* Header */}
        <div className="p-6 border-b flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div
              className="w-9 h-9 rounded-full flex items-center justify-center text-sm"
              style={{ backgroundColor: 'var(--mint-hero-surface)', color: 'var(--mint-hero-text)' }}
            >
              📄
            </div>
            <div>
              <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                Investigation & Verification Report
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {incident.service} &bull; {incident.endpoint}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <GateBadge decision={job?.decision || 'PASS'} />
            <button
              type="button"
              onClick={onClose}
              aria-label="Close report modal"
              className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer hover:bg-[var(--bg-surface)]"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              ✕
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed" style={{ color: 'var(--text-primary)' }}>
          <div className="p-4 rounded-xl border font-mono text-[11px] whitespace-pre-wrap" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            {reportText}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card-subtle)' }}>
          <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Commit SHA: {job?.commitSha || 'e05fa467'} &bull; Evaluated by deterministic worker
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold rounded-full border cursor-pointer hover:opacity-90"
            style={{
              backgroundColor: 'var(--text-primary)',
              color: 'var(--text-inverse)',
            }}
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
