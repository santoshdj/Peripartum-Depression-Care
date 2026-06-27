import uuid
from datetime import date, datetime, timezone

from sqlalchemy import String, Text, Date, DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class WeeklySummary(Base):
    """Claude-generated weekly pattern summary, cached per patient per week."""

    __tablename__ = "weekly_summaries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_fhir_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    week_start_date: Mapped[date] = mapped_column(Date, nullable=False)
    summary_text: Mapped[str] = mapped_column(Text, nullable=False)
    entry_count: Mapped[int] = mapped_column(nullable=False)
    generated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
