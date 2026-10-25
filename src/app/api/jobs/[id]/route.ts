import { guard } from "@/lib/auth";
import { pool } from "@/lib/db";

// Job progress for polling clients.
export async function GET(req: Request, ctx: RouteContext<"/api/jobs/[id]">) {
  const g = await guard(req);
  if (g.error) return g.error;
  const { id } = await ctx.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
  const { rows } = await pool.query(
    "SELECT id, status, stage, progress_message, decision, pr_url, pr_state, pr_review, error, updated_at FROM jobs WHERE id = $1",
    [id],
  );
  if (!rows[0]) return Response.json({ error: { code: "NOT_FOUND", message: "Job not found." } }, { status: 404 });
  const r = rows[0];
  return Response.json(
    {
      id: r.id,
      status: r.status,
      stage: r.stage,
      progressMessage: r.progress_message,
      decision: r.decision,
      prUrl: r.pr_url,
      prState: r.pr_state,
      prReview: r.pr_review,
      error: r.error,
      updatedAt: r.updated_at.toISOString(),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
