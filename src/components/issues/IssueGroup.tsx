import React from 'react';

interface IssueGroupProps {
  title: string;
  count: number;
  icon?: React.ReactNode;
  children: React.ReactNode;
}

export function IssueGroup({ title, count, icon, children }: IssueGroupProps) {
  return (
    <section className="mb-8">
      {/* Group Title with Tag Icon matching Reference 2 */}
      <div className="flex items-center gap-2 mb-4">
        {icon || (
          <div
            className="w-5 h-5 rounded-md flex items-center justify-center text-xs"
            style={{ backgroundColor: 'var(--sky-accent-bg)', color: 'var(--sky-accent-text)' }}
          >
            📋
          </div>
        )}
        <h2 className="text-sm font-bold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>
          {title}
        </h2>
        <span
          className="text-xs px-2 py-0.5 rounded-full font-semibold"
          style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}
        >
          {count}
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {children}
      </div>
    </section>
  );
}
