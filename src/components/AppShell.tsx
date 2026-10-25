"use client";

import { Suspense, useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AccountMenu } from "@/components/AccountMenu";
import { StackStatusPills } from "@/components/StackStatusPills";
import { useProject } from "@/lib/project";
import { Icon, type IconName } from "@/components/Icon";

export type MonitoringLinks = { grafana: string | null; prometheus: string | null };

type NavItem = { href: string; label: string; icon: IconName; match: (p: string) => boolean };

const MAIN: NavItem[] = [
  { href: "/", label: "Incidents", icon: "inbox", match: (p) => p === "/" || p.startsWith("/incidents") },
  { href: "/live", label: "Live feed", icon: "activity", match: (p) => p === "/live" },
];

const SYSTEM: NavItem[] = [
  { href: "/setup", label: "Project setup", icon: "rocket", match: (p) => p === "/setup" },
  { href: "/settings", label: "Configuration", icon: "sliders", match: (p) => p === "/settings" },
];

export function AppShell({ children, links }: { children: ReactNode; links: MonitoringLinks }) {
  const [open, setOpen] = useState(false);
  const project = useProject();
  const external = [
    { href: links.grafana, label: "Grafana", icon: "chart" as const },
    { href: links.prometheus, label: "Prometheus", icon: "flame" as const },
  ].filter((l): l is { href: string; label: string; icon: "chart" | "flame" } => Boolean(l.href));

  return (
    <div className="flex min-h-full">
      <aside
        id="sidebar"
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={`fixed inset-y-0 left-0 z-30 flex w-60 flex-col border-r border-line bg-surface transition-transform lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${
          open ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Link href="/" className="flex h-14 items-center gap-2 border-b border-line px-5 font-semibold tracking-tight">
          <Icon name="pin" className="h-6 w-6 text-accent" />
          TraceFix
        </Link>
        <nav aria-label="Primary" className="flex-1 overflow-y-auto px-3 py-4">
          <Suspense fallback={<NavList items={MAIN} pathname="" />}>
            <NavListWithPath items={MAIN} />
          </Suspense>
          <p className="mt-6 px-2 text-xs font-medium uppercase tracking-wide text-muted">Monitoring</p>
          <ul className="mt-2 space-y-0.5">
            {external.map((l) => (
              <li key={l.href}>
                <a
                  href={l.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-surface-muted hover:text-ink"
                >
                  <Icon name={l.icon} />
                  {l.label}
                  <span aria-hidden className="ml-auto text-xs">↗</span>
                  <span className="sr-only">(opens in a new tab)</span>
                </a>
              </li>
            ))}
          </ul>
          <p className="mt-6 px-2 text-xs font-medium uppercase tracking-wide text-muted">System</p>
          <Suspense fallback={<NavList items={SYSTEM} pathname="" />}>
            <NavListWithPath items={SYSTEM} />
          </Suspense>
        </nav>
        <div className="border-t border-line px-5 py-3 text-xs text-muted">
          {project?.service ? (
            <>
              Target: <span className="font-mono">{project.service}</span>
            </>
          ) : project === null ? (
            <Link href="/setup" className="text-accent hover:underline">
              No project yet. Set it up
            </Link>
          ) : null}
        </div>
      </aside>

      {open && (
        <button
          type="button"
          aria-label="Close menu"
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-20 bg-ink/30 lg:hidden"
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-10 flex h-14 items-center gap-3 border-b border-line bg-surface/90 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            aria-label="Open menu"
            aria-controls="sidebar"
            aria-expanded={open}
            onClick={() => setOpen(true)}
            className="-ml-1 rounded-lg p-1.5 text-muted hover:bg-surface-muted hover:text-ink lg:hidden"
          >
            <Icon name="menu" className="h-5 w-5" />
          </button>
          <nav aria-label="Breadcrumb" className="min-w-0 text-sm">
            <ol className="flex items-center gap-2">
              <Suspense fallback={<li className="text-muted">TraceFix</li>}>
                <Crumbs />
              </Suspense>
            </ol>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <StackStatusPills />
            <AccountMenu />
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function NavListWithPath({ items }: { items: NavItem[] }) {
  return <NavList items={items} pathname={usePathname()} />;
}

function NavList({ items, pathname }: { items: NavItem[]; pathname: string }) {
  return (
    <ul className="mt-2 space-y-0.5">
      {items.map((l) => {
        const active = l.match(pathname);
        return (
          <li key={l.href}>
            <Link
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm ${
                active ? "bg-surface-muted font-medium text-ink shadow-[inset_2px_0_0_var(--accent)]" : "text-muted hover:bg-surface-muted hover:text-ink"
              }`}
            >
              <Icon name={l.icon} />
              {l.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

const TITLES: Record<string, string> = { "/settings": "Configuration", "/setup": "Project setup", "/live": "Live feed", "/": "Incidents" };

function Crumbs() {
  const pathname = usePathname();
  if (TITLES[pathname]) return <li aria-current="page">{TITLES[pathname]}</li>;
  const id = pathname.split("/")[2];
  return (
    <>
      <li>
        <Link href="/" className="text-muted hover:text-ink">
          Incidents
        </Link>
      </li>
      <li aria-hidden className="text-muted">/</li>
      <li aria-current="page" className="truncate text-xs">
        Incident 
        <span className="font-mono">{id?.slice(0, 8)}</span>
      </li>
    </>
  );
}
