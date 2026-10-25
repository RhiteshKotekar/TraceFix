#!/usr/bin/env node
// Applies db/schema.sql (idempotent) to DATABASE_URL. Usage: npm run db:migrate
import { readFileSync } from "node:fs";
import pg from "pg";

const url = process.argv[2] || process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}
const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query(readFileSync(new URL("../db/schema.sql", import.meta.url), "utf8"));
  console.log("Schema applied to", url.replace(/\/\/[^@]*@/, "//***@"));
} finally {
  await client.end();
}
