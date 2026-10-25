"use client";

import { useSyncExternalStore } from "react";
import type { Project, ProjectState } from "@/lib/model";

export type { Project } from "@/lib/model";
export { EMPTY_PROJECT } from "@/lib/model";

// Client cache of GET /api/project, shared by every component that shows project details.
type State = ProjectState & { error?: boolean };
const listeners = new Set<() => void>();
let state: State | undefined;
let loading = false;

const emit = () => listeners.forEach((l) => l());

async function load() {
  loading = true;
  try {
    const res = await fetch("/api/project", { cache: "no-store" });
    if (!res.ok) throw new Error(String(res.status));
    state = await res.json();
  } catch {
    state = { project: null, ghKeyConfigured: false, error: true };
  } finally {
    loading = false;
    emit();
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (state === undefined && !loading) load();
  return () => listeners.delete(l);
}

export class SaveError extends Error {
  constructor(public fields: Record<string, string>) {
    super("Could not save the project.");
  }
}

// Partial save; throws SaveError with per-field messages when the server rejects it.
export async function saveProject(patch: Partial<Project> & { complete?: boolean }): Promise<Project> {
  const res = await fetch("/api/project", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(patch),
  }).catch(() => null);
  const body = await res?.json().catch(() => null);
  if (!res?.ok) throw new SaveError(body?.error?.fields ?? { _: "Could not save. Is the database running?" });
  state = body;
  emit();
  return body.project;
}

export async function resetProject() {
  await fetch("/api/project", { method: "DELETE" });
  state = { project: null, ghKeyConfigured: state?.ghKeyConfigured ?? false };
  emit();
}

// `undefined` while loading; `null` when no project has been set up.
export function useProject(): Project | null | undefined {
  return useSyncExternalStore(subscribe, () => state?.project, () => undefined);
}

export function useProjectState(): State | undefined {
  return useSyncExternalStore(subscribe, () => state, () => undefined);
}
