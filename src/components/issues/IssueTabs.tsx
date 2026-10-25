'use client';

import React from 'react';
import { FilterStatus } from '@/types';

interface IssueTabsProps {
  activeTab: FilterStatus;
  onTabChange: (tab: FilterStatus) => void;
  counts: Record<FilterStatus, number>;
}

export function IssueTabs({ activeTab, onTabChange, counts }: IssueTabsProps) {
  const tabs: { key: FilterStatus; label: string }[] = [
    { key: 'ALL', label: 'All issues' },
    { key: 'INVESTIGATING', label: 'Investigating' },
    { key: 'FIX_IN_PROGRESS', label: 'Fix in progress' },
    { key: 'NEEDS_REVIEW', label: 'Needs review' },
    { key: 'PR_READY', label: 'PR ready (demo)' },
    { key: 'RESOLVED', label: 'Resolved' },
  ];

  return (
    <div
      className="flex items-center gap-6 overflow-x-auto pb-1 border-b no-scrollbar"
      style={{ borderColor: 'var(--border-subtle)' }}
    >
      {tabs.map((tab) => {
        const isActive = activeTab === tab.key;
        const count = counts[tab.key] ?? 0;

        return (
          <button
            key={tab.key}
            type="button"
            onClick={() => onTabChange(tab.key)}
            className={`flex items-center gap-2 pb-3.5 text-sm font-semibold transition-all cursor-pointer whitespace-nowrap relative ${
              isActive ? 'text-[var(--text-primary)]' : 'text-[var(--text-muted)] hover:text-[var(--text-secondary)]'
            }`}
          >
            <span>{tab.label}</span>
            <span
              className={`text-xs px-2 py-0.5 rounded-full transition-colors ${
                isActive
                  ? 'bg-[var(--text-primary)] text-[var(--text-inverse)]'
                  : 'bg-[var(--bg-surface)] text-[var(--text-muted)]'
              }`}
            >
              {count}
            </span>

            {/* Active bottom border indicator matching Reference 2 */}
            {isActive && (
              <span
                className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                style={{ backgroundColor: 'var(--text-primary)' }}
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
