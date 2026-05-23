"""Ingests security news from RSS feeds."""
import calendar
import logging
import re
from datetime import datetime, timezone
from email.utils import parsedate_to_datetime

import feedparser
import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import NewsArticle

logger = logging.getLogger(__name__)

_CVE_RE = re.compile(r"CVE-\d{4}-\d{4,7}", re.IGNORECASE)
_ACTOR_KEYWORDS = [
    "APT29", "APT28", "Lazarus", "Sandworm", "APT41", "Kimsuky",
    "TeamTNT", "Scattered Spider", "Volt Typhoon", "BlackCat", "LockBit",
    "Midnight Blizzard", "Cozy Bear", "Fancy Bear",
]


def _extract_cves(text: str) -> list[str]:
    return list({m.upper() for m in _CVE_RE.findall(text)})


def _extract_actors(text: str) -> list[str]:
    return [a for a in _ACTOR_KEYWORDS if a.lower() in text.lower()]


def _parse_date(entry) -> datetime | None:
    for attr in ("published_parsed", "updated_parsed"):
        val = getattr(entry, attr, None)
        if val:
            try:
                return datetime.fromtimestamp(calendar.timegm(val), tz=timezone.utc)
            except Exception:
                pass
    raw = getattr(entry, "published", None) or getattr(entry, "updated", None)
    if raw:
        try:
            parsed = parsedate_to_datetime(raw)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed.astimezone(timezone.utc)
        except Exception:
            pass
    return None


async def run_rss_ingest(url: str, source_name: str) -> dict:
    logger.info("Starting RSS ingest from %s", url)
    async with httpx.AsyncClient(timeout=30, follow_redirects=True) as client:
        resp = await client.get(url, headers={"User-Agent": "Lookout-ThreatIntel/1.0"})
        resp.raise_for_status()
        content = resp.text

    feed = feedparser.parse(content)
    upserted = 0

    async with AsyncSessionLocal() as db:
        for entry in feed.entries:
            link = getattr(entry, "link", "") or ""
            title = getattr(entry, "title", "") or ""
            summary = getattr(entry, "summary", "") or getattr(entry, "description", "") or ""
            if not link or not title:
                continue

            combined_text = f"{title} {summary}"
            cves = _extract_cves(combined_text)
            actors = _extract_actors(combined_text)
            pub_date = _parse_date(entry)

            stmt = (
                insert(NewsArticle)
                .values(
                    title=title[:500],
                    url=link[:1000],
                    source_name=source_name,
                    published_at=pub_date,
                    summary=summary[:2000] if summary else None,
                    extracted_cves=cves,
                    extracted_actors=actors,
                    extracted_malware=[],
                    tags=["rss"],
                )
                .on_conflict_do_update(
                    index_elements=["url"],
                    set_=dict(
                        title=title[:500],
                        summary=summary[:2000] if summary else None,
                        extracted_cves=cves,
                        extracted_actors=actors,
                    ),
                )
            )
            await db.execute(stmt)
            upserted += 1

        await db.commit()

    logger.info("RSS ingest from %s complete: %d articles upserted", source_name, upserted)
    return {"source": source_name, "upserted": upserted}
