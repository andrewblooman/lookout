import uuid
from datetime import datetime, date
from sqlalchemy import String, DateTime, Float, Boolean, Date, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class CVE(Base):
    __tablename__ = "cves"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    cve_id: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    description: Mapped[str | None] = mapped_column(String, nullable=True)
    cvss_score: Mapped[float | None] = mapped_column(Float, nullable=True)
    cvss_vector: Mapped[str | None] = mapped_column(String, nullable=True)
    severity: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    kev_status: Mapped[bool] = mapped_column(Boolean, default=False)
    kev_due_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    affected_products: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    exploit_maturity: Mapped[str] = mapped_column(String, default="none")
    source: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
