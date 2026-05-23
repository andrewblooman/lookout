import asyncio
import logging
from datetime import datetime, timezone

from apscheduler.schedulers.background import BackgroundScheduler
from sqlalchemy import select

logger = logging.getLogger(__name__)
_scheduler = BackgroundScheduler()
_UNSET = object()


def _run_async(coro):
    loop = asyncio.new_event_loop()
    try:
        loop.run_until_complete(coro)
    finally:
        loop.close()


def decrypt_feed_token(feed) -> str | None:
    if not feed.api_token_encrypted:
        return None
    from app.services.token import decrypt_token
    return decrypt_token(feed.api_token_encrypted)


async def _dispatch_feed(feed):
    from app.services.ingest.cisa import run_cisa_ingest
    from app.services.ingest.news_rss import run_rss_ingest
    from app.services.ingest.urlhaus_csv import run_urlhaus_csv_ingest
    from app.services.ingest.urlhaus_api import run_urlhaus_api_ingest
    from app.services.ingest.mitre_attack import run_mitre_attack_ingest
    from app.services.ingest.nvd_cve import run_nvd_cve_ingest
    from app.services.ingest.alienvault import run_alienvault_ingest
    from app.services.ingest.shodan_feed import run_shodan_ingest
    from app.services.ingest.malpedia import run_malpedia_ingest
    from app.services.ingest.stix_generic import run_stix_generic_ingest

    if feed.feed_type == "cisa_kev":
        await run_cisa_ingest(feed.url)
    elif feed.feed_type == "rss":
        await run_rss_ingest(feed.url, feed.name)
    elif feed.feed_type == "urlhaus_iocs":
        await run_urlhaus_csv_ingest(feed.url)
    elif feed.feed_type == "urlhaus_api":
        await run_urlhaus_api_ingest(feed.url)
    elif feed.feed_type == "mitre_attack":
        await run_mitre_attack_ingest(feed.url)
    elif feed.feed_type == "nvd_cve":
        await run_nvd_cve_ingest(feed.url, token=decrypt_feed_token(feed))
    elif feed.feed_type == "alienvault_otx":
        await run_alienvault_ingest(feed.url, token=decrypt_feed_token(feed))
    elif feed.feed_type == "shodan":
        await run_shodan_ingest(feed.url, token=decrypt_feed_token(feed))
    elif feed.feed_type == "malpedia":
        await run_malpedia_ingest(feed.url, token=decrypt_feed_token(feed))
    elif feed.feed_type == "wiz_stix":
        await run_stix_generic_ingest(feed.url, source_name="wiz", token=decrypt_feed_token(feed))
    else:
        raise ValueError(f"No ingest handler for feed type: {feed.feed_type}")


async def _record_feed_result(feed_id, *, last_ingested_at=_UNSET, last_error: str | None = None):
    from app.db.session import AsyncSessionLocal
    from app.models import Feed

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Feed).where(Feed.id == feed_id))
        feed = result.scalar_one_or_none()
        if not feed:
            logger.warning("Feed %s disappeared before status could be updated", feed_id)
            return

        if last_ingested_at is not _UNSET:
            feed.last_ingested_at = last_ingested_at
        feed.last_error = last_error
        await db.commit()


async def run_feed(feed):
    try:
        await _dispatch_feed(feed)
        await _record_feed_result(feed.id, last_ingested_at=datetime.now(timezone.utc), last_error=None)
    except Exception as exc:
        logger.error("Ingest failed for feed %s: %s", feed.name, exc)
        await _record_feed_result(feed.id, last_error=str(exc)[:500])


async def run_all_feeds():
    from app.db.session import AsyncSessionLocal
    from app.models import Feed

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(Feed).where(Feed.enabled == True))  # noqa: E712
        feeds = result.scalars().all()

    for feed in feeds:
        await run_feed(feed)


def start_scheduler():
    _scheduler.add_job(
        lambda: _run_async(run_all_feeds()),
        "interval",
        hours=1,
        id="ingest_all_feeds",
        replace_existing=True,
    )
    _scheduler.start()
    logger.info("Scheduler started")
    # Run once immediately in background
    asyncio.get_event_loop().create_task(run_all_feeds())


def shutdown_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
