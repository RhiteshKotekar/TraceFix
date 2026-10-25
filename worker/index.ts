// TraceFix fix worker. Run: npm run worker (separate process from the Next.js app).
import { chmodSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { hostname } from "node:os";
import { join, resolve } from "node:path";
import { logEvent, pool } from "../src/lib/db.ts";
import { endpointMetrics } from "../src/lib/prometheus.ts";
import { getProject, parseEditablePaths, repoFullName } from "../src/lib/projectStore.ts";
import type { Project, RunStep, Stage } from "../src/lib/model.ts";
import { AgentError, runAgent } from "./agent.ts";
import { evaluateGates, type K6, type Measured } from "./gates.ts";
import { GitHubError, gitAuthEnv, installationToken, openPullRequest, type PrFile } from "./github.ts";
import { validateEdits } from "./policy.ts";
import { argv, run, sanitize, start, targetEnv, waitForHttp } from "./run.ts";

const WORKER_ID = `${hostname()}-${process.pid}`;
const POLL_MS = Number(process.env.WORKER_POLL_INTERVAL_SECONDS || 3) * 1000;
const LEASE_S = 90;
const WORKSPACES = resolve(process.env.WORKSPACE_ROOT || ".workspaces");
const LOADTEST_DIR = resolve("loadtest");
const K6_IMAGE = process.env.K6_IMAGE || "grafana/k6:1.3.0";
const VUS = process.env.LOADTEST_VUS || "20";
const DURATION = process.env.LOADTEST_DURATION || "20s";
const MIN_IMPROVEMENT = Number(process.env.GATE_MIN_P95_IMPROVEMENT || 0.2);
const MIN_REQUESTS = Number(process.env.GATE_MIN_REQUESTS || 100);

class JobError extends Error {
  status: "FAILED" | "INCONCLUSIVE";
  constructor(message: string, status: "FAILED" | "INCONCLUSIVE" = "FAILED") {
    super(message);
    this.status = status;
  }
}

// --- job bookkeeping -------------------------------------------------------------------------

async function update(jobId: string, fields: Record<string, unknown>) {
  const keys = Object.keys(fields);
  const sets = keys.map((k, i) => `${k} = $${i + 2}`).join(", ");
  const values = keys.map((k) => {
    const v = fields[k];
    return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
  });
  await pool.query(`UPDATE jobs SET ${sets}, updated_at = now() WHERE id = $1`, [jobId, ...values]);
}

async function pushStep(jobId: string, step: RunStep) {
  await pool.query("UPDATE jobs SET run_log = run_log || $2::jsonb, updated_at = now() WHERE id = $1", [jobId, JSON.stringify([step])]);
}
async function replaceLastStep(jobId: string, step: RunStep) {
  await pool.query(
    "UPDATE jobs SET run_log = jsonb_set(run_log, ARRAY[(jsonb_array_length(run_log) - 1)::text], $2::jsonb), updated_at = now() WHERE id = $1",
    [jobId, JSON.stringify(step)],
  );
}

// Runs one visible stage: marks it running, then done/failed with output, in the job's run log.
async function stage<T>(jobId: string, s: Stage, message: string, command: string | null, fn: () => Promise<{ value: T; output?: string; ok?: boolean }>, ws: string): Promise<T> {
  await update(jobId, { stage: s, progress_message: message });
  await pushStep(jobId, { stage: s, status: "running", command, output: null, durationS: null });
  const t0 = Date.now();
  try {
    const r = await fn();
    await replaceLastStep(jobId, {
      stage: s,
      status: r.ok === false ? "failed" : "done",
      command,
      output: r.output ? sanitize(r.output, ws) : null,
      durationS: Math.round((Date.now() - t0) / 100) / 10,
    });
    return r.value;
  } catch (e) {
    await replaceLastStep(jobId, { stage: s, status: "failed", command, output: sanitize((e as Error).message, ws), durationS: Math.round((Date.now() - t0) / 100) / 10 });
    throw e;
  }
}

// --- k6 (Docker), same workload for baseline and candidate ------------------------------------

async function k6(outDir: string, port: string, endpoint: string): Promise<{ k6: K6 | null; output: string }> {
  mkdirSync(outDir, { recursive: true });
  chmodSync(outDir, 0o777); // the k6 image runs as a non-root user
  const r = await run(
    [
      "docker", "run", "--rm", "--network", "host",
      "-v", `${LOADTEST_DIR}:/scripts:ro`, "-v", `${outDir}:/out`,
      "-e", `BASE_URL=http://127.0.0.1:${port}`, "-e", `ENDPOINT=${endpoint}`, "-e", `VUS=${VUS}`, "-e", `DURATION=${DURATION}`,
      K6_IMAGE, "run", "--quiet", "/scripts/endpoint.js",
    ],
    outDir,
    { PATH: process.env.PATH ?? "/usr/bin:/bin" },
    5 * 60_000,
  );
  const file = join(outDir, "summary.json");
  if (r.code !== 0 || !existsSync(file)) return { k6: null, output: r.output || "k6 produced no summary" };
  const m = JSON.parse(readFileSync(file, "utf8")).metrics;
  const d = m.http_req_duration?.values ?? {};
  const k: K6 = {
    p50: d.med ?? null,
    p95: d["p(95)"] ?? null,
    rps: m.http_reqs?.values?.rate ?? null,
    errorRate: m.http_req_failed?.values?.rate ?? null,
    requests: m.http_reqs?.values?.count ?? 0,
    durationS: Number(String(DURATION).replace(/s$/, "")) || 0,
  };
  return { k6: k, output: `p50=${Math.round(k.p50 ?? 0)}ms p95=${Math.round(k.p95 ?? 0)}ms requests=${k.requests} rate=${(k.rps ?? 0).toFixed(1)}/s errors=${((k.errorRate ?? 0) * 100).toFixed(2)}%` };
}

// --- the pipeline -------------------------------------------------------------------------------

function requireProject(p: Project | null): Project & { repo: string; allow: string[] } {
  if (!p) throw new JobError("No project is configured. Finish /setup first.");
  const repo = repoFullName(p);
  const missing = (["repoUrl", "branch", "installCommand", "testCommand", "startCommand", "port", "healthPath", "versionPath", "baseUrl", "editablePaths"] as const).filter((k) => !p[k]);
  if (!repo || missing.length) throw new JobError(`Project setup is incomplete: ${missing.join(", ") || "repoUrl"} missing. Fill them in /setup, then retry.`);
  return { ...p, repo, allow: parseEditablePaths(p.editablePaths) };
}

// Concrete URL for a route pattern (/api/products/:id → /api/products/1).
const concrete = (route: string) => route.replace(/:[^/]+/g, "1");

async function measure(jobId: string, ws: string, appDir: string, p: Project, endpoint: string, label: "Baseline" | "Candidate", stages: { start: Stage; load: Stage }): Promise<Measured & { testOutput: string }> {
  const env = targetEnv({ PORT: p.port });
  const tests = await stage(jobId, stages.start === "START" ? "INSTALL" : "VERIFYING", `${label}: running tests`, p.testCommand, async () => {
    const r = await run(argv(p.testCommand), appDir, env, 5 * 60_000);
    return { value: r, output: r.output, ok: r.code === 0 };
  }, ws);

  const app = start(argv(p.startCommand), appDir, env);
  try {
    await stage(jobId, stages.start, `${label}: starting the app on port ${p.port}`, `PORT=${p.port} ${p.startCommand}`, async () => {
      const ok = await waitForHttp(`http://127.0.0.1:${p.port}${p.healthPath}`, 60_000, () => !app.exited());
      if (!ok) throw new JobError(`${label}: the app did not become healthy at ${p.healthPath}.\n${app.output()}`, "INCONCLUSIVE");
      return { value: null, output: `${p.healthPath} → 200` };
    }, ws);
    const load = await stage(jobId, stages.load, `${label}: k6 load (${VUS} VUs, ${DURATION}) on ${endpoint}`, `k6 run loadtest/endpoint.js (${VUS} VUs, ${DURATION}) ${endpoint}`, async () => {
      const r = await k6(join(ws, `k6-${label.toLowerCase()}`), p.port, endpoint);
      return { value: r.k6, output: r.output, ok: r.k6 != null };
    }, ws);
    return { tests: { passed: tests.code === 0 }, k6: load, testOutput: sanitize(tests.output, ws) };
  } finally {
    await app.stop();
  }
}

async function processJob(jobId: string, incidentId: string) {
  const ws = join(WORKSPACES, jobId);
  try {
    const {
      rows: [inc],
    } = await pool.query("SELECT alert_name, service, endpoint FROM incidents WHERE id = $1", [incidentId]);
    const {
      rows: [job],
    } = await pool.query("SELECT evidence FROM jobs WHERE id = $1", [jobId]);
    const p = requireProject(await getProject());
    const endpoint = concrete(inc.endpoint.startsWith("/") ? inc.endpoint : p.endpoint);
    if (!endpoint.startsWith("/")) throw new JobError("This incident has no HTTP route to load-test.");

    // Evidence (real Prometheus values; missing ones stay null).
    if (!job.evidence) await update(jobId, { evidence: await endpointMetrics(inc.endpoint, "10m").catch(() => null) });

    // CLONE: exact deployed commit, never the default branch.
    const appDir = join(ws, p.subdir || ".");
    const sha = await stage(jobId, "CLONE", "Resolving the deployed commit and cloning it", `GET ${p.versionPath}; git fetch <sha>`, async () => {
      const v = await fetch(new URL(p.versionPath, p.baseUrl), { signal: AbortSignal.timeout(5000) })
        .then((r) => r.json())
        .catch(() => null);
      const sha = typeof v?.sha === "string" && /^[0-9a-f]{7,40}$/.test(v.sha) ? v.sha : null;
      if (!sha) throw new JobError(`The running service does not report its commit at ${p.versionPath} (got ${JSON.stringify(v)}). Start it with GIT_SHA set; TraceFix never falls back to the default branch.`);
      const token = await installationToken(p.repo);
      mkdirSync(ws, { recursive: true });
      const git = (args: string[]) => run(["git", ...args], ws, { ...targetEnv(), ...gitAuthEnv(token) }, 120_000);
      for (const args of [["init", "-q"], ["remote", "add", "origin", `https://github.com/${p.repo}.git`], ["fetch", "-q", "--depth", "1", "origin", sha], ["checkout", "-q", "--detach", "FETCH_HEAD"]]) {
        const r = await git(args);
        if (r.code !== 0) throw new JobError(`git ${args[0]} failed: ${r.output}`);
      }
      const head = (await run(["git", "rev-parse", "HEAD"], ws, targetEnv(), 10_000)).output.trim();
      if (!head.startsWith(sha) && !sha.startsWith(head.slice(0, sha.length))) throw new JobError(`Checked out ${head}, expected ${sha}.`);
      return { value: head, output: `deployed ${sha} · checked out ${head.slice(0, 12)} from ${p.repo}` };
    }, ws);
    await update(jobId, { commit_sha: sha });

    // INSTALL (dependencies), then BASELINE tests + load.
    await stage(jobId, "INSTALL", "Installing dependencies", p.installCommand, async () => {
      const r = await run(argv(p.installCommand), appDir, targetEnv(), 10 * 60_000);
      if (r.code !== 0) throw new JobError(`Install failed:\n${r.output}`, "INCONCLUSIVE");
      return { value: null, output: r.output };
    }, ws);
    const baseline = await measure(jobId, ws, appDir, p, endpoint, "Baseline", { start: "START", load: "REPRODUCE" });
    const threshold = Number(p.p95ThresholdMs) || 200;
    const reproduced = baseline.k6?.p95 != null ? baseline.k6.p95 > threshold : null;
    await update(jobId, {
      baseline: { tests: { passed: baseline.tests.passed, outputTail: baseline.testOutput }, k6: baseline.k6 },
      reproduction: {
        reproduced,
        detail:
          reproduced == null
            ? "Could not measure the baseline."
            : `Baseline p95 ${Math.round(baseline.k6!.p95!)} ms vs threshold ${threshold} ms on ${endpoint}${reproduced ? "" : " (not slow in isolation)"}.`,
      },
    });
    if (!baseline.tests.passed) throw new JobError("Baseline tests fail on the deployed commit, so a fix can't be verified.", "INCONCLUSIVE");
    if (!baseline.k6) throw new JobError("The baseline load test did not produce measurements.", "INCONCLUSIVE");

    // INVESTIGATING → PATCHING → VERIFYING, with one repair round if the candidate's tests fail.
    const { rows: reports } = await pool.query("SELECT count(*)::int AS n, max(value_ms) AS worst FROM reports WHERE incident_id = $1", [incidentId]);
    const evidence = (await pool.query("SELECT evidence FROM jobs WHERE id = $1", [jobId])).rows[0].evidence;
    let previousAttempt: { editedPaths: string[]; failure: string } | undefined;
    let agent!: Awaited<ReturnType<typeof runAgent>>;
    let files!: Awaited<ReturnType<typeof applyEdits>>["value"];
    let candidate!: Awaited<ReturnType<typeof measure>>;
    const totals = { inputTokens: 0, outputTokens: 0, toolCalls: 0, responseIds: [] as string[] };
    for (let round = 1; round <= 2; round++) {
      agent = await stage(jobId, "INVESTIGATING", round === 1 ? "OpenAI agent is reading the code" : "OpenAI agent is revising the fix after failing tests", `openai responses (${process.env.OPENAI_MODEL})${round > 1 ? " · repair round" : ""}`, async () => {
        const a = await runAgent(appDir, {
          incident: { alertName: inc.alert_name, service: inc.service, endpoint: inc.endpoint, reports: reports[0].n, worstP95Ms: reports[0].worst },
          evidence,
          baseline: baseline.k6,
          editablePaths: p.allow,
          loadtest: { method: "GET", url: endpoint, vus: VUS, duration: DURATION },
          previousAttempt,
        });
        return { value: a, output: `${a.meta.model}: ${a.meta.toolCalls} tool calls, ${a.meta.inputTokens + a.meta.outputTokens} tokens · ${a.output.diagnosis}` };
      }, ws);
      totals.inputTokens += agent.meta.inputTokens;
      totals.outputTokens += agent.meta.outputTokens;
      totals.toolCalls += agent.meta.toolCalls;
      totals.responseIds.push(...agent.meta.responseIds);
      await update(jobId, { agent_output: agent.output, model_meta: { ...agent.meta, ...totals } });

      // PATCHING: code enforces the path policy; the model only proposes. Each round starts from the tested commit.
      await run(["git", "checkout", "--", "."], ws, targetEnv(), 10_000);
      files = await stage(jobId, "PATCHING", "Validating and applying the proposed edits", null, () => applyEdits(jobId, ws, appDir, agent.edits, p.allow), ws);

      // VERIFYING: same tests and same k6 workload on the candidate.
      candidate = await measure(jobId, ws, appDir, p, endpoint, "Candidate", { start: "VERIFYING", load: "VERIFYING" });
      if (candidate.tests.passed || round === 2) break;
      previousAttempt = { editedPaths: agent.output.editedPaths, failure: `The project's tests failed with your change:\n${candidate.testOutput.slice(-3000)}` };
    }
    const { decision, gates } = evaluateGates(baseline, candidate, { minP95Improvement: MIN_IMPROVEMENT, minRequests: MIN_REQUESTS });
    await update(jobId, {
      candidate: { tests: { passed: candidate.tests.passed, outputTail: candidate.testOutput }, k6: candidate.k6 },
      decision,
      gate_results: gates,
    });
    if (decision !== "PASS") {
      await update(jobId, {
        status: decision === "FAIL" ? "VERIFICATION_FAILED" : "INCONCLUSIVE",
        progress_message: `Gates: ${decision}. No pull request was opened.`,
        finished_at: new Date(),
      });
      await logEvent("worker", "warn", `Fix pipeline ${decision} for ${inc.endpoint}; no PR`, incidentId, pool, "worker");
      return;
    }

    // OPENING_PR: only after PASS, as the GitHub App, on top of the tested commit.
    const branch = `tracefix/${jobId.slice(0, 8)}`;
    const pr = await stage(jobId, "OPENING_PR", "Opening the pull request", `GitHub App: commit on ${sha.slice(0, 7)} → ${branch} → PR into ${p.branch}`, async () => {
      const token = await installationToken(p.repo);
      const prefix = p.subdir ? `${p.subdir.replace(/\/$/, "")}/` : "";
      const prFiles: PrFile[] = [];
      for (const f of files) {
        const mode = (await run(["git", "ls-files", "-s", "--", prefix + f.rel], ws, targetEnv(), 10_000)).output.startsWith("100755") ? "100755" : "100644";
        prFiles.push({ path: prefix + f.rel, content: f.content, mode });
      }
      const b = baseline.k6!;
      const c = candidate.k6!;
      const body = [
        `## TraceFix: ${inc.alert_name} on \`${inc.endpoint}\``,
        "",
        `**Diagnosis** (${agent.meta.model}): ${agent.output.diagnosis}`,
        "",
        "| Metric | Before | After |",
        "|---|---:|---:|",
        `| p50 | ${Math.round(b.p50 ?? 0)} ms | ${Math.round(c.p50 ?? 0)} ms |`,
        `| p95 | ${Math.round(b.p95 ?? 0)} ms | ${Math.round(c.p95 ?? 0)} ms |`,
        `| Throughput | ${(b.rps ?? 0).toFixed(1)}/s | ${(c.rps ?? 0).toFixed(1)}/s |`,
        `| Error rate | ${((b.errorRate ?? 0) * 100).toFixed(2)}% | ${((c.errorRate ?? 0) * 100).toFixed(2)}% |`,
        `| Requests | ${b.requests} | ${c.requests} |`,
        "",
        "**Gates (evaluated in code):**",
        ...gates.map((g) => `- ${g.passed ? "✅" : "❌"} ${g.name}: ${g.detail}`),
        "",
        `Measured on deployed commit \`${sha.slice(0, 12)}\` with the same k6 workload (${VUS} VUs, ${DURATION}) before and after. Tests: ${candidate.tests.passed ? "pass" : "fail"}.`,
        "",
        "**Risks:**",
        ...agent.output.risks.map((r) => `- ${r}`),
        "",
        "_Opened by TraceFix for human review. TraceFix never merges or deploys._",
      ].join("\n");
      const out = await openPullRequest({
        token,
        repo: p.repo,
        baseSha: sha,
        baseBranch: p.branch,
        branch,
        files: prFiles,
        commitMessage: `perf(${inc.endpoint}): ${agent.output.diagnosis.slice(0, 60)}\n\nTraceFix job ${jobId}`,
        title: `TraceFix: speed up ${inc.endpoint} (p95 ${Math.round(b.p95 ?? 0)} → ${Math.round(c.p95 ?? 0)} ms)`,
        body,
      });
      return { value: { ...out, branch }, output: out.url };
    }, ws);

    await update(jobId, {
      status: "PR_CREATED",
      pr_url: pr.url,
      pr_repo: p.repo,
      pr_number: pr.number,
      pr_branch: pr.branch,
      pr_state: "open",
      pr_updated_at: new Date(),
      progress_message: `Pull request #${pr.number} opened for review.`,
      finished_at: new Date(),
    });
    await logEvent("worker", "info", `Opened PR #${pr.number} for ${inc.endpoint}`, incidentId, pool, "worker");
  } catch (e) {
    const status = e instanceof JobError ? e.status : "FAILED";
    const msg =
      e instanceof JobError || e instanceof AgentError || e instanceof GitHubError ? e.message : `Unexpected error: ${(e as Error)?.message ?? "unknown"}`;
    await update(jobId, { status, error: sanitize(msg, ws).slice(0, 2000), progress_message: null, finished_at: new Date() });
    await logEvent("worker", "error", `Fix pipeline ${status.toLowerCase()}: ${sanitize(msg, ws).slice(0, 200)}`, incidentId, pool, "worker");
  } finally {
    rmSync(ws, { recursive: true, force: true });
  }
}

async function applyEdits(jobId: string, ws: string, appDir: string, edits: { path: string; content: string }[], allow: string[]) {
  const v = validateEdits(edits, appDir, allow);
  if (!v.ok) throw new JobError(`Edits rejected by policy: ${v.reason}`);
  for (const f of v.files) writeFileSync(f.abs, f.content);
  const diff = await run(["git", "diff", "--no-color"], ws, targetEnv(), 10_000);
  if (!diff.output.trim()) throw new JobError("The proposed edits do not change anything.");
  await update(jobId, { diff: diff.output.slice(0, 200_000) });
  return { value: v.files, output: v.files.map((f) => f.rel).join(", ") };
}

// --- loop -----------------------------------------------------------------------------------

async function recoverInterrupted() {
  // A RUNNING job whose lease expired belongs to a worker that died. It is failed visibly (Retry re-queues it).
  const { rows } = await pool.query(
    `UPDATE jobs SET status = 'FAILED', finished_at = now(), updated_at = now(), progress_message = NULL,
       error = 'Interrupted: the worker stopped while running this job. Use Retry on the incident.'
     WHERE status = 'RUNNING' AND lease_until < now() RETURNING id, incident_id`,
  );
  for (const r of rows) await logEvent("worker", "warn", "Fix pipeline interrupted by a worker restart", r.incident_id, pool, "worker");
}

async function claim(): Promise<{ id: string; incident_id: string } | null> {
  const { rows } = await pool.query(
    `UPDATE jobs SET status = 'RUNNING', started_at = now(), updated_at = now(), attempts = attempts + 1,
       worker_id = $1, lease_until = now() + $2 * interval '1 second', run_log = '[]', error = NULL
     WHERE id = (SELECT id FROM jobs WHERE status = 'QUEUED' ORDER BY created_at FOR UPDATE SKIP LOCKED LIMIT 1)
     RETURNING id, incident_id`,
    [WORKER_ID, LEASE_S],
  );
  return rows[0] ?? null;
}

async function heartbeat(jobId: string | null) {
  await pool.query(
    `INSERT INTO worker_heartbeats (worker_id, seen_at, current_job) VALUES ($1, now(), $2)
     ON CONFLICT (worker_id) DO UPDATE SET seen_at = now(), current_job = $2`,
    [WORKER_ID, jobId],
  );
  if (jobId) await pool.query("UPDATE jobs SET lease_until = now() + $2 * interval '1 second' WHERE id = $1", [jobId, LEASE_S]);
}

let stopping = false;
for (const sig of ["SIGINT", "SIGTERM"] as const) process.on(sig, () => (stopping = true));

async function main() {
  mkdirSync(WORKSPACES, { recursive: true });
  console.log(`TraceFix worker ${WORKER_ID} polling every ${POLL_MS / 1000}s`);
  while (!stopping) {
    try {
      await recoverInterrupted();
      await heartbeat(null);
      const job = await claim();
      if (job) {
        console.log(`Claimed job ${job.id}`);
        await logEvent("worker", "info", "Fix pipeline started", job.incident_id, pool, "worker");
        const beat = setInterval(() => heartbeat(job.id).catch(() => {}), 15_000);
        try {
          await processJob(job.id, job.incident_id);
        } finally {
          clearInterval(beat);
          await heartbeat(null);
        }
        console.log(`Finished job ${job.id}`);
        continue;
      }
    } catch (e) {
      console.error("Worker loop error:", sanitize((e as Error)?.message ?? String(e)));
    }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
  await pool.end();
}

main();
