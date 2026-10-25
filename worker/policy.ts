import { lstatSync, realpathSync } from "node:fs";
import { join, posix, sep } from "node:path";

export type ProposedEdit = { path: string; content: string };
export type ValidEdit = { rel: string; abs: string; content: string };

// Never editable, whatever the allowlist says: secrets/config, CI, dependency manifests, tests, the k6 workload.
const DENY = [
  /(^|\/)\.[^/]*/, // any dotfile or dot-directory (.env, .github, .git, .npmrc)
  /(^|\/)(package\.json|package-lock\.json|npm-shrinkwrap\.json|pnpm-lock\.yaml|yarn\.lock)$/,
  /(^|\/)(Dockerfile|docker-compose[\w.-]*\.ya?ml)$/,
  /(^|\/)node_modules(\/|$)/,
  /(^|\/)(tests?|__tests__|spec)(\/|$)/,
  /\.(test|spec)\.[cm]?[jt]sx?$/,
  /\.(pem|key|crt|p12)$/,
  /(^|\/)loadtest(\/|$)/,
];

export const LIMITS = { maxFiles: 5, maxBytes: 100_000 };

// Model output is untrusted: every path is checked here, in code, before anything is written.
export function validateEdits(edits: ProposedEdit[], root: string, allow: string[]): { ok: true; files: ValidEdit[] } | { ok: false; reason: string } {
  if (!edits.length) return { ok: false, reason: "The agent proposed no edits." };
  if (edits.length > LIMITS.maxFiles) return { ok: false, reason: `Too many files (${edits.length} > ${LIMITS.maxFiles}).` };
  if (!allow.length) return { ok: false, reason: "No editable paths are configured for this project." };
  const realRoot = realpathSync(root);
  const files: ValidEdit[] = [];
  const seen = new Set<string>();

  for (const e of edits) {
    const p = e.path;
    if (typeof p !== "string" || !p || p.includes("\0") || p.includes("\\")) return { ok: false, reason: `Invalid path: ${String(p).slice(0, 80)}` };
    if (p.startsWith("/") || posix.normalize(p) !== p || p.split("/").includes("..")) return { ok: false, reason: `Path must be relative and normalized: ${p}` };
    if (DENY.some((d) => d.test(p))) return { ok: false, reason: `Path is never editable: ${p}` };
    if (!allow.some((a) => (a.endsWith("/") ? p.startsWith(a) : p === a))) return { ok: false, reason: `Path is outside the editable paths (${allow.join(", ")}): ${p}` };
    if (seen.has(p)) return { ok: false, reason: `Duplicate edit: ${p}` };
    if (typeof e.content !== "string" || Buffer.byteLength(e.content) > LIMITS.maxBytes) return { ok: false, reason: `Content too large or invalid: ${p}` };
    const abs = join(realRoot, p);
    let st;
    try {
      st = lstatSync(abs);
    } catch {
      return { ok: false, reason: `Only existing files can be edited: ${p}` };
    }
    if (!st.isFile() || st.isSymbolicLink()) return { ok: false, reason: `Not a regular file: ${p}` };
    if (!realpathSync(abs).startsWith(realRoot + sep)) return { ok: false, reason: `Path escapes the workspace: ${p}` };
    seen.add(p);
    files.push({ rel: p, abs, content: e.content });
  }
  return { ok: true, files };
}
