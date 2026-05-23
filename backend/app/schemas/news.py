import uuid
from datetime import datetime
from pydantic import BaseModel


class NewsArticleBase(BaseModel):
    title: str
    url: str
    source_name: str | None = None
    published_at: datetime | None = None
    summary: str | None = None
    extracted_actors: list[str] = []
    extracted_cves: list[str] = []
    extracted_malware: list[str] = []
    tags: list[str] = []


class NewsArticleCreate(NewsArticleBase):
    pass


class NewsArticleOut(NewsArticleBase):
    model_config = {"from_attributes": True}
    id: uuid.UUID
    created_at: datetime


class NewsArticleList(BaseModel):
    total: int
    items: list[NewsArticleOut]
