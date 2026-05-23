import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models import IOC
from app.schemas.ioc import IOCOut, IOCList, IOCSummary

router = APIRouter(prefix="/iocs", tags=["iocs"])


@router.get("/summary", response_model=IOCSummary)
async def ioc_summary(db: AsyncSession = Depends(get_db)):
    rows = await db.execute(select(IOC.type, func.count()).group_by(IOC.type))
    by_type = {row[0]: row[1] for row in rows}
    return IOCSummary(by_type=by_type, total=sum(by_type.values()))


@router.get("", response_model=IOCList)
async def list_iocs(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    type: str | None = None,
    min_confidence: int = Query(0, ge=0, le=100),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(IOC)
    if type:
        query = query.where(IOC.type == type)
    if min_confidence > 0:
        query = query.where(IOC.confidence >= min_confidence)
    if q:
        query = query.where(IOC.value.ilike(f"%{q}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(IOC.confidence.desc(), IOC.last_seen.desc()))
    return IOCList(total=total or 0, items=result.scalars().all())


@router.get("/{ioc_id}", response_model=IOCOut)
async def get_ioc(ioc_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(IOC).where(IOC.id == ioc_id))
    ioc = result.scalar_one_or_none()
    if not ioc:
        raise HTTPException(status_code=404, detail="IOC not found")
    return ioc
