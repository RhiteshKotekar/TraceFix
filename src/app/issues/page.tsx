'use client';

import React, { useState, useMemo } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { IssueTabs } from '@/components/issues/IssueTabs';
import { IssueCard } from '@/components/issues/IssueCard';
import { IssueGroup } from '@/components/issues/IssueGroup';
import { IssueDetailDrawer } from '@/components/drawers/IssueDetailDrawer';
import { ReportDrawer } from '@/components/drawers/ReportDrawer';
import { AiRefinementDrawer } from '@/components/drawers/AiRefinementDrawer';
import { EmptyState } from '@/components/common/EmptyState';
import { MOCK_INCIDENTS, INITIAL_OPERATING_MODE } from '@/data/mockData';
import { Incident, FilterStatus, OperatingMode } from '@/types';

export default function IssuesPage() {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [activeTab, setActiveTab] = useState<FilterStatus>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(INITIAL_OPERATING_MODE);

  // Drawer state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [reportIncident, setReportIncident] = useState<Incident | null>(null);
  const [aiIncident, setAiIncident] = useState<Incident | null>(null);

  // Tab counts
  const tabCounts = useMemo(() => {
    return {
      ALL: incidents.length,
      INVESTIGATING: incidents.filter((i) => i.workflowStage === 'INVESTIGATING').length,
      FIX_IN_PROGRESS: incidents.filter((i) => i.workflowStage === 'FIX_IN_PROGRESS').length,
      NEEDS_REVIEW: incidents.filter((i) => i.workflowStage === 'NEEDS_REVIEW').length,
      PR_READY: incidents.filter((i) => i.workflowStage === 'PR_READY').length,
      RESOLVED: incidents.filter((i) => i.workflowStage === 'RESOLVED').length,
      CRITICAL: incidents.filter((i) => i.severity === 'CRITICAL').length,
    };
  }, [incidents]);

  // Filtered incidents
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc) => {
      // Tab filter
      if (activeTab === 'INVESTIGATING' && inc.workflowStage !== 'INVESTIGATING') return false;
      if (activeTab === 'FIX_IN_PROGRESS' && inc.workflowStage !== 'FIX_IN_PROGRESS') return false;
      if (activeTab === 'NEEDS_REVIEW' && inc.workflowStage !== 'NEEDS_REVIEW') return false;
      if (activeTab === 'PR_READY' && inc.workflowStage !== 'PR_READY') return false;
      if (activeTab === 'RESOLVED' && inc.workflowStage !== 'RESOLVED') return false;
      if (activeTab === 'CRITICAL' && inc.severity !== 'CRITICAL') return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          inc.summary.toLowerCase().includes(q) ||
          inc.service.toLowerCase().includes(q) ||
          inc.endpoint.toLowerCase().includes(q) ||
          inc.alertName.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [incidents, activeTab, searchQuery]);

  // Grouped by priority/state
  const criticalGroup = filteredIncidents.filter(
    (i) => i.severity === 'CRITICAL' || i.workflowStage === 'NEEDS_REVIEW'
  );
  const activeGroup = filteredIncidents.filter(
    (i) =>
      i.severity !== 'CRITICAL' &&
      i.workflowStage !== 'NEEDS_REVIEW' &&
      i.workflowStage !== 'RESOLVED' &&
      i.severity !== 'LOW'
  );
  const lowOrResolvedGroup = filteredIncidents.filter(
    (i) => i.workflowStage === 'RESOLVED' || i.severity === 'LOW'
  );

  const handleApproveFix = (inc: Incident) => {
    setIncidents((prev) =>
      prev.map((item) =>
        item.id === inc.id
          ? {
              ...item,
              workflowStage: 'FIX_IN_PROGRESS',
              status: 'APPROVED',
              latestJob: item.latestJob
                ? {
                    ...item.latestJob,
                    status: 'RUNNING',
                    stage: 'BASELINE',
                    progressMessage: 'Fix generation authorized. Running candidate k6 benchmark...',
                  }
                : undefined,
            }
          : item
      )
    );
    if (selectedIncident?.id === inc.id) {
      setSelectedIncident((prev) => (prev ? { ...prev, workflowStage: 'FIX_IN_PROGRESS', status: 'APPROVED' } : null));
    }
  };

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Reference 2 Sky Blue Backdrop Curve */}
      <div
        className="absolute -top-32 -left-32 w-[600px] h-[600px] rounded-full pointer-events-none opacity-40 blur-2xl"
        style={{ backgroundColor: 'var(--sky-accent)' }}
        aria-hidden="true"
      />

      {/* Top Navigation */}
      <TopNav
        operatingMode={operatingMode}
        onToggleMode={() => setOperatingMode((m) => (m === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC'))}
      />

      {/* Main Sheet Container matching Reference 2 */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 relative z-10">
        <div
          className="p-6 sm:p-10 rounded-[var(--radius-sheet)] border transition-all"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {/* Header & Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
                  Incident Center
                </h1>
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                  style={{
                    backgroundColor: 'var(--bg-surface)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-muted)',
                  }}
                >
                  Demo Workspace
                </span>
              </div>
              <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                Investigate observability alerts, inspect deterministic gate outcomes, and review candidate code repairs.
              </p>
            </div>

            {/* Quick Search */}
            <div className="w-full sm:w-72 relative">
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Filter by endpoint or service..."
                className="w-full pl-9 pr-4 py-2 text-xs rounded-full border outline-hidden transition-all shadow-xs"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
              <span className="absolute left-3 top-2.5 text-xs text-[var(--text-muted)] pointer-events-none">
                🔍
              </span>
            </div>
          </div>

          {/* Issue Tabs Filter */}
          <div className="mb-8">
            <IssueTabs
              activeTab={activeTab}
              onTabChange={setActiveTab}
              counts={tabCounts}
            />
          </div>

          {/* Issue Cards Grid */}
          {filteredIncidents.length === 0 ? (
            <EmptyState
              title="No matching incidents found"
              description="No alerts or investigations match the selected filter criteria."
              actionLabel="Reset Filters"
              onAction={() => {
                setActiveTab('ALL');
                setSearchQuery('');
              }}
            />
          ) : (
            <div className="space-y-8">
              {/* Group 1: Critical & Action Required */}
              {criticalGroup.length > 0 && (
                <IssueGroup
                  title="Critical & Action Required"
                  count={criticalGroup.length}
                  icon={
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                      style={{ backgroundColor: 'var(--status-critical-bg)', color: 'var(--status-critical)' }}
                    >
                      ⚡
                    </div>
                  }
                >
                  {criticalGroup.map((inc) => (
                    <IssueCard
                      key={inc.id}
                      incident={inc}
                      isSelected={selectedIncident?.id === inc.id}
                      onSelect={(i) => setSelectedIncident(i)}
                      onOpenReport={(i) => setReportIncident(i)}
                      onOpenAi={(i) => setAiIncident(i)}
                      onApproveFix={handleApproveFix}
                    />
                  ))}
                </IssueGroup>
              )}

              {/* Group 2: Active Workflows */}
              {activeGroup.length > 0 && (
                <IssueGroup
                  title="In Progress Investigations & Verifications"
                  count={activeGroup.length}
                  icon={
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                      style={{ backgroundColor: 'var(--sky-accent-bg)', color: 'var(--sky-accent-text)' }}
                    >
                      🔄
                    </div>
                  }
                >
                  {activeGroup.map((inc) => (
                    <IssueCard
                      key={inc.id}
                      incident={inc}
                      isSelected={selectedIncident?.id === inc.id}
                      onSelect={(i) => setSelectedIncident(i)}
                      onOpenReport={(i) => setReportIncident(i)}
                      onOpenAi={(i) => setAiIncident(i)}
                      onApproveFix={handleApproveFix}
                    />
                  ))}
                </IssueGroup>
              )}

              {/* Group 3: Low or Resolved */}
              {lowOrResolvedGroup.length > 0 && (
                <IssueGroup
                  title="Can Wait / Resolved"
                  count={lowOrResolvedGroup.length}
                  icon={
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
                      style={{ backgroundColor: 'var(--status-success-bg)', color: 'var(--status-success)' }}
                    >
                      ✓
                    </div>
                  }
                >
                  {lowOrResolvedGroup.map((inc) => (
                    <IssueCard
                      key={inc.id}
                      incident={inc}
                      isSelected={selectedIncident?.id === inc.id}
                      onSelect={(i) => setSelectedIncident(i)}
                      onOpenReport={(i) => setReportIncident(i)}
                      onOpenAi={(i) => setAiIncident(i)}
                      onApproveFix={handleApproveFix}
                    />
                  ))}
                </IssueGroup>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Slide-over Drawers */}
      <IssueDetailDrawer
        incident={selectedIncident}
        onClose={() => setSelectedIncident(null)}
        onOpenReport={(inc) => {
          setSelectedIncident(null);
          setReportIncident(inc);
        }}
        onOpenAi={(inc) => {
          setSelectedIncident(null);
          setAiIncident(inc);
        }}
        onApproveFix={handleApproveFix}
      />

      <ReportDrawer
        incident={reportIncident}
        onClose={() => setReportIncident(null)}
      />

      <AiRefinementDrawer
        incident={aiIncident}
        onClose={() => setAiIncident(null)}
      />
    </div>
  );
}
