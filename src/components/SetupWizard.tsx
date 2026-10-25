"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { EMPTY_PROJECT, SaveError, saveProject, useProjectState, type Project } from "@/lib/project";
import { CopyBlock } from "@/components/CopyBlock";
import { StackChecklist } from "@/components/StackChecklist";
import { ResponseMode } from "@/components/ResponseMode";
import { GitHubAppSetup } from "@/components/GitHubAppSetup";

const STEPS = ["Repository & GitHub App", "Run & test", "Service", "Connect Grafana", "Automation"] as const;
// Fields each step owns; the server validates formats, the client only checks required ones.
const STEP_FIELDS: (keyof Project)[][] = [
  ["repoUrl", "branch", "subdir", "ghOwnerType", "ghOrg", "ghAppId", "ghAppSlug", "ghInstallationId"],
  ["installCommand", "testCommand", "startCommand", "port", "healthPath", "versionPath"],
  ["service", "endpoint", "baseUrl", "metricsPath", "p95ThresholdMs"],
  [],
  [],
];
const REQUIRED: (keyof Project)[][] = [
  ["repoUrl", "branch"],
  ["installCommand", "testCommand", "startCommand", "port", "healthPath", "versionPath"],
  ["service", "endpoint", "baseUrl", "metricsPath", "p95ThresholdMs"],
  [],
  [],
];

export function SetupWizard() {
  const state = useProjectState();
  if (state === undefined) return <div className="mt-5 h-[480px] animate-pulse rounded-lg bg-surface" />;
  if (state.error) return <p className="mt-5 text-sm text-bad">Could not load the project. Is the database running?</p>;
  return <Wizard initial={state.project} ghKeyConfigured={state.ghKeyConfigured} />;
}

function Wizard({ initial, ghKeyConfigured }: { initial: Project | null; ghKeyConfigured: boolean }) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Project>(() => ({ ...EMPTY_PROJECT, ...initial }));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const set = (patch: Partial<Project>) => setP((prev) => ({ ...prev, ...patch }));

  async function next() {
    const e: Record<string, string> = {};
    for (const k of REQUIRED[step]) if (!String(p[k] ?? "").trim()) e[k] = "Required";
    setErrors(e);
    if (Object.keys(e).length) return;

    const last = step === STEPS.length - 1;
    const patch = Object.fromEntries(STEP_FIELDS[step].map((k) => [k, p[k]])) as Partial<Project>;
    setSaving(true);
    try {
      await saveProject({ ...patch, ...(last ? { complete: true } : {}) });
    } catch (err) {
      setErrors(err instanceof SaveError ? err.fields : { _: "Could not save." });
      return;
    } finally {
      setSaving(false);
    }
    if (last) router.push("/");
    else setStep(step + 1);
  }

  const field = (key: keyof Project, label: string, hint?: string, mono = true) => (
    <Field id={key} label={label} hint={hint} error={errors[key]}>
      <input
        id={key}
        value={String(p[key] ?? "")}
        onChange={(e) => set({ [key]: e.target.value } as Partial<Project>)}
        aria-invalid={Boolean(errors[key])}
        aria-describedby={errors[key] ? `${key}-error` : hint ? `${key}-hint` : undefined}
        className={`w-full rounded-md border bg-surface px-3 py-2 text-sm ${mono ? "font-mono" : ""} ${errors[key] ? "border-bad" : "border-line"}`}
      />
    </Field>
  );


  return (
    <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
      <ol className="flex gap-2 overflow-x-auto lg:flex-col lg:gap-1">
        {STEPS.map((s, i) => (
          <li key={s} className="shrink-0">
            <button
              type="button"
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              aria-current={i === step ? "step" : undefined}
              className={`flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm ${
                i === step ? "bg-surface font-medium shadow-[inset_2px_0_0_var(--accent)]" : i < step ? "text-ink hover:bg-surface" : "text-muted"
              }`}
            >
              <span
                className={`grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] font-semibold ${
                  i < step ? "bg-accent text-accent-ink" : i === step ? "border-2 border-accent text-accent" : "border border-line"
                }`}
              >
                {i < step ? "✓" : i + 1}
              </span>
              {s}
            </button>
          </li>
        ))}
      </ol>

      <section aria-labelledby="step-title" className="rounded-lg border border-line bg-surface">
        <header className="border-b border-line px-5 py-4">
          <p className="text-xs text-muted">
            Step {step + 1} of {STEPS.length}
          </p>
          <h2 id="step-title" className="text-lg font-semibold">
            {STEPS[step]}
          </h2>
        </header>

        <div className="space-y-4 px-5 py-5">
          {step === 0 && (
            <>
              {field("repoUrl", "GitHub repository URL", "The service TraceFix may clone and open PRs against.")}
              <div className="grid gap-4 sm:grid-cols-2">
                {field("branch", "Default branch")}
                {field("subdir", "App subdirectory", "Leave empty if the app is at the repo root.")}
              </div>
              <GitHubAppSetup p={p} set={set} ghKeyConfigured={ghKeyConfigured} errors={errors} />
            </>
          )}

          {step === 1 && (
            <>
              <p className="text-sm text-muted">
                The agent runs these inside a disposable clone to start the app and reproduce the slowdown. Tests and the
                load test run with the same commands before and after a fix.
              </p>
              <div className="grid gap-4 sm:grid-cols-3">
                {field("installCommand", "Install")}
                {field("testCommand", "Test")}
                {field("startCommand", "Start")}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {field("port", "Port for the cloned app")}
                {field("healthPath", "Health check path")}
                {field("versionPath", "Version path", "Returns the deployed commit SHA.")}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                {field("service", "Service name", "Must equal the Prometheus job name and the service label on the Grafana alert.")}
                {field("endpoint", "Endpoint to watch", "Route pattern as it appears in metrics, e.g. /api/products.")}
                {field("baseUrl", "Running service URL", "e.g. http://localhost:5002. TraceFix reads the version path here.")}
                {field("metricsPath", "Metrics path")}
              </div>
              {field("p95ThresholdMs", "Alert when p95 latency exceeds (ms)")}
            </>
          )}

          {step === 3 && (
            <ConnectGrafana p={p} />
          )}

          {step === 4 && (
            <>
              <p className="text-sm text-muted">
                Every incident gets an AI triage score first. Choose what happens after that. You can change this later in
                Configuration.
              </p>
              <ResponseMode />
            </>
          )}
        </div>

        <footer className="flex items-center justify-between border-t border-line px-5 py-3">
          <button
            type="button"
            onClick={() => setStep(step - 1)}
            disabled={step === 0}
            className="rounded-md px-3 py-2 text-sm font-medium text-muted hover:text-ink disabled:invisible"
          >
            ← Back
          </button>
          {errors._ && (
            <p role="alert" className="mr-auto pl-3 text-sm text-bad">
              {errors._}
            </p>
          )}
          <button
            type="button"
            onClick={next}
            disabled={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-semibold text-accent-ink disabled:opacity-60"
          >
            {saving ? "Saving…" : step === STEPS.length - 1 ? "Finish setup" : "Continue"}
          </button>
        </footer>
      </section>
    </div>
  );
}

function Field({ id, label, hint, error, children }: { id: string; label: string; hint?: string; error?: string; children: ReactNode }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-xs text-bad">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="mt-1 text-xs text-muted">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function SetupItem({ n, title, body, children }: { n: number; title: string; body: string; children?: ReactNode }) {
  return (
    <div className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-mono text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1 space-y-2">
        <h3 className="text-sm font-medium">{title}</h3>
        <p className="text-xs text-muted">{body}</p>
        {children}
      </div>
    </div>
  );
}

// Settings to enter in the user's own Grafana so its alerts reach TraceFix.
function ConnectGrafana({ p }: { p: Project }) {
  const origin = window.location.origin;
  const webhook = `${origin}/api/webhooks/grafana`;
  const dockerWebhook = webhook.replace(/\/\/(localhost|127\.0\.0\.1)/, "//host.docker.internal");
  return (
    <>
      <p className="text-sm text-muted">
        TraceFix uses your existing Prometheus and Grafana (<span className="font-mono">PROMETHEUS_URL</span> and{" "}
        <span className="font-mono">GRAFANA_URL</span> in <span className="font-mono">.env</span>). Grafana sends each firing alert to
        TraceFix through a webhook contact point.
      </p>
      <SetupItem n={1} title="Start the TraceFix database" body="From the TraceFix repo root.">
        <CopyBlock label="Terminal" value="npm run db:up" />
      </SetupItem>
      <SetupItem
        n={2}
        title="Add a webhook contact point in Grafana"
        body="Alerting → Contact points → Add contact point → Integration: Webhook. Under Optional settings set Authorization header: scheme Bearer, credentials = the value of GRAFANA_WEBHOOK_SECRET in TraceFix's .env."
      >
        {dockerWebhook !== webhook && <CopyBlock label="URL if Grafana runs in Docker" value={dockerWebhook} />}
        <CopyBlock label={dockerWebhook !== webhook ? "URL if Grafana runs on this machine" : "URL"} value={webhook} />
      </SetupItem>
      <SetupItem
        n={3}
        title="Make sure your alert rule carries the right labels"
        body={`TraceFix groups alerts by alert name + service + endpoint. Each alert needs an endpoint label (endpoint or route) and a service label; if service is missing, the Prometheus job label is used, then the project's service name "${p.service || "<service>"}".`}
      >
        <CopyBlock label="Example labels on the rule" value={`service = ${p.service || "<service>"}\nendpoint = {{ $labels.route }}`} />
      </SetupItem>
      <SetupItem n={4} title="Route the rule to the contact point" body="Alerting → Notification policies: a policy (or the default) that sends this rule's alerts to the webhook contact point." />
      <SetupItem
        n={5}
        title="Press Test on the contact point"
        body={'Grafana sends a TestAlert. The checklist below turns green and the Live feed shows "Contact point test received". TraceFix answers 202.'}
      />
      <StackChecklist />
    </>
  );
}
