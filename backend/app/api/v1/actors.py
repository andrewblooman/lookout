import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models import Actor
from app.schemas.actor import ActorOut, ActorList, ActorCreate

router = APIRouter(prefix="/actors", tags=["actors"])


@router.get("", response_model=ActorList)
async def list_actors(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    country: str | None = None,
    motivation: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Actor)
    if country:
        query = query.where(Actor.origin_country == country.upper())
    if motivation:
        query = query.where(Actor.motivation == motivation)
    if q:
        query = query.where(or_(Actor.name.ilike(f"%{q}%"), Actor.description.ilike(f"%{q}%")))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(Actor.name))
    return ActorList(total=total or 0, items=result.scalars().all())


@router.get("/{actor_id}", response_model=ActorOut)
async def get_actor(actor_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Actor).where(Actor.id == actor_id))
    actor = result.scalar_one_or_none()
    if not actor:
        raise HTTPException(status_code=404, detail="Actor not found")
    return actor
