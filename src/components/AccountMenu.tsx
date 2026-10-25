"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signOut, useSession } from "@/lib/session";
import { Icon } from "@/components/Icon";

export function AccountMenu() {
  const session = useSession();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (session === undefined) return <span className="h-8 w-8 rounded-full bg-surface-muted" />;
  if (!session) {
    return (
      <Link href="/login" className="rounded-md border border-line px-3 py-1.5 text-sm font-medium hover:bg-surface-muted">
        Sign in
      </Link>
    );
  }

  const initials = session.name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls="account-menu"
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full py-0.5 pl-0.5 pr-2 hover:bg-surface-muted"
      >
        <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-semibold text-accent-ink">{initials}</span>
        <span className="hidden text-left sm:block">
          <span className="block text-sm font-medium leading-4">{session.name}</span>
          <span className="block text-xs leading-4 text-muted">{session.email}</span>
        </span>
        <Icon name="chevronDown" className="text-muted" />
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id="account-menu"
          role="menu"
          aria-label="Account"
          className="absolute right-0 top-full z-40 mt-2 w-60 overflow-hidden rounded-lg border border-line bg-surface shadow-lg"
        >
          <div className="border-b border-line px-3 py-2.5">
            <p className="text-sm font-medium">{session.name}</p>
            <p className="truncate text-xs text-muted">{session.email}</p>
          </div>
          <button
            type="button"
            role="menuitem"
            autoFocus
            onClick={() => {
              signOut();
              setOpen(false);
              router.push("/login");
            }}
            className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-sm text-bad hover:bg-bad-bg focus:bg-bad-bg"
          >
            <Icon name="logout" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}
