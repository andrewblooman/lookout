import uuid
from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_

from app.db.session import get_db
from app.models import Campaign
from app.schemas.campaign import CampaignOut, CampaignList

router = APIRouter(prefix="/campaigns", tags=["campaigns"])


@router.get("", response_model=CampaignList)
async def list_campaigns(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: str | None = None,
    sector: str | None = None,
    region: str | None = None,
    q: str | None = None,
    db: AsyncSession = Depends(get_db),
):
    query = select(Campaign)
    if status:
        query = query.where(Campaign.status == status)
    if sector:
        query = query.where(Campaign.target_sectors.any(sector))
    if region:
        query = query.where(Campaign.target_regions.any(region))
    if q:
        query = query.where(or_(Campaign.name.ilike(f"%{q}%"), Campaign.description.ilike(f"%{q}%")))

    total = await db.scalar(select(func.count()).select_from(query.subquery()))
    result = await db.execute(query.offset(skip).limit(limit).order_by(Campaign.created_at.desc()))
    return CampaignList(total=total or 0, items=result.scalars().all())


@router.get("/{campaign_id}", response_model=CampaignOut)
async def get_campaign(campaign_id: uuid.UUID, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Campaign).where(Campaign.id == campaign_id))
    campaign = result.scalar_one_or_none()
    if not campaign:
        raise HTTPException(status_code=404, detail="Campaign not found")
    return campaign
