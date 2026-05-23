import uuid
from datetime import datetime
from pydantic import BaseModel


class FeedCreate(BaseModel):
    name: str
    feed_type: str
    url: str
    api_token: str | None = None
    enabled: bool = True
    poll_interval_hours: int = 6


class FeedUpdate(BaseModel):
    name: str | None = None
    url: str | None = None
    api_token: str | None = None
    enabled: bool | None = None
    poll_interval_hours: int | None = None


class FeedOut(BaseModel):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    name: str
    feed_type: str
    url: str
    has_token: bool
    enabled: bool
    poll_interval_hours: int
    last_ingested_at: datetime | None
    last_error: str | None
    created_at: datetime


class FeedList(BaseModel):
    total: int
    items: list[FeedOut]
