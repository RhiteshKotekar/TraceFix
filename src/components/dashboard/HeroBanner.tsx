'use client';

import React from 'react';
import { OperatingMode } from '@/types';

interface HeroBannerProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  operatingMode: OperatingMode;
}

export function HeroBanner({ searchQuery, onSearchChange, operatingMode }: HeroBannerProps) {
  return (
    <div
      className="relative overflow-hidden w-full rounded-[var(--radius-sheet)] p-8 sm:p-12 mb-8 border transition-all"
      style={{
        backgroundColor: 'var(--mint-hero-bg)',
        borderColor: 'var(--mint-hero-border)',
        boxShadow: 'var(--shadow-card)',
      }}
    >
      {/* Decorative organic background ribbon shapes matching Reference 1 */}
      <div
        className="absolute -top-16 -right-16 w-80 h-80 rounded-full opacity-40 pointer-events-none"
        style={{ backgroundColor: 'var(--mint-hero-surface)' }}
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-20 -left-12 w-96 h-96 rounded-full opacity-30 pointer-events-none"
        style={{ backgroundColor: 'var(--mint-hero-surface)' }}
        aria-hidden="true"
      />

      <div className="relative z-10 max-w-2xl mx-auto text-center flex flex-col items-center">
        {/* Operating Mode Status Pill */}
        <div
          className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold mb-4 border"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--mint-hero-border)',
            color: 'var(--mint-hero-text)',
          }}
        >
          <span
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: operatingMode === 'AUTOMATIC' ? 'var(--status-success)' : 'var(--status-warning)',
            }}
          />
          {operatingMode === 'AUTOMATIC'
            ? 'Automatic Mode Active: Fixes generated & verified immediately'
            : 'Manual Mode Active: Fix generation requires human review'}
        </div>

        <h1
          className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight mb-3"
          style={{ color: 'var(--mint-hero-text)' }}
        >
          Welcome to TraceFix!
        </h1>
        <p
          className="text-sm sm:text-base mb-8 max-w-lg leading-relaxed"
          style={{ color: 'var(--mint-hero-subtext)' }}
        >
          Observability-driven performance investigations, autonomous code repair, and deterministic gate validation.
        </p>

        {/* Pill-shaped Search Bar */}
        <div className="w-full max-w-xl relative">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg
              className="w-4 h-4"
              style={{ color: 'var(--text-muted)' }}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search incidents, endpoints, or repositories..."
            className="w-full pl-11 pr-4 py-3.5 text-sm rounded-full border outline-hidden transition-all shadow-sm focus:ring-2"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'transparent',
              color: 'var(--text-primary)',
            }}
          />
        </div>
      </div>
    </div>
  );
}
