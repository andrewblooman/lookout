"""Ingests IOC URLs from Abuse.ch URLhaus CSV feed."""
import csv
import io
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import IOC

logger = logging.getLogger(__name__)


async def run_urlhaus_csv_ingest(url: str) -> dict:
    logger.info("Starting URLhaus CSV ingest from %s", url)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, headers={"User-Agent": "Lookout-ThreatIntel/1.0"})
        resp.raise_for_status()
        text = resp.text

    upserted = 0
    now = datetime.now(timezone.utc)

    async with AsyncSessionLocal() as db:
        reader = csv.reader(
            line for line in io.StringIO(text) if not line.startswith("#")
        )
        for row in reader:
            if len(row) < 9:
                continue
            _, dateadded, ioc_url, url_status, _, _, tags_raw, _, _ = row[:9]
            ioc_url = ioc_url.strip()
            if not ioc_url:
                continue

            first_seen = None
            if dateadded:
                try:
                    first_seen = datetime.strptime(dateadded.strip(), "%Y-%m-%d %H:%M:%S").replace(
                        tzinfo=timezone.utc
                    )
                except ValueError:
                    pass

            confidence = 80 if url_status.strip() == "online" else 60
            tags = [t.strip() for t in tags_raw.split(",") if t.strip()]

            stmt = (
                insert(IOC)
                .values(
                    type="url",
                    value=ioc_url,
                    source="urlhaus",
                    confidence=confidence,
                    first_seen=first_seen,
                    last_seen=now,
                    tags=tags,
                )
                .on_conflict_do_update(
                    constraint="uq_ioc_type_value",
                    set_=dict(
                        last_seen=now,
                        confidence=confidence,
                        tags=tags,
                        source="urlhaus",
                    ),
                )
            )
            await db.execute(stmt)
            upserted += 1

        await db.commit()

    logger.info("URLhaus CSV ingest complete: %d IOCs upserted", upserted)
    return {"upserted": upserted}
