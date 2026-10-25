"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Re-renders server data every 2s while a job is active.
export function AutoRefresh() {
  const router = useRouter();
  useEffect(() => {
    const t = setInterval(() => router.refresh(), 2000);
    return () => clearInterval(t);
  }, [router]);
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted">
      <span aria-hidden className="h-1.5 w-1.5 animate-pulse rounded-full bg-info" />
      Live
    </span>
  );
}
