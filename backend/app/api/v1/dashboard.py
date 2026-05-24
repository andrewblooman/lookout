from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models import Actor, Campaign, IOC, CVE, NewsArticle
from app.services.cache import cache_get, cache_set
from app.services.trending import compute_trending
from app.schemas.trending import TrendingAttack

router = APIRouter(prefix="/dashboard", tags=["dashboard"])

_HEATMAP_DATA = [
    {"country": "RU", "lat": 55.7558, "lon": 37.6176, "count": 142, "label": "Russia"},
    {"country": "CN", "lat": 39.9042, "lon": 116.4074, "count": 98, "label": "China"},
    {"country": "KP", "lat": 39.0392, "lon": 125.7625, "count": 45, "label": "North Korea"},
    {"country": "IR", "lat": 35.6892, "lon": 51.3890, "count": 38, "label": "Iran"},
    {"country": "US", "lat": 38.9072, "lon": -77.0369, "count": 28, "label": "United States"},
    {"country": "DE", "lat": 52.5200, "lon": 13.4050, "count": 22, "label": "Germany"},
    {"country": "BR", "lat": -15.7801, "lon": -47.9292, "count": 18, "label": "Brazil"},
    {"country": "IN", "lat": 28.6139, "lon": 77.2090, "count": 15, "label": "India"},
    {"country": "NG", "lat": 9.0765, "lon": 7.3986, "count": 12, "label": "Nigeria"},
    {"country": "RO", "lat": 44.4268, "lon": 26.1025, "count": 10, "label": "Romania"},
]


@router.get("/summary")
async def get_summary(db: AsyncSession = Depends(get_db)):
    cached = await cache_get("dashboard:summary")
    if cached:
        return cached

    actor_count = await db.scalar(select(func.count()).select_from(Actor))
    campaign_count = await db.scalar(select(func.count()).select_from(Campaign).where(Campaign.status == "active"))
    ioc_count = await db.scalar(select(func.count()).select_from(IOC))
    cve_count = await db.scalar(select(func.count()).select_from(CVE).where(CVE.kev_status == True))  # noqa: E712
    critical_cves = await db.scalar(
        select(func.count()).select_from(CVE).where(CVE.severity == "critical", CVE.kev_status == True)  # noqa: E712
    )

    result = {
        "threat_level": "high",
        "actor_count": actor_count or 0,
        "active_campaign_count": campaign_count or 0,
        "ioc_count": ioc_count or 0,
        "kev_cve_count": cve_count or 0,
        "critical_kev_count": critical_cves or 0,
    }
    await cache_set("dashboard:summary", result, ttl=120)
    return result


@router.get("/heatmap")
async def get_heatmap():
    return {"points": _HEATMAP_DATA}


@router.get("/trending", response_model=list[TrendingAttack])
async def get_trending(db: AsyncSession = Depends(get_db)):
    cached = await cache_get("trending:list")
    if cached:
        return cached

    trends = await compute_trending(db, days=30, limit=5)
    # Trim articles to 3 per trend for the preview list
    preview = [
        {**t.model_dump(mode="json"), "articles": t.model_dump(mode="json")["articles"][:3]}
        for t in trends
    ]
    await cache_set("trending:list", preview, ttl=3600)
    return preview


@router.get("/trending/{trend_id}", response_model=TrendingAttack)
async def get_trend_detail(trend_id: str, db: AsyncSession = Depends(get_db)):
    cached = await cache_get("trending:full")
    if cached:
        for trend in cached:
            if trend["id"] == trend_id:
                return trend
        raise HTTPException(status_code=404, detail="Trend not found")

    trends = await compute_trending(db, days=30, limit=5)
    full = [t.model_dump(mode="json") for t in trends]
    await cache_set("trending:full", full, ttl=3600)
    for trend in trends:
        if trend.id == trend_id:
            return trend
    raise HTTPException(status_code=404, detail="Trend not found")
