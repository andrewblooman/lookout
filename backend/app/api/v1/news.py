import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models import NewsArticle
from app.schemas.news import NewsArticleOut, NewsArticleList

router = APIRouter(prefix="/news", tags=["news"])


@router.get("", response_model=NewsArticleList)
async def list_news(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    source: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(NewsArticle)
    if source:
        query = query.where(NewsArticle.source_name.ilike(f"%{source}%"))
    if q:
        query = query.where(
            or_(NewsArticle.title.ilike(f"%{q}%"), NewsArticle.summary.ilike(f"%{q}%"))
        )

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(NewsArticle.published_at.desc()))
    return NewsArticleList(total=total or 0, items=result.scalars().all())


@router.get("/{article_id}", response_model=NewsArticleOut)
async def get_article(article_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(NewsArticle).where(NewsArticle.id == article_id))
    article = result.scalar_one_or_none()
    if not article:
        raise HTTPException(status_code=404, detail="Article not found")
    return article
