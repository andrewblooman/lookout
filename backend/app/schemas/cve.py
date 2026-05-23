import uuid
from datetime import datetime, date
from pydantic import BaseModel


class CVEBase(BaseModel):
    cve_id: str
    description: str | None = None
    cvss_score: float | None = None
    cvss_vector: str | None = None
    severity: str | None = None
    published_at: datetime | None = None
    updated_at: datetime | None = None
    kev_status: bool = False
    kev_due_date: date | None = None
    affected_products: list[str] = []
    exploit_maturity: str = "none"
    source: str | None = None


class CVECreate(CVEBase):
    pass


class CVEOut(CVEBase):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime


class CVEList(BaseModel):
    total: int
    items: list[CVEOut]
