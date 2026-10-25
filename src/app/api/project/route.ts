import { connection } from "next/server";
import { deleteProject, getProject, ghKeyConfigured, InvalidProject, saveProject } from "@/lib/projectStore";
import { logEvent } from "@/lib/db";
import type { ProjectState } from "@/lib/model";
import { guard } from "@/lib/auth";
import { pool } from "@/lib/db";

export async function GET(req: Request) {
  await connection();
  const g = await guard(req);
  if (g.error) return g.error;
  const body: ProjectState = { project: await getProject(), ghKeyConfigured: ghKeyConfigured() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

// Partial update: only the fields sent are validated and changed. `complete: true` marks setup finished.
export async function PUT(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Expected a JSON object." } }, { status: 400 });
  }
  try {
    const project = await saveProject(body);
    await logEvent("tracefix", "info", body.complete ? `Project setup completed for ${project.service || "the service"}` : "Project settings changed", null, pool, g.user.email);
    const out: ProjectState = { project, ghKeyConfigured: ghKeyConfigured() };
    return Response.json(out);
  } catch (e) {
    if (e instanceof InvalidProject) {
      return Response.json({ error: { code: "BAD_REQUEST", message: e.message, fields: e.fields } }, { status: 400 });
    }
    console.error("Saving project failed:", e);
    return Response.json({ error: { code: "INTERNAL", message: "Could not save the project." } }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  await deleteProject();
  await logEvent("tracefix", "info", "Project setup was reset", null, pool, g.user.email);
  return new Response(null, { status: 204 });
}
