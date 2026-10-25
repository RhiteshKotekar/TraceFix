"use client";

import type { Settings } from "@/lib/incidents";

type Mode = Settings["mode"];

const MODES: { id: Mode; title: string; body: string }[] = [
  {
    id: "manual",
    title: "Manual: human in the loop",
    body: "AI triage scores every incident, then a person approves or rejects before the agent touches the repo.",
  },
  {
    id: "automatic",
    title: "Automatic",
    body: "Incidents scoring at or above the threshold start on their own. Lower scores still wait for a person.",
  },
];

export function ModeSettings({
  mode,
  threshold,
  onChange,
}: {
  mode: Mode;
  threshold: number;
  onChange: (patch: { mode?: Mode; autoThreshold?: number }) => void;
}) {
  return (
    <div>
      <fieldset>
        <legend className="sr-only">Response mode</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          {MODES.map((m) => (
            <label
              key={m.id}
              className={`flex cursor-pointer gap-3 rounded-lg border p-3 ${
                mode === m.id ? "border-accent bg-ok-bg/60 shadow-[inset_0_0_0_1px_var(--accent)]" : "border-line hover:bg-surface-muted"
              }`}
            >
              <input
                type="radio"
                name="mode"
                value={m.id}
                checked={mode === m.id}
                onChange={() => onChange({ mode: m.id })}
                className="mt-0.5 accent-[var(--accent)]"
              />
              <span>
                <span className="block text-sm font-medium">{m.title}</span>
                <span className="mt-0.5 block text-xs text-muted">{m.body}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className={`mt-4 ${mode === "automatic" ? "" : "opacity-50"}`}>
        <div className="flex items-center justify-between">
          <label htmlFor="threshold" className="text-sm font-medium">
            Auto-start threshold
          </label>
          <span className="font-mono text-sm tabular-nums">{threshold} / 100</span>
        </div>
        <input
          id="threshold"
          type="range"
          min={50}
          max={95}
          step={5}
          value={threshold}
          disabled={mode !== "automatic"}
          onChange={(e) => onChange({ autoThreshold: Number(e.target.value) })}
          className="mt-2 w-full accent-[var(--accent)]"
        />
        <p className="mt-1 text-xs text-muted">
          Even in automatic mode, PRs are never merged or deployed, and gates still decide whether a PR opens.
        </p>
      </div>
    </div>
  );
}
