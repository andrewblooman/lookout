"""Ingests recently published CVEs from the NVD CVE API v2."""
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import CVE

logger = logging.getLogger(__name__)

_SEVERITY_MAP = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
}


def _extract_cvss(metrics: dict) -> tuple[float | None, str | None, str]:
    for key in ("cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key, [])
        if entries:
            data = entries[0].get("cvssData", {})
            score = data.get("baseScore")
            vector = data.get("vectorString")
            raw_sev = entries[0].get("baseSeverity") or data.get("baseSeverity", "")
            severity = _SEVERITY_MAP.get(raw_sev.upper(), "unknown") if raw_sev else "unknown"
            return score, vector, severity
    return None, None, "unknown"


async def run_nvd_cve_ingest(url: str, token: str | None = None) -> dict:
    now = datetime.now(timezone.utc)
    start = (now - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00.000")
    end = now.strftime("%Y-%m-%dT23:59:59.999")

    params = {"resultsPerPage": 100, "pubStartDate": start, "pubEndDate": end}
    headers = {}
    if token:
        headers["apiKey"] = token

    logger.info("Starting NVD CVE ingest (last 30 days)")
    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.get(url, params=params, headers=headers)
        resp.raise_for_status()
        data = resp.json()

    vulnerabilities = data.get("vulnerabilities", [])
    upserted = 0

    async with AsyncSessionLocal() as db:
        for item in vulnerabilities:
            cve_data = item.get("cve", {})
            cve_id = cve_data.get("id", "").strip()
            if not cve_id:
                continue

            descriptions = cve_data.get("descriptions", [])
            description = next(
                (d["value"] for d in descriptions if d.get("lang") == "en"), None
            )

            metrics = cve_data.get("metrics", {})
            cvss_score, cvss_vector, severity = _extract_cvss(metrics)

            published_at = None
            raw_pub = cve_data.get("published", "")
            if raw_pub:
                try:
                    published_at = datetime.fromisoformat(raw_pub.replace("Z", "+00:00"))
                except ValueError:
                    pass

            updated_at = None
            raw_mod = cve_data.get("lastModified", "")
            if raw_mod:
                try:
                    updated_at = datetime.fromisoformat(raw_mod.replace("Z", "+00:00"))
                except ValueError:
                    pass

            stmt = (
                insert(CVE)
                .values(
                    cve_id=cve_id,
                    description=description,
                    cvss_score=cvss_score,
                    cvss_vector=cvss_vector,
                    severity=severity,
                    published_at=published_at,
                    updated_at=updated_at,
                    source="nvd",
                )
                .on_conflict_do_update(
                    index_elements=["cve_id"],
                    set_=dict(
                        description=description,
                        cvss_score=cvss_score,
                        cvss_vector=cvss_vector,
                        severity=severity,
                        updated_at=updated_at,
                        source="nvd",
                    ),
                )
            )
            await db.execute(stmt)
            upserted += 1

        await db.commit()

    logger.info("NVD CVE ingest complete: %d CVEs upserted", upserted)
    return {"upserted": upserted}
