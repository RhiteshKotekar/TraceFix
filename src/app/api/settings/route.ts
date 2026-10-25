import { connection } from "next/server";
import { getSettings, saveSettings } from "@/lib/incidents";

export async function GET() {
  await connection();
  return Response.json(await getSettings());
}

export async function PUT(req: Request) {
  const body = await req.json().catch(() => null);
  const mode = body?.mode;
  const autoThreshold = Number(body?.autoThreshold);
  if ((mode !== "manual" && mode !== "automatic") || !Number.isInteger(autoThreshold) || autoThreshold < 0 || autoThreshold > 100) {
    return Response.json(
      { error: { code: "BAD_REQUEST", message: "mode must be manual|automatic and autoThreshold an integer 0–100." } },
      { status: 400 },
    );
  }
  await saveSettings({ mode, autoThreshold });
  return Response.json({ mode, autoThreshold });
}
