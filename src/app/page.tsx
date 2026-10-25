'use client';

import React, { useState, useMemo } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { HeroBanner } from '@/components/dashboard/HeroBanner';
import { MetricCards } from '@/components/dashboard/MetricCards';
import { RecentIncidentsCard } from '@/components/dashboard/RecentIncidentsCard';
import { RepositoriesCard } from '@/components/dashboard/RepositoriesCard';
import { ValidationResultsCard } from '@/components/dashboard/ValidationResultsCard';
import { IssueDetailDrawer } from '@/components/drawers/IssueDetailDrawer';
import { ReportDrawer } from '@/components/drawers/ReportDrawer';
import { AiRefinementDrawer } from '@/components/drawers/AiRefinementDrawer';
import { MOCK_INCIDENTS, DEMO_REPOSITORIES, INITIAL_OPERATING_MODE } from '@/data/mockData';
import { Incident, OperatingMode } from '@/types';

export default function DashboardPage() {
  const [incidents, setIncidents] = useState<Incident[]>(MOCK_INCIDENTS);
  const [repositories] = useState(DEMO_REPOSITORIES);
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(INITIAL_OPERATING_MODE);
  const [searchQuery, setSearchQuery] = useState('');

  // Drawers state
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [reportIncident, setReportIncident] = useState<Incident | null>(null);
  const [aiIncident, setAiIncident] = useState<Incident | null>(null);

  // Derived counts
  const filteredIncidents = useMemo(() => {
    if (!searchQuery.trim()) return incidents;
    const q = searchQuery.toLowerCase();
    return incidents.filter(
      (inc) =>
        inc.summary.toLowerCase().includes(q) ||
        inc.service.toLowerCase().includes(q) ||
        inc.endpoint.toLowerCase().includes(q) ||
        inc.alertName.toLowerCase().includes(q)
    );
  }, [incidents, searchQuery]);

  const openCount = incidents.filter((i) => i.workflowStage !== 'RESOLVED').length;
  const criticalCount = incidents.filter((i) => i.severity === 'CRITICAL' && i.workflowStage !== 'RESOLVED').length;
  const inProgressCount = incidents.filter((i) => i.workflowStage === 'INVESTIGATING' || i.workflowStage === 'FIX_IN_PROGRESS').length;
  const awaitingReviewCount = incidents.filter((i) => i.workflowStage === 'PR_READY' || i.workflowStage === 'NEEDS_REVIEW').length;

  const highlightedIncident = incidents.find((i) => i.latestJob?.decision === 'PASS') || incidents[0];

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
                    progressMessage: 'Fix generation approved. Measuring baseline k6 workload...',
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

  const handleToggleMode = () => {
    setOperatingMode((prev) => (prev === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC'));
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Top Navigation */}
      <TopNav
        operatingMode={operatingMode}
        onToggleMode={handleToggleMode}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6">
        {/* Mint Hero Card matching Reference 1 */}
        <HeroBanner
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          operatingMode={operatingMode}
        />

        {/* Metric Cards KPI */}
        <MetricCards
          openCount={openCount}
          criticalCount={criticalCount}
          inProgressCount={inProgressCount}
          awaitingReviewCount={awaitingReviewCount}
        />

        {/* Operational Panels Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Recent Incidents (2 cols on lg) */}
          <div className="lg:col-span-2">
            <RecentIncidentsCard
              incidents={filteredIncidents}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenReport={(inc) => setReportIncident(inc)}
              onOpenAi={(inc) => setAiIncident(inc)}
            />
          </div>

          {/* Right Column: Repositories & Gate Results */}
          <div className="space-y-6">
            <RepositoriesCard repositories={repositories} />
            <ValidationResultsCard
              highlightedIncident={highlightedIncident}
              onOpenReport={(inc) => setReportIncident(inc)}
            />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full py-6 text-center text-xs border-t mt-12" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>TraceFix &bull; Observability-Driven Automated Code Repair</span>
          <span className="text-[11px] px-2 py-0.5 rounded-full border" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
            GitHub Integration Deferred &bull; Demo Prototype
          </span>
        </div>
      </footer>

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
