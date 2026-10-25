import React from 'react';

interface EmptyStateProps {
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  icon?: React.ReactNode;
}

export function EmptyState({ title, description, actionLabel, onAction, icon }: EmptyStateProps) {
  return (
    <div
      role="status"
      className="flex flex-col items-center justify-center p-12 text-center border border-dashed rounded-[var(--radius-card)]"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-strong)',
      }}
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--text-muted)' }}
      >
        {icon || (
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        )}
      </div>
      <h3 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {title}
      </h3>
      <p className="mt-1 text-sm max-w-sm" style={{ color: 'var(--text-muted)' }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-5 px-4 py-2 text-sm font-medium rounded-full cursor-pointer transition-opacity hover:opacity-90 active:scale-98"
          style={{
            backgroundColor: 'var(--mint-hero-text)',
            color: 'var(--text-inverse)',
          }}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
