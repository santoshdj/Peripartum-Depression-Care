from datetime import datetime, timezone

from sqlalchemy import String, DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class EpdsCache(Base):
    """Cached EPDS submission record per patient (reduces FHIR round-trips)."""

    __tablename__ = "epds_cache"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    fhir_patient_id: Mapped[str] = mapped_column(String(256), index=True)
    score: Mapped[int] = mapped_column(Integer)
    fhir_observation_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    fhir_questionnaire_response_id: Mapped[str | None] = mapped_column(
        String(256), nullable=True
    )
    submitted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
