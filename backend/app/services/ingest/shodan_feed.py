"""Ingests host intelligence from Shodan (requires API key)."""
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import IOC

logger = logging.getLogger(__name__)

_DEFAULT_QUERIES = [
    "tag:c2",
    "tag:malware",
    "has_vuln:true port:445",
]


async def run_shodan_ingest(url: str, token: str | None = None) -> dict:
    if not token:
        raise ValueError("Shodan requires an API key — add it in the feed settings")

    logger.info("Starting Shodan ingest")
    now = datetime.now(timezone.utc)
    upserted = 0

    async with httpx.AsyncClient(timeout=30) as client:
        async with AsyncSessionLocal() as db:
            for query in _DEFAULT_QUERIES:
                params = {"key": token, "query": query, "minify": "true"}
                try:
                    resp = await client.get(url, params=params)
                    resp.raise_for_status()
                    data = resp.json()
                except Exception as exc:
                    logger.warning("Shodan query '%s' failed: %s", query, exc)
                    continue

                for match in data.get("matches", []):
                    ip = match.get("ip_str", "").strip()
                    if not ip:
                        continue
                    tags = match.get("tags") or []
                    stmt = (
                        insert(IOC)
                        .values(
                            type="ip",
                            value=ip,
                            source="shodan",
                            confidence=70,
                            last_seen=now,
                            tags=tags,
                        )
                        .on_conflict_do_update(
                            constraint="uq_ioc_type_value",
                            set_=dict(last_seen=now, tags=tags, source="shodan"),
                        )
                    )
                    await db.execute(stmt)
                    upserted += 1

            await db.commit()

    logger.info("Shodan ingest complete: %d IPs upserted", upserted)
    return {"upserted": upserted}
