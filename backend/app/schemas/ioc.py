import uuid
from datetime import datetime
from pydantic import BaseModel


class IOCBase(BaseModel):
    type: str
    value: str
    confidence: int = 50
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    actor_id: uuid.UUID | None = None
    campaign_id: uuid.UUID | None = None
    source: str | None = None
    tags: list[str] = []


class IOCCreate(IOCBase):
    pass


class IOCOut(IOCBase):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime


class IOCList(BaseModel):
    total: int
    items: list[IOCOut]


class IOCSummary(BaseModel):
    by_type: dict[str, int]
    total: int
