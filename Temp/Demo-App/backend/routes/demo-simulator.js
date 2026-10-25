const express = require('express');

function createDemoSimulatorRouter() {
  const router = express.Router();
  let healthFailureEnabled = false;

  router.get('/health/state', (req, res) => res.json({ status: healthFailureEnabled ? 'unhealthy' : 'up' }));
  router.post('/health/fail', (req, res) => {
    healthFailureEnabled = true;
    console.warn('[failure-simulator] Health-check failure enabled');
    return res.json({ status: 'unhealthy' });
  });
  router.post('/health/reset', (req, res) => {
    healthFailureEnabled = false;
    console.info('[failure-simulator] Health-check failure reset');
    return res.json({ status: 'up' });
  });

  router.post('/checkout-failure', (req, res) => {
    try {
      throw new Error('Controlled checkout exception (failure simulator)');
    } catch (error) {
      console.error('[failure-simulator] Checkout operation failed:', error.stack || error);
      return res.status(500).json({ success: false, message: 'Demo checkout failed with a controlled exception' });
    }
  });

  router.get('/products/failure', (req, res) => {
    console.error('[failure-simulator] Product demo request intentionally returned HTTP 500');
    return res.status(500).json({ success: false, message: 'Controlled product API failure' });
  });

  router.get('/products/slow', async (req, res) => {
    const requested = Number.parseInt(req.query.delayMs, 10);
    const delayMs = Number.isFinite(requested) ? Math.min(5000, Math.max(0, requested)) : 2000;
    console.info(`[failure-simulator] Delaying dedicated product operation by ${delayMs} ms`);
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    res.set('X-Demo-Delay-Ms', String(delayMs));
    return res.json({ success: true, operation: 'demo-product-detail', delayMs });
  });

  return { router, isHealthFailureEnabled: () => healthFailureEnabled };
}

module.exports = { createDemoSimulatorRouter };
