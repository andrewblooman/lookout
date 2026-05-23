import uuid
from datetime import datetime
from pydantic import BaseModel


class ActorBase(BaseModel):
    name: str
    aliases: list[str] = []
    origin_country: str | None = None
    motivation: str | None = None
    description: str | None = None
    mitre_group_id: str | None = None
    first_seen: datetime | None = None
    last_seen: datetime | None = None
    source: str | None = None


class ActorCreate(ActorBase):
    pass


class ActorOut(ActorBase):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime


class ActorList(BaseModel):
    total: int
    items: list[ActorOut]
