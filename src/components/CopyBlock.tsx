"use client";

import { useState } from "react";

export function CopyBlock({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }
  return (
    <div className="rounded-md border border-line">
      <div className="flex items-center justify-between border-b border-line bg-surface-muted px-3 py-1.5">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">{label}</span>
        <button type="button" onClick={copy} className="rounded px-2 py-0.5 text-xs font-medium text-accent hover:bg-surface">
          {copied ? "Copied" : "Copy"}
          <span className="sr-only"> {label}</span>
        </button>
      </div>
      <pre className="overflow-x-auto px-3 py-2.5 font-mono text-xs leading-5">{value}</pre>
      <span aria-live="polite" className="sr-only">{copied ? `${label} copied` : ""}</span>
    </div>
  );
}
