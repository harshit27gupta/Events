# Events Platform (MERN + FastAPI) — Backend Monorepo

Production-grade microservices backend for an AI‑powered events and ticketing platform.

## Highlights
- API Gateway (Node/Express, TypeScript) with circuit breaker and JWT auth
- Microservices: `auth`, `events`, `orders` (seats/holds/purchase), `ml-service` (FastAPI)
- Infra: MongoDB (per service), Redis (cache/locks), RabbitMQ (ready), Docker Compose
- Design patterns: Singleton, Repository, Strategy, Factory, Circuit Breaker, Idempotency
- Seat selection with atomic holds in Redis, TTL, refresh, and consistent reservations

## Architecture (HLD)
```
┌───────────┐     ┌──────────────┐     ┌─────────┐
│  Web/UI   │ ──► │   Gateway    │ ──► │  Auth   │  (JWT issue/verify)
└───────────┘     │  (Express)   │     └─────────┘
                   │  /api/*      │
                   │  JWT guard   │ ──► │ Events  │  (CRUD)
                   │  Circuit Brk │     └─────────┘
                   │              │ ──► │ Orders  │  (seats/holds/purchase)
                   └──────┬───────┘     └─────────┘
                          │
                          ▼
                      ┌─────────┐
                      │  ML API │  (recs/related — FastAPI)
                      └─────────┘

MongoDB (per service)   Redis (cache/locks)   RabbitMQ (events bus; future)
```

## Tech Stack
- Node 20 + TypeScript 5, Express
- FastAPI (Python 3.11)
- MongoDB, Redis, RabbitMQ
- Docker Compose

## Run locally (Docker)
Prereqs: Docker Desktop enabled.

```bash
docker compose up --build
```

Service endpoints
- Gateway: `http://localhost:8080`
- ML: `http://localhost:5000`
- RabbitMQ UI: `http://localhost:15672` (guest/guest)

Health
- `GET /health`
- `GET /auth/health`, `/events/health`, `/orders/health`

## API Overview (via Gateway)

Auth
- `POST /api/auth/signup` → { email, password, name } → { token }
- `POST /api/auth/login` → { email, password } → { token }
- `GET /api/auth/me` (Bearer)

Events
- `GET /api/events` → list
- `POST /api/events` → { title, description|null, date, location|null, tags[] }
- `GET /api/events/:id`
- `PUT /api/events/:id`
- `DELETE /api/events/:id`

Orders (Bearer required)
- `GET /api/orders/seats/:eventId` → 5×10 grid; states: available|held|reserved
- `POST /api/orders/holds` → { eventId, seatIds[] } → { holdId, expiresInSeconds }
- `GET /api/orders/holds/:holdId/ttl` → remaining seconds
- `POST /api/orders/holds/:holdId/refresh` → { extendSeconds? } → new ttl
- `POST /api/orders/purchase` → { eventId, holdId, seatIds[] } → { orderId, status }
  - Optional header `Idempotency-Key: <uuid>` for safe retries

ML (direct)
- `GET http://localhost:5000/recs?userId=U&limit=5`
- `GET http://localhost:5000/related?eventId=e1&limit=5`

## Seat Holds & Consistency
- Hold = per‑seat Redis key `hold:<eventId>:<seatId>` with TTL (default 300s) storing `holdId`
- Purchase verifies every seat key exists and matches the `holdId`; otherwise 409 and no reservation
- Refresh: extend TTL for all held seats atomically
- Idempotent purchase: cache success by `Idempotency-Key` (10 minutes)

## Project Structure
```
apps/web/                 # React app (to be implemented next)
packages/common/          # Shared singletons (logger, config, Mongo/Redis clients)
services/gateway/         # API gateway/BFF (routing, CORS, JWT guard)
services/auth/            # Auth (signup/login/me; JWT)
services/events/          # Events CRUD
services/orders/          # Seats/holds/purchase, TTL refresh, idempotency
services/ml-service/      # FastAPI recs (content-based stub)
docs/postman/collection.json  # Postman requests for full flow
```

## Local Development (without Docker)
```bash
npm install
npm run -w packages/common build
npm run -w services/auth dev
npm run -w services/events dev
npm run -w services/orders dev
npm run -w services/gateway dev
# ML service
python -m venv .venv && .\.venv\Scripts\Activate.ps1 && pip install -r services\ml-service\requirements.txt
uvicorn services.ml-service.app.main:app --host 0.0.0.0 --port 5000
```

## Environment
Compose sets sane defaults. Key vars:
- `JWT_SECRET` (gateway, auth)
- `MONGO_URL` per service
- `REDIS_URL` (orders, gateway)
- `HOLD_TTL_SECONDS` (orders; default 300)

## Postman
Import `docs/postman/collection.json`. Run top-to-bottom:
1) Auth (Signup/Login) → token
2) Create events → copy `_id` to `{{eventId}}`
3) Seats → Holds → TTL/Refresh → Purchase (optionally add `Idempotency-Key`)

## Roadmap
- Payments adapter (Stripe) behind Strategy, Sagas/Outbox
- Search/indexing, analytics, notifications
- Web UI (Next: login, events list/detail, seat picker, checkout)



