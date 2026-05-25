"""Ingests CVEs from the NVD CVE API v2 with full pagination.

Uses lastModStartDate/lastModEndDate so CVSS updates on existing CVEs are
picked up, not just newly published ones. Paginates via startIndex until all
results in the window are fetched.
"""
import logging
from datetime import datetime, timedelta, timezone

import httpx
from sqlalchemy.dialects.postgresql import insert

from app.db.session import AsyncSessionLocal
from app.models import CVE

logger = logging.getLogger(__name__)

_PAGE_SIZE = 2000  # NVD max per request (requires API key); falls back gracefully

_SEVERITY_MAP = {
    "CRITICAL": "critical",
    "HIGH": "high",
    "MEDIUM": "medium",
    "LOW": "low",
}


def _extract_cvss(metrics: dict) -> tuple[float | None, str | None, str]:
    for key in ("cvssMetricV40", "cvssMetricV31", "cvssMetricV30", "cvssMetricV2"):
        entries = metrics.get(key, [])
        if entries:
            data = entries[0].get("cvssData", {})
            score = data.get("baseScore")
            vector = data.get("vectorString")
            raw_sev = entries[0].get("baseSeverity") or data.get("baseSeverity", "")
            severity = _SEVERITY_MAP.get(raw_sev.upper(), "unknown") if raw_sev else "unknown"
            return score, vector, severity
    return None, None, "unknown"


def _nvd_url(url: str) -> str:
    url = url.rstrip("/")
    return url if url.endswith("2.0") else url.split("/cves")[0] + "/cves/2.0"


def _parse_iso(raw: str) -> datetime | None:
    if not raw:
        return None
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None


async def run_nvd_cve_ingest(url: str, token: str | None = None) -> dict:
    url = _nvd_url(url)
    now = datetime.now(timezone.utc)
    # Use lastModified dates so CVSS updates on older CVEs are captured too
    start = (now - timedelta(days=30)).strftime("%Y-%m-%dT00:00:00.000")
    end = now.strftime("%Y-%m-%dT23:59:59.999")

    headers = {"apiKey": token} if token else {}
    base_params = {
        "resultsPerPage": _PAGE_SIZE,
        "lastModStartDate": start,
        "lastModEndDate": end,
    }

    upserted = 0
    start_index = 0
    total_results = None
    page = 1

    logger.info("Starting NVD CVE ingest (last 30 days, modified dates)")

    async with httpx.AsyncClient(timeout=60) as client:
        while True:
            params = {**base_params, "startIndex": start_index}
            resp = await client.get(url, params=params, headers=headers)
            resp.raise_for_status()
            data = resp.json()

            if total_results is None:
                total_results = data.get("totalResults", 0)
                page_size = data.get("resultsPerPage", _PAGE_SIZE)
                logger.info("NVD CVE: %d total results, fetching in pages of %d", total_results, page_size)

            vulnerabilities = data.get("vulnerabilities", [])
            if not vulnerabilities:
                break

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

                    stmt = (
                        insert(CVE)
                        .values(
                            cve_id=cve_id,
                            description=description,
                            cvss_score=cvss_score,
                            cvss_vector=cvss_vector,
                            severity=severity,
                            published_at=_parse_iso(cve_data.get("published", "")),
                            updated_at=_parse_iso(cve_data.get("lastModified", "")),
                            source="nvd",
                        )
                        .on_conflict_do_update(
                            index_elements=["cve_id"],
                            set_=dict(
                                description=description,
                                cvss_score=cvss_score,
                                cvss_vector=cvss_vector,
                                severity=severity,
                                updated_at=_parse_iso(cve_data.get("lastModified", "")),
                                source="nvd",
                            ),
                        )
                    )
                    await db.execute(stmt)
                    upserted += 1

                await db.commit()

            start_index += len(vulnerabilities)
            page += 1

            if total_results is not None and start_index >= total_results:
                break

    logger.info("NVD CVE ingest complete: %d pages, %d CVEs upserted", page - 1, upserted)
    return {"upserted": upserted}
