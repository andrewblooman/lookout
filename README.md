# Lookout

![Python](https://img.shields.io/badge/Python-3.14-3776ab?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?logo=fastapi&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169e1?logo=postgresql&logoColor=white)
![Redis](https://img.shields.io/badge/Redis-7-dc382d?logo=redis&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ed?logo=docker&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green)

A threat intelligence platform that collects, correlates, and presents cyber threat data from CISA KEV, RSS news feeds, MITRE ATT&CK, Malpedia, and seed data. Built for analyst-friendly triage and threat hunting.

---

## Features

- **Dashboard** — threat level summary, attack origin globe, active campaigns, latest KEV CVEs, and news feed
- **APTs** — 44 seeded threat actors with MITRE ATT&CK IDs, aliases, country attribution, motivation, and campaign links
- **Campaigns** — 9 attributed campaigns explicitly linked to their responsible actor and associated IOCs
- **IOCs** — indicators of compromise with per-type summary widgets, confidence scoring, actor/campaign attribution, and full-text search
- **CVEs** — 80 seeded vulnerabilities (2017–2024) with CVSS scores, CISA KEV status, and due dates; enriched further by live CISA KEV and NVD feeds
- **News** — RSS-ingested articles with extracted actor, CVE, and malware entity tags
- **Feeds** — full CRUD management of ingest feeds with encrypted API token storage

---

## Stack

| Layer     | Technology                                      |
|-----------|-------------------------------------------------|
| Backend   | FastAPI + Python 3.14, SQLAlchemy 2 (async)     |
| Database  | PostgreSQL 16                                   |
| Cache     | Redis 7                                         |
| Scheduler | APScheduler (background, hourly ingest)         |
| Frontend  | Next.js 15 App Router, TanStack Query, Tailwind |
| Container | Docker Compose (prod + dev override)            |

---

## Quick start

```bash
# Copy env and generate a Fernet key
cp .env.example .env
python3.14 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
# Paste the output as FEED_SECRET_KEY in .env

# Start everything with hot reload
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service   | URL                        |
|-----------|----------------------------|
| Frontend  | http://localhost:3000      |
| Backend   | http://localhost:8000      |
| API docs  | http://localhost:8000/docs |

> **Note:** The two compose files are intentional — `docker-compose.yml` is the base service definition, `docker-compose.dev.yml` overlays hot-reload volume mounts and dev Dockerfiles. See [Docker Compose docs on multiple files](https://docs.docker.com/compose/multiple-compose-files/merge/).

To reset the database and re-run seed data:
```bash
docker compose down -v && docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

---

## Seed data

On first startup (empty `actors` table), the app seeds realistic threat intel covering:

| Entity    | Count | Notes |
|-----------|-------|-------|
| Actors    | 44    | Russian, Chinese, NK, Iranian, criminal/RaaS, and other state APTs |
| Campaigns | 9     | Each explicitly attributed to an actor with IOC links |
| IOCs      | 29    | IPs, domains, hashes, URLs — each linked to the correct actor and campaign |
| CVEs      | 80    | High-profile CVEs 2017–2024 including Log4Shell, ProxyLogon, MOVEit, Citrix Bleed |
| News      | 15    | Representative threat intel articles with extracted entity tags |

Live feeds (enabled by default, fire once on startup then hourly) will grow CVE count to ~1,200+ once CISA KEV and NVD ingest run successfully.

---

## Ingest sources

| Feed | Type | Requires token |
|------|------|---------------|
| CISA Known Exploited Vulnerabilities | `cisa_kev` | No |
| MITRE ATT&CK Enterprise | `mitre_attack` | No |
| Malpedia actor list | `malpedia` | No |
| NVD CVE (recent) | `nvd_cve` | No |
| Wiz Cloud Threat Landscape (STIX) | `wiz_stix` | No |
| Abuse.ch URLhaus IOCs | `urlhaus_iocs` | No |
| URLhaus recent payloads | `urlhaus_api` | No |
| Krebs on Security RSS | `rss` | No |
| The Hacker News RSS | `rss` | No |
| Bleeping Computer RSS | `rss` | No |
| AlienVault OTX | `alienvault_otx` | Yes — add via Feeds UI |
| Shodan | `shodan` | Yes — add via Feeds UI |

---

## Development

```bash
# Backend syntax check
cd backend && python3.14 -m py_compile app/**/*.py

# Backend with auto-reload (outside Docker)
cd backend && python3.14 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && uvicorn app.main:app --reload

# Frontend lint
cd frontend && npm run lint

# Manually trigger all feeds
curl -X POST http://localhost:8000/api/v1/ingest/trigger

# Trigger a single feed
curl -X POST http://localhost:8000/api/v1/feeds/<uuid>/trigger
```

---

## Project structure

```
lookout/
├── backend/
│   └── app/
│       ├── api/v1/          # Route handlers (actors, campaigns, iocs, cves, news, feeds, dashboard)
│       ├── models/          # SQLAlchemy ORM models
│       ├── schemas/         # Pydantic v2 request/response schemas
│       ├── services/
│       │   ├── ingest/      # Per-feed ingest handlers + seed.py
│       │   ├── cache.py     # Redis helpers
│       │   └── token.py     # Fernet token encryption
│       └── core/
│           ├── config.py    # Settings (pydantic-settings)
│           └── scheduler.py # APScheduler + run_all_feeds()
└── frontend/
    ├── app/                 # Next.js App Router pages
    ├── components/          # Shared UI components
    ├── lib/
    │   ├── api.ts           # Fetch wrapper
    │   ├── hooks/           # TanStack Query hooks
    │   └── utils.ts         # severityColor, relativeTime, truncate
    └── types/               # TypeScript interfaces matching Pydantic schemas
```

---

## Relationship model

Actors, campaigns, and IOCs are explicitly linked in the seed data and maintained through ingest:

```
Actor ──attributed-to──▶ Campaign ──contains──▶ IOC
  │                          │
  └──mitre_group_id          └──target_sectors / target_regions
```

Example: **Team PCP** → **Operation CanisterWorm** → CanisterWorm hash + C2 IPs + malicious npm domains

---

## Design system

Cyberpunk dark theme (`app/globals.css`):

| Token | Value |
|-------|-------|
| Background | `#020617` |
| Card surface | `#111827` |
| Accent | `#00d4ff` (cyan) |
| Critical | `red-500` |
| High | `orange-500` |
| Medium | `amber-500` |
| Low | `green-500` |
| Monospace font | Fira Code |

CSS classes: `.cyber-card`, `.scanlines`, `.glow-accent`, `.glow-danger`. Light mode supported via `next-themes`.

---

## License

MIT
