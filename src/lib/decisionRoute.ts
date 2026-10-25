import { decide, InvalidState } from "@/lib/incidents";

// Shared handler for POST /api/incidents/[id]/approve and /reject.
export async function decisionRoute(req: Request, id: string, action: "approve" | "reject") {
  const body = await req.json().catch(() => ({}));
  const reason = typeof body?.reason === "string" && body.reason.trim() ? body.reason.trim().slice(0, 500) : null;
  // shortcut: login is not enforced, so decisions are attributed to the signed-in name the browser sends (or "admin").
  const by = typeof body?.by === "string" && body.by.trim() ? body.by.trim().slice(0, 80) : "admin";
  try {
    const out = await decide(id, action, by, reason);
    return Response.json({ incidentId: id, ...out }, { status: action === "approve" ? 201 : 200 });
  } catch (e) {
    if (e instanceof InvalidState) {
      return Response.json({ error: { code: "INVALID_STATE", message: e.message } }, { status: 409 });
    }
    console.error(`Incident ${action} failed:`, e);
    return Response.json({ error: { code: "INTERNAL", message: "Could not record the decision." } }, { status: 500 });
  }
}
