#!/usr/bin/env node
// Posts a Grafana-shaped (payload version "1") firing alert to TraceFix, to test the webhook without Grafana.
// Usage: npm run sample-alert -- [route=/api/products] [p95Seconds=1.8]
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]),
);
const [route = "/api/products", p95 = "1.8"] = process.argv.slice(2);
const startsAt = new Date(Date.now() - 60_000).toISOString();
const body = {
  receiver: "tracefix",
  status: "firing",
  version: "1",
  alerts: [
    {
      status: "firing",
      labels: { alertname: "HighEndpointLatency", service: "shop-backend", endpoint: route, route, severity: "warning" },
      annotations: { summary: `p95 latency above 200ms on ${route}` },
      startsAt,
      endsAt: "0001-01-01T00:00:00Z",
      values: { A: Number(p95), B: Number(p95), C: 1 },
      fingerprint: `sample${Buffer.from(route).toString("hex").slice(0, 10)}`,
    },
  ],
};
const url = `${env.TRACEFIX_URL || "http://localhost:8100"}/api/webhooks/grafana`;
const res = await fetch(url, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${env.GRAFANA_WEBHOOK_SECRET}` },
  body: JSON.stringify(body),
});
console.log(res.status, await res.text());
if (!res.ok) process.exitCode = 1;
