import { createSign } from "node:crypto";
import { githubAppPrivateKey } from "../src/lib/projectStore.ts";

const API = "https://api.github.com";

export class GitHubError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

function appJwt(): string {
  const key = githubAppPrivateKey();
  const iss = process.env.GITHUB_APP_CLIENT_ID || process.env.GITHUB_APP_ID;
  if (!key || !iss || iss === "replace_me") throw new GitHubError(0, "GitHub App is not configured (GITHUB_APP_CLIENT_ID/ID and private key).");
  const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat: now - 60, exp: now + 540, iss })}`;
  const sig = createSign("RSA-SHA256").update(unsigned).sign(key).toString("base64url");
  return `${unsigned}.${sig}`;
}

async function gh<T>(path: string, token: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    method: init.method ?? "GET",
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      ...(init.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init.body ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) {
    const msg = ((await res.json().catch(() => null)) as { message?: string } | null)?.message ?? res.statusText;
    const hint =
      res.status === 404 ? " (is the GitHub App installed on this repository?)" : res.status === 403 ? " (missing permission or rate limited)" : "";
    throw new GitHubError(res.status, `GitHub ${init.method ?? "GET"} ${path.split("?")[0]} → ${res.status}: ${msg}${hint}`);
  }
  return (res.status === 204 ? null : await res.json()) as T;
}

// Short-lived (1h) token for exactly one repository. The installation is looked up from GitHub, never trusted from input.
export async function installationToken(repo: string): Promise<string> {
  const jwt = appJwt();
  const inst = await gh<{ id: number }>(`/repos/${repo}/installation`, jwt);
  const name = repo.split("/")[1];
  const t = await gh<{ token: string }>(`/app/installations/${inst.id}/access_tokens`, jwt, {
    method: "POST",
    body: { repositories: [name], permissions: { contents: "write", pull_requests: "write", metadata: "read" } },
  });
  return t.token;
}

// Git over HTTPS with the token in an extra header (via env), so it never lands in argv, URLs or .git/config.
export function gitAuthEnv(token: string): Record<string, string> {
  const basic = Buffer.from(`x-access-token:${token}`).toString("base64");
  return {
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_COUNT: "1",
    GIT_CONFIG_KEY_0: "http.https://github.com/.extraheader",
    GIT_CONFIG_VALUE_0: `AUTHORIZATION: basic ${basic}`,
  };
}

export type PrFile = { path: string; content: string; mode: "100644" | "100755" };

// Commit the validated edits on top of the exact tested SHA, create the branch, and open the PR.
export async function openPullRequest(o: {
  token: string;
  repo: string;
  baseSha: string;
  baseBranch: string;
  branch: string;
  files: PrFile[];
  commitMessage: string;
  title: string;
  body: string;
}): Promise<{ number: number; url: string; state: "open" }> {
  const { token, repo } = o;
  const owner = repo.split("/")[0];

  // Idempotent: if a PR for this branch already exists (worker retried after a crash), reuse it.
  const existing = await gh<{ number: number; html_url: string }[]>(`/repos/${repo}/pulls?head=${owner}:${encodeURIComponent(o.branch)}&state=all`, token);
  if (existing[0]) return { number: existing[0].number, url: existing[0].html_url, state: "open" };

  const base = await gh<{ tree: { sha: string } }>(`/repos/${repo}/git/commits/${o.baseSha}`, token);
  const tree = [];
  for (const f of o.files) {
    const blob = await gh<{ sha: string }>(`/repos/${repo}/git/blobs`, token, {
      method: "POST",
      body: { content: Buffer.from(f.content).toString("base64"), encoding: "base64" },
    });
    tree.push({ path: f.path, mode: f.mode, type: "blob", sha: blob.sha });
  }
  const newTree = await gh<{ sha: string }>(`/repos/${repo}/git/trees`, token, { method: "POST", body: { base_tree: base.tree.sha, tree } });
  const commit = await gh<{ sha: string }>(`/repos/${repo}/git/commits`, token, {
    method: "POST",
    body: { message: o.commitMessage, tree: newTree.sha, parents: [o.baseSha] },
  });
  try {
    await gh(`/repos/${repo}/git/refs`, token, { method: "POST", body: { ref: `refs/heads/${o.branch}`, sha: commit.sha } });
  } catch (e) {
    if (!(e instanceof GitHubError && e.status === 422)) throw e;
    await gh(`/repos/${repo}/git/refs/heads/${o.branch}`, token, { method: "PATCH", body: { sha: commit.sha, force: true } });
  }
  const pr = await gh<{ number: number; html_url: string }>(`/repos/${repo}/pulls`, token, {
    method: "POST",
    body: { title: o.title, head: o.branch, base: o.baseBranch, body: o.body, maintainer_can_modify: false },
  });
  return { number: pr.number, url: pr.html_url, state: "open" };
}
