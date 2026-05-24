import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func

from app.db.session import get_db
from app.models import IOC
from app.schemas.ioc import IOCOut, IOCList, IOCSummary
from app.services.ioc_types import equivalent_ioc_types, normalize_ioc_type

router = APIRouter(prefix="/iocs", tags=["iocs"])


def _to_ioc_out(ioc: IOC) -> IOCOut:
    return IOCOut(
        id=ioc.id,
        type=normalize_ioc_type(ioc.type),
        value=ioc.value,
        confidence=ioc.confidence,
        first_seen=ioc.first_seen,
        last_seen=ioc.last_seen,
        actor_id=ioc.actor_id,
        campaign_id=ioc.campaign_id,
        source=ioc.source,
        tags=ioc.tags,
        created_at=ioc.created_at,
    )


@router.get("/summary", response_model=IOCSummary)
async def ioc_summary(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(IOC.type, func.count()).group_by(IOC.type))
    by_type: dict[str, int] = {}
    for ioc_type, count in rows:
        normalized_type = normalize_ioc_type(ioc_type)
        by_type[normalized_type] = by_type.get(normalized_type, 0) + count
    return IOCSummary(by_type=by_type, total=sum(by_type.values()))


@router.get("", response_model=IOCList)
async def list_iocs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    type: str | None = None,
    min_confidence: int = Query(0, ge=0, le=100),
    q: str | None = None,
    actor_id: uuid.UUID | None = None,
    campaign_id: uuid.UUID | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(IOC)
    if type:
        query = query.where(IOC.type.in_(equivalent_ioc_types(type)))
    if min_confidence > 0:
        query = query.where(IOC.confidence >= min_confidence)
    if q:
        query = query.where(IOC.value.ilike(f"%{q}%"))
    if actor_id:
        query = query.where(IOC.actor_id == actor_id)
    if campaign_id:
        query = query.where(IOC.campaign_id == campaign_id)

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(IOC.confidence.desc(), IOC.last_seen.desc()))
    items = [_to_ioc_out(ioc) for ioc in result.scalars().all()]
    return IOCList(total=total or 0, items=items)


@router.get("/{ioc_id}", response_model=IOCOut)
async def get_ioc(ioc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IOC).where(IOC.id == ioc_id))
    ioc = result.scalar_one_or_none()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    return _to_ioc_out(ioc)
