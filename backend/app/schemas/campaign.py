import uuid
from datetime import datetime
from pydantic import BaseModel


class CampaignBase(BaseModel):
    name: str
    actor_id: uuid.UUID | None = None
    status: str = "active"
    campaign_type: str | None = None
    target_sectors: list[str] = []
    target_regions: list[str] = []
    affected_organizations: list[str] = []
    start_date: datetime | None = None
    end_date: datetime | None = None
    description: str | None = None
    source: str | None = None


class CampaignCreate(CampaignBase):
    pass


class CampaignOut(CampaignBase):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime


class CampaignList(BaseModel):
    total: int
    items: list[CampaignOut]
