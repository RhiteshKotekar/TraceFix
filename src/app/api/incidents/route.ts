import { guard } from "@/lib/auth";
import { listIncidents } from "@/lib/data";

export async function GET(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  return Response.json(await listIncidents(), { headers: { "Cache-Control": "no-store" } });
}
