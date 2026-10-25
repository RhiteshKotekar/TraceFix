import { guard } from "@/lib/auth";
import { findIncident } from "@/lib/data";

export async function GET(req: Request, ctx: RouteContext<"/api/incidents/[id]">) {
  const g = await guard(req);
  if (g.error) return g.error;
  const incident = await findIncident((await ctx.params).id);
  if (!incident) return Response.json({ error: { code: "NOT_FOUND", message: "Incident not found." } }, { status: 404 });
  return Response.json(incident, { headers: { "Cache-Control": "no-store" } });
}
