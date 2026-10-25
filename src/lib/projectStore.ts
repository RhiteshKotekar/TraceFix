import { readFileSync } from "node:fs";
import { pool } from "./db.ts";
import { EMPTY_PROJECT, type Project } from "./model.ts";

// GitHub App identity and installation are server-side facts (env + GitHub API), never accepted from the browser.
const SERVER_ONLY: (keyof Project)[] = ["completedAt", "ghAppId", "ghAppSlug", "ghInstallationId"];
const FIELDS = (Object.keys(EMPTY_PROJECT) as (keyof Project)[]).filter((k) => !SERVER_ONLY.includes(k));

export async function getProject(): Promise<Project | null> {
  const { rows } = await pool.query("SELECT config, completed_at FROM project WHERE id = 1");
  if (!rows[0]) return null;
  return {
    ...EMPTY_PROJECT,
    ...rows[0].config,
    ghAppId: process.env.GITHUB_APP_ID && process.env.GITHUB_APP_ID !== "replace_me" ? process.env.GITHUB_APP_ID : "",
    ghAppSlug: process.env.GITHUB_APP_SLUG ?? "",
    completedAt: rows[0].completed_at?.toISOString() ?? null,
  };
}

// The service's own metrics endpoint, from the project's base URL + metrics path.
export async function metricsUrl(): Promise<string | null> {
  const p = await getProject();
  if (!p?.baseUrl) return null;
  return new URL(p.metricsPath || "/metrics", p.baseUrl).toString();
}

// The Prometheus job that scrapes the service; the queries filter on it.
export async function serviceJob(): Promise<string | null> {
  return (await getProject())?.service || null;
}

// "owner/repo" from the configured repository URL.
export function repoFullName(p: Pick<Project, "repoUrl">): string | null {
  const m = /^https:\/\/github\.com\/([\w.-]+)\/([\w.-]+?)(?:\.git)?\/?$/.exec(p.repoUrl);
  return m ? `${m[1]}/${m[2]}` : null;
}

// The key comes from GITHUB_APP_PRIVATE_KEY_PATH (a .pem file, preferred) or inline GITHUB_APP_PRIVATE_KEY.
export function githubAppPrivateKey(): string | null {
  const path = process.env.GITHUB_APP_PRIVATE_KEY_PATH;
  if (path) {
    try {
      return readFileSync(path, "utf8");
    } catch {
      return null;
    }
  }
  const inline = process.env.GITHUB_APP_PRIVATE_KEY;
  return inline && inline !== "replace_me" ? inline.replace(/\\n/g, "\n") : null;
}

export const ghKeyConfigured = () => /-----BEGIN (RSA )?PRIVATE KEY-----/.test(githubAppPrivateKey() ?? "");

export class InvalidProject extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("Invalid project settings.");
    this.fields = fields;
  }
}

// The worker runs these without a shell: a package-manager binary plus plain arguments, no metacharacters.
export const SAFE_COMMAND = /^(npm|pnpm|yarn|node|npx)( [\w@./:=+-]+)*$/;

// Editable paths: relative prefixes inside the app, no traversal, no hidden/config locations.
export function parseEditablePaths(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}
const SAFE_PREFIX = /^(?!\/)(?!.*(^|\/)\.\.?(\/|$))(?!\.)[\w@./-]+$/;

// Validates only the fields that are present, so the setup wizard can save step by step.
export function validateProject(p: Partial<Project>) {
  const e: Record<string, string> = {};
  const has = (k: keyof Project) => p[k] !== undefined;
  if (has("repoUrl") && p.repoUrl && !repoFullName({ repoUrl: p.repoUrl })) e.repoUrl = "Use the HTTPS URL, e.g. https://github.com/owner/repo";
  if (has("branch") && p.branch && !/^[\w./-]+$/.test(p.branch)) e.branch = "A branch name";
  if (has("subdir") && p.subdir && !SAFE_PREFIX.test(p.subdir)) e.subdir = "A relative folder inside the repo";
  if (has("ghOwnerType") && p.ghOwnerType !== "user" && p.ghOwnerType !== "org") e.ghOwnerType = "user or org";
  if (has("ghOrg") && p.ghOrg && !/^[\w-]+$/.test(p.ghOrg)) e.ghOrg = "An organization login";
  for (const k of ["installCommand", "testCommand", "startCommand"] as const)
    if (has(k) && p[k] && !SAFE_COMMAND.test(p[k]!)) e[k] = "npm/pnpm/yarn/node/npx with plain arguments only (no ; | & $ quotes)";
  if (has("port") && p.port && !/^\d{2,5}$/.test(p.port)) e.port = "A port number";
  if (has("service") && p.service && !/^[\w.-]+$/.test(p.service)) e.service = "Letters, numbers, dot, dash or underscore";
  if (has("endpoint") && p.endpoint && !/^\/[\w/:.-]*$/.test(p.endpoint)) e.endpoint = "A route starting with /";
  for (const k of ["healthPath", "versionPath", "metricsPath"] as const)
    if (has(k) && p[k] && !/^\/[\w/.-]*$/.test(p[k]!)) e[k] = "A path starting with /";
  if (has("baseUrl") && p.baseUrl) {
    try {
      const u = new URL(p.baseUrl);
      if (u.protocol !== "http:" && u.protocol !== "https:") throw new Error();
    } catch {
      e.baseUrl = "A full http(s) URL, e.g. http://localhost:5002";
    }
  }
  if (has("p95ThresholdMs") && p.p95ThresholdMs && !/^\d+$/.test(p.p95ThresholdMs)) e.p95ThresholdMs = "Milliseconds";
  if (has("editablePaths") && p.editablePaths) {
    const bad = parseEditablePaths(p.editablePaths).filter((x) => !SAFE_PREFIX.test(x));
    if (bad.length) e.editablePaths = `Relative paths only, e.g. routes/,db.js (bad: ${bad.join(", ")})`;
  }
  if (Object.keys(e).length) throw new InvalidProject(e);
}

export async function saveProject(patch: Partial<Project> & { complete?: boolean }): Promise<Project> {
  const clean: Partial<Project> = {};
  for (const k of FIELDS) {
    const v = patch[k];
    if (typeof v === "string") (clean as Record<string, string>)[k] = v.trim().slice(0, 500);
  }
  validateProject(clean);
  const current = (await getProject()) ?? EMPTY_PROJECT;
  const config: Partial<Project> = { ...current, ...clean };
  for (const k of SERVER_ONLY) delete config[k];
  await pool.query(
    `INSERT INTO project (id, config, completed_at) VALUES (1, $1, CASE WHEN $2 THEN now() END)
     ON CONFLICT (id) DO UPDATE SET config = $1, updated_at = now(),
       completed_at = CASE WHEN $2 THEN now() ELSE project.completed_at END`,
    [JSON.stringify(config), Boolean(patch.complete)],
  );
  return (await getProject())!;
}

export async function deleteProject() {
  await pool.query("DELETE FROM project WHERE id = 1");
}
