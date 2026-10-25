import { connection } from "next/server";
import { pool } from "@/lib/db";

// Public liveness probe: says whether TraceFix and its database answer. No configuration details.
export async function GET() {
  await connection();
  const db = await pool.query("SELECT 1").then(() => true, () => false);
  return Response.json({ ok: db, database: db }, { status: db ? 200 : 503, headers: { "Cache-Control": "no-store" } });
}
