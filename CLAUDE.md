# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Lookout is a threat intelligence platform. It collects, correlates, and presents cyber threat data from CISA KEV, RSS news feeds, MITRE ATT&CK, Malpedia, and seed data. The stack is **FastAPI + Python 3.13** (backend) and **Next.js 15 App Router** (frontend), containerised with Docker Compose.

---

## Running the stack

```bash
# Start everything (hot reload enabled via dev overrides)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# Backend only (outside Docker, for faster iteration)
cd backend
python3.13 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# Frontend only (outside Docker)
cd frontend
npm install
npm run dev
```

| Service   | URL                          |
|-----------|------------------------------|
| Frontend  | http://localhost:3000        |
| Backend   | http://localhost:8000        |
| API docs  | http://localhost:8000/docs   |

Environment variables live in `.env` (copied from `.env.example`). The key variable is `FEED_SECRET_KEY` — a Fernet key for encrypting feed API tokens. Generate one with:
```bash
python3.13 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

---

## Development commands

```bash
# Backend — syntax check all modules
cd backend && python3.13 -m py_compile app/**/*.py

# Backend — run with auto-reload (outside Docker)
cd backend && uvicorn app.main:app --reload

# Frontend — lint
cd frontend && npm run lint

# Frontend — production build check
cd frontend && npm run build

# Trigger all feed ingestion manually
curl -X POST http://localhost:8000/api/v1/ingest/trigger

# Trigger a single feed by ID
curl -X POST http://localhost:8000/api/v1/feeds/<uuid>/trigger
```

No test suite is wired up yet. Backend syntax is validated with `py_compile`.

---

## Seed data

Seed runs once on startup if `actors` table is empty (`SEED_ON_EMPTY=true`). It uses **name-based lookups** to wire explicit actor→campaign→IOC relationships — do not revert to index-based (`i % len(actors)`) assignment.

| Entity    | Count | Notes |
|-----------|-------|-------|
| Actors    | 44    | Russian, Chinese, NK, Iranian, criminal/RaaS, and other APTs |
| Campaigns | 9     | Each has an `"actor"` key matched by name in `seed_if_empty()` |
| IOCs      | 29    | 7-tuple: `(type, value, confidence, tags, source, actor_name, campaign_name)` |
| CVEs      | 80    | High-profile CVEs 2017–2024 |
| News      | 15    | Representative threat intel articles |

`seed_if_empty()` builds `actor_by_name` and `campaign_by_name` dicts after flushing actors/campaigns so that IOC foreign keys resolve correctly.

Notable actors added: **Team PCP** — supply chain group targeting npm/PyPI and AI/ML platforms (CanisterWorm malware, audio steganography C2 evasion). Two campaigns: `ShadowCloud` and `Operation CanisterWorm`.

---

## Backend architecture

All source is under `backend/app/`.

**Startup sequence** (`main.py` lifespan):
1. `Base.metadata.create_all` — creates tables if missing (use Alembic for schema migrations in prod)
2. `seed_if_empty()` — populates the DB with realistic mock data only if the `actors` table is empty; controlled by `SEED_ON_EMPTY` env var
3. `start_scheduler()` — starts APScheduler and immediately fires `run_all_feeds()` as a background asyncio task; thereafter runs every hour

**Request path**: `main.py` → `api/v1/router.py` → individual route files → models/services.

**Key conventions**:
- All DB access is async via SQLAlchemy 2.x `AsyncSession`. Route handlers receive it via `Depends(get_db)`.
- Redis caching uses `services/cache.py` (`cache_get` / `cache_set`). Dashboard summary is cached for 120 s.
- Feed API tokens are never returned in GET responses. They are stored encrypted in `feeds.api_token_encrypted` using Fernet (`services/token.py`). If `FEED_SECRET_KEY` is unset, a deterministic dev key is derived — tokens will not survive a key rotation.
- New ingest handlers go in `services/ingest/`. The scheduler's `run_all_feeds()` dispatches on `feed.feed_type`; add a new branch there to support new types.
- Pydantic v2 schemas live alongside routes in `schemas/`. `FeedOut` never exposes `api_token_encrypted`; it surfaces `has_token: bool` instead.
- `GET /api/v1/iocs/summary` returns `{by_type: {ip: N, domain: N, ...}, total: N}` — declared **before** `/{ioc_id}` in `api/v1/iocs.py` to avoid path conflict. Schema: `IOCSummary` in `schemas/ioc.py`.

**Adding a new data type** (e.g. malware samples):
1. Add a SQLAlchemy model in `models/`
2. Add it to `models/__init__.py`
3. Add a Pydantic schema in `schemas/`
4. Add route file in `api/v1/`, register it in `api/v1/router.py`
5. Add seed entries in `services/ingest/seed.py`

---

## Frontend architecture

All source is under `frontend/`.

**Data flow**: Pages → TanStack Query hooks (`lib/hooks/useQuery.ts`) → `lib/api.ts` fetch wrapper → FastAPI at `NEXT_PUBLIC_API_URL`.

**Key conventions**:
- Every page is a `"use client"` component using TanStack Query. There is no server-side data fetching currently.
- All API types are defined in `types/index.ts` and must match the Pydantic response schemas.
- `lib/utils.ts` provides `severityColor`, `severityBg`, `relativeTime`, and `truncate` — use these instead of inline logic.
- The Globe card (`components/dashboard/GlobeCard.tsx`) dynamically imports `react-globe.gl` via `import()` because it depends on Three.js and cannot run server-side.
- Theme is handled by `next-themes` with `attribute="class"`. Dark mode class is `dark`, light is the default (no class). CSS custom properties and `.light` / `.dark` class overrides live in `app/globals.css`.

**Adding a new page**:
1. Create `app/<name>/page.tsx` as a `"use client"` component
2. Add a query hook in `lib/hooks/useQuery.ts`
3. Add the nav link in `components/layout/Sidebar.tsx` (`NAV` array)

---

## Database schema summary

| Table           | Key columns / notes |
|-----------------|---------------------|
| `actors`        | APT/threat actor profiles; `mitre_group_id` links to ATT&CK |
| `campaigns`     | Linked to `actors`; `target_sectors[]` and `target_regions[]` are Postgres arrays |
| `iocs`          | Unique on `(type, value)`; `confidence` 0–100 |
| `cves`          | Unique on `cve_id`; `kev_status` + `kev_due_date` from CISA |
| `news`          | Unique on `url`; `extracted_actors/cves/malware` populated by regex in the RSS ingestor |
| `relationships` | Generic source/target graph edges; no FK constraints, uses `source_type`+`source_id` pattern |
| `feeds`         | Drives the scheduler; `api_token_encrypted` is Fernet-encrypted; upserts use `on_conflict_do_update` |

---

## Design system

The UI follows a cyberpunk dark theme defined in `app/globals.css`:
- Background: `#020617`, card surface: `#111827`, accent: `#00d4ff` (cyan)
- Severity colours: critical = red-500, high = orange-500, medium = amber-500, low = green-500
- Monospace values (CVE IDs, hashes, IOC values) use `font-mono` (`Fira Code`)
- Custom CSS classes: `.cyber-card` (bordered card with top-edge glow), `.scanlines` (subtle overlay), `.glow-accent` / `.glow-danger` (text-shadow)
- Light mode uses the same accent palette on a white/slate-50 background
