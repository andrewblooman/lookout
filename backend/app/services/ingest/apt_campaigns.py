"""Ingests APT & cybercriminal campaign catalog from CyberMonitor GitHub repo.

Parses year-based directory structure where each campaign folder is named
YYYY.MM.DD.Campaign_Name — extracts date and name, creates Campaign records.
"""
import logging
import re
from datetime import datetime, timezone
from urllib.parse import urlparse

import httpx
from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import Campaign

logger = logging.getLogger(__name__)

_DATE_RE = re.compile(r"^(\d{4})\.(\d{2})\.(\d{2})\.(.+)$")
_GITHUB_API = "https://api.github.com"
_FETCH_YEARS = 3


def _github_api_url(url: str) -> str:
    parsed = urlparse(url)
    if (parsed.netloc or "") == "api.github.com":
        return url
    path = parsed.path.strip("/")
    return f"{_GITHUB_API}/repos/{path}/contents"


def _clean_name(raw: str) -> str:
    return raw.replace("_", " ").strip()


async def run_apt_campaigns_ingest(url: str, token: str | None = None) -> dict:
    logger.info("Starting APT Campaign Collection ingest from %s", url)
    api_base = _github_api_url(url)
    headers = {"Authorization": f"Bearer {token}"} if token else {}

    async with httpx.AsyncClient(timeout=30, headers=headers) as client:
        resp = await client.get(api_base)
        resp.raise_for_status()
        root_items = resp.json()

        year_dirs = sorted(
            [item["name"] for item in root_items if item["type"] == "dir" and item["name"].isdigit()],
            reverse=True,
        )[:_FETCH_YEARS]

        campaign_dirs: list[str] = []
        for year in year_dirs:
            year_resp = await client.get(f"{api_base}/{year}")
            if year_resp.status_code != 200:
                continue
            campaign_dirs.extend(
                item["name"] for item in year_resp.json() if item["type"] == "dir"
            )

    upserted = 0

    async with AsyncSessionLocal() as db:
        for dir_name in campaign_dirs:
            m = _DATE_RE.match(dir_name)
            if not m:
                continue

            year, month, day, campaign_raw = m.groups()
            try:
                start_date = datetime(int(year), int(month), int(day), tzinfo=timezone.utc)
            except ValueError:
                continue

            campaign_name = _clean_name(campaign_raw)

            existing = (await db.execute(
                select(Campaign).where(Campaign.name == campaign_name)
            )).scalar_one_or_none()

            if existing:
                upserted += 1
                continue

            db.add(Campaign(
                name=campaign_name,
                start_date=start_date,
                campaign_type="apt-campaign",
                target_sectors=[],
                target_regions=[],
                affected_organizations=[],
                source="apt_campaigns",
            ))
            upserted += 1

        await db.commit()

    logger.info("APT Campaign Collection ingest complete: %d campaigns processed", upserted)
    return {"upserted": upserted}
