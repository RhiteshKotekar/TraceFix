import { connection } from "next/server";
import { getSettings, saveSettings } from "@/lib/incidents";
import { guard } from "@/lib/auth";

export async function GET(req: Request) {
  await connection();
  const g = await guard(req);
  if (g.error) return g.error;
  return Response.json(await getSettings());
}

export async function PUT(req: Request) {
  const g = await guard(req);
  if (g.error) return g.error;
  const body = await req.json().catch(() => null);
  const mode = body?.mode;
  const autoThreshold = Number(body?.autoThreshold);
  if ((mode !== "manual" && mode !== "automatic") || !Number.isInteger(autoThreshold) || autoThreshold < 0 || autoThreshold > 100) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "mode must be manual|automatic and autoThreshold an integer 0–100." } },
      { status: 400 },
    );
  }
  await saveSettings({ mode, autoThreshold }, g.user.email);
  return Response.json({ mode, autoThreshold });
}
