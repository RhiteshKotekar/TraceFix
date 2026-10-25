"use client";

import { useSyncExternalStore } from "react";

export type Session = { email: string; name: string; at: string };

// shortcut: login is not enforced; this only remembers who "signed in" in this browser. Replace with real auth (proxy.ts) later.
const KEY = "tracefix.session";
const listeners = new Set<() => void>();
let cacheRaw: string | null = null;
let cacheVal: Session | null = null;

function read(): Session | null {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {}
  if (raw !== cacheRaw) {
    cacheRaw = raw;
    try {
      cacheVal = raw ? JSON.parse(raw) : null;
    } catch {
      cacheVal = null;
    }
  }
  return cacheVal;
}

function emit() {
  listeners.forEach((l) => l());
}

export function signIn(email: string) {
  const clean = email.trim();
  if (!clean) throw new Error("Email is required");
  const name = clean.split("@")[0].replace(/[._-]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  try {
    localStorage.setItem(KEY, JSON.stringify({ email: clean, name, at: new Date().toISOString() }));
  } catch {}
  emit();
}

export function signOut() {
  try {
    localStorage.removeItem(KEY);
  } catch {}
  emit();
}

function subscribe(l: () => void) {
  listeners.add(l);
  window.addEventListener("storage", l);
  return () => {
    listeners.delete(l);
    window.removeEventListener("storage", l);
  };
}

// `undefined` during server render; `null` when signed out.
export function useSession(): Session | null | undefined {
  return useSyncExternalStore(subscribe, read, () => undefined);
}
