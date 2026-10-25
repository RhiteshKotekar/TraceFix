import { Incident, DemoRepository, AiChatMessage } from '@/types';

export const INITIAL_OPERATING_MODE: 'AUTOMATIC' | 'MANUAL' = 'AUTOMATIC';

export const DEMO_REPOSITORIES: DemoRepository[] = [
  {
    id: 'repo-shop-backend',
    name: 'shop-backend',
    owner: 'tracefix-demo',
    defaultBranch: 'main',
    status: 'DEMO_READY',
    lastActivity: '12 minutes ago',
    openIncidentsCount: 3,
    openPrCount: 1,
    repoUrl: 'https://github.com/RhiteshKotekar/TraceFix',
    isDemo: true,
  },
  {
    id: 'repo-inventory-api',
    name: 'inventory-service',
    owner: 'tracefix-demo',
    defaultBranch: 'main',
    status: 'CONNECTED',
    lastActivity: '2 hours ago',
    openIncidentsCount: 1,
    openPrCount: 0,
    repoUrl: 'https://github.com/RhiteshKotekar/TraceFix',
    isDemo: true,
  },
  {
    id: 'repo-auth-service',
    name: 'auth-gateway',
    owner: 'tracefix-demo',
    defaultBranch: 'main',
    status: 'CONNECTED',
    lastActivity: 'Yesterday',
    openIncidentsCount: 0,
    openPrCount: 0,
    repoUrl: 'https://github.com/RhiteshKotekar/TraceFix',
    isDemo: true,
  },
];

export const MOCK_INCIDENTS: Incident[] = [
  {
    id: 'inc-001',
    fingerprint: 'fp-95-products-nplusone',
    startsAt: '2026-10-25T11:42:00Z',
    alertName: 'HighEndpointLatency',
    service: 'shop-backend',
    endpoint: 'GET /api/products',
    severity: 'CRITICAL',
    summary: 'p95 latency exceeded 200ms threshold (measured 385ms) under k6 50 VUs workload',
    status: 'APPROVED',
    receivedAt: '2026-10-25T11:43:10Z',
    workflowStage: 'PR_READY',
    provenance: 'TRACEFIX_GENERATED',
    isDemo: true,
    affectedFiles: ['routes/products.js', 'data/products.js'],
    latestJob: {
      id: 'job-9821-prod',
      incidentId: 'inc-001',
      status: 'PR_CREATED',
      stage: 'OPENING_PR',
      progressMessage: 'Deterministic gates passed. Candidate fix verified with 78% latency drop.',
      commitSha: 'e05fa4671a9c',
      evidence: {
        p50Ms: 142.4,
        p95Ms: 385.2,
        requestRateRps: 184.6,
        errorRatePercent: 0.0,
        queryWindow: 'Last 15 minutes (Grafana alert window)',
        prometheusStatus: 'AVAILABLE',
      },
      baseline: {
        p50: 138.0,
        p95: 382.5,
        rps: 186.2,
        errorRate: 0.0,
        requestsTotal: 5580,
        durationSeconds: 30,
      },
      candidate: {
        p50: 32.1,
        p95: 82.4,
        rps: 310.8,
        errorRate: 0.0,
        requestsTotal: 9320,
        durationSeconds: 30,
      },
      agentHypothesis: 'Planted N+1 query loop inside GET /api/products: each product executes a separate synchronous SQL query fetching review summaries.',
      agentRisks: [
        'Modified query response format must strictly maintain JSON contract',
        'Cache invalidation required if review counts are updated asynchronously'
      ],
      diff: `--- a/routes/products.js
+++ b/routes/products.js
@@ -48,9 +48,8 @@ router.get('/', async (req, res) => {
-    const products = await db.query('SELECT * FROM products LIMIT 50');
-    for (let product of products.rows) {
-      const reviews = await db.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = $1', [product.id]);
-      product.rating = reviews.rows[0].avg_rating || 0;
-    }
+    const products = await db.query(\`
+      SELECT p.*, COALESCE(AVG(r.rating), 0) AS rating 
+      FROM products p 
+      LEFT JOIN reviews r ON r.product_id = p.id 
+      GROUP BY p.id 
+      LIMIT 50
+    \`);
     res.json(products.rows);`,
      decision: 'PASS',
      gateResults: [
        {
          name: 'p95 Latency Reduction Gate',
          passed: true,
          baseline: '382.5 ms',
          candidate: '82.4 ms',
          threshold: '>= 20% improvement',
          notes: 'Achieved 78.4% improvement in p95 latency under identical k6 workload.',
        },
        {
          name: 'Endpoint Error Rate Gate',
          passed: true,
          baseline: '0.0%',
          candidate: '0.0%',
          threshold: '<= 1.0%',
          notes: 'Zero 5xx/4xx errors observed during the 30-second benchmark.',
        },
        {
          name: 'Integration Test Suite Gate',
          passed: true,
          baseline: '14/14 passed',
          candidate: '14/14 passed',
          threshold: '100% tests passing',
          notes: 'All existing Jest unit and integration tests passed cleanly.',
        },
        {
          name: 'Editable Path Security Gate',
          passed: true,
          baseline: 'routes/products.js',
          candidate: 'routes/products.js',
          threshold: 'Allowed in TARGET_EDITABLE_PATHS',
          notes: 'No edits attempted on configuration, tests, or k6 scripts.',
        },
      ],
      reportMd: `### TraceFix Automated Investigation Report

**Incident**: HighEndpointLatency on \`shop-backend\` (\`GET /api/products\`)
**Tested Commit**: \`e05fa4671a9c\`
**Validation Decision**: **PASS (All 4 deterministic gates passed)**

#### 1. Symptom & Evidence
Prometheus detected sustained p95 latency degradation at 385ms under typical peak load (threshold: 200ms). Grafana fired alert \`fp-95-products-nplusone\`.

#### 2. Root Cause
Inspection of \`routes/products.js\` identified an **N+1 query pattern**. For every product fetched (50 rows), a sequential secondary query was executed against the \`reviews\` table to compute average ratings.

#### 3. Verification Benchmark (k6 50 VUs)
| Metric | Baseline | Candidate | Delta |
|---|---|---|---|
| **p50 Latency** | 138.0 ms | 32.1 ms | -76.7% |
| **p95 Latency** | 382.5 ms | 82.4 ms | **-78.4% (PASS)** |
| **Throughput** | 186.2 rps | 310.8 rps | +66.9% |
| **Error Rate** | 0.0% | 0.0% | 0.0% |

#### 4. Recommendation
Merge the single-query \`LEFT JOIN ... GROUP BY\` candidate patch. This fix preserves identical JSON output while eliminating database connection thrashing.`,
      prUrl: 'https://github.com/RhiteshKotekar/TraceFix/pull/demo-1',
      createdAt: '2026-10-25T11:44:00Z',
      updatedAt: '2026-10-25T11:47:15Z',
    },
  },
  {
    id: 'inc-002',
    fingerprint: 'fp-db-pool-orders',
    startsAt: '2026-10-25T12:05:00Z',
    alertName: 'DbConnectionPoolExhaustion',
    service: 'shop-backend',
    endpoint: 'POST /api/orders',
    severity: 'HIGH',
    summary: 'Active PostgreSQL pool client acquisition time exceeded 1500ms under checkout bursts',
    status: 'AWAITING_APPROVAL',
    receivedAt: '2026-10-25T12:06:22Z',
    workflowStage: 'NEEDS_REVIEW',
    provenance: 'TRACEFIX_GENERATED',
    isDemo: true,
    affectedFiles: ['routes/orders.js', 'db.js'],
    latestJob: {
      id: 'job-9822-ord',
      incidentId: 'inc-002',
      status: 'QUEUED',
      stage: 'INVESTIGATING',
      progressMessage: 'Investigation completed. Awaiting human authorization to generate candidate fix.',
      commitSha: 'e05fa4671a9c',
      evidence: {
        p50Ms: 420.0,
        p95Ms: 1650.0,
        requestRateRps: 62.4,
        errorRatePercent: 4.2,
        queryWindow: 'Last 10 minutes',
        prometheusStatus: 'AVAILABLE',
      },
      agentHypothesis: 'Orphaned database client connections occurring on transaction aborts when inventory verification fails.',
      reportMd: `### Initial Incident Investigation

**Incident**: DbConnectionPoolExhaustion on \`POST /api/orders\`
**Status**: Awaiting Human Approval (Manual Mode)

**Observed Evidence**:
Database connection wait time surged to 1.65s. 4.2% of checkout requests timed out with \`503 Service Unavailable\`.

**Suspected Cause**:
In \`routes/orders.js\`, error-handling branches omit \`client.release()\`, leaking pool connections until node restart.`,
      createdAt: '2026-10-25T12:06:30Z',
      updatedAt: '2026-10-25T12:07:00Z',
    },
  },
  {
    id: 'inc-003',
    fingerprint: 'fp-mem-sales-report',
    startsAt: '2026-10-25T12:15:00Z',
    alertName: 'MemoryPressureWarning',
    service: 'shop-backend',
    endpoint: 'GET /api/reports/sales',
    severity: 'MEDIUM',
    summary: 'Node.js heap used exceeded 85% during unpaged historical sales aggregation',
    status: 'APPROVED',
    receivedAt: '2026-10-25T12:16:10Z',
    workflowStage: 'FIX_IN_PROGRESS',
    provenance: 'TRACEFIX_GENERATED',
    isDemo: true,
    affectedFiles: ['routes/reports.js'],
    latestJob: {
      id: 'job-9823-mem',
      incidentId: 'inc-003',
      status: 'RUNNING',
      stage: 'VERIFYING',
      progressMessage: 'Worker running candidate validation k6 workload (20/30s elapsed)...',
      commitSha: 'e05fa4671a9c',
      evidence: {
        p50Ms: 820.0,
        p95Ms: 2400.0,
        requestRateRps: 12.0,
        errorRatePercent: 0.0,
        queryWindow: 'Last 30 minutes',
        prometheusStatus: 'AVAILABLE',
      },
      createdAt: '2026-10-25T12:17:00Z',
      updatedAt: '2026-10-25T12:20:45Z',
    },
  },
  {
    id: 'inc-004',
    fingerprint: 'fp-cart-slow-calculation',
    startsAt: '2026-10-24T18:30:00Z',
    alertName: 'SlowResponseWarning',
    service: 'shop-backend',
    endpoint: 'GET /api/cart',
    severity: 'LOW',
    summary: 'Cart tax computation re-evaluating coupon rules redundantly',
    status: 'RESOLVED',
    receivedAt: '2026-10-24T18:31:00Z',
    workflowStage: 'RESOLVED',
    provenance: 'EXTERNAL_HUMAN',
    isDemo: true,
    affectedFiles: ['services/taxCalculator.js'],
    latestJob: {
      id: 'job-9810-cart',
      incidentId: 'inc-004',
      status: 'PR_CREATED',
      stage: 'OPENING_PR',
      progressMessage: 'Fix verified and accepted into demo branch.',
      commitSha: 'b4412a819c90',
      evidence: {
        p50Ms: 85.0,
        p95Ms: 210.0,
        requestRateRps: 94.0,
        errorRatePercent: 0.0,
        queryWindow: 'Historical',
        prometheusStatus: 'AVAILABLE',
      },
      decision: 'PASS',
      createdAt: '2026-10-24T18:35:00Z',
      updatedAt: '2026-10-24T19:10:00Z',
    },
  },
  {
    id: 'inc-005',
    fingerprint: 'fp-inventory-reserve-lock',
    startsAt: '2026-10-25T09:12:00Z',
    alertName: 'LockContentionWarning',
    service: 'inventory-service',
    endpoint: 'PUT /api/stock/reserve',
    severity: 'HIGH',
    summary: 'Row-level lock contention on hot catalog SKU during flash discount',
    status: 'APPROVED',
    receivedAt: '2026-10-25T09:13:30Z',
    workflowStage: 'INVESTIGATING',
    provenance: 'TRACEFIX_GENERATED',
    isDemo: true,
    affectedFiles: ['controllers/stock.js'],
    latestJob: {
      id: 'job-9819-inv',
      incidentId: 'inc-005',
      status: 'RUNNING',
      stage: 'BASELINE',
      progressMessage: 'Measuring baseline performance under 50 VUs workload...',
      commitSha: '89ac992011fe',
      evidence: {
        p50Ms: 310.0,
        p95Ms: 1450.0,
        requestRateRps: 76.5,
        errorRatePercent: 2.1,
        queryWindow: 'Last 20 minutes',
        prometheusStatus: 'AVAILABLE',
      },
      createdAt: '2026-10-25T09:15:00Z',
      updatedAt: '2026-10-25T09:16:40Z',
    },
  },
];

export const MOCK_AI_CONVERSATION: Record<string, AiChatMessage[]> = {
  'inc-001': [
    {
      id: 'msg-1',
      sender: 'assistant',
      timestamp: '11:47 AM',
      text: 'I investigated the N+1 review query in `routes/products.js`. The candidate patch replaces the synchronous per-item review loop with a single aggregate `LEFT JOIN`. Deterministic k6 benchmarks showed a 78.4% improvement in p95 latency with zero regressions.',
    },
    {
      id: 'msg-2',
      sender: 'user',
      timestamp: '11:48 AM',
      text: 'Make sure the rating field is rounded to 1 decimal place to prevent floating-point precision differences in the API response.',
    },
    {
      id: 'msg-3',
      sender: 'assistant',
      timestamp: '11:49 AM',
      text: 'Good catch. I updated the SQL projection to `ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1) AS rating`. Here is the updated candidate diff:',
      suggestedDiff: `--- a/routes/products.js
+++ b/routes/products.js
@@ -48,9 +48,8 @@ router.get('/', async (req, res) => {
-    const products = await db.query('SELECT * FROM products LIMIT 50');
-    for (let product of products.rows) {
-      const reviews = await db.query('SELECT AVG(rating) as avg_rating FROM reviews WHERE product_id = $1', [product.id]);
-      product.rating = reviews.rows[0].avg_rating || 0;
-    }
+    const products = await db.query(\`
+      SELECT p.*, ROUND(COALESCE(AVG(r.rating), 0)::numeric, 1) AS rating 
+      FROM products p 
+      LEFT JOIN reviews r ON r.product_id = p.id 
+      GROUP BY p.id 
+      LIMIT 50
+    \`);
     res.json(products.rows);`,
      status: 'READY',
    },
  ],
};
