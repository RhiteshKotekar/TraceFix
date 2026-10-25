# API Contracts

All routes except the webhook require basic auth (enforced in `src/proxy.ts`). Verify the real Grafana payload by capturing one delivery and saving it as `scripts/fixtures/grafana-alert.json`.

## `POST /api/webhooks/grafana`
Header `Authorization: Bearer <GRAFANA_WEBHOOK_SECRET>`. Validates, normalizes, dedupes, inserts. Never starts execution. Returns `200 {"created": <n>, "duplicates": <n>}`; `401` bad secret; `413` too large; `400` bad shape.

Grafana unified alerting payload (relevant fields):
```json
{
  "status": "firing",
  "alerts": [{
    "status": "firing",
    "labels": {
      "alertname": "HighEndpointLatency",
      "service": "shop-backend",
      "endpoint": "/api/products"
    },
    "annotations": { "summary": "p95 latency above 200ms for 1m" },
    "startsAt": "2026-10-25T10:00:00Z",
    "fingerprint": "abc123"
  }]
}
```

## `GET /api/incidents`
`[{id, alertName, service, endpoint, status, receivedAt, latestJob: {id, status, stage} | null}]`, newest first, limit 50.

## `GET /api/incidents/{id}`
Incident fields plus latest job (status, stage, progress, evidence, baseline, candidate, decision, gate results, diff, report, PR URL). Never secrets.

## `POST /api/incidents/{id}/approve`
Body `{"reason": "optional"}` → `201 {"incidentId","jobId","status":"QUEUED"}`. Not `AWAITING_APPROVAL` → `409 INVALID_STATE`.

## `POST /api/incidents/{id}/reject`
Body `{"reason": "optional"}` → `200 {"incidentId","status":"REJECTED"}`; same `409` rule.

## `GET /api/jobs/{id}`
`{id, status, stage, progressMessage, updatedAt}` — polled by the detail page.

## Error shape
```json
{"error":{"code":"INVALID_STATE","message":"This incident cannot be approved in its current state."}}
```
Codes: `UNAUTHORIZED`, `NOT_FOUND`, `INVALID_STATE`, `BAD_REQUEST`, `PAYLOAD_TOO_LARGE`, `INTERNAL`. No stack traces, secrets, or internal paths.

Note: with `cacheComponents: true` in `next.config.ts`, make sure these handlers and pages read fresh data (check the Next 16 docs in `node_modules/next/dist/docs/` for the current dynamic-rendering API).
