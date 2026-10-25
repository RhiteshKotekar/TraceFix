"use client";

import { useEffect, useRef, useState } from "react";
import { ModeSettings } from "@/components/ModeSettings";
import type { Settings } from "@/lib/incidents";

// Server-backed response mode: the webhook reads it to decide whether to auto-start the fix pipeline.
export function ResponseMode() {
  const [s, setS] = useState<Settings | null>(null);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    fetch("/api/settings", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setS)
      .catch(() => setState("error"));
  }, []);

  function change(patch: Partial<Settings>) {
    if (!s) return;
    const next = { ...s, ...patch };
    setS(next);
    setState("saving");
    clearTimeout(timer.current);
    // Debounced so dragging the threshold slider sends one save, not dozens.
    timer.current = setTimeout(async () => {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(next),
      }).catch(() => null);
      setState(res?.ok ? "saved" : "error");
    }, 300);
  }

  if (!s) {
    return state === "error" ? (
      <p className="text-sm text-bad">Could not load settings. Is the database running?</p>
    ) : (
      <div className="h-40 animate-pulse rounded-lg bg-surface-muted" />
    );
  }
  return (
    <div>
      <ModeSettings mode={s.mode} threshold={s.autoThreshold} onChange={change} />
      <p role="status" className={`mt-2 text-xs ${state === "error" ? "text-bad" : "text-muted"}`}>
        {{ idle: "", saving: "Saving…", saved: "Saved", error: "Could not save. Is the database running?" }[state]}
      </p>
    </div>
  );
}
