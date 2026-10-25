'use client';

import React from 'react';
import { OperatingMode } from '@/types';

interface OperatingModeSelectorProps {
  currentMode: OperatingMode;
  onModeChange: (mode: OperatingMode) => void;
}

export function OperatingModeSelector({ currentMode, onModeChange }: OperatingModeSelectorProps) {
  return (
    <div
      className="p-6 sm:p-8 rounded-[var(--radius-card)] border max-w-3xl"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div className="mb-6">
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Autonomous Investigation & Repair Policy
        </h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Control whether TraceFix automatically triggers fix generation and benchmark validation, or requires human authorization after initial diagnosis.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Mode 1: Automatic Mode */}
        <label
          className={`flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
            currentMode === 'AUTOMATIC' ? 'ring-2 ring-offset-1' : 'hover:bg-[var(--bg-card-subtle)]'
          }`}
          style={{
            backgroundColor: currentMode === 'AUTOMATIC' ? 'var(--mint-hero-surface)' : 'var(--bg-card)',
            borderColor: currentMode === 'AUTOMATIC' ? 'var(--mint-hero-text)' : 'var(--border-subtle)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--mint-hero-text)' }}>
                <span>⚡</span> Automatic-Review Mode
              </span>
              <input
                type="radio"
                name="operatingMode"
                value="AUTOMATIC"
                checked={currentMode === 'AUTOMATIC'}
                onChange={() => onModeChange('AUTOMATIC')}
                className="w-4 h-4 cursor-pointer accent-[var(--mint-hero-text)]"
              />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--mint-hero-subtext)' }}>
              Alert triggers investigation &rarr; Candidate fix generated immediately &rarr; Verified with deterministic k6 gates &rarr; PR prepared for human review.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] font-medium" style={{ borderColor: 'var(--mint-hero-border)', color: 'var(--mint-hero-text)' }}>
            Recommended for staging & non-critical microservices.
          </div>
        </label>

        {/* Mode 2: Manual-Review Mode */}
        <label
          className={`flex flex-col justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all ${
            currentMode === 'MANUAL' ? 'ring-2 ring-offset-1' : 'hover:bg-[var(--bg-card-subtle)]'
          }`}
          style={{
            backgroundColor: currentMode === 'MANUAL' ? 'var(--status-warning-bg)' : 'var(--bg-card)',
            borderColor: currentMode === 'MANUAL' ? 'var(--status-warning)' : 'var(--border-subtle)',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-bold flex items-center gap-2" style={{ color: 'var(--status-warning-text)' }}>
                <span>🛡️</span> Manual-Review Mode
              </span>
              <input
                type="radio"
                name="operatingMode"
                value="MANUAL"
                checked={currentMode === 'MANUAL'}
                onChange={() => onModeChange('MANUAL')}
                className="w-4 h-4 cursor-pointer accent-[var(--status-warning)]"
              />
            </div>
            <p className="text-xs leading-relaxed" style={{ color: 'var(--status-warning-text)' }}>
              Alert triggers initial investigation &rarr; Issue placed in &quot;Needs review&quot; &rarr; Human approves report &rarr; Fix generated and verified.
            </p>
          </div>
          <div className="mt-4 pt-3 border-t text-[11px] font-medium" style={{ borderColor: 'var(--status-warning-border)', color: 'var(--status-warning-text)' }}>
            Enforces explicit approval before any code modifications.
          </div>
        </label>
      </div>

      <div className="mt-6 pt-4 border-t flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          Mode changes are stored in client state (demo session adapter).
        </span>
        <span className="font-semibold text-xs px-2.5 py-0.5 rounded-full" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-secondary)' }}>
          Active: {currentMode}
        </span>
      </div>
    </div>
  );
}
