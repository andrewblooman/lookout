import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, ForeignKey, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class Campaign(Base):
    __tablename__ = "campaigns"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String, nullable=False, index=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("actors.id"), nullable=True)
    status: Mapped[str] = mapped_column(String, default="active")
    campaign_type: Mapped[str | None] = mapped_column(String, nullable=True)
    target_sectors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    target_regions: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
