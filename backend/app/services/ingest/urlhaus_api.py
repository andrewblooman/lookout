"""Ingests recent malware payload hashes from Abuse.ch URLhaus API."""
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import IOC
from app.services.ioc_types import normalize_ioc_type

logger = logging.getLogger(__name__)


async def run_urlhaus_api_ingest(url: str, token: str | None = None) -> dict:
    if not token:
        raise ValueError(
            "URLhaus API requires an Auth-Key — register at abuse.ch to get a free API key, "
            "then add it in the feed settings"
        )
    logger.info("Starting URLhaus API ingest from %s", url)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            url,
            headers={
                "Content-Type": "application/x-www-form-urlencoded",
                "Auth-Key": token,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    payloads = data.get("payloads") or []
    upserted = 0
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        for payload in payloads:
            tags = [
                t for t in [payload.get("file_type"), payload.get("signature")]
                if t
            ]
            for hash_type, hash_key in [("hash-sha256", "sha256_hash"), ("hash-md5", "md5_hash")]:
                value = payload.get(hash_key, "").strip()
                if not value:
                    continue
                stmt = (
                    insert(IOC)
                    .values(
                        type=normalize_ioc_type(hash_type),
                        value=value,
                        source="urlhaus_api",
                        confidence=85,
                        last_seen=now,
                        tags=tags,
                    )
                    .on_conflict_do_update(
                        constraint="uq_ioc_type_value",
                        set_=dict(last_seen=now, tags=tags, source="urlhaus_api"),
                    )
                )
                await db.execute(stmt)
                upserted += 1

        await db.commit()

    logger.info("URLhaus API ingest complete: %d hashes upserted", upserted)
    return {"upserted": upserted}
