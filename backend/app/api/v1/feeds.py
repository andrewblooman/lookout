import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models import Feed
from app.schemas.feed import FeedCreate, FeedUpdate, FeedOut, FeedList
from app.services.token import encrypt_token

router = APIRouter(prefix="/feeds", tags=["feeds"])


def _to_feed_out(feed: Feed) -> FeedOut:
    return FeedOut(
        id=feed.id,
        name=feed.name,
        feed_type=feed.feed_type,
        url=feed.url,
        has_token=feed.api_token_encrypted is not None,
        enabled=feed.enabled,
        poll_interval_hours=feed.poll_interval_hours,
        last_ingested_at=feed.last_ingested_at,
        last_error=feed.last_error,
        created_at=feed.created_at,
    )


@router.get("", response_model=FeedList)
async def list_feeds(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feed).order_by(Feed.created_at))
    feeds = result.scalars().all()
    total = await db.scalar(select(func.count()).select_from(Feed))
    return FeedList(total=total or 0, items=[_to_feed_out(f) for f in feeds])


@router.get("/{feed_id}", response_model=FeedOut)
async def get_feed(feed_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feed).where(Feed.id == feed_id))
    feed = result.scalar_one_or_none()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    return _to_feed_out(feed)


@router.post("", response_model=FeedOut, status_code=201)
async def create_feed(data: FeedCreate, db: AsyncSession = Depends(get_db)):
    feed = Feed(
        name=data.name,
        feed_type=data.feed_type,
        url=data.url,
        api_token_encrypted=encrypt_token(data.api_token) if data.api_token else None,
        enabled=data.enabled,
        poll_interval_hours=data.poll_interval_hours,
    )
    db.add(feed)
    await db.commit()
    await db.refresh(feed)
    return _to_feed_out(feed)


@router.put("/{feed_id}", response_model=FeedOut)
async def update_feed(feed_id: uuid.UUID, data: FeedUpdate, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feed).where(Feed.id == feed_id))
    feed = result.scalar_one_or_none()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    if data.name is not None:
        feed.name = data.name
    if data.url is not None:
        feed.url = data.url
    if data.api_token is not None:
        feed.api_token_encrypted = encrypt_token(data.api_token) if data.api_token else None
    if data.enabled is not None:
        feed.enabled = data.enabled
    if data.poll_interval_hours is not None:
        feed.poll_interval_hours = data.poll_interval_hours

    await db.commit()
    await db.refresh(feed)
    return _to_feed_out(feed)


@router.delete("/{feed_id}", status_code=204)
async def delete_feed(feed_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feed).where(Feed.id == feed_id))
    feed = result.scalar_one_or_none()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")
    await db.delete(feed)
    await db.commit()


@router.post("/{feed_id}/trigger", status_code=202)
async def trigger_feed(feed_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Feed).where(Feed.id == feed_id))
    feed = result.scalar_one_or_none()
    if not feed:
        raise HTTPException(status_code=404, detail="Feed not found")

    import asyncio
    from app.core.scheduler import run_feed

    asyncio.create_task(run_feed(feed))
    return {"status": "triggered", "feed_id": str(feed_id)}
