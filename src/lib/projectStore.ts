import { pool } from "@/lib/db";
import { EMPTY_PROJECT, type Project } from "@/lib/model";

const FIELDS = Object.keys(EMPTY_PROJECT).filter((k) => k !== "completedAt") as (keyof Project)[];

export async function getProject(): Promise<Project | null> {
  const { rows } = await pool.query("SELECT config, completed_at FROM project WHERE id = 1");
  if (!rows[0]) return null;
  return { ...EMPTY_PROJECT, ...rows[0].config, completedAt: rows[0].completed_at?.toISOString() ?? null };
}

// The Prometheus job that scrapes the service; the queries filter on it.
export async function serviceJob(): Promise<string | null> {
  return (await getProject())?.service || null;
}

export const ghKeyConfigured = () => Boolean(process.env.GITHUB_APP_PRIVATE_KEY && process.env.GITHUB_APP_PRIVATE_KEY !== "replace_me");

export class InvalidProject extends Error {
  constructor(public fields: Record<string, string>) {
    super("Invalid project settings.");
  }
}

// Validates only the fields that are present, so the setup wizard can save step by step.
function validate(p: Partial<Project>) {
  const e: Record<string, string> = {};
  const has = (k: keyof Project) => p[k] !== undefined;
  if (has("repoUrl") && p.repoUrl && !/^https:\/\/github\.com\/[\w.-]+\/[\w.-]+?(\.git)?\/?$/.test(p.repoUrl))
    e.repoUrl = "Use the HTTPS URL, e.g. https://github.com/owner/repo";
  if (has("ghAppId") && p.ghAppId && !/^\d+$/.test(p.ghAppId)) e.ghAppId = "The numeric App ID";
  if (has("ghAppSlug") && p.ghAppSlug && !/^[a-z0-9-]+$/.test(p.ghAppSlug)) e.ghAppSlug = "Lowercase letters, numbers and dashes";
  if (has("ghInstallationId") && p.ghInstallationId && !/^\d+$/.test(p.ghInstallationId)) e.ghInstallationId = "The numeric Installation ID";
  if (has("ghOwnerType") && p.ghOwnerType !== "user" && p.ghOwnerType !== "org") e.ghOwnerType = "user or org";
  if (has("port") && p.port && !/^\d{2,5}$/.test(p.port)) e.port = "A port number";
  if (has("service") && p.service && !/^[\w.-]+$/.test(p.service)) e.service = "Letters, numbers, dot, dash or underscore";
  if (has("endpoint") && p.endpoint && !p.endpoint.startsWith("/")) e.endpoint = "Must start with /";
  for (const k of ["healthPath", "versionPath", "metricsPath"] as const) if (has(k) && p[k] && !p[k]!.startsWith("/")) e[k] = "Must start with /";
  if (has("baseUrl") && p.baseUrl) {
    try {
      new URL(p.baseUrl);
    } catch {
      e.baseUrl = "A full URL, e.g. http://localhost:5002";
    }
  }
  if (has("p95ThresholdMs") && p.p95ThresholdMs && !/^\d+$/.test(p.p95ThresholdMs)) e.p95ThresholdMs = "Milliseconds";
  if (Object.keys(e).length) throw new InvalidProject(e);
}

export async function saveProject(patch: Partial<Project> & { complete?: boolean }): Promise<Project> {
  const clean: Partial<Project> = {};
  for (const k of FIELDS) {
    const v = patch[k];
    if (typeof v === "string") (clean as Record<string, string>)[k] = v.trim().slice(0, 500);
  }
  validate(clean);
  const current = (await getProject()) ?? EMPTY_PROJECT;
  const config: Partial<Project> = { ...current, ...clean };
  delete config.completedAt; // stored in its own column
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
