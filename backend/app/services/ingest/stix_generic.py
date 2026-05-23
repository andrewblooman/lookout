"""Ingests a generic STIX 2.x bundle — maps intrusion-sets to actors, indicators to IOCs."""
import logging
import re

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import Actor, IOC
from app.services.ioc_types import normalize_ioc_type

logger = logging.getLogger(__name__)

_PATTERN_RULES = [
    (re.compile(r"ipv4-addr:value\s*=\s*'([^']+)'", re.I), "ip"),
    (re.compile(r"ipv6-addr:value\s*=\s*'([^']+)'", re.I), "ip"),
    (re.compile(r"domain-name:value\s*=\s*'([^']+)'", re.I), "domain"),
    (re.compile(r"url:value\s*=\s*'([^']+)'", re.I), "url"),
    (re.compile(r"file:hashes\.SHA-256\s*=\s*'([^']+)'", re.I), "hash-sha256"),
    (re.compile(r"file:hashes\.MD5\s*=\s*'([^']+)'", re.I), "hash-md5"),
    (re.compile(r"file:hashes\.SHA-1\s*=\s*'([^']+)'", re.I), "hash-sha1"),
]


def _parse_stix_pattern(pattern: str) -> list[tuple[str, str]]:
    """Return [(ioc_type, value), ...] from a STIX indicator pattern string."""
    results = []
    for regex, ioc_type in _PATTERN_RULES:
        for match in regex.finditer(pattern):
            results.append((ioc_type, match.group(1).strip()))
    return results


async def run_stix_generic_ingest(url: str, source_name: str = "stix", token: str | None = None) -> dict:
    logger.info("Starting STIX generic ingest from %s", url)
    headers = {}
    if token:
        headers["Authorization"] = f"Bearer {token}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(url, headers=headers)
        resp.raise_for_status()
        bundle = resp.json()

    objects = bundle.get("objects", [])
    actors_upserted = 0
    iocs_upserted = 0

    async with AsyncSessionLocal() as db:
        for obj in objects:
            obj_type = obj.get("type", "")

            if obj_type == "intrusion-set" and not obj.get("revoked", False):
                name = obj.get("name", "").strip()
                if not name:
                    continue
                mitre_id = None
                for ref in obj.get("external_references", []):
                    if ref.get("source_name") == "mitre-attack":
                        mitre_id = ref.get("external_id")
                        break

                result = await db.execute(
                    select(Actor).where(Actor.mitre_group_id == mitre_id)
                    if mitre_id
                    else select(Actor).where(Actor.name == name)
                )
                existing = result.scalar_one_or_none()
                description = (obj.get("description") or "")[:2000]
                aliases = [a for a in (obj.get("aliases") or []) if a != name]

                if existing:
                    existing.description = description
                    existing.aliases = aliases
                    existing.source = source_name
                else:
                    db.add(Actor(
                        name=name,
                        aliases=aliases,
                        description=description,
                        mitre_group_id=mitre_id,
                        source=source_name,
                    ))
                actors_upserted += 1

            elif obj_type == "indicator":
                pattern = obj.get("pattern", "")
                if not pattern:
                    continue
                labels = obj.get("labels") or []
                for ioc_type, value in _parse_stix_pattern(pattern):
                    stmt = (
                        insert(IOC)
                        .values(
                            type=normalize_ioc_type(ioc_type),
                            value=value,
                            source=source_name,
                            confidence=75,
                            tags=labels[:10],
                        )
                        .on_conflict_do_update(
                            constraint="uq_ioc_type_value",
                            set_=dict(source=source_name, tags=labels[:10]),
                        )
                    )
                    await db.execute(stmt)
                    iocs_upserted += 1

        await db.commit()

    logger.info(
        "STIX generic ingest complete (%s): %d actors, %d IOCs",
        source_name, actors_upserted, iocs_upserted,
    )
    return {"actors_upserted": actors_upserted, "iocs_upserted": iocs_upserted}
