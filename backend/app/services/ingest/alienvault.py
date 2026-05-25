"""Ingests threat indicators from AlienVault OTX (requires API key).

First run fetches all pages. Subsequent runs pass modified_since=<last_ingested_at>
so only new/updated pulses are fetched, keeping incremental runs to 1-2 pages.
"""
import asyncio
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import IOC
from app.services.ioc_types import normalize_ioc_type

logger = logging.getLogger(__name__)

_API_PATH = "/api/v1/pulses/subscribed"
_PAGE_SIZE = 100

_TYPE_MAP = {
    "IPv4": "ip",
    "IPv6": "ip",
    "domain": "domain",
    "hostname": "domain",
    "URL": "url",
    "FileHash-MD5": "hash-md5",
    "FileHash-SHA256": "hash-sha256",
    "FileHash-SHA1": "hash-sha1",
}


def _first_page_url(url: str, since: datetime | None) -> str:
    parsed = urlparse(url)
    base = f"https://{parsed.netloc}{_API_PATH}"
    params = f"limit={_PAGE_SIZE}"
    if since:
        # OTX accepts ISO 8601 UTC without timezone suffix
        params += f"&modified_since={since.strftime('%Y-%m-%dT%H:%M:%S')}"
    return f"{base}?{params}"


async def run_alienvault_ingest(url: str, token: str | None = None, since: datetime | None = None) -> dict:
    if not token:
        raise ValueError("AlienVault OTX requires an API key — add it in the feed settings")

    headers = {"X-OTX-API-KEY": token}
    now = datetime.now(timezone.utc)
    upserted = 0
    page = 1
    next_url: str | None = _first_page_url(url, since)

    if since:
        logger.info("AlienVault OTX: incremental fetch (modified since %s)", since.isoformat())
    else:
        logger.info("AlienVault OTX: full fetch (no prior ingestion timestamp)")

    async with httpx.AsyncClient(timeout=60) as client:
        while next_url:
            logger.info("AlienVault OTX: fetching page %d", page)
            for attempt in range(3):
                resp = await client.get(next_url, headers=headers)
                if resp.status_code < 500:
                    break
                wait = 2 ** attempt * 5
                logger.warning("AlienVault OTX: %s on page %d, retrying in %ds (attempt %d/3)", resp.status_code, page, wait, attempt + 1)
                await asyncio.sleep(wait)
            resp.raise_for_status()
            data = resp.json()

            pulses = data.get("results") or []
            next_url = data.get("next")

            async with AsyncSessionLocal() as db:
                for pulse in pulses:
                    pulse_tags = pulse.get("tags", [])
                    for indicator in pulse.get("indicators", []):
                        otx_type = indicator.get("type", "")
                        ioc_type = _TYPE_MAP.get(otx_type)
                        if not ioc_type:
                            continue
                        value = indicator.get("indicator", "").strip()
                        if not value:
                            continue

                        stmt = (
                            insert(IOC)
                            .values(
                                type=normalize_ioc_type(ioc_type),
                                value=value,
                                source="alienvault_otx",
                                confidence=75,
                                last_seen=now,
                                tags=pulse_tags[:10],
                            )
                            .on_conflict_do_update(
                                constraint="uq_ioc_type_value",
                                set_=dict(last_seen=now, source="alienvault_otx"),
                            )
                        )
                        await db.execute(stmt)
                        upserted += 1

                await db.commit()

            page += 1

    logger.info("AlienVault OTX ingest complete: %d pages, %d IOCs upserted", page - 1, upserted)
    return {"upserted": upserted}
