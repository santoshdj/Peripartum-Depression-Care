import uuid
from datetime import datetime, timezone

from sqlalchemy import String, SmallInteger, Text, DateTime, Boolean
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class JournalEntry(Base):
    """Patient-private self-monitoring diary entry.
    
    Default: stored in app DB only (private to patient).
    Optional: patient can share entries to FHIR via Observation write-back (see ADR 0005).
    """

    __tablename__ = "journal_entries"

    id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    patient_fhir_id: Mapped[str] = mapped_column(String(256), nullable=False, index=True)
    mood_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)      # 1–5
    sleep_hours: Mapped[int] = mapped_column(SmallInteger, nullable=False)     # 0–12
    anxiety_score: Mapped[int] = mapped_column(SmallInteger, nullable=False)   # 1–5
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
    )
    
    # Diary sharing fields (ADR 0005)
    shared_to_fhir: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    fhir_observation_id: Mapped[str | None] = mapped_column(String(256), nullable=True)
    shared_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
