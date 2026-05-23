"""Ingests and enriches APT actors from Malpedia (public API, no key required for basic data)."""
import asyncio
import logging
from urllib.parse import quote

import httpx
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Actor

logger = logging.getLogger(__name__)

_BASE = "https://malpedia.caad.fkie.fraunhofer.de"

_ISO_COUNTRY = {
    "CN": "China", "RU": "Russia", "IR": "Iran", "KP": "North Korea",
    "US": "United States", "VN": "Vietnam", "IN": "India", "PK": "Pakistan",
    "SA": "Saudi Arabia", "IL": "Israel", "UA": "Ukraine", "BY": "Belarus",
    "TR": "Turkey", "KR": "South Korea", "GB": "United Kingdom",
    "FR": "France", "DE": "Germany", "BR": "Brazil", "NG": "Nigeria",
    "RO": "Romania", "LB": "Lebanon", "SY": "Syria",
}

_MOTIVATION_MAP = {
    "espionage": "espionage",
    "information theft": "espionage",
    "cybercrime": "financial",
    "financial crime": "financial",
    "financial gain": "financial",
    "sabotage": "sabotage",
    "destruction": "sabotage",
    "hacktivism": "hacktivist",
    "information operations": "hacktivist",
    "influence operations": "hacktivist",
}


def _normalize_motivation(raw: str | None) -> str | None:
    if not raw:
        return None
    return _MOTIVATION_MAP.get(raw.lower().strip())


async def _fetch_actor_detail(
    client: httpx.AsyncClient,
    actor_id: str,
    sem: asyncio.Semaphore,
) -> dict | None:
    async with sem:
        try:
            resp = await client.get(
                f"{_BASE}/api/get/actor/{quote(actor_id, safe='')}",
                timeout=15,
            )
            if resp.status_code == 200:
                return resp.json()
            logger.debug("Malpedia actor %s returned HTTP %d", actor_id, resp.status_code)
        except Exception as exc:
            logger.warning("Failed to fetch Malpedia actor %s: %s", actor_id, exc)
    return None


async def run_malpedia_ingest(url: str, token: str | None = None) -> dict:
    logger.info("Starting Malpedia ingest")

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(f"{_BASE}/api/list/actors")
        resp.raise_for_status()
        actor_ids: list[str] = resp.json()

    logger.info("Malpedia: %d actors listed", len(actor_ids))

    # Load existing actors into memory for cross-referencing
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Actor))
        existing_actors: list[Actor] = list(result.scalars().all())

    # Build lookup dicts: lowercase name/alias → Actor
    by_name: dict[str, Actor] = {a.name.lower(): a for a in existing_actors}
    by_alias: dict[str, Actor] = {}
    for actor in existing_actors:
        for alias in (actor.aliases or []):
            by_alias[alias.lower()] = actor

    def _find_match(candidates: list[str]) -> Actor | None:
        for c in candidates:
            key = c.lower().strip()
            if key in by_name:
                return by_name[key]
            if key in by_alias:
                return by_alias[key]
        return None

    # Fetch all actor details concurrently (rate-limited)
    sem = asyncio.Semaphore(5)
    async with httpx.AsyncClient(timeout=15) as client:
        tasks = [_fetch_actor_detail(client, aid, sem) for aid in actor_ids]
        details = await asyncio.gather(*tasks)

    enriched = 0
    inserted = 0

    async with AsyncSessionLocal() as db:
        for data in details:
            if not data:
                continue

            name = (data.get("value") or "").strip()
            if not name:
                continue

            meta = data.get("meta") or {}
            synonyms: list[str] = [s for s in (meta.get("synonyms") or []) if s]
            country_iso = meta.get("country", "")
            country = _ISO_COUNTRY.get(country_iso.upper()) if country_iso else None
            motivation = _normalize_motivation(meta.get("cfr-type-of-incident"))
            description = (data.get("description") or "").strip()

            candidates = [name] + synonyms
            match = _find_match(candidates)

            if match:
                # Enrich existing actor — only fill gaps, don't overwrite MITRE data
                changed = False
                if not match.motivation and motivation:
                    match.motivation = motivation
                    changed = True
                if (not match.origin_country) and country:
                    match.origin_country = country
                    changed = True
                # Merge new synonyms into aliases without creating duplicates
                existing_lower = {a.lower() for a in (match.aliases or [])}
                new_aliases = [
                    s for s in synonyms
                    if s.lower() not in existing_lower and s.lower() != match.name.lower()
                ]
                if new_aliases:
                    match.aliases = (match.aliases or []) + new_aliases
                    changed = True
                if not match.description and description:
                    match.description = description[:2000]
                    changed = True
                if changed:
                    db.add(match)
                enriched += 1
            else:
                # New actor not in MITRE — insert from Malpedia
                db.add(Actor(
                    name=name,
                    aliases=synonyms,
                    origin_country=country,
                    motivation=motivation,
                    description=description[:2000] if description else None,
                    source="malpedia",
                ))
                inserted += 1

        await db.commit()

    logger.info("Malpedia ingest complete: %d enriched, %d inserted", enriched, inserted)
    return {"enriched": enriched, "inserted": inserted}
