import React from 'react';
import { DemoRepository } from '@/types';

interface RepositoriesCardProps {
  repositories: DemoRepository[];
}

export function RepositoriesCard({ repositories }: RepositoriesCardProps) {
  return (
    <div
      className="p-6 rounded-[var(--radius-card)] border flex flex-col justify-between"
      style={{
        backgroundColor: 'var(--bg-card)',
        borderColor: 'var(--border-card)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      <div>
        <div className="flex items-center justify-between pb-4 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Monitored Repositories
            </h2>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Demo workspace targets
            </p>
          </div>
          <span
            className="text-xs font-semibold px-2.5 py-0.5 rounded-full border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-muted)',
            }}
          >
            Demo Data
          </span>
        </div>

        <div className="divide-y mt-2" style={{ borderColor: 'var(--border-subtle)' }}>
          {repositories.map((repo) => (
            <div
              key={repo.id}
              className="py-3 flex items-center justify-between gap-3 group transition-colors hover:bg-[var(--bg-card-subtle)] -mx-2 px-2 rounded-xl"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs uppercase shrink-0"
                  style={{
                    backgroundColor: 'var(--mint-hero-bg)',
                    color: 'var(--mint-hero-text)',
                  }}
                >
                  {repo.name.slice(0, 2)}
                </div>
                <div className="min-w-0">
                  <span className="font-semibold text-sm truncate block" style={{ color: 'var(--text-primary)' }}>
                    {repo.name}
                  </span>
                  <span className="text-xs flex items-center gap-2" style={{ color: 'var(--text-muted)' }}>
                    <span>branch: {repo.defaultBranch}</span>
                    <span>•</span>
                    <span>{repo.lastActivity}</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {repo.openIncidentsCount > 0 ? (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'var(--status-critical-bg)',
                      borderColor: 'var(--status-critical-border)',
                      color: 'var(--status-critical-text)',
                    }}
                  >
                    {repo.openIncidentsCount} issues
                  </span>
                ) : (
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full border"
                    style={{
                      backgroundColor: 'var(--status-success-bg)',
                      borderColor: 'var(--status-success-border)',
                      color: 'var(--status-success-text)',
                    }}
                  >
                    Healthy
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="pt-4 border-t mt-4 flex items-center justify-between text-xs" style={{ borderColor: 'var(--border-subtle)' }}>
        <span style={{ color: 'var(--text-muted)' }}>
          GitHub OAuth deferred for prototype
        </span>
        <a
          href="/repositories"
          className="font-medium hover:underline inline-flex items-center gap-1 cursor-pointer"
          style={{ color: 'var(--mint-hero-text)' }}
        >
          Manage repos &rarr;
        </a>
      </div>
    </div>
  );
}
