import { decisionRoute } from "@/lib/decisionRoute";

export async function POST(req: Request, ctx: RouteContext<"/api/incidents/[id]/retry">) {
  const { id } = await ctx.params;
  return decisionRoute(req, id, "retry");
}
