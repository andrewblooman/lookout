import uuid
from datetime import datetime
from sqlalchemy import String, DateTime, func, ARRAY
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base


class NewsArticle(Base):
    __tablename__ = "news"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    title: Mapped[str] = mapped_column(String, nullable=False)
    url: Mapped[str] = mapped_column(String, unique=True, nullable=False, index=True)
    source_name: Mapped[str | None] = mapped_column(String, nullable=True)
    published_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    summary: Mapped[str | None] = mapped_column(String, nullable=True)
    extracted_actors: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    extracted_cves: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    extracted_malware: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    tags: Mapped[list[str]] = mapped_column(ARRAY(String), default=list)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
