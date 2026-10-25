"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/lib/session";

export function DecisionPanel({
  incidentId,
  score,
  mode,
  threshold,
}: {
  incidentId: string;
  score: number;
  mode: "manual" | "automatic";
  threshold: number;
}) {
  const router = useRouter();
  const session = useSession();
  const auto = mode === "automatic";
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState<"approve" | "reject" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function decide(action: "approve" | "reject") {
    setPending(action);
    setError(null);
    try {
      const res = await fetch(`/api/incidents/${incidentId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() || undefined, by: session?.name }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? `Request failed (${res.status}).`);
      }
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed.");
    } finally {
      setPending(null);
    }
  }

  return (
    <section aria-labelledby="decision-title" className="rounded-lg border border-warn/40 bg-warn-bg p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="decision-title" className="text-base font-semibold">
          Decision needed
        </h2>
        <span className="rounded bg-surface px-2 py-0.5 text-xs font-medium">
          {auto ? `Automatic mode · threshold ${threshold}` : "Manual mode"}
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        {auto && score < threshold
          ? `Triage scored ${score}, below the auto-start threshold of ${threshold}, so this needs a person.`
          : auto
            ? `Triage scored ${score}. Automatic mode starts incidents like this on its own; approve to start it now.`
            : "Manual mode: a person decides every incident."}{" "}
        Approving starts one fix pipeline for this incident and every report in it: the agent clones the repo, runs it and tries to reproduce the bug. No code runs before that.
      </p>
      <label htmlFor="reason" className="mt-4 block text-sm font-medium">
        Reason <span className="font-normal text-muted">(optional)</span>
      </label>
      <textarea
        id="reason"
        rows={2}
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        className="mt-1 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => decide("approve")}
          disabled={pending !== null}
          className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
        >
          {pending === "approve" ? "Approving…" : "Approve fix pipeline"}
        </button>
        <button
          type="button"
          onClick={() => decide("reject")}
          disabled={pending !== null}
          className="rounded-lg border border-line bg-surface px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {pending === "reject" ? "Rejecting…" : "Reject"}
        </button>
      </div>
      <p role="alert" className="mt-3 text-sm text-bad empty:hidden">
        {error}
      </p>
    </section>
  );
}
