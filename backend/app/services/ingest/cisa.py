"""Ingests CISA Known Exploited Vulnerabilities catalog."""
import logging
from datetime import datetime, timezone

import httpx
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import CVE

logger = logging.getLogger(__name__)

CVSS_SEVERITY = {
    (9.0, 10.0): "critical",
    (7.0, 8.9): "high",
    (4.0, 6.9): "medium",
    (0.0, 3.9): "low",
}


def _cvss_to_severity(score: float | None) -> str:
    if score is None:
        return "unknown"
    for (low, high), sev in CVSS_SEVERITY.items():
        if low <= score <= high:
            return sev
    return "unknown"


async def run_cisa_ingest(url: str) -> dict:
    logger.info("Starting CISA KEV ingest from %s", url)
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url)
        resp.raise_for_status()
        data = resp.json()

    vulns = data.get("vulnerabilities", [])
    upserted = 0

    async with AsyncSessionLocal() as db:
        for v in vulns:
            cve_id = v.get("cveID", "")
            if not cve_id:
                continue

            due_date = None
            raw_due = v.get("dueDate", "")
            if raw_due:
                try:
                    due_date = datetime.strptime(raw_due, "%Y-%m-%d").date()
                except ValueError:
                    pass

            stmt = (
                insert(CVE)
                .values(
                    cve_id=cve_id,
                    description=v.get("shortDescription", ""),
                    kev_status=True,
                    kev_due_date=due_date,
                    severity="unknown",
                    exploit_maturity="active",
                    source="cisa_kev",
                )
                .on_conflict_do_update(
                    index_elements=["cve_id"],
                    set_=dict(
                        kev_status=True,
                        kev_due_date=due_date,
                        description=v.get("shortDescription", ""),
                        exploit_maturity="active",
                        source="cisa_kev",
                    ),
                )
            )
            await db.execute(stmt)
            upserted += 1

        await db.commit()

    logger.info("CISA KEV ingest complete: %d vulnerabilities upserted", upserted)
    return {"upserted": upserted}
