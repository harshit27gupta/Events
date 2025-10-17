# Events Platform (MERN + FastAPI) — Backend Monorepo

Production-grade microservices backend for an AI‑powered events and ticketing platform.

## Highlights
- API Gateway (Node/Express, TypeScript) hardened with Helmet, CORS (credentials), rate limits, circuit breaker
- Auth: Cookie-based sessions (HttpOnly access + rotating refresh in Redis), logout, refresh, zod validation, rate limits
- Events: CRUD with RBAC (organizer/admin), payload validation, organizer ownership
- Orders: Seats/holds with Redis TTL, idempotent purchase, Mongo transaction, simulated payments (intent + confirm)
- Infra: MongoDB (per service), Redis, RabbitMQ (ready), Docker Compose
- Patterns: Singleton, Repository, Circuit Breaker, Idempotency, Transactional writes

## Architecture (HLD)
```
┌───────────┐        ┌───────────────────────────────────────┐        ┌─────────┐
│  Web/UI   │◄──────►│  Gateway (Express, BFF)               │◄──────►│  Auth   │
│ (cookies) │        │  - CORS (credentials)                 │        │ (JWT)   │
└───────────┘        │  - Helmet, rate limits                │        └─────────┘
                     │  - Cookie→Authorization bridge        │
                     │  - RBAC: events mutations             │        ┌─────────┐
                     └──────────────┬────────────────────────┘        │ Events  │
                                    │                                 │  CRUD   │
                                    ▼                                 └─────────┘
                              ┌──────────┐
                              │  Orders  │  (holds, payments, purchase)
                              └──────────┘

Data plane
- MongoDB (per service DB): users, events, seats, orders
- Redis: seat holds, idempotency cache, refresh tokens, payment intents (sim)
- RabbitMQ: provisioned for future domain events

ML Service (FastAPI) available; can be proxied via gateway if needed
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

Auth (cookies)
- `POST /api/auth/signup` → sets HttpOnly `access_token` + `refresh_token`
- `POST /api/auth/login` → sets cookies (rotate refresh)
- `POST /api/auth/refresh` → rotates refresh, sets new cookies
- `POST /api/auth/logout` → revokes refresh, clears cookies
- `GET /api/auth/me` → reads access token (cookie or Bearer)

Events
- `GET /api/events` → list (public)
- `POST /api/events` → create (organizer/admin); body: { title, description|null, date, location|null, tags[] }
- `GET /api/events/:id`
- `PUT /api/events/:id` → update (organizer/admin)
- `DELETE /api/events/:id` → delete (organizer/admin)
Notes: payloads validated, `organizerId` set on create

Orders (auth required via gateway)
- `GET /api/orders/seats/:eventId` → 5×10 grid; states: available|held|reserved
- `POST /api/orders/holds` → { eventId, seatIds[] } → { holdId, expiresInSeconds }
- `GET /api/orders/holds/:holdId/ttl` → remaining seconds
- `POST /api/orders/holds/:holdId/refresh` → { extendSeconds? } → new ttl
- `POST /api/orders/payments/intent` → { amount, currency } → { paymentIntentId, clientSecret, status }
- `POST /api/orders/payments/confirm` → { paymentIntentId, clientSecret } → { status: "succeeded" }
- `POST /api/orders/purchase` → { eventId, holdId, seatIds[], paymentIntentId } → { orderId, status }
  - Optional header `Idempotency-Key: <uuid>` for safe retries

ML (direct)
- `GET http://localhost:5000/recs?userId=U&limit=5`
- `GET http://localhost:5000/related?eventId=e1&limit=5`

## Seat Holds & Consistency
- Hold = per‑seat Redis key `hold:<eventId>:<seatId>` with TTL (default 300s) storing `holdId`
- Purchase verifies every seat key exists and matches the `holdId`; otherwise 409 and no reservation
- Refresh: extend TTL for all held seats atomically
- Idempotent purchase: cache success by `Idempotency-Key` (10 minutes)
- Transactional reservation: Mongo session updates seats and creates an `orders` record atomically
- Simulated payments: intent + confirm tracked in Redis; purchase requires `status = succeeded`

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
- `REDIS_URL` (orders, gateway, auth)
- `HOLD_TTL_SECONDS` (orders; default 300)
- `CORS_ORIGINS` (gateway; comma‑separated origins; credentials enabled)
- Cookie/session (auth):
  - `ACCESS_TOKEN_TTL_SECONDS` (default 900)
  - `REFRESH_TOKEN_TTL_SECONDS` (default 1209600)
  - `COOKIE_DOMAIN`, `COOKIE_SECURE` (set `false` in local)

## Postman
Import `docs/postman/collection.json` (or follow steps):
1) Auth (Signup/Login) → cookies set; enable “Send cookies”
2) Promote user to `organizer` (temporary) → create event → save `_id` as `{{eventId}}`
3) Seats → Holds → Payments: intent + confirm → Purchase (add `Idempotency-Key`)

## Roadmap
- Payments adapter (Stripe/Razorpay) behind Strategy, Sagas/Outbox
- Search/indexing, analytics, notifications
- Web UI (Next: login, events list/detail, seat picker, checkout)



