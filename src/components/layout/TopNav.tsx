'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { OperatingMode } from '@/types';

interface TopNavProps {
  operatingMode?: OperatingMode;
  onToggleMode?: () => void;
  openDrawer?: string | null;
}

export function TopNav({ operatingMode = 'AUTOMATIC', onToggleMode }: TopNavProps) {
  const pathname = usePathname();

  const navLinks = [
    { label: 'Overview', href: '/' },
    { label: 'Issues & Incidents', href: '/issues' },
    { label: 'Repositories', href: '/repositories' },
    { label: 'Settings', href: '/settings' },
  ];

  return (
    <header className="w-full pt-4 px-4 sm:px-8 max-w-7xl mx-auto">
      <nav
        aria-label="Main Navigation"
        className="flex items-center justify-between py-2.5 px-5 rounded-[var(--radius-pill)] border transition-all"
        style={{
          backgroundColor: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)',
          boxShadow: 'var(--shadow-pill)',
        }}
      >
        {/* Brand Logo Pill */}
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full font-bold tracking-tight text-sm uppercase transition-transform active:scale-95"
            style={{
              backgroundColor: 'var(--text-primary)',
              color: 'var(--text-inverse)',
            }}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--mint-hero-bg)' }} />
            TraceFix
          </Link>
          <span
            className="hidden sm:inline-block text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full border"
            style={{
              backgroundColor: 'var(--bg-surface)',
              color: 'var(--text-muted)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            Demo Mode
          </span>
        </div>

        {/* Center Nav Links */}
        <div className="hidden md:flex items-center gap-1 sm:gap-3">
          {navLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3.5 py-1.5 rounded-full text-sm font-medium transition-colors ${
                  isActive ? 'shadow-xs' : ''
                }`}
                style={{
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--bg-surface)' : 'transparent',
                }}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right Actions: Mode Indicator, Notification, Avatar */}
        <div className="flex items-center gap-2.5">
          {/* Operating Mode Indicator */}
          <button
            onClick={onToggleMode}
            type="button"
            title="Click to toggle or view Operating Mode"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border cursor-pointer transition-opacity hover:opacity-85"
            style={{
              backgroundColor: operatingMode === 'AUTOMATIC' ? 'var(--mint-hero-surface)' : 'var(--status-warning-bg)',
              borderColor: operatingMode === 'AUTOMATIC' ? 'var(--mint-hero-border)' : 'var(--status-warning-border)',
              color: operatingMode === 'AUTOMATIC' ? 'var(--mint-hero-text)' : 'var(--status-warning-text)',
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full animate-pulse"
              style={{
                backgroundColor: operatingMode === 'AUTOMATIC' ? 'var(--status-success)' : 'var(--status-warning)',
              }}
            />
            {operatingMode === 'AUTOMATIC' ? 'Auto-Review' : 'Manual-Review'}
          </button>

          {/* Notification Button */}
          <button
            type="button"
            aria-label="Notifications"
            className="w-9 h-9 rounded-full flex items-center justify-center border cursor-pointer transition-colors relative hover:opacity-90"
            style={{
              backgroundColor: 'var(--bg-card)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            <span
              className="absolute top-2 right-2 w-2 h-2 rounded-full ring-2"
              style={{ backgroundColor: 'var(--status-critical)', borderColor: 'var(--bg-card)' }}
            />
          </button>

          {/* User Profile Avatar */}
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-xs border"
            style={{
              backgroundColor: 'var(--mint-hero-bg)',
              color: 'var(--mint-hero-text)',
              borderColor: 'var(--mint-hero-border)',
            }}
            title="Logged in as Admin"
          >
            VK
          </div>
        </div>
      </nav>
    </header>
  );
}
