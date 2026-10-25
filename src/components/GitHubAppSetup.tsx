"use client";

import type { ReactNode } from "react";
import type { Project } from "@/lib/project";

// What TraceFix asks GitHub for. Metadata:read is mandatory for every app; nothing else is requested.
export const APP_PERMISSIONS = [
  { name: "Contents", level: "Read & write", why: "Clone the deployed commit and push a tracefix/* branch" },
  { name: "Pull requests", level: "Read & write", why: "Open the PR with the verification report" },
  { name: "Metadata", level: "Read", why: "Required by GitHub for every app" },
];

// GitHub's "register an app from URL parameters" flow: the form opens prefilled, the user only clicks Create.
function registerUrl(p: Project, origin: string) {
  const q = new URLSearchParams({
    name: `TraceFix ${p.repoUrl.split("/").slice(-1)[0]?.replace(/\.git$/, "") || "agent"}`.slice(0, 34),
    description: "Opens verified performance-fix pull requests. Never merges.",
    url: origin,
    public: "false",
    webhook_active: "false",
    contents: "write",
    pull_requests: "write",
    metadata: "read",
  });
  const base =
    p.ghOwnerType === "org" && p.ghOrg.trim()
      ? `https://github.com/organizations/${encodeURIComponent(p.ghOrg.trim())}/settings/apps/new`
      : "https://github.com/settings/apps/new";
  return `${base}?${q}`;
}

export function GitHubAppSetup({
  p,
  set,
  ghKeyConfigured,
  errors,
}: {
  p: Project;
  set: (patch: Partial<Project>) => void;
  ghKeyConfigured: boolean;
  errors: Record<string, string>;
}) {
  const origin = window.location.origin;
  const slug = p.ghAppSlug.trim();

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-line bg-surface-muted p-3 text-xs text-muted">
        <p className="font-medium text-ink">Why a GitHub App instead of a personal token</p>
        <p className="mt-1">
          The app is installed on just this repository, and TraceFix gets a fresh token for each fix pipeline that expires
          after one hour. Commits and PRs show up as <span className="font-mono">tracefix[bot]</span>, not as a person,
          and nothing breaks when someone leaves the team.
        </p>
      </div>

      <Step n={1} title="Register the app on GitHub">
        <fieldset className="flex flex-wrap items-end gap-3">
          <legend className="sr-only">App owner</legend>
          {(["user", "org"] as const).map((t) => (
            <label key={t} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="ghOwnerType"
                checked={p.ghOwnerType === t}
                onChange={() => set({ ghOwnerType: t })}
                className="accent-[var(--accent)]"
              />
              {t === "user" ? "My account" : "Organization"}
            </label>
          ))}
          {p.ghOwnerType === "org" && (
            <input
              aria-label="Organization name"
              placeholder="org-name"
              value={p.ghOrg}
              onChange={(e) => set({ ghOrg: e.target.value })}
              className="rounded-md border border-line bg-surface px-2.5 py-1.5 font-mono text-sm"
            />
          )}
        </fieldset>
        <table className="mt-3 w-full text-xs">
          <caption className="sr-only">Permissions requested</caption>
          <tbody className="divide-y divide-line">
            {APP_PERMISSIONS.map((perm) => (
              <tr key={perm.name}>
                <th scope="row" className="py-1.5 pr-3 text-left font-medium">{perm.name}</th>
                <td className="whitespace-nowrap py-1.5 pr-3 font-mono">{perm.level}</td>
                <td className="py-1.5 text-muted">{perm.why}</td>
              </tr>
            ))}
            <tr>
              <th scope="row" className="py-1.5 pr-3 text-left font-medium">Webhooks</th>
              <td className="py-1.5 pr-3 font-mono">Off</td>
              <td className="py-1.5 text-muted">Alerts come from Grafana, not GitHub</td>
            </tr>
          </tbody>
        </table>
        <a
          href={registerUrl(p, origin)}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-3 inline-flex items-center gap-1.5 rounded-md bg-ink px-3 py-2 text-sm font-semibold text-surface hover:opacity-90"
        >
          Register TraceFix app on GitHub ↗
        </a>
        <p className="mt-1.5 text-xs text-muted">Opens GitHub with everything prefilled. Click “Create GitHub App”, then come back.</p>
      </Step>

      <Step n={2} title="Add the app credentials">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="ghAppId"
            label="App ID"
            hint="Shown at the top of the app's settings page."
            value={p.ghAppId}
            onChange={(v) => set({ ghAppId: v })}
            error={errors.ghAppId}
          />
          <Input
            id="ghAppSlug"
            label="App slug"
            hint="The last part of the app's public URL, e.g. tracefix-shop."
            value={p.ghAppSlug}
            onChange={(v) => set({ ghAppSlug: v })}
            error={errors.ghAppSlug}
          />
        </div>
        <div className="mt-4 flex items-start gap-2.5 rounded-md border border-line bg-surface-muted px-3 py-2.5 text-xs">
          <span aria-hidden className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${ghKeyConfigured ? "bg-ok" : "bg-warn"}`} />
          <span>
            <span className="font-medium text-ink">Private key: {ghKeyConfigured ? "configured on the server" : "not configured"}</span>
            <span className="block text-muted">
              Generate it under the app&apos;s Private keys and put the .pem contents in{" "}
              <span className="font-mono">GITHUB_APP_PRIVATE_KEY</span> in the server&apos;s <span className="font-mono">.env</span>. It is never
              sent through the browser.
            </span>
          </span>
        </div>
      </Step>

      <Step n={3} title="Install it on the repository">
        <a
          href={slug ? `https://github.com/apps/${encodeURIComponent(slug)}/installations/new` : undefined}
          aria-disabled={!slug}
          target="_blank"
          rel="noopener noreferrer"
          className={`inline-flex items-center gap-1.5 rounded-md border border-line px-3 py-2 text-sm font-medium ${
            slug ? "hover:bg-surface-muted" : "pointer-events-none opacity-50"
          }`}
        >
          Install on GitHub ↗
        </a>
        <p className="mt-1.5 text-xs text-muted">
          Choose <span className="font-medium text-ink">Only select repositories</span> and pick{" "}
          <span className="font-mono">{p.repoUrl.replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "") || "your repo"}</span>.
        </p>
        <div className="mt-3 max-w-xs">
          <Input
            id="ghInstallationId"
            label="Installation ID"
            hint="The number at the end of the URL after installing: …/installations/12345678"
            value={p.ghInstallationId}
            onChange={(v) => set({ ghInstallationId: v })}
            error={errors.ghInstallationId}
          />
        </div>
      </Step>

      <p className="border-t border-line pt-3 text-xs text-muted">
        These GitHub fields are optional for now; the fix pipeline that uses them is not connected yet.
      </p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: ReactNode }) {
  return (
    <section className="flex gap-3">
      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-surface-muted font-mono text-xs font-semibold">{n}</span>
      <div className="min-w-0 flex-1">
        <h3 className="mb-2 text-sm font-semibold">{title}</h3>
        {children}
      </div>
    </section>
  );
}

function Input({
  id,
  label,
  hint,
  value,
  onChange,
  error,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  onChange: (v: string) => void;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium">
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        className={`w-full rounded-md border bg-surface px-3 py-2 font-mono text-sm ${error ? "border-bad" : "border-line"}`}
      />
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
