import uuid
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.db.session import get_db
from app.models.report import Report
from app.schemas.report import ReportCreate, ReportOut, ReportUpdate

router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("")
async def list_reports(
    status: Optional[str] = None,
    tlp_level: Optional[str] = None,
    q: Optional[str] = None,
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    query = select(Report)
    if status:
        query = query.where(Report.status == status)
    if tlp_level:
        query = query.where(Report.tlp_level == tlp_level)
    if q:
        query = query.where(Report.title.ilike(f"%{q}%"))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    items = (
        await db.execute(query.order_by(Report.created_at.desc()).limit(limit).offset(offset))
    ).scalars().all()

    return {"total": total, "items": [ReportOut.model_validate(r) for r in items]}


@router.get("/{report_id}", response_model=ReportOut)
async def get_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report


@router.post("", response_model=ReportOut, status_code=201)
async def create_report(data: ReportCreate, db: AsyncSession = Depends(get_db)):
    report = Report(**data.model_dump())
    db.add(report)
    await db.commit()
    await db.refresh(report)
    return report


@router.put("/{report_id}", response_model=ReportOut)
async def update_report(report_id: uuid.UUID, data: ReportUpdate, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(report, k, v)
    await db.commit()
    await db.refresh(report)
    return report


@router.delete("/{report_id}", status_code=204)
async def delete_report(report_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    report = await db.get(Report, report_id)
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    await db.delete(report)
    await db.commit()
