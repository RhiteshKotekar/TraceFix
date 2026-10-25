#!/usr/bin/env node
// Puts concurrent load on the shop app so Prometheus sees a slow route and Grafana's p95 rule fires.
// Usage: npm run load -- [seconds=150] [delayMs=600] [concurrency=8]
const [seconds = 150, delayMs = 600, concurrency = 8] = process.argv.slice(2).map(Number);
const base = process.env.TARGET_BASE_URL || "http://localhost:5002";
const slow = `${base}/api/demo/products/slow?delayMs=${delayMs}`;
const normal = `${base}/api/products`;
const until = Date.now() + seconds * 1000;
let ok = 0;
let failed = 0;

async function worker(i) {
  while (Date.now() < until) {
    // Mostly the slow route, with some normal traffic so healthy routes have data too.
    const url = i % 4 === 0 ? normal : slow;
    try {
      const res = await fetch(url);
      await res.arrayBuffer();
      if (res.ok) ok++;
      else failed++;
    } catch {
      failed++;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
}

console.log(`Load: ${concurrency} workers for ${seconds}s → ${slow} (and ${normal})`);
const tick = setInterval(() => process.stdout.write(`\r  ok=${ok} failed=${failed} remaining=${Math.max(0, Math.round((until - Date.now()) / 1000))}s   `), 1000);
await Promise.all(Array.from({ length: concurrency }, (_, i) => worker(i)));
clearInterval(tick);
console.log(`\nDone: ok=${ok} failed=${failed}`);
if (ok === 0) process.exitCode = 1;
