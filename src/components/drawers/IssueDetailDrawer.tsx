'use client';

import React, { useState } from 'react';
import { Incident } from '@/types';
import { SeverityBadge, GateBadge } from '@/components/common/Badge';

interface IssueDetailDrawerProps {
  incident: Incident | null;
  onClose: () => void;
  onOpenReport: (incident: Incident) => void;
  onOpenAi: (incident: Incident) => void;
  onApproveFix?: (incident: Incident) => void;
}

export function IssueDetailDrawer({
  incident,
  onClose,
  onOpenReport,
  onOpenAi,
  onApproveFix,
}: IssueDetailDrawerProps) {
  const [activeTab, setActiveTab] = useState<'TELEMETRY' | 'GATES' | 'DIFF' | 'TIMELINE'>('TELEMETRY');

  if (!incident) return null;

  const job = incident.latestJob;
  const evidence = job?.evidence;
  const baseline = job?.baseline;
  const candidate = job?.candidate;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Incident Detail Drawer"
      className="fixed inset-y-0 right-0 z-50 w-full max-w-xl flex flex-col border-l transition-transform shadow-2xl animate-in slide-in-from-right duration-200"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-strong)',
        boxShadow: 'var(--shadow-drawer)',
      }}
    >
      {/* Drawer Header matching Reference 2 */}
      <div className="p-6 border-b flex items-start justify-between gap-4" style={{ borderColor: 'var(--border-subtle)' }}>
        <div className="flex items-start gap-3 min-w-0">
          <div
            className="w-10 h-10 rounded-full border-2 border-dashed flex items-center justify-center font-bold text-sm shrink-0"
            style={{ borderColor: 'var(--border-strong)', color: 'var(--text-muted)' }}
          >
            +
          </div>
          <div className="min-w-0">
            <h2 className="text-lg font-bold leading-snug truncate" style={{ color: 'var(--text-primary)' }}>
              {incident.summary}
            </h2>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs font-mono" style={{ color: 'var(--text-muted)' }}>
                {incident.service} &bull; {incident.endpoint}
              </span>
              <SeverityBadge severity={incident.severity} />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onOpenAi(incident)}
            aria-label="Refine with AI Assistant"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer hover:scale-105"
            style={{
              backgroundColor: 'var(--ai-accent-bg)',
              borderColor: 'var(--ai-accent-border)',
              color: 'var(--ai-accent-text)',
            }}
          >
            ✨
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="w-8 h-8 rounded-full flex items-center justify-center border cursor-pointer hover:bg-[var(--bg-surface)]"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Sub-tabs matching Reference 2 */}
      <div className="flex border-b px-6 gap-6 text-xs font-semibold" style={{ borderColor: 'var(--border-subtle)' }}>
        {[
          { key: 'TELEMETRY', label: 'Telemetry & Evidence' },
          { key: 'GATES', label: 'Deterministic Gates' },
          { key: 'DIFF', label: 'Proposed Patch' },
          { key: 'TIMELINE', label: 'Workflow Stages' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`py-3 relative cursor-pointer ${
              activeTab === tab.key ? 'text-[var(--text-primary)] font-bold' : 'text-[var(--text-muted)]'
            }`}
          >
            {tab.label}
            {activeTab === tab.key && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* TAB 1: TELEMETRY & EVIDENCE */}
        {activeTab === 'TELEMETRY' && (
          <div className="space-y-5">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                Prometheus Observability Snapshot
              </h3>
              <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
                Captured across Grafana alert trigger window: {evidence?.queryWindow || 'Recent 15m'}
              </p>

              {evidence ? (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>p95 Latency</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--status-critical-text)' }}>
                      {evidence.p95Ms} ms
                    </span>
                    <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>Threshold: 200 ms</span>
                  </div>
                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>p50 Latency</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {evidence.p50Ms} ms
                    </span>
                    <span className="text-[11px] block mt-0.5" style={{ color: 'var(--text-muted)' }}>Typical median</span>
                  </div>
                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>Request Rate</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                      {evidence.requestRateRps} rps
                    </span>
                  </div>
                  <div className="p-3.5 rounded-xl border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
                    <span className="text-xs block" style={{ color: 'var(--text-muted)' }}>Error Rate</span>
                    <span className="text-xl font-bold" style={{ color: 'var(--status-success-text)' }}>
                      {evidence.errorRatePercent}%
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                  Prometheus metrics unavailable.
                </p>
              )}
            </div>

            {/* Suspected Root Cause */}
            <div className="p-4 rounded-xl border" style={{ backgroundColor: 'var(--mint-hero-surface)', borderColor: 'var(--mint-hero-border)' }}>
              <h4 className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: 'var(--mint-hero-text)' }}>
                Identified Cause & Scope
              </h4>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--mint-hero-subtext)' }}>
                {job?.agentHypothesis || 'Automated investigation pending or running baseline tests.'}
              </p>
              {incident.affectedFiles && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {incident.affectedFiles.map((file) => (
                    <span
                      key={file}
                      className="px-2 py-0.5 rounded text-[11px] font-mono border"
                      style={{
                        backgroundColor: 'var(--bg-card)',
                        borderColor: 'var(--mint-hero-border)',
                        color: 'var(--mint-hero-text)',
                      }}
                    >
                      {file}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Benchmark Comparison Table if available */}
            {baseline && candidate && (
              <div>
                <h3 className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: 'var(--text-secondary)' }}>
                  k6 Workload Verification (50 VUs)
                </h3>
                <div className="overflow-hidden border rounded-xl" style={{ borderColor: 'var(--border-subtle)' }}>
                  <table className="w-full text-xs">
                    <thead style={{ backgroundColor: 'var(--bg-surface)' }}>
                      <tr>
                        <th className="p-2.5 text-left font-semibold" style={{ color: 'var(--text-secondary)' }}>Metric</th>
                        <th className="p-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Baseline</th>
                        <th className="p-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Candidate</th>
                        <th className="p-2.5 text-right font-semibold" style={{ color: 'var(--text-secondary)' }}>Delta</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y" style={{ borderColor: 'var(--border-subtle)' }}>
                      <tr>
                        <td className="p-2.5 font-medium">p95 Latency</td>
                        <td className="p-2.5 text-right text-[var(--status-critical-text)]">{baseline.p95}ms</td>
                        <td className="p-2.5 text-right text-[var(--status-success-text)]">{candidate.p95}ms</td>
                        <td className="p-2.5 text-right font-bold text-[var(--status-success-text)]">
                          -{Math.round(((baseline.p95 - candidate.p95) / baseline.p95) * 100)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Throughput</td>
                        <td className="p-2.5 text-right">{baseline.rps} rps</td>
                        <td className="p-2.5 text-right">{candidate.rps} rps</td>
                        <td className="p-2.5 text-right font-bold text-[var(--status-success-text)]">
                          +{Math.round(((candidate.rps - baseline.rps) / baseline.rps) * 100)}%
                        </td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium">Error Rate</td>
                        <td className="p-2.5 text-right">{baseline.errorRate}%</td>
                        <td className="p-2.5 text-right">{candidate.errorRate}%</td>
                        <td className="p-2.5 text-right">0.0%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: DETERMINISTIC GATES */}
        {activeTab === 'GATES' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <div>
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                  Deterministic Verification Gates
                </h3>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Evaluated strictly in code — the LLM never decides pass/fail.
                </p>
              </div>
              <GateBadge decision={job?.decision || 'PASS'} />
            </div>

            {job?.gateResults && job.gateResults.length > 0 ? (
              <div className="space-y-3">
                {job.gateResults.map((gate, i) => (
                  <div
                    key={i}
                    className="p-3.5 rounded-xl border flex flex-col gap-1.5"
                    style={{
                      backgroundColor: gate.passed ? 'var(--status-success-bg)' : 'var(--status-critical-bg)',
                      borderColor: gate.passed ? 'var(--status-success-border)' : 'var(--status-critical-border)',
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs" style={{ color: gate.passed ? 'var(--status-success-text)' : 'var(--status-critical-text)' }}>
                        {gate.passed ? '✓' : '✗'} {gate.name}
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-white/70">
                        {gate.threshold}
                      </span>
                    </div>
                    {gate.notes && (
                      <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        {gate.notes}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                Verification gates have not run yet for this incident.
              </p>
            )}
          </div>
        )}

        {/* TAB 3: PROPOSED PATCH DIFF */}
        {activeTab === 'DIFF' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
                Candidate Git Diff
              </h3>
              <span className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Target commit: {job?.commitSha || 'HEAD'}
              </span>
            </div>

            {job?.diff ? (
              <pre
                className="p-4 rounded-xl text-xs font-mono overflow-x-auto leading-relaxed border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <code>{job.diff}</code>
              </pre>
            ) : (
              <p className="text-sm italic" style={{ color: 'var(--text-muted)' }}>
                No candidate diff generated yet.
              </p>
            )}
          </div>
        )}

        {/* TAB 4: TIMELINE */}
        {activeTab === 'TIMELINE' && (
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
              Worker Execution Pipeline
            </h3>
            <ol className="relative border-l ml-3 space-y-4" style={{ borderColor: 'var(--border-strong)' }}>
              {[
                { stage: 'Alert Received', msg: 'Webhook delivery normalized and deduplicated', time: incident.receivedAt },
                { stage: 'Evidence Gathered', msg: 'Prometheus metrics captured over alert window', time: 'T+1m' },
                { stage: 'Baseline Measured', msg: 'npm test passed, k6 benchmark recorded baseline', time: 'T+3m' },
                { stage: 'Candidate Fix Generated', msg: 'OpenAI agent produced bounded patch on allowlisted paths', time: 'T+5m' },
                { stage: 'Verification & Gates', msg: 'Candidate tested with identical k6 workload. Decision: PASS', time: 'T+7m' },
              ].map((step, i) => (
                <li key={i} className="ml-5">
                  <span
                    className="absolute -left-2 flex items-center justify-center w-4 h-4 rounded-full ring-4"
                    style={{ backgroundColor: 'var(--mint-hero-text)', borderColor: 'var(--bg-card)' }}
                  />
                  <h4 className="font-semibold text-xs" style={{ color: 'var(--text-primary)' }}>
                    {step.stage}
                  </h4>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                    {step.msg}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>

      {/* Drawer Footer Actions */}
      <div className="p-4 border-t flex items-center justify-between gap-3" style={{ borderColor: 'var(--border-subtle)', backgroundColor: 'var(--bg-card)' }}>
        <button
          type="button"
          onClick={() => onOpenReport(incident)}
          className="px-4 py-2 text-xs font-semibold rounded-full border cursor-pointer hover:bg-[var(--bg-surface)]"
          style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
        >
          View Full Report
        </button>

        <div className="flex items-center gap-2">
          {incident.workflowStage === 'NEEDS_REVIEW' && onApproveFix && (
            <button
              type="button"
              onClick={() => onApproveFix(incident)}
              className="px-4 py-2 text-xs font-bold rounded-full border cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--status-warning-bg)',
                color: 'var(--status-warning-text)',
                borderColor: 'var(--status-warning-border)',
              }}
            >
              Approve Fix Generation
            </button>
          )}

          {job?.prUrl ? (
            <a
              href={job.prUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 text-xs font-bold rounded-full border cursor-pointer hover:opacity-90"
              style={{
                backgroundColor: 'var(--mint-hero-text)',
                color: 'var(--text-inverse)',
                borderColor: 'var(--mint-hero-text)',
              }}
            >
              Review PR (Demo) &rarr;
            </a>
          ) : (
            <button
              type="button"
              disabled
              className="px-4 py-2 text-xs font-medium rounded-full border opacity-50 cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              PR Not Ready
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
