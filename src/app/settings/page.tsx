'use client';

import React, { useState } from 'react';
import { TopNav } from '@/components/layout/TopNav';
import { OperatingModeSelector } from '@/components/settings/OperatingModeSelector';
import { INITIAL_OPERATING_MODE } from '@/data/mockData';
import { OperatingMode } from '@/types';

export default function SettingsPage() {
  const [operatingMode, setOperatingMode] = useState<OperatingMode>(INITIAL_OPERATING_MODE);
  const [savedBanner, setSavedBanner] = useState(false);

  const handleModeChange = (mode: OperatingMode) => {
    setOperatingMode(mode);
    setSavedBanner(true);
    setTimeout(() => setSavedBanner(false), 3000);
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: 'var(--bg-page)' }}>
      {/* Top Nav */}
      <TopNav
        operatingMode={operatingMode}
        onToggleMode={() => handleModeChange(operatingMode === 'AUTOMATIC' ? 'MANUAL' : 'AUTOMATIC')}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 space-y-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight" style={{ color: 'var(--text-primary)' }}>
              Platform Settings
            </h1>
            <span
              className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-muted)',
              }}
            >
              TraceFix Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
            Configure investigation policies, telemetry webhook ingest endpoints, and deterministic validation gates.
          </p>
        </div>

        {savedBanner && (
          <div
            className="p-3.5 rounded-xl border flex items-center justify-between text-xs font-semibold animate-in fade-in"
            style={{
              backgroundColor: 'var(--status-success-bg)',
              borderColor: 'var(--status-success-border)',
              color: 'var(--status-success-text)',
            }}
          >
            <span>✓ Operating mode updated successfully to {operatingMode} mode.</span>
            <button onClick={() => setSavedBanner(false)} className="cursor-pointer">✕</button>
          </div>
        )}

        {/* Operating Mode Selector */}
        <OperatingModeSelector
          currentMode={operatingMode}
          onModeChange={handleModeChange}
        />

        {/* Telemetry & Webhook Integration Info */}
        <div
          className="p-6 sm:p-8 rounded-[var(--radius-card)] border max-w-3xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Grafana Alert Webhook Ingest
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              TraceFix receives unified alerting webhooks via bearer secret authentication. Alert intake creates an incident; it never authorizes code execution.
            </p>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Webhook Route</span>
              <code className="font-mono px-2 py-0.5 rounded bg-white border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--mint-hero-text)' }}>
                POST /api/webhooks/grafana
              </code>
            </div>

            <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Authentication</span>
              <span className="font-mono text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Authorization: Bearer $GRAFANA_WEBHOOK_SECRET
              </span>
            </div>

            <div className="p-3 rounded-xl border flex items-center justify-between" style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-subtle)' }}>
              <span className="font-semibold" style={{ color: 'var(--text-secondary)' }}>Target Service Filter</span>
              <code className="font-mono px-2 py-0.5 rounded bg-white border" style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}>
                shop-backend
              </code>
            </div>
          </div>
        </div>

        {/* Deterministic Validation Gates Configuration */}
        <div
          className="p-6 sm:p-8 rounded-[var(--radius-card)] border max-w-3xl"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-card)',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          <div className="mb-4">
            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
              Deterministic Validation Gates (Code-Enforced)
            </h2>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
              Thresholds evaluated by the worker on candidate commits under identical k6 workloads. The LLM never decides PASS or FAIL.
            </p>
          </div>

          <div className="divide-y text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>Latency Improvement Threshold</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Candidate p95 must improve relative to baseline under identical k6 load</span>
              </div>
              <span className="font-mono font-bold px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'var(--mint-hero-surface)', borderColor: 'var(--mint-hero-border)', color: 'var(--mint-hero-text)' }}>
                &ge; 20%
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>Error Rate Cap</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Candidate run must not exceed maximum 5xx/4xx failure threshold</span>
              </div>
              <span className="font-mono font-bold px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'var(--mint-hero-surface)', borderColor: 'var(--mint-hero-border)', color: 'var(--mint-hero-text)' }}>
                &le; 1.0%
              </span>
            </div>

            <div className="py-3 flex items-center justify-between">
              <div>
                <span className="font-bold block" style={{ color: 'var(--text-primary)' }}>Test Suite Integrity Gate</span>
                <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>All existing unit & integration tests must pass without regressions</span>
              </div>
              <span className="font-mono font-bold px-2.5 py-1 rounded-full border" style={{ backgroundColor: 'var(--mint-hero-surface)', borderColor: 'var(--mint-hero-border)', color: 'var(--mint-hero-text)' }}>
                100% PASS
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
