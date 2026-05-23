# Lookout Copilot Instructions

## Build, test, and lint commands

```bash
# Start the full stack with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Backend only (outside Docker)
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend only (outside Docker)
cd frontend
npm install
npm run dev

# Backend validation
cd backend && python3.13 -m py_compile app/**/*.py

# Frontend lint
cd frontend && npm run lint

# Frontend production build check
cd frontend && npm run build
```

There is currently no automated test suite wired up, so there is no supported single-test command yet.

## High-level architecture

- Lookout is a FastAPI backend plus a Next.js 15 App Router frontend, backed by PostgreSQL and Redis, with Docker Compose wiring the full stack together.
- Backend startup is important: `backend/app/main.py` creates tables, seeds the database when `actors` is empty, then starts APScheduler and immediately kicks off feed ingestion. The main request flow is `main.py` -> `api/v1/router.py` -> route modules -> models/services.
- Feed ingestion is database-driven. Enabled `feeds` rows are loaded by the scheduler, dispatched by `feed_type` to handlers in `backend/app/services/ingest/`, and then `last_ingested_at` / `last_error` are written back to the feed record.
- The frontend does not currently use server components for data loading. Pages are `"use client"` components that call TanStack Query hooks in `frontend/lib/hooks/useQuery.ts`, which use `frontend/lib/api.ts` to talk to the backend.
- The dashboard summary is cached in Redis for 120 seconds, while other pages mostly read directly from the API.

## Key conventions

- Keep backend database access async. Routes receive `AsyncSession` via `Depends(get_db)`, and new DB code should follow the existing SQLAlchemy async session pattern.
- Feed API tokens must stay encrypted at rest and hidden in responses. Store them through `services/token.py`, persist them in `feeds.api_token_encrypted`, and expose only `has_token` via `FeedOut`.
- Seed data relationships are intentionally name-based, not positional. `seed_if_empty()` flushes actors and campaigns, builds lookup maps, and then resolves IOC foreign keys from actor/campaign names.
- Route ordering matters in `backend/app/api/v1/iocs.py`: keep `/summary` above `/{ioc_id}` so the summary endpoint does not get swallowed by the parameterized route.
- Backend Pydantic schemas and frontend TypeScript types are expected to match. When API shapes change, update both `backend/app/schemas/` and `frontend/types/index.ts`, plus any affected query hooks.
- Adding a new backend data type usually means touching all of: `models/`, `models/__init__.py`, `schemas/`, an `api/v1/` route, `api/v1/router.py`, and `services/ingest/seed.py` if it should be seeded.
- Frontend pages follow a consistent path: add a `"use client"` page under `frontend/app/`, a matching query hook in `frontend/lib/hooks/useQuery.ts`, and a navigation entry in `frontend/components/layout/Sidebar.tsx`.
- Reuse the shared frontend helpers instead of duplicating presentation logic: `frontend/lib/utils.ts` for formatting/severity helpers, and the theme tokens/classes in `frontend/app/globals.css` for the cyberpunk light/dark styling.
- `react-globe.gl` must stay dynamically imported in `components/dashboard/GlobeCard.tsx`; it depends on Three.js and is intentionally kept out of SSR.

## Relevant MCP server

- `Playwright` is the most useful MCP server for this repository. Use it for browser smoke checks and UI regressions against the Next.js frontend at `http://localhost:3000` after starting the stack.
- Good Playwright targets here are the dashboard, IOC filters/search, CVE and news listings, and feed management under `/settings/feeds`.
- If running the frontend outside Docker, make sure `NEXT_PUBLIC_API_URL` still points at the backend on `http://localhost:8000` before using browser automation.
