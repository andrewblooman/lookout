"""Ingests APT groups (intrusion-sets) from MITRE ATT&CK Enterprise STIX bundle."""
import logging
import re
from datetime import datetime

import httpx
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Actor

logger = logging.getLogger(__name__)

_COUNTRY_PATTERNS = [
    (re.compile(r"\bRussia[n]?\b", re.I), "Russia"),
    (re.compile(r"\bChina\b|Chinese\b|PRC\b", re.I), "China"),
    (re.compile(r"\bIran[ian]?\b", re.I), "Iran"),
    (re.compile(r"\bNorth Korea[n]?\b|DPRK\b", re.I), "North Korea"),
    (re.compile(r"\bUnited States\b|U\.S\.\b|American\b", re.I), "United States"),
    (re.compile(r"\bVietnam[ese]?\b", re.I), "Vietnam"),
    (re.compile(r"\bIndia[n]?\b", re.I), "India"),
    (re.compile(r"\bPakistan[i]?\b", re.I), "Pakistan"),
]


def _parse_stix_date(raw: str | None) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


def _guess_country(text: str) -> str | None:
    for pattern, country in _COUNTRY_PATTERNS:
        if pattern.search(text):
            return country
    return None


async def run_mitre_attack_ingest(url: str) -> dict:
    logger.info("Starting MITRE ATT&CK ingest from %s", url)
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        bundle = resp.json()

    groups = [
        obj for obj in bundle.get("objects", [])
        if obj.get("type") == "intrusion-set"
        and not obj.get("revoked", False)
        and not obj.get("x_mitre_deprecated", False)
    ]
    logger.info("Found %d active intrusion-sets in ATT&CK bundle", len(groups))

    upserted = 0

    async with AsyncSessionLocal() as db:
        for group in groups:
            mitre_id = None
            for ref in group.get("external_references", []):
                if ref.get("source_name") == "mitre-attack":
                    mitre_id = ref.get("external_id")
                    break

            name = group.get("name", "").strip()
            if not name:
                continue

            description = group.get("description", "") or ""
            aliases = [
                a for a in (group.get("aliases") or []) if a != name
            ]
            origin_country = _guess_country(description)

            first_seen = _parse_stix_date(group.get("created"))
            last_seen = _parse_stix_date(group.get("modified"))

            result = await db.execute(
                select(Actor).where(Actor.mitre_group_id == mitre_id)
                if mitre_id
                else select(Actor).where(Actor.name == name)
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.name = name
                existing.aliases = aliases
                existing.description = description[:2000]
                existing.origin_country = origin_country
                existing.source = "mitre_attack"
                if mitre_id:
                    existing.mitre_group_id = mitre_id
                if not existing.first_seen and first_seen:
                    existing.first_seen = first_seen
                if last_seen and (not existing.last_seen or last_seen > existing.last_seen):
                    existing.last_seen = last_seen
            else:
                db.add(Actor(
                    name=name,
                    aliases=aliases,
                    description=description[:2000],
                    origin_country=origin_country,
                    mitre_group_id=mitre_id,
                    source="mitre_attack",
                    first_seen=first_seen,
                    last_seen=last_seen,
                ))
            upserted += 1

        await db.commit()

    logger.info("MITRE ATT&CK ingest complete: %d groups upserted", upserted)
    return {"upserted": upserted}
