"""Ingests threat indicators from AlienVault OTX (requires API key)."""
import logging
from datetime import datetime, timezone
from urllib.parse import urlparse, urlunparse

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import IOC

logger = logging.getLogger(__name__)

_API_PATH = "/api/v1/pulses/subscribed"

_TYPE_MAP = {
    "IPv4": "ip",
    "IPv6": "ip",
    "domain": "domain",
    "hostname": "domain",
    "URL": "url",
    "FileHash-MD5": "md5",
    "FileHash-SHA256": "sha256",
    "FileHash-SHA1": "sha1",
}


def _api_url(url: str) -> str:
    """Normalise URL — always hit the subscribed pulses endpoint."""
    parsed = urlparse(url)
    if _API_PATH not in parsed.path:
        return urlunparse(parsed._replace(path=_API_PATH, query="limit=100", fragment=""))
    return url if "limit=" in url else url + ("&" if "?" in url else "?") + "limit=100"


async def run_alienvault_ingest(url: str, token: str | None = None) -> dict:
    if not token:
        raise ValueError("AlienVault OTX requires an API key — add it in the feed settings")

    api_url = _api_url(url)
    logger.info("Starting AlienVault OTX ingest from %s", api_url)
    headers = {"X-OTX-API-KEY": token}
    now = datetime.now(timezone.utc)
    upserted = 0

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.get(api_url, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    pulses = data.get("results") or []

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
                        type=ioc_type,
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

    logger.info("AlienVault OTX ingest complete: %d IOCs upserted", upserted)
    return {"upserted": upserted}
