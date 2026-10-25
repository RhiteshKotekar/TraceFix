import { decide, InvalidState, retry } from "@/lib/incidents";
import { guard } from "@/lib/auth";

const err = (status: number, code: string, message: string) => Response.json({ error: { code, message } }, { status });

// Shared handler for POST /api/incidents/[id]/approve, /reject and /retry. The decider is the signed-in user.
export async function decisionRoute(req: Request, id: string, action: "approve" | "reject" | "retry") {
  const g = await guard(req);
  if (g.error) return g.error;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return err(404, "NOT_FOUND", "Incident not found.");
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;
  // shortcut: login isn't enforced, so the name is whatever the browser's sign-in screen recorded.
  const by = typeof body?.by === "string" && body.by.trim() ? body.by.trim().slice(0, 80) : g.user.name;
  try {
    const out = action === "retry" ? await retry(id, by) : await decide(id, action, by, reason);
    return Response.json({ incidentId: id, ...out }, { status: action === "reject" ? 200 : 201 });
  } catch (e) {
    if (e instanceof InvalidState) return err(409, "INVALID_STATE", e.message);
    // Unique index on active jobs: a concurrent request already queued one.
    if ((e as { code?: string })?.code === "23505") return err(409, "INVALID_STATE", "A fix pipeline is already queued for this incident.");
    console.error(`Incident ${action} failed:`, (e as Error)?.message);
    return err(500, "INTERNAL", "Could not record the decision.");
  }
}
