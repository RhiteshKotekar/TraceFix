'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { DEMO_REPOSITORIES, INITIAL_OPERATING_MODE } from '@/data/mockData';
import { OperatingMode } from '@/types';

export default function RepositoriesPage() {
  const [repositories] = useState(DEMO_REPOSITORIES);
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(INITIAL_OPERATING_MODE);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Top Nav */}
      <TopNav
        operatingMode={operatingMode}
        onToggleMode={() => setOperatingMode((m) => (m === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC'))}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Configured Repositories
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              Frontend Demo Adapter
            </span>
          </div>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Repositories targeted by TraceFix for automated performance investigation, baseline measurement, and candidate patch generation.
          </p>
        </div>

        {/* Repository Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="p-6 rounded-[var(--radius-card)] border flex flex-col justify-between"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-card)',
                boxShadow: 'var(--shadow-card)',
              }}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm uppercase"
                    style={{
                      backgroundColor: 'var(--mint-hero-bg)',
                      color: 'var(--mint-hero-text)',
                    }}
                  >
                    {repo.name.slice(0, 2)}
                  </div>
                  <span
                    className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: repo.openIncidentsCount > 0 ? 'var(--status-critical-bg)' : 'var(--status-success-bg)',
                      borderColor: repo.openIncidentsCount > 0 ? 'var(--status-critical-border)' : 'var(--status-success-border)',
                      color: repo.openIncidentsCount > 0 ? 'var(--status-critical-text)' : 'var(--status-success-text)',
                    }}
                  >
                    {repo.openIncidentsCount > 0 ? `${repo.openIncidentsCount} Open Incidents` : 'Healthy'}
                  </span>
                </div>

                <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                  {repo.name}
                </h3>
                <p className="text-xs font-mono mb-4" style={{ color: 'var(--text-muted)' }}>
                  owner: {repo.owner} &bull; default: {repo.defaultBranch}
                </p>

                <div className="space-y-2 text-xs border-t pt-3" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Active PRs</span>
                    <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{repo.openPrCount} demo PR</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Last Activity</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{repo.lastActivity}</span>
                  </div>
                  <div className="flex justify-between">
                    <span style={{ color: 'var(--text-muted)' }}>Target Config</span>
                    <span className="font-mono text-[11px]" style={{ color: 'var(--text-secondary)' }}>TARGET_REPO_URL</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t flex items-center justify-between" style={{ borderColor: 'var(--border-subtle)' }}>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Demo fixture</span>
                <a
                  href="/issues"
                  className="text-xs font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  style={{ color: 'var(--mint-hero-text)' }}
                >
                  View incidents &rarr;
                </a>
              </div>
            </div>
          ))}

          {/* Deferred GitHub Integration Card */}
          <div
            className="p-6 rounded-[var(--radius-card)] border border-dashed flex flex-col justify-between text-center items-center"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-strong)',
            }}
          >
            <div className="my-auto py-6">
              <div
                className="w-12 h-12 rounded-full mx-auto flex items-center justify-center mb-3 text-lg"
                style={{ backgroundColor: 'var(--bg-card)', color: 'var(--text-muted)' }}
              >
                🐙
              </div>
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                Connect GitHub Repository
              </h3>
              <p className="text-xs mt-1 max-w-xs mx-auto" style={{ color: 'var(--text-muted)' }}>
                OAuth and GitHub App integration is explicitly deferred for this frontend phase.
              </p>
            </div>
            <button
              disabled
              className="w-full py-2 text-xs font-semibold rounded-full border opacity-50 cursor-not-allowed"
              style={{
                backgroundColor: 'var(--bg-card)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              GitHub Integration Coming Later
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
