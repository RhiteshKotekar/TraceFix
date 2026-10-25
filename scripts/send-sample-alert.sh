#!/usr/bin/env bash
# Posts a Grafana-shaped alert. Replace with a captured real payload once available.
set -euo pipefail
set -a; . "$(dirname "$0")/../.env"; set +a
curl -sS -X POST "${WAYMARK_URL:-http://localhost:3000}/api/webhooks/grafana" \
  -H "Authorization: Bearer $GRAFANA_WEBHOOK_SECRET" -H 'Content-Type: application/json' \
  -d "{\"status\":\"firing\",\"alerts\":[{\"status\":\"firing\",\"fingerprint\":\"sample-1\",\"startsAt\":\"${STARTS_AT:-2026-01-01T00:00:00Z}\",\"labels\":{\"alertname\":\"HighP95Latency\",\"service\":\"$TARGET_SERVICE\",\"endpoint\":\"$TARGET_ENDPOINT\",\"severity\":\"warning\"},\"annotations\":{\"summary\":\"p95 latency high on $TARGET_ENDPOINT\"}}]}"
