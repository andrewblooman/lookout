import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class ReportCreate(BaseModel):
    title: str
    description: Optional[str] = None
    published_at: Optional[datetime] = None
    status: str = "draft"
    tlp_level: str = "white"
    author: Optional[str] = None
    actor_ids: list[str] = []
    campaign_ids: list[str] = []
    ioc_ids: list[str] = []
    cve_ids: list[str] = []


class ReportUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    published_at: Optional[datetime] = None
    status: Optional[str] = None
    tlp_level: Optional[str] = None
    author: Optional[str] = None
    actor_ids: Optional[list[str]] = None
    campaign_ids: Optional[list[str]] = None
    ioc_ids: Optional[list[str]] = None
    cve_ids: Optional[list[str]] = None


class ReportList(BaseModel):
    total: int
    items: list["ReportOut"]


class ReportOut(BaseModel):
    id: uuid.UUID
    title: str
    description: Optional[str]
    published_at: Optional[datetime]
    status: str
    tlp_level: str
    author: Optional[str]
    actor_ids: list[str]
    campaign_ids: list[str]
    ioc_ids: list[str]
    cve_ids: list[str]
    created_at: datetime

    model_config = {"from_attributes": True}
