# Vulnerable app â€” the target

A deliberately insecure API and a small front end for it. It exists only so the gateway has a safe, local target to detect.

> **Do not deploy this anywhere.** The intentionally unsafe routes are isolated to demo tables with fictional data and must only run on a machine you control.

## Endpoints

| Method | Path | What it does |
|---|---|---|
| `POST` | `/api/login` | Parameterized login; it remains the brute-force demo target. |
| `GET` | `/api/products` | Successful product-list endpoint for the flood demo. |
| `GET` | `/api/products/search?q=<query>` | Intentionally vulnerable product search for the SQLi demo only. |
| `GET` | `/api/products/search-secure?q=<query>` | Parameterized comparison route. |
| `GET` | `/backup-demo`, `/config-demo`, `/.env-demo` | Harmless planted resources for forced-browsing enumeration. |
| `GET` | `/api/demo-files?file=<relative-path>` | Deliberately permissive, but filesystem-bounded traversal demonstration. |
| `GET` | `/api/orders` | The caller's own orders. |
| `POST` | `/api/orders` | Places an order under the caller's own id (checkout). |
| `GET` | `/api/orders/:id` | Intentionally vulnerable to BOLA / IDOR: returns any customer's order. |
| `GET` | `/api/orders-secure/:id` | Ownership-checked comparison route: someone else's order is `404`. |

## SQL injection demo

There are no runtime authentication modes and no `/api/set-mode` endpoint. Login always uses a parameterized query, which keeps its failed-login behavior predictable for the brute-force demo. The only intentional SQL injection surface is `/api/products/search`.

Normal input returns the matching demo products:

```bash
curl 'http://localhost:5002/api/products/search?q=keyboard'
```

The direct SQLi demonstration makes the database-only consequence visible:

```bash
curl -G 'http://localhost:5002/api/products/search' \
  --data-urlencode "q=' OR 1=1 --"
```

The unsafe `WHERE name ILIKE '%<input>%'` query is changed by the payload and returns the demo catalogue. No secrets, host files, or command execution are exposed. The optional `search-secure` route retains the same input as a parameter and does not change its query semantics.

Repeat the same payload through IASG to create telemetry evidence:

```bash
curl -G 'http://localhost:8082/api/products/search' \
  --data-urlencode "q=' OR 1=1 --"
```

The detector records SQL Injection evidence and forwards the request. Open **Dashboard â†’ IP address â†’ SQL injection evidence** to see the timestamp, endpoint, matched patterns, risk, request ID, HTTP result, and separate gateway decision. Detection is not a claim that the request was blocked; later decision-engine policy may throttle or block it.

## Running it

Through Compose, with the gateway in front of it:

```bash
docker compose -f infra/docker-compose.yml up -d
```

| | URL |
|---|---|
| Direct (unprotected) | http://localhost:5002 |
| Through the gateway | http://localhost:8082 |
| Front end | http://localhost:5175 |

Standalone, for working on the app itself:

```bash
cd vulnerable-app/backend && npm install && npm start
cd vulnerable-app && npm install && npm run dev
```

For the SQLi story, use :5002 first to demonstrate the isolated vulnerable endpoint, then repeat the exact request through :8082. Direct traffic intentionally bypasses the gateway; only traffic through :8082 appears in telemetry and the dashboard.

## Tests

```bash
cd vulnerable-app/backend && npm test
cd gateway && go test ./...
```

The shared scripts can also drive a running gateway:

```bash
bash testing/signals/sqli.sh
```

## Other direct-backend demonstrations

`GET /api/products` is a normal successful endpoint, so a direct burst to
`:5002` reaches the application unrestricted. `POST /api/login` intentionally
has no native IP lockout: repeated invalid attempts and attempts against the
seeded demo usernames are normal `401` responses for brute-force and
password-spraying demonstrations.

The planted forced-browsing resources return explicit harmless markers, not
configuration or secrets:

```bash
curl 'http://localhost:5002/.env-demo'
```

The bounded traversal route deliberately resolves relative paths inside
`backend/demo-files` only. This demonstrates a relative-path mistake without
ever exposing container or host files:

```bash
curl -G 'http://localhost:5002/api/demo-files' \
  --data-urlencode 'file=public/../fake-secret.txt'
```

It can return the static `fake-secret.txt` fixture, but a path that resolves
outside `demo-files` is rejected. Use the same requests through `:8082` to
produce traversal/enumeration evidence in IASG.

The signal scripts exercise every direct-demo counterpart through IASG:

```bash
bash testing/signals/sqli.sh
bash testing/signals/flood.sh
bash testing/signals/traversal.sh
bash testing/signals/brute_force.sh
```

## BOLA (object-level authorization) demo

`/api/orders/:id` verifies the caller's token but does not check that the order belongs to them. The SQL is parameterized: this is an authorization bug, not an injection one. The seeded orders are fictional.

The storefront sends requests directly to the backend. Sign in as Jane Cooper using [USERS.md](USERS.md), then open **My Orders**. Visiting another customer's order id (for example, `/orders/2`) can return that fictional customer's details. The comparison route `/api/orders-secure/:id` returns 404 for an order owned by someone else. Neither route covers writes; a `PUT` or `DELETE` must check ownership too. Do not expose this demo backend to untrusted networks.

`POST /api/login` returns a signed HS256 JWT (one hour, `sub` = user id, `role`). The secret is `IASG_JWT_SECRET`; without it the backend falls back to the public demo value.

## Failure Simulator

The app is a Vite/React frontend and an Express API. The navbar's **Failure
Simulator** is generated from `src/failureSimulator/registry.js`; it calls
dedicated backend routes on the configured `VITE_BACKEND_API_URL` (default
`http://localhost:5002`). These controls are for a dedicated local demo
environment. Storefront API calls and simulator requests use the backend URL.

Start the backend and frontend in separate terminals from `waymark/Temp/Demo-App`:

```bash
cd backend && npm install && npm start
```

```bash
npm install && npm run dev
```

Open the frontend at `http://localhost:5173`, then expand **Failure Simulator**
in the top navigation. The demo backend's existing request logger records the
HTTP method and path; each failure route also emits a scenario-specific log.

| Scenario | Observable behavior | Recovery |
|---|---|---|
| Checkout exception | `POST /api/demo/checkout-failure` returns HTTP 500 and logs a caught, controlled exception. It does not create an order or take down the API. | Transient; trigger again to reproduce. |
| Product API failure | `GET /api/demo/products/failure` returns HTTP 500 and logs the intentional failure. | Transient; trigger again to reproduce. |
| Health-check failure | `GET /api/health` returns HTTP 503 with `status: unhealthy`; the backend process remains running. | Use **Reset health check** or `POST /api/demo/health/reset`; verify `GET /api/health` returns 200. The state is in memory and resets when the backend restarts. |
| Product request delay | `GET /api/demo/products/slow?delayMs=2000` waits 2 seconds, returns `X-Demo-Delay-Ms`, and logs the bounded delay. The route accepts at most 5 seconds. | Transient; ordinary product requests are unaffected. |

The health failure changes the health probe's result, not deployment status.
There is no safe browser-driven deployment/startup failure in this app; a
genuine readiness or deployment failure needs an external orchestrator or
deployment pipeline and is not simulated here. The checkout and product demos
are dedicated failure operations rather than faults injected into normal
customer traffic. Existing storefront checkout and product routes remain
available.
