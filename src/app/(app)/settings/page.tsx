import { Suspense } from "react";
import { connection } from "next/server";
import { Card, CardTitle, Pill } from "@/components/ui";
import { ProjectSettings } from "@/components/ProjectSettings";

export default function SettingsPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Configuration</h1>
      <p className="mt-0.5 text-sm text-muted">How TraceFix responds to incidents, and what it is connected to.</p>
      <ProjectSettings />

      <h2 className="mt-10 text-base font-semibold">Server environment</h2>
      <p className="mt-0.5 text-sm text-muted">
        Read from <span className="font-mono">.env</span>. Secrets are never shown, only whether they are set.
      </p>
      <Suspense fallback={<div className="mt-5 h-96 animate-pulse rounded-lg bg-surface" />}>
        <Config />
      </Suspense>
    </>
  );
}

// Strips any user:password@ from a URL so credentials embedded in it are never rendered.
function safeUrl(v: string | undefined) {
  if (!v) return undefined;
  try {
    const u = new URL(v);
    u.username = "";
    u.password = "";
    return u.toString();
  } catch {
    return "Invalid URL";
  }
}

async function Config() {
  await connection();
  const env = process.env;
  const secret = (v: string | undefined) => Boolean(v && v !== "replace_me");
  const p95 = Number(env.GATE_MIN_P95_IMPROVEMENT);

  const target: [string, string | undefined][] = [
    ["Service", env.TARGET_SERVICE],
    ["Endpoint", env.TARGET_ENDPOINT],
    ["Base URL", safeUrl(env.TARGET_BASE_URL)],
    ["Repository", safeUrl(env.TARGET_REPO_URL)],
    ["Subdirectory", env.TARGET_REPO_SUBDIR],
    ["Run port", env.TARGET_RUN_PORT],
  ];
  const gates: [string, string | undefined][] = [
    ["Tests pass on candidate", "Always required"],
    ["Minimum requests measured", env.GATE_MIN_REQUESTS],
    ["Error rate not worse", "Always required"],
    ["Minimum p95 improvement", Number.isFinite(p95) && env.GATE_MIN_P95_IMPROVEMENT ? `${Math.round(p95 * 100)}%` : undefined],
  ];
  const services: [string, string | undefined][] = [
    ["Prometheus", safeUrl(env.PROMETHEUS_URL)],
    ["GitHub App ID", env.GITHUB_APP_ID],
    ["GitHub App installation", env.GITHUB_APP_INSTALLATION_ID],
    ["OpenAI model", env.OPENAI_MODEL === "replace_with_supported_model" ? undefined : env.OPENAI_MODEL],
    ["Worker poll interval", env.WORKER_POLL_INTERVAL_SECONDS && `${env.WORKER_POLL_INTERVAL_SECONDS}s`],
    ["Workspace root", env.WORKSPACE_ROOT],
  ];
  const secrets: [string, boolean][] = [
    ["Database URL", secret(env.DATABASE_URL)],
    ["Grafana webhook secret", secret(env.GRAFANA_WEBHOOK_SECRET)],
    ["Admin password", secret(env.ADMIN_PASSWORD)],
    ["OpenAI API key", secret(env.OPENAI_API_KEY)],
    ["GitHub App private key", secret(env.GITHUB_APP_PRIVATE_KEY)],
  ];
  const editable = env.TARGET_EDITABLE_PATHS?.split(",").map((p) => p.trim()).filter(Boolean) ?? [];

  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <Card>
        <CardTitle>Target service</CardTitle>
        <KeyValues rows={target} />
        <div className="mt-4 border-t border-line pt-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted">Agent may edit</p>
          {editable.length ? (
            <ul className="mt-2 flex flex-wrap gap-1.5">
              {editable.map((p) => (
                <li key={p} className="rounded border border-line bg-surface-muted px-1.5 py-0.5 font-mono text-xs">
                  {p}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-bad">Not set. The worker will reject every edit.</p>
          )}
        </div>
      </Card>

      <Card>
        <CardTitle aside={<span className="text-xs text-muted">Evaluated in code</span>}>Verification gates</CardTitle>
        <KeyValues rows={gates} />
        <p className="mt-4 border-t border-line pt-3 text-xs text-muted">
          Any invalid measurement makes the result <span className="font-medium text-ink">INCONCLUSIVE</span> and no PR
          is opened.
        </p>
      </Card>

      <Card>
        <CardTitle>Services</CardTitle>
        <KeyValues rows={services} />
      </Card>

      <Card>
        <CardTitle>Credentials</CardTitle>
        <ul className="divide-y divide-line">
          {secrets.map(([k, ok]) => (
            <li key={k} className="flex items-center justify-between py-2 text-sm">
              {k}
              <Pill tone={ok ? "ok" : "bad"}>{ok ? "Set" : "Missing"}</Pill>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

function KeyValues({ rows }: { rows: [string, string | undefined][] }) {
  return (
    <dl className="divide-y divide-line">
      {rows.map(([k, v]) => (
        <div key={k} className="flex items-baseline justify-between gap-4 py-2 text-sm">
          <dt className="text-muted">{k}</dt>
          <dd className={`min-w-0 truncate text-right font-mono text-xs ${v ? "" : "text-muted"}`}>{v ?? "Not set"}</dd>
        </div>
      ))}
    </dl>
  );
}
