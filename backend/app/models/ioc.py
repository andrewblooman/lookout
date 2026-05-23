import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, Integer, func, ForeignKey, ARRAY, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class IOC(Base):
    __tablename__ = "iocs"
    __table_args__ = (UniqueConstraint("type", "value", name="uq_ioc_type_value"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    type: Mapped[str] = mapped_column(String, nullable=False)
    value: Mapped[str] = mapped_column(String, nullable=False, index=True)
    confidence: Mapped[int] = mapped_column(Integer, default=50)
    first_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    last_seen: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    actor_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("actors.id"), nullable=True)
    campaign_id: Mapped[uuid.UUID | None] = mapped_column(ForeignKey("campaigns.id"), nullable=True)
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
