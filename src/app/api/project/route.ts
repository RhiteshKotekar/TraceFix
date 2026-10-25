import { connection } from "next/server";
import { deleteProject, getProject, ghKeyConfigured, InvalidProject, saveProject } from "@/lib/projectStore";
import { logEvent } from "@/lib/db";
import type { ProjectState } from "@/lib/model";

export async function GET() {
  await connection();
  const body: ProjectState = { project: await getProject(), ghKeyConfigured: ghKeyConfigured() };
  return Response.json(body, { headers: { "Cache-Control": "no-store" } });
}

// Partial update: only the fields sent are validated and changed. `complete: true` marks setup finished.
export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return Response.json({ error: { code: "BAD_REQUEST", message: "Expected a JSON object." } }, { status: 400 });
  }
  try {
    const project = await saveProject(body);
    if (body.complete) await logEvent("tracefix", "info", `Project setup completed for ${project.service || "the service"}`);
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

export async function DELETE() {
  await deleteProject();
  await logEvent("tracefix", "info", "Project setup was reset");
  return new Response(null, { status: 204 });
}
