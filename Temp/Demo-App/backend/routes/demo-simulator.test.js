const assert = require('node:assert/strict');
const { test } = require('node:test');
const express = require('express');
const { createDemoSimulatorRouter } = require('./demo-simulator');

async function withServer(run) {
  const app = express();
  const simulator = createDemoSimulatorRouter();
  app.use('/api/demo', simulator.router);
  app.get('/api/health', (req, res) => {
    if (simulator.isHealthFailureEnabled()) return res.status(503).json({ status: 'unhealthy' });
    return res.json({ status: 'up' });
  });
  const server = await new Promise((resolve) => {
    const listener = app.listen(0, '127.0.0.1', () => resolve(listener));
  });
  try {
    await run(`http://127.0.0.1:${server.address().port}`);
  } finally {
    await new Promise((resolve, reject) => server.close((error) => (error ? reject(error) : resolve())));
  }
}

test('checkout failure records a controlled exception and returns HTTP 500', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/demo/checkout-failure`, { method: 'POST' });
    const body = await response.json();
    assert.equal(response.status, 500);
    assert.match(body.message, /controlled exception/i);
  });
});

test('product demo failure returns HTTP 500', async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/demo/products/failure`);
    assert.equal(response.status, 500);
    assert.match((await response.json()).message, /product api failure/i);
  });
});

test('health-check failure is observable and explicitly reversible', async () => {
  await withServer(async (base) => {
    const before = await fetch(`${base}/api/health`);
    assert.equal(before.status, 200);

    await fetch(`${base}/api/demo/health/fail`, { method: 'POST' });
    const unhealthy = await fetch(`${base}/api/health`);
    assert.equal(unhealthy.status, 503);
    assert.equal((await unhealthy.json()).status, 'unhealthy');

    await fetch(`${base}/api/demo/health/reset`, { method: 'POST' });
    const recovered = await fetch(`${base}/api/health`);
    assert.equal(recovered.status, 200);
    assert.equal((await recovered.json()).status, 'up');
  });
});

test('slow product demo reports its bounded configured delay', async () => {
  await withServer(async (base) => {
    const started = Date.now();
    const response = await fetch(`${base}/api/demo/products/slow?delayMs=40`);
    const elapsed = Date.now() - started;
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('x-demo-delay-ms'), '40');
    assert.equal((await response.json()).delayMs, 40);
    assert.ok(elapsed >= 30);
  });
});
