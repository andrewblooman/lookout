"""Computes trending attack themes from recent news articles."""
import re
import logging
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.models import Actor, CVE, IOC, NewsArticle
from app.schemas.trending import (
    TrendArticle, TrendActor, TrendCVE, TrendIOC, TrendingAttack,
)

logger = logging.getLogger(__name__)

_SLUG_RE = re.compile(r"[^a-z0-9]+")


def _slugify(topic_type: str, topic: str) -> str:
    slug = _SLUG_RE.sub("_", topic.lower()).strip("_")
    return f"{topic_type}_{slug}"


def _build_summary(articles: list[NewsArticle]) -> str:
    count = len(articles)
    sources = list(dict.fromkeys(a.source_name for a in articles if a.source_name))

    if count == 1:
        ctx = f"Reported by {sources[0]}." if sources else "Reported in 1 source."
    else:
        src_str = ", ".join(sources[:2])
        if len(sources) > 2:
            src_str += f" and {len(sources) - 2} more"
        ctx = f"Trending across {count} sources" + (f" including {src_str}." if src_str else ".")

    sorted_arts = sorted(
        articles,
        key=lambda a: a.published_at or datetime.min.replace(tzinfo=timezone.utc),
        reverse=True,
    )
    snippet = sorted_arts[0].summary or sorted_arts[0].title or ""
    if len(snippet) > 400:
        snippet = snippet[:397] + "…"

    return f"{ctx} {snippet}".strip()


def _derive_severity(actors: list[Actor], cves: list[CVE], article_count: int) -> str:
    for cve in cves:
        if cve.severity == "critical" or (cve.cvss_score and cve.cvss_score >= 9.0):
            return "critical"
    for actor in actors:
        if actor.motivation in ("sabotage", "financial"):
            return "high"
    if article_count >= 4:
        return "high"
    if article_count >= 2:
        return "medium"
    return "low"


async def compute_trending(
    db: AsyncSession, days: int = 30, limit: int = 5
) -> list[TrendingAttack]:
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(days=days)
    seven_days_ago = now - timedelta(days=7)

    result = await db.execute(
        select(NewsArticle)
        .where(NewsArticle.published_at >= cutoff)
        .order_by(NewsArticle.published_at.desc().nulls_last())
    )
    articles = result.scalars().all()

    # Fall back to last 50 articles when the time window is empty
    if not articles:
        result = await db.execute(
            select(NewsArticle)
            .order_by(NewsArticle.published_at.desc().nulls_last())
            .limit(50)
        )
        articles = result.scalars().all()

    if not articles:
        return []

    # Build frequency maps
    actor_arts: dict[str, list[NewsArticle]] = defaultdict(list)
    cve_arts: dict[str, list[NewsArticle]] = defaultdict(list)
    malware_arts: dict[str, list[NewsArticle]] = defaultdict(list)

    for art in articles:
        for name in art.extracted_actors or []:
            actor_arts[name].append(art)
        for cve_id in art.extracted_cves or []:
            cve_arts[cve_id].append(art)
        for mal in art.extracted_malware or []:
            malware_arts[mal].append(art)

    # Score: article count + 0.5 per article published within 7 days
    def score(arts: list[NewsArticle]) -> float:
        recent = sum(
            1 for a in arts
            if a.published_at and a.published_at.replace(tzinfo=timezone.utc) >= seven_days_ago
        )
        return len(arts) + recent * 0.5

    candidates: list[tuple[str, str, list[NewsArticle], float]] = []
    for name, arts in actor_arts.items():
        candidates.append(("actor", name, arts, score(arts)))
    for cve_id, arts in cve_arts.items():
        candidates.append(("cve", cve_id, arts, score(arts)))
    for mal, arts in malware_arts.items():
        candidates.append(("malware", mal, arts, score(arts)))

    candidates.sort(key=lambda x: x[3], reverse=True)

    trends: list[TrendingAttack] = []
    seen_slugs: set[str] = set()

    for topic_type, topic, arts, _ in candidates:
        if len(trends) >= limit:
            break
        slug = _slugify(topic_type, topic)
        if slug in seen_slugs:
            continue
        seen_slugs.add(slug)

        # Collect all cross-referenced entity names from the article group
        all_actor_names: set[str] = set()
        all_cve_ids: set[str] = set()
        for art in arts:
            all_actor_names.update(art.extracted_actors or [])
            all_cve_ids.update(art.extracted_cves or [])

        # Resolve actors from DB
        actor_objs: list[Actor] = []
        if topic_type == "actor":
            res = await db.execute(
                select(Actor).where(func.lower(Actor.name) == topic.lower())
            )
            actor_objs = list(res.scalars().all())
        else:
            # Resolve all co-mentioned actors
            for name in list(all_actor_names)[:3]:
                res = await db.execute(
                    select(Actor).where(func.lower(Actor.name) == name.lower())
                )
                actor_objs.extend(res.scalars().all())

        # Resolve CVEs from DB
        cve_objs: list[CVE] = []
        if topic_type == "cve":
            res = await db.execute(select(CVE).where(CVE.cve_id == topic))
            cve_objs = list(res.scalars().all())
        else:
            for cve_id in list(all_cve_ids)[:5]:
                res = await db.execute(select(CVE).where(CVE.cve_id == cve_id))
                cve_objs.extend(res.scalars().all())

        # Resolve IOCs — linked to any resolved actor
        ioc_objs: list[IOC] = []
        for actor in actor_objs[:2]:
            res = await db.execute(
                select(IOC).where(IOC.actor_id == actor.id).limit(4)
            )
            ioc_objs.extend(res.scalars().all())

        most_recent_art = max(
            arts,
            key=lambda a: a.published_at or datetime.min.replace(tzinfo=timezone.utc),
        )
        last_seen = most_recent_art.published_at or now

        trends.append(
            TrendingAttack(
                id=slug,
                topic=topic,
                topic_type=topic_type,
                severity=_derive_severity(actor_objs, cve_objs, len(arts)),
                article_count=len(arts),
                summary=_build_summary(arts),
                articles=[
                    TrendArticle(
                        id=a.id,
                        title=a.title,
                        url=a.url,
                        source_name=a.source_name,
                        published_at=a.published_at,
                        summary=a.summary,
                    )
                    for a in sorted(arts, key=lambda x: x.published_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
                ],
                actors=[
                    TrendActor(
                        id=a.id,
                        name=a.name,
                        origin_country=a.origin_country,
                        motivation=a.motivation,
                        mitre_group_id=a.mitre_group_id,
                    )
                    for a in actor_objs
                ],
                cves=[
                    TrendCVE(
                        id=c.id,
                        cve_id=c.cve_id,
                        description=c.description,
                        severity=c.severity,
                        cvss_score=c.cvss_score,
                        kev_status=c.kev_status,
                    )
                    for c in cve_objs
                ],
                iocs=[
                    TrendIOC(
                        id=i.id,
                        type=i.type,
                        value=i.value,
                        confidence=i.confidence,
                        tags=i.tags or [],
                    )
                    for i in ioc_objs
                ],
                last_seen=last_seen,
            )
        )

    return trends
