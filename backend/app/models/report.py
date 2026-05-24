import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Report(Base):
    __tablename__ = "reports"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[str] = mapped_column(String, default="draft")
    tlp_level: Mapped[str] = mapped_column(String, default="white")
    author: Mapped[str | None] = mapped_column(String, nullable=True)
    actor_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    campaign_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    ioc_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    cve_ids: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
