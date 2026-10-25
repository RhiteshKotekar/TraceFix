import { spawn, type ChildProcess } from "node:child_process";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

export type RunResult = { code: number | null; output: string; timedOut: boolean; durationS: number };

const TAIL = 6000;
const tail = (s: string) => (s.length > TAIL ? "…" + s.slice(-TAIL) : s);

// Strips credentials and absolute workspace paths from anything that is stored or shown.
export function sanitize(text: string, workspace?: string): string {
  let s = text
    .replace(/gh[pousr]_[A-Za-z0-9_]{20,}/g, "[redacted-token]")
    .replace(/sk-[A-Za-z0-9_-]{20,}/g, "[redacted-key]")
    .replace(/x-access-token:[^@\s]+@/g, "x-access-token:[redacted]@")
    .replace(/(authorization:\s*)(basic|bearer)\s+\S+/gi, "$1$2 [redacted]");
  if (workspace) s = s.split(workspace).join("<workspace>");
  return s;
}

// Target code gets no TraceFix secrets: only PATH/locale, a throwaway HOME, the npm cache, and TARGET_ENV_* values.
export function targetEnv(extra: Record<string, string> = {}): Record<string, string> {
  const home = join(tmpdir(), "tracefix-home");
  mkdirSync(home, { recursive: true });
  const env: Record<string, string> = {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: home,
    LANG: process.env.LANG ?? "C.UTF-8",
    CI: "true",
    npm_config_cache: join(process.env.HOME ?? home, ".npm"),
    npm_config_update_notifier: "false",
  };
  for (const [k, v] of Object.entries(process.env)) if (k.startsWith("TARGET_ENV_") && v) env[k.slice("TARGET_ENV_".length)] = v;
  return { ...env, ...extra };
}

// Configured commands are validated (SAFE_COMMAND) and split on spaces; no shell is involved.
export const argv = (command: string) => command.trim().split(/\s+/);

export function run(cmd: string[], cwd: string, env: Record<string, string>, timeoutMs: number): Promise<RunResult> {
  return new Promise((resolve) => {
    const started = Date.now();
    let out = "";
    let timedOut = false;
    const child = spawn(cmd[0], cmd.slice(1), { cwd, env: env as NodeJS.ProcessEnv, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const add = (b: Buffer) => {
      out = (out + b.toString()).slice(-TAIL * 2);
    };
    child.stdout.on("data", add);
    child.stderr.on("data", add);
    const timer = setTimeout(() => {
      timedOut = true;
      killGroup(child);
    }, timeoutMs);
    const done = (code: number | null) => {
      clearTimeout(timer);
      resolve({ code, output: tail(out), timedOut, durationS: Math.round((Date.now() - started) / 100) / 10 });
    };
    child.on("error", (e) => {
      add(Buffer.from(String(e.message)));
      done(-1);
    });
    child.on("close", done);
  });
}

function killGroup(child: ChildProcess) {
  if (!child.pid) return;
  try {
    process.kill(-child.pid, "SIGKILL");
  } catch {}
}

// A long-running process (the target app). stop() kills its whole process group.
export function start(cmd: string[], cwd: string, env: Record<string, string>) {
  let out = "";
  const child = spawn(cmd[0], cmd.slice(1), { cwd, env: env as NodeJS.ProcessEnv, detached: true, stdio: ["ignore", "pipe", "pipe"] });
  const add = (b: Buffer) => {
    out = (out + b.toString()).slice(-TAIL * 2);
  };
  child.stdout.on("data", add);
  child.stderr.on("data", add);
  child.on("error", (e) => add(Buffer.from(String(e.message))));
  return {
    output: () => tail(out),
    exited: () => child.exitCode !== null,
    stop: async () => {
      killGroup(child);
      await new Promise((r) => setTimeout(r, 300));
    },
  };
}

export async function waitForHttp(url: string, timeoutMs: number, isAlive: () => boolean): Promise<boolean> {
  const until = Date.now() + timeoutMs;
  while (Date.now() < until) {
    if (!isAlive()) return false;
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(2000) });
      if (r.ok) return true;
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  return false;
}
