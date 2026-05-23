import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models import CVE
from app.schemas.cve import CVEOut, CVEList

router = APIRouter(prefix="/cves", tags=["cves"])


@router.get("", response_model=CVEList)
async def list_cves(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    severity: str | None = None,
    kev: bool | None = None,
    min_cvss: float = Query(0.0, ge=0.0, le=10.0),
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(CVE)
    if severity:
        query = query.where(CVE.severity == severity)
    if kev is not None:
        query = query.where(CVE.kev_status == kev)
    if min_cvss > 0:
        query = query.where(CVE.cvss_score >= min_cvss)
    if q:
        query = query.where(or_(CVE.cve_id.ilike(f"%{q}%"), CVE.description.ilike(f"%{q}%")))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(CVE.cvss_score.desc().nullslast(), CVE.published_at.desc()))
    return CVEList(total=total or 0, items=result.scalars().all())


@router.get("/{cve_db_id}", response_model=CVEOut)
async def get_cve(cve_db_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(CVE).where(CVE.id == cve_db_id))
    cve = result.scalar_one_or_none()
    if not cve:
        raise HTTPException(status_code=404, detail="CVE not found")
    return cve
