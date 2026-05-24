import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class TrendArticle(BaseModel):
    id: uuid.UUID
    title: str
    url: str
    source_name: Optional[str]
    published_at: Optional[datetime]
    summary: Optional[str]


class TrendActor(BaseModel):
    id: uuid.UUID
    name: str
    origin_country: Optional[str]
    motivation: Optional[str]
    mitre_group_id: Optional[str]


class TrendCVE(BaseModel):
    id: uuid.UUID
    cve_id: str
    description: Optional[str]
    severity: Optional[str]
    cvss_score: Optional[float]
    kev_status: bool


class TrendIOC(BaseModel):
    id: uuid.UUID
    type: str
    value: str
    confidence: int
    tags: list[str]


class TrendingAttack(BaseModel):
    id: str
    topic: str
    topic_type: str   # "actor" | "cve" | "malware"
    severity: str     # "critical" | "high" | "medium" | "low"
    article_count: int
    summary: str
    articles: list[TrendArticle]
    actors: list[TrendActor]
    cves: list[TrendCVE]
    iocs: list[TrendIOC]
    last_seen: datetime
